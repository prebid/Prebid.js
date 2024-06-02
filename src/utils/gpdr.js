import {deepAccess} from '../utils.js';

/**
 * Check if GDPR purpose 1 consent was given.
 *
 * @param gdprConsent GDPR consent data
 * @returns {boolean} true if the gdprConsent is null-y; or GDPR does not apply; or if purpose 1 consent was given.
 */
export function hasPurpose1Consent(gdprConsent) {
  if (gdprConsent?.gdprApplies) {
    return deepAccess(gdprConsent, 'vendorData.purpose.consents.1') === true;
  }
  return true;
}
