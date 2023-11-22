/**
 * This module adds UnifiedId to the User ID module
 * The {@link module:modules/userId} module is required
 * @module modules/unifiedIdSystem
 * @requires module:modules/userId
 */

 import { logError } from '../src/utils.js';
 import {ajax} from '../src/ajax.js';
 import {submodule} from '../src/hook.js'

// import { logError } from 'prebid.js/src/utils.js';
// import {ajax} from 'prebid.js/src/ajax.js';
// import {submodule} from 'prebid.js/src/hook.js'

const MODULE_NAME = 'unifiedId';

const getUrl = (configParams, consentData) => {
 if (configParams.url) { return configParams.url; }
 const baseUrl = `https://match.adsrvr.org/track/rid?ttd_pid=${configParams.partner}&fmt=json&ttd_tpi=1`;

 if (consentData) {
   const gdpr = consentData.gdprApplies === true ? '1' : '0'
   const gdprConsent = consentData.consentString ?? ''
   return `${baseUrl}&gdpr=${gdpr}&gdpr_consent=${gdprConsent}`
 }

 return baseUrl
}

/** @type {Submodule} */
export const unifiedIdSubmodule = {
  /**
   * used to link submodule with config
   * @type {string}
   */
  name: MODULE_NAME,
  /**
   * required for the gdpr enforcement module
   */
  gvlid: 21,
  /**
   * decode the stored id value for passing to bid requests
   * @function
   * @param {{TDID:string}} value
   * @returns {{tdid:Object}}
   */
  decode(value) {
    return (value && typeof value['TDID'] === 'string') ? { 'tdid': value['TDID'] } : undefined;
  },
  /**
   * performs action to obtain id and return a value in the callback's response argument
   * @function
   * @param {SubmoduleConfig} [config]
   * @returns {IdResponse|undefined}
   */
  getId(config, consentData) {
    const configParams = (config && config.params) || {};
    if (!configParams || (typeof configParams.partner !== 'string' && typeof configParams.url !== 'string')) {
      logError('User ID - unifiedId submodule requires either partner or url to be defined');
      return;
    }

    const url = getUrl(configParams, consentData)

    const resp = function (callback) {
      const callbacks = {
        success: response => {
          let responseObj;
          if (response) {
            try {
              responseObj = JSON.parse(response);
            } catch (error) {
              logError(error);
            }
          }
          callback(responseObj);
        },
        error: error => {
          logError(`${MODULE_NAME}: ID fetch encountered an error`, error);
          callback();
        }
      };
      ajax(url, callbacks, undefined, {method: 'GET', withCredentials: true});
    };
    return {callback: resp};
  },
  eids: {
    'tdid': {
      source: 'adserver.org',
      atype: 1,
      getUidExt: function() {
        return {
          rtiPartner: 'TDID'
        };
      }
    },
  }
};

submodule('userId', unifiedIdSubmodule);