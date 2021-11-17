/**
 * This module adds LotamePanoramaId to the User ID module
 * The {@link module:modules/userId} module is required
 * @module modules/lotamePanoramaId
 * @requires module:modules/userId
 */
import { timestamp, isStr, logError, isBoolean, buildUrl, isEmpty, isArray } from '../src/utils.js';
import { ajax } from '../src/ajax.js';
import { submodule } from '../src/hook.js';
import { getStorageManager } from '../src/storageManager.js';

const KEY_ID = 'panoramaId';
const KEY_EXPIRY = `${KEY_ID}_expiry`;
const KEY_PROFILE = '_cc_id';
const MODULE_NAME = 'lotamePanoramaId';
const NINE_MONTHS_MS = 23328000 * 1000;
const DAYS_TO_CACHE = 7;
const DAY_MS = 60 * 60 * 24 * 1000;
const MISSING_CORE_CONSENT = 111;
const GVLID = 95;

export const storage = getStorageManager(GVLID, MODULE_NAME);
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
  if (storage.cookiesAreEnabled()) {
    return storage.getCookie(KEY_PROFILE, undefined);
  }
  if (storage.hasLocalStorage()) {
    return storage.getDataFromLocalStorage(KEY_PROFILE, undefined);
  }
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
    if (storedValueExp === '') {
      value = storage.getDataFromLocalStorage(key, undefined);
    } else if (storedValueExp) {
      if ((new Date(storedValueExp)).getTime() - Date.now() > 0) {
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
 */
function getLotameLocalCache() {
  let cache = {
    data: getFromStorage(KEY_ID),
    expiryTimestampMs: 0,
  };

  try {
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
    let localCache = getLotameLocalCache();

    let refreshNeeded = Date.now() > localCache.expiryTimestampMs;

    if (!refreshNeeded) {
      return {
        id: localCache.data,
      };
    }

    const storedUserId = getProfileId();

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
      const url = buildUrl({
        protocol: 'https',
        host: `id.crwdcntrl.net`,
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
              const shouldUpdateProfileId = !(
                isArray(responseObj.errors) &&
                responseObj.errors.indexOf(MISSING_CORE_CONSENT) !== -1
              );

              saveLotameCache(KEY_EXPIRY, responseObj.expiry_ts, responseObj.expiry_ts);

              if (isStr(responseObj.profile_id)) {
                if (shouldUpdateProfileId) {
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
                if (shouldUpdateProfileId) {
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
