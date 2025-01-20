import {gppDataHandler, uspDataHandler, gdprDataHandler} from '../../src/consentHandler.js';

/**
 * Retrieves consent data from the Consent Management Platform (CMP), prioritizing user-provided values.
 * If user-provided values are unavailable or undefined, framework-provided values are used.
 *
 * @param {Object} configParams - Configuration object containing user-provided consent strings and flags.
 * @param {string} [configParams.providedGDPR] - User-provided GDPR consent string (default: empty string).
 * @param {string} [configParams.providedGPP] - User-provided GPP consent string (default: empty string).
 * @param {string} [configParams.providedUSP] - User-provided USP consent string (default: empty string).
 * @param {boolean} [configParams.allowGDPR=true] - Flag to allow the use of GDPR.
 * @param {boolean} [configParams.allowGPP=true] - Flag to allow the use of GPP.
 * @param {boolean} [configParams.allowUSP=true] - Flag to allow the use of USP.
 *
 * @return {Object} An object containing the following fields:
 * - `allowGDPR` (boolean): Indicates whether GDPR is allowed.
 * - `allowGPP` (boolean): Indicates whether GPP is allowed.
 * - `allowUSP` (boolean): Indicates whether USP is allowed.
 * - `gdprString` (string): The GDPR consent string (user-provided or from CMP).
 * - `uspString` (string): The USP consent string (user-provided or from CMP).
 * - `gppString` (string): The GPP consent string (user-provided or from CMP).
 */

export function getCmpData(configParams) {
  const {
    providedGDPR = '',
    providedGPP = '',
    providedUSP = '',
    allowGDPR = true,
    allowGPP = true,
    allowUSP = true
  } = configParams;

  const cmpConfig = {
    providedGDPRString: allowGDPR ? providedGDPR : 'undefined',
    providedGPPString: allowGPP ? providedGPP : 'undefined',
    providedUSPString: allowUSP ? providedUSP : 'undefined',
  };

  const gppData = gppDataHandler.getConsentData() || {};
  const uspData = uspDataHandler.getConsentData() || '';
  const gdprData = gdprDataHandler.getConsentData() || {};

  return {
    allowGDPR: allowGDPR,
    allowGPP: allowGPP,
    allowUSP: allowUSP,
    gdprString: cmpConfig.providedGDPRString ? cmpConfig.providedGDPRString : gdprData.consentString,
    uspString: cmpConfig.providedUSPString ? cmpConfig.providedUSPString : uspData,
    gppString: cmpConfig.providedGPPString ? cmpConfig.providedGPPString : gppData.gppString,
  };
}
