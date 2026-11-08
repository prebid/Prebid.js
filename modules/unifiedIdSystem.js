/**
 * This module adds UnifiedId to the User ID module
 * The {@link module:modules/userId} module is required
 * @module modules/unifiedIdSystem
 * @requires module:modules/userId
 */

import { logError, parseQueryStringParameters, parseUrl } from '../src/utils.js';
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
    let url = configParams.url;
    const customUrl = url && parseUrl(url, { noDecodeWholeURL: true });
    if (!url || customUrl.hostname === 'match.adsrvr.org') {
      const queryParams = { ttd_pid: configParams.partner, fmt: 'json' };
      const ridUrl = new URL(customUrl ? customUrl.href : `https://match.adsrvr.org/track/rid?${parseQueryStringParameters(queryParams)}`);
      const gdprConsent = consentData?.gdpr;
      // Preserve publisher-supplied parameters, including empty values.
      if (!ridUrl.searchParams.has('gdpr') && typeof gdprConsent?.gdprApplies === 'boolean') {
        ridUrl.searchParams.set('gdpr', gdprConsent.gdprApplies ? '1' : '0');
      }
      if (!ridUrl.searchParams.has('gdpr_consent') && typeof gdprConsent?.consentString === 'string' && gdprConsent.consentString) {
        ridUrl.searchParams.set('gdpr_consent', gdprConsent.consentString);
      }
      const domain = getRefererInfo().domain;
      if (!ridUrl.searchParams.has('domain') && domain) {
        ridUrl.searchParams.set('domain', domain);
      }
      url = ridUrl.toString();
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
