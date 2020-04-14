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
   * @returns {{sharedId:string}}
   */
  decode(value) {
    return (value && typeof value['sharedId'] === 'string') ? { 'sharedId': value['sharedId'] } : undefined;
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

  sharedIdGenerator: function () {
    if (!this.sharedIdFactory) {
      this.sharedIdFactory = this.factory();
    }

    return this.sharedIdFactory();
  },

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
  createError: function(message) {
    utils.logError(message);
    const err = new Error(message);
    err.source = 'sharedId';
    return err;
  },
  randomChar: function(prng) {
    let rand = Math.floor(prng() * ENCODING_LEN);
    if (rand === ENCODING_LEN) {
      rand = ENCODING_LEN - 1;
    }
    return ENCODING.charAt(rand);
  },
  encodeTime: function (now, len) {
    if (isNaN(now)) {
      throw new Error(now + ' must be a number');
    }
    if (now > TIME_MAX) {
      throw this.createError('cannot encode time greater than ' + TIME_MAX);
    }
    if (now < 0) {
      throw this.createError('time must be positive');
    }
    if (Number.isInteger(now) === false) {
      throw this.createError('time must be an integer');
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
  encodeRandom: function (len, prng) {
    let str = '';
    for (; len > 0; len--) {
      str = this.randomChar(prng) + str;
    }
    return str;
  },
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
