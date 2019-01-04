/**
 * This module adds Universal ID support to prebid.js
 */
import {ajax} from 'src/ajax';
import {config} from 'src/config';
import events from 'src/events';
import * as utils from 'src/utils';
import find from 'core-js/library/fn/array/find';
import { gdprDataHandler } from 'src/adaptermanager';

const CONSTANTS = require('../src/constants.json');

/**
 * @callback getIdCallback
 * @param {Object} response - assumed to be a json object
 */

/**
 * @callback getId
 * @summary submodule interface for getId function
 * @param {Object} data
 * @param {Object} consentData
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
 * @property {decode} decode - decode a stored value for passing to bid requests
 * @property {getId} getId - performs action to obtain id and return a value in the callback's response argument
 */

const OPT_OUT_COOKIE = '_pbjs_id_optout';
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
        $$PREBID_GLOBAL$$.requestBids.addHook(requestBidHook, 52);
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
  decode: function(idData) {
    return { 'pubcid': idData }
  },
  getId: function(data, consentData, syncDelay, callback) {
    if (consentData && !hasGDPRConsent(consentData)) {
      callback();
      return;
    }
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
  getId: function(data, consentData, syncDelay, callback) {
    function callEndpoint() {
      if (consentData && !hasGDPRConsent(consentData)) {
        callback();
        return;
      }
      // validate config values: params.partner and params.endpoint
      const partner = data.params.partner || 'prebid';
      const url = data.params.url || `http://match.adsrvr.org/track/rid?ttd_pid=${partner}&fmt=json`;
      utils.logInfo('Universal ID Module, call sync endpoint', url);

      ajax(url, response => {
        if (response) {
          try {
            const parsedResponse = (typeof response !== 'object') ? JSON.parse(response) : response;
            const responseObj = {
              data: parsedResponse.TDID,
              expires: parsedResponse.expires || data.storage.expires || 60
            };
            callback(responseObj);
          } catch (e) {
            callback();
          }
        } else {
          callback();
        }
      }, undefined, { method: 'GET' });
    }

    // if no sync delay call endpoint immediately, else start a timer after auction ends to call sync
    if (!syncDelay) {
      utils.logInfo('Universal ID Module, call endpoint to sync without delay');
      callEndpoint();
    } else {
      utils.logInfo('Universal ID Module, sync delay exists, set auction end event listener and call with timer');
      // wrap auction end event handler in function so that it can be removed
      const auctionEndHandler = function auctionEndHandler() {
        utils.logInfo('Universal ID Module, auction end event listener called, set timer for', syncDelay);
        // remove event handler immediately since we only need to listen for the first auction ending
        events.off(CONSTANTS.EVENTS.AUCTION_END, auctionEndHandler);
        setTimeout(callEndpoint, syncDelay);
      };
      events.on(CONSTANTS.EVENTS.AUCTION_END, auctionEndHandler);
    }
  }
}];

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
 * @param {{document: Document, localStorage: {}, navigator: Navigator}} dependencies
 * @returns {[]}
 */
export function enabledStorageTypes (dependencies) {
  const enabledStorageTypes = [];
  if (browserSupportsLocalStorage(dependencies.localStorage)) {
    enabledStorageTypes.push(STORAGE_TYPE_LOCALSTORAGE);
  }
  if (browserSupportsCookie(dependencies.navigator, dependencies.document)) {
    enabledStorageTypes.push(STORAGE_TYPE_COOKIE)
  }
  return enabledStorageTypes;
}

/**
 * check if any universal id types are set in configuration (must opt-in to enable)
 * @param {{universalIds: [], submodules: []}} dependencies
 */
export function validateConfig (dependencies) {
  // exit if no configurations are set
  if (!Array.isArray(dependencies.universalIds)) {
    return false;
  }
  // check that at least one config exists
  return dependencies.submodules.some(submodule => {
    const submoduleConfig = find(dependencies.universalIds, universalIdConfig => {
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
 * decode base64 encoded consent string to check position for user consents to local storage (purpose 1)
 * @param {string} consentString
 * @returns {boolean}
 */
export function gdprLocalStorageConsent(consentString) {
  try {
    return (atob(consentString).charCodeAt(16) | 247) === 255;
  } catch (e) {
    utils.logError('Universal ID Module error decoding gdpr consent string');
    return false;
  }
}

/**
 * test if consent module is present, applies, and is valid for local storage (purpose 1)
 * @returns {boolean}
 */
export function hasGDPRConsent(consentData) {
  if (typeof consentData.gdprApplies === 'boolean' && consentData.gdprApplies) {
    if (!consentData.consentString) {
      utils.logWarn('Universal ID Module exiting on no GDPR consent string');
      return false;
    }
    if (!gdprLocalStorageConsent(consentData.consentString)) {
      utils.logWarn('Universal ID Module exiting on no GDPR consent to local storage (purpose #1)');
      return false;
    }
  }
  return true;
}

/**
 * Request bid hook to retrieve consentManagement data and pass to submodule.getId
 * @param config
 * @param next
 * @returns {*}
 */
export function requestBidHookGetId(config, next) {
  // Check if getId needs to be called
  getIdQue.forEach(item => {
    // local value does not exist and submodule getId should be called
    item.submodule.getId(item.universalId, gdprDataHandler.getConsentData(), item.syncDelay, function (response) {
      const storageKey = item.universalId.storage.name;
      const storageType = item.universalId.storage.type;
      const logPrefix = `Universal ID Module - ${storageKey}:`;

      if (response && response.data) {
        const responseData = (typeof response.data === 'object') ? JSON.stringify(response.data) : response.data;

        if (storageType === STORAGE_TYPE_COOKIE) {
          setCookie(storageKey, responseData, response.expires);
          utils.logInfo(`${logPrefix} set "cookie" value ${storageKey}=${responseData}`);
        } else if (storageType === STORAGE_TYPE_LOCALSTORAGE) {
          localStorage.setItem(storageKey, responseData);
          utils.logInfo(`${logPrefix} set "localStorage" value ${storageKey}=${responseData}`);
        } else {
          utils.logError(`${logPrefix} invalid configuration storage type`);
        }

        extendedBidRequestData.addData(item.submodule.decode(response.data));
      } else {
        utils.logError(`${logPrefix} getId callback response was invalid. response=`, response);
      }
    });
  });
  // remove hook since this is only used once
  $$PREBID_GLOBAL$$.requestBids.removeHook(requestBidHookGetId);
  // calling next() allows prebid to continue processing
  return next.apply(this, arguments);
}

/**
 * decorate bid requests with universal id data if it exists
 * hook function is called before the real pbjs.requestBids is invoked, and can modify its parameter
 * @param {{}} config
 * @param next
 * @returns {*}
 */
export function requestBidHook (config, next) {
  // check for and pass universalId data if it exists to bid adapters
  if (extendedBidRequestData.getData().length) {
    const adUnits = config.adUnits || $$PREBID_GLOBAL$$.adUnits;
    if (adUnits) {
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
  }
  // calling next() allows prebid to continue processing
  return next.apply(this, arguments);
}

/**
 * @typedef {Object} GetIdData
 * @property {IdSubmodule} submodule
 * @property {Object} universalId
 * @property {number} syncDelay
 */

/**
 * @type {Array.<GetIdData>}
 */
const getIdQue = [];

/**
 * init submodules if config values are set correctly
 * @param {{universalIds: [], syncDelay: number, submodules: [], navigator: Navigator, document: Document, localStorage: {}, utils: {} }} dependencies
 * @returns {Array} - returns list of enabled submodules
 */
export function initSubmodules (dependencies) {
  // valid if at least one configuration is valid
  if (!validateConfig(dependencies)) {
    utils.logInfo('Failed to validate configuration for Universal ID module');
    return [];
  }

  // list of storage types defined submodules that are also enabled in users browser
  const storageTypes = enabledStorageTypes(dependencies);

  // process and return list of enabled submodules (used for test validation)
  return submodules.reduce((carry, submodule) => {
    const universalId = find(dependencies.universalIds, universalIdConfig => {
      return universalIdConfig.name === submodule.configKey;
    });
    const logPrefix = `Universal ID Module - ${universalId.name}:`;

    // skip when config with name matching submodule.configKey does not exist
    if (!universalId) {
      return carry;
    }

    if (universalId.value && typeof universalId.value === 'object') {
      // submodule passes "value" object if found in configuration
      carry.push(`${logPrefix} has valid value configuration, pass directly to bid requests`);
      extendedBidRequestData.addData(universalId.value);
    } else if (universalId.storage && typeof universalId.storage === 'object' &&
      typeof universalId.storage.type === 'string' && storageTypes.indexOf(universalId.storage.type) !== -1) {
      // submodule uses local storage to get value
      const storageKey = universalId.storage.name;
      const storageType = universalId.storage.type;

      carry.push(`${logPrefix} has valid ${storageType} storage configuration, pass decoded value to bid requests`);

      // value retrieved from cookies or local storage
      let storageValue;
      if (storageType === STORAGE_TYPE_COOKIE) {
        storageValue = getCookie(storageKey);
      } else if (storageType === STORAGE_TYPE_LOCALSTORAGE) {
        storageValue = dependencies.localStorage.getItem(storageKey);
      } else {
        utils.logError(`${logPrefix} has invalid storage configuration type "${storageType}"`);
      }

      // if local value exists pass decoded value to bid requests
      if (storageValue) {
        utils.logInfo(`${logPrefix} found valid "${storageType}" value ${storageKey}=${storageValue}`);

        extendedBidRequestData.addData(submodule.decode(storageValue));
      } else {
        // Build que of data to supply to 'getId' that will be executed from a que in requestBidHook
        getIdQue.push({
          submodule: submodule,
          universalId: universalId,
          syncDelay: dependencies.syncDelay,
        });
      }
    }
    return carry;
  }, []);
}

/**
 * @param {{config: {}, submodules: [], navigator: Navigator, document: Document, utils: {}}} dependencies
 */
export function init(dependencies) {
  // check for opt out cookie
  if (document.cookie.indexOf(OPT_OUT_COOKIE) !== -1) {
    utils.logInfo('Universal ID Module disabled: opt out cookie exists');
    return;
  }
  // listen for usersync config change
  dependencies.config.getConfig('usersync', ({usersync}) => {
    if (usersync) {
      dependencies['syncDelay'] = usersync.syncDelay || 0;
      dependencies['universalIds'] = usersync.universalIds;
      const enabledModules = initSubmodules(dependencies);
      utils.logInfo(`Universal ID Module initialized ${enabledModules.length} submodules`);

      // add requestBidHook if getIdQue contains items
      if (getIdQue.length) {
        $$PREBID_GLOBAL$$.requestBids.addHook(requestBidHookGetId, 51);
      }
    }
  });
}

init({
  config: config,
  submodules: submodules,
  navigator: window.navigator,
  document: window.document,
  localStorage: window.localStorage
});
