/**
 * This module adds QuantcastID to the User ID module
 * The {@link module:modules/userId} module is required
 * @module modules/quantcastIdSystem
 * @requires module:modules/userId
 */

import {submodule} from '../src/hook.js'
import { getStorageManager } from '../src/storageManager.js';
import { triggerPixel, logInfo } from '../src/utils.js';
import { uspDataHandler, coppaDataHandler, gdprDataHandler } from '../src/adapterManager.js';

const QUANTCAST_FPA = '__qca';
const DEFAULT_COOKIE_EXP_DAYS = 392; // (13 months - 2 days)
const DAY_MS = 86400000;
const PREBID_PCODE = 'p-KceJUEvXN48CE';
const QSERVE_URL = 'https://pixel.quantserve.com/pixel';
const QUANTCAST_VENDOR_ID = '11';
const PURPOSE_DATA_COLLECT = '1';
const PURPOSE_PRODUCT_IMPROVEMENT = '10';
const QC_TCF_REQUIRED_PURPOSES = [PURPOSE_DATA_COLLECT, PURPOSE_PRODUCT_IMPROVEMENT];
const QC_TCF_CONSENT_FIRST_PURPOSES = [PURPOSE_DATA_COLLECT];
const QC_TCF_CONSENT_ONLY_PUPROSES = [PURPOSE_DATA_COLLECT];
const GDPR_PRIVACY_STRING = gdprDataHandler.getConsentData();
const US_PRIVACY_STRING = uspDataHandler.getConsentData();

export const storage = getStorageManager();

export function firePixel(clientId, cookieExpDays = DEFAULT_COOKIE_EXP_DAYS) {
  // check for presence of Quantcast Measure tag _qevent obj and publisher provided clientID
  if (!window._qevents && clientId && clientId != '') {
    var fpa = storage.getCookie(QUANTCAST_FPA);
    var fpan = '0';
    var domain = quantcastIdSubmodule.findRootDomain();
    var now = new Date();
    var usPrivacyParamString = '';
    var firstPartyParamStrings;
    var gdprParamStrings;

    if (!fpa) {
      var et = now.getTime();
      var expires = new Date(et + (cookieExpDays * DAY_MS)).toGMTString();
      var rand = Math.round(Math.random() * 2147483647);
      fpa = `B0-${rand}-${et}`;
      fpan = '1';
      storage.setCookie(QUANTCAST_FPA, fpa, expires, '/', domain, null);
    }

    firstPartyParamStrings = `&fpan=${fpan}&fpa=${fpa}`;
    gdprParamStrings = '&gdpr=0';
    if (GDPR_PRIVACY_STRING && typeof GDPR_PRIVACY_STRING.gdprApplies === 'boolean' && GDPR_PRIVACY_STRING.gdprApplies) {
      gdprParamStrings = `gdpr=1&gdpr_consent=${GDPR_PRIVACY_STRING.consentString}`;
    }
    if (US_PRIVACY_STRING && typeof US_PRIVACY_STRING === 'string') {
      usPrivacyParamString = `&us_privacy=${US_PRIVACY_STRING}`;
    }

    let url = QSERVE_URL +
    '?d=' + domain +
    '&client_id=' + clientId +
    '&a=' + PREBID_PCODE +
    usPrivacyParamString +
    gdprParamStrings +
    firstPartyParamStrings;

    triggerPixel(url);
  }
};

export function hasGDPRConsent(gdprConsent) {
  // Check for GDPR consent for purpose 1 and 10, and drop request if consent has not been given
  // Remaining consent checks are performed server-side.
  if (gdprConsent && typeof gdprConsent.gdprApplies === 'boolean' && gdprConsent.gdprApplies) {
    if (!gdprConsent.vendorData) {
      return false;
    }
    if (gdprConsent.apiVersion === 1) {
      // We are not supporting TCF v1
      return false;
    }
    if (gdprConsent.apiVersion === 2) {
      return checkTCFv2(gdprConsent.vendorData);
    }
  }
  return true;
}

export function checkTCFv2(vendorData, requiredPurposes = QC_TCF_REQUIRED_PURPOSES) {
  var gdprApplies = vendorData.gdprApplies;
  var purposes = vendorData.purpose;
  var vendors = vendorData.vendor;
  var qcConsent = vendors && vendors.consents && vendors.consents[QUANTCAST_VENDOR_ID];
  var qcInterest = vendors && vendors.legitimateInterests && vendors.legitimateInterests[QUANTCAST_VENDOR_ID];
  var restrictions = vendorData.publisher ? vendorData.publisher.restrictions : {};

  if (!gdprApplies) {
    return true;
  }

  return requiredPurposes.map(function(purpose) {
    var purposeConsent = purposes.consents ? purposes.consents[purpose] : false;
    var purposeInterest = purposes.legitimateInterests ? purposes.legitimateInterests[purpose] : false;

    var qcRestriction = restrictions && restrictions[purpose]
      ? restrictions[purpose][QUANTCAST_VENDOR_ID]
      : null;

    if (qcRestriction === 0) {
      return false;
    }

    // Seek consent or legitimate interest based on our default legal
    // basis for the purpose, falling back to the other if possible.
    if (
      // we have positive vendor consent
      qcConsent &&
      // there is positive purpose consent
      purposeConsent &&
      // publisher does not require legitimate interest
      qcRestriction !== 2 &&
      // purpose is a consent-first purpose or publisher has explicitly restricted to consent
      (QC_TCF_CONSENT_FIRST_PURPOSES.indexOf(purpose) != -1 || qcRestriction === 1)
    ) {
      return true;
    } else if (
      // publisher does not require consent
      qcRestriction !== 1 &&
      // we have legitimate interest for vendor
      qcInterest &&
      // there is legitimate interest for purpose
      purposeInterest &&
      // purpose's legal basis does not require consent
      QC_TCF_CONSENT_ONLY_PUPROSES.indexOf(purpose) == -1 &&
      // purpose is a legitimate-interest-first purpose or publisher has explicitly restricted to legitimate interest
      (QC_TCF_CONSENT_FIRST_PURPOSES.indexOf(purpose) == -1 || qcRestriction === 2)
    ) {
      return true;
    }

    return false;
  }).reduce(function(a, b) {
    return a && b;
  }, true);
}

/**
 * tests if us_privacy consent string is present, us_privacy applies, and notice_given / do-not-sell is set to yes
 * @returns {boolean}
 */
export function hasCCPAConsent(usPrivacyConsent) {
  if (
    usPrivacyConsent &&
    typeof usPrivacyConsent === 'string' &&
    usPrivacyConsent.length == 4 &&
    usPrivacyConsent.charAt(1) == 'Y' &&
    usPrivacyConsent.charAt(2) == 'Y'
  ) {
    return false
  }
  return true;
}

/** @type {Submodule} */
export const quantcastIdSubmodule = {
  /**
   * used to link submodule with config
   * @type {string}
   */
  name: 'quantcastId',

  /**
   * Vendor id of Quantcast
   * @type {Number}
   */
  gvlid: QUANTCAST_VENDOR_ID,

  /**
   * decode the stored id value for passing to bid requests
   * @function
   * @returns {{quantcastId: string} | undefined}
   */
  decode(value) {
    return value;
  },

  /**
   * read Quantcast first party cookie and pass it along in quantcastId
   * @function
   * @returns {{id: {quantcastId: string} | undefined}}}
   */
  getId(config) {
    // Consent signals are currently checked on the server side.
    let fpa = storage.getCookie(QUANTCAST_FPA);

    const coppa = coppaDataHandler.getCoppa();

    if (coppa || !hasCCPAConsent(US_PRIVACY_STRING) || !hasGDPRConsent(GDPR_PRIVACY_STRING)) {
      var expired = new Date(0).toUTCString();
      var domain = quantcastIdSubmodule.findRootDomain();
      logInfo('QuantcastId: Necessary consent not present for Id, exiting QuantcastId');
      storage.setCookie(QUANTCAST_FPA, '', expired, '/', domain, null);
      return undefined;
    }

    const configParams = (config && config.params) || {};
    const storageParams = (config && config.storage) || {};

    var clientId = configParams.clientId || '';
    var cookieExpDays = storageParams.expires || DEFAULT_COOKIE_EXP_DAYS;

    // Callbacks on Event Listeners won't trigger if the event is already complete so this check is required
    if (document.readyState === 'complete') {
      firePixel(clientId, cookieExpDays);
    } else {
      window.addEventListener('load', function () {
        firePixel(clientId, cookieExpDays);
      });
    }

    return { id: fpa ? { quantcastId: fpa } : undefined }
  }
};

submodule('userId', quantcastIdSubmodule);
