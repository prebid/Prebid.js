// configManager.js
import { isPlainObject, isEmpty, logError } from '../../src/utils.js';

let _ymConfig = {};
export const getYMConfig = () => _ymConfig;
export const setYMConfig = (config) => { _ymConfig = config; }
let country;

export const CONSTANTS = Object.freeze({
  LOG_PRE_FIX: 'PubMatic-Config-Manager: ',
  ENDPOINTS: {
    BASEURL: 'https://ads.pubmatic.com/AdServer/js/pwt',
    CONFIGS: 'config.json'
  }
});

/**
 * Initialize the config manager with constants
 * @returns {Object} - Config manager functions
 */
export function ConfigJsonManager() {
  return {
    fetchConfig,
    getYMConfig,
    get country() { return country; }
  };
}

/**
 * Fetch configuration from the server
 * @param {string} publisherId - Publisher ID
 * @param {string} profileId - Profile ID
 * @returns {Promise<Object>} - Promise resolving to the config object
 */
export async function fetchConfig(publisherId, profileId) {
  try {
    // const url = `${CONSTANTS.ENDPOINTS.BASEURL}/${publisherId}/${profileId}/${CONSTANTS.ENDPOINTS.CONFIGS}`;
    const url = `https://hbopenbid.pubmatic.com/yieldModuleConfigApi`;
    const response = await fetch(url);

    if (!response.ok) {
      logError(`${CONSTANTS.LOG_PRE_FIX} Error while fetching config: Not ok`);
      return null;
    }

    // Extract country code if available
    const cc = response.headers?.get('country_code');
    country = cc ? cc.split(',')?.map(code => code.trim())[0] : "IN";

    // Parse the JSON response
    const ymConfigs = await response.json();

    if (!isPlainObject(ymConfigs) || isEmpty(ymConfigs)) {
      logError(`${CONSTANTS.LOG_PRE_FIX} profileConfigs is not an object or is empty`);
      return null;
    }

    // Store the configuration
    setYMConfig(ymConfigs);

    return {
      ymConfigs,
      country
    };
  } catch (error) {
    logError(`${CONSTANTS.LOG_PRE_FIX} Error while fetching config: ${error}`);
    return null;
  }
}
