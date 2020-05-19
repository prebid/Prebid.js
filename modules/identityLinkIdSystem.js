/**
 * This module adds IdentityLink to the User ID module
 * The {@link module:modules/userId} module is required
 * @module modules/identityLinkSubmodule
 * @requires module:modules/userId
 */

import * as utils from '../src/utils.js'
import {ajax} from '../src/ajax.js';
import {submodule} from '../src/hook.js';

/** @type {Submodule} */
export const identityLinkSubmodule = {
  /**
   * used to link submodule with config
   * @type {string}
   */
  name: 'identityLink',
  /**
   * decode the stored id value for passing to bid requests
   * @function
   * @param {string} value
   * @returns {{idl_env:string}}
   */
  decode(value) {
    return { 'idl_env': value }
  },
  /**
   * performs action to obtain id and return a value in the callback's response argument
   * @function
   * @param {ConsentData} [consentData]
   * @param {SubmoduleParams} [configParams]
   * @returns {IdResponse|undefined}
   */
  getId(configParams, consentData) {
    if (!configParams || typeof configParams.pid !== 'string') {
      utils.logError('identityLink submodule requires partner id to be defined');
      return;
    }
    const hasGdpr = (consentData && typeof consentData.gdprApplies === 'boolean' && consentData.gdprApplies) ? 1 : 0;
    const gdprConsentString = hasGdpr ? consentData.consentString : '';
    // use protocol relative urls for http or https
    const url = `https://api.rlcdn.com/api/identity/envelope?pid=${configParams.pid}${hasGdpr ? '&ct=1&cv=' + gdprConsentString : ''}`;
    let resp;
    resp = function(callback) {
      // Check ats during callback so it has a chance to initialise.
      // If ats library is available, use it to retrieve envelope. If not use standard third party endpoint
      if (window.ats) {
        window.ats.retrieveEnvelope(function (envelope) {
          if (envelope) {
            callback(JSON.parse(envelope).envelope);
          } else {
            getEnvelope(url, callback);
          }
        });
      } else {
        getEnvelope(url, callback);
      }
    };

    return {callback: resp};
  }
};
// return envelope from third party endpoint
function getEnvelope(url, callback) {
  const callbacks = {
    success: response => {
      let responseObj;
      if (response) {
        try {
          responseObj = JSON.parse(response);
        } catch (error) {
          utils.logError(error);
        }
      }
      callback(responseObj.envelope);
    },
    error: error => {
      utils.logError(`identityLink: ID fetch encountered an error`, error);
      callback();
    }
  };
  ajax(url, callbacks, undefined, {method: 'GET', withCredentials: true});
}

submodule('userId', identityLinkSubmodule);
