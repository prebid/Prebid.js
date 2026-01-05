import {MODULE_TYPE_RTD} from '../src/activities/modules.js';
import {loadExternalScript} from '../src/adloader.js';
import {config} from '../src/config.js';
import {submodule} from '../src/hook.js';
import {getStorageManager} from '../src/storageManager.js';
import {deepAccess, mergeDeep, prefixLog} from '../src/utils.js';

const MODULE_NAME = 'optable';
export const LOG_PREFIX = `[${MODULE_NAME} RTD]:`;
const optableLog = prefixLog(LOG_PREFIX);
const {logMessage, logWarn, logError} = optableLog;
const storage = getStorageManager({moduleType: MODULE_TYPE_RTD, moduleName: MODULE_NAME});

// localStorage keys and event names used by the Optable SDK
/** localStorage key for fallback cache (raw SDK targeting data) */
const OPTABLE_CACHE_KEY = 'optable-cache:targeting';
/** Event fired when targeting data changes (raw SDK data) */
const OPTABLE_TARGETING_EVENT = 'optable-targeting:change';
/** localStorage key used to store resolved targeting data (wrapper-manipulated) */
const OPTABLE_RESOLVED_KEY = 'OPTABLE_RESOLVED';
/** Event fired when wrapper-manipulated targeting data is ready */
const OPTABLE_RESOLVED_EVENT = 'optableResolved';

/**
 * Extracts the parameters for Optable RTD module from the config object passed at instantiation
 * @param {Object} moduleConfig Configuration object for the module
 */
export const parseConfig = (moduleConfig) => {
  let bundleUrl = deepAccess(moduleConfig, 'params.bundleUrl', null);
  const adserverTargeting = deepAccess(moduleConfig, 'params.adserverTargeting', true);
  const handleRtd = deepAccess(moduleConfig, 'params.handleRtd', null);
  const instance = deepAccess(moduleConfig, 'params.instance', null);
  const skipCache = deepAccess(moduleConfig, 'params.skipCache', false);

  // If present, trim the bundle URL
  if (typeof bundleUrl === 'string') {
    bundleUrl = bundleUrl.trim();
  }

  // Verify that bundleUrl is a valid URL: only secure (HTTPS) URLs are allowed
  if (typeof bundleUrl === 'string' && bundleUrl.length && !bundleUrl.startsWith('https://')) {
    logError('Invalid URL format for bundleUrl in moduleConfig. Only HTTPS URLs are allowed.');
    return {bundleUrl: null, adserverTargeting, handleRtd: null, skipCache};
  }

  if (handleRtd && typeof handleRtd !== 'function') {
    logError('handleRtd must be a function');
    return {bundleUrl, adserverTargeting, handleRtd: null, skipCache};
  }

  const result = {bundleUrl, adserverTargeting, handleRtd, skipCache};
  if (instance !== null) {
    result.instance = instance;
  }
  return result;
}

/**
 * Check for cached targeting data from localStorage
 * Priority order:
 * 1. localStorage[OPTABLE_RESOLVED_KEY] - Wrapper-manipulated data (most accurate)
 * 2. localStorage[OPTABLE_CACHE_KEY] - Raw SDK targeting data (fallback)
 * @returns {Object|null} Cached targeting data if found, null otherwise
 */
const checkLocalStorageCache = () => {
  // 1. Check for wrapper-manipulated resolved data (highest priority)
  const resolvedData = storage.getDataFromLocalStorage(OPTABLE_RESOLVED_KEY);
  logMessage(`localStorage[${OPTABLE_RESOLVED_KEY}]: ${resolvedData ? 'present' : 'not found'}`);
  if (resolvedData) {
    try {
      const parsedData = JSON.parse(resolvedData);
      logMessage(`Using cached wrapper-resolved data from ${OPTABLE_RESOLVED_KEY}`);
      return parsedData;
    } catch (e) {
      logWarn(`Failed to parse ${OPTABLE_RESOLVED_KEY} from localStorage`, e);
    }
  }

  // 2. Check for fallback cache data (raw SDK data)
  const cacheData = storage.getDataFromLocalStorage(OPTABLE_CACHE_KEY);
  logMessage(`localStorage[${OPTABLE_CACHE_KEY}]: ${cacheData ? 'present' : 'not found'}`);
  if (cacheData) {
    try {
      const parsedData = JSON.parse(cacheData);
      logMessage(`Using cached raw SDK data from ${OPTABLE_CACHE_KEY}`);
      return parsedData;
    } catch (e) {
      logWarn(`Failed to parse ${OPTABLE_CACHE_KEY} from localStorage`, e);
    }
  }

  logMessage('No valid cache data found in localStorage');
  return null;
};

/**
 * Wait for Optable SDK targeting event to fire with targeting data
 * @param {boolean} skipCache If true, skip checking cached data
 * @returns {Promise<Object|null>} Promise that resolves with targeting data or null
 */
const waitForOptableEvent = (skipCache = false) => {
  return new Promise((resolve) => {
    // If skipCache is true, skip all cached data checks and wait for events
    if (!skipCache) {
      // 1. FIRST: Check instance.targetingFromCache() - wrapper has priority and can override cache
      const optableBundle = /** @type {Object} */ (window.optable);
      const instanceData = optableBundle?.instance?.targetingFromCache();
      logMessage(`SDK instance.targetingFromCache() returned: ${instanceData?.ortb2 ? 'ortb2 data present' : 'no data'}`);

      if (instanceData && instanceData.ortb2) {
        logMessage('Resolved targeting from SDK instance cache');
        resolve(instanceData);
        return;
      }

      // 2. THEN: Check localStorage cache sources
      const cachedData = checkLocalStorageCache();
      if (cachedData) {
        logMessage('Resolved targeting from localStorage cache');
        resolve(cachedData);
        return;
      }
    } else {
      logMessage('skipCache parameter enabled: bypassing all cache sources');
    }

    // 3. FINALLY: Wait for targeting events
    // Priority: optableResolved (wrapper-manipulated) > optable-targeting:change (raw SDK)
    const cleanup = () => {
      window.removeEventListener(OPTABLE_RESOLVED_EVENT, resolvedEventListener);
      window.removeEventListener(OPTABLE_TARGETING_EVENT, targetingEventListener);
    };

    const resolvedEventListener = (event) => {
      logMessage(`Event received: ${OPTABLE_RESOLVED_EVENT} (wrapper-resolved targeting)`);
      const targetingData = event.detail;
      cleanup();
      logMessage('Resolved targeting from optableResolved event');
      resolve(targetingData);
    };

    const targetingEventListener = (event) => {
      logMessage(`Event received: ${OPTABLE_TARGETING_EVENT} (raw SDK targeting)`);

      // Check if resolved data already exists in localStorage
      const resolvedData = storage.getDataFromLocalStorage(OPTABLE_RESOLVED_KEY);
      logMessage(`Checking localStorage[${OPTABLE_RESOLVED_KEY}] after ${OPTABLE_TARGETING_EVENT}: ${resolvedData ? 'present' : 'not found'}`);
      if (resolvedData) {
        try {
          const parsedData = JSON.parse(resolvedData);
          logMessage(`Resolved targeting from ${OPTABLE_RESOLVED_KEY} after ${OPTABLE_TARGETING_EVENT} event`);
          cleanup();
          resolve(parsedData);
          return;
        } catch (e) {
          logWarn(`Failed to parse ${OPTABLE_RESOLVED_KEY}`, e);
        }
      }

      // No resolved data, use the targeting:change data
      logMessage(`Resolved targeting from ${OPTABLE_TARGETING_EVENT} event detail`);
      cleanup();
      resolve(event.detail);
    };

    window.addEventListener(OPTABLE_RESOLVED_EVENT, resolvedEventListener);
    window.addEventListener(OPTABLE_TARGETING_EVENT, targetingEventListener);
    logMessage(`Event listeners registered: waiting for ${OPTABLE_RESOLVED_EVENT} or ${OPTABLE_TARGETING_EVENT}`);
  });
};

/**
 * Default function to handle/enrich RTD data
 * @param reqBidsConfigObj Bid request configuration object
 * @param optableExtraData Additional data to be used by the Optable SDK
 * @param mergeFn Function to merge data
 * @param skipCache If true, skip checking cached data
 * @returns {Promise<void>}
 */
export const defaultHandleRtd = async (reqBidsConfigObj, optableExtraData, mergeFn, skipCache = false) => {
  // Wait for the Optable SDK to dispatch targeting data via event
  let targetingData = await waitForOptableEvent(skipCache);

  if (!targetingData || !targetingData.ortb2) {
    logWarn('defaultHandleRtd: no valid targeting data available (missing ortb2)');
    return;
  }

  logMessage('defaultHandleRtd: merging ortb2 data into global ORTB2 fragments');
  mergeFn(
    reqBidsConfigObj.ortb2Fragments.global,
    targetingData.ortb2,
  );
};

/**
 * Get data from Optable and merge it into the global ORTB2 object
 * @param {Function} handleRtdFn Function to handle RTD data
 * @param {Object} reqBidsConfigObj Bid request configuration object
 * @param {Object} optableExtraData Additional data to be used by the Optable SDK
 * @param {Function} mergeFn Function to merge data
 * @param {boolean} skipCache If true, skip checking cached data
 */
export const mergeOptableData = async (handleRtdFn, reqBidsConfigObj, optableExtraData, mergeFn, skipCache = false) => {
  if (handleRtdFn.constructor.name === 'AsyncFunction') {
    await handleRtdFn(reqBidsConfigObj, optableExtraData, mergeFn, skipCache);
  } else {
    handleRtdFn(reqBidsConfigObj, optableExtraData, mergeFn, skipCache);
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
    const {bundleUrl, handleRtd, skipCache} = parseConfig(moduleConfig);
    const handleRtdFn = handleRtd || defaultHandleRtd;
    const optableExtraData = config.getConfig('optableRtdConfig') || {};
    logMessage(`Configuration: bundleUrl=${bundleUrl ? 'provided' : 'not provided'}, skipCache=${skipCache}, customHandleRtd=${!!handleRtd}`);

    if (bundleUrl) {
      // If bundleUrl is present, load the Optable JS bundle
      // by using the loadExternalScript function
      logMessage(`Loading Optable SDK from bundleUrl: ${bundleUrl}`);

      // Load Optable JS bundle and merge the data
      loadExternalScript(bundleUrl, MODULE_TYPE_RTD, MODULE_NAME, () => {
        logMessage('Optable SDK loaded successfully from bundleUrl');
        mergeOptableData(handleRtdFn, reqBidsConfigObj, optableExtraData, mergeDeep, skipCache).then(callback, callback);
      }, document);
    } else {
      // At this point, we assume that the Optable JS bundle is already
      // present on the page. If it is, we can directly merge the data
      // by passing the callback to the optable.cmd.push function.
      logMessage('No bundleUrl configured: assuming Optable SDK already present on page');
      window.optable = window.optable || { cmd: [] };
      window.optable.cmd.push(() => {
        logMessage('Optable SDK command queue ready: proceeding with data merge');
        mergeOptableData(handleRtdFn, reqBidsConfigObj, optableExtraData, mergeDeep, skipCache).then(callback, callback);
      });
    }
  } catch (error) {
    // If an error occurs, log it and call the callback
    // to continue with the auction
    logError('getBidRequestData error: ', error);
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
  // Extract `adserverTargeting` and `instance` from the module configuration
  const {adserverTargeting, instance} = parseConfig(moduleConfig);
  logMessage(`Configuration: adserverTargeting=${adserverTargeting}, instance=${instance || 'default (instance)'}`);

  if (!adserverTargeting) {
    logMessage('adserverTargeting disabled in configuration: returning empty targeting data');
    return {};
  }

  const targetingData = {};
  // Resolve the SDK instance object based on the instance string
  // Default to 'instance' if not provided
  const instanceKey = instance || 'instance';
  const sdkInstance = window?.optable?.[instanceKey];
  logMessage(`SDK instance lookup at window.optable.${instanceKey}: ${sdkInstance ? 'found' : 'not found'}`);
  if (!sdkInstance) {
    logWarn(`SDK instance not available at window.optable.${instanceKey}`);
    return targetingData;
  }

  // Get the Optable targeting data from the cache
  const optableTargetingData = sdkInstance?.targetingKeyValuesFromCache?.() || targetingData;
  const keyCount = Object.keys(optableTargetingData).length;
  logMessage(`SDK instance.targetingKeyValuesFromCache() returned ${keyCount} targeting key(s)`);

  // If no Optable targeting data is found, return an empty object
  if (!keyCount) {
    logWarn('No targeting key-values available from SDK cache');
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

  const finalAdUnitCount = Object.keys(targetingData).length;
  logMessage(`Returning targeting data for ${finalAdUnitCount} ad unit(s) with merged key-values`);
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
