import {MODULE_TYPE_RTD} from '../src/activities/modules.js';
import {loadExternalScript} from '../src/adloader.js';
import {config} from '../src/config.js';
import {submodule} from '../src/hook.js';
import {deepAccess, mergeDeep, prefixLog} from '../src/utils.js';

const MODULE_NAME = 'optable';
export const LOG_PREFIX = `[${MODULE_NAME} RTD]:`;
const optableLog = prefixLog(LOG_PREFIX);
const {logMessage, logWarn, logError} = optableLog;

/**
 * Extracts the parameters for Optable RTD module from the config object passed at instantiation
 * @param {Object} moduleConfig Configuration object for the module
 */
export const parseConfig = (moduleConfig) => {
  let bundleUrl = deepAccess(moduleConfig, 'params.bundleUrl', null);
  let adserverTargeting = deepAccess(moduleConfig, 'params.adserverTargeting', true);
  let handleRtd = deepAccess(moduleConfig, 'params.handleRtd', null);

  // If present, trim the bundle URL
  if (typeof bundleUrl === 'string') {
    bundleUrl = bundleUrl.trim();
  }

  // Verify that bundleUrl is a valid URL: only secure (HTTPS) URLs are allowed
  if (typeof bundleUrl === 'string' && bundleUrl.length && !bundleUrl.startsWith('https://')) {
    throw new Error(
      LOG_PREFIX + ' Invalid URL format for bundleUrl in moduleConfig. Only HTTPS URLs are allowed.'
    );
  }

  if (handleRtd && typeof handleRtd !== 'function') {
    throw new Error(LOG_PREFIX + ' handleRtd must be a function');
  }

  return {bundleUrl, adserverTargeting, handleRtd};
}

/**
 * Default function to handle/enrich RTD data
 * @param reqBidsConfigObj Bid request configuration object
 * @param optableExtraData Additional data to be used by the Optable SDK
 * @param mergeFn Function to merge data
 * @returns {Promise<void>}
 */
export const defaultHandleRtd = async (reqBidsConfigObj, optableExtraData, mergeFn) => {
  const optableBundle = /** @type {Object} */ (window.optable);
  // Get targeting data from cache, if available
  let targetingData = optableBundle?.instance?.targetingFromCache();
  // If no targeting data is found in the cache, call the targeting function
  if (!targetingData) {
    // Call Optable DCN for targeting data and return the ORTB2 object
    targetingData = await optableBundle?.instance?.targeting();
  }
  logMessage('Original targeting data from targeting(): ', targetingData);

  if (!targetingData || !targetingData.ortb2) {
    logWarn('No targeting data found');
    return;
  }

  mergeFn(
    reqBidsConfigObj.ortb2Fragments.global,
    targetingData.ortb2,
  );
  logMessage('Prebid\'s global ORTB2 object after merge: ', reqBidsConfigObj.ortb2Fragments.global);
};

/**
 * Get data from Optable and merge it into the global ORTB2 object
 * @param {Function} handleRtdFn Function to handle RTD data
 * @param {Object} reqBidsConfigObj Bid request configuration object
 * @param {Object} optableExtraData Additional data to be used by the Optable SDK
 * @param {Function} mergeFn Function to merge data
 */
export const mergeOptableData = async (handleRtdFn, reqBidsConfigObj, optableExtraData, mergeFn) => {
  if (handleRtdFn.constructor.name === 'AsyncFunction') {
    await handleRtdFn(reqBidsConfigObj, optableExtraData, mergeFn);
  } else {
    handleRtdFn(reqBidsConfigObj, optableExtraData, mergeFn);
  }
};

/**
 * @param {Object} reqBidsConfigObj Bid request configuration object
 * @param {Function} callback Called on completion
 * @param {Object} moduleConfig Configuration for Optable RTD module
 * @param {Object} userConsent
 */
export const getBidRequestData = (reqBidsConfigObj, callback, moduleConfig, userConsent) => {
  try {
    // Extract the bundle URL from the module configuration
    const {bundleUrl, handleRtd} = parseConfig(moduleConfig);

    const handleRtdFn = handleRtd || defaultHandleRtd;
    const optableExtraData = config.getConfig('optableRtdConfig') || {};

    if (bundleUrl) {
      // If bundleUrl is present, load the Optable JS bundle
      // by using the loadExternalScript function
      logMessage('Custom bundle URL found in config: ', bundleUrl);

      // Load Optable JS bundle and merge the data
      loadExternalScript(bundleUrl, MODULE_TYPE_RTD, MODULE_NAME, () => {
        logMessage('Successfully loaded Optable JS bundle');
        mergeOptableData(handleRtdFn, reqBidsConfigObj, optableExtraData, mergeDeep).then(callback, callback);
      }, document);
    } else {
      // At this point, we assume that the Optable JS bundle is already
      // present on the page. If it is, we can directly merge the data
      // by passing the callback to the optable.cmd.push function.
      logMessage('Custom bundle URL not found in config. ' +
        'Assuming Optable JS bundle is already present on the page');
      window.optable = window.optable || { cmd: [] };
      window.optable.cmd.push(() => {
        logMessage('Optable JS bundle found on the page');
        mergeOptableData(handleRtdFn, reqBidsConfigObj, optableExtraData, mergeDeep).then(callback, callback);
      });
    }
  } catch (error) {
    // If an error occurs, log it and call the callback
    // to continue with the auction
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
  // Extract `adserverTargeting` from the module configuration
  const {adserverTargeting} = parseConfig(moduleConfig);
  logMessage('Ad Server targeting: ', adserverTargeting);

  if (!adserverTargeting) {
    logMessage('Ad server targeting is disabled');
    return {};
  }

  const targetingData = {};

  // Get the Optable targeting data from the cache
  const optableTargetingData = window?.optable?.instance?.targetingKeyValuesFromCache() || {};

  // If no Optable targeting data is found, return an empty object
  if (!Object.keys(optableTargetingData).length) {
    logWarn('No Optable targeting data found');
    return targetingData;
  }

  // Merge the Optable targeting data into the ad units
  adUnits.forEach(adUnit => {
    targetingData[adUnit] = targetingData[adUnit] || {};
    mergeDeep(targetingData[adUnit], optableTargetingData);
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
