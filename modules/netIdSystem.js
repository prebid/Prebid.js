/**
 * This module adds netId to the User ID module
 * The {@link module:modules/userId} module is required
 * @module modules/netIdSystem
 * @requires module:modules/userId
 */

import {submodule} from '../src/hook.js';

/**
 * @typedef {import('../modules/userId/index.js').Submodule} Submodule
 * @typedef {import('../modules/userId/index.js').SubmoduleConfig} SubmoduleConfig
 * @typedef {import('../modules/userId/index.js').ConsentData} ConsentData
 * @typedef {import('../modules/userId/index.js').IdResponse} IdResponse
 */

/** @type {Submodule} */
export const netIdSubmodule = {
  /**
   * used to link submodule with config
   * @type {string}
   */
  name: 'netId',
  /**
   * decode the stored id value for passing to bid requests
   * @function decode
   * @param {(Object|string)} value
   * @returns {(Object|undefined)}
   */
  decode(value) {
    return (value && typeof value['netId'] === 'string') ? { 'netId': value['netId'] } : undefined;
  },
  /**
   * performs action to obtain id and return a value in the callback's response argument
   * @function
   * @param {SubmoduleConfig} [config]
   * @param {ConsentData} [consentData]
   * @param {(Object|undefined)} cacheIdObj
   * @returns {IdResponse|undefined}
   */
  getId(config) {
    /* currently not possible */
    return {};
  },
  eids: {
    'netId': {
      source: 'netid.de',
      atype: 1
    },
  }
};

submodule('userId', netIdSubmodule);
