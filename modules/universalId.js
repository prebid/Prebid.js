/**
 * This modules adds Universal ID support to prebid.js
 */
// import * as utils from 'src/utils'
import {config} from 'src/config';

/**
 * @callback getIdCallback
 * @param {Object} response - assumed to be a json object
 */

/**
 * @callback getId
 * @summary submodule interface for getId function
 * @param {Object} data
 * @param {getIdCallback} callback - optional callback to execute on id retrieval
 */

/**
 * @callback decode
 * @summary submodule interface for decode function
 * @param {Object|string|number} idData
 * @returns {Object}
 */

/**
 * @typedef {Object} IdSubmodule
 * @property {string} configKey
 * @property {number} expires
 * @property {decode} decode
 * @property {getId} getId
 */

/**
 * @typedef {Object} SubmoduleConfig
 * @property {Object} storage
 * @property {Object} value
 * @property {Object} params
 */

const STORAGE_TYPE_COOKIE = 'cookie';
const STORAGE_TYPE_LOCALSTORAGE = 'html5';

/**
 * ID data for appending to bid requests from the requestBidHook
 * @type {Array.<Object>}
 */
const extendedBidRequestData = []

/**
 * @type {IdSubmodule[]}
 */
const submodules = [
  {
    configKey: 'pubCommonId',
    expires: 2628000,
    decode: function(idData) {
      return {
        'ext.pubcommonid': idData
      }
    },
    getId: function(data, callback) {
      if (data.params.url) {
        ajax(data.params.url, function(response) {
          callback(response)
        })
      } else {
        // log error, missing required param
      }
    }
  }, {
    configKey: 'openId',
    expires: 20000,
    decode: function(idData) {
      return {
        'ext.openid': idData
      }
    },
    getId: function(url, syncDelay, callback) {
    }
  }

]

/**
 * @param {Navigator} navigator - navigator passed for easier testing through dependency injection
 * @param {Document} document - document passed for easier testing through dependency injection
 * @returns {boolean}
 */
function browserSupportsCookie (navigator, document) {
  try {
    if (navigator.cookieEnabled === false) {
      return false;
    }
    document.cookie = 'prebid.cookieTest';
    return document.cookie.indexOf('prebid.cookieTest') !== -1;
  } catch (e) {
    return false;
  }
}

/**
 * @param localStorage - localStorage passed for easier testing through dependency injection
 * @returns {boolean}
 */
function browserSupportsLocalStorage (localStorage) {
  try {
    if (typeof localStorage !== 'object' || typeof localStorage.setItem !== 'function') {
      return false;
    }
    localStorage.setItem('prebid.cookieTest', '1');
    return localStorage.getItem('prebid.cookieTest') === '1';
  } catch (e) {
    return false;
  }
}

/**
 * helper to check if local storage or cookies are enabled
 * @param {Navigator} navigator - navigator passed for easier testing through dependency injection
 * @param {Document} document - document passed for easier testing through dependency injection
 * @returns {boolean|*}
 */
export function enabledStorageTypes (navigator, document) {
  const enabledStorageTypes = []
  if (browserSupportsLocalStorage(document.localStorage)) {
    enabledStorageTypes.push(STORAGE_TYPE_LOCALSTORAGE);
  }
  if (browserSupportsCookie(navigator, document)) {
    enabledStorageTypes.push(STORAGE_TYPE_COOKIE)
  }
  return enabledStorageTypes;
}

/**
 * check if any universal id types are set in configuration (must opt-in to enable)
 *
 * @param {PrebidConfig} config
 * @param {Array.<IdSubmodule>} submodules
 */
export function validateConfig (config, submodules) {
  const submoduleConfigs = config.getConfig('usersync.universalIds');
  // exit if no configurations are set
  if (!Array.isArray(submoduleConfigs)) {
    return false;
  }
  // check that at least one config exists
  return submodules.some(submodule => {
    const submoduleConfig = config.getConfig('usersync.universalIds').find(universalIdConfig => universalIdConfig.name === submodule.configKey)
    // return true if a valid config exists for submodule
    if (submoduleConfig && typeof submoduleConfig === 'object') {
      return true;
    }
    // false if no config exists for submodule
    return false;
  });
}

/**
 * Decorate ad units with universal id properties. This hook function is called before the
 * real pbjs.requestBids is invoked, and can modify its parameter
 * @param {PrebidConfig} config
 * @param next
 * @returns {*}
 */
function requestBidHook (config, next) {
  // Note: calling next() allows Prebid to continue processing an auction, if not called, the auction will be stalled.
  // pass id data to adapters if bidRequestData list is not empty
  return next.apply(this, arguments)
}

/**
 * init submodules if config values are set correctly
 * @param {PrebidConfig} config
 * @param {Array.<IdSubmodule>} submodules
 * @param {Navigator} navigator
 * @param {Document} document
 * @returns {Array} - returns list of enabled submodules
 */
export function initSubmodules (config, submodules, navigator, document) {
  // valid if at least one configuration is valid
  if (!validateConfig(config, submodules)) {
    return []
  }

  // storage enabled storage types, use to check if submodule has a valid configuration
  const storageTypes = enabledStorageTypes(navigator, document);

  // process and return list of enabled submodules
  const enabledSubmodules = submodules.reduce((carry, submodule) => {
    const submoduleConfig = config.getConfig('usersync.universalIds').find(universalIdConfig => universalIdConfig.name === submodule.configKey);
    // skip, config with name matching submodule.configKey does not exist
    if (!submoduleConfig) {
      return carry;
    }

    if (submoduleConfig.value && typeof submoduleConfig.value === 'object') {
      //  1.
      //  submodule either passes a value set in config
      carry.push('found value config, add directly to bidAdapters');
      // add obj to list to pass to adapters
      extendedBidRequestData.push(submoduleConfig.value);
    } else if (submoduleConfig.storage && typeof submoduleConfig.storage === 'object' &&
      typeof submoduleConfig.storage.type === 'string' && storageTypes.indexOf(submoduleConfig.storage.type) !== -1) {
      //  2.
      //  submodule uses local storage to get value (or if local storage is empty calls submodule getId)
      carry.push('found storage config, try to load from local storage');

      // TODO: try to load storage value
      // 1. if it exists, call submodule decode and pass value to adapters
      // 2. else, call submodule getId

      // TODO: review impact on event loop from try/catch around cookie/localStorage access
      // 1. if no large impact, ignore using setTimer
      // 2. else surround with setTimeout
    }
    return carry;
  }, []);

  if (enabledSubmodules.length) {
    $$PREBID_GLOBAL$$.requestBids.addHook(requestBidHook)
  }
  return enabledSubmodules;
}

initSubmodules(config, submodules, window.navigator, window.document);
