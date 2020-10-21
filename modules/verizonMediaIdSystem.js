/**
 * This module adds verizonMediaId to the User ID module
 * The {@link module:modules/userId} module is required
 * @module modules/verizonMediaIdSystem
 * @requires module:modules/userId
 */

import {ajax} from '../src/ajax.js';
import {submodule} from '../src/hook.js';
import * as utils from '../src/utils.js';

const MODULE_NAME = 'verizonMediaId';
const VENDOR_ID = 25;
const PLACEHOLDER = '__PIXEL_ID__';
const VMUID_ENDPOINT = `https://ups.analytics.yahoo.com/ups/${PLACEHOLDER}/fed`;

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
   * @returns {{vmuid: string} | undefined}
   */
  decode(value) {
    return (value && typeof value.vmuid === 'string') ? {vmuid: value.vmuid} : undefined;
  },
  /**
   * get the VerizonMedia Id
   * @function
   * @param {SubmoduleConfig} [config]
   * @param {ConsentData} [consentData]
   * @returns {IdResponse|undefined}
   */
  getId(config, consentData) {
    const params = config.params || {};
    if (!params || typeof params.he !== 'string' ||
        (typeof params.pixelId === 'undefined' && typeof params.endpoint === 'undefined')) {
      utils.logError('The verizonMediaId submodule requires the \'he\' and \'pixelId\' parameters to be defined.');
      return;
    }

    const data = {
      '1p': [1, '1', true].includes(params['1p']) ? '1' : '0',
      he: params.he,
      gdpr: isEUConsentRequired(consentData) ? '1' : '0',
      euconsent: isEUConsentRequired(consentData) ? consentData.gdpr.consentString : '',
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
              utils.logError(error);
            }
          }
          callback(responseObj);
        },
        error: error => {
          utils.logError(`${MODULE_NAME}: ID fetch encountered an error`, error);
          callback();
        }
      };
      const endpoint = VMUID_ENDPOINT.replace(PLACEHOLDER, params.pixelId);
      let url = `${params.endpoint || endpoint}?${utils.formatQS(data)}`;
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
  }
};

submodule('userId', verizonMediaIdSubmodule);
