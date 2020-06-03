import { hook } from './hook.js';
import * as utils from './utils.js';
import includes from 'core-js-pure/features/array/includes.js';

const moduleTypeWhiteList = ['core', 'prebid-module'];

export let storageCallbacks = [];

/**
 * Storage options
 * @typedef {Object} storageOptions
 * @property {Number=} gvlid - Vendor id
 * @property {string} moduleName - Module name
 * @property {string=} moduleType - Module type, value can be anyone of core or prebid-module
 */

/**
 * Returns list of storage related functions with gvlid, module name and module type in its scope.
 * All three argument are optional here. Below shows the usage of of these
 * - GVL Id: Pass GVL id if you are a vendor
 * - Module name: All modules need to pass module name
 * - Module type: Some modules may need these functions but are not vendor. e.g prebid core files in src and modules like currency.
 * @param {storageOptions} options
 */
export function newStorageManager({gvlid, moduleName, moduleType} = {}) {
  function isValid(cb) {
    if (includes(moduleTypeWhiteList, moduleType)) {
      let result = {
        valid: true
      }
      return cb(result);
    } else {
      let value;
      let hookDetails = {
        hasEnforcementHook: false
      }
      validateStorageEnforcement(gvlid, moduleName, hookDetails, function(result) {
        if (result && result.hasEnforcementHook) {
          value = cb(result);
        } else {
          let result = {
            hasEnforcementHook: false,
            valid: utils.hasDeviceAccess()
          }
          value = cb(result);
        }
      });
      return value;
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
    if (done && typeof done === 'function') {
      storageCallbacks.push(function() {
        let result = isValid(cb);
        done(result);
      });
    } else {
      return isValid(cb);
    }
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
    if (done && typeof done === 'function') {
      storageCallbacks.push(function() {
        let result = isValid(cb);
        done(result);
      });
    } else {
      return isValid(cb);
    }
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
        } catch (error) {}
      }
      return false;
    }
    if (done && typeof done === 'function') {
      storageCallbacks.push(function() {
        let result = isValid(cb);
        done(result);
      });
    } else {
      return isValid(cb);
    }
  }

  /**
   * @returns {boolean}
   */
  const cookiesAreEnabled = function (done) {
    let cb = function (result) {
      if (result && result.valid) {
        if (utils.checkCookieSupport()) {
          return true;
        }
        window.document.cookie = 'prebid.cookieTest';
        return window.document.cookie.indexOf('prebid.cookieTest') !== -1;
      }
      return false;
    }
    if (done && typeof done === 'function') {
      storageCallbacks.push(function() {
        let result = isValid(cb);
        done(result);
      });
    } else {
      return isValid(cb);
    }
  }

  /**
   * @param {string} key
   * @param {string} value
   */
  const setDataInLocalStorage = function (key, value, done) {
    let cb = function (result) {
      if (result && result.valid) {
        window.localStorage.setItem(key, value);
      }
    }
    if (done && typeof done === 'function') {
      storageCallbacks.push(function() {
        let result = isValid(cb);
        done(result);
      });
    } else {
      return isValid(cb);
    }
  }

  /**
   * @param {string} key
   * @returns {(string|null)}
   */
  const getDataFromLocalStorage = function (key, done) {
    let cb = function (result) {
      if (result && result.valid) {
        return window.localStorage.getItem(key);
      }
      return null;
    }
    if (done && typeof done === 'function') {
      storageCallbacks.push(function() {
        let result = isValid(cb);
        done(result);
      });
    } else {
      return isValid(cb);
    }
  }

  /**
   * @param {string} key
   */
  const removeDataFromLocalStorage = function (key, done) {
    let cb = function (result) {
      if (result && result.valid) {
        window.localStorage.removeItem(key);
      }
    }
    if (done && typeof done === 'function') {
      storageCallbacks.push(function() {
        let result = isValid(cb);
        done(result);
      });
    } else {
      return isValid(cb);
    }
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
          utils.logError('Local storage api disabled');
        }
      }
      return false;
    }
    if (done && typeof done === 'function') {
      storageCallbacks.push(function() {
        let result = isValid(cb);
        done(result);
      });
    } else {
      return isValid(cb);
    }
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
        if (utils.hasDeviceAccess()) {
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

    if (done && typeof done === 'function') {
      storageCallbacks.push(function() {
        let result = isValid(cb);
        done(result);
      });
    } else {
      return isValid(cb);
    }
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
export const validateStorageEnforcement = hook('async', function(gvlid, moduleName, hookDetails, callback) {
  callback(hookDetails);
}, 'validateStorageEnforcement');

/**
 * This function returns storage functions to access cookies and localstorage. This function will bypass the gdpr enforcement requirement. Prebid as a software needs to use storage in some scenarios and is not a vendor so GDPR enforcement rules does not apply on Prebid.
 * @param {string} moduleName Module name
 */
export function getCoreStorageManager(moduleName) {
  return newStorageManager({moduleName: moduleName, moduleType: 'core'});
}

/**
 * Note: Core modules or Prebid modules like Currency, SizeMapping should use getCoreStorageManager
 * This function returns storage functions to access cookies and localstorage. Bidders and User id modules should import this and use it in their module if needed. GVL ID and Module name are optional param but gvl id is needed for when gdpr enforcement module is used.
 * @param {Number=} gvlid Vendor id
 * @param {string=} moduleName BidderCode or module name
 */
export function getStorageManager(gvlid, moduleName) {
  return newStorageManager({gvlid: gvlid, moduleName: moduleName});
}

export function resetData() {
  storageCallbacks = [];
}
