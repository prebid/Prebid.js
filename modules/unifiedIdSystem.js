/**
 * This module adds UnifiedId to the User ID module
 * The {@link module:modules/userId} module is required
 * @module modules/unifiedIdSystem
 * @requires module:modules/userId
 */

import { logError, parseQueryStringParameters } from '../src/utils.js';
import { getRefererInfo } from '../src/refererDetection.js';
import { ajax } from '../src/ajax.js';
import { submodule } from '../src/hook.js';
import { UID1_EIDS } from '../libraries/uid1Eids/uid1Eids.js';

/**
 * @typedef {import('../modules/userId/index.js').Submodule} Submodule
 * @typedef {import('../modules/userId/index.js').SubmoduleConfig} SubmoduleConfig
 * @typedef {import('../modules/userId/index.js').IdResponse} IdResponse
 * @typedef {import('../src/consentHandler.js').AllConsentData} ConsentData
 * @typedef {import('./unifiedIdSystem.d.ts').UnifiedId} UnifiedId
 */

const MODULE_NAME = 'unifiedId';

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
   * @returns {{tdid: UnifiedId}|undefined}
   */
  decode(value) {
    return (value && typeof value['TDID'] === 'string') ? { 'tdid': value['TDID'] } : undefined;
  },
  /**
   * performs action to obtain id and return a value in the callback's response argument
   * @function
   * @param {SubmoduleConfig} [config]
   * @param {ConsentData} [consentData]
   * @returns {IdResponse|undefined}
   */
  getId(config, consentData) {
    const configParams = (config && config.params) || {};
    if (!configParams || (typeof configParams.partner !== 'string' && typeof configParams.url !== 'string')) {
      logError('User ID - unifiedId submodule requires either partner or url to be defined');
      return;
    }
    // Custom URLs are used verbatim; enrich only the default RID request.
    let url = configParams.url;
    if (!url) {
      const queryParams = { ttd_pid: configParams.partner, fmt: 'json' };
      const gdprConsent = consentData?.gdpr;
      if (typeof gdprConsent?.gdprApplies === 'boolean') {
        queryParams.gdpr = gdprConsent.gdprApplies ? 1 : 0;
      }
      if (typeof gdprConsent?.consentString === 'string' && gdprConsent.consentString) {
        queryParams.gdpr_consent = gdprConsent.consentString;
      }
      const domain = getRefererInfo().domain;
      if (domain) {
        queryParams.domain = domain;
      }
      url = `https://match.adsrvr.org/track/rid?${parseQueryStringParameters(queryParams)}`;
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
      ajax(url, callbacks, undefined, { method: 'GET', withCredentials: true });
    };
    return { callback: resp };
  },
  eids: {
    tdid: {
      ...UID1_EIDS.tdid,
      mm: 4,
      inserter: 'adserver.org',
      matcher: 'adserver.org'
    }
  }
};

submodule('userId', unifiedIdSubmodule);
