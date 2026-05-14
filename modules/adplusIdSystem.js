/**
 * This module adds AdPlus ID system to the User ID module
 * The {@link module:modules/userId} module is required
 * @module modules/adplusIdSystem
 * @requires module:modules/userId
 */
import {
  logError,
  logWarn,
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

export const ADPLUS_UID_NAME = '_adplus_uid_v2';
export const ADPLUS_PB_CLIENT_ID = 'xqkDY946ohWmBm3gWXDTfD';
export const API_URL = `https://id.ad-plus.com.tr/v2?client_id=${ADPLUS_PB_CLIENT_ID}`;
export const ROTATION_INTERVAL = 1 * 60 * 60 * 1000; // 1 Hour
const LOG_PREFIX = 'User ID - adplusId submodule: ';

/**
 * @returns {Object} -
 */
function getIdFromStorage() {
  try {
    const lsDt = storage.getDataFromLocalStorage(ADPLUS_UID_NAME);

    if (lsDt) {
      return JSON.parse(lsDt);
    }

    const cookieDt = storage.getCookie(ADPLUS_UID_NAME);

    if (cookieDt) {
      return JSON.parse(cookieDt);
    }
  } catch (error) {
    logError(LOG_PREFIX + error);
    clearStorage();
  }
}

/**
 * clears adplus id values from storage
 * @returns {void} -
 */
function clearStorage() {
  storage.removeDataFromLocalStorage(ADPLUS_UID_NAME)
  storage.setCookie(
    ADPLUS_UID_NAME,
    "",
    "Thu, 01 Jan 1970 00:00:00 UTC",
    'none'
  );
}

/**
 * set uid to cookie.
 * @param {string} value -
 * @returns {void} -
 */
function setAdplusIdToCookie(value) {
  if (value) {
    if (value.expiresIn === -1) {
      // Uid expired
      logWarn(LOG_PREFIX + 'AdPlus ID expired');
      clearStorage();
      return;
    }

    let expiresIn = 0;

    if (value.expiresIn == null || value.expiresIn === -2) {
      expiresIn = (ROTATION_INTERVAL * 3) - 1000
    } else {
      expiresIn = value.expiresIn * 1000
    }

    const now = Date.now();

    let data = {
      uid: value.uid,
      atype: value.atype,
      expiresAt: now + expiresIn,
      rotateAt: now + ROTATION_INTERVAL,
    };

    const json = JSON.stringify(data);

    storage.setDataInLocalStorage(ADPLUS_UID_NAME, json);

    const expires = new Date(data.expiresAt).toUTCString()
    storage.setCookie(
      ADPLUS_UID_NAME,
      json,
      expires,
      'none'
    );
  }
}

/**
 * @param {boolean} isRotate - Determines whether the request is for rotation
 * @param {string} uid - UID to rotate
 * @param {function} callback - Callback
 * @returns {{callback: function}} - Callback function
 */
function fetchAdplusId(isRotate, uid, callback) {
  let apiUrl = API_URL;

  const storageOk = storage.cookiesAreEnabled() || storage.localStorageIsEnabled();
  apiUrl = `${apiUrl}&storage_ok=${storageOk ? "1" : "0"}`;

  if (isRotate && uid) {
    apiUrl = `${apiUrl}&old_uid=${uid}`;
  }

  ajax(apiUrl, {
    success: (response) => {
      if (response) {
        try {
          const data = JSON.parse(response);
          if (data == null || !data.uid) {
            logWarn(LOG_PREFIX + 'AdPlus ID is null');
            return callback();
          }
          setAdplusIdToCookie(data);
          callback(data);
        } catch (error) {
          logError(LOG_PREFIX + error);
          callback();
        }
      } else {
        logError(LOG_PREFIX + 'No uid returned.');
        callback();
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
    if (value && isPlainObject(value)) {
      return { 'adplusId': { id: value.uid, atype: value.atype } };
    }
  },

  /**
   * performs action to obtain id
   * @function
   * @returns {{id: string | undefined }}
   */
  getId(config, consentData) {
    const dt = getIdFromStorage();

    if (dt) {
      const now = Date.now();
      if (dt.expiresAt && dt.expiresAt <= now) {
        clearStorage();
        return {
          callback: function (callback) {
            fetchAdplusId(false, "", callback);
          }
        };
      }

      const rotate = dt.rotateAt && dt.rotateAt <= now;
      if (rotate) {
        return {
          id: dt,
          callback: function (callback) {
            fetchAdplusId(true, dt.uid, callback);
          }
        };
      }

      return {
        id: dt,
      };
    }

    return {
      callback: function (callback) {
        fetchAdplusId(false, "", callback);
      }
    };
  },
  eids: {
    adplusId: function (values, _) {
      return [
        {
          source: 'ad-plus.com.tr',
          uids: values.map(function (value) {
            return {
              id: value.id,
              atype: value.atype
            };
          })
        }
      ];
    }
  }
};

submodule('userId', adplusIdSystemSubmodule);
