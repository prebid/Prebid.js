/**
 * This module adds Universal ID support to prebid.js
 */
import { ajax } from 'src/ajax';
import { config } from 'src/config';
import events from 'src/events';
import * as utils from 'src/utils';
import find from 'core-js/library/fn/array/find';
import { gdprDataHandler } from 'src/adaptermanager';

const CONSTANTS = require('../src/constants.json');

/**
 * @typedef {Object} StorageConfig
 * @property {string} type - browser storage type (html5 or cookie)
 * @property {string} name - key name to use when saving/reading to local storage or cookies
 * @property {number} expires - time to live for browser cookie
 */

/**
 * @typedef {Object} ParamsConfig
 * @property {string} partner - partner url param value
 * @property {string} url - webservice request url used to load Id data. The response data from the url is saved to browser storage
 * and will be passed to bid adapters on subsequent auctions
 */

/**
 * @typedef {Object} IdSubmoduleConfig
 * @property {string} name - the universalId submodule name. The name value is used link a submodule (using submodule.configKey)
 * with it's configuration data (IdSubmoduleConfig)
 * @property {StorageConfig} storage - browser storage config
 * @property {ParamsConfig} params - params config for use by the submodule.getId function
 * @example
 * {
 *   name: "unifiedId",
 *   params: {
 *     partner: "prebid",
 *     url: "http://match.adsrvr.org/track/rid?ttd_pid=prebid&fmt=json"
 *   },
 *   storage: {
 *     type: "cookie",
 *     name: "unifiedid",
 *     expires: 60
 *   }
 * }
 */

/**
 * @callback getIdCallback
 * @param {Object} response - assumed to be a json object
 */

/**
 * @callback getId
 * @summary submodule interface for getId function
 * @param {Object} data
 * @param {Object} consentData
 * @param {number} syncDelay - delay timer (begins after auction ends) to make any http requests to retrieve user id data
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
 * @property {string} configKey - links the submodule with it's configuration data,
 * by matching the "configKey" with a submodule config's "name" value:
 * configKey === userSyncs.universalIds[n].name
 * @property {decode} decode - decode a stored value for passing to bid requests.
 * @property {getId} getId - performs action to obtain id and return a value in the callback's response argument.
 */

/**
 * @typedef {Object} GetIdData
 * @property {IdSubmodule} submodule - And object defining an UniversalId submodule.
 * Submodules must implement the props and methods from {IdSubModule} type: { configKey: string, getId: function, decode: function }.
 * @property {IdSubmoduleConfig} universalId - config data for the universalId submodule.
 * @property {number} syncDelay - delay after auction complete to call webservice or perform async ops.
 */

const OPT_OUT_COOKIE = '_pbjs_id_optout';
const STORAGE_TYPE_COOKIE = 'cookie';
const STORAGE_TYPE_LOCALSTORAGE = 'html5';

/**
 * PubCommon ID Submodule
 * @type {IdSubmodule}
 */
const pubCommonIdSubmodule = {
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
};

/**
 * Unified ID Submodule
 * @type {IdSubmodule}
 */
const unifiedIdSubmodule = {
  configKey: 'unifiedId',
  decode: function(idData) {
    try {
      return { 'tdid': idData };
    } catch (e) {
      utils.logError('Universal ID submodule decode error');
    }
  },
  getId: function(data, consentData, syncDelay, callback) {
    const logPrefix = 'UniversalId';

    function callEndpoint() {
      // validate consentData if consentData exists
      if (consentData && !hasGDPRConsent(consentData)) {
        callback();
        return;
      }
      // @type {string} - validate config values: params.partner and params.endpoint
      const partner = data.params.partner || 'prebid';
      // @type {string} - endpoint to retrieve user id data
      const url = data.params.url || `http://match.adsrvr.org/track/rid?ttd_pid=${partner}&fmt=json`;

      utils.logInfo(`${logPrefix} - call sync endpoint: ${url}`);

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
      utils.logInfo(`${logPrefix} - call endpoint without delay`);
      callEndpoint();
    } else {
      utils.logInfo(`${logPrefix} - has sync delay "${syncDelay}", will listen for "auction-end" and when executed, start a timer to call the endpoint when it completes`);
      // wrap auction end event handler in function so that it can be removed
      const auctionEndHandler = function auctionEndHandler() {
        utils.logInfo(`${logPrefix} - "auction-end" handler executed, create timer "${syncDelay}" that will call endpoint on complete`);
        // remove event handler immediately since we only need to listen for the first auction ending
        events.off(CONSTANTS.EVENTS.AUCTION_END, auctionEndHandler);
        setTimeout(callEndpoint, syncDelay);
      };
      events.on(CONSTANTS.EVENTS.AUCTION_END, auctionEndHandler);
    }
  }
};

/**
 * List of data to apply to submodule.getId function calls in the request bid hook
 * @type {Array.<GetIdData>}
 */
const getIdData = [];

/**
 * data to be added to bid requests in the request bid hook
 * @type {Array.<Object>}
 */
const extendBidData = [];

/**
 * @param {Navigator} navigator - navigator passed for easier testing through dependency injection
 * @param {Document} document - document passed for easier testing through dependency injection
 * @returns {boolean}
 */
export function browserSupportsCookie (navigator, document) {
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
export function browserSupportsLocalStorage (localStorage) {
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
 * This function is called when bids are requested, but before the bids are passed to bid adapters.
 * 1.) retrieving gdpr consentData and then passing it to submodule.getId functions if necessary
 * 2.) adding universal id data to bid request objects for use in bid adapters
 *
 * Note: the priority value of the hook function must be less than the value set for the consentManagement module, or consentData will not available
 *   consentData is REQUIRED if submodule.getId needs to be called
 *   responsible for handling:
 * @param {{}} config
 * @param next
 * @returns {*}
 */
export function requestBidHook (config, next) {
  // consentData should exist if the consentManagement module is done initializing
  const consentData = gdprDataHandler.getConsentData();

  // check if submodule getId methods need to be executed
  if (getIdData.length) {
    getIdData.forEach(item => {
      // submodule.getId can be called at this time since consentData has been set by the consentManger
      item.submodule.getId(item.universalId, consentData, item.syncDelay, function (response) {
        // @type {string} - read from config: userSync.universalIds[n].storage.name
        const storageKey = item.universalId.storage.name;

        // @type {string} - read from config: userSync.universalIds[n].storage.type
        const storageType = item.universalId.storage.type;

        // @type {string} - logging prefix used in the bid request hook function
        const logPrefix = `Universal ID Submodule: ${storageKey} -`;

        if (response && response.data) {
          // valid response, attempt to save ID data to browser storage (localStorage or cookies)

          /**
           * @type {string}
           */
          const responseData = (typeof response.data === 'object') ? JSON.stringify(response.data) : response.data;

          if (storageType === STORAGE_TYPE_COOKIE) {
            // - COOKIES -
            setCookie(storageKey, responseData, response.expires);
            utils.logInfo(`${logPrefix} saving to ${storageType}: ${storageKey}=${responseData}`);
          } else if (storageType === STORAGE_TYPE_LOCALSTORAGE) {
            // - LOCAL STORAGE -
            localStorage.setItem(storageKey, responseData);
            utils.logInfo(`${logPrefix} saving to ${storageType}: ${storageKey}=${responseData}`);
          } else {
            // - INVALID - storage type
            utils.logError(`${logPrefix} invalid configuration storage type: ${storageType}`);
          }

          // decode response data and push to array of objs,
          // and this array will be iterated in this hook function and each item value added to bids for access by bid adapters
          extendBidData.push(item.submodule.decode(response.data));
        } else {
          utils.logError(`${logPrefix} getId callback response was invalid. response=`, response);
        }
      });
    });
    // empty getIdData since it has been processed
    getIdData.length = 0;
  }

  // check for and pass universalId data if it exists to bid adapters
  if (extendBidData.length) {
    const adUnits = config.adUnits || $$PREBID_GLOBAL$$.adUnits;
    if (adUnits) {
      const universalID = extendBidData.reduce((carry, item) => {
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
 * validate and initialize all submodules using submodule configuration data
 * @param {{universalIds: [], syncDelay: number, submodules: [], navigator: Navigator, document: Document, localStorage: Storage}} dependencies
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
  return dependencies.submodules.reduce((carry, submodule) => {
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
      extendBidData.push(universalId.value);
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
        extendBidData.push(submodule.decode(storageValue));
      } else {
        // Build que of data to supply to 'getId' that will be executed from a que in requestBidHook
        getIdData.push({
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
 * @param {{config: {}, submodules: [], navigator: Navigator, document: Document, localStorage: Storage}} dependencies
 */
export function init(dependencies) {
  // @type {string} - logging prefix for init function
  const logPrefix = 'UniversalId';

  // check for opt out cookie, if exists exit immediately
  if (document.cookie.indexOf(OPT_OUT_COOKIE) !== -1) {
    utils.logInfo(`${logPrefix} - opt-out cookie was found, module is disabled`);
    return;
  }

  // Submodules are disabled by default, so a valid config is REQUIRED to enable/activate any of submodules
  // wait for configuration prop "usersync" to load before continuing to initialize submodules
  dependencies.config.getConfig('usersync', ({usersync}) => {
    if (usersync) {
      // append dependencies from config; to allow unit testing the nested functions w/ dependency injection
      dependencies['syncDelay'] = usersync.syncDelay || 0;
      dependencies['universalIds'] = usersync.universalIds;

      // @type {Array.<string>} list of valid enabled submodules
      const activeSubmodules = initSubmodules(dependencies);

      // only continue if at least one submodule is configured/enabled
      if (activeSubmodules.length) {
        utils.logInfo(`${logPrefix} - init submodules: ${activeSubmodules.reduce((carry, item) => { return carry + ', ' + item.configKey }, '')}`);

        // At least one of following conditions is valid (and needs processing in the bid request hook):
        //  1.) A submodule getId functions must be queued because consent data is required but is not available until the hook callback is executed
        //  2.) ID data items found and ready to be appended to bid requests when the hook is executed
        if (getIdData.length || extendBidData.length) {
          const processTypes = (getIdData.length && extendBidData.length) ? 'extendBidData and getIdData' : (extendBidData.length ? 'extendBidData' : 'getIdData');
          utils.logInfo(`${logPrefix} - adding request bid hook to process: ${processTypes}`);

          // Note: the default priority (10) used to ensure consentManagement has been fully initialized
          $$PREBID_GLOBAL$$.requestBids.addHook(requestBidHook);
        } else {
          utils.logWarn(`${logPrefix} - failed to init submodules, no data for getIdData or extendBidData`);
        }
      } else {
        utils.logInfo(`${logPrefix} - no valid submodules`);
      }
    }
  });
}

init({
  config: config,
  submodules: [pubCommonIdSubmodule, unifiedIdSubmodule],
  navigator: window.navigator,
  document: window.document,
  localStorage: window.localStorage
});
