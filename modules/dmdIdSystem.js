/**
 * This module adds dmdId to the User ID module
 * The {@link module:modules/userId} module is required
 * @module modules/dmdIdSystem
 * @requires module:modules/userId
 */

import * as utils from '../src/utils.js';
import { submodule } from '../src/hook.js';

/** @type {Submodule} */
export const dmdIdSubmodule = {
  /**
   * used to link submodule with config
   * @type {string}
   */
  name: 'dmdId',

  /**
   * decode the stored id value for passing to bid requests
   * @function decode
   * @param {(Object|string)} value
   * @returns {(Object|undefined)}
   */
  decode(value) {
    return value && typeof value === 'string'
      ? { 'dmdId': value }
      : undefined;
  },

  /**
   * performs action to obtain id and return a value in the callback's response argument
   * @function getId
   * @param {SubmoduleConfig} [config]
   * @param {ConsentData}
   * @param {Object} cacheIdObj - existing id, if any consentData]
   * @returns {IdResponse|undefined}
   */
  getId(config, consentData, cacheIdObj) {
    try {
      const configParams = (config && config.params) || {};
      if (
        !configParams ||
        !configParams.api_key ||
        typeof configParams.api_key !== 'string'
      ) {
        utils.logError('dmd submodule requires an api_key.');
        return;
      } else {
        return cacheIdObj;
      }
    } catch (e) {
      utils.logError(`dmdIdSystem encountered an error`, e);
    }
  },
};

submodule('userId', dmdIdSubmodule);
