/**
 * This module adds UID 2.0 ID support to the User ID module
 * The {@link module:modules/userId} module is required.
 * @module modules/uid20IdSystem
 * @requires module:modules/userId
 */

import * as utils from '../src/utils.js'
import {submodule} from '../src/hook.js';
import {getStorageManager} from '../src/storageManager.js';

const storage = getStorageManager();

const MODULE_NAME = 'uid20';
const GVLID = 887;
const LOG_PRE_FIX = 'UID20: ';
const ADVERTISING_COOKIE = '__uid2_advertising_token';

const logInfo = createLogInfo(LOG_PRE_FIX);

function createLogInfo(prefix) {
  return function (...strings) {
    utils.logInfo(prefix + ' ', ...strings);
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
    result.uid20 = bidIds;
    logInfo('Decoded value ' + JSON.stringify(result));
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
   * @returns {{sharedid:{ id: string, third:string}} or undefined if value doesn't exists
   */
  decode(value) {
    return (value) ? encodeId(value) : undefined;
  },

  /**
   * performs action to obtain id and return a value.
   * @function
   * @param {SubmoduleConfig} [config]
   * @param {ConsentData|undefined} consentData
   * @returns {sharedId}
   */
  getId(config, consentData) {
    logInfo('Creating UID2');
    let value = storage.getCookie(ADVERTISING_COOKIE);
    logInfo('The advestising token: ' + value);
    return {id: value}
  },

  /**
   * performs actions even if the id exists and returns a value
   * @param config
   * @param consentData
   * @param storedId
   * @returns {{callback: *}}
   */
  extendId(config, consentData, storedId) {
    logInfo('Existing id ' + storedId);
    let value = storage.getCookie(ADVERTISING_COOKIE);
    return {id: value}
  }
};

// Register submodule for userId
submodule('userId', uid2IdSubmodule);
