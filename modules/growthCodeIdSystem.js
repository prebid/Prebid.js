/**
 * This module adds GrowthCodeId to the User ID module
 * The {@link module:modules/userId} module is required
 * @module modules/growthCodeIdSystem
 * @requires module:modules/userId
 */

import { logError, logInfo } from '../src/utils.js';
import { ajax } from '../src/ajax.js';
import { submodule } from '../src/hook.js'
import { getStorageManager } from '../src/storageManager.js';

const GCID_EXPIRY = 45;

const MODULE_NAME = 'growthCodeId';
export const GC_DATA_KEY = '_gc_data';

export const storage = getStorageManager({ gvlid: undefined, moduleName: MODULE_NAME });

/**
 * Read GrowthCode data from cookie or local storage
 * @param key
 * @return {string}
 */
export function readData(key) {
  try {
    if (storage.hasLocalStorage()) {
      return storage.getDataFromLocalStorage(key);
    }
    if (storage.cookiesAreEnabled()) {
      return storage.getCookie(key);
    }
  } catch (error) {
    logError(error);
  }
}

/**
 * Store GrowthCode data in either cookie or local storage
 * expiration date: 45 days
 * @param key
 * @param {string} value
 */
function storeData(key, value) {
  try {
    logInfo(MODULE_NAME + ': storing data: key=' + key + ' value=' + value);

    if (value) {
      if (storage.hasLocalStorage()) {
        storage.setDataInLocalStorage(key, value);
      }
      const expiresStr = (new Date(Date.now() + (GCID_EXPIRY * (60 * 60 * 24 * 1000)))).toUTCString();
      if (storage.cookiesAreEnabled()) {
        storage.setCookie(key, value, expiresStr, 'LAX');
      }
    }
  } catch (error) {
    logError(error);
  }
}

/**
 * Parse json if possible, else return null
 * @param data
 * @param {object|null}
 */
function tryParse(data) {
  try {
    return JSON.parse(data);
  } catch (err) {
    logError(err);
    return null;
  }
}

/** @type {Submodule} */
export const growthCodeIdSubmodule = {
  /**
   * used to link submodule with config
   * @type {string}
   */
  name: MODULE_NAME,
  /**
   * decode the stored id value for passing to bid requests
   * @function
   * @param {{string}} value
   * @returns {{growthCodeId: {string}}|undefined}
   */
  decode(value) {
    return value && value !== '' ? { 'growthCodeId': value } : undefined;
  },
  /**
   * performs action to obtain id and return a value in the callback's response argument
   * @function
   * @param {SubmoduleConfig} [config]
   * @returns {IdResponse|undefined}
   */
  getId(config) {
    const configParams = (config && config.params) || {};
    if (!configParams || typeof configParams.pid !== 'string') {
      logError('User ID - GrowthCodeID submodule requires a valid Partner ID to be defined');
      return;
    }

    let sharedId = storage.getDataFromLocalStorage('_sharedid') ? (storage.getDataFromLocalStorage('_sharedid')) : null;
    if (!sharedId) {
      logError('User ID - SharedId Module Must be activated and storage set to html5');
      return;
    }

    let gcData = tryParse(readData(GC_DATA_KEY))
    if (gcData) {
      const resp = function (callback) {
        callback(gcData)
      }
      return { callback: resp };
    } else {
      let segment = window.location.pathname.substr(1).replace(/\/+$/, '');
      if (segment === '') {
        segment = 'home';
      }

      let url = configParams.url ? configParams.url : 'https://p2.gcprivacy.com/pb';
      url += '?pid=' + encodeURIComponent(configParams.pid);
      url += '&uid=' + encodeURIComponent(sharedId);
      url += '&u=' + encodeURIComponent(window.location.href);
      url += '&h=' + encodeURIComponent(window.location.hostname);
      url += '&s=' + encodeURIComponent(segment);
      url += '&r=' + encodeURIComponent(document.referrer);

      const resp = function (callback) {
        const callbacks = {
          success: response => {
            let respJson = tryParse(response);
            // If response is a valid json and should save is true
            if (respJson) {
              storeData(GC_DATA_KEY, JSON.stringify(respJson))
              callback(respJson);
            } else {
              callback();
            }
          },
          error: error => {
            logError(MODULE_NAME + ': ID fetch encountered an error', error);
            callback();
          }
        };
        ajax(url, callbacks, undefined, { method: 'GET', withCredentials: true });
      };
      return { callback: resp };
    }
  }
};

submodule('userId', growthCodeIdSubmodule);
