/**
 * Oftmedia Real-Time Data (RTD) Provider Module
 *
 * This module enriches bid requests with device type, OS, and browser information
 * for improved ad targeting capabilities.
 */

import { MODULE_TYPE_RTD } from "../src/activities/modules.js";
import { loadExternalScript } from "../src/adloader.js";
import { submodule } from "../src/hook.js";
import { config as prebidConfig } from "../src/config.js";
import { getStorageManager } from "../src/storageManager.js";
import { prefixLog, mergeDeep, isStr } from "../src/utils.js";
import {
  getDeviceType,
  getOS,
  getBrowser,
} from "../libraries/userAgentUtils/index.js";

// Module constants
const MODULE_NAME = "oftmedia";
const EXTERNAL_SCRIPT_URL = "https://bidlift.152media.info/rtd";
const DEFAULT_TIMEOUT = 1500;
const TIMEOUT_BUFFER_RATIO = 0.7;

// Device type mappings for ORTB2 compliance
const DEVICE_TYPE_ORTB2_MAP = {
  0: 2, // Unknown -> PC
  1: 4, // Mobile -> Phone
  2: 5, // Tablet -> Tablet
};

// Module setup
export const storageManager = getStorageManager({
  moduleType: MODULE_TYPE_RTD,
  moduleName: MODULE_NAME,
});

const { logError, logWarn, logInfo } = prefixLog(`${MODULE_NAME}RtdProvider:`);

/**
 * Module state management
 */
class ModuleState {
  constructor() {
    this.initTimestamp = null;
    this.scriptLoadPromise = null;
    this.isReady = false;
    this.readyCallbacks = [];
  }

  markReady() {
    this.isReady = true;
    this.readyCallbacks.forEach((callback) => callback());
    this.readyCallbacks = [];
  }

  onReady(callback) {
    if (this.isReady) {
      callback();
    } else {
      this.readyCallbacks.push(callback);
    }
  }

  reset() {
    this.initTimestamp = null;
    this.scriptLoadPromise = null;
    this.isReady = false;
    this.readyCallbacks = [];
  }
}

const moduleState = new ModuleState();

/**
 * Creates a promise that resolves after specified timeout
 * @param {number} timeoutMs - Timeout in milliseconds
 * @returns {Promise<undefined>} Promise that resolves to undefined after timeout
 */
function createTimeoutPromise(timeoutMs) {
  return new Promise((resolve) => {
    setTimeout(() => resolve(undefined), timeoutMs);
  });
}

/**
 * Races a promise against a timeout
 * @param {Promise} promise - Promise to race
 * @param {number} timeoutMs - Timeout in milliseconds
 * @returns {Promise} Resolves with promise result or undefined on timeout
 */
function raceWithTimeout(promise, timeoutMs) {
  const timeoutPromise = createTimeoutPromise(timeoutMs);
  return Promise.race([promise, timeoutPromise]);
}

/**
 * Calculates remaining time based on auction delay and elapsed time
 * @param {number} startTime - Start timestamp
 * @param {number} maxDelay - Maximum allowed delay
 * @returns {number} Remaining time in milliseconds
 */
function calculateRemainingTime(startTime, maxDelay) {
  const elapsed = Date.now() - startTime;
  const allowedTime = maxDelay * TIMEOUT_BUFFER_RATIO;
  return Math.max(0, allowedTime - elapsed);
}

/**
 * Loads external Oftmedia script
 * @param {Object} moduleConfig - Configuration object
 * @returns {Promise<boolean>} Promise resolving to true on success
 */
function loadOftmediaScript(moduleConfig) {
  const publisherId = moduleConfig?.params?.publisherId;

  if (!publisherId) {
    const error = new Error("Publisher ID is required for script loading");
    logError(error.message);
    return Promise.reject(error);
  }

  return new Promise((resolve, reject) => {
    // Check localStorage availability
    storageManager.localStorageIsEnabled((hasStorage) => {
      if (!hasStorage) {
        const error = new Error("localStorage is not available");
        logWarn(error.message + ", skipping script load");
        return reject(error);
      }

      const scriptUrl = `${EXTERNAL_SCRIPT_URL}?pub_id=${publisherId}`;
      const onLoadSuccess = () => {
        logInfo("External script loaded successfully");
        resolve(true);
      };

      try {
        loadExternalScript(
          scriptUrl,
          MODULE_TYPE_RTD,
          MODULE_NAME,
          onLoadSuccess,
          undefined,
          { pub_id: publisherId }
        );
      } catch (error) {
        logError("Failed to load external script:", error);
        reject(error);
      }
    });
  });
}

/**
 * Converts device type to ORTB2 format for specific bidders
 * @param {number} deviceType - Original device type
 * @param {string} bidderCode - Bidder identifier
 * @returns {number} Converted device type
 */
function convertDeviceTypeForBidder(deviceType, bidderCode) {
  const convertibleBidders = ["oftmedia", "appnexus"];

  if (!convertibleBidders.includes(bidderCode)) {
    return deviceType;
  }

  const convertedType = DEVICE_TYPE_ORTB2_MAP[deviceType];
  if (convertedType === undefined) {
    logWarn(
      `No ORTB2 mapping found for device type ${deviceType}, using original`
    );
    return deviceType;
  }

  return convertedType;
}

/**
 * Builds ORTB2 data object for bid enrichment
 * @param {Object} config - Module configuration
 * @returns {Object|null} ORTB2 data object or null if invalid
 */
function buildOrtb2Data(config) {
  const deviceType = getDeviceType();
  const deviceOS = getOS();
  const browserType = getBrowser();
  const bidderCode = config?.params?.bidderCode;
  const enrichRequest = config?.params?.enrichRequest;

  const configuredKeywords = config?.params?.keywords || [];

  if (!enrichRequest) {
    logWarn("Enrich request is not enabled, skipping ORTB2 data build");
    return null;
  }

  if (!bidderCode) {
    logError("Bidder code is required in configuration");
    return null;
  }

  // Convert device type if needed
  const finalDeviceType = convertDeviceTypeForBidder(deviceType, bidderCode);

  // Build keywords array
  const allKeywords = [...configuredKeywords, `deviceBrowser=${browserType}`];

  return {
    bidderCode,
    ortb2Data: {
      device: {
        devicetype: finalDeviceType,
        os: deviceOS.toString(),
      },
      site: {
        keywords: allKeywords.join(", "),
      },
    },
  };
}

/**
 * Initialize the RTD module
 * @param {Object} config - Module configuration
 * @param {Object} userConsent - User consent object (unused)
 * @returns {boolean} True if initialization started successfully
 */
function initializeModule(config, userConsent) {
  moduleState.reset();
  moduleState.initTimestamp = Date.now();

  // Validate publisher ID
  if (!isStr(config?.params?.publisherId)) {
    logError("Publisher ID must be provided as a string");
    return false;
  }

  // Start script loading process
  moduleState.scriptLoadPromise = loadOftmediaScript(config);

  // Handle script loading completion
  moduleState.scriptLoadPromise
    .then(async () => {
      const auctionDelay =
        prebidConfig.getConfig("realTimeData")?.auctionDelay || DEFAULT_TIMEOUT;
      const remainingTime = calculateRemainingTime(
        moduleState.initTimestamp,
        auctionDelay
      );

      // Wait for script with remaining time budget
      const result = await raceWithTimeout(
        moduleState.scriptLoadPromise,
        remainingTime
      );

      if (result) {
        logInfo("Script loaded within time budget");
      } else {
        logWarn("Script loading exceeded time budget");
      }

      moduleState.markReady();
    })
    .catch((error) => {
      logError("Script loading failed:", error);
      moduleState.markReady();
    });

  return true;
}

/**
 * Process bid request data and add RTD enrichment
 * @param {Object} bidRequestConfig - Bid request configuration object
 * @param {Function} done - Callback function to signal completion
 * @param {Object} config - Module configuration
 */
function processBidRequestData(bidRequestConfig, done, config) {
  // Wait for module to be ready
  moduleState.onReady(() => {
    try {
      // Validate bid request structure
      if (!bidRequestConfig?.ortb2Fragments?.bidder) {
        logError(
          "Invalid bid request structure: missing ortb2Fragments.bidder"
        );
        return done();
      }

      if (config?.params?.enrichRequest === true) {
        // Build enrichment data
        const enrichmentData = buildOrtb2Data(config);

        logInfo("Building ORTB2 enrichment data", enrichmentData);

        if (!enrichmentData) {
          logInfo("Could not build ORTB2 enrichment data");
          return done();
        }

        // Apply enrichment to bid request
        mergeDeep(bidRequestConfig.ortb2Fragments.bidder, {
          [enrichmentData.bidderCode]: enrichmentData.ortb2Data,
        });

        logInfo("Bid request enriched successfully");
      }
      done();
    } catch (error) {
      logError("Error processing bid request data:", error);
      done();
    }
  });
}

/**
 * Handle bid request events (for debugging/monitoring)
 * @param {Object} bidderRequest - Bidder request object
 * @param {Object} config - Module configuration
 * @param {Object} userConsent - User consent object
 */
function handleBidRequestEvent(bidderRequest, config, userConsent) {
  logInfo("Bid request event received", {
    bidderRequest: JSON.stringify(bidderRequest),
    config,
    userConsent,
  });
}

/**
 * RTD Submodule definition
 */
export const oftmediaRtdSubmodule = {
  name: MODULE_NAME,
  init: initializeModule,
  getBidRequestData: processBidRequestData,
  onBidRequestEvent: handleBidRequestEvent,
};

export const __testing__ = {
  loadOftmediaScript,
  calculateRemainingTime,
  convertDeviceTypeForBidder,
  buildOrtb2Data,
  raceWithTimeout,
  moduleState,
};

submodule("realTimeData", oftmediaRtdSubmodule);
