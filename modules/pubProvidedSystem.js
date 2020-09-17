/**
 * This module adds Publisher Provided ids support to the User ID module
 * The {@link module:modules/userId} module is required.
 * @module modules/pubProvidedSystem
 * @requires module:modules/userId
 */

import {submodule} from '../src/hook.js';
import * as utils from "../src/utils";

const MODULE_NAME = 'publisherProvided';

/** @type {Submodule} */
export const pubProvidedSubmodule = {
  /**
   * used to link submodule with config
   * @type {string}
   */
  name: MODULE_NAME,

  /**
   * decode the stored id value for passing to bid request
   * @function
   * @param {string} value
   * @returns {{pubProvided: array}} or undefined if value doesn't exists
   */
  decode(value) {
    const res = value ? {pubProvided: value} : undefined;
    utils.logInfo('PubProvidedId: Decoded value ' + JSON.stringify(res));
    return res;
  },

  /**
   * performs action to obtain id and return a value.
   * @function
   * @param {SubmoduleParams} [configParams]
   * @returns {{id: array}}
   */
  getId(configParams) {
    let res = [];
    if (Array.isArray(configParams.eids)) {
      res = res.concat(configParams.eids);
    }
    if (typeof configParams.eidsFunction === 'function') {
      res = res.concat(configParams.eidsFunction());
    }
    return {id: res};
  }
};

// Register submodule for userId
submodule('userId', pubProvidedSubmodule);
