/**
 * This module adds Custom Id to the User ID module
 * The {@link module:modules/userId} module is required
 * @module modules/customIdSystem
 * @requires module:modules/userId
 */

import * as utils from '../src/utils';
import {submodule} from '../src/hook';

/** @type {Submodule} */
export const customIdSubmodule = {
  /**
   * used to link submodule with config
   * @type {string}
   */
  name: 'customId',
  /**
   * decode the stored id value for passing to bid requests
   * @function
   * @param {string} value
   * @returns {{firstpartyid:string}}
   */
  decode(value) {
    return { 'firstpartyid': value }
  },

  getDataFromCookieName: function (e) {
    if (e && window.document.cookie) {
      var t = window.document.cookie.match('(^|;)\\s*' + e + '\\s*=\\s*([^;]*)\\s*(;|$)');
      return t ? decodeURIComponent(t[2]) : null
    }
    return null
  },
  getDataFromFunction: function(fnName) {
    var fn = window[fnName];
    var data = '';
    if (typeof fn == 'function') {
      data = fn();
    } else {
      utils.logError('User ID - FirstPartyId submodule: Provided functionName is not a function or not accessible')
    }
    return data;
  },
  /**
   * performs action to obtain id
   * @function
   * @returns {string}
   */
  getId(data) {
    // If the page includes its own pubcid object, then use that instead.
    var dta;
    if (data && (typeof data.cookieName == 'string' || typeof data.functionName == 'string' || data.functionName != '')) {
      try {
        if (data.functionName) {
          dta = this.getDataFromFunction(data.functionName)
        } else if (data.cookieName) {
          dta = this.getDataFromCookieName(data.cookieName);
        }
      } catch (e) {}
      return dta;
    }
    utils.logError('User ID - FirstPartyId submodule requires either data or cookie name to be defined');
  }
};

submodule('userId', customIdSubmodule);
