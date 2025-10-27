import {cyrb53Hash, isStr, timestamp} from './utils.js';
import {defer, PbPromise} from './utils/promise.js';
import {config} from './config.js';
import type {ModuleType} from "./activities/modules.ts";

/**
 * Placeholder gvlid for when vendor consent is not required. When this value is used as gvlid, the gdpr
 * enforcement module will take it to mean "vendor consent was given".
 *
 * see https://github.com/prebid/Prebid.js/issues/8161
 */
export const VENDORLESS_GVLID = Object.freeze({});
export const CONSENT_GDPR = 'gdpr';
export const CONSENT_GPP = 'gpp';
export const CONSENT_USP = 'usp';
export const CONSENT_COPPA = 'coppa';
export type ConsentType = typeof CONSENT_GDPR | typeof CONSENT_GPP | typeof CONSENT_USP | typeof CONSENT_COPPA;

export interface ConsentData {
  // with just core, only coppa is defined - everything else will be null.
  // importing consent modules also imports the type definitions.
  [CONSENT_COPPA]: boolean;
}

type ConsentDataFor<T extends ConsentType> = T extends keyof ConsentData ? ConsentData[T] : null;

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ConsentManagementConfig {
  // consentManagement config - extended in consent management modules
}

declare module './config' {
  interface Config {
    consentManagement?: ConsentManagementConfig;
  }
}

export class ConsentHandler<T> {
  #enabled;
  #data;
  #defer;
  #ready;
  #dirty = true;
  #hash;
  generatedTime: number;
  hashFields;

  constructor() {
    this.reset();
  }

  #resolve(data) {
    this.#ready = true;
    this.#data = data;
    this.#defer.resolve(data);
  }

  /**
   * reset this handler (mainly for tests)
   */
  reset() {
    this.#defer = defer();
    this.#enabled = false;
    this.#data = null;
    this.#ready = false;
    this.generatedTime = null;
  }

  /**
   * Enable this consent handler. This should be called by the relevant consent management module
   * on initialization.
   */
  enable() {
    this.#enabled = true;
  }

  /**
   * @returns {boolean} true if the related consent management module is enabled.
   */
  get enabled() {
    return this.#enabled;
  }

  /**
   * @returns {boolean} true if consent data has been resolved (it may be `null` if the resolution failed).
   */
  get ready() {
    return this.#ready;
  }

  /**
   * @returns a promise than resolves to the consent data, or null if no consent data is available
   */
  get promise(): Promise<T> {
    if (this.#ready) {
      return PbPromise.resolve(this.#data);
    }
    if (!this.#enabled) {
      this.#resolve(null);
    }
    return this.#defer.promise;
  }

  setConsentData(data: T, time = timestamp()) {
    this.generatedTime = time;
    this.#dirty = true;
    this.#resolve(data);
  }

  getConsentData(): T {
    if (this.#enabled) {
      return this.#data;
    }
    return null;
  }

  get hash() {
    if (this.#dirty) {
      this.#hash = cyrb53Hash(
        JSON.stringify(
          this.#data && this.hashFields ? this.hashFields.map((f) => this.#data[f]) : this.#data
        )
      );
      this.#dirty = false;
    }
    return this.#hash;
  }
}

class UspConsentHandler extends ConsentHandler<ConsentDataFor<typeof CONSENT_USP>> {
  getConsentMeta() {
    const consentData = this.getConsentData();
    if (consentData && this.generatedTime) {
      return {
        generatedAt: this.generatedTime
      };
    }
  }
}

class GdprConsentHandler extends ConsentHandler<ConsentDataFor<typeof CONSENT_GDPR>> {
  hashFields = ["gdprApplies", "consentString"];
  getConsentMeta() {
    const consentData = this.getConsentData();
    if (consentData && consentData.vendorData && this.generatedTime) {
      return {
        gdprApplies: consentData.gdprApplies as boolean,
        consentStringSize: isStr(consentData.vendorData.tcString)
          ? consentData.vendorData.tcString.length
          : 0,
        generatedAt: this.generatedTime,
        apiVersion: consentData.apiVersion,
      };
    }
  }
}

class GppConsentHandler extends ConsentHandler<ConsentDataFor<typeof CONSENT_GPP>> {
  hashFields = ['applicableSections', 'gppString'];
  getConsentMeta() {
    const consentData = this.getConsentData();
    if (consentData && this.generatedTime) {
      return {
        generatedAt: this.generatedTime,
      }
    }
  }
}

export type GVLID = number | typeof VENDORLESS_GVLID;
type GVLIDResult = {
  /**
   * A map from module type to that module's GVL ID.
   */
  modules: {
    [moduleType: string]: GVLID;
  };
  /**
   * The single GVL ID for this family of modules (only defined if all modules with this name declared the same ID).
   */
  gvlid?: GVLID;
}

export function gvlidRegistry() {
  const registry = {};
  const flat = {};
  const none = {};
  return {
    /**
     * Register a module's GVL ID.
     * @param moduleType defined in `activities/modules.js`
     * @param moduleName
     * @param gvlid
     */
    register(moduleType: ModuleType, moduleName: string, gvlid: GVLID) {
      if (gvlid) {
        (registry[moduleName] = registry[moduleName] || {})[moduleType] = gvlid;
        if (flat.hasOwnProperty(moduleName)) {
          if (flat[moduleName] !== gvlid) flat[moduleName] = none;
        } else {
          flat[moduleName] = gvlid;
        }
      }
    },

    /**
     * Get a module's GVL ID(s).
     *
     * @param moduleName - The name of the module.
     * @return An object where:
     *   `modules` is a map from module type to that module's GVL ID;
     *   `gvlid` is the single GVL ID for this family of modules (only defined if all modules with this name declare the same ID).
     */
    get(moduleName: string) {
      const result: GVLIDResult = {modules: registry[moduleName] || {}};
      if (flat.hasOwnProperty(moduleName) && flat[moduleName] !== none) {
        result.gvlid = flat[moduleName];
      }
      return result;
    }
  }
}

export const gdprDataHandler = new GdprConsentHandler();
export const uspDataHandler = new UspConsentHandler();
export const gppDataHandler = new GppConsentHandler();

declare module './config' {
  interface Config {
    /**
     * Child Online Privacy Protection Act (COPPA) flag.
     */
    coppa?: boolean;
  }
}

export const coppaDataHandler = (() => {
  function getCoppa() {
    return !!(config.getConfig('coppa'))
  }
  return {
    getCoppa,
    getConsentData: getCoppa,
    getConsentMeta: getCoppa,
    reset() {},
    get promise() {
      return PbPromise.resolve(getCoppa())
    },
    get hash() {
      return getCoppa() ? '1' : '0'
    }
  }
})();

export const GDPR_GVLIDS = gvlidRegistry();

const ALL_HANDLERS = {
  [CONSENT_GDPR]: gdprDataHandler,
  [CONSENT_USP]: uspDataHandler,
  [CONSENT_GPP]: gppDataHandler,
  [CONSENT_COPPA]: coppaDataHandler,
} as const;

export type AllConsentData = {
  [K in keyof typeof ALL_HANDLERS]: ReturnType<(typeof ALL_HANDLERS)[K]['getConsentData']>
}

interface MultiHandler extends Pick<ConsentHandler<AllConsentData>, 'promise' | 'hash' | 'getConsentData' | 'reset'> {
  getConsentMeta(): {[K in keyof typeof ALL_HANDLERS]: ReturnType<(typeof ALL_HANDLERS)[K]['getConsentMeta']>}
}

export function multiHandler(handlers = ALL_HANDLERS): MultiHandler {
  const entries = Object.entries(handlers);
  function collector(method) {
    return function () {
      return Object.fromEntries(entries.map(([name, handler]) => [name, handler[method]()]))
    }
  }
  return Object.assign(
    {
      get promise() {
        return PbPromise.all(entries.map(([name, handler]) => handler.promise.then(val => [name, val])))
          .then(entries => Object.fromEntries(entries));
      },
      get hash() {
        return cyrb53Hash(entries.map(([_, handler]) => handler.hash).join(':'));
      }
    },
    Object.fromEntries(['getConsentData', 'getConsentMeta', 'reset'].map(n => [n, collector(n)])),
  ) as any;
}

export const allConsent = multiHandler();
