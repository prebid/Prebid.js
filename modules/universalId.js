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

const UNIVERSAL_ID = 'UniversalId';
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
  decode: function (value) {
    return { 'tdid': value };
  },
  getId: function (submoduleConfig, consentData, syncDelay) {
    const partner = (submoduleConfig.params && typeof submoduleConfig.params.partner === 'string') ? submoduleConfig.params.partner : 'prebid';
    const url = (submoduleConfig.params && typeof submoduleConfig.params.url === 'string') ? submoduleConfig.params.url : `http://match.adsrvr.org/track/rid?ttd_pid=${partner}&fmt=json`;

    function auctionEndHandler() {
      events.off(CONSTANTS.EVENTS.AUCTION_END, auctionEndHandler);
      setTimeout(callEndpoint, syncDelay);
    }

    function callEndpoint () {
      ajax(url, response => {
        if (response) {
          try {
            const responseObj = JSON.parse(response);
            if (responseObj.TDID) {
              setStoredValue(submoduleConfig.storage, responseObj.TDID, responseObj.expires || submoduleConfig.storage.expires || 60);
              extendBidData.push(unifiedIdSubmodule.decode(responseObj.TDID))
            } else {
              utils.logError(`${UNIVERSAL_ID}: unifiedId - getId() TDID value undefined in response`);
            }
          } catch (error) {
            utils.logError(error);
          }
        } else {
          utils.logError(`${UNIVERSAL_ID}: unifiedId - getId() request returned empty response`);
        }
      }, undefined, { method: 'GET' });
    }

    // if no sync delay call endpoint immediately,
    if (!syncDelay) {
      callEndpoint();
    } else {
      // else wait for auction end to create timer to call endpoint
      utils.logInfo(`${UNIVERSAL_ID}: unifiedId - getId() wait ${syncDelay} after auction ends to perform sync `);
      events.on(CONSTANTS.EVENTS.AUCTION_END, auctionEndHandler);
    }
  }
};

/**
 * @type {IdSubmodule}
 */
export const pubCommonIdSubmodule = {
  name: 'pubCommonId',
  decode: function(value) {
    return { 'pubcid': value }
  },
  getId: function(submoduleConfig, consentData, syncDelay) {
    const pubId = utils.generateUUID();
    setStoredValue(submoduleConfig.storage, pubId, submoduleConfig.storage.expires || 60);
    extendBidData.push(this.decode(pubId))
  }
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
    utils.logInfo(`${UNIVERSAL_ID} - setStoredValue() ${storage.name}=${value} using ${storage.type}`);
  } catch (error) {
    utils.logError(`${UNIVERSAL_ID} - setStoredValue() failed ${error}`);
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
  utils.logInfo(`${UNIVERSAL_ID} - get stored value ${storage.name} from ${storage.type}`);
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
  // initialize submodules
  if (typeof initializedSubmodules === 'undefined' && submodules && submoduleConfigs) {
    initializedSubmodules = initSubmodules(submodules, submoduleConfigs, gdprDataHandler.getConsentData());
  }

  // check for and pass universalId data if it exists to bid adapters
  if (extendBidData.length) {
    const adUnits = config.adUnits || $$PREBID_GLOBAL$$.adUnits;
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
  return submodules.reduce((carry, submodule) => {
    const submoduleConfig = find(submoduleConfigs, submoduleConfig => submoduleConfig.name === submodule.name);

    // STORAGE configuration, storage must be loaded from cookies/localStorage and decoded before adding to bid requests
    if (submoduleConfig && submoduleConfig.storage) {
      const storedId = getStoredValue(submoduleConfig.storage);
      if (storedId) {
        // use stored value
        extendBidData.push(submodule.decode(storedId));
        carry.push(submodule.name + '-storage-decode');
      } else {
        // call getId
        if (hasGDPRConsent(consentData)) {
          submodule.getId(submoduleConfig, consentData, syncDelay);
          carry.push(submodule.name + '-storage-getId');
        } else {
          utils.logWarn(`${UNIVERSAL_ID}: ${submodule.name} - initSubmodules getId, no gdpr permission: ignore`);
        }
      }
    }
    // VALUE configuration, value is added directly to bid requests (DOES NOT REQUIRE DECODING)
    if (submoduleConfig.value) {
      extendBidData.push(submoduleConfig.value);
      carry.push(submodule.name + '-value');
    }
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
      utils.logInfo(`${UNIVERSAL_ID} - opt-out cookie found, exit module`);
      return;
    }
  }
  // listen for config userSyncs to be set
  config.getConfig('usersync', ({usersync}) => {
    if (usersync) {
      utils.logInfo(`${UNIVERSAL_ID} - usersync config updated`);

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
