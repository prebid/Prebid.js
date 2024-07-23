/**
 * This module adds GPP consentManagement support to prebid.js.  It interacts with
 * supported CMPs (Consent Management Platforms) to grab the user's consent information
 * and make it available for any GPP supported adapters to read/pass this information to
 * their system and for various other features/modules in Prebid.js.
 */
import {deepSetValue, isEmpty, isNumber, isPlainObject, isStr, logError, logInfo, logWarn} from '../src/utils.js';
import {config} from '../src/config.js';
import {gppDataHandler} from '../src/adapterManager.js';
import {enrichFPD} from '../src/fpd/enrichment.js';
import {getGlobal} from '../src/prebidGlobal.js';
import {cmpClient, MODE_CALLBACK} from '../libraries/cmp/cmpClient.js';
import {PbPromise} from '../src/utils/promise.js';
import {buildActivityParams} from '../src/activities/params.js';
import {consentManagementHook, lookupConsentData} from '../libraries/consentManagement/cmUtils.js';

const DEFAULT_CMP = 'iab';
const DEFAULT_CONSENT_TIMEOUT = 10000;

export let userCMP;
export let consentTimeout;
let staticConsentData;

export let consentDataLoaded;
let addedConsentHook = false;

function lookupStaticConsentData() {
  return new PbPromise((resolve) => resolve(processCmpData(staticConsentData)));
}

class GPPError {
  constructor(message, arg) {
    this.message = message;
    this.args = arg == null ? [] : [arg];
  }
}

export class GPPClient {
  apiVersion = '1.1';
  static INST;

  static get(mkCmp = cmpClient) {
    if (this.INST == null) {
      const cmp = mkCmp({
        apiName: '__gpp',
        apiArgs: ['command', 'callback', 'parameter'], // do not pass version - not clear what it's for (or what we should use),
        mode: MODE_CALLBACK
      });
      if (cmp == null) {
        throw new GPPError('GPP CMP not found');
      }
      this.INST = new this(cmp);
    }
    return this.INST;
  }

  #resolve;
  #reject;
  #pending = [];

  initialized = false;

  constructor(cmp) {
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
      if (pingData.gppVersion !== this.apiVersion) {
        logWarn(`Unrecognized GPP CMP version: ${pingData.apiVersion}. Continuing using GPP API version ${this.apiVersion}...`);
      }
      this.initialized = true;
      this.cmp({
        command: 'addEventListener',
        callback: (event, success) => {
          if (success != null && !success) {
            this.#reject(new GPPError('Received error response from CMP', event));
          } else if (event?.pingData?.cmpStatus === 'error') {
            this.#reject(new GPPError('CMP status is "error"; please check CMP setup', event));
          } else if (this.isCMPReady(event?.pingData || {}) && ['sectionChange', 'signalStatus'].includes(event?.eventName)) {
            this.#resolve(this.updateConsent(event.pingData));
          }
        }
      });
    }
    return ready;
  }

  refresh() {
    return this.cmp({command: 'ping'}).then(this.init.bind(this));
  }

  /**
   * Retrieve and store GPP consent data.
   *
   * @param pingData
   * @returns {Promise<{}>} a promise to GPP consent data
   */
  updateConsent(pingData) {
    return new PbPromise(resolve => {
      if (pingData == null || isEmpty(pingData)) {
        throw new GPPError('Received empty response from CMP', pingData);
      }
      const consentData = processCmpData(pingData);
      logInfo('Retrieved GPP consent from CMP:', consentData);
      resolve(consentData);
    });
  }

  /**
   * Return a promise to GPP consent data, to be retrieved the next time the CMP signals it's ready.
   *
   * @returns {Promise<{}>}
   */
  nextUpdate() {
    return new PbPromise((resolve, reject) => {
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

  isCMPReady(pingData) {
    return pingData.signalStatus === 'ready';
  }
}

function lookupIabConsent() {
  return new PbPromise((resolve) => resolve(GPPClient.get().refresh()))
}

// add new CMPs here, with their dedicated lookup function
const cmpCallMap = {
  'iab': lookupIabConsent,
  'static': lookupStaticConsentData
};

/**
 * If consentManagement module is enabled (ie included in setConfig), this hook function will attempt to fetch the
 * user's encoded consent string from the supported CMP.  Once obtained, the module will store this
 * data as part of a gppConsent object which gets transferred to adapterManager's gppDataHandler object.
 * This information is later added into the bidRequest object for any supported adapters to read/pass along to their system.
 * @param {object} reqBidsConfigObj required; This is the same param that's used in pbjs.requestBids.
 * @param {function} fn required; The next function in the chain, used by hook.js
 */
export const requestBidsHook = consentManagementHook('gpp', () => consentDataLoaded);

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
      logWarn(`Received invalid section from cmp: '${section}'. Some functionality may not work as expected`, consentData);
    }
  });
  return storeConsentData(consentData);
}

/**
 * Stores CMP data locally in module to make information available in adaptermanager.js for later in the auction
 * @param {{}} gppData the result of calling a CMP's `getGPPData` (or equivalent)
 */
export function storeConsentData(gppData = {}) {
  const consentData = {
    gppString: gppData?.gppString,
    applicableSections: gppData?.applicableSections || [],
    parsedSections: gppData?.parsedSections || {},
    gppData: gppData
  };
  gppDataHandler.setConsentData(consentData);
  return consentData;
}

/**
 * Simply resets the module's consentData variable back to undefined, mainly for testing purposes
 */
export function resetConsentData() {
  consentDataLoaded = undefined;
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
      consentTimeout = null;
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
  consentDataLoaded = lookupConsentData({
    name: 'GPP',
    consentDataHandler: gppDataHandler,
    cmpHandler: userCMP,
    cmpHandlerMap: cmpCallMap,
    cmpTimeout: consentTimeout,
    getNullConsent: () => storeConsentData()
  });
  return consentDataLoaded.catch(() => null);
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
