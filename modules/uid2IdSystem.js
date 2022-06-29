/**
 * This module adds uid2 ID support to the User ID module
 * The {@link module:modules/userId} module is required.
 * @module modules/uid2IdSystem
 * @requires module:modules/userId
 */

import { logInfo } from '../src/utils.js';
import {submodule} from '../src/hook.js';
import { getStorageManager } from '../src/storageManager.js';

const MODULE_NAME = 'uid2';
const GVLID = 887;
const LOG_PRE_FIX = 'UID2: ';
const ADVERTISING_COOKIE = '__uid2_advertising_token';

function readCookie() {
  return storage.cookiesAreEnabled() ? storage.getCookie(ADVERTISING_COOKIE) : null;
}

function readFromLocalStorage() {
  return storage.localStorageIsEnabled() ? storage.getDataFromLocalStorage(ADVERTISING_COOKIE) : null;
}

function getStorage() {
  return getStorageManager({gvlid: GVLID, moduleName: MODULE_NAME});
}

const storage = getStorage();

const _logInfo = createLogInfo(LOG_PRE_FIX);

function createLogInfo(prefix) {
  return function (...strings) {
    logInfo(prefix + ' ', ...strings);
  }
}

/**
 * Encode the id
 * @param value
 * @returns {string|*}
 */
function encodeId(value) {
  const result = {};
  if (value) {
    const bidIds = {
      id: value
    }
    result.uid2 = bidIds;
    _logInfo('Decoded value ' + JSON.stringify(result));
    return result;
  }
  return undefined;
}

/** @type {Submodule} */
export const uid2IdSubmodule = {
  /**
   * used to link submodule with config
   * @type {string}
   */
  name: MODULE_NAME,

  /**
   * Vendor id of Prebid
   * @type {Number}
   */
  gvlid: GVLID,
  /**
   * decode the stored id value for passing to bid requests
   * @function
   * @param {string} value
   * @returns {{uid2:{ id: string }} or undefined if value doesn't exists
   */
  decode(value) {
    return (value) ? encodeId(value) : undefined;
  },

  /**
   * performs action to obtain id and return a value.
   * @function
   * @param {SubmoduleConfig} [config]
   * @param {ConsentData|undefined} consentData
   * @returns {uid2Id}
   */
  getId(config, consentData) {
    _logInfo('Creating UID 2.0');
    let value = readCookie() || readFromLocalStorage();
    _logInfo('The advertising token: ' + value);
    return {id: value}
  },

};

// Register submodule for userId
submodule('userId', uid2IdSubmodule);
