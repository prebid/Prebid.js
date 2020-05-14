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

const PROFILE_ID_NAME = '_cc_id';
const MODULE_NAME = 'lotameId';
const NINE_MONTHS_IN_SECONDS = 23328000;
const DAYS_TO_CACHE = 7
const DAYS_IN_MILLISECONDS = 60 * 60 * 24 * 1000;

export const storage = getStorageManager(null, MODULE_NAME);

function setFirstPartyId(profileId) {
  if (storage.cookiesAreEnabled()) {
    let expirationDate = new Date(Date.now() + NINE_MONTHS_IN_SECONDS * 1000).toUTCString();
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
  return storage.getCookie(key) || storage.getDataFromLocalStorage(key);
}

function saveLotameCache(key, value) {
  if (key && value) {
    if (storage.cookiesAreEnabled()) {
      let expirationDate = new Date(
        Date.now() + DAYS_TO_CACHE * DAYS_IN_MILLISECONDS).toUTCString();
      storage.setCookie(key, value, expirationDate, 'Lax', undefined, undefined);
    }
    if (storage.hasLocalStorage()) {
      storage.setDataInLocalStorage(key, value, undefined);
    }
  }
}

function getLotameLocalCache() {
  let cache = {
    lastUpdate: new Date(),
    data: getFromStorage('_lota_pano'),
    bundle: {
      refreshSeconds: 3600
    }
  };

  try {
    cache.bundle = JSON.parse(getFromStorage('_lota_pano_bundle'));
  } catch (error) {
    utils.logError(error);
  }
  try {
    cache.lastUpdate = new Date(getFromStorage('_lota_last'));
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

    let refreshNeeded = true;
    if (!localCache.data) {
      const lastUpdate = localCache.lastUpdate;
      refreshNeeded = (Date.now() - lastUpdate.getTime()) > localCache.bundle.refreshSeconds * 1000;
    }

    if (!refreshNeeded) {
      return {};
    }

    const storedUserId = getFirstPartyId();
    const resolveIdFunction = function (callback) {
      const param = storedUserId ? `?profile_id=${storedUserId}` : '';
      const url = 'https://mconrad.dev.lotame.com:5555/panorama/id' + param;
      ajax(
        url,
        (response) => {
          let responseObj = {};
          if (response) {
            try {
              responseObj = JSON.parse(response);
              setFirstPartyId(responseObj.profile_id);
              saveLotameCache('_lota_last', new Date().toUTCString());
              if (utils.isStr(responseObj.panorama_id)) {
                saveLotameCache('_lota_pano', response.panorama_id);
              } else {
                clearLotameCache('_lota_pano');
              }
              // TODO: Get this from the response
              saveLotameCache('_lota_pano_bundle', JSON.stringify({
                refreshSeconds: 10
              }));
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
