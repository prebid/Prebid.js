/**
 * This module adds PubCommonId to the User ID module
 * The {@link module:modules/userId} module is required
 * @module modules/pubCommonIdSystem
 * @requires module:modules/userId
 */

import * as utils from '../../src/utils';

/** @type {Submodule} */
export const pubCommonIdSubmodule = {
  /**
   * used to link submodule with config
   * @type {string}
   */
  name: 'pubCommonId',
  /**
   * decode the stored id value for passing to bid requests
   * @function
   * @param {string} value
   * @returns {{pubcid:string}}
   */
  decode(value) {
    return { 'pubcid': value }
  },
  /**
   * performs action to obtain id
   * @function
   * @returns {string}
   */
  getId() {
    // If the page includes its own pubcid object, then use that instead.
    let pubcid;
    try {
      if (typeof window['PublisherCommonId'] === 'object') {
        pubcid = window['PublisherCommonId'].getId();
      }
    } catch (e) {}
    // check pubcid and return if valid was otherwise create a new id
    return (pubcid) || utils.generateUUID();
  }
};
