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
const DEFAULT_COOKIE_EXP_TIME = 392; // (13 months - 2 days)
const PREBID_PCODE = 'p-KceJUEvXN48CE'; // Not associated with a real account
const DOMAIN_QSERVE = 'https://pixel.quantserve.com/pixel';
const QUANTCAST_VENDOR_ID = '11';
const PURPOSE_DATA_COLLECT = '1';
const PURPOSE_PRODUCT_IMPROVEMENT = '10';
const QC_TCF_REQUIRED_PURPOSES = [PURPOSE_DATA_COLLECT, PURPOSE_PRODUCT_IMPROVEMENT];
const QC_TCF_CONSENT_FIRST_PURPOSES = [PURPOSE_DATA_COLLECT];
const QC_TCF_CONSENT_ONLY_PUPROSES = [PURPOSE_DATA_COLLECT];

var clientId;
var cookieExpTime;

export const storage = getStorageManager();

export function firePixel() {
  // check for presence of Quantcast Measure tag _qevent obj
  if (!window._qevents) {
    const gdprPrivacyString = gdprDataHandler.getConsentData();
    const usPrivacyString = uspDataHandler.getConsentData();

    var fpa = storage.getCookie(QUANTCAST_FPA);
    var fpan = '0';
    var now = new Date();
    var domain = quantcastIdSubmodule.findRootDomain();
    var et = now.getTime();
    var tzo = now.getTimezoneOffset();
    var usPrivacyParamString = '';
    var firstPartyParamStrings;
    var gdprParamStrings;

    if (!(hasGDPRConsent(gdprPrivacyString) && hasCCPAConsent(usPrivacyString))) {
      var expired = new Date(0).toUTCString();
      storage.setCookie(QUANTCAST_FPA, '', expired, '/', domain, null);
      return;
    } else if (!fpa) {
      var expires = new Date(now.getTime() + (cookieExpTime * 86400000)).toGMTString();
      fpa = 'B0-' + Math.round(Math.random() * 2147483647) + '-' + et;
      fpan = '1';
      storage.setCookie(QUANTCAST_FPA, fpa, expires, '/', domain, null);
    }

    firstPartyParamStrings = `&fpan=${fpan}&fpa=${fpa}`;
    gdprParamStrings = '&gdpr=0';
    if (gdprPrivacyString && typeof gdprPrivacyString.gdprApplies === 'boolean' && gdprPrivacyString.gdprApplies) {
      gdprParamStrings = `gdpr=1&gdpr_consent=${gdprPrivacyString.consentString}`;
    }
    if (usPrivacyString && typeof usPrivacyString === 'string') {
      usPrivacyParamString = `&us_privacy=${usPrivacyString}`;
    }

    let url = DOMAIN_QSERVE +
    '?d=' + domain +
    '&et=' + et +
    '&tzo=' + tzo +
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
      return checkTCFv1(gdprConsent.vendorData);
    }
    if (gdprConsent.apiVersion === 2) {
      return checkTCFv2(gdprConsent.vendorData);
    }
  }
  return true;
}

export function checkTCFv1(vendorData) {
  var vendorConsent = vendorData.vendorConsents && vendorData.vendorConsents[QUANTCAST_VENDOR_ID];
  var purposeConsent = vendorData.purposeConsents && vendorData.purposeConsents[PURPOSE_DATA_COLLECT];

  return !!(vendorConsent && purposeConsent);
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
 * tests if us_privacy consent string is present, us_privacy applies, and do-not-sell is not set
 * @returns {boolean}
 */
function hasCCPAConsent(usPrivacyConsent) {
  // TODO : Needs to be revisited
  if (usPrivacyConsent && usPrivacyConsent !== '1---') {
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
    if (coppa) {
      logInfo('QuantcastId: IDs not provided for coppa requests, exiting QuantcastId');
      return;
    }

    const configParams = (config && config.params) || {};
    const storageParams = (config && config.storage) || {};

    clientId = configParams.clientId || '';
    cookieExpTime = storageParams.expires || DEFAULT_COOKIE_EXP_TIME;

    // Callbacks on Event Listeners won't trigger if the event is already complete so this check is required
    if (document.readyState === 'complete') {
      firePixel();
    }
    window.addEventListener('load', firePixel);

    return { id: fpa ? { quantcastId: fpa } : undefined }
  }
};

submodule('userId', quantcastIdSubmodule);
