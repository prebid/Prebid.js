/**
 * This module adds Shared ID support to the User ID module
 * The {@link module:modules/userId} module is required.
 * @module modules/sharedIdSystem
 * @requires module:modules/userId
 */

import { submodule } from '../src/hook.js';
import * as sharedIdGenerator from '../src/sharedIdGenerator.js';

const MODULE_NAME = 'sharedId';

/** @type {Submodule} */
export const sharedIdSubmodule = {
  /**
   * used to link submodule with config
   * @type {string}
   */
  name: MODULE_NAME,

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
    let sharedId = sharedIdGenerator.id();
    return {
      id: sharedId
    }
  },
};

// Register submodule for userId
submodule('userId', sharedIdSubmodule);
