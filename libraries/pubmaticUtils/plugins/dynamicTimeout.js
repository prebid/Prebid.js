import { logInfo } from '../../../src/utils.js';
import { getGlobal } from '../../../src/prebidGlobal.js';
import { bidderTimeoutFunctions } from '../../bidderTimeoutUtils/bidderTimeoutUtils.js';
import { shouldThrottle } from '../pubmaticUtils.js';

let _dynamicTimeoutConfig = null;
export const getDynamicTimeoutConfig = () => _dynamicTimeoutConfig;
export const setDynamicTimeoutConfig = (config) => { _dynamicTimeoutConfig = config; }

export const CONSTANTS = Object.freeze({
  LOG_PRE_FIX: 'PubMatic-Dynamic-Timeout: ',
  INCLUDES_VIDEOS: 'includesVideo',
  NUM_AD_UNITS: 'numAdUnits',
  DEVICE_TYPE: 'deviceType',
  CONNECTION_SPEED: 'connectionSpeed',
  DEFAULT_SKIP_RATE: 50,
  DEFAULT_THRESHOLD_TIMEOUT: 500
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
  const config = configJsonManager.getConfigByName(pluginName);
  if (!config) {
    logInfo(`${CONSTANTS.LOG_PRE_FIX} Dynamic Timeout configuration not found`);
    return false;
  }
  // Set the Dynamic Timeout config
  setDynamicTimeoutConfig(config);

  if (!getDynamicTimeoutConfig()?.enabled) {
    logInfo(`${CONSTANTS.LOG_PRE_FIX} Dynamic Timeout configuration is disabled`);
    return false;
  }
  return true;
}

/**
 * Process bid request by applying dynamic timeout adjustments
 * @param {Object} reqBidsConfigObj - Bid request config object
 * @returns {Object} - Updated bid request config object with adjusted timeout
 */
export function processBidRequest(reqBidsConfigObj) {
  // Cache config to avoid multiple calls
  const timeoutConfig = getDynamicTimeoutConfig();

  // Check if request should be throttled based on skipRate
  const skipRate = (timeoutConfig?.config?.skipRate !== undefined && timeoutConfig?.config?.skipRate !== null) ? timeoutConfig?.config?.skipRate : CONSTANTS.DEFAULT_SKIP_RATE;
  if (shouldThrottle(skipRate)) {
    logInfo(`${CONSTANTS.LOG_PRE_FIX} Dynamic timeout is skipped (skipRate: ${skipRate}%)`);
    return reqBidsConfigObj;
  }

  logInfo(`${CONSTANTS.LOG_PRE_FIX} Dynamic timeout is applying...`);

  // Get ad units and bidder timeout
  const adUnits = reqBidsConfigObj.adUnits || getGlobal().adUnits;
  const bidderTimeout = getBidderTimeout(reqBidsConfigObj);

  // Calculate and apply additional timeout
  const rules = getRules(bidderTimeout);
  const additionalTimeout = bidderTimeoutFunctions.calculateTimeoutModifier(adUnits, rules);

  reqBidsConfigObj.timeout = getFinalTimeout(bidderTimeout, additionalTimeout);

  logInfo(`${CONSTANTS.LOG_PRE_FIX} Timeout adjusted from ${bidderTimeout}ms to ${reqBidsConfigObj.timeout}ms (added ${additionalTimeout}ms)`);
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

export const getFinalTimeout = (bidderTimeout, additionalTimeout) => {
  // Calculate the final timeout by adding bidder timeout and additional timeout
  const calculatedTimeout = parseInt(bidderTimeout) + parseInt(additionalTimeout);
  const thresholdTimeout = getDynamicTimeoutConfig()?.config?.thresholdTimeout || CONSTANTS.DEFAULT_THRESHOLD_TIMEOUT;

  // Handle cases where the calculated timeout might be negative or below threshold
  if (calculatedTimeout < thresholdTimeout) {
    // Log warning for negative or very low timeouts
    if (calculatedTimeout < 0) {
      logInfo(`${CONSTANTS.LOG_PRE_FIX} Warning: Negative timeout calculated (${calculatedTimeout}ms), using threshold (${thresholdTimeout}ms)`);
    } else if (calculatedTimeout < thresholdTimeout) {
      logInfo(`${CONSTANTS.LOG_PRE_FIX} Calculated timeout (${calculatedTimeout}ms) below threshold, using threshold (${thresholdTimeout}ms)`);
    }
    return thresholdTimeout;
  }

  return calculatedTimeout;
}

export const getBidderTimeout = (reqBidsConfigObj) => {
  return getDynamicTimeoutConfig()?.config?.bidderTimeout
    ? getDynamicTimeoutConfig()?.config?.bidderTimeout
    : reqBidsConfigObj?.timeout || getGlobal()?.getConfig('bidderTimeout');
}

/**
 * Get rules based on percentage values and bidderTimeout
 * @param {number} bidderTimeout - Bidder timeout in milliseconds
 * @returns {Object} - Rules with calculated millisecond values
 */
export const getRules = (bidderTimeout) => {
  const timeoutConfig = getDynamicTimeoutConfig();

  // In milliseconds - If timeout rules provided by publishers are available then return it
  if (timeoutConfig?.config?.timeoutRules && Object.keys(timeoutConfig.config.timeoutRules).length > 0) {
    return timeoutConfig.config.timeoutRules;
  }
  // In milliseconds - Check for rules in priority order, If ML model rules are available then return it
  if (timeoutConfig?.data && Object.keys(timeoutConfig.data).length > 0) {
    return timeoutConfig.data;
  }
  // In Percentage - If no rules are available then create rules from the default defined - values are in percentages
  return createDynamicRules(RULES_PERCENTAGE, bidderTimeout);
}

/**
 * Creates dynamic rules based on percentage values and bidder timeout
 * @param {Object} percentageRules - Rules with percentage values
 * @param {number} bidderTimeout - Bidder timeout in milliseconds
 * @return {Object} - Rules with calculated millisecond values
 */
export const createDynamicRules = (percentageRules, bidderTimeout) => {
  // Return empty object if required parameters are missing or invalid
  if (!percentageRules || typeof percentageRules !== 'object') {
    logInfo(`${CONSTANTS.LOG_PRE_FIX} Invalid percentage rules provided to createDynamicRules`);
    return {};
  }

  // Handle negative or zero bidderTimeout gracefully
  if (!bidderTimeout || typeof bidderTimeout !== 'number' || bidderTimeout <= 0) {
    logInfo(`${CONSTANTS.LOG_PRE_FIX} Invalid bidderTimeout (${bidderTimeout}ms) provided to createDynamicRules`);
    return {};
  }

  // Create a new rules object with millisecond values
  return Object.entries(percentageRules).reduce((dynamicRules, [category, rules]) => {
    // Skip if rules is not an object
    if (!rules || typeof rules !== 'object') {
      logInfo(`${CONSTANTS.LOG_PRE_FIX} Skipping invalid rule category: ${category}`);
      return dynamicRules;
    }

    // Initialize category in the dynamic rules
    dynamicRules[category] = {};

    // Convert each percentage value to milliseconds
    Object.entries(rules).forEach(([key, percentValue]) => {
      // Ensure percentage value is a number and not zero
      if (typeof percentValue === 'number' && percentValue !== 0) {
        const calculatedTimeout = Math.floor(bidderTimeout * (percentValue / 100));
        dynamicRules[category][key] = calculatedTimeout;

        // Log warning for negative calculated timeouts
        if (calculatedTimeout < 0) {
          logInfo(`${CONSTANTS.LOG_PRE_FIX} Warning: Negative timeout calculated for ${category}.${key}: ${calculatedTimeout}ms`);
        }
      }
    });

    return dynamicRules;
  }, {});
};
