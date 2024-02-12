"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.STORAGE_TYPE_LOCALSTORAGE = exports.STORAGE_TYPE_COOKIES = void 0;
exports.deviceAccessRule = deviceAccessRule;
exports.getCoreStorageManager = getCoreStorageManager;
exports.getStorageManager = getStorageManager;
exports.newStorageManager = newStorageManager;
exports.resetData = resetData;
exports.storageAllowedRule = storageAllowedRule;
exports.storageCallbacks = void 0;
var _utils = require("./utils.js");
var _bidderSettings = require("./bidderSettings.js");
var _modules = require("./activities/modules.js");
var _rules = require("./activities/rules.js");
var _params = require("./activities/params.js");
var _activities = require("./activities/activities.js");
var _config = require("./config.js");
var _adapterManager = _interopRequireDefault(require("./adapterManager.js"));
var _activityParams = require("./activities/activityParams.js");
const STORAGE_TYPE_LOCALSTORAGE = exports.STORAGE_TYPE_LOCALSTORAGE = 'html5';
const STORAGE_TYPE_COOKIES = exports.STORAGE_TYPE_COOKIES = 'cookie';
let storageCallbacks = exports.storageCallbacks = [];

/*
 *  Storage manager constructor. Consumers should prefer one of `getStorageManager` or `getCoreStorageManager`.
 */
function newStorageManager() {
  let {
    moduleName,
    moduleType
  } = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  let {
    isAllowed = _rules.isActivityAllowed
  } = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  function isValid(cb, storageType) {
    let mod = moduleName;
    const curBidder = _config.config.getCurrentBidder();
    if (curBidder && moduleType === _modules.MODULE_TYPE_BIDDER && _adapterManager.default.aliasRegistry[curBidder] === moduleName) {
      mod = curBidder;
    }
    const result = {
      valid: isAllowed(_activities.ACTIVITY_ACCESS_DEVICE, (0, _activityParams.activityParams)(moduleType, mod, {
        [_params.ACTIVITY_PARAM_STORAGE_TYPE]: storageType
      }))
    };
    return cb(result);
  }
  function schedule(operation, storageType, done) {
    if (done && typeof done === 'function') {
      storageCallbacks.push(function () {
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
        const domainPortion = domain && domain !== '' ? " ;domain=".concat(encodeURIComponent(domain)) : '';
        const expiresPortion = expires && expires !== '' ? " ;expires=".concat(expires) : '';
        const isNone = sameSite != null && sameSite.toLowerCase() == 'none';
        const secure = isNone ? '; Secure' : '';
        document.cookie = "".concat(key, "=").concat(encodeURIComponent(value)).concat(expiresPortion, "; path=/").concat(domainPortion).concat(sameSite ? "; SameSite=".concat(sameSite) : '').concat(secure);
      }
    };
    return schedule(cb, STORAGE_TYPE_COOKIES, done);
  };

  /**
   * @param {string} name
   * @returns {(string|null)}
   */
  const getCookie = function (name, done) {
    let cb = function (result) {
      if (result && result.valid) {
        let m = window.document.cookie.match('(^|;)\\s*' + name + '\\s*=\\s*([^;]*)\\s*(;|$)');
        return m ? decodeURIComponent(m[2]) : null;
      }
      return null;
    };
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
        } catch (error) {} finally {
          try {
            localStorage.removeItem('prebid.cookieTest');
          } catch (error) {}
        }
      }
      return false;
    };
    return schedule(cb, STORAGE_TYPE_LOCALSTORAGE, done);
  };

  /**
   * @returns {boolean}
   */
  const cookiesAreEnabled = function (done) {
    let cb = function (result) {
      if (result && result.valid) {
        return (0, _utils.checkCookieSupport)();
      }
      return false;
    };
    return schedule(cb, STORAGE_TYPE_COOKIES, done);
  };

  /**
   * @param {string} key
   * @param {string} value
   */
  const setDataInLocalStorage = function (key, value, done) {
    let cb = function (result) {
      if (result && result.valid && hasLocalStorage()) {
        window.localStorage.setItem(key, value);
      }
    };
    return schedule(cb, STORAGE_TYPE_LOCALSTORAGE, done);
  };

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
    };
    return schedule(cb, STORAGE_TYPE_LOCALSTORAGE, done);
  };

  /**
   * @param {string} key
   */
  const removeDataFromLocalStorage = function (key, done) {
    let cb = function (result) {
      if (result && result.valid && hasLocalStorage()) {
        window.localStorage.removeItem(key);
      }
    };
    return schedule(cb, STORAGE_TYPE_LOCALSTORAGE, done);
  };

  /**
   * @returns {boolean}
   */
  const hasLocalStorage = function (done) {
    let cb = function (result) {
      if (result && result.valid) {
        try {
          return !!window.localStorage;
        } catch (e) {
          (0, _utils.logError)('Local storage api disabled');
        }
      }
      return false;
    };
    return schedule(cb, STORAGE_TYPE_LOCALSTORAGE, done);
  };

  /**
   * Returns all cookie values from the jar whose names contain the `keyLike`
   * Needs to exist in `utils.js` as it follows the StorageHandler interface defined in live-connect-js. If that module were to be removed, this function can go as well.
   * @param {string} keyLike
   * @return {[]}
   */
  const findSimilarCookies = function (keyLike, done) {
    let cb = function (result) {
      if (result && result.valid) {
        const all = [];
        if ((0, _utils.hasDeviceAccess)()) {
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
    };
    return schedule(cb, STORAGE_TYPE_COOKIES, done);
  };
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
  };
}

/**
 * Get a storage manager for a particular module.
 *
 * Either bidderCode or a combination of moduleType + moduleName must be provided. The former is a shorthand
 *  for `{moduleType: 'bidder', moduleName: bidderCode}`.
 *
 */
function getStorageManager() {
  let {
    moduleType,
    moduleName,
    bidderCode
  } = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  function err() {
    throw new Error("Invalid invocation for getStorageManager: must set either bidderCode, or moduleType + moduleName");
  }
  if (bidderCode) {
    if (moduleType && moduleType !== _modules.MODULE_TYPE_BIDDER || moduleName) err();
    moduleType = _modules.MODULE_TYPE_BIDDER;
    moduleName = bidderCode;
  } else if (!moduleName || !moduleType) {
    err();
  }
  return newStorageManager({
    moduleType,
    moduleName
  });
}

/**
 * Get a storage manager for "core" (vendorless, or first-party) modules. Shorthand for `getStorageManager({moduleName, moduleType: 'core'})`.
 *
 * @param {string} moduleName Module name
 */
function getCoreStorageManager(moduleName) {
  return newStorageManager({
    moduleName: moduleName,
    moduleType: _modules.MODULE_TYPE_PREBID
  });
}

/**
 * Block all access to storage when deviceAccess = false
 */
function deviceAccessRule() {
  if (!(0, _utils.hasDeviceAccess)()) {
    return {
      allow: false
    };
  }
}
(0, _rules.registerActivityControl)(_activities.ACTIVITY_ACCESS_DEVICE, 'deviceAccess config', deviceAccessRule);

/**
 * By default, deny bidders accessDevice unless they enable it through bidderSettings
 *
 * // TODO: for backwards compat, the check is done on the adapter - rather than bidder's code.
 */
function storageAllowedRule(params) {
  let bs = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : _bidderSettings.bidderSettings;
  if (params[_params.ACTIVITY_PARAM_COMPONENT_TYPE] !== _modules.MODULE_TYPE_BIDDER) return;
  let allow = bs.get(params[_params.ACTIVITY_PARAM_ADAPTER_CODE], 'storageAllowed');
  if (!allow || allow === true) {
    allow = !!allow;
  } else {
    const storageType = params[_params.ACTIVITY_PARAM_STORAGE_TYPE];
    allow = Array.isArray(allow) ? allow.some(e => e === storageType) : allow === storageType;
  }
  if (!allow) {
    return {
      allow
    };
  }
}
(0, _rules.registerActivityControl)(_activities.ACTIVITY_ACCESS_DEVICE, 'bidderSettings.*.storageAllowed', storageAllowedRule);
function resetData() {
  exports.storageCallbacks = storageCallbacks = [];
}