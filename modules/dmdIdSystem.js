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
    return value && typeof value['dmd-dgid'] === 'string'
      ? { 'dmdid': value['dmd-dgid'] }
      : null;
  },

  /**
   * performs action to obtain id and return a value in the callback's response argument
   * @function getId
   * @param {SubmoduleConfig} [config]
   * @param {ConsentData}
   * @param {Object} cacheIdObj - existing id, if any consentData]
   * @returns {IdResponse|undefined}
   */
  getId(config) {
    try {
      const configParams = (config && config.params) || {};
      if (
        !configParams ||
        !configParams.apiKey ||
        typeof configParams.apiKey !== 'string'
      ) {
        utils.logError('dmd submodule requires an apiKey.');
        return;
      }
    } catch (e) {
      utils.logError(`dmdIdSystem encountered an error`, e);
    }
  },
};

submodule('userId', dmdIdSubmodule);
