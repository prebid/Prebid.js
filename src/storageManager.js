import {hook} from './hook.js';
import {checkCookieSupport, hasDeviceAccess, logError, logInfo} from './utils.js';
import {bidderSettings as defaultBidderSettings} from './bidderSettings.js';
import {MODULE_TYPE_BIDDER, MODULE_TYPE_CORE} from './activities/modules.js';

export const STORAGE_TYPE_LOCALSTORAGE = 'html5';
export const STORAGE_TYPE_COOKIES = 'cookie';

export let storageCallbacks = [];

/*
 *  Storage manager constructor. Consumers should prefer one of `getStorageManager` or `getCoreStorageManager`.
 */
export function newStorageManager({moduleName, moduleType} = {}, {bidderSettings = defaultBidderSettings} = {}) {
  function isBidderAllowed(storageType) {
    if (moduleType !== MODULE_TYPE_BIDDER) {
      return true;
    }
    const storageAllowed = bidderSettings.get(moduleName, 'storageAllowed');
    if (!storageAllowed || storageAllowed === true) return !!storageAllowed;
    if (Array.isArray(storageAllowed)) return storageAllowed.some((e) => e === storageType);
    return storageAllowed === storageType;
  }

  function isValid(cb, storageType) {
    if (!isBidderAllowed(storageType)) {
      logInfo(`bidderSettings denied access to device storage for bidder '${moduleName}'`);
      const result = {valid: false};
      return cb(result);
    } else {
      let value;
      let hookDetails = {
        hasEnforcementHook: false
      }
      validateStorageEnforcement(moduleType, moduleName, hookDetails, function(result) {
        if (result && result.hasEnforcementHook) {
          value = cb(result);
        } else {
          let result = {
            hasEnforcementHook: false,
            valid: hasDeviceAccess()
          }
          value = cb(result);
        }
      });
      return value;
    }
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
   */
  const setCookie = function (key, value, expires, sameSite, domain, done) {
    let cb = function (result) {
      if (result && result.valid) {
        const domainPortion = (domain && domain !== '') ? ` ;domain=${encodeURIComponent(domain)}` : '';
        const expiresPortion = (expires && expires !== '') ? ` ;expires=${expires}` : '';
        const isNone = (sameSite != null && sameSite.toLowerCase() == 'none')
        const secure = (isNone) ? '; Secure' : '';
        document.cookie = `${key}=${encodeURIComponent(value)}${expiresPortion}; path=/${domainPortion}${sameSite ? `; SameSite=${sameSite}` : ''}${secure}`;
      }
    }
    return schedule(cb, STORAGE_TYPE_COOKIES, done);
  };

  /**
   * @param {string} name
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
   * @returns {boolean}
   */
  const localStorageIsEnabled = function (done) {
    let cb = function (result) {
      if (result && result.valid) {
        try {
          localStorage.setItem('prebid.cookieTest', '1');
          return localStorage.getItem('prebid.cookieTest') === '1';
        } catch (error) {
        } finally {
          try {
            localStorage.removeItem('prebid.cookieTest');
          } catch (error) {}
        }
      }
      return false;
    }
    return schedule(cb, STORAGE_TYPE_LOCALSTORAGE, done);
  }

  /**
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

  /**
   * @param {string} key
   * @param {string} value
   */
  const setDataInLocalStorage = function (key, value, done) {
    let cb = function (result) {
      if (result && result.valid && hasLocalStorage()) {
        window.localStorage.setItem(key, value);
      }
    }
    return schedule(cb, STORAGE_TYPE_LOCALSTORAGE, done);
  }

  /**
   * @param {string} key
   * @returns {(string|null)}
   */
  const getDataFromLocalStorage = function (key, done) {
    let cb = function (result) {
      if (result && result.valid && hasLocalStorage()) {
        return window.localStorage.getItem(key);
      }
      return null;
    }
    return schedule(cb, STORAGE_TYPE_LOCALSTORAGE, done);
  }

  /**
   * @param {string} key
   */
  const removeDataFromLocalStorage = function (key, done) {
    let cb = function (result) {
      if (result && result.valid && hasLocalStorage()) {
        window.localStorage.removeItem(key);
      }
    }
    return schedule(cb, STORAGE_TYPE_LOCALSTORAGE, done);
  }

  /**
   * @returns {boolean}
   */
  const hasLocalStorage = function (done) {
    let cb = function (result) {
      if (result && result.valid) {
        try {
          return !!window.localStorage;
        } catch (e) {
          logError('Local storage api disabled');
        }
      }
      return false;
    }
    return schedule(cb, STORAGE_TYPE_LOCALSTORAGE, done);
  }

  /**
   * Returns all cookie values from the jar whose names contain the `keyLike`
   * Needs to exist in `utils.js` as it follows the StorageHandler interface defined in live-connect-js. If that module were to be removed, this function can go as well.
   * @param {string} keyLike
   * @return {[]}
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

    return schedule(cb, STORAGE_TYPE_COOKIES, done);
  }

  return {
    setCookie,
    getCookie,
    localStorageIsEnabled,
    cookiesAreEnabled,
    setDataInLocalStorage,
    getDataFromLocalStorage,
    removeDataFromLocalStorage,
    hasLocalStorage,
    findSimilarCookies
  }
}

/**
 * This hook validates the storage enforcement if gdprEnforcement module is included
 */
export const validateStorageEnforcement = hook('async', function(moduleType, moduleName, hookDetails, callback) {
  callback(hookDetails);
}, 'validateStorageEnforcement');

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
  return newStorageManager({moduleName: moduleName, moduleType: MODULE_TYPE_CORE});
}

export function resetData() {
  storageCallbacks = [];
}
