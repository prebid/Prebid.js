import { cyrb53Hash, deepEqual, isEmpty, isStr, timestamp } from './utils.js';
import { defer, PbPromise } from './utils/promise.js';
import { config } from './config.js';
import type { ModuleType } from "./activities/modules.ts";

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

/** Resolves to ConsentData[K] when module has augmented that key, else unknown (core-only build). */
export type ConsentDataForKey<K extends ConsentType> = K extends keyof ConsentData ? ConsentData[K] : unknown;

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

export interface DefaultConsentMeta {
  generatedAt?: number;
}

export interface ConsentHandler<T, M> {
  readonly generatedTime: number,
  /**
   * reset this handler (mainly for tests)
   */
  reset(): void;
  getConsentData(): T;
  setConsentData(data: T): void;
  getConsentMeta(): M;
  error(err): void;
  onChange(listener: (consentData: T) => void): void;
  /**
   * Enable this consent handler. This should be called by the relevant consent management module
   * on initialization.
   */
  enable(): void;
  /**
   * True if the related consent management module is enabled.
   */
  readonly enabled: boolean;
  /**
   * true if consent data has been resolved (it may be `null` if the resolution failed).
   */
  readonly ready: boolean;
  /**
   * A promise than resolves to the consent data, or null if no consent data is available
   */
  readonly promise: Promise<T>;
  readonly hash: string;
}

export function consentHandler<T, M>(
  {
    getMeta = (consentData, generatedAt) => ({ generatedAt } as M),
    hashFields
  }: {
    getMeta?: (consentData: T, generatedAt: number) => M,
    hashFields?: string[]
  } = {}
): ConsentHandler<T, M> {
  let enabled;
  let dirty;
  let df;
  let generatedTime;
  let consentData;
  let ready;
  let hash;
  let error;
  let hasError;
  let listeners;
  function reset() {
    df = defer();
    enabled = false;
    consentData = null;
    ready = false;
    generatedTime = null;
    dirty = true;
    hash = null;
    error = null;
    hasError = false;
    listeners = [];
  }

  function getHashData(consentData) {
    return consentData && hashFields ? hashFields.map((f) => consentData[f]) : consentData;
  }

  function hasConsentChanged(newConsentData) {
    return !deepEqual(getHashData(consentData), getHashData(newConsentData));
  }

  function notifyListeners() {
    if (dirty) {
      listeners.forEach(l => l(consentData));
    }
  }

  function resolve(data) {
    dirty = hasConsentChanged(data);
    consentData = data;
    hasError = false;
    error = null;
    ready = true;
    df.resolve(data);
    notifyListeners();
  }
  function reject(err) {
    dirty = hasConsentChanged(null);
    consentData = null;
    ready = true;
    error = err;
    hasError = true;
    df.reject(err);
    notifyListeners();
  }
  reset();

  return {
    reset,
    get generatedTime() {
      return generatedTime;
    },
    enable() {
      enabled = true;
    },
    get enabled() {
      return enabled;
    },
    get ready() {
      return ready;
    },
    get promise() {
      if (ready) {
        return hasError ? PbPromise.reject(error) : PbPromise.resolve(consentData);
      }
      if (!enabled) {
        resolve(null);
      }
      return df.promise;
    },
    setConsentData(data: T, time = timestamp()) {
      generatedTime = time;
      resolve(data);
    },
    getConsentData(): T {
      return enabled ? consentData : null;
    },
    getConsentMeta(): M {
      if (generatedTime != null && consentData != null) {
        return getMeta(consentData, generatedTime);
      }
    },
    error: reject,
    get hash() {
      if (dirty) {
        hash = cyrb53Hash(
          JSON.stringify(getHashData(consentData))
        );
        dirty = false;
      }
      return hash;
    },
    onChange(listener) {
      listeners.push(listener);
    }
  };
}

export const uspDataHandler = consentHandler<ConsentDataFor<typeof CONSENT_USP>, DefaultConsentMeta>();

export const gdprDataHandler = consentHandler({
  getMeta(consentData: ConsentDataFor<typeof CONSENT_GDPR>, generatedAt) {
    if (consentData.vendorData) {
      return {
        gdprApplies: consentData.gdprApplies,
        consentStringSize: isStr(consentData.vendorData.tcString)
          ? consentData.vendorData.tcString.length
          : 0,
        generatedAt,
        apiVersion: consentData.apiVersion,
      };
    }
  },
  hashFields: ['gdprApplies', 'consentString']
});

export const gppDataHandler = consentHandler<ConsentDataFor<typeof CONSENT_GPP>, DefaultConsentMeta>({
  hashFields: ['applicableSections', 'gppString'],
});

export const coppaDataHandler = (() => {
  const handler = ((handler) => Object.assign(handler, {
    getCoppa() {
      return handler.getConsentData();
    },
    reset() {}
  }))(consentHandler<boolean, boolean>({
    getMeta(consentData, generatedAt) {
      return consentData;
    }
  }));
  handler.enable();
  handler.setConsentData(!!config.getConfig('coppa'));
  config.getConfig('coppa', (cfg) => {
    // on resetConfig cfg.coppa comes in as an empty object
    handler.setConsentData(typeof cfg.coppa === 'object' && isEmpty(cfg.coppa) ? false : !!cfg.coppa);
  });
  return handler;
})();

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
};

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
      const result: GVLIDResult = { modules: registry[moduleName] || {} };
      if (flat.hasOwnProperty(moduleName) && flat[moduleName] !== none) {
        result.gvlid = flat[moduleName];
      }
      return result;
    }
  };
}

declare module './config' {
  interface Config {
    /**
     * Child Online Privacy Protection Act (COPPA) flag.
     */
    coppa?: boolean;
  }
}

export const GDPR_GVLIDS = gvlidRegistry();

const ALL_HANDLERS = {
  [CONSENT_GDPR]: gdprDataHandler,
  [CONSENT_USP]: uspDataHandler,
  [CONSENT_GPP]: gppDataHandler,
  [CONSENT_COPPA]: coppaDataHandler,
} as const;

export type AllConsentData = {
  [K in keyof typeof ALL_HANDLERS]: ReturnType<(typeof ALL_HANDLERS)[K]['getConsentData']>
};

export type AllConsentMeta = {
  [K in keyof typeof ALL_HANDLERS]: ReturnType<(typeof ALL_HANDLERS)[K]['getConsentMeta']>
};

type MultiHandler = Pick<ConsentHandler<AllConsentData, AllConsentMeta>, 'promise' | 'hash' | 'getConsentData' | 'reset' | 'getConsentMeta' | 'onChange'>;

export function multiHandler(handlers = ALL_HANDLERS): MultiHandler {
  const entries = Object.entries(handlers);
  function collector(method): any {
    return function () {
      return Object.fromEntries(entries.map(([name, handler]) => [name, handler[method]()]));
    };
  }
  const getConsentData = collector('getConsentData');
  const resetAll = collector('reset');
  let listeners;
  function reset() {
    listeners = [];
    Object.values(handlers).forEach(handler => handler.onChange(() => {
      listeners.forEach((listener) => listener(getConsentData()));
    }));
  }
  reset();

  return {
    getConsentData,
    onChange(listener) {
      listeners.push(listener);
    },
    get promise() {
      return PbPromise.all(entries.map(([name, handler]) => handler.promise.then(val => [name, val])))
        .then(entries => Object.fromEntries(entries));
    },
    get hash() {
      return cyrb53Hash(entries.map(([_, handler]) => handler.hash).join(':'));
    },
    getConsentMeta: collector('getConsentMeta'),
    reset() {
      resetAll();
      reset();
    }
  };
}

export const allConsent = multiHandler();
export const GVL_PURPOSES = {}; // this is populated by plugins/gvlPurposes.js
