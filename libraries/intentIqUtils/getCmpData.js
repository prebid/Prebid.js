import { allConsent } from "../../src/consentHandler.js";

/**
 * Retrieves consent data from the Consent Management Platform (CMP).
 * @return {Object} An object containing the following fields:
 * - `gdprApplies` (boolean): Whether GDPR applies.
 * - `gdprString` (string): GDPR consent string if available.
 * - `uspString` (string): USP consent string if available.
 * - `gppString` (string): GPP consent string if available.
 */
export function getCmpData() {
  const consentData = allConsent.getConsentData();

  return {
    gdprApplies: consentData?.gdpr?.gdprApplies || false,
    gdprString: typeof consentData?.gdpr?.consentString === 'string' ? consentData.gdpr.consentString : null,
    uspString: typeof consentData?.usp === 'string' ? consentData.usp : null,
    gppString: typeof consentData?.gpp?.gppString === 'string' ? consentData.gpp.gppString : null,
    tcfApiVersion: consentData?.gdpr?.apiVersion
  };
}

export function isValidValue(val) {
  return !!val && val !== 'undefined';
}

export function areCmpValuesEqual(a, b) {
  const aValid = isValidValue(a);
  const bValid = isValidValue(b);
  if (!aValid && !bValid) return true;
  if (aValid !== bValid) return false;
  return a === b;
}
