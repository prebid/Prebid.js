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
const LOCAL_STORAGE = 'html5';

// order the legacy cookie names in reverse priority order so the last
// cookie in the array is the most preferred to use
const LEGACY_COOKIE_NAMES = [ 'pbjs-id5id', 'id5id.1st' ];

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
   * @returns {(Object|undefined)}
   */
  decode(value) {
    let uid;
    let linkType = 0;

    if (value && typeof value.universal_uid === 'string') {
      uid = value.universal_uid;
      linkType = value.link_type || linkType;
    } else {
      return undefined;
    }

    return {
      'id5id': {
        'uid': uid,
        'ext': {
          'linkType': linkType
        }
      }
    };
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

    const hasGdpr = (consentData && typeof consentData.gdprApplies === 'boolean' && consentData.gdprApplies) ? 1 : 0;
    const gdprConsentString = hasGdpr ? consentData.consentString : '';
    const usp = uspDataHandler.getConsentData() || '';
    const url = `https://id5-sync.com/g/v2/${config.params.partner}.json?gdpr_consent=${gdprConsentString}&gdpr=${hasGdpr}&us_privacy=${usp}`;
    const referer = getRefererInfo();
    const signature = (cacheIdObj && cacheIdObj.signature) ? cacheIdObj.signature : getLegacyCookieSignature();
    const data = {
      'partner': config.params.partner,
      'nbPage': incrementNb(config.params.partner),
      'o': 'pbjs',
      'pd': config.params.pd || '',
      'rf': referer.referer,
      's': signature,
      'top': referer.reachedTop ? 1 : 0,
      'u': referer.stack[0] || window.location.href,
      'v': '$prebid.version$'
    };

    const resp = function (callback) {
      const callbacks = {
        success: response => {
          let responseObj;
          if (response) {
            try {
              responseObj = JSON.parse(response);
              resetNb(config.params.partner);

              // TODO: remove after requiring publishers to use localstorage and
              // all publishers have upgraded
              if (config.storage.type === LOCAL_STORAGE) {
                removeLegacyCookies(config.params.partner);
              }
            } catch (error) {
              utils.logError(error);
            }
          }
          callback(responseObj);
        },
        error: error => {
          utils.logError(`User ID - ID5 submodule getId fetch encountered an error`, error);
          callback();
        }
      };
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
   * @param {Object} cacheIdObj - existing id, if any
   * @return {(IdResponse|function(callback:function))} A response object that contains id and/or callback.
   */
  extendId(config, cacheIdObj) {
    const partnerId = (config && config.params && config.params.partner) || 0;
    incrementNb(partnerId);
    return cacheIdObj;
  }
};

function hasRequiredConfig(config) {
  if (!config || !config.params || !config.params.partner || typeof config.params.partner !== 'number') {
    utils.logError(`User ID - ID5 submodule requires partner to be defined as a number`);
    return false;
  }

  if (!config.storage || !config.storage.type || !config.storage.name) {
    utils.logError(`User ID - ID5 submodule requires storage to be set`);
    return false;
  }

  // TODO: in a future release, return false if storage type or name are not set as required
  if (config.storage.type !== LOCAL_STORAGE) {
    utils.logWarn(`User ID - ID5 submodule recommends storage type to be '${LOCAL_STORAGE}'. In a future release this will become a strict requirement`);
  }
  // TODO: in a future release, return false if storage type or name are not set as required
  if (config.storage.name !== ID5_STORAGE_NAME) {
    utils.logWarn(`User ID - ID5 submodule recommends storage name to be '${ID5_STORAGE_NAME}'. In a future release this will become a strict requirement`);
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
  LEGACY_COOKIE_NAMES.forEach(function(cookie) {
    storage.setCookie(`${cookie}`, '', expDaysStr(-1));
    storage.setCookie(`${cookie}_nb`, '', expDaysStr(-1));
    storage.setCookie(`${cookie}_${partnerId}_nb`, '', expDaysStr(-1));
    storage.setCookie(`${cookie}_last`, '', expDaysStr(-1));
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

submodule('userId', id5IdSubmodule);
