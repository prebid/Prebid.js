import { cyrb53Hash, deepEqual, isEmpty, isStr, timestamp, uniques } from './utils.js';
import { defer, PbPromise } from './utils/promise.js';
import { config } from './config.js';
import type { ModuleType } from "./activities/modules.ts";
import type { TCFConsentData } from "./types/consent/tcf.d.ts";
import type { GPPConsentData } from "./types/consent/gpp.d.ts";
import type { USPConsentData } from "./types/consent/usp.d.ts";
import type { GCMConsentData } from "./types/consent/gcm.d.ts";

/**
 * Placeholder gvlid for when vendor consent is not required. When this value is used as gvlid, the gdpr
 * enforcement module will take it to mean "vendor consent was given".
 *
 * see https://github.com/prebid/Prebid.js/issues/8161
 */
export const VENDORLESS_GVLID: unique symbol = Symbol("VENDORLESS_GVLID");
export const CONSENT_GDPR = 'gdpr';
export const CONSENT_GPP = 'gpp';
export const CONSENT_USP = 'usp';
export const CONSENT_COPPA = 'coppa';
export const CONSENT_GCM = 'gcm';
export type ConsentType = typeof CONSENT_GDPR | typeof CONSENT_GPP | typeof CONSENT_USP | typeof CONSENT_COPPA | typeof CONSENT_GCM;

/**
 * Consent data by framework. Every member type is declared in core, so it is known whether or not
 * the module that populates it is part of the build; the data itself is only ever collected by that
 * module.
 */
export interface ConsentData {
  [CONSENT_GDPR]: TCFConsentData;
  [CONSENT_GPP]: GPPConsentData;
  [CONSENT_USP]: USPConsentData;
  [CONSENT_COPPA]: boolean;
  [CONSENT_GCM]: GCMConsentData;
}

export type ConsentDataForKey<K extends ConsentType> = ConsentData[K];

type ConsentDataFor<T extends ConsentType> = ConsentData[T];

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
   * Reset this handler's consent data and state, as when its module is disabled. Listeners registered through
   * `onChange` are kept, so that consumers wired up once (such as `allConsent`) see it again once re-enabled.
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
  /**
   * True if `hash` is part of the combined hash of all consent (`allConsent.hash`).
   */
  readonly includeHash: boolean;
}

export function consentHandler<T, M>(
  {
    getMeta = (consentData, generatedAt) => ({ generatedAt } as M),
    hashFields,
    includeHash = () => true
  }: {
    getMeta?: (consentData: T, generatedAt: number) => M,
    hashFields?: string[],
    includeHash?: (handler: { enabled: boolean }) => boolean
  } = {}
): ConsentHandler<T, M> {
  let enabled;
  let dirty;
  let df;
  let waiting = false;
  let generatedTime;
  let consentData;
  let ready;
  let hash;
  let error;
  let hasError;
  const listeners = [];
  function reset() {
    if (waiting && !ready) {
      // Reconfiguration can enable the handler again before this stack unwinds.
      const pending = df;
      Promise.resolve().then(() => {
        if (!enabled && !ready && df === pending) {
          df = defer();
          waiting = false;
          pending.resolve(null);
        }
      });
    } else {
      df = defer();
      waiting = false;
    }
    enabled = false;
    consentData = null;
    ready = false;
    generatedTime = null;
    dirty = true;
    hash = null;
    error = null;
    hasError = false;
  }

  function getHashData(consentData) {
    return consentData && hashFields ? hashFields.map((f) => consentData[f]) : consentData;
  }

  function hasConsentChanged(newConsentData) {
    return !deepEqual(getHashData(consentData), getHashData(newConsentData));
  }

  function update(data) {
    const changed = hasConsentChanged(data);
    // `dirty` means the hash is stale; it stays so until the hash is computed, even if the same data is set again
    dirty = dirty || changed;
    consentData = data;
    return changed;
  }

  function notifyListeners(changed) {
    if (changed) {
      listeners.forEach(l => l(consentData));
    }
  }

  function resolve(data) {
    const changed = update(data);
    hasError = false;
    error = null;
    ready = true;
    df.resolve(data);
    notifyListeners(changed);
  }
  function reject(err) {
    const changed = update(null);
    ready = true;
    error = err;
    hasError = true;
    df.reject(err);
    notifyListeners(changed);
  }
  reset();

  return {
    reset,
    get generatedTime() {
      return generatedTime;
    },
    enable() {
      if (!enabled && ready) {
        reset();
      }
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
      waiting = !ready;
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
    get includeHash() {
      return includeHash({ enabled });
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
  // addtlConsent can change while the TC string stays the same, and affects enforcement for Additional Consent providers
  hashFields: ['gdprApplies', 'consentString', 'addtlConsent']
});

export const gppDataHandler = consentHandler<ConsentDataFor<typeof CONSENT_GPP>, DefaultConsentMeta>({
  hashFields: ['applicableSections', 'gppString'],
});

export const gcmDataHandler = consentHandler<ConsentDataFor<typeof CONSENT_GCM>, DefaultConsentMeta>({
  // keeps the combined hash, which userId stores to detect consent changes, as it was for publishers who do not use GCM
  includeHash: ({ enabled }) => enabled,
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

/**
 * One or more GVL IDs. A module that acts on behalf of several vendors may declare all of their IDs;
 * the TCF control module then requires every one of them to have a legal basis.
 */
export type GVLIDs = number | readonly number[];
export type GVLID = GVLIDs | typeof VENDORLESS_GVLID;

/**
 * Normalize a GVL ID declaration: lists are deduplicated and sorted, an empty list becomes `null`,
 * and a list with a single element becomes that element.
 */
export function normalizeGvlid<T>(gvlid: T | readonly number[]): T | number | number[] | null {
  if (Array.isArray(gvlid)) {
    const ids = gvlid.filter(id => typeof id === 'number').filter(uniques).sort((a, b) => a - b);
    return ids.length === 0 ? null : ids.length === 1 ? ids[0] : ids;
  }
  return (gvlid as T) ?? null;
}

/**
 * Turn a (normalized) GVL ID declaration into a list.
 */
export function gvlidList<T>(gvlid: T | readonly number[] | null | undefined): (T | number)[] {
  if (gvlid == null) return [];
  return Array.isArray(gvlid) ? [...gvlid] : [gvlid as T];
}

type GVLIDResult<T = GVLID> = {
  /**
   * A map from module type to that module's GVL ID.
   */
  modules: {
    [moduleType: string]: T;
  };
  /**
   * The single GVL ID for this family of modules (only defined if all modules with this name declared the same ID).
   */
  gvlid?: T;
};

export function gvlidRegistry<T = GVLID>() {
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
    register(moduleType: ModuleType, moduleName: string, gvlid: T) {
      gvlid = normalizeGvlid(gvlid) as T;
      if (gvlid) {
        const moduleMap = (registry[moduleName] = registry[moduleName] || {});
        moduleMap[moduleType] = gvlid;
        const values = Object.values(moduleMap);
        flat[moduleName] = values.every((value) => deepEqual(value, values[0])) ? values[0] : none;
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
      const result: GVLIDResult<T> = { modules: registry[moduleName] || {} };
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

/**
 * Registry of Google Additional Consent provider IDs.
 * These are a separate ID space from GVL IDs (the same number may identify different vendors in each list).
 * @see https://support.google.com/admanager/answer/9681920
 */
export const GDPR_ACPIDS = gvlidRegistry<number>();

const ALL_HANDLERS = {
  [CONSENT_GDPR]: gdprDataHandler,
  [CONSENT_USP]: uspDataHandler,
  [CONSENT_GPP]: gppDataHandler,
  [CONSENT_COPPA]: coppaDataHandler,
  [CONSENT_GCM]: gcmDataHandler,
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
  let listeners = [];
  // handlers keep their listeners across their own reset, so this is registered only once
  Object.values(handlers).forEach(handler => handler.onChange(() => {
    listeners.forEach((listener) => listener(getConsentData()));
  }));

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
      return cyrb53Hash(
        entries
          .filter(([_, handler]) => handler.includeHash)
          .map(([_, handler]) => handler.hash)
          .join(':')
      );
    },
    getConsentMeta: collector('getConsentMeta'),
    reset() {
      resetAll();
      listeners = [];
    }
  };
}

export const allConsent = multiHandler();
export const GVL_PURPOSES = {}; // this is populated by plugins/gvlPurposes.js
