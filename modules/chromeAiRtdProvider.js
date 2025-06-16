import { submodule } from '../src/hook.js';
import { logError, mergeDeep, logMessage } from '../src/utils.js';
import { getCoreStorageManager } from '../src/storageManager.js';
import { config as conf } from '../src/config.js';

/* global LanguageDetector */
/**
 * @typedef {import('../modules/rtdModule/index.js').RtdSubmodule} RtdSubmodule
 */

const CONSTANTS = Object.freeze({
  SUBMODULE_NAME: 'chromeAi',
  REAL_TIME_MODULE: 'realTimeData',
  LOG_PRE_FIX: 'ChromeAI-Rtd-Provider: ',
  STORAGE_KEY: 'chromeAi_detected_language',
  MIN_TEXT_LENGTH: 20,
  DEFAULT_CONFIG: {
    languageDetector: {
      enabled: true,
      confidence: 0.8
    }
  }
});

// Get storage manager for this module
const storage = getCoreStorageManager(CONSTANTS.SUBMODULE_NAME);

// Module-level configuration
let moduleConfig = JSON.parse(JSON.stringify(CONSTANTS.DEFAULT_CONFIG));

/**
 * Set module config
 * @param {Object} config - Configuration from Prebid.js
 */
const mergeModuleConfig = (config) => {
  // Create a deep copy of the default config
  moduleConfig = JSON.parse(JSON.stringify(CONSTANTS.DEFAULT_CONFIG));

  // If params are provided, merge them with the default config
  if (config?.params) {
    mergeDeep(moduleConfig, config.params);
  }

  logMessage(`${CONSTANTS.LOG_PRE_FIX} Module config set:`, moduleConfig);
  return moduleConfig;
};

/**
 * Get the current URL
 * @returns {string} The current URL
 */
export const getCurrentUrl = () => window.location.href;

/**
 * Check if detected language exists in localStorage for the current URL
 * @param {string} [url] - URL to check for (defaults to current URL)
 * @returns {Object|null} The detected language if found, null otherwise
 */
const isLanguageInLocalStorage = (url) => {
  if (!storage.hasLocalStorage() || !storage.localStorageIsEnabled()) {
    logMessage(`${CONSTANTS.LOG_PRE_FIX} localStorage is not available`);
    return null;
  }

  const currentUrl = url || getCurrentUrl();
  const storedLanguageJson = storage.getDataFromLocalStorage(CONSTANTS.STORAGE_KEY);
  if (storedLanguageJson) {
    try {
      const languageObject = JSON.parse(storedLanguageJson);
      if (languageObject?.[currentUrl]) {
        return languageObject[currentUrl];
      }
    } catch (e) {
      logError(`${CONSTANTS.LOG_PRE_FIX} Error parsing localStorage:`, e);
    }
  }

  return null;
};

/**
 * Store detected language in localStorage
 * @param {string} language - The detected language code
 * @param {number} confidence - The confidence score for the detection
 * @param {string} url - The URL to associate with this language
 * @returns {boolean} - Whether the operation was successful
 */
export const storeDetectedLanguage = (language, confidence, url) => {
  try {
    if (!language) {
      logMessage(`${CONSTANTS.LOG_PRE_FIX} No valid language to store`);
      return false;
    }

    if (!storage.hasLocalStorage() || !storage.localStorageIsEnabled()) {
      logMessage(`${CONSTANTS.LOG_PRE_FIX} localStorage is not available`);
      return false;
    }

    // Get existing language object or create a new one
    let languageObject = {};
    const storedLanguageJson = storage.getDataFromLocalStorage(CONSTANTS.STORAGE_KEY);
    if (storedLanguageJson) {
      languageObject = JSON.parse(storedLanguageJson);
    }

    // Store the result in the language object
    languageObject[url] = {
      language: language,
      confidence: confidence
    };

    // Save the updated object back to localStorage
    storage.setDataInLocalStorage(CONSTANTS.STORAGE_KEY, JSON.stringify(languageObject));
    logMessage(`${CONSTANTS.LOG_PRE_FIX} Language stored in localStorage:`, language, confidence);

    return true;
  } catch (error) {
    logError(`${CONSTANTS.LOG_PRE_FIX} Error storing language:`, error);
    return false;
  }
};

/**
 * Detect the language of a text using Chrome AI language detection API
 * @param {string} text - The text to detect language for
 * @returns {Promise<Object|null>} - Object with detected language and confidence or null if detection fails
 */
export const detectLanguage = async (text) => {
  try {
    // Check if language detection API is available
    if (!('LanguageDetector' in self)) {
      logError(`${CONSTANTS.LOG_PRE_FIX} Language detection API is not available`);
      return null;
    }

    // Check availability
    const availability = await LanguageDetector.availability();

    if (availability === 'unavailable') {
      logError(`${CONSTANTS.LOG_PRE_FIX} Language detector is not available`);
      return null;
    }

    let detector;
    if (availability === 'available') {
      // The language detector can immediately be used
      detector = await LanguageDetector.create();
    } else {
      // The language detector can be used after model download
      detector = await LanguageDetector.create({
        monitor(m) {
          m.addEventListener('downloadprogress', (e) => {
            logMessage(`${CONSTANTS.LOG_PRE_FIX} Language detector download progress: ${e.loaded * 100}%`);
          });
        },
      });
      await detector.ready;
    }

    // Detect language
    const results = await detector.detect(text);

    if (!results || results.length === 0) {
      logError(`${CONSTANTS.LOG_PRE_FIX} No language detection results`);
      return null;
    }

    const topResult = results[0];
    logMessage(`${CONSTANTS.LOG_PRE_FIX} Detected language: ${topResult.detectedLanguage} (confidence: ${topResult.confidence})`);

    // Check if confidence is below the threshold
    const confidenceThreshold = moduleConfig.languageDetector.confidence;
    if (topResult.confidence < confidenceThreshold) {
      logMessage(`${CONSTANTS.LOG_PRE_FIX} Language detection confidence (${topResult.confidence}) is below threshold (${confidenceThreshold}), skipping`);
      return null;
    }

    return {
      language: topResult.detectedLanguage,
      confidence: topResult.confidence
    };
  } catch (error) {
    logError(`${CONSTANTS.LOG_PRE_FIX} Error detecting language:`, error);
    return null;
  }
};

/**
 * Performs language detection and stores the result
 * @returns {Promise<boolean>} - Whether language detection was successful
 */
const initLanguageDetector = async () => {
  // Check if language is already set in ortb2
  const ortb2 = conf.getAnyConfig('ortb2');
  if (ortb2?.site?.content?.language) {
    logMessage(`${CONSTANTS.LOG_PRE_FIX} Language already set in ortb2.site.content.language: ${ortb2.site.content.language}. Skipping detection.`);
    return true;
  }

  // Check if language already exists in localStorage
  const storedLanguage = isLanguageInLocalStorage();

  if (storedLanguage) {
    logMessage(`${CONSTANTS.LOG_PRE_FIX} Language already in localStorage, skipping detection`, storedLanguage);
    return true;
  }

  // Get page text content
  const pageText = document.body.textContent;
  if (!pageText || pageText.length < CONSTANTS.MIN_TEXT_LENGTH) {
    logMessage(`${CONSTANTS.LOG_PRE_FIX} Not enough text content to detect language`);
    return false;
  }

  // Detect language using Chrome AI
  const detectionResult = await detectLanguage(pageText);
  if (!detectionResult) {
    logMessage(`${CONSTANTS.LOG_PRE_FIX} Failed to detect language, aborting`);
    return false;
  }

  // Store language in localStorage
  const stored = storeDetectedLanguage(
    detectionResult.language,
    detectionResult.confidence,
    getCurrentUrl()
  );

  // Return the result of the storage operation
  return stored;
};

/**
 * Initialize the ChromeAI RTD Module.
 * @param {Object} config - Module configuration
 * @param {Object} userConsent - User consent data
 * @returns {boolean} - Whether initialization was successful
 */
const init = async (config, userConsent) => {
  logMessage(`${CONSTANTS.LOG_PRE_FIX} config:`, config);

  // Set module configuration
  moduleConfig = mergeModuleConfig(config);

  // Only run language detection if enabled (default is true)
  if (!moduleConfig.languageDetector || moduleConfig.languageDetector.enabled !== false) {
    logMessage(`${CONSTANTS.LOG_PRE_FIX} Language detection is enabled`);
    return await initLanguageDetector();
  }

  return true;
};

/**
 * Add language data to bid request
 * @param {Object} reqBidsConfigObj - Request bids configuration object
 * @param {function} callback - Callback function
 */
const getBidRequestData = (reqBidsConfigObj, callback) => {
  logMessage(`${CONSTANTS.LOG_PRE_FIX} reqBidsConfigObj:`, reqBidsConfigObj);

  // Check if language detection is explicitly disabled
  if (moduleConfig.languageDetector && moduleConfig.languageDetector.enabled === false) {
    logMessage(`${CONSTANTS.LOG_PRE_FIX} Language detection is disabled in config`);
    callback();
    return;
  }

  // Check if language is already set in ortb2
  // First check reqBidsConfigObj (which has priority for the current auction)
  if (reqBidsConfigObj?.ortb2Fragments?.global?.site?.content?.language) {
    logMessage(`${CONSTANTS.LOG_PRE_FIX} Language already set in reqBidsConfigObj.ortb2Fragments.global.site.content.language: ${reqBidsConfigObj.ortb2Fragments.global.site.content.language}. Using existing value.`);
    callback();
    return;
  }

  // Check if language exists in localStorage
  const storedLanguage = isLanguageInLocalStorage();
  if (storedLanguage) {
    logMessage(`${CONSTANTS.LOG_PRE_FIX} Setting detected language from localStorage:`, storedLanguage);

    // Add language information to bid request
    mergeDeep(reqBidsConfigObj.ortb2Fragments.global, {
      site: {
        content: {
          language: storedLanguage.language
        }
      }
    });
  } else {
    logMessage(`${CONSTANTS.LOG_PRE_FIX} No language found in localStorage for current URL`);
  }

  logMessage(`${CONSTANTS.LOG_PRE_FIX} after changing:`, reqBidsConfigObj);
  callback();
};

/** @type {RtdSubmodule} */
export const chromeAiSubmodule = {
  name: CONSTANTS.SUBMODULE_NAME,
  init,
  getBidRequestData
};

export const registerSubModule = () => {
  submodule(CONSTANTS.REAL_TIME_MODULE, chromeAiSubmodule);
};

registerSubModule();
