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
import {PbPromise, defer} from '../src/utils/promise.js';
import {type CMConfig, configParser} from '../libraries/consentManagement/cmUtils.js';
import {createCmpEventManager, type CmpEventManager} from '../libraries/cmp/cmpEventUtils.js';
import {CONSENT_GPP} from "../src/consentHandler.ts";

export let consentConfig = {} as any;

// CMP event manager instance for GPP
let gppCmpEventManager: CmpEventManager | null = null;

type RelevantCMPData = {
  applicableSections: number[]
  gppString: string;
  parsedSections: Record<string, unknown>
}

type CMPData = RelevantCMPData & { [key: string]: unknown };

export type GPPConsentData = RelevantCMPData & {
  gppData: CMPData;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface GPPConfig {
  // this is here to be extended by the control modules
}

export type GPPCMConfig = GPPConfig & CMConfig<RelevantCMPData>;

declare module '../src/consentHandler' {
  interface ConsentData {
    [CONSENT_GPP]: GPPConsentData;
  }
  interface ConsentManagementConfig {
    [CONSENT_GPP]?: GPPCMConfig;
  }
}

class GPPError {
  message;
  args;
  constructor(message, arg?) {
    this.message = message;
    this.args = arg == null ? [] : [arg];
  }
}

export class GPPClient {
  apiVersion = '1.1';
  cmp;
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
    [this.#resolve, this.#reject] = ['resolve', 'reject'].map(slot => (result) => {
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

      // Initialize CMP event manager and set CMP API
      if (!gppCmpEventManager) {
        gppCmpEventManager = createCmpEventManager('gpp');
      }
      gppCmpEventManager.setCmpApi(this.cmp);

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
          // NOTE: according to https://github.com/InteractiveAdvertisingBureau/Global-Privacy-Platform/blob/main/Core/CMP%20API%20Specification.md,
          // > [signalStatus] Event is called whenever the display status of the CMP changes (e.g. the CMP shows the consent layer).
          //
          // however, from real world testing, at least some CMPs only trigger 'cmpDisplayStatus'
          // other CMPs may do something else yet; here we just look for 'signalStatus: not ready' on any event
          // to decide if consent data is likely to change
          if (gppDataHandler.getConsentData() != null && event?.pingData != null && !this.isCMPReady(event.pingData)) {
            gppDataHandler.setConsentData(null);
          }

          if (event?.listenerId !== null && event?.listenerId !== undefined) {
            gppCmpEventManager?.setCmpListenerId(event?.listenerId);
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
    const def = defer();
    this.#pending.push(def);
    return def.promise;
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

export function toConsentData(gppData = {} as any): GPPConsentData {
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

export function removeCmpListener() {
  // Clean up CMP event listeners before resetting
  if (gppCmpEventManager) {
    gppCmpEventManager.removeCmpEventListener();
    gppCmpEventManager = null;
  }
  resetConsentData();
}

const parseConfig = configParser({
  namespace: 'gpp',
  displayName: 'GPP',
  consentDataHandler: gppDataHandler,
  parseConsentData,
  getNullConsent: () => toConsentData(null),
  cmpHandlers: cmpCallMap,
  cmpEventCleanup: removeCmpListener
});

export function setConsentConfig(config) {
  consentConfig = parseConfig(config);
  return consentConfig.loadConsentData?.()?.catch?.(() => null);
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
