/**
 * This module adds Shared ID support to the User ID module
 * The {@link module:modules/userId} module is required.
 * @module modules/sharedIdSystem
 * @requires module:modules/userId
 */

import { submodule } from '../src/hook.js';
// eslint-disable-next-line prebid/validate-imports
import { ulid } from 'ulid'

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
   * @returns {{sharedId:string}}
   */
  decode(value) {
    return { 'sharedId': value }
  },

  /**
   * performs action to obtain id and return a value.
   * @function
   * @param {SubmoduleParams} [configParams]
   * @returns {sharedId}
   */
  getId(configParams) {
    let sharedId = ulid();
    return {
      id: sharedId }
  }
};

submodule('userId', sharedIdSubmodule);
