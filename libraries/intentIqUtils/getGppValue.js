import {gppDataHandler} from '../../src/consentHandler.js';

/**
 * Retrieves the GPP string value and additional GPP-related information.
 * This function extracts the GPP data, encodes it, and determines specific GPP flags such as GPI and applicable sections.
 * @return {Object} An object containing:
 * - `gppString` (string): The encoded GPP string value.
 * - `gpi` (number): An indicator representing whether GPP consent is available (0 if available, 1 if not).
 */
export function getGppValue() {
  const gppData = gppDataHandler.getConsentData();
  const gppString = gppData?.gppString || '';
  const gpi = gppString ? 0 : 1;

  return { gppString, gpi };
}
