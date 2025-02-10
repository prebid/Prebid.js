import { gppDataHandler, uspDataHandler, gdprDataHandler } from '../../src/consentHandler.js';

/**
 * Retrieves consent data from the Consent Management Platform (CMP).
 * The function respects the provided flags to enable or disable specific consent frameworks.
 *
 * @param {Object} configParams - Configuration object containing consent flags.
 * @param {boolean} [configParams.allowGDPR=true] - Flag to allow the use of GDPR.
 * @param {boolean} [configParams.allowGPP=true] - Flag to allow the use of GPP.
 * @param {boolean} [configParams.allowUSP=true] - Flag to allow the use of USP.
 *
 * @return {Object} An object containing the following fields:
 * - `allowGDPR` (boolean): Indicates whether GDPR is allowed.
 * - `allowGPP` (boolean): Indicates whether GPP is allowed.
 * - `allowUSP` (boolean): Indicates whether USP is allowed.
 * - `gdprString` (string): GDPR consent string if allowed, otherwise `undefined`.
 * - `uspString` (string): USP consent string if allowed, otherwise `undefined`.
 * - `gppString` (string): GPP consent string if allowed, otherwise `undefined`.
 */

export function getCmpData(configParams) {
  const {
    allowGDPR = true,
    allowGPP = true,
    allowUSP = true
  } = configParams;

  const gppData = gppDataHandler.getConsentData() || {};
  const uspData = uspDataHandler.getConsentData() || '';
  const gdprData = gdprDataHandler.getConsentData() || {};

  return {
    allowGDPR,
    allowGPP,
    allowUSP,
    gdprString: allowGDPR ? gdprData.consentString : 'undefined',
    uspString: allowUSP ? uspData : 'undefined',
    gppString: allowGPP ? gppData.gppString : 'undefined',
  };
}
