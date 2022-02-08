/**
 * This module adds PubMatic to the User ID module
 * The {@link module:modules/userId} module is required
 * @module modules/pubmaticIdSystem
 * @requires module:modules/userId
 */

import { logInfo, logError, isEmpty, isNumber, isStr, isEmptyStr } from '../src/utils.js';
import { ajax } from '../src/ajax.js';
import { submodule } from '../src/hook.js';

const MODULE_NAME = 'pubmaticId';
const GVLID = 76;
export const STORAGE_NAME = 'pubmaticId';
const STORAGE_EXPIRES = 30; // days
const STORAGE_REFRESH_IN_SECONDS = 24 * 3600; // 24 Hours
const LOG_PREFIX = 'User ID - PubMatic submodule: ';
const VERSION = '1';

function generateEncodedId(responseObj) {
  let jsonData = {'pmid': responseObj.id};
  return (VERSION + '||' + btoa(JSON.stringify(jsonData)));
}

/** @type {Submodule} */
export const pubmaticIdSubmodule = {
  /**
   * used to link submodule with config
   * @type {string}
   */
  name: MODULE_NAME,

  /**
   * Vendor id of PubMatic
   * @type {Number}
   */
  gvlid: GVLID,

  /**
   * decode the stored id value for passing to bid requests
   * @function decode
   * @param {(Object|string)} value
   * @param {SubmoduleConfig|undefined} config
   * @returns {(Object|undefined)}
   */
  decode(value, config) {
    if (isStr(value) && !isEmptyStr(value)) {
      return {pubmaticId: value};
    }
    return undefined;
  },

  /**
   * performs action to obtain id and return a value in the callback's response argument
   * @function getId
   * @param {SubmoduleConfig} config
   * @param {ConsentData} consentData
   * @param {(Object|undefined)} cacheIdObj
   * @returns {IdResponse|undefined}
   */
  getId(config, consentData, cacheIdObj) {
    if (!hasRequiredConfig(config)) {
      return undefined;
    }

    const resp = function (callback) {
      const callbacks = {
        success: response => {
          let responseObj;
          if (response) {
            try {
              responseObj = JSON.parse(response);
              logInfo(LOG_PREFIX + 'response received from the server', responseObj);
            } catch (error) {
              logError(LOG_PREFIX + error);
            }
          }
          if (isStr(responseObj.id) && !isEmptyStr(responseObj.id)) {
            callback(generateEncodedId(responseObj));
          } else {
            callback()
          }
        },
        error: error => {
          logError(LOG_PREFIX + 'getId fetch encountered an error', error);
          callback();
        }
      };

      logInfo(LOG_PREFIX + 'requesting an ID from the server');

      pubmaticIdSubmodule.getAjaxFn()(generateURL(config, consentData), callbacks, null, { method: 'POST', withCredentials: true });
    };
    return { callback: resp };
  },

  getAjaxFn() {
    return ajax;
  }
};

function generateURL(config, consentData) {
  let endpoint = 'https://image6.pubmatic.com/AdServer/UCookieSetPug?oid=5&p=' + config.params.publisherId;
  const hasGdpr = (consentData && consentData.gdpr && consentData.gdpr.gdprApplies) ? 1 : 0;
  const usp = (consentData && consentData.uspConsent) ? consentData.uspConsent : '';

  // Attaching GDPR Consent Params in UserSync url
  if (hasGdpr) {
    endpoint += '&gdpr=1';
    let gdprConsentstring = (typeof consentData.gdpr.consentString !== 'undefined' && !isEmpty(consentData.gdpr.consentString) && !isEmptyStr(consentData.gdpr.consentString)) ? encodeURIComponent(consentData.gdpr.consentString) : '';
    endpoint += '&gdpr_consent=' + gdprConsentstring;
  }

  // CCPA
  if (usp) {
    endpoint += '&us_privacy=' + encodeURIComponent(usp);
  }

  return endpoint;
}

function hasRequiredConfig(config) {
  if (!config || !config.storage || !config.params) {
    logError(LOG_PREFIX + `config.storage and config.params should be passed.`);
    return false;
  }

  if (config.storage.name !== STORAGE_NAME) {
    logError(LOG_PREFIX + `config.storage.name should be '${STORAGE_NAME}'.`);
    return false;
  }

  if (config.storage.expires !== STORAGE_EXPIRES) {
    logError(LOG_PREFIX + `config.storage.expires should be ${STORAGE_EXPIRES}.`);
    return false;
  }

  if (config.storage.refreshInSeconds !== STORAGE_REFRESH_IN_SECONDS) {
    logError(LOG_PREFIX + `config.storage.refreshInSeconds should be ${STORAGE_REFRESH_IN_SECONDS}.`);
    return false;
  }

  if (!config.params || !isNumber(config.params.publisherId)) {
    logError(LOG_PREFIX + `config.params.publisherId (int) should be provided.`);
    return false;
  }

  return true;
}

submodule('userId', pubmaticIdSubmodule);
