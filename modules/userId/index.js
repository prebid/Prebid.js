/**
 * This module adds User ID support to prebid.js
 * @module modules/userId
 */

/**
 * @interface Submodule
 */

/**
 * @function
 * @summary performs action to obtain id and return a value in the callback's response argument
 * @name Submodule#getId
 * @param {SubmoduleParams} configParams
 * @param {ConsentData} consentData
 * @return {(Object|function)} id data or a callback, the callback is called on the auction end event
 */

/**
 * @function
 * @summary decode a stored value for passing to bid requests
 * @name Submodule#decode
 * @param {Object|string} value
 * @return {(Object|undefined)}
 */

/**
 * @property
 * @summary used to link submodule with config
 * @name Submodule#name
 * @type {string}
 */

/**
 * @typedef {Object} SubmoduleConfig
 * @property {string} name - the User ID submodule name (used to link submodule with config)
 * @property {(SubmoduleStorage|undefined)} storage - browser storage config
 * @property {(SubmoduleParams|undefined)} params - params config for use by the submodule.getId function
 * @property {(Object|undefined)} value - if not empty, this value is added to bid requests for access in adapters
 */

/**
 * @typedef {Object} SubmoduleStorage
 * @property {string} type - browser storage type (html5 or cookie)
 * @property {string} name - key name to use when saving/reading to local storage or cookies
 * @property {(number|undefined)} expires - time to live for browser cookie
 */

/**
 * @typedef {Object} SubmoduleParams
 * @property {(string|undefined)} partner - partner url param value
 * @property {(string|undefined)} url - webservice request url used to load Id data
 * @property {(string|undefined)} pid - placement id url param value
 */

/**
 * @typedef {Object} SubmoduleContainer
 * @property {Submodule} submodule
 * @property {SubmoduleConfig} config
 * @property {(Object|undefined)} idObj - cache decoded id value (this is copied to every adUnit bid)
 * @property {(function|undefined)} callback - holds reference to submodule.getId() result if it returned a function. Will be set to undefined after callback executes
 */

/**
 * @typedef {Object} ConsentData
 * @property {(string|undefined)} consentString
 * @property {(Object|undefined)} vendorData
 * @property {(boolean|undefined)} gdprApplies
 */

import find from 'core-js/library/fn/array/find';
import {config} from '../../src/config';
import events from '../../src/events';
import * as utils from '../../src/utils';
import {getGlobal} from '../../src/prebidGlobal';
import {gdprDataHandler} from '../../src/adapterManager';
import CONSTANTS from '../../src/constants.json';
import {module} from '../../src/hook';
import {unifiedIdSubmodule} from './unifiedIdSystem.js';
import {pubCommonIdSubmodule} from './pubCommonIdSystem.js';

const MODULE_NAME = 'User ID';
const COOKIE = 'cookie';
const LOCAL_STORAGE = 'html5';
const DEFAULT_SYNC_DELAY = 500;

/** @type {string[]} */
let validStorageTypes = [];

/** @type {boolean} */
let addedUserIdHook = false;

/** @type {SubmoduleContainer[]} */
let submodules = [];

/** @type {SubmoduleContainer[]} */
let initializedSubmodules;

/** @type {SubmoduleConfig[]} */
let configRegistry = [];

/** @type {Submodule[]} */
let submoduleRegistry = [];

/** @type {(number|undefined)} */
export let syncDelay;

/** @param {Submodule[]} submodules */
export function setSubmoduleRegistry(submodules) {
  submoduleRegistry = submodules;
}

/**
 * @param {SubmoduleStorage} storage
 * @param {string} value
 * @param {(number|string)} expires
 */
function setStoredValue(storage, value, expires) {
  try {
    const valueStr = utils.isPlainObject(value) ? JSON.stringify(value) : value;
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
function getStoredValue(storage) {
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
    // support storing a string or a stringified object
    if (typeof storedValue === 'string' && storedValue.charAt(0) === '{') {
      storedValue = JSON.parse(storedValue);
    }
  } catch (e) {
    utils.logError(e);
  }
  return storedValue;
}

/**
 * test if consent module is present, applies, and is valid for local storage or cookies (purpose 1)
 * @param {ConsentData} consentData
 * @returns {boolean}
 */
function hasGDPRConsent(consentData) {
  if (consentData && typeof consentData.gdprApplies === 'boolean' && consentData.gdprApplies) {
    if (!consentData.consentString) {
      return false;
    }
    if (consentData.vendorData && consentData.vendorData.purposeConsents && consentData.vendorData.purposeConsents['1'] === false) {
      return false;
    }
  }
  return true;
}

/**
 * @param {SubmoduleContainer[]} submodules
 */
function processSubmoduleCallbacks(submodules) {
  submodules.forEach(function(submodule) {
    submodule.callback(function callbackCompleted(idObj) {
      // clear callback, this prop is used to test if all submodule callbacks are complete below
      submodule.callback = undefined;
      // if valid, id data should be saved to cookie/html storage
      if (idObj) {
        if (submodule.config.storage) {
          setStoredValue(submodule.config.storage, idObj, submodule.config.storage.expires);
        }
        // cache decoded value (this is copied to every adUnit bid)
        submodule.idObj = submodule.submodule.decode(idObj);
      } else {
        utils.logError(`${MODULE_NAME}: ${submodule.submodule.name} - request id responded with an empty value`);
      }
    });
  });
}

/**
 * This function will create a combined object for all subModule Ids
 * @param {SubmoduleContainer[]} submodules
 */
function getCombinedSubmoduleIds(submodules) {
  if (!Array.isArray(submodules) || !submodules.length) {
    return {};
  }
  const combinedSubmoduleIds = submodules.filter(i => utils.isPlainObject(i.idObj) && Object.keys(i.idObj).length).reduce((carry, i) => {
    Object.keys(i.idObj).forEach(key => {
      carry[key] = i.idObj[key];
    });
    return carry;
  }, {});

  return combinedSubmoduleIds;
}

/**
 * @param {AdUnit[]} adUnits
 * @param {SubmoduleContainer[]} submodules
 */
function addIdDataToAdUnitBids(adUnits, submodules) {
  if ([adUnits].some(i => !Array.isArray(i) || !i.length)) {
    return;
  }
  const combinedSubmoduleIds = getCombinedSubmoduleIds(submodules);
  if (Object.keys(combinedSubmoduleIds).length) {
    adUnits.forEach(adUnit => {
      adUnit.bids.forEach(bid => {
        // create a User ID object on the bid,
        bid.userId = combinedSubmoduleIds;
      });
    });
  }
}

/**
 * This is a common function that will initalize subModules if not already done and it will also execute subModule callbacks
 */
function initializeSubmodulesAndExecuteCallbacks() {
  // initialize submodules only when undefined
  if (typeof initializedSubmodules === 'undefined') {
    initializedSubmodules = initSubmodules(submodules, gdprDataHandler.getConsentData());
    if (initializedSubmodules.length) {
      // list of sumodules that have callbacks that need to be executed
      const submodulesWithCallbacks = initializedSubmodules.filter(item => utils.isFn(item.callback));

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
  }
}

/**
 * Hook is executed before adapters, but after consentManagement. Consent data is requied because
 * this module requires GDPR consent with Purpose #1 to save data locally.
 * The two main actions handled by the hook are:
 * 1. check gdpr consentData and handle submodule initialization.
 * 2. append user id data (loaded from cookied/html or from the getId method) to bids to be accessed in adapters.
 * @param {Object} reqBidsConfigObj required; This is the same param that's used in pbjs.requestBids.
 * @param {function} fn required; The next function in the chain, used by hook.js
 */
export function requestBidsHook(fn, reqBidsConfigObj) {
  // initialize submodules only when undefined
  initializeSubmodulesAndExecuteCallbacks();
  // pass available user id data to bid adapters
  addIdDataToAdUnitBids(reqBidsConfigObj.adUnits || getGlobal().adUnits, initializedSubmodules);
  // calling fn allows prebid to continue processing
  return fn.call(this, reqBidsConfigObj);
}

/**
 * This function will be exposed in global-name-space so that userIds stored by Prebid UserId module can be used by external codes as well.
 * Simple use case will be passing these UserIds to A9 wrapper solution
 */
function getUserIds() {
  // initialize submodules only when undefined
  initializeSubmodulesAndExecuteCallbacks();
  return getCombinedSubmoduleIds(initializedSubmodules);
};

/**
 * @param {SubmoduleContainer[]} submodules
 * @param {ConsentData} consentData
 * @returns {SubmoduleContainer[]} initialized submodules
 */
function initSubmodules(submodules, consentData) {
  // gdpr consent with purpose one is required, otherwise exit immediately
  if (!hasGDPRConsent(consentData)) {
    utils.logWarn(`${MODULE_NAME} - gdpr permission not valid for local storage or cookies, exit module`);
    return [];
  }
  return submodules.reduce((carry, submodule) => {
    // There are two submodule configuration types to handle: storage or value
    // 1. storage: retrieve user id data from cookie/html storage or with the submodule's getId method
    // 2. value: pass directly to bids
    if (submodule.config.storage) {
      const storedId = getStoredValue(submodule.config.storage);
      if (storedId) {
        // cache decoded value (this is copied to every adUnit bid)
        submodule.idObj = submodule.submodule.decode(storedId);
      } else {
        // getId will return user id data or a function that will load the data
        const getIdResult = submodule.submodule.getId(submodule.config.params, consentData);

        // If the getId result has a type of function, it is asynchronous and cannot be called until later
        if (typeof getIdResult === 'function') {
          submodule.callback = getIdResult;
        } else {
          // A getId result that is not a function is assumed to be valid user id data, which should be saved to users local storage or cookies
          setStoredValue(submodule.config.storage, getIdResult, submodule.config.storage.expires);
          // cache decoded value (this is copied to every adUnit bid)
          submodule.idObj = submodule.submodule.decode(getIdResult);
        }
      }
    } else if (submodule.config.value) {
      // cache decoded value (this is copied to every adUnit bid)
      submodule.idObj = submodule.config.value;
    } else {
      const result = submodule.submodule.getId(submodule.config.params, consentData);
      if (typeof result === 'function') {
        submodule.callback = result;
      } else {
        submodule.idObj = submodule.submodule.decode();
      }
    }
    carry.push(submodule);
    return carry;
  }, []);
}

/**
 * list of submodule configurations with valid 'storage' or 'value' obj definitions
 * * storage config: contains values for storing/retrieving User ID data in browser storage
 * * value config: object properties that are copied to bids (without saving to storage)
 * @param {SubmoduleConfig[]} configRegistry
 * @param {Submodule[]} submoduleRegistry
 * @param {string[]} activeStorageTypes
 * @returns {SubmoduleConfig[]}
 */
function getValidSubmoduleConfigs(configRegistry, submoduleRegistry, activeStorageTypes) {
  if (!Array.isArray(configRegistry)) {
    return [];
  }
  return configRegistry.reduce((carry, config) => {
    // every submodule config obj must contain a valid 'name'
    if (!config || utils.isEmptyStr(config.name)) {
      return carry;
    }
    // Validate storage config contains 'type' and 'name' properties with non-empty string values
    // 'type' must be a value currently enabled in the browser
    if (config.storage &&
      !utils.isEmptyStr(config.storage.type) &&
      !utils.isEmptyStr(config.storage.name) &&
      activeStorageTypes.indexOf(config.storage.type) !== -1) {
      carry.push(config);
    } else if (utils.isPlainObject(config.value)) {
      carry.push(config);
    } else if (!config.storage && !config.value) {
      carry.push(config);
    }
    return carry;
  }, []);
}

/**
 * update submodules by validating against existing configs and storage types
 */
function updateSubmodules() {
  const configs = getValidSubmoduleConfigs(configRegistry, submoduleRegistry, validStorageTypes);
  if (!configs.length) {
    return;
  }
  // do this to avoid reprocessing submodules
  const addedSubmodules = submoduleRegistry.filter(i => !find(submodules, j => j.name === i.name));

  // find submodule and the matching configuration, if found create and append a SubmoduleContainer
  submodules = addedSubmodules.map(i => {
    const submoduleConfig = find(configs, j => j.name === i.name);
    return submoduleConfig ? {
      submodule: i,
      config: submoduleConfig,
      callback: undefined,
      idObj: undefined
    } : null;
  }).filter(submodule => submodule !== null);

  if (!addedUserIdHook && submodules.length) {
    // priority value 40 will load after consentManagement with a priority of 50
    getGlobal().requestBids.before(requestBidsHook, 40);
    utils.logInfo(`${MODULE_NAME} - usersync config updated for ${submodules.length} submodules`);
    addedUserIdHook = true;
  }
}

/**
 * enable submodule in User ID
 * @param {Submodule} submodule
 */
export function attachIdSystem(submodule) {
  if (!find(submoduleRegistry, i => i.name === submodule.name)) {
    submoduleRegistry.push(submodule);
    updateSubmodules();
  }
}

/**
 * test browser support for storage config types (local storage or cookie), initializes submodules but consentManagement is required,
 * so a callback is added to fire after the consentManagement module.
 * @param {{getConfig:function}} config
 */
export function init(config) {
  submodules = [];
  configRegistry = [];
  addedUserIdHook = false;
  initializedSubmodules = undefined;

  // list of browser enabled storage types
  validStorageTypes = [
    utils.localStorageIsEnabled() ? LOCAL_STORAGE : null,
    utils.cookiesAreEnabled() ? COOKIE : null
  ].filter(i => i !== null);

  // exit immediately if opt out cookie or local storage keys exists.
  if (validStorageTypes.indexOf(COOKIE) !== -1 && utils.getCookie('_pbjs_id_optout')) {
    utils.logInfo(`${MODULE_NAME} - opt-out cookie found, exit module`);
    return;
  }
  // _pubcid_optout is checked for compatiblility with pubCommonId
  if (validStorageTypes.indexOf(LOCAL_STORAGE) !== -1 && (localStorage.getItem('_pbjs_id_optout') || localStorage.getItem('_pubcid_optout'))) {
    utils.logInfo(`${MODULE_NAME} - opt-out localStorage found, exit module`);
    return;
  }
  // listen for config userSyncs to be set
  config.getConfig(conf => {
    // Note: support for both 'userSync' and 'usersync' will be deprecated with Prebid.js 3.0
    const userSync = conf.userSync || conf.usersync;
    if (userSync && userSync.userIds) {
      configRegistry = userSync.userIds;
      syncDelay = utils.isNumber(userSync.syncDelay) ? userSync.syncDelay : DEFAULT_SYNC_DELAY;
      updateSubmodules();
    }
  });

  // exposing getUserIds function in global-name-space so that userIds stored in Prebid can be used by external codes.
  (getGlobal()).getUserIds = getUserIds;
}

// init config update listener to start the application
init(config);

// add submodules after init has been called
attachIdSystem(pubCommonIdSubmodule);
attachIdSystem(unifiedIdSubmodule);

module('userId', attachIdSystem);
