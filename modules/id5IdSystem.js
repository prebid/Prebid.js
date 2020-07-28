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

const MODULE_NAME = 'id5Id';
const GVLID = 131;
const BASE_NB_COOKIE_NAME = 'id5id.1st';
const NB_COOKIE_EXP_DAYS = (30 * 24 * 60 * 60 * 1000); // 30 days

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
    if (value && typeof value.ID5ID === 'string') {
      // don't lose our legacy value from cache
      return { 'id5id': value.ID5ID };
    } else if (value && typeof value.universal_uid === 'string') {
      return { 'id5id': value.universal_uid };
    } else {
      return undefined;
    }
  },

  /**
   * performs action to obtain id and return a value in the callback's response argument
   * @function getId
   * @param {SubmoduleParams} [configParams]
   * @param {ConsentData} [consentData]
   * @param {(Object|undefined)} cacheIdObj
   * @returns {IdResponse|undefined}
   */
  getId(configParams, consentData, cacheIdObj) {
    if (!hasRequiredParams(configParams)) {
      return undefined;
    }
    const hasGdpr = (consentData && typeof consentData.gdprApplies === 'boolean' && consentData.gdprApplies) ? 1 : 0;
    const gdprConsentString = hasGdpr ? consentData.consentString : '';
    const url = `https://id5-sync.com/g/v2/${configParams.partner}.json?gdpr_consent=${gdprConsentString}&gdpr=${hasGdpr}`;
    const referer = getRefererInfo();
    const signature = (cacheIdObj && cacheIdObj.signature) ? cacheIdObj.signature : '';
    const pubId = (cacheIdObj && cacheIdObj.ID5ID) ? cacheIdObj.ID5ID : ''; // TODO: remove when 1puid isn't needed
    const data = {
      'partner': configParams.partner,
      '1puid': pubId, // TODO: remove when 1puid isn't needed
      'nbPage': incrementNb(configParams),
      'o': 'pbjs',
      'pd': configParams.pd || '',
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
              resetNb(configParams);
            } catch (error) {
              utils.logError(error);
            }
          }
          callback(responseObj);
        },
        error: error => {
          utils.logError(`id5Id: ID fetch encountered an error`, error);
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
   * @param {SubmoduleParams} configParams
   * @param {Object} cacheIdObj - existing id, if any
   * @return {(IdResponse|function(callback:function))} A response object that contains id and/or callback.
   */
  extendId(configParams, cacheIdObj) {
    incrementNb(configParams);
    return cacheIdObj;
  }
};

function hasRequiredParams(configParams) {
  if (!configParams || typeof configParams.partner !== 'number') {
    utils.logError(`User ID - ID5 submodule requires partner to be defined as a number`);
    return false;
  }
  return true;
}
function nbCookieName(configParams) {
  return hasRequiredParams(configParams) ? `${BASE_NB_COOKIE_NAME}_${configParams.partner}_nb` : undefined;
}
function nbCookieExpStr(expDays) {
  return (new Date(Date.now() + expDays)).toUTCString();
}
function storeNbInCookie(configParams, nb) {
  storage.setCookie(nbCookieName(configParams), nb, nbCookieExpStr(NB_COOKIE_EXP_DAYS), 'Lax');
}
function getNbFromCookie(configParams) {
  const cacheNb = storage.getCookie(nbCookieName(configParams));
  return (cacheNb) ? parseInt(cacheNb) : 0;
}
function incrementNb(configParams) {
  const nb = (getNbFromCookie(configParams) + 1);
  storeNbInCookie(configParams, nb);
  return nb;
}
function resetNb(configParams) {
  storeNbInCookie(configParams, 0);
}

submodule('userId', id5IdSubmodule);
