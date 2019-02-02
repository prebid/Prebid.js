/**
 * This module adds UserID support to prebid.js
 */
import { ajax } from '../src/ajax.js';
import { config } from '../src/config.js';
import events from '../src/events.js';
import * as utils from '../src/utils.js';
import find from 'core-js/library/fn/array/find';
import includes from 'core-js/library/fn/array/includes';
import { gdprDataHandler } from '../src/adapterManager.js';

const CONSTANTS = require('../src/constants.json');

/**
 * @typedef {Object} SubmoduleConfig
 * @property {string} name - the userId submodule name
 * @property {SubmoduleStorage} storage - browser storage config
 * @property {SubmoduleParams} params - params config for use by the submodule.getId function
 * @property {Object} value - all object properties will be appended to the userId bid data
 */

/**
 * @typedef {Object} SubmoduleStorage
 * @property {string} type - browser storage type (html5 or cookie)
 * @property {string} name - key name to use when saving/reading to local storage or cookies
 * @property {number} expires - time to live for browser cookie
 */

/**
 * @typedef {Object} SubmoduleParams
 * @property {string} partner - partner url param value
 * @property {string} url - webservice request url used to load Id data. The response data from the url is saved to browser storage
 * and will be passed to bid adapters on subsequent auctions
 */

/**
 * @typedef {Object} Submodule
 * @property {string} name - submodule and config have matching name prop.
 * @property {decode} decode - decode a stored value for passing to bid requests.
 * @property {getId} getId - performs action to obtain id and return a value in the callback's response argument.
 */

/**
 * @callback getId
 * @param {Object} submoduleConfig
 * @param {Object} consentData
 */

/**
 * @callback decode
 * @param {Object|string|number} idData
 * @returns {Object}
 */

/**
 * @typedef {Object} SubmoduleContainer
 * @property {Submodule} submodule
 * @property {SubmoduleConfig} submoduleConfig
 * @property {Object} idObj - decoded userid data that will be appended to bids
 * @property {function} callback
 */

const MODULE_NAME = 'UserId';
const COOKIE = 'cookie';
const LOCAL_STORAGE = 'html5';
const DEFAULT_SYNC_DELAY = 500;

// @type {number} delay after auction to make webrequests for id data
export let syncDelay;

// @type {SubmoduleContainer[]}
export let submodules;

// @type {SubmoduleContainer[]}
export let initializedSubmodules;

// @type {boolean} - flag to enforce initialization only happens once
export let moduleInitialized = false;

// @type {Submodule}
export const unifiedIdSubmodule = {
  name: 'unifiedId',
  decode(value) {
    return {
      'tdid': value['TDID']
    }
  },
  getId(submoduleConfig, consentData) {
    const partner = (submoduleConfig.params && typeof submoduleConfig.params.partner === 'string') ? submoduleConfig.params.partner : 'prebid';
    const url = (submoduleConfig.params && typeof submoduleConfig.params.url === 'string') ? submoduleConfig.params.url : `http://match.adsrvr.org/track/rid?ttd_pid=${partner}&fmt=json`;

    return function (callback) {
      ajax(url, response => {
        let responseObj;
        if (response) {
          try {
            responseObj = JSON.parse(response);
          } catch (error) {
            utils.logError(error);
          }
        }
        callback(responseObj);
      }, undefined, { method: 'GET' });
    }
  }
};

// @type {Submodule}
export const pubCommonIdSubmodule = {
  name: 'pubCommonId',
  decode(value) {
    return {
      'pubcid': value
    }
  },
  getId() {
    return utils.generateUUID()
  }
};

/**
 * @param {SubmoduleStorage} storage
 * @param {string} value
 * @param {number|string} expires
 */
export function setStoredValue(storage, value, expires) {
  try {
    const valueStr = (typeof value === 'object') ? JSON.stringify(value) : value;
    const expiresStr = (new Date(Date.now() + (expires * (60 * 60 * 24 * 1000)))).toUTCString();

    if (storage.type === COOKIE) {
      utils.setCookie(storage.name, valueStr, expiresStr);
    } else if (storage.type === LOCAL_STORAGE) {
      localStorage.setItem(`${storage.name}_exp`, expiresStr);
      localStorage.setItem(storage.name, encodeURIComponent(valueStr));
    }
  } catch (error) {
    utils.logError(error);
  }
}

/**
 * @param {SubmoduleStorage} storage
 * @returns {string}
 */
export function getStoredValue(storage) {
  let storedValue;
  try {
    if (storage.type === COOKIE) {
      storedValue = utils.getCookie(storage.name);
    } else if (storage.type === LOCAL_STORAGE) {
      const storedValueExp = localStorage.getItem(`${storage.name}_exp`);
      // empty string means no expiration set
      if (storedValueExp === '') {
        storedValue = localStorage.getItem(storage.name);
      } else if (storedValueExp) {
        if ((new Date(storedValueExp)).getTime() - Date.now() > 0) {
          storedValue = decodeURIComponent(localStorage.getItem(storage.name));
        }
      }
    }
    // we support storing either a string or a stringified object,
    // so we test if the string contains an stringified object, and if so convert to an object
    if (typeof storedValue === 'string' && storedValue.charAt(0) === '{') {
      storedValue = JSON.parse(storedValue);
    }
  } catch (e) {
    utils.logError(e);
  }
  return storedValue;
}

/**
 * test if consent module is present, applies, and is valid for local storage (purpose 1)
 * @param {Object} consentData
 * @returns {boolean}
 */
export function hasGDPRConsent(consentData) {
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
 * @param {Object[]} submodules
 * @param {function} [processCompleted] - not required, executed when all callbacks have returned responses
 */
export function processSubmoduleCallbacks(submodules, processCompleted) {
  submodules.forEach(function(submodule) {
    submodule.callback(function callbackCompleted (idObj) {
      // clear callback, this prop is used to test if all submodule callbacks are complete below
      submodule.callback = undefined;

      // if valid, id data should be saved to cookie/html storage
      if (idObj) {
        setStoredValue(submodule.config.storage, idObj, submodule.config.storage.expires);

        // cache decoded value (this is copied to every adUnit bid)
        submodule.idObj = submodule.submodule.decode(idObj);
      } else {
        utils.logError(`${MODULE_NAME}: ${submodule.submodule.name} - request id responded with an empty value`);
      }

      // Done when every submodule callback is set to 'undefined'
      if (submodules.every(item => typeof item.callback === 'undefined')) {
        // Notify done through calling processCompleted
        if (typeof processCompleted === 'function') {
          processCompleted();
        }
      }
    });
  });
}

/**
 * @param {Object[]} adUnits
 * @param {Object[]} submodules
 */
export function addIdDataToAdUnitBids(adUnits, submodules) {
  if (submodules.length) {
    if (adUnits) {
      adUnits.forEach(adUnit => {
        adUnit.bids.forEach(bid => {
          // append the userId property to bid
          bid.userId = submodules.reduce((carry, item) => {
            if (typeof item.idObj === 'object' && item.idObj !== null) {
              Object.keys(item.idObj).forEach(key => {
                carry[key] = item.idObj[key];
              });
            }
            return carry;
          }, {});
        });
      });
    }
  }
}

/**
 * Hook is executed before adapters, but after consentManagement. Consent data is requied because
 * this module requires GDPR consent with Purpose #1 to save data locally.
 * The two main actions handled by the hook are:
 * 1. check gdpr consentData and handle submodule initialization.
 * 2. append user id data (loaded from cookied/html or from the getId method) to bids to be accessed in adapters.
 * @param {object} reqBidsConfigObj required; This is the same param that's used in pbjs.requestBids.
 * @param {function} fn required; The next function in the chain, used by hook.js
 */
export function requestBidsHook(fn, reqBidsConfigObj) {
  // initialize submodules only when undefined
  if (typeof initializedSubmodules === 'undefined') {
    initializedSubmodules = initSubmodules(submodules, gdprDataHandler.getConsentData());
    if (initializedSubmodules.length) {
      // list of sumodules that have callbacks that need to be executed
      const submodulesWithCallbacks = initializedSubmodules.filter(item => typeof item.callback === 'function');

      if (submodulesWithCallbacks.length) {
        // wait for auction complete before processing submodule callbacks
        events.on(CONSTANTS.EVENTS.AUCTION_END, function auctionEndHandler() {
          events.off(CONSTANTS.EVENTS.AUCTION_END, auctionEndHandler);

          // when syncDelay is zero, process callbacks now, otherwise dealy process with a setTimeout
          if (syncDelay > 0) {
            setTimeout(function() {
              processSubmoduleCallbacks(submodulesWithCallbacks);
            }, syncDelay);
          } else {
            processSubmoduleCallbacks(submodulesWithCallbacks);
          }
        });
      }
    }
    // pass available user id data to bid adapters
    addIdDataToAdUnitBids(reqBidsConfigObj.adUnits || $$PREBID_GLOBAL$$.adUnits, initializedSubmodules);
  }
  // calling next() allows prebid to continue processing
  return fn.apply(this, [reqBidsConfigObj]);
}

/**
 * @param {Object[]} submodules
 * @param {Object} consentData
 * @returns {string[]} initialized submodules
 */
export function initSubmodules(submodules, consentData) {
  // gdpr consent with purpose one is required, otherwise exit immediately
  if (!hasGDPRConsent(consentData)) {
    utils.logWarn(`${MODULE_NAME} - gdpr permission not valid for local storage, exit module`);
    return [];
  }
  return submodules.reduce((carry, item) => {
    // There are two submodule configuration types to handle: storage or value
    // 1. storage: retrieve user id data from cookie/html storage or with the submodule's getId method
    // 2. value: pass directly to bids
    if (item.config && item.config.storage) {
      const storedId = getStoredValue(item.config.storage);
      if (storedId) {
        // cache decoded value (this is copied to every adUnit bid)
        item.idObj = item.submodule.decode(storedId);
      } else {
        // getId will return user id data or a function that will load the data
        const getIdResult = item.submodule.getId(item.config, consentData);

        // If the getId result has a type of function, it is asynchronous and cannot be called until later
        if (typeof getIdResult === 'function') {
          item.callback = getIdResult;
        } else {
          // A getId result that is not a function is assumed to be valid user id data, which should be saved to users local storage
          setStoredValue(item.config.storage, getIdResult, item.config.storage.expires);

          // cache decoded value (this is copied to every adUnit bid)
          item.idObj = item.submodule.decode(getIdResult);
        }
      }
    } else if (item.config.value) {
      // cache decoded value (this is copied to every adUnit bid)
      item.idObj = item.config.value;
    }

    carry.push(item);
    return carry;
  }, []);
}

/**
 * list of submodule configurations with valid 'storage' or 'value' obj definitions
 * * storage config: contains values for storing/retrieving userid data in browser storage
 * * value config: object properties that are copied to bids (without saving to storage)
 * @param {SubmoduleConfig[]} submoduleConfigs
 * @param {Submodule[]} submodules
 * @returns {SubmoduleConfig[]}
 */
export function getValidSubmoduleConfigs(submoduleConfigs, submodules) {
  if (!Array.isArray(submoduleConfigs)) {
    return [];
  }

  // list of browser enabled storage types
  const validStorageTypes = [];
  if (utils.localStorageIsEnabled()) {
    validStorageTypes.push(LOCAL_STORAGE);
  }
  if (utils.cookiesAreEnabled()) {
    validStorageTypes.push(COOKIE);
  }

  return submoduleConfigs.reduce((carry, submoduleConfig) => {
    // every submodule config obj must contain a valid 'name'
    if (!submoduleConfig || typeof submoduleConfig.name !== 'string' || !submoduleConfig.name) {
      return carry;
    }

    // Validate storage config
    // contains 'type' and 'name' properties with non-empty string values
    // 'type' must be a value currently enabled in the browser
    if (submoduleConfig.storage &&
      typeof submoduleConfig.storage.type === 'string' && submoduleConfig.storage.type &&
      typeof submoduleConfig.storage.name === 'string' && submoduleConfig.storage.name &&
      includes(validStorageTypes, submoduleConfig.storage.type)) {
      carry.push(submoduleConfig);
    } else if (submoduleConfig.value !== null && typeof submoduleConfig.value === 'object') {
      // Validate value config
      // must be valid object with at least one property
      carry.push(submoduleConfig);
    }
    return carry;
  }, []);
}

/**
 * @param config
 * @param {Submodule[]} enabledSubmodules
 */
export function init (config, enabledSubmodules) {
  // exit immediately if opt out cookie exists
  if (utils.cookiesAreEnabled() && !!utils.getCookie('_pubcid_optout')) {
    utils.logInfo(`${MODULE_NAME} - opt-out cookie found, exit module`);
    return;
  }

  // listen for config userSyncs to be set
  config.getConfig('usersync', ({usersync}) => {
    if (usersync && !moduleInitialized) {
      moduleInitialized = true;
      syncDelay = (typeof usersync.syncDelay === 'number') ? usersync.syncDelay : DEFAULT_SYNC_DELAY;

      // filter any invalid configs out
      const submoduleConfigs = getValidSubmoduleConfigs(usersync.userIds, enabledSubmodules);
      if (submoduleConfigs.length === 0) {
        // exit module, if no valid configurations exist
        return;
      }

      // get list of submodules with valid configurations
      submodules = enabledSubmodules.reduce((carry, submodule) => {
        // try to find submodule configuration for submodule, if config exists it should be enabled
        const config = find(submoduleConfigs, submoduleConfig => submoduleConfig.name === submodule.name);
        if (config) {
          // append {SubmoduleContainer} containing the submodule and config
          carry.push({
            submodule,
            config,
            idObj: undefined
          });
        }
        return carry;
      }, []);

      // complete initialization if any submodules exist
      if (submodules.length) {
        // priority has been set so it loads after consentManagement (which has a priority of 50)
        $$PREBID_GLOBAL$$.requestBids.before(requestBidsHook, 40);
      }

      utils.logInfo(`${MODULE_NAME} - usersync config updated`, usersync);
    }
  });
}

init(config, [pubCommonIdSubmodule, unifiedIdSubmodule]);
