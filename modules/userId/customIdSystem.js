/**
 * This module adds PubCommonId to the User ID module
 * The {@link module:modules/userId} module is required
 * @module modules/customIdSystem
 * @requires module:modules/userId
 */

import * as utils from '../../src/utils';

/** @type {Submodule} */
export const pubCommonIdSubmodule = {
  /**
   * used to link submodule with config
   * @type {string}
   */
  name: 'customId',
  /**
   * decode the stored id value for passing to bid requests
   * @function
   * @param {string} value
   * @returns {{customData:string}}
   */
  decode(value) {
    return { 'customData': value }
  },

  getDataFromCookieName: function (e) {
    if (e && window.document.cookie) {
      var t = window.document.cookie.match('(^|;)\\s*' + e + '\\s*=\\s*([^;]*)\\s*(;|$)');
      return t ? decodeURIComponent(t[2]) : null
    }
    return null
  },
  /**
   * performs action to obtain id
   * @function
   * @returns {string}
   */
  getId(data) {
    // If the page includes its own pubcid object, then use that instead.
    var t = '';
    if (data && (typeof data.cookieName == 'string' || data.data != '' || data.data != null)) {
      try {
        e.cookieName ? t = this.getDataFromCookieName(data.cookieName) : e.data && (t = e.data)
      } catch (e) {}
      return t || ''
    }
    utils.logError('User ID - customData submodule requires either data or cookie name to be defined')
  }
};
