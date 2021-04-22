/**
 * This module adds ID5 to the User ID module
 * The {@link module:modules/userId} module is required
 * @module modules/id5IdSystem
 * @requires module:modules/userId
 */

import * as utils from '../src/utils.js'
import { ajax } from '../src/ajax.js';
import { submodule } from '../src/hook.js';
import { getRefererInfo } from '../src/refererDetection.js';
import { getStorageManager } from '../src/storageManager.js';
import { uspDataHandler } from '../src/adapterManager.js';

const MODULE_NAME = 'id5Id';
const GVLID = 131;
const NB_EXP_DAYS = 30;
export const ID5_STORAGE_NAME = 'id5id';
export const ID5_PRIVACY_STORAGE_NAME = `${ID5_STORAGE_NAME}_privacy`;
const LOCAL_STORAGE = 'html5';
const ABTEST_RESOLUTION = 10000;
const LOG_PREFIX = 'User ID - ID5 submodule: ';

// order the legacy cookie names in reverse priority order so the last
// cookie in the array is the most preferred to use
const LEGACY_COOKIE_NAMES = [ 'pbjs-id5id', 'id5id.1st', 'id5id' ];

const storage = getStorageManager(GVLID, MODULE_NAME);

/** @type {Submodule} */
export const id5IdSubmodule = {
  /**
   * used to link submodule with config
   * @type {string}
   */
  name: 'id5Id',

  /**
   * Vendor id of ID5
   * @type {Number}
   */
  gvlid: GVLID,

  /**
   * decode the stored id value for passing to bid requests
   * @function decode
   * @param {(Object|string)} value
   * @param {SubmoduleConfig|undefined} config
   * @returns {(Object|undefined)}
   */
  decode(value, config) {
    let universalUid;
    let linkType = 0;

    if (value && typeof value.universal_uid === 'string') {
      universalUid = value.universal_uid;
      linkType = value.link_type || linkType;
    } else {
      return undefined;
    }

    // check for A/B testing configuration and hide ID if in Control Group
    const abConfig = getAbTestingConfig(config);
    const controlGroup = isInControlGroup(universalUid, abConfig.controlGroupPct);
    if (abConfig.enabled === true && typeof controlGroup === 'undefined') {
      // A/B Testing is enabled, but configured improperly, so skip A/B testing
      utils.logError(LOG_PREFIX + 'A/B Testing controlGroupPct must be a number >= 0 and <= 1! Skipping A/B Testing');
    } else if (abConfig.enabled === true && controlGroup === true) {
      // A/B Testing is enabled and user is in the Control Group, so do not share the ID5 ID
      utils.logInfo(LOG_PREFIX + 'A/B Testing Enabled - user is in the Control Group, so the ID5 ID is NOT exposed');
      universalUid = '';
      linkType = 0;
    } else if (abConfig.enabled === true) {
      // A/B Testing is enabled but user is not in the Control Group, so ID5 ID is shared
      utils.logInfo(LOG_PREFIX + 'A/B Testing Enabled - user is NOT in the Control Group, so the ID5 ID is exposed');
    }

    let responseObj = {
      id5id: {
        uid: universalUid,
        ext: {
          linkType: linkType
        }
      }
    };

    if (abConfig.enabled === true) {
      utils.deepSetValue(responseObj, 'id5id.ext.abTestingControlGroup', (typeof controlGroup === 'undefined' ? false : controlGroup));
    }

    utils.logInfo(LOG_PREFIX + 'Decoded ID', responseObj);

    return responseObj;
  },

  /**
   * performs action to obtain id and return a value in the callback's response argument
   * @function getId
   * @param {SubmoduleConfig} config
   * @param {ConsentData} consentData
   * @param {(Object|undefined)} cacheIdObj
   * @returns {IdResponse|undefined}
   */
  getId(config, consentData, cacheIdObj) {
    if (!hasRequiredConfig(config)) {
      return undefined;
    }

    const url = `https://id5-sync.com/g/v2/${config.params.partner}.json`;
    const hasGdpr = (consentData && typeof consentData.gdprApplies === 'boolean' && consentData.gdprApplies) ? 1 : 0;
    const usp = uspDataHandler.getConsentData();
    const referer = getRefererInfo();
    const signature = (cacheIdObj && cacheIdObj.signature) ? cacheIdObj.signature : getLegacyCookieSignature();
    const data = {
      'partner': config.params.partner,
      'gdpr': hasGdpr,
      'nbPage': incrementNb(config.params.partner),
      'o': 'pbjs',
      'rf': referer.referer,
      'top': referer.reachedTop ? 1 : 0,
      'u': referer.stack[0] || window.location.href,
      'v': '$prebid.version$'
    };

    // pass in optional data, but only if populated
    if (hasGdpr && typeof consentData.consentString !== 'undefined' && !utils.isEmpty(consentData.consentString) && !utils.isEmptyStr(consentData.consentString)) {
      data.gdpr_consent = consentData.consentString;
    }
    if (typeof usp !== 'undefined' && !utils.isEmpty(usp) && !utils.isEmptyStr(usp)) {
      data.us_privacy = usp;
    }
    if (typeof signature !== 'undefined' && !utils.isEmptyStr(signature)) {
      data.s = signature;
    }
    if (typeof config.params.pd !== 'undefined' && !utils.isEmptyStr(config.params.pd)) {
      data.pd = config.params.pd;
    }
    if (typeof config.params.provider !== 'undefined' && !utils.isEmptyStr(config.params.provider)) {
      data.provider = config.params.provider;
    }

    // pass in feature flags, if applicable
    if (getAbTestingConfig(config).enabled === true) {
      utils.deepSetValue(data, 'features.ab', 1);
    }

    const resp = function (callback) {
      const callbacks = {
        success: response => {
          let responseObj;
          if (response) {
            try {
              responseObj = JSON.parse(response);
              utils.logInfo(LOG_PREFIX + 'response received from the server', responseObj);

              resetNb(config.params.partner);

              if (responseObj.privacy) {
                storeInLocalStorage(ID5_PRIVACY_STORAGE_NAME, JSON.stringify(responseObj.privacy), NB_EXP_DAYS);
              }

              // TODO: remove after requiring publishers to use localstorage and
              // all publishers have upgraded
              if (config.storage.type === LOCAL_STORAGE) {
                removeLegacyCookies(config.params.partner);
              }
            } catch (error) {
              utils.logError(LOG_PREFIX + error);
            }
          }
          callback(responseObj);
        },
        error: error => {
          utils.logError(LOG_PREFIX + 'getId fetch encountered an error', error);
          callback();
        }
      };
      utils.logInfo(LOG_PREFIX + 'requesting an ID from the server', data);
      ajax(url, callbacks, JSON.stringify(data), { method: 'POST', withCredentials: true });
    };
    return {callback: resp};
  },

  /**
   * Similar to Submodule#getId, this optional method returns response to for id that exists already.
   *  If IdResponse#id is defined, then it will be written to the current active storage even if it exists already.
   *  If IdResponse#callback is defined, then it'll called at the end of auction.
   *  It's permissible to return neither, one, or both fields.
   * @function extendId
   * @param {SubmoduleConfig} config
   * @param {ConsentData|undefined} consentData
   * @param {Object} cacheIdObj - existing id, if any
   * @return {(IdResponse|function(callback:function))} A response object that contains id and/or callback.
   */
  extendId(config, consentData, cacheIdObj) {
    hasRequiredConfig(config);

    const partnerId = (config && config.params && config.params.partner) || 0;
    incrementNb(partnerId);

    utils.logInfo(LOG_PREFIX + 'using cached ID', cacheIdObj);
    return cacheIdObj;
  }
};

function hasRequiredConfig(config) {
  if (!config || !config.params || !config.params.partner || typeof config.params.partner !== 'number') {
    utils.logError(LOG_PREFIX + 'partner required to be defined as a number');
    return false;
  }

  if (!config.storage || !config.storage.type || !config.storage.name) {
    utils.logError(LOG_PREFIX + 'storage required to be set');
    return false;
  }

  // in a future release, we may return false if storage type or name are not set as required
  if (config.storage.type !== LOCAL_STORAGE) {
    utils.logWarn(LOG_PREFIX + `storage type recommended to be '${LOCAL_STORAGE}'. In a future release this may become a strict requirement`);
  }
  // in a future release, we may return false if storage type or name are not set as required
  if (config.storage.name !== ID5_STORAGE_NAME) {
    utils.logWarn(LOG_PREFIX + `storage name recommended to be '${ID5_STORAGE_NAME}'. In a future release this may become a strict requirement`);
  }

  return true;
}

export function expDaysStr(expDays) {
  return (new Date(Date.now() + (1000 * 60 * 60 * 24 * expDays))).toUTCString();
}

export function nbCacheName(partnerId) {
  return `${ID5_STORAGE_NAME}_${partnerId}_nb`;
}
export function storeNbInCache(partnerId, nb) {
  storeInLocalStorage(nbCacheName(partnerId), nb, NB_EXP_DAYS);
}
export function getNbFromCache(partnerId) {
  let cacheNb = getFromLocalStorage(nbCacheName(partnerId));
  return (cacheNb) ? parseInt(cacheNb) : 0;
}
function incrementNb(partnerId) {
  const nb = (getNbFromCache(partnerId) + 1);
  storeNbInCache(partnerId, nb);
  return nb;
}
function resetNb(partnerId) {
  storeNbInCache(partnerId, 0);
}

function getLegacyCookieSignature() {
  let legacyStoredValue;
  LEGACY_COOKIE_NAMES.forEach(function(cookie) {
    if (storage.getCookie(cookie)) {
      legacyStoredValue = JSON.parse(storage.getCookie(cookie)) || legacyStoredValue;
    }
  });
  return (legacyStoredValue && legacyStoredValue.signature) || '';
}

/**
 * Remove our legacy cookie values. Needed until we move all publishers
 * to html5 storage in a future release
 * @param {integer} partnerId
 */
function removeLegacyCookies(partnerId) {
  utils.logInfo(LOG_PREFIX + 'removing legacy cookies');
  LEGACY_COOKIE_NAMES.forEach(function(cookie) {
    storage.setCookie(`${cookie}`, ' ', expDaysStr(-1));
    storage.setCookie(`${cookie}_nb`, ' ', expDaysStr(-1));
    storage.setCookie(`${cookie}_${partnerId}_nb`, ' ', expDaysStr(-1));
    storage.setCookie(`${cookie}_last`, ' ', expDaysStr(-1));
  });
}

/**
 * This will make sure we check for expiration before accessing local storage
 * @param {string} key
 */
export function getFromLocalStorage(key) {
  const storedValueExp = storage.getDataFromLocalStorage(`${key}_exp`);
  // empty string means no expiration set
  if (storedValueExp === '') {
    return storage.getDataFromLocalStorage(key);
  } else if (storedValueExp) {
    if ((new Date(storedValueExp)).getTime() - Date.now() > 0) {
      return storage.getDataFromLocalStorage(key);
    }
  }
  // if we got here, then we have an expired item or we didn't set an
  // expiration initially somehow, so we need to remove the item from the
  // local storage
  storage.removeDataFromLocalStorage(key);
  return null;
}
/**
 * Ensure that we always set an expiration in local storage since
 * by default it's not required
 * @param {string} key
 * @param {any} value
 * @param {integer} expDays
 */
export function storeInLocalStorage(key, value, expDays) {
  storage.setDataInLocalStorage(`${key}_exp`, expDaysStr(expDays));
  storage.setDataInLocalStorage(`${key}`, value);
}

/**
 * gets the existing abTesting config or generates a default config with abTesting off
 *
 * @param {SubmoduleConfig|undefined} config
 * @returns {(Object|undefined)}
 */
function getAbTestingConfig(config) {
  return (config && config.params && config.params.abTesting) || { enabled: false };
}

/**
 * Return a consistant random number between 0 and ABTEST_RESOLUTION-1 for this user
 * Falls back to plain random if no user provided
 * @param {string} userId
 * @returns {number}
 */
function abTestBucket(userId) {
  if (userId) {
    return ((utils.cyrb53Hash(userId) % ABTEST_RESOLUTION) + ABTEST_RESOLUTION) % ABTEST_RESOLUTION;
  } else {
    return Math.floor(Math.random() * ABTEST_RESOLUTION);
  }
}

/**
 * Return a consistant boolean if this user is within the control group ratio provided
 * @param {string} userId
 * @param {number} controlGroupPct - Ratio [0,1] of users expected to be in the control group
 * @returns {boolean}
 */
export function isInControlGroup(userId, controlGroupPct) {
  if (!utils.isNumber(controlGroupPct) || controlGroupPct < 0 || controlGroupPct > 1) {
    return undefined;
  }
  return abTestBucket(userId) < controlGroupPct * ABTEST_RESOLUTION;
}

submodule('userId', id5IdSubmodule);
