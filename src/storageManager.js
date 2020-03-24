import { hook } from './hook.js';
import { hasDeviceAccess, logError, checkCookieSupport } from './utils.js';
import includes from 'core-js/library/fn/array/includes.js';

const moduleTypeWhiteList = ['core', 'prebid-module'];

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
  function isValid() {
    if (includes(moduleTypeWhiteList, moduleType)) {
      return {valid: hasDeviceAccess()}
    }
    let result = validateStorageEnforcement(gvlid, moduleName);
    return result;
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
  const setCookie = function (key, value, expires, sameSite, domain) {
    let result = isValid();
    if (result.valid) {
      document.cookie = `${key}=${encodeURIComponent(value)}${(expires !== '') ? `; expires=${expires}` : ''}; path=/${sameSite ? `; SameSite=${sameSite}` : ''}${domain ? `; domain=${domain}` : ''}`;
    }
  };

  /**
   * @param {string} name
   * @returns {(string|null)}
   */
  const getCookie = function(name) {
    let result = isValid();
    if (result.valid) {
      let m = window.document.cookie.match('(^|;)\\s*' + name + '\\s*=\\s*([^;]*)\\s*(;|$)');
      return m ? decodeURIComponent(m[2]) : null;
    }
    return null;
  };

  /**
   * @returns {boolean}
   */
  const localStorageIsEnabled = function () {
    let result = isValid();
    if (result.valid) {
      try {
        localStorage.setItem('prebid.cookieTest', '1');
        return localStorage.getItem('prebid.cookieTest') === '1';
      } catch (error) {}
    }
    return false;
  }

  /**
   * @returns {boolean}
   */
  const cookiesAreEnabled = function () {
    let result = isValid();
    if (result.valid) {
      if (checkCookieSupport()) {
        return true;
      }
      window.document.cookie = 'prebid.cookieTest';
      return window.document.cookie.indexOf('prebid.cookieTest') !== -1;
    }
    return false;
  }

  /**
   * @param {string} key
   * @param {string} value
   */
  const setDataInLocalStorage = function (key, value) {
    let result = isValid();
    if (result.valid) {
      window.localStorage.setItem(key, value);
    }
  }

  /**
   * @param {string} key
   * @returns {(string|null)}
   */
  const getDataFromLocalStorage = function (key) {
    let result = isValid();
    if (result.valid) {
      return window.localStorage.getItem(key);
    }
    return null;
  }

  /**
   * @param {string} key
   */
  const removeDataFromLocalStorage = function (key) {
    let result = isValid();
    if (result.valid) {
      window.localStorage.removeItem(key);
    }
  }

  /**
   * @returns {boolean}
   */
  const hasLocalStorage = function () {
    let result = isValid();
    if (result.valid) {
      try {
        return !!window.localStorage;
      } catch (e) {
        logError('Local storage api disabled');
      }
    }
    return false;
  }

  return {
    setCookie,
    getCookie,
    localStorageIsEnabled,
    cookiesAreEnabled,
    setDataInLocalStorage,
    getDataFromLocalStorage,
    removeDataFromLocalStorage,
    hasLocalStorage
  }
}

/**
 * This hook validates the storage enforcement if gdprEnforcement module is included
 */
export const validateStorageEnforcement = hook('sync', function(result) {
  if (result.hasEnforcementHook) {
    return result
  } else {
    return {
      hasEnforcementHook: false,
      valid: hasDeviceAccess()
    }
  }
}, 'validateStorageEnforcement');
