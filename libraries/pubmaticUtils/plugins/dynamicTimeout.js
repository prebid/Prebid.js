import { logInfo } from '../../../src/utils.js'; 
import { getGlobal } from '../../../src/prebidGlobal.js';
import { calculateTimeoutModifier } from '../../bidderTimeoutUtils/bidderTimeoutUtils.js';

let _dynamicTimeoutConfig = null;
export const getDynamicTimeoutConfig = () => _dynamicTimeoutConfig;
export const setDynamicTimeoutConfig = (config) => { _dynamicTimeoutConfig = config; }

export const CONSTANTS = Object.freeze({
  LOG_PRE_FIX: 'PubMatic-Dynamic-Timeout: ',
  INCLUDES_VIDEOS: 'includesVideo',
  NUM_AD_UNITS: 'numAdUnits',
  DEVICE_TYPE: 'deviceType',
  CONNECTION_SPEED: 'connectionSpeed',
});

export const RULES_PERCENTAGE = {
  [CONSTANTS.INCLUDES_VIDEOS]: {
    "true": 20, // 20% of bidderTimeout
    "false": 5  // 5% of bidderTimeout
  },
  [CONSTANTS.NUM_AD_UNITS]: {
    "1-5": 10,   // 10% of bidderTimeout
    "6-10": 20,  // 20% of bidderTimeout
    "11-15": 30  // 30% of bidderTimeout
  },
  [CONSTANTS.DEVICE_TYPE]: {
    "2": 5,   // 5% of bidderTimeout
    "4": 10,  // 10% of bidderTimeout
    "5": 20   // 20% of bidderTimeout
  },
  [CONSTANTS.CONNECTION_SPEED]: {
    "slow": 20,     // 20% of bidderTimeout
    "medium": 10,   // 10% of bidderTimeout
    "fast": 5,      // 5% of bidderTimeout
    "unknown": 1    // 1% of bidderTimeout
  }
};

/**
 * Initialize the dynamic timeout plugin
 * @param {Object} pluginName - Plugin name
 * @param {Object} configJsonManager - Configuration JSON manager object
 * @returns {Promise<boolean>} - Promise resolving to initialization status
 */
export async function init(pluginName, configJsonManager) {
  // Set the Dynamic Timeout config
  setDynamicTimeoutConfig(configJsonManager.getConfigByName(pluginName));
  return true;
}

/**
 * Process bid request
 * @param {Object} reqBidsConfigObj - Bid request config object
 * @returns {Object} - Updated bid request config object
 */
export async function processBidRequest(reqBidsConfigObj) {
  if (!getDynamicTimeoutConfig()?.enabled) {
    logInfo(`${CONSTANTS.LOG_PRE_FIX} Dynamic timeout is disabled`);
    return reqBidsConfigObj;
  }

  const isSkipped = Math.random() * 100 < parseFloat(getDynamicTimeoutConfig()?.skipRate);
  if (isSkipped) {
    logInfo(`${CONSTANTS.LOG_PRE_FIX} Dynamic timeout is skipped: ${isSkipped}`);
    return reqBidsConfigObj;
  }

  logInfo(`${CONSTANTS.LOG_PRE_FIX} Dynamic timeout is applying...`);

  const adUnits = reqBidsConfigObj.adUnits || getGlobal().adUnits;
  const bidderTimeout = getBidderTimeout(reqBidsConfigObj);

  const additionalTimeout = calculateTimeoutModifier(adUnits, getRules(bidderTimeout));
  reqBidsConfigObj.timeout = bidderTimeout + additionalTimeout;

  return reqBidsConfigObj;
}

/**
 * Get targeting data
 * @param {Array} adUnitCodes - Ad unit codes
 * @param {Object} config - Module configuration
 * @param {Object} userConsent - User consent data
 * @param {Object} auction - Auction object
 * @returns {Object} - Targeting data
 */
export function getTargeting(adUnitCodes, config, userConsent, auction) {
  // Implementation for targeting data, if not applied then do nothing
}

// Export the dynamic timeout functions
export const DynamicTimeout = {
  init,
  processBidRequest,
  getTargeting
};


// Helper Functions


export const getBidderTimeout = (reqBidsConfigObj) => {
  return getDynamicTimeoutConfig()?.baseTimeout
    ? getDynamicTimeoutConfig()?.baseTimeout
    : reqBidsConfigObj?.timeout || getGlobal()?.getConfig('bidderTimeout');
}

/**
 * Get rules based on percentage values and baseTimeout
 * @param {number} bidderTimeout - Bidder timeout in milliseconds
 * @returns {Object} - Rules with calculated millisecond values
 */
export const getRules = (bidderTimeout) => {
  return (getDynamicTimeoutConfig()?.rules && Object.keys(getDynamicTimeoutConfig()?.rules).length > 0)
    ? getDynamicTimeoutConfig()?.rules
    : createDynamicRules(RULES_PERCENTAGE, bidderTimeout);
}

/**
 * Creates dynamic rules based on percentage values and baseTimeout
 * @param {Object} percentageRules - Rules with percentage values
 * @param {number} baseTimeout - Base timeout in milliseconds
 * @return {Object} - Rules with calculated millisecond values
 */
export const createDynamicRules = (percentageRules, baseTimeout) => {
  if (!percentageRules || !baseTimeout) {
    return {};
  }

  const dynamicRules = {};
  Object.keys(percentageRules).forEach(category => {
    dynamicRules[category] = {};
    
    Object.keys(percentageRules[category]).forEach(key => {
      const percentValue = percentageRules[category][key];
        dynamicRules[category][key] = Math.floor(baseTimeout * (percentValue / 100));
    });
  });

  return dynamicRules;
};