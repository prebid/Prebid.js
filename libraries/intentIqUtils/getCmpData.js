import {gppDataHandler, uspDataHandler, gdprDataHandler} from '../../src/consentHandler.js';

/**
 * Retrieves CMP (Consent Management Platform) data, prioritizing user-provided values.
 * Falls back to framework-provided values if user-provided values are unavailable or undefined.
 *
 * @param {Object} cmpConfig - Configuration object with user-provided consent strings and flags.
 * @return {Object} An object containing:
 * - `gdpr` (string): The GDPR consent string.
 * - `usp` (string): The USP consent string.
 * - `gpp` (string): The encoded GPP (Global Privacy Platform) consent string.
 * - `gpi` (number): Indicator (GPP Issue) for GPP consent availability (0 if GPP string is available, 1 otherwise).
 */
export function getCmpData(cmpConfig) {
  const gppData = gppDataHandler.getConsentData() || {};
  const uspData = uspDataHandler.getConsentData() || '';
  const gdprData = gdprDataHandler.getConsentData() || {};

  return {
    gdprString: cmpConfig.providedGDPRString ? cmpConfig.providedGDPRString : gdprData.consentString,
    uspString: cmpConfig.providedUSPString ? cmpConfig.providedUSPString : uspData,
    gppString: cmpConfig.providedGPPString ? cmpConfig.providedGPPString : gppData.gppString,
    gpi: cmpConfig.providedGPPString ? 0 : (gppData.gppString ? 0 : 1)
  };
}
