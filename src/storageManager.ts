import {checkCookieSupport, hasDeviceAccess, logError} from './utils.js';
import {bidderSettings} from './bidderSettings.js';
import {MODULE_TYPE_BIDDER, MODULE_TYPE_PREBID, type ModuleType} from './activities/modules.js';
import {isActivityAllowed, registerActivityControl} from './activities/rules.js';
import {
  ACTIVITY_PARAM_ADAPTER_CODE,
  ACTIVITY_PARAM_COMPONENT_TYPE,
  ACTIVITY_PARAM_STORAGE_KEY,
  ACTIVITY_PARAM_STORAGE_TYPE,
  ACTIVITY_PARAM_STORAGE_WRITE
} from './activities/params.js';

import {ACTIVITY_ACCESS_DEVICE, ACTIVITY_ACCESS_REQUEST_CREDENTIALS} from './activities/activities.js';
import {config} from './config.js';
import {hook} from "./hook.ts";
import adapterManager from './adapterManager.js';
import {activityParams} from './activities/activityParams.js';
import type {AnyFunction} from "./types/functions.d.ts";
import type {BidderCode} from "./types/common.d.ts";

export const STORAGE_TYPE_LOCALSTORAGE = 'html5';
export const STORAGE_TYPE_COOKIES = 'cookie';

export type StorageType = typeof STORAGE_TYPE_LOCALSTORAGE | typeof STORAGE_TYPE_COOKIES;

export let storageCallbacks = [];

/* eslint-disable no-restricted-properties */

interface AcceptsCallback<FN extends AnyFunction> {
  (...args: Parameters<FN>): ReturnType<FN>;
  (...args: [...Parameters<FN>, (result: ReturnType<FN>) => void]): void;
}

type BrowserStorage = 'localStorage' | 'sessionStorage';

export type StorageManager = {
  [M in BrowserStorage as `has${Capitalize<M>}`]: AcceptsCallback<() => boolean>;
} & {
  [M in BrowserStorage as `${M}IsEnabled`]: AcceptsCallback<() => boolean>;
} & {

  [M in BrowserStorage as `setDataIn${Capitalize<M>}`]: AcceptsCallback<typeof localStorage.setItem>;
} & {

  [M in BrowserStorage as `getDataFrom${Capitalize<M>}`]: AcceptsCallback<typeof localStorage.getItem>;
} & {

  [M in BrowserStorage as `removeDataFrom${Capitalize<M>}`]: AcceptsCallback<typeof localStorage.removeItem>
} & {
  setCookie: AcceptsCallback<(name: string, value: string, expires?: string, sameSite?: string, domain?: string) => void>;
  getCookie: AcceptsCallback<(name: string) => string>;
  cookiesAreEnabled: AcceptsCallback<() => boolean>;
  findSimilarCookies: AcceptsCallback<(contains: string) => string[]>
}

/*
 *  Storage manager constructor. Consumers should prefer one of `getStorageManager` or `getCoreStorageManager`.
 */
export function newStorageManager({moduleName, moduleType, advertiseKeys = true}: {
  moduleName: string;
  moduleType: ModuleType;
  /**
   * If false, do not pass the 'storageKey' to activity checks - turning off storageControl for this manager.
   */
  advertiseKeys?: boolean;
} = {} as any, {isAllowed = isActivityAllowed} = {}) {
  function isValid(cb, storageType, storageKey, isWrite) {
    let mod = moduleName;
    const curBidder = config.getCurrentBidder();
    if (curBidder && moduleType === MODULE_TYPE_BIDDER && adapterManager.aliasRegistry[curBidder] === moduleName) {
      mod = curBidder;
    }
    const params = {
      [ACTIVITY_PARAM_STORAGE_TYPE]: storageType,
      [ACTIVITY_PARAM_STORAGE_WRITE]: isWrite,
    };
    if (advertiseKeys && storageKey != null) {
      params[ACTIVITY_PARAM_STORAGE_KEY] = storageKey;
    }
    const result = {
      valid: isAllowed(ACTIVITY_ACCESS_DEVICE, activityParams(moduleType, mod, params))
    };

    return cb(result);
  }

  function schedule(operation, storageType, storageKey, isWrite, done) {
    if (done && typeof done === 'function') {
      storageCallbacks.push(function() {
        let result = isValid(operation, storageType, storageKey, isWrite);
        done(result);
      });
    } else {
      return isValid(operation, storageType, storageKey, isWrite);
    }
  }

  /**
   * @param {string} key
   * @param {string} value
   * @param {string} [expires='']
   * @param {string} [sameSite='/']
   * @param {string} [domain] domain (e.g., 'example.com' or 'subdomain.example.com').
   * If not specified, defaults to the host portion of the current document location.
   * If a domain is specified, subdomains are always included.
   * Domain must match the domain of the JavaScript origin. Setting cookies to foreign domains will be silently ignored.
   * @param {function} [done]
   */
  const setCookie = function (key, value, expires, sameSite, domain, done) {
    let cb = function (result) {
      if (result && result.valid) {
        const domainPortion = (domain && domain !== '') ? ` ;domain=${encodeURIComponent(domain)}` : '';
        const expiresPortion = (expires && expires !== '') ? ` ;expires=${expires}` : '';
        const isNone = (sameSite?.toLowerCase() === 'none')
        const secure = (isNone) ? '; Secure' : '';
        document.cookie = `${key}=${encodeURIComponent(value)}${expiresPortion}; path=/${domainPortion}${sameSite ? `; SameSite=${sameSite}` : ''}${secure}`;
      }
    }
    return schedule(cb, STORAGE_TYPE_COOKIES, key, true, done);
  };

  /**
   * @param {string} name
   * @param {function} [done]
   * @returns {(string|null)}
   */
  const getCookie = function(name, done) {
    let cb = function (result) {
      if (result && result.valid) {
        let m = window.document.cookie.match('(^|;)\\s*' + name + '\\s*=\\s*([^;]*)\\s*(;|$)');
        return m ? decodeURIComponent(m[2]) : null;
      }
      return null;
    }
    return schedule(cb, STORAGE_TYPE_COOKIES, name, false, done);
  };

  /**
   * @param {function} [done]
   * @returns {boolean}
   */
  const cookiesAreEnabled = function (done) {
    let cb = function (result) {
      if (result && result.valid) {
        return checkCookieSupport();
      }
      return false;
    }
    return schedule(cb, STORAGE_TYPE_COOKIES, null, false, done);
  }

  function storageMethods(name) {
    const capName = name.charAt(0).toUpperCase() + name.substring(1);
    const backend = () => window[name] as any;

    const hasStorage: AcceptsCallback<() => boolean> = function (done) {
      let cb = function (result) {
        if (result && result.valid) {
          try {
            return !!backend();
          } catch (e) {
            logError(`${name} api disabled`);
          }
        }
        return false;
      }
      return schedule(cb, STORAGE_TYPE_LOCALSTORAGE, null, false, done);
    } as any;

    return {
      [`has${capName}`]: hasStorage,
      [`${name}IsEnabled`](done) {
        let cb = function (result) {
          if (result && result.valid) {
            try {
              backend().setItem('prebid.cookieTest', '1');
              return backend().getItem('prebid.cookieTest') === '1';
            } catch (error) {
            } finally {
              try {
                backend().removeItem('prebid.cookieTest');
              } catch (error) {}
            }
          }
          return false;
        }
        return schedule(cb, STORAGE_TYPE_LOCALSTORAGE, null, false, done);
      },
      [`setDataIn${capName}`](key, value, done) {
        let cb = function (result) {
          if (result && result.valid && hasStorage()) {
            backend().setItem(key, value);
          }
        }
        return schedule(cb, STORAGE_TYPE_LOCALSTORAGE, key, true, done);
      },
      [`getDataFrom${capName}`](key, done) {
        let cb = function (result) {
          if (result && result.valid && hasStorage()) {
            return backend().getItem(key);
          }
          return null;
        }
        return schedule(cb, STORAGE_TYPE_LOCALSTORAGE, key, false, done);
      },
      [`removeDataFrom${capName}`](key, done) {
        let cb = function (result) {
          if (result && result.valid && hasStorage()) {
            backend().removeItem(key);
          }
        }
        return schedule(cb, STORAGE_TYPE_LOCALSTORAGE, key, true, done);
      }
    }
  }

  /**
   * Returns all cookie values from the jar whose names contain the `keyLike`
   * Needs to exist in `utils.js` as it follows the StorageHandler interface defined in live-connect-js. If that module were to be removed, this function can go as well.
   * @param {string} keyLike
   * @param {function} [done]
   * @returns {string[]}
   */
  const findSimilarCookies = function(keyLike, done) {
    let cb = function (result) {
      if (result && result.valid) {
        const all = [];
        if (hasDeviceAccess()) {
          const cookies = document.cookie.split(';');
          while (cookies.length) {
            const cookie = cookies.pop();
            let separatorIndex = cookie.indexOf('=');
            separatorIndex = separatorIndex < 0 ? cookie.length : separatorIndex;
            const cookieName = decodeURIComponent(cookie.slice(0, separatorIndex).replace(/^\s+/, ''));
            if (cookieName.indexOf(keyLike) >= 0) {
              all.push(decodeURIComponent(cookie.slice(separatorIndex + 1)));
            }
          }
        }
        return all;
      }
    }

    return schedule(cb, STORAGE_TYPE_COOKIES, keyLike, false, done);
  }

  return {
    setCookie,
    getCookie,
    cookiesAreEnabled,
    ...storageMethods('localStorage'),
    ...storageMethods('sessionStorage'),
    findSimilarCookies
  } as StorageManager;
}

/**
 * Get a storage manager for a particular module.
 *
 * Either bidderCode or a combination of moduleType + moduleName must be provided. The former is a shorthand
 *  for `{moduleType: 'bidder', moduleName: bidderCode}`.
 *
 */
export function getStorageManager({moduleType, moduleName, bidderCode}: {
  moduleType?: ModuleType;
  moduleName?: string;
  bidderCode?: BidderCode;
} = {}) {
  function err() {
    throw new Error(`Invalid invocation for getStorageManager: must set either bidderCode, or moduleType + moduleName`)
  }
  if (bidderCode) {
    if ((moduleType && moduleType !== MODULE_TYPE_BIDDER) || moduleName) err()
    moduleType = MODULE_TYPE_BIDDER;
    moduleName = bidderCode;
  } else if (!moduleName || !moduleType) {
    err()
  }
  return newStorageManager({moduleType, moduleName});
}

/**
 * Get a storage manager for "core" (vendorless, or first-party) modules. Shorthand for `getStorageManager({moduleName, moduleType: 'core'})`.
 *
 * @param {string} moduleName Module name
 */
export function getCoreStorageManager(moduleName) {
  return newStorageManager({moduleName: moduleName, moduleType: MODULE_TYPE_PREBID});
}

/**
 * Block all access to storage when deviceAccess = false
 */
export function deviceAccessRule() {
  if (!hasDeviceAccess()) {
    return {allow: false}
  }
}
registerActivityControl(ACTIVITY_ACCESS_DEVICE, 'deviceAccess config', deviceAccessRule);

/**
 * Block all access to request credentials when deviceAccess = false
 */
registerActivityControl(ACTIVITY_ACCESS_REQUEST_CREDENTIALS, 'deviceAccess config', deviceAccessRule);

/**
 * By default, deny bidders accessDevice unless they enable it through bidderSettings
 *
 * // TODO: for backwards compat, the check is done on the adapter - rather than bidder's code.
 */
export function storageAllowedRule(params, bs = bidderSettings) {
  if (params[ACTIVITY_PARAM_COMPONENT_TYPE] !== MODULE_TYPE_BIDDER) return;
  let allow = bs.get(params[ACTIVITY_PARAM_ADAPTER_CODE], 'storageAllowed');
  if (!allow || allow === true) {
    allow = !!allow
  } else {
    const storageType = params[ACTIVITY_PARAM_STORAGE_TYPE];
    allow = Array.isArray(allow) ? allow.some((e) => e === storageType) : allow === storageType;
  }
  if (!allow) {
    return {allow};
  }
}

registerActivityControl(ACTIVITY_ACCESS_DEVICE, 'bidderSettings.*.storageAllowed', storageAllowedRule);

export function resetData() {
  storageCallbacks = [];
}

type CookieStorageDisclosure = {
  type: 'cookie',
  /**
   * The number, in seconds, of the duration for storage on a device, as set when using cookie storage.
   */
  maxAgeSeconds: number;
  /**
   * Indicates the vendor is refreshing a cookie.
   */
  cookieRefresh: boolean;
}
type HTML5StorageDisclosure = {
  type: 'web'
  maxAgeSeconds?: null;
  cookieRefresh?: null;
}

/**
 * First party storage use disclosure. Follows the same format as
 * https://github.com/InteractiveAdvertisingBureau/GDPR-Transparency-and-Consent-Framework/blob/master/TCFv2/Vendor%20Device%20Storage%20%26%20Operational%20Disclosures.md
 * except that `domain` is omitted.
 */
export type StorageDisclosure = (CookieStorageDisclosure | HTML5StorageDisclosure) & {
  /**
   * Key or object name, depending on type, for the storage item.
   * Wildcards '*' are permitted. For example, "id*" or "*id" describes multiple prefixed or suffixed identifiers,
   * all having the same purpose(s).
   */
  identifier: string;
  /**
   * The purpose ID or purpose IDs from the Global Vendor List (GVL) for which the storage is used.
   */
  purposes: number[];
}

/**
 * Disclose first party storage use.
 */
export const discloseStorageUse = hook('sync', (moduleName: string, disclosure: StorageDisclosure) => {});
