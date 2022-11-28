/**
 * This module adds LotamePanoramaId to the User ID module
 * The {@link module:modules/userId} module is required
 * @module modules/lotamePanoramaId
 * @requires module:modules/userId
 */
import {
  timestamp,
  isStr,
  logError,
  isBoolean,
  buildUrl,
  isEmpty,
  isArray,
  isEmptyStr
} from '../src/utils.js';
import { ajax } from '../src/ajax.js';
import { submodule } from '../src/hook.js';
import { getStorageManager } from '../src/storageManager.js';
import { uspDataHandler } from '../src/adapterManager.js';

const KEY_ID = 'panoramaId';
const KEY_EXPIRY = `${KEY_ID}_expiry`;
const KEY_PROFILE = '_cc_id';
const MODULE_NAME = 'lotamePanoramaId';
const NINE_MONTHS_MS = 23328000 * 1000;
const DAYS_TO_CACHE = 7;
const DAY_MS = 60 * 60 * 24 * 1000;
const MISSING_CORE_CONSENT = 111;
const GVLID = 95;
const ID_HOST = 'id.crwdcntrl.net';

export const storage = getStorageManager({gvlid: GVLID, moduleName: MODULE_NAME});
let cookieDomain;

/**
 * Set the Lotame First Party Profile ID in the first party namespace
 * @param {String} profileId
 */
function setProfileId(profileId) {
  if (storage.cookiesAreEnabled()) {
    let expirationDate = new Date(timestamp() + NINE_MONTHS_MS).toUTCString();
    storage.setCookie(
      KEY_PROFILE,
      profileId,
      expirationDate,
      'Lax',
      cookieDomain,
      undefined
    );
  }
  if (storage.hasLocalStorage()) {
    storage.setDataInLocalStorage(KEY_PROFILE, profileId, undefined);
  }
}

/**
 * Get the Lotame profile id by checking cookies first and then local storage
 */
function getProfileId() {
  let profileId;
  if (storage.cookiesAreEnabled()) {
    profileId = storage.getCookie(KEY_PROFILE, undefined);
  }
  if (!profileId && storage.hasLocalStorage()) {
    profileId = storage.getDataFromLocalStorage(KEY_PROFILE, undefined);
  }
  return profileId;
}

/**
 * Get a value from browser storage by checking cookies first and then local storage
 * @param {String} key
 */
function getFromStorage(key) {
  let value = null;
  if (storage.cookiesAreEnabled()) {
    value = storage.getCookie(key, undefined);
  }
  if (storage.hasLocalStorage() && value === null) {
    const storedValueExp = storage.getDataFromLocalStorage(
      `${key}_exp`, undefined
    );

    if (storedValueExp === '' || storedValueExp === null) {
      value = storage.getDataFromLocalStorage(key, undefined);
    } else if (storedValueExp) {
      if ((new Date(parseInt(storedValueExp, 10))).getTime() - Date.now() > 0) {
        value = storage.getDataFromLocalStorage(key, undefined);
      }
    }
  }
  return value;
}

/**
 * Save a key/value pair to the browser cache (cookies and local storage)
 * @param {String} key
 * @param {String} value
 * @param {Number} expirationTimestamp
 */
function saveLotameCache(
  key,
  value,
  expirationTimestamp = timestamp() + DAYS_TO_CACHE * DAY_MS
) {
  if (key && value) {
    let expirationDate = new Date(expirationTimestamp).toUTCString();
    if (storage.cookiesAreEnabled()) {
      storage.setCookie(
        key,
        value,
        expirationDate,
        'Lax',
        cookieDomain,
        undefined
      );
    }
    if (storage.hasLocalStorage()) {
      storage.setDataInLocalStorage(
        `${key}_exp`,
        String(expirationTimestamp),
        undefined
      );
      storage.setDataInLocalStorage(key, value, undefined);
    }
  }
}

/**
 * Retrieve all the cached values from cookies and/or local storage
 * @param {Number} clientId
 */
function getLotameLocalCache(clientId = undefined) {
  let cache = {
    data: getFromStorage(KEY_ID),
    expiryTimestampMs: 0,
    clientExpiryTimestampMs: 0,
  };

  try {
    if (clientId) {
      const rawClientExpiry = getFromStorage(`${KEY_EXPIRY}_${clientId}`);
      if (isStr(rawClientExpiry)) {
        cache.clientExpiryTimestampMs = parseInt(rawClientExpiry, 10);
      }
    }

    const rawExpiry = getFromStorage(KEY_EXPIRY);
    if (isStr(rawExpiry)) {
      cache.expiryTimestampMs = parseInt(rawExpiry, 10);
    }
  } catch (error) {
    logError(error);
  }

  return cache;
}

/**
 * Clear a cached value from cookies and local storage
 * @param {String} key
 */
function clearLotameCache(key) {
  if (key) {
    if (storage.cookiesAreEnabled()) {
      let expirationDate = new Date(0).toUTCString();
      storage.setCookie(
        key,
        '',
        expirationDate,
        'Lax',
        cookieDomain,
        undefined
      );
    }
    if (storage.hasLocalStorage()) {
      storage.removeDataFromLocalStorage(key, undefined);
    }
  }
}
/** @type {Submodule} */
export const lotamePanoramaIdSubmodule = {
  /**
   * used to link submodule with config
   * @type {string}
   */
  name: MODULE_NAME,

  /**
   * Vendor id of Lotame
   * @type {Number}
   */
  gvlid: GVLID,

  /**
   * Decode the stored id value for passing to bid requests
   * @function decode
   * @param {(Object|string)} value
   * @param {SubmoduleConfig|undefined} config
   * @returns {(Object|undefined)}
   */
  decode(value, config) {
    return isStr(value) ? { lotamePanoramaId: value } : undefined;
  },

  /**
   * Retrieve the Lotame Panorama Id
   * @function
   * @param {SubmoduleConfig} [config]
   * @param {ConsentData} [consentData]
   * @param {(Object|undefined)} cacheIdObj
   * @returns {IdResponse|undefined}
   */
  getId(config, consentData, cacheIdObj) {
    cookieDomain = lotamePanoramaIdSubmodule.findRootDomain();
    const configParams = (config && config.params) || {};
    const clientId = configParams.clientId;
    const hasCustomClientId = !isEmpty(clientId);
    const localCache = getLotameLocalCache(clientId);

    const hasExpiredPanoId = Date.now() > localCache.expiryTimestampMs;

    if (hasCustomClientId) {
      const hasFreshClientNoConsent = Date.now() < localCache.clientExpiryTimestampMs;
      if (hasFreshClientNoConsent) {
        // There is no consent
        return {
          id: undefined,
          reason: 'NO_CLIENT_CONSENT',
        };
      }
    }

    if (!hasExpiredPanoId) {
      return {
        id: localCache.data,
      };
    }

    const storedUserId = getProfileId();

    // Add CCPA Consent data handling
    const usp = uspDataHandler.getConsentData();

    let usPrivacy;
    if (typeof usp !== 'undefined' && !isEmpty(usp) && !isEmptyStr(usp)) {
      usPrivacy = usp;
    }
    if (!usPrivacy) {
      // fallback to 1st party cookie
      usPrivacy = getFromStorage('us_privacy');
    }

    const resolveIdFunction = function (callback) {
      let queryParams = {};
      if (storedUserId) {
        queryParams.fp = storedUserId;
      }

      let consentString;
      if (consentData) {
        if (isBoolean(consentData.gdprApplies)) {
          queryParams.gdpr_applies = consentData.gdprApplies;
        }
        consentString = consentData.consentString;
      }
      // If no consent string, try to read it from 1st party cookies
      if (!consentString) {
        consentString = getFromStorage('eupubconsent-v2');
      }
      if (!consentString) {
        consentString = getFromStorage('euconsent-v2');
      }
      if (consentString) {
        queryParams.gdpr_consent = consentString;
      }

      // Add usPrivacy to the url
      if (usPrivacy) {
        queryParams.us_privacy = usPrivacy;
      }

      // Add clientId to the url
      if (hasCustomClientId) {
        queryParams.c = clientId;
      }

      const url = buildUrl({
        protocol: 'https',
        host: ID_HOST,
        pathname: '/id',
        search: isEmpty(queryParams) ? undefined : queryParams,
      });
      ajax(
        url,
        (response) => {
          let coreId;
          if (response) {
            try {
              let responseObj = JSON.parse(response);
              const hasNoConsentErrors = !(
                isArray(responseObj.errors) &&
                responseObj.errors.indexOf(MISSING_CORE_CONSENT) !== -1
              );

              if (hasCustomClientId) {
                if (hasNoConsentErrors) {
                  clearLotameCache(`${KEY_EXPIRY}_${clientId}`);
                } else if (isStr(responseObj.no_consent) && responseObj.no_consent === 'CLIENT') {
                  saveLotameCache(
                    `${KEY_EXPIRY}_${clientId}`,
                    responseObj.expiry_ts,
                    responseObj.expiry_ts
                  );

                  // End Processing
                  callback();
                  return;
                }
              }

              saveLotameCache(KEY_EXPIRY, responseObj.expiry_ts, responseObj.expiry_ts);

              if (isStr(responseObj.profile_id)) {
                if (hasNoConsentErrors) {
                  setProfileId(responseObj.profile_id);
                }

                if (isStr(responseObj.core_id)) {
                  saveLotameCache(
                    KEY_ID,
                    responseObj.core_id,
                    responseObj.expiry_ts
                  );
                  coreId = responseObj.core_id;
                } else {
                  clearLotameCache(KEY_ID);
                }
              } else {
                if (hasNoConsentErrors) {
                  clearLotameCache(KEY_PROFILE);
                }
                clearLotameCache(KEY_ID);
              }
            } catch (error) {
              logError(error);
            }
          }
          callback(coreId);
        },
        undefined,
        {
          method: 'GET',
          withCredentials: true,
        }
      );
    };

    return { callback: resolveIdFunction };
  },
};

submodule('userId', lotamePanoramaIdSubmodule);
