/**
 * This module adds AdPlus ID system to the User ID module
 * The {@link module:modules/userId} module is required
 * @module modules/adplusIdSystem
 * @requires module:modules/userId
 */
import {
  logError,
  logInfo,
  logWarn,
  generateUUID,
  isStr,
  isPlainObject,
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
import { MODULE_TYPE_UID } from '../src/activities/modules.js';

const MODULE_NAME = 'adplusId';

export const storage = getStorageManager({ moduleType: MODULE_TYPE_UID, moduleName: MODULE_NAME });

export const ADPLUS_COOKIE_NAME = '_adplus_id';
export const API_URL = 'https://id.ad-plus.com.tr';
const EXPIRATION = 60 * 60 * 24 * 1000; // 1 Day
const LOG_PREFIX = 'User ID - adplusId submodule: ';

/**
 * @returns {string} -
 */
function getIdFromStorage() {
  return storage.getCookie(ADPLUS_COOKIE_NAME);
}

/**
 * set uid to cookie.
 * @param {string} uid -
 * @returns {void} -
 */
function setAdplusIdToCookie(uid) {
  if (uid) {
    const expires = new Date(Date.now() + EXPIRATION).toUTCString();
    storage.setCookie(
      ADPLUS_COOKIE_NAME,
      uid,
      expires,
      'none'
    );
  }
}

/**
 * @returns {string} -
 */
function getApiUrl() {
  return `${API_URL}?token=${generateUUID()}`;
}

/**
 * @returns {{callback: function}} -
 */
function fetchAdplusId(callback) {
  const apiUrl = getApiUrl();

  ajax(apiUrl, {
    success: (response) => {
      if (response) {
        try {
          const { uid } = JSON.parse(response);
          if (!uid) {
            logWarn(LOG_PREFIX + 'AdPlus ID is null');
            return callback();
          }
          setAdplusIdToCookie(uid);
          callback(uid);
        } catch (error) {
          logError(LOG_PREFIX + error);
          callback();
        }
      }
    },
    error: (error) => {
      logError(LOG_PREFIX + error);
      callback();
    }
  }, undefined, {
    method: 'GET',
    withCredentials: true
  });
}

export const adplusIdSystemSubmodule = {
  /**
   * used to link submodule with config
   * @type {string}
   */
  name: MODULE_NAME,

  /**
   * decode the stored id value for passing to bid requests
   * @function
   * @returns {{adplusId: string} | undefined}
   */
  decode(value) {
    const idVal = value ? isStr(value) ? value : isPlainObject(value) ? value.id : undefined : undefined;
    if (idVal) {
      return {
        adplusId: idVal,
      }
    }
  },

  /**
   * performs action to obtain id
   * @function
   * @returns {{id: string | undefined }}
   */
  getId(config, consentData, storedId) {
    if (storedId) {
      logInfo(LOG_PREFIX + 'Got storedId: ', storedId);
      return {
        id: storedId,
      };
    }

    const uid = getIdFromStorage();

    if (uid) {
      return {
        id: uid,
      };
    }

    return { callback: fetchAdplusId };
  },
  eids: {
    'adplusId': {
      source: 'ad-plus.com.tr',
      atype: 1
    },
  }
};

submodule('userId', adplusIdSystemSubmodule);
