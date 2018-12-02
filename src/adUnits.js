import { deepAccess } from './utils';

let adUnits = {};

/**
 * Increments and returns current Adunit counter
 * @param {string} adunit id
 * @returns {number} current adunit count
 */
function incrementCounter(adunit) {
  adUnits[adunit] = adUnits[adunit] || {};
  adUnits[adunit].counter = (deepAccess(adUnits, `${adunit}.counter`) + 1) || 1;
  return adUnits[adunit].counter;
}

/**
 * Returns current Adunit counter
 * @param {string} adunit id
 * @returns {number} current adunit count
 */
function getCounter(adunit) {
  return deepAccess(adUnits, `${adunit}.counter`) || 0;
}

/**
 * A module which counts how many times an adunit was called
 * @module adunitCounter
 */
let adunitCounter = {
  incrementCounter,
  getCounter
}

export { adunitCounter };
