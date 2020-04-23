/**
 * This module adds Shared ID support to the User ID module
 * The {@link module:modules/userId} module is required.
 * @module modules/sharedIdSystem
 * @requires module:modules/userId
 */

import * as utils from '../src/utils.js'
import {ajax} from '../src/ajax.js';
import {submodule} from '../src/hook.js';
import * as sharedIdGenerator from '../src/sharedIdGenerator.js';
import {getStorageManager} from '../src/storageManager.js';

const MODULE_NAME = 'sharedId';
const ID_SVC = 'https://id-qa.sharedid.org/id';
const storage = getStorageManager(null, MODULE_NAME);
const EXP_28_DAYS = 40320
const SHARED_ID_ULID_TRACKER = 'sharedid_ns'

/**
 * id generation call back
 * @param result
 * @param callback
 * @returns {{success: success, error: error}}
 */
function idGenerationCallback(result, callback) {
  return {
    success: function (responseBody) {
      let responseObj;
      if (responseBody) {
        try {
          responseObj = JSON.parse(responseBody);
          result.id = responseObj.sharedId;
          utils.logInfo('SharedId: Generated SharedId: ' + result.id);
        } catch (error) {
          utils.logError(error);
        }
      }
      callback(result.id);
    },
    error: function (statusText, responseBody) {
      result.id = sharedIdGenerator.id();
      utils.logInfo('SharedId: Ulid Generated SharedId: ' + result.id);
      setSharedIdTrackerCookie(result.id);
      callback(result.id);
    }
  }
}

/**
 * existing id generation call back
 * @param result
 * @param callback
 * @returns {{success: success, error: error}}
 */
function existingIdCallback(result, callback) {
  return {
    success: function () {
      try {
        utils.logInfo('SharedId: Synced: ' + result.id);
        clearSharedIdTracker();
      } catch (error) {
        utils.logError(error);
      }
      callback(result.id);
    },
    error: function () {
      utils.logInfo('SharedId: Sync error for id : ' + result.id);
      callback(result.id);
    }
  }
}

/**
 * Write a value to cookies
 * @param {string} value Value to be store
 */
function setSharedIdTrackerCookie(value) {
  if (value) {
    utils.logInfo('SharedId: Writing to the ' + SHARED_ID_ULID_TRACKER + ' cookies ');
    let expTime = new Date();
    expTime.setTime(expTime.getTime() + EXP_28_DAYS * 1000 * 60);
    storage.setCookie(SHARED_ID_ULID_TRACKER, value, expTime);
  }
}

function clearSharedIdTracker() {
  let existingCookie = readValue(SHARED_ID_ULID_TRACKER);
  if (existingCookie != undefined) {
    utils.logInfo('SharedId: Clearing ' + SHARED_ID_ULID_TRACKER + ' cookies ');
    storage.setCookie(SHARED_ID_ULID_TRACKER, '');
  }
}

function readValue(name) {
  let value = storage.getCookie(name);
  if (value === 'undefined' || value === 'null' || value === '') {
    utils.logInfo(SHARED_ID_ULID_TRACKER + ' cookies is empty/undefined/null ');
    return undefined;
  }
  utils.logInfo('SharedId: Reading the  ' + SHARED_ID_ULID_TRACKER + ' cookies ' + value);
  return value;
}

/** @type {Submodule} */
export const sharedIdSubmodule = {
  /**
   * used to link submodule with config
   * @type {string}
   */
  name: MODULE_NAME,

  /**
   * decode the stored id value for passing to bid requests
   * @function
   * @param {string} value
   * @returns {{sharedid:string}} or undefined if value doesn't exists
   */
  decode(value) {
    return (value && typeof value['sharedid'] === 'string') ? {'sharedid': value['sharedid']} : undefined;
  },

  /**
   * performs action to obtain id and return a value.
   * @function
   * @param {SubmoduleParams} [configParams]
   * @returns {sharedId}
   */
  getId(configParams) {
    var result = {
      id: null
    }
    const resp = function (callback) {
      utils.logInfo('SharedId: Sharedid doesnt exists, new cookie creation');

      ajax(ID_SVC, idGenerationCallback(result, callback), undefined, {method: 'GET', withCredentials: true});
    };
    return {callback: resp};
  },

  /**
   * performs actions even if the id exists and returns a value
   * @param configParams
   * @param storedId
   * @returns {{callback: *}}
   */
  extendId(configParams, storedId) {
    utils.logInfo('SharedId: Existing shared id ' + storedId);
    var result = {
      id: storedId
    }
    const resp = function (callback) {
      let existingCookie = readValue(SHARED_ID_ULID_TRACKER);
      if (existingCookie) {
        let sharedIdPayload = {};
        sharedIdPayload.sharedId = storedId;
        let payloadString = JSON.stringify(sharedIdPayload);
        ajax(ID_SVC, existingIdCallback(result, callback), payloadString, {method: 'POST', withCredentials: true});
      }
    };
    return {callback: resp};
  }
};

// Register submodule for userId
submodule('userId', sharedIdSubmodule);
