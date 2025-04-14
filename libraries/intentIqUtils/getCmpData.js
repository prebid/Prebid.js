import { allConsent } from '../../src/consentHandler.js';

/**
 * Retrieves consent data from the Consent Management Platform (CMP).
 * @return {Object} An object containing the following fields:
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
  };
}
