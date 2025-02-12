import { gppDataHandler, uspDataHandler, gdprDataHandler } from '../../src/consentHandler.js';

/**
 * Retrieves consent data from the Consent Management Platform (CMP).
 * @return {Object} An object containing the following fields:
 * - `gdprString` (string): GDPR consent string if available.
 * - `uspString` (string): USP consent string if available.
 * - `gppString` (string): GPP consent string if available.
 */

export function getCmpData() {
  const gppData = gppDataHandler.getConsentData();
  const uspData = uspDataHandler.getConsentData();
  const gdprData = gdprDataHandler.getConsentData();

  return {
    gdprString: typeof gdprData?.consentString === 'string' ? gdprData.consentString : null,
    uspString: typeof uspData === 'string' ? uspData : null,
    gppString: typeof gppData?.gppString === 'string' ? gppData.gppString : null,
  };
}
