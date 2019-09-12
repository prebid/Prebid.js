/**
 * This module adds netId to the User ID module
 * The {@link module:modules/userId} module is required
 * @module modules/netIdSystem
 * @requires module:modules/userId
 */

// import * as utils from '../../src/utils';

/** @type {Submodule} */
export const netIdSubmodule = {
  /**
   * used to link submodule with config
   * @type {string}
   */
  name: 'netId',
  /**
   * decode the stored id value for passing to bid requests
   * @function
   * @param {string} value
   * @returns {{netId:string}}
   */
  decode(value) {
    return { 'netId': value }
  },
  /**
   * the feature to get a userId from the netId-API will be add in future as soon as the API is available
   * @function
   * @returns {string}
   */
  getId() {
    let netId;
    try {
      netId = null;
    } catch (e) {}
    return (netId);
  }
};
