/**
 * This module adds Universal ID support to prebid.js
 */
import {ajax} from 'src/ajax';
import {config} from 'src/config';
import * as utils from 'src/utils';
import find from 'core-js/library/fn/array/find';

/**
 * @callback getIdCallback
 * @param {Object} response - assumed to be a json object
 */

/**
 * @callback overrideId
 * @returns {*} - returns either an object or undefined,
 * if undefined an id value will be obtained from browser local storage/cookies or with the submodule getId function
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
 * @property {string} configKey - property name within the config universal id object
 * @property {number} expires - cookie expires time
 * @property {decode} decode - decode a stored value for passing to bid requests
 * @property {getId} getId - performs action to obtain id and return a value in the callback's response argument
 */

/**
 * @typedef {Object} SubmoduleConfig - IdSubmodule config obj contained in the config 'usersync.universalIds' array
 * @property {Object} storage
 * @property {Object} value
 * @property {Object} params
 * @property {number} syncDelay
 */

const STORAGE_TYPE_COOKIE = 'cookie';
const STORAGE_TYPE_LOCALSTORAGE = 'html5';

/**
 * id data to be added to bid requests
 * @type {{addData: function, getData: function}}
 */
export const extendedBidRequestData = (function () {
  // @type {Object[]}
  const dataItems = [];
  return {
    addData: function (data) {
      // activate requestBids hook when adding first item, this prevents unnecessary processing
      if (dataItems.length === 0) {
        $$PREBID_GLOBAL$$.requestBids.addHook(requestBidHook);
      }
      dataItems.push(data);
    },
    getData: function () {
      return dataItems;
    }
  }
})();

/**
 * @type {IdSubmodule[]}
 */
const submodules = [{
  configKey: 'pubCommonId',
  expires: (new Date()).getTime() + (365 * 24 * 60 * 60 * 1000 * 8),
  decode: function(idData) {
    return {
      crumbs: idData
    }
  },
  getId: function(data, callback) {
    const response = {
      data: utils.generateUUID()
    };
    callback(response);
  }
}, {
  configKey: 'unifiedId',
  expires: (new Date()).getTime() + (365 * 24 * 60 * 60 * 1000 * 8),
  decode: function(idData) {
    // TODO: complete openId decode implementation
  },
  getId: function(data, callback) {
    // validate config values: params.partner and params.endpoint
    const partner = data.params.partner || 'prebid';
    const url = data.params.url || `http://match.adsrvr.org/track/rid?ttd_pid=${partner}&fmt=json`;
    ajax(url, response => {
      try {
        callback(response);
      } catch (e) {
        utils.logError(e);
        callback(undefined);
      }
    }, undefined, {
      method: 'GET'
    });
  }
}];

/**
 * @param {IdSubmodule} submodule
 * @param {SubmoduleConfig} submoduleConfig
 * @param {{data: string, expires: number}} response
 */
export function submoduleGetIdCallback(submodule, submoduleConfig, response) {
  if (response && typeof response.data === 'string' && response.data !== '') {
    if (submoduleConfig.storage.type === STORAGE_TYPE_COOKIE) {
      const expires = response.expires || submoduleConfig.storage.expires || submodule.expires;
      setCookie(submoduleConfig.storage.name, response.data, expires);
    } else if (submoduleConfig.storage.type === STORAGE_TYPE_LOCALSTORAGE) {
      localStorage.setItem(submoduleConfig.storage.name, response.data);
    } else {
      utils.logError('Universal ID Module: Invalid configuration storage type');
    }
    extendedBidRequestData.addData(submodule.decode(response.data));
  } else {
    utils.logError('Universal ID Module: Submodule getId callback returned empty or invalid response');
  }
}

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

// Helper to set a cookie
export function setCookie(name, value, expires) {
  const expTime = new Date();
  expTime.setTime(expTime.getTime() + expires * 1000 * 60);
  window.document.cookie = name + '=' + encodeURIComponent(value) + ';path=/;expires=' +
    expTime.toGMTString();
}

// Helper to read a cookie
export function getCookie(name) {
  const m = window.document.cookie.match('(^|;)\\s*' + name + '\\s*=\\s*([^;]*)\\s*(;|$)');
  return m ? decodeURIComponent(m[2]) : null;
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
 * @param {Object[]} submoduleConfigs
 * @param {IdSubmodule[]} submodules
 */
export function validateConfig (submoduleConfigs, submodules) {
  // exit if no configurations are set
  if (!Array.isArray(submoduleConfigs)) {
    console.log('validateConfig: submoduleConfigs is NOT ARRAY');
    return false;
  }
  // check that at least one config exists
  return submodules.some(submodule => {
    const submoduleConfig = find(submoduleConfigs, universalIdConfig => {
      return universalIdConfig.name === submodule.configKey;
    });
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
export function requestBidHook (config, next) {
  // pass id data to adapters if bidRequestData list is not empty
  extendedBidRequestData.getData().forEach(dataItem => {
    const adUnits = config.adUnits || $$PREBID_GLOBAL$$.adUnits;
    if (adUnits) {
      adUnits.forEach((adUnit) => {
        adUnit.bids.forEach((bid) => {
          Object.assign(bid, dataItem);
        });
      });
    }
  });
  // Note: calling next() allows Prebid to continue processing an auction, if not called, the auction will be stalled.
  return next.apply(this, arguments);
}

/**
 * init submodules if config values are set correctly
 * @param submoduleConfigs
 * @param syncDelay
 * @param {IdSubmodule[]} submodules
 * @param {Navigator} navigator
 * @param {Document} document
 * @returns {Array} - returns list of enabled submodules
 */
export function initSubmodules (submoduleConfigs, syncDelay, submodules, navigator, document) {
  // valid if at least one configuration is valid
  if (!validateConfig(submoduleConfigs, submodules)) {
    utils.logInfo('Failed to validate configuration for Universal ID module');
    return [];
  }

  // storage enabled storage types, use to check if submodule has a valid configuration
  const storageTypes = enabledStorageTypes(navigator, document);

  // process and return list of enabled submodules
  return submodules.reduce((carry, submodule) => {
    const submoduleConfig = find(submoduleConfigs, universalIdConfig => {
      return universalIdConfig.name === submodule.configKey;
    });

    // skip, config with name matching submodule.configKey does not exist
    if (!submoduleConfig) {
      return carry;
    }

    if (submoduleConfig.value && typeof submoduleConfig.value === 'object') {
      // submodule just passes a value set in config
      carry.push('found value config, add directly to bidAdapters');
      // add obj to list to pass to adapters
      extendedBidRequestData.addData(submoduleConfig.value);
    } else if (submoduleConfig.storage && typeof submoduleConfig.storage === 'object' &&
      typeof submoduleConfig.storage.type === 'string' && storageTypes.indexOf(submoduleConfig.storage.type) !== -1) {
      //  submodule uses local storage to get value
      carry.push('found storage config, try to load from local storage');

      let storageValue;
      if (submoduleConfig.storage.type === STORAGE_TYPE_COOKIE) {
        storageValue = getCookie(submoduleConfig.storage.name);
      } else if (submoduleConfig.storage.type === STORAGE_TYPE_LOCALSTORAGE) {
        storageValue = localStorage.getItem(submoduleConfig.storage.name);
      } else {
        // ERROR STORAGE TYPE NOT DEFINED
        utils.logMessage('Universal ID configuration error, storage type configuration invalid');
      }

      if (storageValue) {
        // TODO: review impact on event loop from try/catch around cookie/localStorage access
        // stored value exists, call submodule decode and pass value to adapters
        extendedBidRequestData.addData(submodule.decode(storageValue));
      } else {
        // stored value does not exist, call submodule getId
        if (syncDelay) {
          // if syncDelay exists, wrap submodule.getId call with a setTimeout
          setTimeout(function () {
            submodule.getId(submoduleConfig, function (response) {
              submoduleGetIdCallback(submodule, submoduleConfig, response);
            });
          })
        } else {
          // no syncDelay, call submodule.getId without setTimeout
          submodule.getId(submoduleConfig, function (response) {
            submoduleGetIdCallback(submodule, submoduleConfig, response);
          });
        }
      }
    }
    return carry;
  }, []);
}

function init() {
  config.getConfig('usersync', ({usersync}) => {
    if (usersync) {
      const enabledModules = initSubmodules(usersync.universalIds, usersync.syncDelay || 0, submodules, window.navigator, window.document);
      console.log('Universal ID Module initialized submodules: ', enabledModules);
    } else {
      console.log('Universal ID Module not initialized: config usersync not defined');
    }
  });
}
init();
