/**
 * This module adds Publisher Provided ids support to the User ID module
 * The {@link module:modules/userId} module is required.
 * @module modules/pubProvidedSystem
 * @requires module:modules/userId
 */

import {submodule} from '../src/hook.js';
import * as utils from '../src/utils.js';

const MODULE_NAME = 'pubProvidedId';

function addType(uid) {
  if (!uid.ext) {
    uid.ext = {
      types: ['ppuid']
    };
  } else if (!uid.ext.types) {
    uid.ext.types = ['ppuid'];
  } else if (!uid.ext.types.includes('ppuid')) {
    uid.ext.types.push('ppuid');
  }
}

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
   * @returns {{pubProvided: array}} or undefined if value doesn't exists
   */
  decode(value) {
    const res = value ? {pubProvided: value} : undefined;
    utils.logInfo('PubProvided: Decoded value ' + JSON.stringify(res));
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
    if (utils.isArray(configParams.eids)) {
      res = res.concat(configParams.eids);
    }
    if (typeof configParams.eidsFunction === 'function') {
      res = res.concat(configParams.eidsFunction());
    }
    res.forEach(id => id.uids.forEach(uid => addType(uid)));
    return {id: res};
  }
};

// Register submodule for userId
submodule('userId', pubProvidedIdSubmodule);
