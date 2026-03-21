import { submodule } from '../src/hook.js';
import { logError, mergeDeep, isPlainObject, isEmpty } from '../src/utils.js';

import { PluginManager } from '../libraries/pubmaticUtils/plugins/pluginManager.js';
import { FloorProvider } from '../libraries/pubmaticUtils/plugins/floorProvider.js';
import { UnifiedPricingRule } from '../libraries/pubmaticUtils/plugins/unifiedPricingRule.js';
import { DynamicTimeout } from '../libraries/pubmaticUtils/plugins/dynamicTimeout.js';

/**
 * @typedef {import('./rtdModule/index.js').RtdSubmodule} RtdSubmodule
 */
/**
 * This RTD module has a dependency on the priceFloors module.
 * We utilize the continueAuction function from the priceFloors module to incorporate price floors data into the current auction.
 */

export const CONSTANTS = Object.freeze({
  SUBMODULE_NAME: 'pubmatic',
  REAL_TIME_MODULE: 'realTimeData',
  LOG_PRE_FIX: 'PubMatic-Rtd-Provider: ',
  ENDPOINTS: {
    BASEURL: 'https://ads.pubmatic.com/AdServer/js/pwt',
    CONFIGS: 'config.json'
  }
});

let _ymConfigPromise;
export const getYmConfigPromise = () => _ymConfigPromise;
export const setYmConfigPromise = (promise) => { _ymConfigPromise = promise; };

export function ConfigJsonManager() {
  let _ymConfig = {};
  const getYMConfig = () => _ymConfig;
  const setYMConfig = (config) => { _ymConfig = config; }
  let country;

  /**
   * Fetch configuration from the server
   * @param {string} publisherId - Publisher ID
   * @param {string} profileId - Profile ID
   * @returns {Promise<Object>} - Promise resolving to the config object
   */
  async function fetchConfig(publisherId, profileId) {
    try {
      const url = `${CONSTANTS.ENDPOINTS.BASEURL}/${publisherId}/${profileId}/${CONSTANTS.ENDPOINTS.CONFIGS}`;
      const response = await fetch(url);

      if (!response.ok) {
        logError(`${CONSTANTS.LOG_PRE_FIX} Error while fetching config: Not ok`);
        return null;
      }

      // Extract country code if available
      const cc = response.headers?.get('country_code');
      country = cc ? cc.split(',')?.map(code => code.trim())[0] : undefined;

      // Parse the JSON response
      const ymConfigs = await response.json();

      if (!isPlainObject(ymConfigs) || isEmpty(ymConfigs)) {
        logError(`${CONSTANTS.LOG_PRE_FIX} profileConfigs is not an object or is empty`);
        return null;
      }

      // Store the configuration
      setYMConfig(ymConfigs);

      return true;
    } catch (error) {
      logError(`${CONSTANTS.LOG_PRE_FIX} Error while fetching config: ${error}`);
      return null;
    }
  }

  /**
   * Get configuration by name
   * @param {string} name - Plugin name
   * @returns {Object} - Plugin configuration
   */
  const getConfigByName = (name) => {
    return getYMConfig()?.plugins?.[name];
  }

  return {
    fetchConfig,
    getYMConfig,
    setYMConfig,
    getConfigByName,
    get country() { return country; }
  };
}

// Create core components
export const pluginManager = PluginManager();
export const configJsonManager = ConfigJsonManager();

// Register plugins
pluginManager.register('dynamicFloors', FloorProvider);
pluginManager.register('unifiedPricingRule', UnifiedPricingRule);
pluginManager.register('dynamicTimeout', DynamicTimeout);

/**
 * Initialize the Pubmatic RTD Module.
 * @param {Object} config
 * @param {Object} _userConsent
 * @returns {boolean}
 */
const init = (config, _userConsent) => {
  let { publisherId, profileId } = config?.params || {};

  if (!publisherId || !profileId) {
    logError(`${CONSTANTS.LOG_PRE_FIX} ${!publisherId ? 'Missing publisher Id.' : 'Missing profile Id.'}`);
    return false;
  }

  publisherId = String(publisherId).trim();
  profileId = String(profileId).trim();

  // Fetch configuration and initialize plugins
  _ymConfigPromise = configJsonManager.fetchConfig(publisherId, profileId)
    .then(success => {
      if (!success) {
        return Promise.reject(new Error('Failed to fetch configuration'));
      }
      return pluginManager.initialize(configJsonManager);
    });
  return true;
};

/**
 * @param {Object} reqBidsConfigObj
 * @param {function} callback
 */
const getBidRequestData = (reqBidsConfigObj, callback) => {
  _ymConfigPromise.then(() => {
    pluginManager.executeHook('processBidRequest', reqBidsConfigObj);
    // Apply country information if available
    const country = configJsonManager.country;
    if (country) {
      const ortb2 = {
        user: {
          ext: {
            ctr: country,
          }
        }
      };

      reqBidsConfigObj.ortb2Fragments.bidder[CONSTANTS.SUBMODULE_NAME] = mergeDeep(
        reqBidsConfigObj.ortb2Fragments.bidder[CONSTANTS.SUBMODULE_NAME] || {},
        ortb2
      );
    }

    callback();
  }).catch(error => {
    logError(CONSTANTS.LOG_PRE_FIX, error);
    callback();
  });
};

/**
 * Returns targeting data for ad units
 * @param {string[]} adUnitCodes - Ad unit codes
 * @param {Object} config - Module configuration
 * @param {Object} userConsent - User consent data
 * @param {Object} auction - Auction object
 * @return {Object} - Targeting data for ad units
 */
export const getTargetingData = (adUnitCodes, config, userConsent, auction) => {
  return pluginManager.executeHook('getTargeting', adUnitCodes, config, userConsent, auction);
};

export const pubmaticSubmodule = {
  /**
   * used to link submodule with realTimeData
   * @type {string}
   */
  name: CONSTANTS.SUBMODULE_NAME,
  init,
  getBidRequestData,
  getTargetingData
};

export const registerSubModule = () => {
  submodule(CONSTANTS.REAL_TIME_MODULE, pubmaticSubmodule);
}

registerSubModule();
