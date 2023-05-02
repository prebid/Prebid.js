import {deepAccess, logWarn} from '../utils.js';

/**
 * Check if GDPR purpose 1 consent was given.
 *
 * @param gdprConsent GDPR consent data
 * @returns {boolean} true if the gdprConsent is null-y; or GDPR does not apply; or if purpose 1 consent was given.
 */
export function hasPurpose1Consent(gdprConsent) {
  logWarn(`Privacy - checking purpose1Consent - ${gdprConsent}`);
  if(gdprConsent === null) {
    logWarn(`Privacy - gdprConsent is null, checking value of defaultGdprScope = ${owpbjs?.getConfig().consentManagement?.gdpr?.defaultGdprScope}`);
    return !(owpbjs?.getConfig().consentManagement?.gdpr?.defaultGdprScope === true)
  }
  if (gdprConsent?.gdprApplies) {
    logWarn(`Privacy - gdprConsent?.gdprApplies = ${gdprConsent?.gdprApplies} and purpose consent = ${gdprConsent.vendorData.purpose.consents}`);
    return deepAccess(gdprConsent, 'vendorData.purpose.consents.1') === true;
  }
  return true;
}
