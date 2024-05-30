/**
 * This module adds GPP consentManagement support to prebid.js.  It interacts with
 * supported CMPs (Consent Management Platforms) to grab the user's consent information
 * and make it available for any GPP supported adapters to read/pass this information to
 * their system and for various other features/modules in Prebid.js.
 */
import {deepSetValue, isEmpty, isNumber, isPlainObject, isStr, logError, logInfo, logWarn} from '../src/utils.js';
import {config} from '../src/config.js';
import {gppDataHandler} from '../src/adapterManager.js';
import {timedAuctionHook} from '../src/utils/perfMetrics.js';
import {enrichFPD} from '../src/fpd/enrichment.js';
import {getGlobal} from '../src/prebidGlobal.js';
import {cmpClient, MODE_CALLBACK, MODE_MIXED, MODE_RETURN} from '../libraries/cmp/cmpClient.js';
import {GreedyPromise} from '../src/utils/promise.js';
import {buildActivityParams} from '../src/activities/params.js';

const DEFAULT_CMP = 'iab';
const DEFAULT_CONSENT_TIMEOUT = 10000;

export let userCMP;
export let consentTimeout;
let staticConsentData;

let consentData;
let addedConsentHook = false;

function pipeCallbacks(fn, {onSuccess, onError}) {
  new GreedyPromise((resolve) => resolve(fn())).then(onSuccess, (err) => {
    if (err instanceof GPPError) {
      onError(err.message, ...err.args);
    } else {
      onError(`GPP error:`, err);
    }
  });
}

function lookupStaticConsentData(callbacks) {
  return pipeCallbacks(() => processCmpData(staticConsentData), callbacks);
}

const GPP_10 = '1.0';
const GPP_11 = '1.1';

class GPPError {
  constructor(message, arg) {
    this.message = message;
    this.args = arg == null ? [] : [arg];
  }
}

export class GPPClient {
  static CLIENTS = {};

  static register(apiVersion, defaultVersion = false) {
    this.apiVersion = apiVersion;
    this.CLIENTS[apiVersion] = this;
    if (defaultVersion) {
      this.CLIENTS.default = this;
    }
  }

  static INST;

  /**
   * Ping the CMP to set up an appropriate client for it, and initialize it.
   *
   * @param mkCmp
   * @returns {Promise<[GPPClient,Promise<{}>]>} a promise to two objects:
   *  - a GPPClient that talks the best GPP dialect we know for the CMP's version;
   *  - a promise to GPP data.
   */
  static init(mkCmp = cmpClient) {
    let inst = this.INST;
    if (!inst) {
      let err;
      const reset = () => err && (this.INST = null);
      inst = this.INST = this.ping(mkCmp).catch(e => {
        err = true;
        reset();
        throw e;
      });
      reset();
    }
    return inst.then(([client, pingData]) => [
      client,
      client.initialized ? client.refresh() : client.init(pingData)
    ]);
  }

  /**
   * Ping the CMP to determine its version and set up a client appropriate for it.
   *
   * @param mkCmp
   * @returns {Promise<[GPPClient, {}]>} a promise to two objects:
   *  - a GPPClient that talks the best GPP dialect we know for the CMP's version;
   *  - the result from pinging the CMP.
   */
  static ping(mkCmp = cmpClient) {
    const cmpOptions = {
      apiName: '__gpp',
      apiArgs: ['command', 'callback', 'parameter'], // do not pass version - not clear what it's for (or what we should use)
    };

    // in 1.0, 'ping' should return pingData but ignore callback;
    // in 1.1 it should not return anything but run the callback
    // the following looks for either - but once the version is known, produce a client that knows whether the
    // rest of the interactions should pick return values or pass callbacks

    const probe = mkCmp({...cmpOptions, mode: MODE_RETURN});
    return new GreedyPromise((resolve, reject) => {
      if (probe == null) {
        reject(new GPPError('GPP CMP not found'));
        return;
      }
      let done = false; // some CMPs do both return value and callbacks - avoid repeating log messages
      const pong = (result, success) => {
        if (done) return;
        if (success != null && !success) {
          reject(result);
          return;
        }
        if (result == null) return;
        done = true;
        const cmpVersion = result?.gppVersion;
        const Client = this.getClient(cmpVersion);
        if (cmpVersion !== Client.apiVersion) {
          logWarn(`Unrecognized GPP CMP version: ${cmpVersion}. Continuing using GPP API version ${Client}...`);
        } else {
          logInfo(`Using GPP version ${cmpVersion}`);
        }
        const mode = Client.apiVersion === GPP_10 ? MODE_MIXED : MODE_CALLBACK;
        const client = new Client(
          cmpVersion,
          mkCmp({...cmpOptions, mode})
        );
        resolve([client, result]);
      };

      probe({
        command: 'ping',
        callback: pong
      }).then((res) => pong(res, true), reject);
    }).finally(() => {
      probe && probe.close();
    });
  }

  static getClient(cmpVersion) {
    return this.CLIENTS.hasOwnProperty(cmpVersion) ? this.CLIENTS[cmpVersion] : this.CLIENTS.default;
  }

  #resolve;
  #reject;
  #pending = [];

  initialized = false;

  constructor(cmpVersion, cmp) {
    this.apiVersion = this.constructor.apiVersion;
    this.cmpVersion = cmp;
    this.cmp = cmp;
    [this.#resolve, this.#reject] = [0, 1].map(slot => (result) => {
      while (this.#pending.length) {
        this.#pending.pop()[slot](result);
      }
    });
  }

  /**
   * initialize this client - update consent data if already available,
   * and set up event listeners to also update on CMP changes
   *
   * @param pingData
   * @returns {Promise<{}>} a promise to GPP consent data
   */
  init(pingData) {
    const ready = this.updateWhenReady(pingData);
    if (!this.initialized) {
      this.initialized = true;
      this.cmp({
        command: 'addEventListener',
        callback: (event, success) => {
          if (success != null && !success) {
            this.#reject(new GPPError('Received error response from CMP', event));
          } else if (event?.pingData?.cmpStatus === 'error') {
            this.#reject(new GPPError('CMP status is "error"; please check CMP setup', event));
          } else if (this.isCMPReady(event?.pingData || {}) && this.events.includes(event?.eventName)) {
            this.#resolve(this.updateConsent(event.pingData));
          }
        }
      });
    }
    return ready;
  }

  refresh() {
    return this.cmp({command: 'ping'}).then(this.updateWhenReady.bind(this));
  }

  /**
   * Retrieve and store GPP consent data.
   *
   * @param pingData
   * @returns {Promise<{}>} a promise to GPP consent data
   */
  updateConsent(pingData) {
    return this.getGPPData(pingData).then((data) => {
      if (data == null || isEmpty(data)) {
        throw new GPPError('Received empty response from CMP', data);
      }
      return processCmpData(data);
    }).then((data) => {
      logInfo('Retrieved GPP consent from CMP:', data);
      return data;
    });
  }

  /**
   * Return a promise to GPP consent data, to be retrieved the next time the CMP signals it's ready.
   *
   * @returns {Promise<{}>}
   */
  nextUpdate() {
    return new GreedyPromise((resolve, reject) => {
      this.#pending.push([resolve, reject]);
    });
  }

  /**
   * Return a promise to GPP consent data, to be retrieved immediately if the CMP is ready according to `pingData`,
   * or as soon as it signals that it's ready otherwise.
   *
   * @param pingData
   * @returns {Promise<{}>}
   */
  updateWhenReady(pingData) {
    return this.isCMPReady(pingData) ? this.updateConsent(pingData) : this.nextUpdate();
  }
}

// eslint-disable-next-line no-unused-vars
class GPP10Client extends GPPClient {
  static {
    super.register(GPP_10);
  }

  events = ['sectionChange', 'cmpStatus'];

  isCMPReady(pingData) {
    return pingData.cmpStatus === 'loaded';
  }

  getGPPData(pingData) {
    const parsedSections = GreedyPromise.all(
      (pingData.supportedAPIs || pingData.apiSupport || []).map((api) => this.cmp({
        command: 'getSection',
        parameter: api
      }).catch(err => {
        logWarn(`Could not retrieve GPP section '${api}'`, err);
      }).then((section) => [api, section]))
    ).then(sections => {
      // parse single section object into [core, gpc] to uniformize with 1.1 parsedSections
      return Object.fromEntries(
        sections.filter(([_, val]) => val != null)
          .map(([api, section]) => {
            const subsections = [
              Object.fromEntries(Object.entries(section).filter(([k]) => k !== 'Gpc'))
            ];
            if (section.Gpc != null) {
              subsections.push({
                SubsectionType: 1,
                Gpc: section.Gpc
              });
            }
            return [api, subsections];
          })
      );
    });
    return GreedyPromise.all([
      this.cmp({command: 'getGPPData'}),
      parsedSections
    ]).then(([gppData, parsedSections]) => Object.assign({}, gppData, {parsedSections}));
  }
}

// eslint-disable-next-line no-unused-vars
class GPP11Client extends GPPClient {
  static {
    super.register(GPP_11, true);
  }

  events = ['sectionChange', 'signalStatus'];

  isCMPReady(pingData) {
    return pingData.signalStatus === 'ready';
  }

  getGPPData(pingData) {
    return GreedyPromise.resolve(pingData);
  }
}

/**
 * This function handles interacting with an IAB compliant CMP to obtain the consent information of the user.
 * Given the async nature of the CMP's API, we pass in acting success/error callback functions to exit this function
 * based on the appropriate result.
 * @param {function({})} onSuccess acts as a success callback when CMP returns a value; pass along consentObjectfrom CMP
 * @param {function(string, ...{}?)} cmpError acts as an error callback while interacting with CMP; pass along an error message (string) and any extra error arguments (purely for logging)
 */
export function lookupIabConsent({onSuccess, onError}, mkCmp = cmpClient) {
  pipeCallbacks(() => GPPClient.init(mkCmp).then(([client, gppDataPm]) => gppDataPm), {onSuccess, onError});
}

// add new CMPs here, with their dedicated lookup function
const cmpCallMap = {
  'iab': lookupIabConsent,
  'static': lookupStaticConsentData
};

/**
 * Look up consent data and store it in the `consentData` global as well as `adapterManager.js`' gdprDataHandler.
 *
 * @param cb A callback that takes: a boolean that is true if the auction should be canceled; an error message and extra
 * error arguments that will be undefined if there's no error.
 */
function loadConsentData(cb) {
  let isDone = false;
  let timer = null;

  function done(consentData, shouldCancelAuction, errMsg, ...extraArgs) {
    if (timer != null) {
      clearTimeout(timer);
    }
    isDone = true;
    gppDataHandler.setConsentData(consentData);
    if (typeof cb === 'function') {
      cb(shouldCancelAuction, errMsg, ...extraArgs);
    }
  }

  if (!cmpCallMap.hasOwnProperty(userCMP)) {
    done(null, false, `GPP CMP framework (${userCMP}) is not a supported framework.  Aborting consentManagement module and resuming auction.`);
    return;
  }

  const callbacks = {
    onSuccess: (data) => done(data, false),
    onError: function (msg, ...extraArgs) {
      done(null, true, msg, ...extraArgs);
    }
  };
  cmpCallMap[userCMP](callbacks);

  if (!isDone) {
    const onTimeout = () => {
      const continueToAuction = (data) => {
        done(data, false, 'GPP CMP did not load, continuing auction...');
      };
      pipeCallbacks(() => processCmpData(consentData), {
        onSuccess: continueToAuction,
        onError: () => continueToAuction(storeConsentData())
      });
    };
    if (consentTimeout === 0) {
      onTimeout();
    } else {
      timer = setTimeout(onTimeout, consentTimeout);
    }
  }
}

/**
 * Like `loadConsentData`, but cache and re-use previously loaded data.
 * @param cb
 */
function loadIfMissing(cb) {
  if (consentData) {
    logInfo('User consent information already known.  Pulling internally stored information...');
    // eslint-disable-next-line standard/no-callback-literal
    cb(false);
  } else {
    loadConsentData(cb);
  }
}

/**
 * If consentManagement module is enabled (ie included in setConfig), this hook function will attempt to fetch the
 * user's encoded consent string from the supported CMP.  Once obtained, the module will store this
 * data as part of a gppConsent object which gets transferred to adapterManager's gppDataHandler object.
 * This information is later added into the bidRequest object for any supported adapters to read/pass along to their system.
 * @param {object} reqBidsConfigObj required; This is the same param that's used in pbjs.requestBids.
 * @param {function} fn required; The next function in the chain, used by hook.js
 */
export const requestBidsHook = timedAuctionHook('gpp', function requestBidsHook(fn, reqBidsConfigObj) {
  loadIfMissing(function (shouldCancelAuction, errMsg, ...extraArgs) {
    if (errMsg) {
      let log = logWarn;
      if (shouldCancelAuction) {
        log = logError;
        errMsg = `${errMsg} Canceling auction as per consentManagement config.`;
      }
      log(errMsg, ...extraArgs);
    }

    if (shouldCancelAuction) {
      fn.stopTiming();
      if (typeof reqBidsConfigObj.bidsBackHandler === 'function') {
        reqBidsConfigObj.bidsBackHandler();
      } else {
        logError('Error executing bidsBackHandler');
      }
    } else {
      fn.call(this, reqBidsConfigObj);
    }
  });
});

function processCmpData(consentData) {
  if (
    (consentData?.applicableSections != null && !Array.isArray(consentData.applicableSections)) ||
    (consentData?.gppString != null && !isStr(consentData.gppString)) ||
    (consentData?.parsedSections != null && !isPlainObject(consentData.parsedSections))
  ) {
    throw new GPPError('CMP returned unexpected value during lookup process.', consentData);
  }
  ['usnatv1', 'uscav1'].forEach(section => {
    if (consentData?.parsedSections?.[section]) {
      logWarn(`Received invalid section from cmp: '${section}'. Some functionality may not work as expected`, consentData)
    }
  })
  return storeConsentData(consentData);
}

/**
 * Stores CMP data locally in module to make information available in adaptermanager.js for later in the auction
 * @param {{}} gppData the result of calling a CMP's `getGPPData` (or equivalent)
 * @param {{}} sectionData map from GPP section name to the result of calling a CMP's `getSection` (or equivalent)
 */
export function storeConsentData(gppData = {}) {
  consentData = {
    gppString: gppData?.gppString,
    applicableSections: gppData?.applicableSections || [],
    parsedSections: gppData?.parsedSections || {},
    gppData: gppData
  };
  gppDataHandler.setConsentData(gppData);
  return consentData;
}

/**
 * Simply resets the module's consentData variable back to undefined, mainly for testing purposes
 */
export function resetConsentData() {
  consentData = undefined;
  userCMP = undefined;
  consentTimeout = undefined;
  gppDataHandler.reset();
  GPPClient.INST = null;
}

/**
 * A configuration function that initializes some module variables, as well as add a hook into the requestBids function
 * @param {{cmp:string, timeout:number, defaultGdprScope:boolean}} config required; consentManagement module config settings; cmp (string), timeout (int))
 */
export function setConsentConfig(config) {
  config = config && config.gpp;
  if (!config || typeof config !== 'object') {
    logWarn('consentManagement.gpp config not defined, exiting consent manager module');
    return;
  }

  if (isStr(config.cmpApi)) {
    userCMP = config.cmpApi;
  } else {
    userCMP = DEFAULT_CMP;
    logInfo(`consentManagement.gpp config did not specify cmp.  Using system default setting (${DEFAULT_CMP}).`);
  }

  if (isNumber(config.timeout)) {
    consentTimeout = config.timeout;
  } else {
    consentTimeout = DEFAULT_CONSENT_TIMEOUT;
    logInfo(`consentManagement.gpp config did not specify timeout.  Using system default setting (${DEFAULT_CONSENT_TIMEOUT}).`);
  }

  if (userCMP === 'static') {
    if (isPlainObject(config.consentData)) {
      staticConsentData = config.consentData;
      consentTimeout = 0;
    } else {
      logError(`consentManagement.gpp config with cmpApi: 'static' did not specify consentData. No consents will be available to adapters.`);
    }
  }

  logInfo('consentManagement.gpp module has been activated...');

  if (!addedConsentHook) {
    getGlobal().requestBids.before(requestBidsHook, 50);
    buildActivityParams.before((next, params) => {
      return next(Object.assign({gppConsent: gppDataHandler.getConsentData()}, params));
    });
  }
  addedConsentHook = true;
  gppDataHandler.enable();
  loadConsentData(); // immediately look up consent data to make it available without requiring an auction
}

config.getConfig('consentManagement', config => setConsentConfig(config.consentManagement));

export function enrichFPDHook(next, fpd) {
  return next(fpd.then(ortb2 => {
    const consent = gppDataHandler.getConsentData();
    if (consent) {
      if (Array.isArray(consent.applicableSections)) {
        deepSetValue(ortb2, 'regs.gpp_sid', consent.applicableSections);
      }
      deepSetValue(ortb2, 'regs.gpp', consent.gppString);
    }
    return ortb2;
  }));
}

enrichFPD.before(enrichFPDHook);
