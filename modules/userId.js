/**
 * This module adds Universal ID support to prebid.js
 */
import { ajax } from '../src/ajax.js';
import { config } from '../src/config.js';
import events from '../src/events.js';
import * as utils from '../src/utils.js';
import find from 'core-js/library/fn/array/find';
import { gdprDataHandler } from '../src/adapterManager.js';

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
 * @typedef {Object} ValueConfig
 */

/**
 * @typedef {Object} IdSubmoduleConfig
 * @property {string} name - the universalId submodule name
 * @property {StorageConfig} storage - browser storage config
 * @property {ParamsConfig} params - params config for use by the submodule.getId function
 * @property {ValueConfig} value - id data added directly to bids
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
 * @callback getId
 * @param {Object} submoduleConfig
 * @param {Object} consentData
 * @param {number} syncDelay
 */

/**
 * @callback decode
 * @param {Object|string|number} idData
 * @returns {Object}
 */

/**
 * @typedef {Object} IdSubmodule
 * @property {string} name - submodule and config have matching name prop
 * @property {decode} decode - decode a stored value for passing to bid requests.
 * @property {getId} getId - performs action to obtain id and return a value in the callback's response argument.
 */

const MODULE_NAME = 'UserId';
const COOKIE = 'cookie';
const LOCAL_STORAGE = 'html5';
const OPT_OUT_COOKIE = '_pbjs_id_optout';

export let syncDelay;
export let submodules;
export let submoduleConfigs;
export let initializedSubmodules;
export let extendBidData;

/**
 * @type {IdSubmodule}
 */
export const unifiedIdSubmodule = {
  name: 'unifiedId',
  decode(value) { return { 'tdid': value } },
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
 * @type {IdSubmodule}
 */
export const pubCommonIdSubmodule = {
  name: 'pubCommonId',
  decode(value) { return { 'pubcid': value } },
  getId() { return utils.generateUUID() }
};

/**
 * @returns {boolean}
 */
export function browserSupportsLocalStorage () {
  try {
    if (typeof localStorage !== 'object') {
      return false;
    }
    localStorage.setItem('prebid.cookieTest', '1');
    return localStorage.getItem('prebid.cookieTest') === '1';
  } catch (error) {
    return false;
  }
}

/**
 * @param {string} key
 * @returns {string | null}
 */
export function getCookie(key) {
  return decodeURIComponent(document.cookie.replace(new RegExp('(?:(?:^|.*;)\\s*' + encodeURIComponent(key).replace(/[\\\-\.\+\*]/g, '\\$&') + '\\s*\\=\\s*([^;]*).*$)|^.*$'), '$1')) || null;
}

/**
 * @param {string} key
 * @param {string} value
 * @param {string|number} expires
 */
export function setCookie (key, value, expires) {
  let sExpires = '';
  if (expires) {
    switch (expires.constructor) {
      case Number:
        sExpires = expires === Infinity ? '; expires=Fri, 31 Dec 9999 23:59:59 GMT' : `; expires=${(new Date((expires * 60 * 24 * 1000) + Date.now())).toUTCString()}`;
        break;
      case String:
        sExpires = `; expires=${expires}`;
        break;
    }
  }
  document.cookie = `${key}=${encodeURIComponent(value)}${sExpires}; path=/`;
}

/**
 * @param {StorageConfig} storage
 * @param {string} value
 * @param {number|string} expires
 */
export function setStoredValue(storage, value, expires) {
  try {
    if (storage.type === COOKIE) {
      setCookie(storage.name, value, expires);
    } else if (storage.type === LOCAL_STORAGE) {
      localStorage.setItem(storage.name, value);
    }
    utils.logInfo(`${MODULE_NAME} - setStoredValue() ${storage.name}=${value} using ${storage.type}`);
  } catch (error) {
    utils.logError(`${MODULE_NAME} - setStoredValue() failed ${error}`);
  }
}

/**
 * @param {StorageConfig} storage
 * @returns {string}
 */
export function getStoredValue(storage) {
  let storedValue;
  if (storage.type === COOKIE) {
    storedValue = getCookie(storage.name);
  } else if (storage.type === LOCAL_STORAGE) {
    storedValue = localStorage.getItem(storage.name);
  }
  utils.logInfo(`${MODULE_NAME} - get stored value ${storage.name} from ${storage.type}`);
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
 * @param {Object[]} submoduleContainers
 * @param {function} queCompleteCallback - called when all queued callbacks have completed
 */
export function processAsyncSubmoduleQue (submoduleContainers, queCompleteCallback) {
  utils.logInfo(`${MODULE_NAME} - process submodule callback que (${submoduleContainers.length})`);

  submoduleContainers.forEach(function(submoduleContainer) {
    submoduleContainer.callback(function callbackCompleted (idObj) {
      // clear callbac (since has completed)
      submoduleContainer.callback = undefined;
      // if idObj is valid:
      //   1. set in local storage
      //   2. set id data to submoduleContainer.idObj (id data will be added to bids in the queCompleteCallback function)
      if (idObj) {
        setStoredValue(submoduleContainer.config.storage, idObj, submoduleContainer.config.storage.expires);
        submoduleContainer.idObj = submoduleContainer.submodule.decode(idObj);
      } else {
        utils.logError(`${MODULE_NAME}: ${submoduleContainer.submodule.name} - request id responded with an empty value`);
      }
      // check if all callbacks have completed, then:
      //   1. call queCompletedCallback with 'submoduleContainers' (each item's idObj prop should contain id data if it was successful)
      if (submoduleContainers.every(item => typeof item.callback === 'undefined')) {
        // Note: only submodules with valid idObj values are passed
        const submoduleContainersWithIds = submoduleContainers.filter(item => typeof item.idObj !== 'undefined');
        utils.logInfo(`${MODULE_NAME}: process submodule callback que completed and returned id data (${submoduleContainersWithIds.length})`);
        queCompleteCallback(submoduleContainersWithIds);
      }
    })
  });
}

/**
 * @param {Object[]} adUnits
 * @param {Object[]} extendBidData
 */
export function addIdDataToAdUnitBids (adUnits, extendBidData) {
  if (extendBidData.length) {
    if (adUnits) {
      adUnits.forEach(adUnit => {
        adUnit.bids.forEach(bid => {
          // append the universalID property to bid
          bid.universalID = extendBidData.reduce((carry, item) => {
            Object.keys(item).forEach(key => { carry[key] = item[key]; });
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
  // initialize submodules
  if (typeof initializedSubmodules === 'undefined' && submodules && submoduleConfigs) {
    initializedSubmodules = initSubmodules(submodules, submoduleConfigs, gdprDataHandler.getConsentData());

    if (initializedSubmodules.length) {
      const synchronousSubmodules = initializedSubmodules.filter(item => typeof item.idObj !== 'undefined');
      // append id data to be added to bids
      synchronousSubmodules.forEach(item => { extendBidData.push(item.idObj) });

      const asynchronousSubmodules = initializedSubmodules.filter(item => typeof item.callback === 'function');
      if (asynchronousSubmodules.length) {
        // async submodule callbacks have all be completed, so any universalId data should be passed to bid adapters now
        const auctionEndHandler = function (event) {
          events.off(CONSTANTS.EVENTS.AUCTION_END, auctionEndHandler);

          // no syncDelay; delay auction until callback que is complete
          if (syncDelay > 0) {
            return processAsyncSubmoduleQue(asynchronousSubmodules, function (submodulesWithIds) {
              // append id data to be added to bids
              submodulesWithIds.forEach(item => { extendBidData.push(item.idObj); });

              // EXIT: done processing, append id data to bids and continue with auction
              addIdDataToAdUnitBids(config.adUnits || $$PREBID_GLOBAL$$.adUnits, extendBidData);
              return next.apply(this, arguments);
            });
          } else {
            // syncDelay exits wait until auction completes before processing callback que
            utils.logInfo(`${MODULE_NAME}: wait ${syncDelay} after auction ends to perform sync `);
            setTimeout(function (){
              processAsyncSubmoduleQue(asynchronousSubmodules, function (submodulesWithIdData) {
                // append id data to be added to bids
                submodulesWithIdData.forEach(item => { extendBidData.push(item.idObj); });
              });
            }, syncDelay);
          }
        }
        // listen for auction complete since sync delay is set
        events.on(CONSTANTS.EVENTS.AUCTION_END, auctionEndHandler);
      }
    }

    // no async submodule callbacks are queued, so any universalId data should be passed to bid adapters now
    addIdDataToAdUnitBids(config.adUnits || $$PREBID_GLOBAL$$.adUnits, extendBidData);
  }

  // calling next() allows prebid to continue processing
  return next.apply(this, arguments);
}

/**
 * @param {IdSubmodule[]} submodules
 * @param {IdSubmoduleConfig[]} submoduleConfigs
 * @param {Object} consentData
 * @returns {string[]} initialized submodules
 */
export function initSubmodules (submodules, submoduleConfigs, consentData) {
  // if no gdpr consent, exit immediately
  if (!hasGDPRConsent(consentData)) {
    utils.logWarn(`${MODULE_NAME} - gdpr permission not valid for local storage, exit module`);
    return [];
  }

  return submodules.reduce((carry, submodule) => {
    const submoduleConfig = find(submoduleConfigs, submoduleConfig => submoduleConfig.name === submodule.name);
    /**
     * when callback is defined and idObj is undefined, callback needs to be called to obtain the id object,
     * on callback complete set idObj with the value from callback's responseIdObj arg
     * the callback request has completed if idObject has been set when callback is defined (eliminates using extra flag variable)
     */
    const submoduleContainer = {
      submodule,
      config
    };

    // STORAGE configuration, storage must be loaded from cookies/localStorage and decoded before adding to bid requests
    if (submoduleConfig && submoduleConfig.storage) {
      const storedId = getStoredValue(submoduleConfig.storage);
      if (storedId) {
        // use stored value
        submoduleContainer.idObj = submodule.decode(storedId);
      } else {
        // call getId
        const getIdResult = submodule.getId(submoduleConfig, consentData);
        if (typeof getIdResult === 'function') {
          // add endpoint function to command que if getId returns a function
          submoduleContainer.callback = getIdResult;
        } else {
          // getId return non-functin, so ran synchronously, and is a valid id object
          submoduleContainer.idObj = submodule.decode(getIdResult);
          setStoredValue(submoduleConfig.storage, getIdResult, submoduleConfig.storage.expires);
        }
      }
    }
    else if (submoduleConfig.value) {
      submoduleContainer.idObj = submoduleConfig.value;
    }

    // configured (storage-found / storage-not-found-que-callback / value-found) submoduleContainer
    carry.push(submoduleContainer);
    return carry;
  }, []);
}

/**
 * @param {IdSubmoduleConfig[]} allSubmoduleConfigs
 * @param {IdSubmodule[]} submodules
 * @returns {IdSubmoduleConfig[]}
 */
export function getValidSubmoduleConfigs(allSubmoduleConfigs, submodules) {
  if (!Array.isArray(allSubmoduleConfigs)) {
    return [];
  }

  // get all enabled storage types to validate submoduleConfig.storage.type
  const storageTypes = [];
  if (browserSupportsLocalStorage()) {
    storageTypes.push(LOCAL_STORAGE);
  }
  if (utils.cookiesAreEnabled()) {
    storageTypes.push(COOKIE);
  }

  // get all submodule names to validate submoduleConfig.name
  const submoduleNames = submodules.reduce((carry, submodule) => {
    carry.push(submodule.name);
    return carry;
  }, []);

  return allSubmoduleConfigs.reduce((carry, submoduleConfig) => {
    if (!submoduleConfig || typeof submoduleConfig !== 'object' ||
      typeof submoduleConfig.name !== 'string' || submoduleConfig.name.length === 0 || submoduleNames.indexOf(submoduleConfig.name) === -1) {
      // invalid
      return carry;
    }

    if (submoduleConfig.storage && typeof submoduleConfig.storage === 'object' &&
      typeof submoduleConfig.storage.type === 'string' && submoduleConfig.storage.type.length &&
      typeof submoduleConfig.storage.name === 'string' && submoduleConfig.storage.name.length &&
      storageTypes.indexOf(submoduleConfig.storage.type) !== -1) {
      // valid
      carry.push(submoduleConfig);
    } else if (submoduleConfig.value && typeof submoduleConfig.value === 'object' && Object.keys(submoduleConfig.value).length) {
      // valid
      carry.push(submoduleConfig);
    }
    return carry;
  }, []);
}

/**
 * @param {IdSubmodule[]} allSubmodules
 * @param {IdSubmoduleConfig[]} validSubmoduleConfigs
 * @returns {IdSubmodule[]}
 */
export function getValidSubmodules(allSubmodules, validSubmoduleConfigs) {
  if (validSubmoduleConfigs.length === 0) {
    return [];
  }
  return allSubmodules.reduce((carry, submodule) => {
    if (find(validSubmoduleConfigs, submoduleConfig => submoduleConfig.name === submodule.name)) {
      // valid
      carry.push(submodule);
    }
    return carry;
  }, []);
}

/**
 * @param config
 * @param {IdSubmodule[]} allSubmodules
 */
export function init (config, allSubmodules) {
  syncDelay = 0;
  submodules = [];
  extendBidData = [];
  submoduleConfigs = [];

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

      syncDelay = usersync.syncDelay || 0;
      submoduleConfigs = getValidSubmoduleConfigs(usersync.universalIds, allSubmodules);
      submodules = getValidSubmodules(allSubmodules, submoduleConfigs);
      if (submodules.length) {
        // priority set to load after consentManagement (50) but before default priority 10
        $$PREBID_GLOBAL$$.requestBids.addHook(requestBidHook, 40);
      }
    }
  });
}

init(config, [pubCommonIdSubmodule, unifiedIdSubmodule]);
