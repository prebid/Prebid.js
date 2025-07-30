// configManager.js
import { logError } from '../../src/utils.js';
import { isPlainObject, isEmpty } from '../../src/utils.js';

let config = {};
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
    getConfig,
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
    //const url = `${CONSTANTS.ENDPOINTS.BASEURL}/${publisherId}/${profileId}/${CONSTANTS.ENDPOINTS.CONFIGS}`;
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
    const profileConfigs = await response.json();

    if (!isPlainObject(profileConfigs) || isEmpty(profileConfigs)) {
      logError(`${CONSTANTS.LOG_PRE_FIX} profileConfigs is not an object or is empty`);
      return null;
    }
    
    // Store the configuration
    config = profileConfigs;
    
    return {
      config: profileConfigs,
      country
    };
  } catch (error) {
    logError(`${CONSTANTS.LOG_PRE_FIX} Error while fetching config: ${error}`);
    return null;
  }
}

/**
 * Get the current configuration
 * @returns {Object} - Current configuration
 */
export function getConfig() {
  return config;
}