import {isStr, timestamp} from './utils.js';
import {defer, GreedyPromise} from './utils/promise.js';

/**
 * Placeholder gvlid for when vendor consent is not required. When this value is used as gvlid, the gdpr
 * enforcement module will take it to mean "vendor consent was given".
 *
 * see https://github.com/prebid/Prebid.js/issues/8161
 */
export const VENDORLESS_GVLID = Object.freeze({});

export class ConsentHandler {
  #enabled;
  #data;
  #defer;
  #ready;
  generatedTime;

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
  get promise() {
    if (this.#ready) {
      return GreedyPromise.resolve(this.#data);
    }
    if (!this.#enabled) {
      this.#resolve(null);
    }
    return this.#defer.promise;
  }

  setConsentData(data, time = timestamp()) {
    this.generatedTime = time;
    this.#resolve(data);
  }

  getConsentData() {
    return this.#data;
  }
}

export class UspConsentHandler extends ConsentHandler {
  getConsentMeta() {
    const consentData = this.getConsentData();
    if (consentData && this.generatedTime) {
      return {
        usp: consentData,
        generatedAt: this.generatedTime
      };
    }
  }
}

export class GdprConsentHandler extends ConsentHandler {
  getConsentMeta() {
    const consentData = this.getConsentData();
    if (consentData && consentData.vendorData && this.generatedTime) {
      return {
        gdprApplies: consentData.gdprApplies,
        consentStringSize: (isStr(consentData.vendorData.tcString)) ? consentData.vendorData.tcString.length : 0,
        generatedAt: this.generatedTime,
        apiVersion: consentData.apiVersion
      }
    }
  }
}

export class GppConsentHandler extends ConsentHandler {
  getConsentMeta() {
    const consentData = this.getConsentData();
    if (consentData && this.generatedTime) {
      return {
        generatedAt: this.generatedTime,
      }
    }
  }
}

export function gvlidRegistry() {
  const registry = {};
  const flat = {};
  const none = {};
  return {
    /**
     * Register a module's GVL ID.
     * @param {string} moduleType defined in `activities/modules.js`
     * @param {string} moduleName
     * @param {number} gvlid
     */
    register(moduleType, moduleName, gvlid) {
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
     * @param {string} moduleName
     * @return {{modules: {[moduleType]: number}, gvlid?: number}} an object where:
     *   `modules` is a map from module type to that module's GVL ID;
     *   `gvlid` is the single GVL ID for this family of modules (only defined
     *   if all modules with this name declared the same ID).
     */
    get(moduleName) {
      const result = {modules: registry[moduleName] || {}};
      if (flat.hasOwnProperty(moduleName) && flat[moduleName] !== none) {
        result.gvlid = flat[moduleName];
      }
      return result;
    }
  }
}

export const GDPR_GVLIDS = gvlidRegistry();
