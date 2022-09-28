/**
 * This module adds dacId to the User ID module
 * The {@link module:modules/userId} module is required
 * @module modules/dacIdSystem
 * @requires module:modules/userId
 */

import {
  logError,
  logInfo,
  logWarn
} from '../src/utils.js';
import {
  ajax
} from '../src/ajax.js'
import {
  submodule
} from '../src/hook.js';
import {
  getStorageManager
} from '../src/storageManager.js';

export const storage = getStorageManager();

export const FUUID_COOKIE_NAME = '_a1_f';
export const AONEID_COOKIE_NAME = '_a1_d';
export const API_URL = 'https://penta.a.one.impact-ad.jp/aud';
const COOKIES_EXPIRES = 60 * 60 * 24 * 1000; // 24h
const LOG_PREFIX = 'User ID - dacId submodule: ';

/**
 * @returns {{fuuid: string, uid: string}} -
 */
function getCookieId() {
  return {
    fuuid: storage.getCookie(FUUID_COOKIE_NAME),
    uid: storage.getCookie(AONEID_COOKIE_NAME)
  };
}

/**
 * set uid to cookie.
 * @param {string} uid -
 * @returns {void} -
 */
function setAoneidToCookie(uid) {
  if (uid) {
    const expires = new Date(Date.now() + COOKIES_EXPIRES).toUTCString();
    storage.setCookie(
      AONEID_COOKIE_NAME,
      uid,
      expires,
      'none'
    );
  }
}

/**
 * @param {string} oid -
 * @param {string} fuuid -
 * @returns {string} -
 */
function getApiUrl(oid, fuuid) {
  return `${API_URL}?oid=${oid}&fu=${fuuid}`;
}

/**
 * @param {string} oid -
 * @param {string} fuuid -
 * @returns {{callback: function}} -
 */
function fetchAoneId(oid, fuuid) {
  return {
    callback: (callback) => {
      const ret = {
        fuuid,
        uid: undefined
      };
      const callbacks = {
        success: (response) => {
          if (response) {
            try {
              const responseObj = JSON.parse(response);
              if (responseObj.error) {
                logWarn(LOG_PREFIX + 'There is no permission to use API: ' + responseObj.error);
                return callback(ret);
              }
              if (!responseObj.uid) {
                logWarn(LOG_PREFIX + 'AoneId is null');
                return callback(ret);
              }
              ret.uid = responseObj.uid;
              setAoneidToCookie(ret.uid);
            } catch (error) {
              logError(LOG_PREFIX + error);
            }
          }
          callback(ret);
        },
        error: (error) => {
          logError(LOG_PREFIX + error);
          callback(ret);
        }
      };
      const apiUrl = getApiUrl(oid, fuuid);
      ajax(apiUrl, callbacks, undefined, {
        method: 'GET',
        withCredentials: true
      });
    },
  };
}

export const dacIdSystemSubmodule = {
  /**
   * used to link submodule with config
   * @type {string}
   */
  name: 'dacId',

  /**
   * decode the stored id value for passing to bid requests
   * @param { {fuuid: string, uid: string} } id
   * @returns { {dacId: {fuuid: string, dacId: string} } | undefined }
   */
  decode(id) {
    if (id && typeof id === 'object') {
      return {
        dacId: {
          fuuid: id.fuuid,
          id: id.uid
        }
      }
    }
  },

  /**
   * performs action to obtain id
   * @function
   * @returns { {id: {fuuid: string, uid: string}} | undefined }
   */
  getId(config) {
    const cookie = getCookieId();

    if (!cookie.fuuid) {
      logInfo(LOG_PREFIX + 'There is no fuuid in cookie')
      return undefined;
    }

    if (cookie.fuuid && cookie.uid) {
      logInfo(LOG_PREFIX + 'There is fuuid and AoneId in cookie')
      return {
        id: {
          fuuid: cookie.fuuid,
          uid: cookie.uid
        }
      };
    }

    const configParams = (config && config.params) || {};
    if (!configParams || typeof configParams.oid !== 'string') {
      logWarn(LOG_PREFIX + 'oid is not defined');
      return {
        id: {
          fuuid: cookie.fuuid,
          uid: undefined
        }
      };
    }

    return fetchAoneId(configParams.oid, cookie.fuuid);
  }
};

submodule('userId', dacIdSystemSubmodule);
