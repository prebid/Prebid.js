/**
 * This module adds LotameId to the User ID module
 * The {@link module:modules/userId} module is required
 * @module modules/lotameIdSystem
 * @requires module:modules/userId
 */
import * as utils from '../src/utils.js';
import { ajax } from '../src/ajax.js';
import { submodule } from '../src/hook.js';
import { getStorageManager } from '../src/storageManager.js';

const KEY_LAST_UPDATE = '_lota_last';
const KEY_ID = '_lota_pano';
const KEY_EXPIRY = '_lota_expiry';
const PROFILE_ID_NAME = '_cc_id';
const MODULE_NAME = 'lotameId';
const NINE_MONTHS_MS = 23328000 * 1000;
const DAYS_TO_CACHE = 7
const DAY_MS = 60 * 60 * 24 * 1000;

export const storage = getStorageManager(null, MODULE_NAME);

function setFirstPartyId(profileId) {
  if (storage.cookiesAreEnabled()) {
    let expirationDate = new Date(utils.timestamp() + NINE_MONTHS_MS).toUTCString();
    storage.setCookie(PROFILE_ID_NAME, profileId, expirationDate, 'Lax', undefined, undefined);
  }
  if (storage.hasLocalStorage()) {
    storage.setDataInLocalStorage(PROFILE_ID_NAME, profileId, undefined);
  }
}

function getFirstPartyId() {
  if (storage.cookiesAreEnabled()) {
    return storage.getCookie(PROFILE_ID_NAME, undefined);
  }
  if (storage.hasLocalStorage()) {
    return storage.getDataFromLocalStorage(PROFILE_ID_NAME, undefined);
  }
}

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

function saveLotameCache(
  key,
  value,
  expirationTimestamp = utils.timestamp() + DAYS_TO_CACHE * DAY_MS
) {
  if (key && value) {
    let expirationDate = new Date(expirationTimestamp).toUTCString();
    if (storage.cookiesAreEnabled()) {
      storage.setCookie(
        key,
        value,
        expirationDate,
        'Lax',
        undefined,
        undefined
      );
    }
    if (storage.hasLocalStorage()) {
      storage.setDataInLocalStorage(`${key}_exp`, expirationDate, undefined);
      storage.setDataInLocalStorage(key, value, undefined);
    }
  }
}

function getLotameLocalCache() {
  let cache = {
    lastUpdate: new Date(0),
    data: getFromStorage(KEY_ID),
    expiryMs: 0,
  };

  try {
    const rawExpiry = getFromStorage(KEY_EXPIRY);
    if (utils.isStr(rawExpiry)) {
      cache.expiryMs = parseInt(rawExpiry, 0);
    }
  } catch (error) {
    utils.logError(error);
  }
  try {
    const rawDate = getFromStorage(KEY_LAST_UPDATE);
    if (utils.isStr(rawDate)) {
      cache.lastUpdate = new Date(rawDate);
    }
  } catch (error) {
    utils.logError(error);
  }
  return cache;
}

function clearLotameCache(key) {
  if (key) {
    if (storage.cookiesAreEnabled()) {
      let expirationDate = new Date(0).toUTCString();
      storage.setCookie(key, '', expirationDate, 'Lax', undefined, undefined);
    }
    if (storage.hasLocalStorage()) {
      storage.removeDataFromLocalStorage(key, undefined);
    }
  }
}
/** @type {Submodule} */
export const lotameIdSubmodule = {
  /**
   * used to link submodule with config
   * @type {string}
   */
  name: MODULE_NAME,

  /**
   * Decode the stored id value for passing to bid requests
   * @function decode
   * @param {(Object|string)} value
   * @returns {(Object|undefined)}
   */
  decode(value, configParams) {
    return value;
  },

  /**
   * Retrieve the Lotame id
   * @function
   * @param {SubmoduleParams} [configParams]
   * @param {ConsentData} [consentData]
   * @param {(Object|undefined)} cacheIdObj
   * @returns {IdResponse|undefined}
   */
  getId(configParams, consentData, cacheIdObj) {
    let localCache = getLotameLocalCache();

    let refreshNeeded = false;
    if (!utils.isStr(localCache.data)) {
      refreshNeeded = Date.now() > localCache.expiryMs;
    }

    if (!refreshNeeded) {
      return {
        id: localCache.data
      };
    }

    const storedUserId = getFirstPartyId();
    const hasGdprData =
      consentData &&
      utils.isBoolean(consentData.gdprApplies) &&
      consentData.gdprApplies;
    const resolveIdFunction = function (callback) {
      let queryParams = {};
      if (storedUserId) {
        queryParams.fp = storedUserId
      }

      if (hasGdprData) {
        queryParams.gdpr_consent = consentData.consentString;
      }
      const url = utils.buildUrl({
        protocol: 'https',
        host: `mconrad.dev.lotame.com:5555`,
        pathname: '/id',
        search: utils.isEmpty(queryParams) ? undefined : queryParams
      });
      ajax(
        url,
        (response) => {
          let responseObj = {};
          if (response) {
            try {
              responseObj = JSON.parse(response);
              setFirstPartyId(responseObj.profile_id);
              saveLotameCache(KEY_LAST_UPDATE, new Date().toUTCString());
              saveLotameCache(KEY_EXPIRY, responseObj.expiry_ms);
              if (utils.isStr(responseObj.core_id)) {
                saveLotameCache(KEY_ID, responseObj.core_id, responseObj.expiry_ms);
              } else {
                clearLotameCache(KEY_ID);
              }
            } catch (error) {
              utils.logError(error);
            }
          }
          callback(responseObj);
        },
        undefined,
        { method: 'GET', withCredentials: true }
      );
    };

    return { callback: resolveIdFunction };
  },
};

submodule('userId', lotameIdSubmodule);
