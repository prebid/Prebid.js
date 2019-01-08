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
 * @property {string} name - the universalId submodule name
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
 * @property {string} name - submodule and config have matching name prop
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

const MODULE_NAME = 'Universal ID Module';
const OPT_OUT_COOKIE = '_pbjs_id_optout';
const STORAGE_TYPE_COOKIE = 'cookie';
const STORAGE_TYPE_LOCALSTORAGE = 'html5';

/**
 * data to be applied as submodule.getId function arguments after consentData is loaded
 * @type {Array.<GetIdData>}
 */
let getIdQue = [];

/**
 * data to be added to bid requests in the request bid hook
 * @type {Array.<Object>}
 */
let extendBidData = [];

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
    if (typeof localStorage !== 'object') {
      return false;
    }
    localStorage.setItem('prebid.cookieTest', '1');
    return localStorage.getItem('prebid.cookieTest') === '1';
  } catch (e) {
    return false;
  }
}

function getCookie (document, key) {
  let m = document.cookie.match('(^|;)\\s*' + key + '\\s*=\\s*([^;]*)\\s*(;|$)');
  return m ? m[2] : null;
}

function setCookie (document, key, value, expires) {
  const expTime = new Date();
  expTime.setTime(expTime.getTime() + (expires || 60) * 1000 * 60);
  document.cookie = key + '=' + value + ';path=/;expires=' + expTime.toGMTString();
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
  if (!Array.isArray(dependencies.universalIds)) {
    // no submodule configurations were set
    return false;
  }
  // at least one config exists
  return dependencies.submodules.some(submodule => {
    const submoduleConfig = find(dependencies.universalIds, submoduleConfig => submoduleConfig.name === submodule.name);
    if (submoduleConfig && typeof submoduleConfig === 'object') {
      // valid config exists for submodule
      return true;
    }
    // no config exists for submodule
    return false;
  });
}

/**
 * test if consent module is present, applies, and is valid for local storage (purpose 1)
 * @returns {boolean}
 */
function hasGDPRConsent (consentData) {
  if (consentData && typeof consentData.gdprApplies === 'boolean' && consentData.gdprApplies) {
    if (!consentData.consentString) {
      return false;
    }
    if (consentData.vendorData && consentData.vendorData.purposeConsents && consentData.vendorData.purposeConsents[1] === false) {
      return false;
    }
  }
  return true;
}

/**
 * This function is called when bids are requested, but before the bids are passed to bid adapters.
 * 1.) retrieving gdpr consentData and then passing it to submodule.getId functions if necessary
 * 2.) adding universal id data to bid request objects for use in bid adapters
 * Note: the priority value of the hook function must be less than the value set for the consentManagement module, or consentData will not available
 *   consentData is REQUIRED if submodule.getId needs to be called
 *   responsible for handling:
 * @param {{}} config
 * @param next
 * @returns {*}
 */
export function requestBidHook(config, next) {
  if (getIdQue.length) {
    getIdQue.forEach(getIdQueItem => {
      // consentData has been set, call queued getId
      getIdQueItem.submodule.getId(getIdQueItem.universalId, gdprDataHandler.getConsentData(), getIdQueItem.syncDelay, function (response) {
        const storageKey = getIdQueItem.universalId.storage.name;
        const storageType = getIdQueItem.universalId.storage.type;
        const logPrefix = `${MODULE_NAME}: ${getIdQueItem.universalId.name}`;

        if (response && response.data) {
          const responseStr = (typeof response.data === 'object') ? JSON.stringify(response.data) : response.data;
          if (storageType === STORAGE_TYPE_COOKIE) {
            // cookie
            setCookie(document, storageKey, encodeURIComponent(responseStr), response.expires);
            utils.logInfo(`${logPrefix} - saving to ${storageType}: ${storageKey}=${responseStr}`);
          } else if (storageType === STORAGE_TYPE_LOCALSTORAGE) {
            // local storage
            localStorage.setItem(storageKey, responseStr);
            utils.logInfo(`${logPrefix} - saving to ${storageType}: ${storageKey}=${responseStr}`);
          } else {
            utils.logError(`${logPrefix} - invalid configuration storage type: ${storageType}`);
          }
          extendBidData.push(getIdQueItem.submodule.decode(response.data));
        }
      });
    });
    // completed all getId function calls from que
    getIdQue = []
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
 * initialize any submodules that have valid configuration
 * @param dependencies
 * @returns {*}
 */
export function initSubmodules (dependencies) {
  if (!validateConfig(dependencies)) {
    utils.logInfo(`${MODULE_NAME} - invalid configuration, exit module`);
    return [];
  }

  // storage types validated with browser support tests
  const validStorageTypes = enabledStorageTypes(dependencies);

  return dependencies.submodules.reduce((carry, submodule) => {
    const submoduleConfig = find(dependencies.universalIds, submoduleConfig => submoduleConfig.name === submodule.name);
    if (!submoduleConfig) {
      // no config ignore submodule, skip to next
      return carry;
    }

    if (submoduleConfig.value) {
      // submodule VALUE OBJECT, value is added directly to bid requests (DOES NOT REQUIRE DECODING)
      carry.extendBidData.push(submoduleConfig.value);
    } else if (submoduleConfig.storage && typeof submoduleConfig.storage === 'object' &&
      typeof submoduleConfig.storage.type === 'string' && validStorageTypes.indexOf(submoduleConfig.storage.type) !== -1) {
      if (submoduleConfig.storage.type === STORAGE_TYPE_COOKIE) {
        // COOKIE: decode storage value before adding to bid requests
        const cookieValue = getCookie(dependencies.document, submoduleConfig.storage.name);
        if (cookieValue) {
          carry.extendBidData.push(submodule.decode(cookieValue));
        } else {
          carry.getIdQue.push({ submodule: submodule, universalId: submoduleConfig, syncDelay: dependencies.syncDelay })
        }
      } else if (submoduleConfig.storage.type === STORAGE_TYPE_LOCALSTORAGE) {
        // LOCAL STORAGE: decode storage value before adding to bid requests
        const localStorageValue = dependencies.localStorage.getItem(submoduleConfig.storage.name);
        if (localStorageValue) {
          carry.extendBidData.push(submodule.decode(localStorageValue));
        } else {
          carry.getIdQue.push({ submodule: submodule, universalId: submoduleConfig, syncDelay: dependencies.syncDelay })
        }
      }
    }
    return carry;
  }, { extendBidData: [], getIdQue: [] });
}

/**
 * @param {{config: {}, submodules: [], navigator: Navigator, document: Document, localStorage: Storage}} dependencies
 */
function init (dependencies) {
  if (getCookie(dependencies.document, OPT_OUT_COOKIE)) {
    utils.logInfo(`${MODULE_NAME} - opt-out cookie found, exit module`);
    return;
  }
  // listen for config userSyncs to be set
  dependencies.config.getConfig('usersync', ({usersync}) => {
    if (usersync) {
      dependencies['syncDelay'] = usersync.syncDelay || 0;
      dependencies['universalIds'] = usersync.universalIds;

      const initSubmoduleResult = initSubmodules(dependencies);
      if (initSubmoduleResult && (initSubmoduleResult.getIdQue.length || initSubmoduleResult.extendBidData.length)) {
        extendBidData = initSubmoduleResult.extendBidData;
        getIdQue = initSubmoduleResult.getIdQue;
        // the bidRequest hook function will handle the remaining tasks:
        //  1. executing queued getId functions
        //  2. makes extendBidData available to bid adapters
        $$PREBID_GLOBAL$$.requestBids.addHook(requestBidHook);
      }
    }
  });
}

init({
  config: config,
  submodules: [{
    name: 'pubCommonId',
    decode: function(value) {
      return { 'pubcid': decodeURIComponent(value) }
    },
    getId: function(data, consentData, syncDelay, callback) {
      if (!hasGDPRConsent(consentData)) {
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
    name: 'unifiedId',
    decode: function (value) {
      return { 'tdid': decodeURIComponent(value) };
    },
    getId: function (data, consentData, syncDelay, callback) {
      const logPrefix = `${MODULE_NAME}: ${data.name}.getId`;

      function callEndpoint () {
        if (!hasGDPRConsent(consentData)) {
          utils.logWarn(`${logPrefix} - failed GDPR consent validation`);
          callback();
          return;
        }
        const partner = data.params.partner || 'prebid';
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
              utils.logError(`${MODULE_NAME}: ${logPrefix} internal function callEndpoint Error: ${e.type}: ${e.message}`);
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
        utils.logInfo(`${logPrefix} - delay is active: syncDelay=${syncDelay}; the delay timer starts after the auction ends, so a "auction-end" listener has been added`);
        // wrap auction end event handler in function so that it can be removed
        const auctionEndHandler = function auctionEndHandler() {
          utils.logInfo(`${logPrefix} - "auction-end" event was fired, start a timer (for ${syncDelay} ms), and on complete make webservice request`);
          // remove event handler immediately since we only need to listen for the first auction ending
          events.off(CONSTANTS.EVENTS.AUCTION_END, auctionEndHandler);
          setTimeout(callEndpoint, syncDelay);
        };
        events.on(CONSTANTS.EVENTS.AUCTION_END, auctionEndHandler);
      }
    }
  }],
  navigator: navigator,
  document: document,
  localStorage: localStorage
});
