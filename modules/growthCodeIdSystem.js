/**
 * This module adds GrowthCodeId to the User ID module
 * The {@link module:modules/userId} module is required
 * @module modules/growthCodeIdSystem
 * @requires module:modules/userId
 */

import {logError, logInfo, tryAppendQueryString} from '../src/utils.js';
import {ajax} from '../src/ajax.js';
import { submodule } from '../src/hook.js'
import { getStorageManager } from '../src/storageManager.js';

const GCID_EXPIRY = 7;
const MODULE_NAME = 'growthCodeId';
const GC_DATA_KEY = '_gc_data';
const ENDPOINT_URL = 'https://p2.gcprivacy.com/v1/pb?'

export const storage = getStorageManager({ gvlid: undefined, moduleName: MODULE_NAME });

/**
 * Read GrowthCode data from cookie or local storage
 * @param key
 * @return {string}
 */
export function readData(key) {
  try {
    let payload
    if (storage.cookiesAreEnabled()) {
      payload = tryParse(storage.getCookie(key))
    }
    if (storage.hasLocalStorage()) {
      payload = tryParse(storage.getDataFromLocalStorage(key))
    }
    if ((payload.expire_at !== undefined) && (payload.expire_at > (Date.now() / 1000))) {
      return payload
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
  getId(config, consentData) {
    const configParams = (config && config.params) || {};
    if (!configParams || typeof configParams.pid !== 'string') {
      logError('User ID - GrowthCodeID submodule requires a valid Partner ID to be defined');
      return;
    }

    const gdpr = (consentData && typeof consentData.gdprApplies === 'boolean' && consentData.gdprApplies) ? 1 : 0;
    const consentString = gdpr ? consentData.consentString : '';
    if (gdpr && !consentString) {
      logInfo('Consent string is required to call GrowthCode id.');
      return;
    }

    let publisherId = configParams.publisher_id ? configParams.publisher_id : '_sharedID';

    let sharedId;
    if (configParams.publisher_id_storage === 'html5') {
      sharedId = storage.getDataFromLocalStorage(publisherId, null) ? (storage.getDataFromLocalStorage(publisherId, null)) : null;
    } else {
      sharedId = storage.getCookie(publisherId, null) ? (storage.getCookie(publisherId, null)) : null;
    }
    if (!sharedId) {
      logError('User ID - Publisher ID is not correctly setup.');
    }

    const resp = function(callback) {
      let gcData = readData(GC_DATA_KEY);
      if (gcData) {
        callback(gcData);
      } else {
        let segment = window.location.pathname.substr(1).replace(/\/+$/, '');
        if (segment === '') {
          segment = 'home';
        }

        let url = configParams.url ? configParams.url : ENDPOINT_URL;
        url = tryAppendQueryString(url, 'pid', configParams.pid);
        url = tryAppendQueryString(url, 'uid', sharedId);
        url = tryAppendQueryString(url, 'u', window.location.href);
        url = tryAppendQueryString(url, 'h', window.location.hostname);
        url = tryAppendQueryString(url, 's', segment);
        url = tryAppendQueryString(url, 'r', document.referrer);

        ajax(url, {
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
        }, undefined, {method: 'GET', withCredentials: true})
      }
    };
    return { callback: resp };
  }
};

submodule('userId', growthCodeIdSubmodule);
