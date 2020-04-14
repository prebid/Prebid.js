/**
 * This module adds Shared ID support to the User ID module
 * The {@link module:modules/userId} module is required.
 * @module modules/sharedIdSystem
 * @requires module:modules/userId
 */
import { submodule } from '../src/hook.js';
import * as utils from '../src/utils.js';
// These values should NEVER change. If
// they do, we're no longer making ulids!
const ENCODING = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'; // Crockford's Base32
const ENCODING_LEN = ENCODING.length;
const TIME_MAX = Math.pow(2, 48) - 1;
const TIME_LEN = 10;
const RANDOM_LEN = 16;
const MODULE_NAME = 'sharedId';

/** @type {Submodule} */
export const sharedIdSubmodule = {
  /**
   * used to link submodule with config
   * @type {string}
   */
  name: MODULE_NAME,

  sharedIdFactory: undefined,

  /**
   * decode the stored id value for passing to bid requests
   * @function
   * @param {string} value
   * @returns {{sharedid:string}} or undefined if value doesn't exists
   */
  decode(value) {
    return (value && typeof value['sharedid'] === 'string') ? { 'sharedid': value['sharedid'] } : undefined;
  },

  /**
   * performs action to obtain id and return a value.
   * @function
   * @param {SubmoduleParams} [configParams]
   * @returns {sharedId}
   */
  getId: function(configParams) {
    let sharedId = this.sharedIdGenerator();
    return {
      id: sharedId
    }
  },
  /**
   * the shared id generator factory.
   * @returns {*}
   */
  sharedIdGenerator: function () {
    if (!this.sharedIdFactory) {
      this.sharedIdFactory = this.factory();
    }

    return this.sharedIdFactory();
  },

  /**
   * the factory to generate unique identifier based on time and current pseudorandom number
   * @param {string} the current pseudorandom number generator
   * @returns {function(*=): *}
   */
  factory: function (currPrng) {
    if (!currPrng) {
      currPrng = this.detectPrng();
    }
    return function ulid(seedTime) {
      if (isNaN(seedTime)) {
        seedTime = Date.now();
      }
      return this.encodeTime(seedTime, TIME_LEN) + this.encodeRandom(RANDOM_LEN, currPrng);
    };
  },
  /**
   * creates and logs the error message
   * @function
   * @param {string} error message
   * @returns {Error}
   */
  createError: function(message) {
    utils.logError(message);
    const err = new Error(message);
    err.source = 'sharedId';
    return err;
  },
  /**
   * gets a a random charcter from generated pseudorandom number
   * @param {string} the generated pseudorandom number
   * @returns {string}
   */
  randomChar: function(prng) {
    let rand = Math.floor(prng() * ENCODING_LEN);
    if (rand === ENCODING_LEN) {
      rand = ENCODING_LEN - 1;
    }
    return ENCODING.charAt(rand);
  },
  /**
   * encodes the time based on the length
   * @param now
   * @param len
   * @returns {string} encoded time.
   */
  encodeTime: function (now, len) {
    if (isNaN(now)) {
      throw new Error(now + ' must be a number');
    }

    if (Number.isInteger(now) === false) {
      throw this.createError('time must be an integer');
    }

    if (now > TIME_MAX) {
      throw this.createError('cannot encode time greater than ' + TIME_MAX);
    }
    if (now < 0) {
      throw this.createError('time must be positive');
    }

    if (Number.isInteger(len) === false) {
      throw this.createError('length must be an integer');
    }
    if (len < 0) {
      throw this.createError('length must be positive');
    }

    let mod;
    let str = '';
    for (; len > 0; len--) {
      mod = now % ENCODING_LEN;
      str = ENCODING.charAt(mod) + str;
      now = (now - mod) / ENCODING_LEN;
    }
    return str;
  },

  /**
   * encodes random character
   * @param len
   * @param prng
   * @returns {string}
   */
  encodeRandom: function (len, prng) {
    let str = '';
    for (; len > 0; len--) {
      str = this.randomChar(prng) + str;
    }
    return str;
  },
  /**
   * detects the pseudorandom number generator and generates the random number
   * @function
   * @param {string} error message
   * @returns {string} a random number
   */
  detectPrng: function (root) {
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
};

submodule('userId', sharedIdSubmodule);
