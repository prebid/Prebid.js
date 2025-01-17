import {checkCookieSupport, hasDeviceAccess, logError} from './utils.js';
import {bidderSettings} from './bidderSettings.js';
import {MODULE_TYPE_BIDDER, MODULE_TYPE_PREBID} from './activities/modules.js';
import {isActivityAllowed, registerActivityControl} from './activities/rules.js';
import {
  ACTIVITY_PARAM_ADAPTER_CODE,
  ACTIVITY_PARAM_COMPONENT_TYPE,
  ACTIVITY_PARAM_STORAGE_TYPE
} from './activities/params.js';

import {ACTIVITY_ACCESS_DEVICE} from './activities/activities.js';
import {config} from './config.js';
import adapterManager from './adapterManager.js';
import {activityParams} from './activities/activityParams.js';

export const STORAGE_TYPE_LOCALSTORAGE = 'html5';
export const STORAGE_TYPE_COOKIES = 'cookie';

export let storageCallbacks = [];

/* eslint-disable prebid/no-global */

/*
 *  Storage manager constructor. Consumers should prefer one of `getStorageManager` or `getCoreStorageManager`.
 */
export function newStorageManager({moduleName, moduleType} = {}, {isAllowed = isActivityAllowed} = {}) {
  function isValid(cb, storageType) {
    let mod = moduleName;
    const curBidder = config.getCurrentBidder();
    if (curBidder && moduleType === MODULE_TYPE_BIDDER && adapterManager.aliasRegistry[curBidder] === moduleName) {
      mod = curBidder;
    }
    const result = {
      valid: isAllowed(ACTIVITY_ACCESS_DEVICE, activityParams(moduleType, mod, {
        [ACTIVITY_PARAM_STORAGE_TYPE]: storageType
      }))
    };
    return cb(result);
  }

  function schedule(operation, storageType, done) {
    if (done && typeof done === 'function') {
      storageCallbacks.push(function() {
        let result = isValid(operation, storageType);
        done(result);
      });
    } else {
      return isValid(operation, storageType);
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
        const isNone = (sameSite != null && sameSite.toLowerCase() == 'none')
        const secure = (isNone) ? '; Secure' : '';
        // eslint-disable-next-line prebid/no-member
        document.cookie = `${key}=${encodeURIComponent(value)}${expiresPortion}; path=/${domainPortion}${sameSite ? `; SameSite=${sameSite}` : ''}${secure}`;
      }
    }
    return schedule(cb, STORAGE_TYPE_COOKIES, done);
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
    return schedule(cb, STORAGE_TYPE_COOKIES, done);
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
    return schedule(cb, STORAGE_TYPE_COOKIES, done);
  }

  function storageMethods(name) {
    const capName = name.charAt(0).toUpperCase() + name.substring(1);
    const backend = () => window[name];

    const hasStorage = function (done) {
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
      return schedule(cb, STORAGE_TYPE_LOCALSTORAGE, done);
    }

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
        return schedule(cb, STORAGE_TYPE_LOCALSTORAGE, done);
      },
      [`setDataIn${capName}`](key, value, done) {
        let cb = function (result) {
          if (result && result.valid && hasStorage()) {
            backend().setItem(key, value);
          }
        }
        return schedule(cb, STORAGE_TYPE_LOCALSTORAGE, done);
      },
      [`getDataFrom${capName}`](key, done) {
        let cb = function (result) {
          if (result && result.valid && hasStorage()) {
            return backend().getItem(key);
          }
          return null;
        }
        return schedule(cb, STORAGE_TYPE_LOCALSTORAGE, done);
      },
      [`removeDataFrom${capName}`](key, done) {
        let cb = function (result) {
          if (result && result.valid && hasStorage()) {
            backend().removeItem(key);
          }
        }
        return schedule(cb, STORAGE_TYPE_LOCALSTORAGE, done);
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
          // eslint-disable-next-line prebid/no-member
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

    return schedule(cb, STORAGE_TYPE_COOKIES, done);
  }

  return {
    setCookie,
    getCookie,
    cookiesAreEnabled,
    ...storageMethods('localStorage'),
    ...storageMethods('sessionStorage'),
    findSimilarCookies
  }
}

/**
 * Get a storage manager for a particular module.
 *
 * Either bidderCode or a combination of moduleType + moduleName must be provided. The former is a shorthand
 *  for `{moduleType: 'bidder', moduleName: bidderCode}`.
 *
 */
export function getStorageManager({moduleType, moduleName, bidderCode} = {}) {
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
