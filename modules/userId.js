/**
 * This module adds UserID support to prebid.js
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
const DEFAULT_SYNC_DELAY = 0;

export let syncDelay;
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
            if (typeof item.idObj === 'object' || item.idObj !== null) {
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
 * This function is called when bids are requested, but before the bids are passed to bid adapters.
 * 1. read gdpr consentData and initialize submodules
 * 2. appending available user id data to adUnit bids for use in adapters
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
        // wait for auction complete before processing submodule callbacks
        events.on(CONSTANTS.EVENTS.AUCTION_END, function auctionEndHandler() {
          // remove because this should only be executed once
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
 * @param {SubmoduleConfig[]} submoduleConfigs
 * @param {Submodule[]} submodules
 * @returns {SubmoduleConfig[]}
 */
export function getValidSubmoduleConfigs(submoduleConfigs, submodules) {
  if (!Array.isArray(submoduleConfigs)) {
    return [];
  }

  // all enabled storage types
  const storageTypes = [];
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

    // Next, there are two possible submodule configuration paths: 'storage' or 'value'
    // 1. storage tested first as its preferred over value
    // 2. value is checked if the storage test failed

    // check for valid storage configuration:
    // * storage object must have 'type' and 'name' properties with values that are non-empty strings
    // * also the 'type' value must exist in 'storageTypes'
    if (submoduleConfig.storage && typeof submoduleConfig.storage === 'object' &&
      typeof submoduleConfig.storage.type === 'string' && submoduleConfig.storage.type.length &&
      typeof submoduleConfig.storage.name === 'string' && submoduleConfig.storage.name.length &&
      storageTypes.indexOf(submoduleConfig.storage.type) !== -1) {
      carry.push(submoduleConfig);
    } else if (submoduleConfig.value !== null && typeof submoduleConfig.value === 'object') {
      // value config was found
      // * value object with at least one property
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
      utils.logInfo(`${MODULE_NAME} - usersync config`, usersync);
      if (typeof usersync.syncDelay !== 'undefined') {
        syncDelay = usersync.syncDelay;
      }

      // filter any invalid configs out
      const validatedConfigs = getValidSubmoduleConfigs(usersync.userIds, enabledSubmodules);
      // Exit immediately if no valid configurations exist
      if (validatedConfigs.length === 0) {
        return;
      }

      // bulid list of submodules that have a valid configuration associated
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

      // only complete initialization if at least one submodule exists
      if (submodules.length) {
        // priority has been set so it loads after consentManagement (which has a priority of 50)
        $$PREBID_GLOBAL$$.requestBids.addHook(requestBidHook, 40);
      }
    }
  });
}

init(config, [pubCommonIdSubmodule, unifiedIdSubmodule]);
