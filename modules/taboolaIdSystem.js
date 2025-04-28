/**
 * This module adds Taboola’s User ID submodule to the Prebid User ID module.
 * @module modules/taboolaIdSystem
 * @requires module:modules/userId
 */

import {submodule} from '../src/hook.js';
import {ajax} from '../src/ajax.js';
import {getStorageManager} from '../src/storageManager.js';
import {logError} from '../src/utils.js';
import {gdprDataHandler, gppDataHandler, uspDataHandler} from '../src/adapterManager.js';
import {MODULE_TYPE_UID} from '../src/activities/modules.js';

/**
 * The Taboola sync endpoint.
 * NOTE: We already have query params (?app.type=desktop&app.apikey=...),
 * so we'll handle extra params carefully.
 */
const TABOOLA_SYNC_ENDPOINT = 'https://api.taboola.com/1.2/json/taboola-usersync/user.sync?app.type=desktop&app.apikey=e60e3b54fc66bae12e060a4a66536126f26e6cf8';
const BIDDER_CODE = 'taboola';
const GVLID = 42;
const STORAGE_KEY = 'taboola global:user-id';
// Taboola cookie keys
const COOKIE_KEY = 'trc_cookie_storage';
const TGID_COOKIE_KEY = 't_gid';
const TGID_PT_COOKIE_KEY = 't_pt_gid';
const TBLA_ID_COOKIE_KEY = 'tbla_id';
export const sm = getStorageManager({
  moduleType: MODULE_TYPE_UID,
  moduleName: BIDDER_CODE
});

/**
 *  Taboola’s ID retrieval logic.
 * - Local storage
 * - Known Taboola cookies
 * - window.TRC.user_id
 */
const userData = {
  getUserId() {
    try {
      return this.getFromLocalStorage() || this.getFromCookie() || this.getFromTRC();
    } catch (ex) {
      return '0';
    }
  },

  getFromLocalStorage() {
    const {hasLocalStorage, localStorageIsEnabled, getDataFromLocalStorage} = sm;
    if (hasLocalStorage() && localStorageIsEnabled()) {
      return getDataFromLocalStorage(STORAGE_KEY);
    }
    return undefined;
  },

  getFromCookie() {
    const {cookiesAreEnabled, getCookie} = sm;
    if (cookiesAreEnabled()) {
      const mainCookieData = getCookie(COOKIE_KEY);
      if (mainCookieData) {
        const userId = this.getCookieDataByKey(mainCookieData, 'user-id');
        if (userId) {
          return userId;
        }
      }
      // Fallback checks
      const tid = getCookie(TGID_COOKIE_KEY);
      if (tid) {
        return tid;
      }
      const tptId = getCookie(TGID_PT_COOKIE_KEY);
      if (tptId) {
        return tptId;
      }
      const tblaId = getCookie(TBLA_ID_COOKIE_KEY);
      if (tblaId) {
        return tblaId;
      }
    }
    return undefined;
  },

  /**
   * Extract a value for a given key out of a multi-value cookie, e.g. "user-id=abc&foo=bar".
   */
  getCookieDataByKey(cookieData, key) {
    if (!cookieData) {
      return undefined;
    }
    const [match] = cookieData.split('&').filter(item => item.startsWith(`${key}=`));
    if (match) {
      return match.split('=')[1];
    }
    return undefined;
  },

  getFromTRC() {
    if (window.TRC) {
      return window.TRC.user_id;
    }
    return undefined;
  }
};

/**
 * Build the Taboola sync URL, adding GDPR, USP, or GPP parameters as needed.
 */
function buildTaboolaSyncUrl() {
  let paramPrefix = '&';
  let syncUrl = TABOOLA_SYNC_ENDPOINT;
  const extraParams = [];
  // GDPR
  const gdprConsent = gdprDataHandler.getConsentData();
  if (gdprConsent) {
    extraParams.push(`gdpr=${Number(gdprConsent.gdprApplies === true)}`);
    if (gdprConsent.consentString) {
      extraParams.push(`gdpr_consent=${encodeURIComponent(gdprConsent.consentString)}`);
    }
  }
  // CCPA / USP
  const usp = uspDataHandler.getConsentData();
  if (usp) {
    extraParams.push(`us_privacy=${encodeURIComponent(usp)}`);
  }
  // GPP
  const gppConsent = gppDataHandler.getConsentData();
  if (gppConsent) {
    if (gppConsent.gppString) {
      extraParams.push(`gpp=${encodeURIComponent(gppConsent.gppString)}`);
    }
    if (gppConsent.applicableSections) {
      extraParams.push(`gpp_sid=${encodeURIComponent(gppConsent.applicableSections)}`);
    }
  }
  if (extraParams.length > 0) {
    syncUrl += `${paramPrefix}${extraParams.join('&')}`;
  }
  return syncUrl;
}

/**
 * Store the user ID in local storage.
 */
function saveUserIdInLocalStorage(id) {
  if (!id) {
    return;
  }
  try {
    if (sm.hasLocalStorage() && sm.localStorageIsEnabled()) {
      sm.setDataInLocalStorage(STORAGE_KEY, id);
    }
  } catch (ex) {
    logError('Taboola user-sync: error saving user ID in local storage', ex);
  }
}

/**
 * Calls Taboola’s user-sync endpoint, which returns JSON like:
 * {
 *   "user": {
 *     "id": "Aa123456",
 *     "isNewUser": false
 *   }
 * }
 * The server also sets a cookie via Set-Cookie, but we do NOT manually set.
 * Instead, we parse "data.user.id" and store it in local storage.
 */
function callTaboolaUserSync(submoduleConfig, currentId, callback) {
  const skipSync = submoduleConfig?.params?.shouldSkipSync ?? true;
  if (skipSync) {
    callback(currentId ? {taboolaId: currentId} : undefined);
    return;
  }
  const syncUrl = buildTaboolaSyncUrl();
  ajax(
    syncUrl,
    {
      success: (response) => {
        try {
          const data = JSON.parse(response);
          if (data && data.user && data.user.id) {
            saveUserIdInLocalStorage(data.user.id);
            callback(data.user.id ? {taboolaId: data.user.id} : undefined);
            return;
          }
        } catch (err) {
          logError('Taboola user-sync: error parsing JSON response', err);
        }
        callback(currentId ? {taboolaId: currentId} : undefined);
      },
      error: (err) => {
        logError('Taboola user-sync: network/endpoint error', err);
        callback(currentId ? {taboolaId: currentId} : undefined);
      }
    },
    undefined,
    {method: 'GET', withCredentials: true}
  );
}

/**
 * The Taboola ID submodule for Prebid's user ID framework.
 */
export const taboolaIdSubmodule = {
  name: 'taboolaId',
  gvlid: GVLID,

  /**
   * decode transforms a stored string ID into { taboolaId: 'xyz' }
   */
  decode(value) {
    if (typeof value === 'string' && value !== '0') {
      return { taboolaId: value };
    }
    if (typeof value === 'object' && value.taboolaId) {
      return { taboolaId: value.taboolaId };
    }
    return undefined;
  },

  /**
   * getId is called by Prebid on initialization to retrieve an existing ID
   * and define an async callback for user sync.
   */
  getId(submoduleConfig) {
    const foundId = userData.getUserId();
    const callbackFn = (cb) => {
      callTaboolaUserSync(submoduleConfig, foundId, cb);
    };
    return {
      id: (foundId && foundId !== '0') ? foundId : undefined,
      callback: callbackFn
    };
  },

  eids: {
    'taboolaId': {
      source: 'taboola.com',
      atype: 1
    }
  }
};

submodule('userId', taboolaIdSubmodule);
