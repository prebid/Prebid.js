/**
 * This module adds KinessoId ID support to the User ID module
 * The {@link module:modules/userId} module is required.
 * @module modules/KinessoIdSystem
 * @requires module:modules/userId
 */

import { logError, logInfo } from '../src/utils.js';
import {ajax} from '../src/ajax.js';
import {submodule} from '../src/hook.js';
import {coppaDataHandler, uspDataHandler} from '../src/adapterManager.js';

const MODULE_NAME = 'kpuid';
const ID_SVC = 'https://id.knsso.com/id';
// These values should NEVER change. If
// they do, we're no longer making ulids!
const ENCODING = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'; // Crockford's Base32
const ENCODING_LEN = ENCODING.length;
const TIME_MAX = Math.pow(2, 48) - 1;
const TIME_LEN = 10;
const RANDOM_LEN = 16;
const id = factory();

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
 * encodes random character
 * @param len
 * @param prng
 * @returns {string}
 */
function encodeRandom(len, prng) {
  let str = '';
  for (; len > 0; len--) {
    str = randomChar(prng) + str;
  }
  return str;
}

/**
 * encodes the time based on the length
 * @param now
 * @param len
 * @returns {string} encoded time.
 */
function encodeTime(now, len) {
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
 * creates and logs the error message
 * @function
 * @param {string} error message
 * @returns {Error}
 */
function createError(message) {
  logError(message);
  const err = new Error(message);
  err.source = 'kinessoId';
  return err;
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

/**
 * existing id generation call back
 * @param result
 * @param callback
 * @returns {{success: success, error: error}}
 */
function syncId(storedId) {
  return {
    success: function (responseBody) {
      logInfo('KinessoId: id to be synced: ' + storedId);
    },
    error: function () {
      logInfo('KinessoId: Sync error for id : ' + storedId);
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
  const knssoId = (value && typeof value === 'string') ? value : undefined;
  if (knssoId) {
    result.kpuid = knssoId;
    logInfo('KinessoId: Decoded value ' + JSON.stringify(result));
    return result;
  }
  return knssoId;
}

/**
 * Builds and returns the shared Id URL with attached consent data if applicable
 * @param {Object} consentData
 * @return {string}
 */
function kinessoSyncUrl(accountId, consentData) {
  const usPrivacyString = uspDataHandler.getConsentData();
  let kinessoSyncUrl = `${ID_SVC}?accountid=${accountId}`;
  if (usPrivacyString) {
    kinessoSyncUrl = `${kinessoSyncUrl}&us_privacy=${usPrivacyString}`;
  }
  if (!consentData || typeof consentData.gdprApplies !== 'boolean' || !consentData.gdprApplies) return kinessoSyncUrl;

  kinessoSyncUrl = `${kinessoSyncUrl}&gdpr=1&gdpr_consent=${consentData.consentString}`;
  return kinessoSyncUrl
}

/** @type {Submodule} */
export const kinessoIdSubmodule = {

  /**
   * used to link submodule with config
   * @type {string}
   */
  name: MODULE_NAME,

  /**
   * decode the stored id value for passing to bid requests
   * @function
   * @param {string} value
   * @returns {{kpuid:{ id: string}} or undefined if value doesn't exists
   */
  decode(value) {
    return (value) ? encodeId(value) : undefined;
  },

  /**
   * performs action to obtain id and return a value.
   * @function
   * @param {SubmoduleConfig} [config]
   * @param {ConsentData|undefined} consentData
   * @returns {knssoId}
   */
  getId(config, consentData) {
    const configParams = (config && config.params) || {};
    if (!configParams || typeof configParams.accountid !== 'number') {
      logError('User ID - KinessoId submodule requires a valid accountid to be defined');
      return;
    }
    const coppa = coppaDataHandler.getCoppa();
    if (coppa) {
      logInfo('KinessoId: IDs not provided for coppa requests, exiting KinessoId');
      return;
    }
    const accountId = configParams.accountid;
    const knnsoId = id();
    logInfo('KinessoId: generated id ' + knnsoId);
    const kinessoIdPayload = {};
    kinessoIdPayload.id = knnsoId;
    const payloadString = JSON.stringify(kinessoIdPayload);
    ajax(kinessoSyncUrl(accountId, consentData), syncId(knnsoId), payloadString, {method: 'POST', withCredentials: true});
    return {'id': knnsoId};
  }

};

// Register submodule for userId
submodule('userId', kinessoIdSubmodule);
