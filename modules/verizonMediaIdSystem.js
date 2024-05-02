/**
 * This module adds verizonMediaId to the User ID module
 * The {@link module:modules/userId} module is required
 * @module modules/verizonMediaIdSystem
 * @requires module:modules/userId
 */

import {ajax} from '../src/ajax.js';
import {submodule} from '../src/hook.js';
import {formatQS, logError} from '../src/utils.js';
import {includes} from '../src/polyfill.js';

/**
 * @typedef {import('../modules/userId/index.js').Submodule} Submodule
 * @typedef {import('../modules/userId/index.js').SubmoduleConfig} SubmoduleConfig
 * @typedef {import('../modules/userId/index.js').ConsentData} ConsentData
 * @typedef {import('../modules/userId/index.js').IdResponse} IdResponse
 */

const MODULE_NAME = 'verizonMediaId';
const VENDOR_ID = 25;
const PLACEHOLDER = '__PIXEL_ID__';
const VMCID_ENDPOINT = `https://ups.analytics.yahoo.com/ups/${PLACEHOLDER}/fed`;

function isEUConsentRequired(consentData) {
  return !!(consentData && consentData.gdpr && consentData.gdpr.gdprApplies);
}

/** @type {Submodule} */
export const verizonMediaIdSubmodule = {
  /**
   * used to link submodule with config
   * @type {string}
   */
  name: MODULE_NAME,
  /**
   * Vendor id of Verizon Media EMEA Limited
   * @type {Number}
   */
  gvlid: VENDOR_ID,
  /**
   * decode the stored id value for passing to bid requests
   * @function
   * @returns {{connectid: string} | undefined}
   */
  decode(value) {
    return (typeof value === 'object' && (value.connectid || value.vmuid))
      ? {connectid: value.connectid || value.vmuid} : undefined;
  },
  /**
   * Gets the Verizon Media Connect ID
   * @function
   * @param {SubmoduleConfig} [config]
   * @param {ConsentData} [consentData]
   * @returns {IdResponse|undefined}
   */
  getId(config, consentData) {
    const params = config.params || {};
    if (!params || typeof params.he !== 'string' ||
        (typeof params.pixelId === 'undefined' && typeof params.endpoint === 'undefined')) {
      logError('The verizonMediaId submodule requires the \'he\' and \'pixelId\' parameters to be defined.');
      return;
    }

    const data = {
      '1p': includes([1, '1', true], params['1p']) ? '1' : '0',
      he: params.he,
      gdpr: isEUConsentRequired(consentData) ? '1' : '0',
      gdpr_consent: isEUConsentRequired(consentData) ? consentData.gdpr.consentString : '',
      us_privacy: consentData && consentData.uspConsent ? consentData.uspConsent : ''
    };

    if (params.pixelId) {
      data.pixelId = params.pixelId
    }

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
      const endpoint = VMCID_ENDPOINT.replace(PLACEHOLDER, params.pixelId);
      let url = `${params.endpoint || endpoint}?${formatQS(data)}`;
      verizonMediaIdSubmodule.getAjaxFn()(url, callbacks, null, {method: 'GET', withCredentials: true});
    };
    return {callback: resp};
  },

  /**
   * Return the function used to perform XHR calls.
   * Utilised for each of testing.
   * @returns {Function}
   */
  getAjaxFn() {
    return ajax;
  },
  eids: {
    'connectid': {
      source: 'verizonmedia.com',
      atype: 3
    },
  }
};

submodule('userId', verizonMediaIdSubmodule);
