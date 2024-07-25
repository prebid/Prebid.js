/**
 * This module adds GPP consentManagement support to prebid.js.  It interacts with
 * supported CMPs (Consent Management Platforms) to grab the user's consent information
 * and make it available for any GPP supported adapters to read/pass this information to
 * their system and for various other features/modules in Prebid.js.
 */
import {deepSetValue, isEmpty, isPlainObject, isStr, logInfo, logWarn} from '../src/utils.js';
import {config} from '../src/config.js';
import {gppDataHandler} from '../src/adapterManager.js';
import {enrichFPD} from '../src/fpd/enrichment.js';
import {cmpClient, MODE_CALLBACK} from '../libraries/cmp/cmpClient.js';
import {PbPromise} from '../src/utils/promise.js';
import {configParser} from '../libraries/consentManagement/cmUtils.js';

export let consentConfig = {};

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
      const consentData = parseConsentData(pingData);
      logInfo('Retrieved GPP consent from CMP:', consentData);
      gppDataHandler.setConsentData(consentData);
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
};

function parseConsentData(cmpData) {
  if (
    (cmpData?.applicableSections != null && !Array.isArray(cmpData.applicableSections)) ||
    (cmpData?.gppString != null && !isStr(cmpData.gppString)) ||
    (cmpData?.parsedSections != null && !isPlainObject(cmpData.parsedSections))
  ) {
    throw new GPPError('CMP returned unexpected value during lookup process.', cmpData);
  }
  ['usnatv1', 'uscav1'].forEach(section => {
    if (cmpData?.parsedSections?.[section]) {
      logWarn(`Received invalid section from cmp: '${section}'. Some functionality may not work as expected`, cmpData);
    }
  });
  return toConsentData(cmpData);
}

export function toConsentData(gppData = {}) {
  return {
    gppString: gppData?.gppString,
    applicableSections: gppData?.applicableSections || [],
    parsedSections: gppData?.parsedSections || {},
    gppData: gppData
  };
}

/**
 * Simply resets the module's consentData variable back to undefined, mainly for testing purposes
 */
export function resetConsentData() {
  consentConfig = {};
  gppDataHandler.reset();
  GPPClient.INST = null;
}

const parseConfig = configParser({
  namespace: 'gpp',
  displayName: 'GPP',
  consentDataHandler: gppDataHandler,
  parseConsentData,
  getNullConsent: () => toConsentData(null),
  cmpHandlers: cmpCallMap
});

export function setConsentConfig(config) {
  consentConfig = parseConfig(config);
  return consentConfig.consentDataLoaded?.catch(() => null);
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
