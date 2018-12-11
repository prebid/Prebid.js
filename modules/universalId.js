/**
 * This modules adds Universal ID support to prebid.js
 */
// import {config} from 'config'

// import * as utils from 'src/utils'
// import { config } from 'src/config';

const STORAGE_TYPE_COOKIE = 'cookie';
const STORAGE_TYPE_LOCALSTORAGE = 'localStorage';

/**
 * ID data for appending to bid requests from the requestBidHook
 * @type {Array.<Object>}
 */
// const extendedBidRequestData = []

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
 * @type {IdSubmodule[]}
 */
const submodules = [
  {
    configKey: 'pubcid',
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
    configKey: 'openid',
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
 * @param navigator - navigator passed for easier testing through dependency injection
 * @param document - document passed for easier testing through dependency injection
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
function browserSupportsLocaStorage (localStorage) {
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
 * Helper to check if local storage or cookies are enabled
 * Question: Should we add the local storage methods to utils?
 * @param navigator - navigator passed for easier testing through dependency injection
 * @param document - document passed for easier testing through dependency injection
 * @returns {boolean|*}
 */
export function enabledStorageTypes (navigator, document) {
  const enabledStorageTypes = []
  if (browserSupportsLocaStorage(document.localStorage)) {
    enabledStorageTypes.push(STORAGE_TYPE_LOCALSTORAGE);
  }
  if (browserSupportsCookie(navigator, document)) {
    enabledStorageTypes.push(STORAGE_TYPE_COOKIE)
  }
  return enabledStorageTypes;
}

/**
 * check if any universal id types are set in configuration (must opt-in to enable)
 * @param {PrebidConfig} config
 * @param {Array.<IdSubmodule>} submodules
 */
export function validateConfig (config, submodules) {
  const submoduleConfigs = config.getConfig('usersync.universalIds');

  if (!Array.isArray(submoduleConfigs)) {
    // exit if no configurations are set
    return false;
  }
  return submodules.some(submodule => {
    const submoduleConfig = submoduleConfigs[submodule.configKey];
    if (!submoduleConfig) {
      return false;
    }
    // validate require submodule config props here
    return true;
  });
}

/**
 * init universal id module if config values are set correctly
 */
export function initUniversalId (config, navigator, document) {
  // check if cookie/local storage is active
  if (!enabledStorageTypes(navigator, document)) {
    // exit if no cookies or local storage
    return;
  }

  // check if any universal id types are set in configuration (must opt-in to enable)
  if (!validateConfig(config, submodules)) {
    // exit if no configurations are set
    // return;
  }
}

// call init
// initUniversalId(window.navigator, window.document);
