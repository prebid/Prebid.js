/**
 * This module adds User ID support to prebid.js
 * @module modules/userId
 */

/**
 * @interface Submodule
 */

/**
 * @function
 * @summary performs action to obtain id and return a value in the callback's response argument.
 *  If IdResponse#id is defined, then it will be written to the current active storage.
 *  If IdResponse#callback is defined, then it'll called at the end of auction.
 *  It's permissible to return neither, one, or both fields.
 * @name Submodule#getId
 * @param {SubmoduleParams} configParams
 * @param {ConsentData|undefined} consentData
 * @param {(Object|undefined)} cacheIdObj
 * @return {(IdResponse|undefined)} A response object that contains id and/or callback.
 */

/**
 * @function
 * @summary Similar to Submodule#getId, this optional method returns response to for id that exists already.
 *  If IdResponse#id is defined, then it will be written to the current active storage even if it exists already.
 *  If IdResponse#callback is defined, then it'll called at the end of auction.
 *  It's permissible to return neither, one, or both fields.
 * @name Submodule#extendId
 * @param {SubmoduleParams} configParams
 * @param {Object} storedId - existing id, if any
 * @return {(IdResponse|function(callback:function))} A response object that contains id and/or callback.
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
 * @property {number} expires - time to live for browser storage in days
 * @property {(number|undefined)} refreshInSeconds - if not empty, this value defines the maximum time span in seconds before refreshing user ID stored in browser
 */

/**
 * @typedef {Object} SubmoduleParams
 * @property {(string|undefined)} partner - partner url param value
 * @property {(string|undefined)} url - webservice request url used to load Id data
 * @property {(string|undefined)} pixelUrl - publisher pixel to extend/modify cookies
 * @property {(boolean|undefined)} create - create id if missing.  default is true.
 * @property {(boolean|undefined)} extend - extend expiration time on each access.  default is false.
 * @property {(string|undefined)} pid - placement id url param value
 * @property {(string|undefined)} publisherId - the unique identifier of the publisher in question
 * @property {(array|undefined)} identifiersToResolve - the identifiers from either ls|cookie to be attached to the getId query
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

/**
 * @typedef {Object} IdResponse
 * @property {(Object|undefined)} id - id data
 * @property {(function|undefined)} callback - function that will return an id
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
const NO_AUCTION_DELAY = 0;

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

/** @type {(number|undefined)} */
export let auctionDelay;

/** @param {Submodule[]} submodules */
export function setSubmoduleRegistry(submodules) {
  submoduleRegistry = submodules;
}

/**
 * @param {SubmoduleStorage} storage
 * @param {(Object|string)} value
 */
function setStoredValue(storage, value) {
  try {
    const valueStr = utils.isPlainObject(value) ? JSON.stringify(value) : value;
    const expiresStr = (new Date(Date.now() + (storage.expires * (60 * 60 * 24 * 1000)))).toUTCString();
    if (storage.type === COOKIE) {
      utils.setCookie(storage.name, valueStr, expiresStr, 'Lax');
      if (typeof storage.refreshInSeconds === 'number') {
        utils.setCookie(`${storage.name}_last`, new Date().toUTCString(), expiresStr);
      }
    } else if (storage.type === LOCAL_STORAGE) {
      localStorage.setItem(`${storage.name}_exp`, expiresStr);
      localStorage.setItem(storage.name, encodeURIComponent(valueStr));
      if (typeof storage.refreshInSeconds === 'number') {
        localStorage.setItem(`${storage.name}_last`, new Date().toUTCString());
      }
    }
  } catch (error) {
    utils.logError(error);
  }
}

/**
 * @param {SubmoduleStorage} storage
 * @param {String|undefined} key optional key of the value
 * @returns {string}
 */
function getStoredValue(storage, key = undefined) {
  const storedKey = key ? `${storage.name}_${key}` : storage.name;
  let storedValue;
  try {
    if (storage.type === COOKIE) {
      storedValue = utils.getCookie(storedKey);
    } else if (storage.type === LOCAL_STORAGE) {
      const storedValueExp = localStorage.getItem(`${storage.name}_exp`);
      // empty string means no expiration set
      if (storedValueExp === '') {
        storedValue = localStorage.getItem(storedKey);
      } else if (storedValueExp) {
        if ((new Date(storedValueExp)).getTime() - Date.now() > 0) {
          storedValue = decodeURIComponent(localStorage.getItem(storedKey));
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
 * @param {function} cb - callback for after processing is done.
 */
function processSubmoduleCallbacks(submodules, cb) {
  const done = cb ? utils.delayExecution(cb, submodules.length) : function() { };
  submodules.forEach(function(submodule) {
    submodule.callback(function callbackCompleted(idObj) {
      // if valid, id data should be saved to cookie/html storage
      if (idObj) {
        if (submodule.config.storage) {
          setStoredValue(submodule.config.storage, idObj);
        }
        // cache decoded value (this is copied to every adUnit bid)
        submodule.idObj = submodule.submodule.decode(idObj);
      } else {
        utils.logError(`${MODULE_NAME}: ${submodule.submodule.name} - request id responded with an empty value`);
      }
      done();
    });

    // clear callback, this prop is used to test if all submodule callbacks are complete below
    submodule.callback = undefined;
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
function initializeSubmodulesAndExecuteCallbacks(continueAuction) {
  let delayed = false;

  // initialize submodules only when undefined
  if (typeof initializedSubmodules === 'undefined') {
    initializedSubmodules = initSubmodules(submodules, gdprDataHandler.getConsentData());
    if (initializedSubmodules.length) {
      // list of submodules that have callbacks that need to be executed
      const submodulesWithCallbacks = initializedSubmodules.filter(item => utils.isFn(item.callback));

      if (submodulesWithCallbacks.length) {
        if (continueAuction && auctionDelay > 0) {
          // delay auction until ids are available
          delayed = true;
          let continued = false;
          const continueCallback = function() {
            if (!continued) {
              continued = true;
              continueAuction();
            }
          }
          utils.logInfo(`${MODULE_NAME} - auction delayed by ${auctionDelay} at most to fetch ids`);
          processSubmoduleCallbacks(submodulesWithCallbacks, continueCallback);

          setTimeout(continueCallback, auctionDelay);
        } else {
          // wait for auction complete before processing submodule callbacks
          events.on(CONSTANTS.EVENTS.AUCTION_END, function auctionEndHandler() {
            events.off(CONSTANTS.EVENTS.AUCTION_END, auctionEndHandler);

            // when syncDelay is zero, process callbacks now, otherwise delay process with a setTimeout
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

  if (continueAuction && !delayed) {
    continueAuction();
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
  initializeSubmodulesAndExecuteCallbacks(function() {
    // pass available user id data to bid adapters
    addIdDataToAdUnitBids(reqBidsConfigObj.adUnits || getGlobal().adUnits, initializedSubmodules);
    // calling fn allows prebid to continue processing
    fn.call(this, reqBidsConfigObj);
  });
}

/**
 * This function will be exposed in global-name-space so that userIds stored by Prebid UserId module can be used by external codes as well.
 * Simple use case will be passing these UserIds to A9 wrapper solution
 */
function getUserIds() {
  // initialize submodules only when undefined
  initializeSubmodulesAndExecuteCallbacks();
  return getCombinedSubmoduleIds(initializedSubmodules);
}

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
      let storedId = getStoredValue(submodule.config.storage);
      let response;

      let refreshNeeded = false;
      if (typeof submodule.config.storage.refreshInSeconds === 'number') {
        const storedDate = new Date(getStoredValue(submodule.config.storage, 'last'));
        refreshNeeded = storedDate && (Date.now() - storedDate.getTime() > submodule.config.storage.refreshInSeconds * 1000);
      }

      if (!storedId || refreshNeeded) {
        // No previously saved id.  Request one from submodule.
        response = submodule.submodule.getId(submodule.config.params, consentData, storedId);
      } else if (typeof submodule.submodule.extendId === 'function') {
        // If the id exists already, give submodule a chance to decide additional actions that need to be taken
        response = submodule.submodule.extendId(submodule.config.params, storedId);
      }

      if (utils.isPlainObject(response)) {
        if (response.id) {
          // A getId/extendId result assumed to be valid user id data, which should be saved to users local storage or cookies
          setStoredValue(submodule.config.storage, response.id);
          storedId = response.id;
        }

        if (typeof response.callback === 'function') {
          // Save async callback to be invoked after auction
          submodule.callback = response.callback;
        }
      }

      if (storedId) {
        // cache decoded value (this is copied to every adUnit bid)
        submodule.idObj = submodule.submodule.decode(storedId);
      }
    } else if (submodule.config.value) {
      // cache decoded value (this is copied to every adUnit bid)
      submodule.idObj = submodule.config.value;
    } else {
      const response = submodule.submodule.getId(submodule.config.params, consentData, undefined);
      if (utils.isPlainObject(response)) {
        if (typeof response.callback === 'function') { submodule.callback = response.callback; }
        if (response.id) { submodule.idObj = submodule.submodule.decode(response.id); }
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
  if (validStorageTypes.indexOf(COOKIE) !== -1 && (utils.getCookie('_pbjs_id_optout') || utils.getCookie('_pubcid_optout'))) {
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
      auctionDelay = utils.isNumber(userSync.auctionDelay) ? userSync.auctionDelay : NO_AUCTION_DELAY;
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
