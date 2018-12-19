/**
 * This module adds Universal ID support to prebid.js
 */
import {ajax} from 'src/ajax';
import {config} from 'src/config';
import * as utils from 'src/utils';
import find from 'core-js/library/fn/array/find';
import { gdprDataHandler } from 'src/adaptermanager';

const events = require('../src/events');
const CONSTANTS = require('../src/constants.json');

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
 * @param {number} syncDelay
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
 */

const STORAGE_TYPE_COOKIE = 'cookie';
const STORAGE_TYPE_LOCALSTORAGE = 'html5';

/**
 * data to be added to bid requests
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
    },
    destroy: function () {
      // remove all data and request bids hook
      while (dataItems.length) {
        dataItems.pop();
      }
      $$PREBID_GLOBAL$$.requestBids.removeHook(requestBidHook);
    }
  }
})();

/**
 * @type {IdSubmodule[]}
 */
const submodules = [{
  configKey: 'pubCommonId',
  decode: function(idData) {
    return { 'pubcid': idData }
  },
  getId: function(data, syncDelay, callback) {
    const responseObj = {
      data: utils.generateUUID(),
      expires: data.storage.expires || 60
    };
    callback(responseObj);
  }
}, {
  configKey: 'unifiedId',
  decode: function(idData) {
    try {
      return { 'tdid': idData };
    } catch (e) {
      utils.logError('Universal ID submodule decode error');
    }
  },
  getId: function(data, syncDelay, callback) {
    function callEndpoint() {
      // validate config values: params.partner and params.endpoint
      const partner = data.params.partner || 'prebid';
      const url = data.params.url || `http://match.adsrvr.org/track/rid?ttd_pid=${partner}&fmt=json`;
      utils.logInfo('Universal ID Module, call sync endpoint', url);
      ajax(url, response => {
        try {
          const parsedResponse = (response && typeof response !== 'object') ? JSON.parse(response) : response;
          const responseObj = {
            data: parsedResponse.TDID,
            expires: parsedResponse.expires || data.storage.expires || 60
          };
          callback(responseObj);
        } catch (e) {
          utils.logError(e);
          callback();
        }
      }, undefined, {
        method: 'GET'
      });
    }
    // if no sync delay call endpoint immediately, else start a timer after auction ends to call sync
    if (!syncDelay) {
      utils.logInfo('Universal ID Module, call endpoint to sync without delay');
      callEndpoint();
    } else {
      utils.logInfo('Universal ID Module, sync delay exists, set auction end event listener and call with timer on evocation');
      // wrap auction end event handler in function so that it can be removed
      const auctionEndHandler = function auctionEndHandler() {
        utils.logInfo('Universal ID Module, auction end event listener evoked, set timer for', syncDelay);
        // remove event handler immediately since we only need to listen for the first auction ending
        events.off(CONSTANTS.EVENTS.AUCTION_END, auctionEndHandler);
        setTimeout(callEndpoint, syncDelay);
      };
      events.on(CONSTANTS.EVENTS.AUCTION_END, auctionEndHandler);
    }
  }
}];

/**
 * @param {IdSubmodule} submodule
 * @param {SubmoduleConfig} submoduleConfig
 * @param {{data: string, expires: number}} response
 */
export function submoduleGetIdCallback(submodule, submoduleConfig, response) {
  if (response && typeof response === 'object') {
    const responseStr = (response.data && typeof response.data !== 'string') ? JSON.stringify(response.data) : response.data;
    if (submoduleConfig.storage.type === STORAGE_TYPE_COOKIE) {
      setCookie(submoduleConfig.storage.name, responseStr, response.expires);
    } else if (submoduleConfig.storage.type === STORAGE_TYPE_LOCALSTORAGE) {
      localStorage.setItem(submoduleConfig.storage.name, responseStr);
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

/**
 * @param {string} name
 * @param {string} value
 * @param {?number} expires
 */
export function setCookie(name, value, expires) {
  const expTime = new Date();
  expTime.setTime(expTime.getTime() + (expires || 60) * 1000 * 60);
  window.document.cookie = name + '=' + encodeURIComponent(value) + ';path=/;expires=' +
    expTime.toGMTString();
}

/**
 * @param {string} name
 * @returns {any}
 */
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
  const adUnits = config.adUnits || $$PREBID_GLOBAL$$.adUnits;
  if (adUnits) {
    // if consent module is present, consent string must be valid
    const consentData = gdprDataHandler.getConsentData();
    if (consentData && !consentData.consentString) {
      utils.logWarn('Universal ID Module exiting on no GDPR consent');
      next.apply(this, arguments);
    }

    const universalID = extendedBidRequestData.getData().reduce((carry, item) => {
      Object.keys(item).forEach(key => {
        carry[key] = item[key];
      });
      return carry;
    }, {});
    adUnits.forEach((adUnit) => {
      adUnit.bids.forEach((bid) => {
        bid.universalID = universalID;
      });
    });
  }
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
        utils.logInfo('Universal ID module found storageValue:', storageValue);
        // stored value exists, call submodule decode and pass value to adapters
        extendedBidRequestData.addData(submodule.decode(storageValue));
      } else {
        utils.logInfo('Universal ID module did not find storageValue, call getId syncDelay:', syncDelay);
        // stored value does not exist, call submodule getId
        submodule.getId(submoduleConfig, syncDelay, function (response) {
          submoduleGetIdCallback(submodule, submoduleConfig, response);
        });
      }
    }
    return carry;
  }, []);
}

function init() {
  config.getConfig('usersync', ({usersync}) => {
    if (usersync) {
      const enabledModules = initSubmodules(usersync.universalIds, usersync.syncDelay || 0, submodules, window.navigator, window.document);
      utils.logInfo('Universal ID Module initialized ' + enabledModules);
    } else {
      utils.logInfo('Universal ID Module not initialized: config usersync not defined');
    }
  });
}
init();
