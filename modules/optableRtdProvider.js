import { submodule } from '../src/hook.js';
import { deepAccess, mergeDeep, prefixLog } from '../src/utils.js';

const MODULE_NAME = 'optable';
export const LOG_PREFIX = `[${MODULE_NAME} RTD]:`;
const optableLog = prefixLog(LOG_PREFIX);
const { logMessage, logWarn, logError } = optableLog;

/**
 * Extracts the parameters for Optable RTD module from the config object passed at instantiation
 * @param {Object} moduleConfig Configuration object for the module
 */
export const parseConfig = (moduleConfig) => {
  let instanceName = deepAccess(moduleConfig, 'params.instanceName', "prebid_instance");
  let adserverTargeting = deepAccess(moduleConfig, 'params.adserverTargeting', true);

  if (typeof instanceName === 'string') {
    instanceName = instanceName.trim();
  }

  return { instanceName, adserverTargeting };
}

/**
 * @param {Object} reqBidsConfigObj Bid request configuration object
 * @param {Function} callback Called on completion
 * @param {Object} moduleConfig Configuration for Optable RTD module
 * @param {Object} userConsent
 */
export const getBidRequestData = (reqBidsConfigObj, callback, moduleConfig, userConsent) => {
  try {
    const { instanceName } = parseConfig(moduleConfig);

    let targetingData = window?.optable?.[instanceName]?.targetingFromCache();
    if (!targetingData || !targetingData.ortb2) {
      logWarn('No targeting data found');
      return;
    }

    mergeDeep(reqBidsConfigObj.ortb2Fragments.global, targetingData.ortb2);
    logMessage("Merged targeting data into global ORTB2 object");
  } catch (error) {
    logError(error);
    callback();
  }
}

/**
 * Get Optable targeting data and merge it into the ad units
 * @param adUnits Array of ad units
 * @param moduleConfig Module configuration
 * @param userConsent User consent
 * @param auction Auction object
 * @returns {Object} Targeting data
 */
export const getTargetingData = (adUnits, moduleConfig, userConsent, auction) => {
  const { instanceName, adserverTargeting } = parseConfig(moduleConfig);
  logMessage('Ad Server targeting: ', adserverTargeting);

  if (!adserverTargeting) {
    logMessage('Ad server targeting is disabled');
    return {};
  }

  // Get the Optable targeting data from the cache
  const targetingData = window?.optable?.[instanceName]?.targetingKeyValuesFromCache() || {};

  // Return empty object if no targeting data is found
  if (!Object.keys(targetingData).length) {
    logWarn('No Optable targeting data found');
    return targetingData;
  }

  // Merge the Optable targeting data into the ad units
  adUnits.forEach(adUnit => {
    targetingData[adUnit] = targetingData[adUnit] || {};
    mergeDeep(targetingData[adUnit], targetingData);
  });

  // If the key contains no data, remove it
  Object.keys(targetingData).forEach((adUnit) => {
    Object.keys(targetingData[adUnit]).forEach((key) => {
      if (!targetingData[adUnit][key] || !targetingData[adUnit][key].length) {
        delete targetingData[adUnit][key];
      }
    });

    // If the ad unit contains no data, remove it
    if (!Object.keys(targetingData[adUnit]).length) {
      delete targetingData[adUnit];
    }
  });

  logMessage('Optable targeting data: ', targetingData);
  return targetingData;
};

/**
 * Dummy init function
 * @param {Object} config Module configuration
 * @param {boolean} userConsent User consent
 * @returns true
 */
const init = (config, userConsent) => {
  return true;
}

// Optable RTD submodule
export const optableSubmodule = {
  name: MODULE_NAME,
  init,
  getBidRequestData,
  getTargetingData,
}

// Register the Optable RTD submodule
submodule('realTimeData', optableSubmodule);
