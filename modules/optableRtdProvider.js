import { MODULE_TYPE_RTD } from '../src/activities/modules.js';
import { loadExternalScript } from '../src/adloader.js';
import { config } from '../src/config.js';
import { submodule } from '../src/hook.js';
import { getStorageManager } from '../src/storageManager.js';
import { deepAccess, mergeDeep, prefixLog } from '../src/utils.js';

/**
 * @typedef {import('./optableRtdProvider.d.ts').OptableRtdProviderConfig} OptableRtdProviderConfig
 * @typedef {import('./optableRtdProvider.d.ts').OptableRtdProviderParams} OptableRtdProviderParams
 * @typedef {import('./optableRtdProvider.d.ts').OptableRtdConfig} OptableRtdConfig
 * @typedef {import('./optableRtdProvider.d.ts').OptableHandleRtd} OptableHandleRtd
 * @typedef {import('./optableRtdProvider.d.ts').OptableMergeFn} OptableMergeFn
 */

const MODULE_NAME = 'optable';
export const LOG_PREFIX = `[${MODULE_NAME} RTD]:`;
const optableLog = prefixLog(LOG_PREFIX);
const { logMessage, logWarn, logError } = optableLog;

export const storage = getStorageManager({ moduleType: MODULE_TYPE_RTD, moduleName: MODULE_NAME });

/** localStorage key where the Optable bundle caches resolved targeting data */
export const OPTABLE_RESOLVED_KEY = 'OPTABLE_RESOLVED';

/**
 * Extracts the parameters for Optable RTD module from the config object passed at instantiation
 * @param {OptableRtdProviderConfig} moduleConfig Configuration object for the module
 * @returns {OptableRtdProviderParams}
 */
export const parseConfig = (moduleConfig) => {
  let bundleUrl = deepAccess(moduleConfig, 'params.bundleUrl', null);
  const adserverTargeting = deepAccess(moduleConfig, 'params.adserverTargeting', true);
  const handleRtd = deepAccess(moduleConfig, 'params.handleRtd', null);
  const instance = deepAccess(moduleConfig, 'params.instance', null);

  // If present, trim the bundle URL
  if (typeof bundleUrl === 'string') {
    bundleUrl = bundleUrl.trim();
  }

  // Verify that bundleUrl is a valid URL: only secure (HTTPS) URLs are allowed
  if (typeof bundleUrl === 'string' && bundleUrl.length && !bundleUrl.startsWith('https://')) {
    logError('Invalid URL format for bundleUrl in moduleConfig. Only HTTPS URLs are allowed.');
    return { bundleUrl: null, adserverTargeting, handleRtd: null };
  }

  if (handleRtd && typeof handleRtd !== 'function') {
    logError('handleRtd must be a function');
    return { bundleUrl, adserverTargeting, handleRtd: null };
  }

  const result = { bundleUrl, adserverTargeting, handleRtd };
  if (instance !== null) {
    result.instance = instance;
  }
  return result;
};

/**
 * Wait for Optable SDK event to fire with targeting data
 * @param {string} eventName Name of the event to listen for
 * @returns {Promise<Object|null>} Promise that resolves with targeting data or null
 */
const waitForOptableEvent = (eventName) => {
  return new Promise((resolve) => {
    const optableBundle = /** @type {Object} */ (window.optable);
    const cachedData = optableBundle?.instance?.targetingFromCache();

    if (cachedData && cachedData.ortb2) {
      logMessage('Optable SDK already has cached data');
      resolve(cachedData);
      return;
    }

    const eventListener = (event) => {
      logMessage(`Received ${eventName} event`);
      // Extract targeting data from event detail
      const targetingData = event.detail;
      window.removeEventListener(eventName, eventListener);
      resolve(targetingData);
    };

    window.addEventListener(eventName, eventListener);
    logMessage(`Waiting for ${eventName} event`);
  });
};

/**
 * Whether the Optable bundle has loaded on the page
 * @returns {boolean}
 */
const isBundleLoaded = () => {
  const optableBundle = /** @type {Object} */ (window.optable);
  return typeof optableBundle?.rtd?.handleRtd === 'function' || !!optableBundle?.instance;
};

/**
 * Read targeting data cached by the Optable bundle on a previous page.
 * Strips cache-only `_ref` metadata (UID2 refresh material written by older
 * bundles) from EIDs so it never reaches bid requests.
 * @returns {Object|null} Cached ORTB2 object with at least one EID, or null
 */
export const readCachedTargeting = () => {
  try {
    const ortb2 = JSON.parse(storage.getDataFromLocalStorage(OPTABLE_RESOLVED_KEY) || 'null')?.ortb2;
    if (!ortb2?.user?.eids?.length) {
      return null;
    }
    const eids = ortb2.user.eids.map((eid) => {
      const clean = { ...eid };
      delete clean._ref;
      return clean;
    });
    return { ...ortb2, user: { ...ortb2.user, eids } };
  } catch (error) {
    logWarn('Could not read cached targeting data', error);
    return null;
  }
};

/**
 * Enrich the request once the Optable bundle has loaded: use the bundle's own
 * handler if it exposes one, otherwise wait for its targeting data
 * @type {OptableHandleRtd}
 */
const handleRtdWithBundle = async (reqBidsConfigObj, optableExtraData, mergeFn) => {
  const bundleHandleRtd = window.optable?.rtd?.handleRtd;
  if (typeof bundleHandleRtd === 'function') {
    logMessage('Using the Optable bundle handleRtd');
    return bundleHandleRtd(reqBidsConfigObj, optableExtraData, mergeFn);
  }

  // Wait for the Optable SDK to dispatch targeting data via event
  const targetingData = await waitForOptableEvent('optable-targeting:change');

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
 * Default function to handle/enrich RTD data. Called without waiting for the
 * Optable bundle, so auctions that start before it loads can still use data
 * cached on a previous page.
 * @type {OptableHandleRtd}
 */
export const defaultHandleRtd = async (reqBidsConfigObj, optableExtraData, mergeFn) => {
  if (isBundleLoaded()) {
    return handleRtdWithBundle(reqBidsConfigObj, optableExtraData, mergeFn);
  }

  // Bundle not loaded yet: use data cached on a previous page, without waiting
  const cachedOrtb2 = readCachedTargeting();
  if (cachedOrtb2) {
    logMessage('Optable bundle not loaded yet, using cached targeting data');
    mergeFn(reqBidsConfigObj.ortb2Fragments.global, cachedOrtb2);
    return;
  }

  // Nothing cached: wait for the bundle to load
  logMessage('Optable bundle not loaded yet and no cached data, waiting for the bundle');
  window.optable = window.optable || { cmd: [] };
  await new Promise((resolve) => window.optable.cmd.push(resolve));
  return handleRtdWithBundle(reqBidsConfigObj, optableExtraData, mergeFn);
};

/**
 * Get data from Optable and merge it into the global ORTB2 object.
 * Always waits for the handler: checking for a native AsyncFunction fails once
 * the build transpiles async functions (e.g. `gulp build --ES5`).
 * @param {OptableHandleRtd} handleRtdFn Function to handle RTD data
 * @param {Object} reqBidsConfigObj Bid request configuration object
 * @param {OptableRtdConfig} optableExtraData Additional data to be used by the Optable SDK
 * @param {OptableMergeFn} mergeFn Function to merge data
 */
export const mergeOptableData = async (handleRtdFn, reqBidsConfigObj, optableExtraData, mergeFn) => {
  await handleRtdFn(reqBidsConfigObj, optableExtraData, mergeFn);
};

/**
 * @param {Object} reqBidsConfigObj Bid request configuration object
 * @param {Function} callback Called on completion
 * @param {OptableRtdProviderConfig} moduleConfig Configuration for Optable RTD module
 * @param {Object} userConsent
 */
export const getBidRequestData = (reqBidsConfigObj, callback, moduleConfig, userConsent) => {
  try {
    // Extract the bundle URL from the module configuration
    const { bundleUrl, handleRtd } = parseConfig(moduleConfig);
    const handleRtdFn = handleRtd || defaultHandleRtd;
    const optableExtraData = config.getConfig('optableRtdConfig') || {};

    if (bundleUrl) {
      // Load the Optable JS bundle in parallel; the handler does not wait for it
      logMessage('Custom bundle URL found in config: ', bundleUrl);
      loadExternalScript(bundleUrl, MODULE_TYPE_RTD, MODULE_NAME, () => {
        logMessage('Successfully loaded Optable JS bundle');
      }, document);
    }

    // Call the handler right away. The default handler copes with the bundle
    // not being loaded yet; a custom handler decides for itself whether to wait.
    mergeOptableData(handleRtdFn, reqBidsConfigObj, optableExtraData, mergeDeep).then(callback, callback);
  } catch (error) {
    // If an error occurs, log it and call the callback
    // to continue with the auction
    logError(error);
    callback();
  }
};

/**
 * Get Optable targeting data and merge it into the ad units
 * @param {string[]} adUnits Array of ad units
 * @param {OptableRtdProviderConfig} moduleConfig Module configuration
 * @param {Object} userConsent User consent
 * @param {Object} auction Auction object
 * @returns {Object} Targeting data
 */
export const getTargetingData = (adUnits, moduleConfig, userConsent, auction) => {
  // Extract `adserverTargeting` and `instance` from the module configuration
  const { adserverTargeting, instance } = parseConfig(moduleConfig);
  logMessage('Ad Server targeting: ', adserverTargeting);

  if (!adserverTargeting) {
    logMessage('Ad server targeting is disabled');
    return {};
  }

  const targetingData = {};
  // Resolve the SDK instance object based on the instance string
  // Default to 'instance' if not provided
  const instanceKey = instance || 'instance';
  const sdkInstance = window?.optable?.[instanceKey];
  if (!sdkInstance) {
    logWarn(`No Optable SDK instance found for: ${instanceKey}`);
    return targetingData;
  }

  // Get the Optable targeting data from the cache
  const optableTargetingData = sdkInstance?.targetingKeyValuesFromCache?.() || targetingData;

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
 * @param {OptableRtdProviderConfig} config Module configuration
 * @param {Object} userConsent User consent
 * @returns {true}
 */
const init = (config, userConsent) => {
  return true;
};

// Optable RTD submodule
export const optableSubmodule = {
  name: MODULE_NAME,
  init,
  getBidRequestData,
  getTargetingData,
};

// Register the Optable RTD submodule
submodule('realTimeData', optableSubmodule);
