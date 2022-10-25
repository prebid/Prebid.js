/**
 * This module adds support for Yahoo ConnectID to the user ID module system.
 * The {@link module:modules/userId} module is required
 * @module modules/connectIdSystem
 * @requires module:modules/userId
 */

import {ajax} from '../src/ajax.js';
import {submodule} from '../src/hook.js';
import {includes} from '../src/polyfill.js';
import {formatQS, logError} from '../src/utils.js';

const MODULE_NAME = 'connectId';
const VENDOR_ID = 25;
const PLACEHOLDER = '__PIXEL_ID__';
const UPS_ENDPOINT = `https://ups.analytics.yahoo.com/ups/${PLACEHOLDER}/fed`;
const OVERRIDE_OPT_OUT_KEY = 'connectIdOptOut';
const INPUT_PARAM_KEYS = ['pixelId', 'he', 'puid'];

/** @type {Submodule} */
export const connectIdSubmodule = {
  /**
   * used to link submodule with config
   * @type {string}
   */
  name: MODULE_NAME,
  /**
   * @type {Number}
   */
  gvlid: VENDOR_ID,
  /**
   * decode the stored id value for passing to bid requests
   * @function
   * @returns {{connectId: string} | undefined}
   */
  decode(value) {
    if (connectIdSubmodule.userHasOptedOut()) {
      return undefined;
    }
    return (typeof value === 'object' && value.connectid)
      ? {connectId: value.connectid} : undefined;
  },
  /**
   * Gets the Yahoo ConnectID
   * @function
   * @param {SubmoduleConfig} [config]
   * @param {ConsentData} [consentData]
   * @returns {IdResponse|undefined}
   */
  getId(config, consentData) {
    if (connectIdSubmodule.userHasOptedOut()) {
      return;
    }
    const params = config.params || {};
    if (!params || (typeof params.he !== 'string' && typeof params.puid !== 'string') ||
        (typeof params.pixelId === 'undefined' && typeof params.endpoint === 'undefined')) {
      logError('The connectId submodule requires the \'pixelId\' and at least one of the \'he\' ' +
               'or \'puid\' parameters to be defined.');
      return;
    }

    const data = {
      '1p': includes([1, '1', true], params['1p']) ? '1' : '0',
      gdpr: connectIdSubmodule.isEUConsentRequired(consentData) ? '1' : '0',
      gdpr_consent: connectIdSubmodule.isEUConsentRequired(consentData) ? consentData.gdpr.consentString : '',
      us_privacy: consentData && consentData.uspConsent ? consentData.uspConsent : ''
    };

    INPUT_PARAM_KEYS.forEach(key => {
      if (typeof params[key] != 'undefined') {
        data[key] = params[key];
      }
    });

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
      const endpoint = UPS_ENDPOINT.replace(PLACEHOLDER, params.pixelId);
      let url = `${params.endpoint || endpoint}?${formatQS(data)}`;
      connectIdSubmodule.getAjaxFn()(url, callbacks, null, {method: 'GET', withCredentials: true});
    };
    return {callback: resp};
  },

  /**
   * Utility function that returns a boolean flag indicating if the opporunity
   * is subject to GDPR
   * @returns {Boolean}
   */
  isEUConsentRequired(consentData) {
    return !!(consentData && consentData.gdpr && consentData.gdpr.gdprApplies);
  },

  /**
   * Utility function that returns a boolean flag indicating if the user
   * has opeted out via the Yahoo easy-opt-out mechanism.
   * @returns {Boolean}
   */
  userHasOptedOut() {
    try {
      return localStorage.getItem(OVERRIDE_OPT_OUT_KEY) === '1';
    } catch {
      return false;
    }
  },

  /**
   * Return the function used to perform XHR calls.
   * Utilised for each of testing.
   * @returns {Function}
   */
  getAjaxFn() {
    return ajax;
  }
};

submodule('userId', connectIdSubmodule);
