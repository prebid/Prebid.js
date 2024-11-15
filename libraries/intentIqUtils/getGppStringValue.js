import {gppDataHandler} from '../../src/consentHandler.js';

/**
 * Retrieves the GPP string value and additional GPP-related information.
 * This function extracts the GPP data, encodes it, and determines specific GPP flags such as GPI and applicable sections.
 * @return {Object} An object containing:
 * - `gppString` (string): The encoded GPP string value.
 * - `gpi` (number): An indicator representing whether GPP consent is available (0 if available, 1 if not).
 */
export function getGppStringValue() {
  const gppData = gppDataHandler.getConsentData();

  if (gppData) {
    let gppString = '';
    let gpi = 1;

    // Check for the presence of the 'usnat' section in GPP data
    if (gppData.parsedSections && 'usnat' in gppData.parsedSections) {
      gppString = gppData.gppString;
      gpi = 0; // Set GPI to 0 indicating GPP consent is present
    }

    return {
      gppString: encodeURIComponent(gppString),
      gpi
    };
  }

  // If no GPP data is available, return default values
  return {
    gppString: '',
    gpi: 1
  };
}
