/**
 * This module adds IntentIqId to the User ID module
 * The {@link module:modules/userId} module is required
 * @module modules/intentIqIdSystem
 * @requires module:modules/userId
 */

import * as utils from '../src/utils.js'
import {ajax} from '../src/ajax.js';
import {submodule} from '../src/hook.js'
import {getStorageManager} from '../src/storageManager.js';

const PCID_EXPIRY = 365;

const MODULE_NAME = 'intentIqId';
export const FIRST_PARTY_KEY = '_iiq_fdata';

export const storage = getStorageManager(undefined, MODULE_NAME);

const NOT_AVAILABLE = 'NA';

/**
 * Verify the response is valid - Id value or Not Found (ignore not available response)
 * @param response
 * @param respJson - parsed json response
 * @returns {boolean}
 */
function isValidResponse(response, respJson) {
  if (!response || response == '' || response === NOT_AVAILABLE) {
    // Empty or NA response
    return false;
  } else if (respJson && (respJson.RESULT === NOT_AVAILABLE || respJson.data == '' || respJson.data === NOT_AVAILABLE)) {
    // Response type is json with value NA
    return false;
  } else { return true; }
}

/**
 * Verify the response json is valid
 * @param respJson - parsed json response
 * @returns {boolean}
 */
function isValidResponseJson(respJson) {
  if (respJson && 'data' in respJson) {
    return true;
  } else { return false; }
}

/**
 * Generate standard UUID string
 * @return {string}
 */
function generateGUID() {
  let d = new Date().getTime();
  const guid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (d + Math.random() * 16) % 16 | 0;
    d = Math.floor(d / 16);
    return (c == 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
  return guid;
}

/**
 * Read Intent IQ data from cookie or local storage
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
    utils.logError(error);
  }
}

/**
 * Store Intent IQ data in either cookie or local storage
 * expiration date: 365 days
 * @param key
 * @param {string} value IntentIQ ID value to sintentIqIdSystem_spec.jstore
 */
function storeData(key, value) {
  try {
    utils.logInfo(MODULE_NAME + ': storing data: key=' + key + ' value=' + value);

    if (value) {
      if (storage.hasLocalStorage()) {
        storage.setDataInLocalStorage(key, value);
      }
      const expiresStr = (new Date(Date.now() + (PCID_EXPIRY * (60 * 60 * 24 * 1000)))).toUTCString();
      if (storage.cookiesAreEnabled()) {
        storage.setCookie(key, value, expiresStr, 'LAX');
      }
    }
  } catch (error) {
    utils.logError(error);
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
    utils.logError(err);
    return null;
  }
}

/** @type {Submodule} */
export const intentIqIdSubmodule = {
  /**
   * used to link submodule with config
   * @type {string}
   */
  name: MODULE_NAME,
  /**
   * decode the stored id value for passing to bid requests
   * @function
   * @param {{string}} value
   * @returns {{intentIqId: {string}}|undefined}
   */
  decode(value) {
    return isValidResponse(value, undefined) ? { 'intentIqId': value } : undefined;
  },
  /**
   * performs action to obtain id and return a value in the callback's response argument
   * @function
   * @param {SubmoduleConfig} [config]
   * @returns {IdResponse|undefined}
   */
  getId(config) {
    const configParams = (config && config.params) || {};
    if (!configParams || typeof configParams.partner !== 'number') {
      utils.logError('User ID - intentIqId submodule requires a valid partner to be defined');
      return;
    }

    // Read Intent IQ 1st party id or generate it if none exists
    let firstPartyData = tryParse(readData(FIRST_PARTY_KEY));
    if (!firstPartyData || !firstPartyData.pcid) {
      const firstPartyId = generateGUID();
      firstPartyData = { 'pcid': firstPartyId };
      storeData(FIRST_PARTY_KEY, JSON.stringify(firstPartyData));
    }

    // use protocol relative urls for http or https
    let url = `https://api.intentiq.com/profiles_engine/ProfilesEngineServlet?at=39&mi=10&dpi=${configParams.partner}&pt=17&dpn=1`;
    url += configParams.pcid ? '&pcid=' + encodeURIComponent(configParams.pcid) : '';
    url += configParams.pai ? '&pai=' + encodeURIComponent(configParams.pai) : '';
    if (firstPartyData) {
      url += firstPartyData.pcid ? '&iiqidtype=2&iiqpcid=' + encodeURIComponent(firstPartyData.pcid) : '';
      url += firstPartyData.pid ? '&pid=' + encodeURIComponent(firstPartyData.pid) : '';
    }

    const resp = function (callback) {
      const callbacks = {
        success: response => {
          let respJson = tryParse(response);
          if (isValidResponse(response, respJson) && isValidResponseJson(respJson)) {
            // Store pid field if found in response json
            if (firstPartyData && 'pcid' in firstPartyData && 'pid' in respJson) {
              firstPartyData = {
                'pcid': firstPartyData.pcid,
                'pid': respJson.pid }
              storeData(FIRST_PARTY_KEY, JSON.stringify(firstPartyData));
            }
            callback(respJson.data);
          } else {
            callback();
          }
        },
        error: error => {
          utils.logError(MODULE_NAME + ': ID fetch encountered an error', error);
          callback();
        }
      };
      ajax(url, callbacks, undefined, {method: 'GET', withCredentials: true});
    };
    return {callback: resp};
  }
};

submodule('userId', intentIqIdSubmodule);
