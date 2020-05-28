/**
 * Generates the shared Id/Ulid. Id generated is 128 bits with first 48 bits of timestamp followed by 80 bit of randomness.
 * Spec is available in https://github.com/ulid/spec
 */
import * as utils from '../src/utils.js';

// These values should NEVER change. If
// they do, we're no longer making ulids!
const ENCODING = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'; // Crockford's Base32
const ENCODING_LEN = ENCODING.length;
const TIME_MAX = Math.pow(2, 48) - 1;
const TIME_LEN = 10;
const RANDOM_LEN = 16;

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

export const id = factory();
