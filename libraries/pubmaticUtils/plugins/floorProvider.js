// plugins/floorProvider.js
import { logInfo, logError, logMessage, isEmpty } from '../../../src/utils.js';
import { getDeviceType as fetchDeviceType, getOS } from '../../userAgentUtils/index.js';
import { getBrowserType, getCurrentTimeOfDay, getUtmValue, getDayOfWeek, getHourOfDay } from '../pubmaticUtils.js';
import { config as conf } from '../../../src/config.js';

/**
 * This RTD module has a dependency on the priceFloors module.
 * We utilize the continueAuction function from the priceFloors module to incorporate price floors data into the current auction.
 */
import { continueAuction } from '../../../modules/priceFloors.js'; // eslint-disable-line prebid/validate-imports

let _floorConfig = null;
export const getFloorConfig = () => _floorConfig;
export const setFloorsConfig = (config) => { _floorConfig = config; }

let _configJsonManager = null;
export const getConfigJsonManager = () => _configJsonManager;
export const setConfigJsonManager = (configJsonManager) => { _configJsonManager = configJsonManager; }

export const CONSTANTS = Object.freeze({
  LOG_PRE_FIX: 'PubMatic-Floor-Provider: '
});

/**
 * Initialize the floor provider
 * @param {Object} pluginName - Plugin name
 * @param {Object} configJsonManager - Configuration JSON manager object
 * @returns {Promise<boolean>} - Promise resolving to initialization status
 */
export async function init(pluginName, configJsonManager) {
  // Process floor-specific configuration
  const config = configJsonManager.getConfigByName(pluginName);
  if (!config) {
    logInfo(`${CONSTANTS.LOG_PRE_FIX} Floor configuration not found`);
    return false;
  }
  setFloorsConfig(config);

  if (!getFloorConfig()?.enabled) {
    logInfo(`${CONSTANTS.LOG_PRE_FIX} Floor configuration is disabled`);
    return false;
  }

  setConfigJsonManager(configJsonManager);
  try {
    conf.setConfig(prepareFloorsConfig());
    logMessage(`${CONSTANTS.LOG_PRE_FIX} dynamicFloors config set successfully`);
  } catch (error) {
    logError(`${CONSTANTS.LOG_PRE_FIX} Error setting dynamicFloors config: ${error}`);
  }

  logInfo(`${CONSTANTS.LOG_PRE_FIX} Floor configuration loaded`);

  return true;
}

/**
 * Process bid request
 * @param {Object} reqBidsConfigObj - Bid request config object
 * @returns {Object} - Updated bid request config object
 */
export function processBidRequest(reqBidsConfigObj) {
  try {
    const hookConfig = {
      reqBidsConfigObj,
      context: null, // Removed 'this' as it's not applicable in function-based implementation
      nextFn: () => true,
      haveExited: false,
      timer: null
    };

    // Apply floor configuration
    continueAuction(hookConfig);
    logInfo(`${CONSTANTS.LOG_PRE_FIX} Applied floor configuration to auction`);

    return reqBidsConfigObj;
  } catch (error) {
    logError(`${CONSTANTS.LOG_PRE_FIX} Error applying floor configuration: ${error}`);
    return reqBidsConfigObj;
  }
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

// Export the floor provider functions
export const FloorProvider = {
  init,
  processBidRequest,
  getTargeting
};

// Helper Functions

export const defaultValueTemplate = {
  currency: 'USD',
  skipRate: 0,
  schema: {
    fields: ['mediaType', 'size']
  }
};

// Getter Functions
export const getTimeOfDay = () => getCurrentTimeOfDay();
export const getBrowser = () => getBrowserType();
export const getOs = () => getOS().toString();
export const getDeviceType = () => fetchDeviceType().toString();
export const getCountry = () => getConfigJsonManager().country;
export const getBidder = (request) => request?.bidder;
export const getUtm = () => getUtmValue();
export const getDOW = () => getDayOfWeek();
export const getHOD = () => getHourOfDay();

export const prepareFloorsConfig = () => {
  if (!getFloorConfig()?.enabled || !getFloorConfig()?.config) {
    return undefined;
  }

  // Floor configs from adunit / setconfig
  const defaultFloorConfig = conf.getConfig('floors') ?? {};
  if (defaultFloorConfig?.endpoint) {
    delete defaultFloorConfig.endpoint;
  }

  let ymUiConfig = { ...getFloorConfig().config };

  // default values provided by publisher on YM UI
  const defaultValues = ymUiConfig.defaultValues ?? {};
  // If floorsData is not present or is an empty object, use default values
  const ymFloorsData = isEmpty(getFloorConfig().data)
    ? { ...defaultValueTemplate, values: { ...defaultValues } }
    : getFloorConfig().data;

  delete ymUiConfig.defaultValues;
  // If skiprate is provided in configs, overwrite the value in ymFloorsData
  (ymUiConfig.skipRate !== undefined) && (ymFloorsData.skipRate = ymUiConfig.skipRate);

  // merge default configs from page, configs
  return {
    floors: {
      ...defaultFloorConfig,
      ...ymUiConfig,
      data: ymFloorsData,
      additionalSchemaFields: {
        deviceType: getDeviceType,
        timeOfDay: getTimeOfDay,
        browser: getBrowser,
        os: getOs,
        utm: getUtm,
        country: getCountry,
        bidder: getBidder,
        dayOfWeek: getDOW,
        hourOfDay: getHOD
      },
    },
  };
};
