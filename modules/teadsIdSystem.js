/**
 * This module adds TeadsId to the User ID module
 * The {@link module:modules/userId} module is required
 * @module modules/teadsIdSystem
 * @requires module:modules/userId
 */

import {isStr, isNumber, logError, logInfo, isEmpty, timestamp} from '../src/utils.js'
import {ajax} from '../src/ajax.js';
import {submodule} from '../src/hook.js';
import {getStorageManager} from '../src/storageManager.js';
import {uspDataHandler} from '../src/adapterManager.js';

const MODULE_NAME = 'teadsId';
const GVL_ID = 132;
const FP_TEADS_ID_COOKIE_NAME = '_tfpvi';
const EXPIRED_COOKIE_DATE = 'Thu, 01 Jan 1970 00:00:01 GMT';

export const gdprStatus = {
  GDPR_DOESNT_APPLY: 0,
  CMP_NOT_FOUND_OR_ERROR: 22,
  GDPR_APPLIES_PUBLISHER: 12,
};

export const gdprReason = {
  GDPR_DOESNT_APPLY: 0,
  CMP_NOT_FOUND: 220,
  GDPR_APPLIES_PUBLISHER_CLASSIC: 120,
};

export const storage = getStorageManager({gvlid: GVL_ID, moduleName: MODULE_NAME});

/** @type {Submodule} */
export const teadsIdSubmodule = {
  /**
     * used to link submodule with config
     * @type {string}
     */
  name: MODULE_NAME,
  /**
   * Vendor id of Teads
   * @type {number}
   */
  gvlid: GVL_ID,
  /**
     * decode the stored id value for passing to bid requests
     * @function
     * @param {string} value
     * @returns {{teadsId:string}}
     */
  decode(value) {
    return {teadsId: value}
  },
  /**
     * performs action to obtain id and return a value in the callback's response argument
     * @function
     * @param {SubmoduleConfig} [submoduleConfig]
     * @param {ConsentData} [consentData]
     * @returns {IdResponse|undefined}
     */
  getId(submoduleConfig, consentData) {
    const resp = function (callback) {
      const url = buildAnalyticsTagUrl(submoduleConfig, consentData);

      const callbacks = {
        success: (bodyResponse, responseObj) => {
          if (responseObj && responseObj.status === 200) {
            if (isStr(bodyResponse) && !isEmpty(bodyResponse)) {
              const cookiesMaxAge = getTimestampFromDays(365); // 1 year
              const expirationCookieDate = getCookieExpirationDate(cookiesMaxAge);
              storage.setCookie(FP_TEADS_ID_COOKIE_NAME, bodyResponse, expirationCookieDate);
              callback(bodyResponse);
            } else {
              storage.setCookie(FP_TEADS_ID_COOKIE_NAME, '', EXPIRED_COOKIE_DATE);
              callback();
            }
          } else {
            logInfo(`${MODULE_NAME}: Server error while fetching ID`);
            callback();
          }
        },
        error: error => {
          logError(`${MODULE_NAME}: ID fetch encountered an error`, error);
          callback();
        }
      };

      ajax(url, callbacks, undefined, {method: 'GET'});
    };
    return {callback: resp};
  }
};

/**
 * Build the full URL from the Submodule config & consentData
 * @param submoduleConfig
 * @param consentData
 * @returns {string}
 */
export function buildAnalyticsTagUrl(submoduleConfig, consentData) {
  const pubId = getPublisherId(submoduleConfig);
  const teadsViewerId = getTeadsViewerId();
  const status = getGdprStatus(consentData);
  const gdprConsentString = getGdprConsentString(consentData);
  const ccpaConsentString = getCcpaConsentString(uspDataHandler?.getConsentData());
  const gdprReason = getGdprReasonFromStatus(status);
  const params = {
    analytics_tag_id: pubId,
    tfpvi: teadsViewerId,
    gdpr_consent: gdprConsentString,
    gdpr_status: status,
    gdpr_reason: gdprReason,
    ccpa_consent: ccpaConsentString,
    sv: 'prebid-v1',
  };

  const url = 'https://at.teads.tv/fpc';
  const queryParams = new URLSearchParams();

  for (const param in params) {
    queryParams.append(param, params[param]);
  }

  return url + '?' + queryParams.toString();
}

/**
 * Extract the Publisher ID from the Submodule config
 * @returns {string}
 * @param submoduleConfig
 */
export function getPublisherId(submoduleConfig) {
  const pubId = submoduleConfig?.params?.pubId;
  const prefix = 'PUB_';
  if (isNumber(pubId)) {
    return prefix + pubId.toString();
  }
  if (isStr(pubId) && parseInt(pubId)) {
    return prefix + pubId;
  }
  return '';
}

/**
 * Extract the GDPR status from the given consentData
 * @param consentData
 * @returns {number}
 */
export function getGdprStatus(consentData) {
  const gdprApplies = consentData?.gdprApplies;
  if (gdprApplies === true) {
    return gdprStatus.GDPR_APPLIES_PUBLISHER;
  } else if (gdprApplies === false) {
    return gdprStatus.GDPR_DOESNT_APPLY;
  } else {
    return gdprStatus.CMP_NOT_FOUND_OR_ERROR;
  }
}

/**
 * Extract the GDPR consent string from the given consentData
 * @param consentData
 * @returns {string}
 */
export function getGdprConsentString(consentData) {
  const consentString = consentData?.consentString;
  if (isStr(consentString)) {
    return consentString;
  } else {
    return '';
  }
}

/**
 * Map the GDPR reason from the given GDPR status
 * @param status
 * @returns {number}
 */
function getGdprReasonFromStatus(status) {
  switch (status) {
    case gdprStatus.GDPR_DOESNT_APPLY:
      return gdprReason.GDPR_DOESNT_APPLY;
    case gdprStatus.CMP_NOT_FOUND_OR_ERROR:
      return gdprReason.CMP_NOT_FOUND;
    case gdprStatus.GDPR_APPLIES_PUBLISHER:
      return gdprReason.GDPR_APPLIES_PUBLISHER_CLASSIC;
    default:
      return -1;
  }
}

/**
 * Return the well formatted CCPA consent string
 * @param ccpaConsentString
 * @returns {string|*}
 */
export function getCcpaConsentString(ccpaConsentString) {
  if (isStr(ccpaConsentString)) {
    return ccpaConsentString;
  } else {
    return '';
  }
}

/**
 * Get the cookie expiration date string from a given Date and a max age
 * @param {number} maxAge
 * @returns {string}
 */
export function getCookieExpirationDate(maxAge) {
  return new Date(timestamp() + maxAge).toUTCString()
}

/**
 * Get cookie from Cookie or Local Storage
 * @returns {string}
 */
function getTeadsViewerId() {
  const teadsViewerId = readCookie()
  if (isStr(teadsViewerId)) {
    return teadsViewerId
  } else {
    return '';
  }
}

function readCookie() {
  return storage.cookiesAreEnabled(null) ? storage.getCookie(FP_TEADS_ID_COOKIE_NAME, null) : null;
}

/**
 * Return a number of milliseconds from given days number
 * @param days
 * @returns {number}
 */
export function getTimestampFromDays(days) {
  return days * 24 * 60 * 60 * 1000;
}
submodule('userId', teadsIdSubmodule);
