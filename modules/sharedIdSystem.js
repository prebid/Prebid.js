/**
 * This module adds Shared ID support to the User ID module
 * The {@link module:modules/userId} module is required.
 * @module modules/sharedIdSystem
 * @requires module:modules/userId
 */

import * as utils from '../src/utils.js'
import {ajax} from '../src/ajax.js';
import {submodule} from '../src/hook.js';

const MODULE_NAME = 'sharedId';
const ID_SVC = 'https://id.sharedid.org/id';
const DEFAULT_24_HOURS = 86400;
const OPT_OUT_VALUE = '00000000000000000000000000';
// These values should NEVER change. If
// they do, we're no longer making ulids!
const ENCODING = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'; // Crockford's Base32
const ENCODING_LEN = ENCODING.length;
const TIME_MAX = Math.pow(2, 48) - 1;
const TIME_LEN = 10;
const RANDOM_LEN = 16;
const id = factory();
/**
 * Constructs cookie value
 * @param value
 * @param needsSync
 * @returns {string}
 */
function constructCookieValue(value, needsSync) {
  const cookieValue = {};
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
  const needSync = storedId.ns;
  if (needSync) {
    return true;
  }
  if (!configParams || typeof configParams.syncTime !== 'number') {
    utils.logInfo('SharedId: Sync time is not configured or is not a number');
  }
  let syncTime = (!configParams || typeof configParams.syncTime !== 'number') ? DEFAULT_24_HOURS : configParams.syncTime;
  if (syncTime > DEFAULT_24_HOURS) {
    syncTime = DEFAULT_24_HOURS;
  }
  const cookieTimestamp = storedId.ts;
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
  const diff = (date1 - date2) / 1000;
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
      let value = {};
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
      const value = constructCookieValue(id(), true);
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
  const result = {};
  const sharedId = (value && typeof value['id'] === 'string') ? value['id'] : undefined;
  if (sharedId == OPT_OUT_VALUE) {
    return undefined;
  }
  if (sharedId) {
    const bidIds = {
      id: sharedId,
    }
    const ns = (value && typeof value['ns'] === 'boolean') ? value['ns'] : undefined;
    if (ns == undefined) {
      bidIds.third = sharedId;
    }
    result.sharedid = bidIds;
    utils.logInfo('SharedId: Decoded value ' + JSON.stringify(result));
    return result;
  }
  return sharedId;
}

/**
 * the factory to generate unique identifier based on time and current pseudorandom number
 * @param {string} the current pseudorandom number generator
 * @returns {function(*=): *}
 */
function factory(currPrng) {
  if (!currPrng) {
    currPrng = detectPrng();
  }
  return function ulid(seedTime) {
    if (isNaN(seedTime)) {
      seedTime = Date.now();
    }
    return encodeTime(seedTime, TIME_LEN) + encodeRandom(RANDOM_LEN, currPrng);
  };
}

/**
 * creates and logs the error message
 * @function
 * @param {string} error message
 * @returns {Error}
 */
function createError(message) {
  utils.logError(message);
  const err = new Error(message);
  err.source = 'sharedId';
  return err;
}

/**
 * gets a a random charcter from generated pseudorandom number
 * @param {string} the generated pseudorandom number
 * @returns {string}
 */
function randomChar(prng) {
  let rand = Math.floor(prng() * ENCODING_LEN);
  if (rand === ENCODING_LEN) {
    rand = ENCODING_LEN - 1;
  }
  return ENCODING.charAt(rand);
}

/**
 * encodes the time based on the length
 * @param now
 * @param len
 * @returns {string} encoded time.
 */
function encodeTime (now, len) {
  if (isNaN(now)) {
    throw new Error(now + ' must be a number');
  }

  if (Number.isInteger(now) === false) {
    throw createError('time must be an integer');
  }

  if (now > TIME_MAX) {
    throw createError('cannot encode time greater than ' + TIME_MAX);
  }
  if (now < 0) {
    throw createError('time must be positive');
  }

  if (Number.isInteger(len) === false) {
    throw createError('length must be an integer');
  }
  if (len < 0) {
    throw createError('length must be positive');
  }

  let mod;
  let str = '';
  for (; len > 0; len--) {
    mod = now % ENCODING_LEN;
    str = ENCODING.charAt(mod) + str;
    now = (now - mod) / ENCODING_LEN;
  }
  return str;
}

/**
 * encodes random character
 * @param len
 * @param prng
 * @returns {string}
 */
function encodeRandom (len, prng) {
  let str = '';
  for (; len > 0; len--) {
    str = randomChar(prng) + str;
  }
  return str;
}

/**
 * detects the pseudorandom number generator and generates the random number
 * @function
 * @param {string} error message
 * @returns {string} a random number
 */
function detectPrng(root) {
  if (!root) {
    root = typeof window !== 'undefined' ? window : null;
  }
  const browserCrypto = root && (root.crypto || root.msCrypto);
  if (browserCrypto) {
    return () => {
      const buffer = new Uint8Array(1);
      browserCrypto.getRandomValues(buffer);
      return buffer[0] / 0xff;
    };
  }
  return () => Math.random();
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
   * @returns {{sharedid:{ id: string, third:string}} or undefined if value doesn't exists
   */
  decode(value) {
    return (value) ? encodeId(value) : undefined;
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
      const needSync = isIdSynced(configParams, storedId);
      if (needSync) {
        utils.logInfo('SharedId: Existing shared id ' + storedId + ' is not synced');
        const sharedIdPayload = {};
        sharedIdPayload.sharedId = storedId.id;
        const payloadString = JSON.stringify(sharedIdPayload);
        ajax(ID_SVC, existingIdCallback(storedId, callback), payloadString, {method: 'POST', withCredentials: true});
      }
    };
    return {callback: resp};
  }
};

// Register submodule for userId
submodule('userId', sharedIdSubmodule);
