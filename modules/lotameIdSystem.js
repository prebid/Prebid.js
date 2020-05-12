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

const STORAGE_ID = '_cc_id';
const MODULE_NAME = 'lotameId';
const NINE_MONTHS_IN_SECONDS = 23328000;
export const storage = getStorageManager(null, MODULE_NAME);

function setFirstPartyId(profileId) {
  if (storage.cookiesAreEnabled()) {
    let expirationDate = new Date(Date.now() + NINE_MONTHS_IN_SECONDS * 1000).toUTCString();
    storage.setCookie(STORAGE_ID, profileId, expirationDate, 'Lax', undefined, undefined);
  }
  if (storage.hasLocalStorage()) {
    storage.setDataInLocalStorage(STORAGE_ID, profileId, undefined);
  }
}

function getFirstPartyId() {
  if (storage.cookiesAreEnabled()) {
    return storage.getCookie(STORAGE_ID, undefined);
  }
  if (storage.hasLocalStorage()) {
    return storage.getDataFromLocalStorage(STORAGE_ID, undefined);
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
    return value && typeof value['panorama_id'] === 'string'
      ? { lotameId: value['panorama_id'] }
      : undefined;
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
