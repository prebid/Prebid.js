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

const MODULE_NAME = 'sharedId';
const ID_SVC = 'https://id.sharedid.org/id';
const DEFAULT_24_HOURS = 86400;
const OPT_OUT_VALUE = '00000000000000000000000000';

/**
 * Constructs cookie value
 * @param value
 * @param needsSync
 * @returns {string}
 */
function constructCookieValue(value, needsSync) {
  let cookieValue = {};
  cookieValue.id = value;
  cookieValue.ts = utils.timestamp();
  if (needsSync) {
    cookieValue.ns = true;
  }
  utils.logInfo('SharedId: cookie Value: ' + JSON.stringify(cookieValue));
  return cookieValue;
}

/**
 * Checks if id needs to be synced
 * @param configParams
 * @param storedId
 * @returns {boolean}
 */
function isIdSynced(configParams, storedId) {
  var needSync = storedId.ns;
  if (needSync) {
    return true;
  }
  if (!configParams || typeof configParams.syncTime !== 'number') {
    utils.logInfo('SharedId: Sync time is not configured or is not a number');
  }
  var syncTime = (!configParams || typeof configParams.syncTime !== 'number') ? DEFAULT_24_HOURS : configParams.syncTime;
  if (syncTime > DEFAULT_24_HOURS) {
    syncTime = DEFAULT_24_HOURS;
  }
  var cookieTimestamp = storedId.ts;
  if (cookieTimestamp) {
    var secondBetweenTwoDate = timeDifferenceInSeconds(utils.timestamp(), cookieTimestamp);
    return secondBetweenTwoDate >= syncTime;
  }
  return false;
}

/**
 * Gets time difference in secounds
 * @param date1
 * @param date2
 * @returns {number}
 */
function timeDifferenceInSeconds(date1, date2) {
  var diff = (date1 - date2) / 1000;
  return Math.abs(Math.round(diff));
}

/**
 * id generation call back
 * @param result
 * @param callback
 * @returns {{success: success, error: error}}
 */
function idGenerationCallback(callback) {
  return {
    success: function (responseBody) {
      var value = {};
      if (responseBody) {
        try {
          let responseObj = JSON.parse(responseBody);
          utils.logInfo('SharedId: Generated SharedId: ' + responseObj.sharedId);
          value = constructCookieValue(responseObj.sharedId, false);
        } catch (error) {
          utils.logError(error);
        }
      }
      callback(value);
    },
    error: function (statusText, responseBody) {
      var value = constructCookieValue(sharedIdGenerator.id(), true);
      utils.logInfo('SharedId: Ulid Generated SharedId: ' + value.id);
      callback(value);
    }
  }
}

/**
 * existing id generation call back
 * @param result
 * @param callback
 * @returns {{success: success, error: error}}
 */
function existingIdCallback(storedId, callback) {
  return {
    success: function (responseBody) {
      try {
        utils.logInfo('SharedId: id to be synced: ' + storedId.id);
        if (responseBody) {
          try {
            let responseObj = JSON.parse(responseBody);
            storedId = constructCookieValue(responseObj.sharedId, false);
            utils.logInfo('SharedId: Older SharedId: ' + storedId.id);
          } catch (error) {
            utils.logError(error);
          }
        }
      } catch (error) {
        utils.logError(error);
      }
      callback(storedId);
    },
    error: function () {
      utils.logInfo('SharedId: Sync error for id : ' + storedId.id);
      callback(storedId);
    }
  }
}

/**
 * Encode the id
 * @param value
 * @returns {string|*}
 */
function encodeId(value) {
  try {
    let result = {};
    let sharedId = (value && typeof value['id'] === 'string') ? value['id'] : undefined;
    if (sharedId == OPT_OUT_VALUE) {
      return undefined;
    }
    if (sharedId) {
      var bidIds = {
        first: sharedId,
      }
      let ns = (value && typeof value['ns'] === 'boolean') ? value['ns'] : undefined;
      if (ns == undefined) {
        bidIds.third = sharedId;
      }
      result.sharedid = bidIds;
      utils.logInfo('SharedId: Decoded value ' + JSON.stringify(result));
      return result;
    }
    return sharedId;
  } catch (ex) {
    return value;
  }
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
   * @returns {{sharedid:{ 1: string, 3:string}} or undefined if value doesn't exists
   */
  decode(value) {
    return ((value) ? encodeId(value) : undefined);
  },

  /**
   * performs action to obtain id and return a value.
   * @function
   * @param {SubmoduleParams} [configParams]
   * @returns {sharedId}
   */
  getId(configParams) {
    const resp = function (callback) {
      utils.logInfo('SharedId: Sharedid doesnt exists, new cookie creation');
      ajax(ID_SVC, idGenerationCallback(callback), undefined, {method: 'GET', withCredentials: true});
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
    utils.logInfo('SharedId: Existing shared id ' + storedId.id);
    const resp = function (callback) {
      let needSync = isIdSynced(configParams, storedId);
      if (needSync) {
        utils.logInfo('SharedId: Existing shared id ' + storedId + ' is not synced');
        let sharedIdPayload = {};
        sharedIdPayload.sharedId = storedId.id;
        let payloadString = JSON.stringify(sharedIdPayload);
        ajax(ID_SVC, existingIdCallback(storedId, callback), payloadString, {method: 'POST', withCredentials: true});
      }
    };
    return {callback: resp};
  }
};

// Register submodule for userId
submodule('userId', sharedIdSubmodule);
