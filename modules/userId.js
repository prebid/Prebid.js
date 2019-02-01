/**
 * This module adds User ID support to prebid.js
 */
import { ajax } from '../src/ajax.js';
import { config } from '../src/config.js';
import events from '../src/events.js';
import * as utils from '../src/utils.js';
import find from 'core-js/library/fn/array/find';
import { gdprDataHandler } from '../src/adapterManager.js';

const CONSTANTS = require('../src/constants.json');

/**
 * @typedef {Object} SubmoduleConfig
 * @property {string} name - the userId submodule name
 * @property {SubmoduleStorage} storage - browser storage config
 * @property {SubmoduleParams} params - params config for use by the submodule.getId function
 * @property {Object} value - all object properties will be appended to the userId bid data
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

const MODULE_NAME = 'UserId';
const COOKIE = 'cookie';
const LOCAL_STORAGE = 'html5';
const OPT_OUT_COOKIE = '_pbjs_id_optout';
const DEFAULT_SYNC_DELAY = 500;

export let syncDelay = DEFAULT_SYNC_DELAY;
export let submodules;
export let initializedSubmodules;

/**
 * @type {Submodule}
 */
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
        // {"TDID":"c1ec56ba-ec54-4815-89ea-673cd615fa94","TDID_LOOKUP":"FALSE","TDID_CREATED_AT":"2019-02-01T21:16:33"}
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

/**
 * @type {Submodule}
 */
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
export function hasGDPRConsent (consentData) {
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
 * @param {function} [processSubmoduleCallbacksComplete] - not required, called when all queued callbacks have completed
 */
export function processSubmoduleCallbacks (submodules, processSubmoduleCallbacksComplete) {
  utils.logInfo(`${MODULE_NAME} - process submodule callback que`, submodules);

  submodules.forEach(function(submodule) {
    submodule.callback(function callbackCompleted (idObj) {
      // clear callbac (since has completed)
      submodule.callback = undefined;
      // if idObj is valid:
      //   1. set in local storage
      //   2. set id data to submoduleContainer.idObj (id data will be added to bids in the queCompleteCallback function)
      if (idObj) {
        setStoredValue(submodule.config.storage, idObj, submodule.config.storage.expires);
        submodule.idObj = submodule.submodule.decode(idObj);
      } else {
        utils.logError(`${MODULE_NAME}: ${submodule.submodule.name} - request id responded with an empty value`);
      }

      // check if all callbacks have completed, then execute the queFinished to notify completion
      if (submodules.every(item => typeof item.callback === 'undefined')) {
        utils.logInfo(`${MODULE_NAME}: process submodule callback que completed`);
        if (typeof processSubmoduleCallbacksComplete === 'function') {
          processSubmoduleCallbacksComplete();
        }
      }
    })
  });
}

/**
 * @param {Object[]} adUnits
 * @param {Object[]} submodules
 */
export function addIdDataToAdUnitBids (adUnits, submodules) {
  if (submodules.length) {
    if (adUnits) {
      adUnits.forEach(adUnit => {
        adUnit.bids.forEach(bid => {
          // append the userId property to bid
          bid.userId = submodules.reduce((carry, item) => {
            if (typeof item.idObj !== 'object' || item.idObj === null) {
              return carry;
            }
            Object.keys(item.idObj).forEach(key => {
              carry[key] = item.idObj[key];
            });
            return carry;
          }, {});
        });
      });
    }
  }
}

/**
 * This function is called when bids are requested, but before the bids are passed to bid adapters.
 * 1.) retrieving gdpr consentData and then passing it to submodule.getId functions if necessary
 * 2.) adding User id data to bid request objects for use in bid adapters
 * Note: the priority value of the hook function must be less than the value set for the consentManagement module, or consentData will not available
 *   consentData is REQUIRED if submodule.getId needs to be called
 *   responsible for handling:
 * @param {{}} config
 * @param next
 * @returns {*}
 */
export function requestBidHook(config, next) {
  // initialize submodules only when undefined
  if (typeof initializedSubmodules === 'undefined') {
    initializedSubmodules = initSubmodules(submodules, gdprDataHandler.getConsentData());
    if (initializedSubmodules.length) {
      // list of sumodules that have callbacks that need to be executed
      const submodulesWithCallbacks = initializedSubmodules.filter(item => typeof item.callback === 'function');
      if (submodulesWithCallbacks.length) {
        // need to wait for auction complete handler to process the submodules with callbacks
        const auctionEndHandler = function() {
          // this handler should only be listened to once
          events.off(CONSTANTS.EVENTS.AUCTION_END, auctionEndHandler);

          // if syncDelay is zero, process callbacks now, otherwise dealy process with a setTimeout
          if (syncDelay === 0) {
            processSubmoduleCallbacks(submodulesWithCallbacks);
          } else {
            utils.logInfo(`${MODULE_NAME}: wait ${syncDelay} after auction ends to perform sync `);
            setTimeout(function() {
              processSubmoduleCallbacks(submodulesWithCallbacks);
            }, syncDelay);
          }
        }
        // listen for auction complete since sync delay is set
        events.on(CONSTANTS.EVENTS.AUCTION_END, auctionEndHandler);
      }
    }
    // no async submodule callbacks are queued, so any userId data should be passed to bid adapters now
    addIdDataToAdUnitBids(config.adUnits || $$PREBID_GLOBAL$$.adUnits, initializedSubmodules);
  }

  // calling next() allows prebid to continue processing
  return next.apply(this, arguments);
}

/**
 * @param {Object[]} submodules
 * @param {Object} consentData
 * @returns {string[]} initialized submodules
 */
export function initSubmodules (submodules, consentData) {
  // if no gdpr consent, exit immediately
  if (!hasGDPRConsent(consentData)) {
    utils.logWarn(`${MODULE_NAME} - gdpr permission not valid for local storage, exit module`);
    return [];
  }
  return submodules.reduce((carry, item) => {
    // STORAGE configuration, storage must be loaded from cookies/localStorage and decoded before adding to bid requests
    if (item.config && item.config.storage) {
      const storedId = getStoredValue(item.config.storage);
      if (storedId) {
        // use stored value
        item.idObj = item.submodule.decode(storedId);
      } else {
        // call getId
        const getIdResult = item.submodule.getId(item.config, consentData);
        if (typeof getIdResult === 'function') {
          // add endpoint function to command que if getId returns a function
          item.callback = getIdResult;
        } else {
          // getId return non-functin, so ran synchronously, and is a valid id object
          item.idObj = item.submodule.decode(getIdResult);
          setStoredValue(item.config.storage, getIdResult, item.config.storage.expires);
        }
      }
    } else if (item.config.value) {
      item.idObj = item.config.value;
    }
    // configured (storage-found / storage-not-found-que-callback / value-found) submoduleContainer
    carry.push(item);
    return carry;
  }, []);
}

/**
 * @param {SubmoduleConfig[]} submoduleConfigs
 * @param {Submodule[]} submodules
 * @returns {SubmoduleConfig[]}
 */
export function getValidSubmoduleConfigs(submoduleConfigs, submodules) {
  if (!Array.isArray(submoduleConfigs)) {
    return [];
  }
  // get all enabled storage types to validate submoduleConfig.storage.type
  const storageTypes = [];
  // if (browserSupportsLocalStorage()) {
  if (utils.localStorageIsEnabled()) {
    storageTypes.push(LOCAL_STORAGE);
  }
  if (utils.cookiesAreEnabled()) {
    storageTypes.push(COOKIE);
  }
  return submoduleConfigs.reduce((carry, submoduleConfig) => {
    // config must be an object with a name with at least one character
    if (!submoduleConfig || typeof submoduleConfig !== 'object' || typeof submoduleConfig.name !== 'string' || submoduleConfig.name.length === 0) {
      return carry;
    }
    // 1. valid if 'storage' object has 'type' and 'name' props with at least 1 character, and 'type' must be either 'cookie' or 'html5'
    // 2. valid if 'value' object not empty
    if (submoduleConfig.storage && typeof submoduleConfig.storage === 'object' &&
      typeof submoduleConfig.storage.type === 'string' && submoduleConfig.storage.type.length &&
      typeof submoduleConfig.storage.name === 'string' && submoduleConfig.storage.name.length &&
      storageTypes.indexOf(submoduleConfig.storage.type) !== -1) {
      carry.push(submoduleConfig);
    } else if (submoduleConfig.value !== null && typeof submoduleConfig.value === 'object') {
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
  syncDelay = DEFAULT_SYNC_DELAY;
  submodules = [];
  initializedSubmodules = undefined;

  if (utils.cookiesAreEnabled()) {
    if (document.cookie.indexOf(OPT_OUT_COOKIE) !== -1) {
      utils.logInfo(`${MODULE_NAME} - opt-out cookie found, exit module`);
      return;
    }
  }
  // listen for config userSyncs to be set
  config.getConfig('usersync', ({usersync}) => {
    if (usersync) {
      utils.logInfo(`${MODULE_NAME} - usersync config updated`);
      if (typeof usersync.syncDelay !== 'undefined') {
        syncDelay = usersync.syncDelay;
      }

      // filter any invalid configs out
      const validatedConfigs = getValidSubmoduleConfigs(usersync.userIds, enabledSubmodules);
      // Exit immediately if valid configurations are not found
      if (validatedConfigs.length === 0) {
        return;
      }

      // get list of submodules that have configurations
      submodules = enabledSubmodules.reduce((carry, submodule) => {
        // try to get a configuration that matches the submodule
        const config = find(validatedConfigs, submoduleConfig => submoduleConfig.name === submodule.name);
        if (config) {
          // add submodule container object for submodule, config, extra data for holding state
          carry.push({
            submodule,
            config
          });
        }
        return carry;
      }, [])

      if (submodules.length) {
        // priority set to load after consentManagement (50) but before default priority 10
        $$PREBID_GLOBAL$$.requestBids.addHook(requestBidHook, 40);
      }
    }
  });
}

init(config, [pubCommonIdSubmodule, unifiedIdSubmodule]);
