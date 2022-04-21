/**
 * This module adds Publisher Provided ids support to the User ID module
 * The {@link module:modules/userId} module is required.
 * @module modules/pubProvidedSystem
 * @requires module:modules/userId
 */

import {submodule} from '../src/hook.js';
import { logInfo, isArray } from '../src/utils.js';

const MODULE_NAME = 'pubProvidedId';

/** @type {Submodule} */
export const pubProvidedIdSubmodule = {

  /**
   * used to link submodule with config
   * @type {string}
   */
  name: MODULE_NAME,

  /**
   * decode the stored id value for passing to bid request
   * @function
   * @param {string} value
   * @returns {{pubProvidedId: array}} or undefined if value doesn't exists
   */
  decode(value) {
    const res = value ? {pubProvidedId: value} : undefined;
    logInfo('PubProvidedId: Decoded value ' + JSON.stringify(res));
    return res;
  },

  /**
   * performs action to obtain id and return a value.
   * @function
   * @param {SubmoduleConfig} [config]
   * @returns {{id: array}}
   */
  getId(config) {
    const configParams = (config && config.params) || {};
    let res = [];
    if (isArray(configParams.eids)) {
      res = res.concat(configParams.eids);
    }
    if (typeof configParams.eidsFunction === 'function') {
      res = res.concat(configParams.eidsFunction());
    }
    return {id: res};
  }
};

// Register submodule for userId
submodule('userId', pubProvidedIdSubmodule);
