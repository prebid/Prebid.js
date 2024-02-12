"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.hasPurpose1Consent = hasPurpose1Consent;
var _utils = require("../utils.js");
/**
 * Check if GDPR purpose 1 consent was given.
 *
 * @param gdprConsent GDPR consent data
 * @returns {boolean} true if the gdprConsent is null-y; or GDPR does not apply; or if purpose 1 consent was given.
 */
function hasPurpose1Consent(gdprConsent) {
  if (gdprConsent !== null && gdprConsent !== void 0 && gdprConsent.gdprApplies) {
    return (0, _utils.deepAccess)(gdprConsent, 'vendorData.purpose.consents.1') === true;
  }
  return true;
}