import { submodule } from '../src/hook.js';
import { logError, mergeDeep, logMessage, deepSetValue, deepAccess } from '../src/utils.js';
import { getStorageManager } from '../src/storageManager.js';
import { MODULE_TYPE_RTD } from '../src/activities/modules.js';

/* global LanguageDetector, Summarizer */
/**
 * @typedef {import('../modules/rtdModule/index.js').RtdSubmodule} RtdSubmodule
 */

export const CONSTANTS = Object.freeze({
  SUBMODULE_NAME: 'chromeAi',
  REAL_TIME_MODULE: 'realTimeData',
  LOG_PRE_FIX: 'ChromeAI-Rtd-Provider:',
  STORAGE_KEY: 'chromeAi_detected_data', // Single key for both language and keywords
  MIN_TEXT_LENGTH: 20,
  ACTIVATION_EVENTS: ['click', 'keydown', 'mousedown', 'touchend', 'pointerdown', 'pointerup'],
  DEFAULT_CONFIG: {
    languageDetector: {
      enabled: true,
      confidence: 0.8,
      ortb2Path: 'site.content.language' // Default path for language
    },
    summarizer: {
      enabled: false,
      type: 'headline', // 'headline' or 'paragraph'
      format: 'markdown', // 'markdown' or 'plaintext'
      length: 'short', // 'short', 'medium', or 'long'
      ortb2Path: 'site.content.keywords', // Default path for keywords
      cacheInLocalStorage: true // Whether to cache detected keywords in localStorage
    }
  }
});

export const storage = getStorageManager({ moduleType: MODULE_TYPE_RTD, moduleName: CONSTANTS.SUBMODULE_NAME });

let moduleConfig = JSON.parse(JSON.stringify(CONSTANTS.DEFAULT_CONFIG));
let detectedKeywords = null; // To store generated summary/keywords

// Helper to initialize Chrome AI API instances (LanguageDetector, Summarizer)
const _createAiApiInstance = async (ApiConstructor, options) => {
  const apiName = ApiConstructor.name; // e.g., "LanguageDetector" or "Summarizer"

  try {
    if (!(apiName in self) || typeof self[apiName] !== 'function') { // Also check if it's a function (constructor)
      logError(`${CONSTANTS.LOG_PRE_FIX} ${apiName} API not available or not a constructor in self.`);
      return null;
    }

    const availability = await ApiConstructor.availability();
    if (availability === 'unavailable') {
      logError(`${CONSTANTS.LOG_PRE_FIX} ${apiName} is unavailable.`);
      return null;
    }

    let instance;
    if (availability === 'available') {
      instance = await ApiConstructor.create(options);
      logMessage(`${CONSTANTS.LOG_PRE_FIX} ${apiName} instance created (was available).`);
    } else { // Assuming 'after-download' or similar state if not 'available'
      logMessage(`${CONSTANTS.LOG_PRE_FIX} ${apiName} model needs download.`);

      instance = await ApiConstructor.create(options);
      instance.addEventListener('downloadprogress', (e) => {
        const progress = e.total > 0 ? Math.round(e.loaded / e.total * 100) : (e.loaded > 0 ? 'In progress' : 'Starting');
        logMessage(`${CONSTANTS.LOG_PRE_FIX} ${apiName} model DL: ${progress}${e.total > 0 ? '%' : ''}`);
      });
      await instance.ready;
      logMessage(`${CONSTANTS.LOG_PRE_FIX} ${apiName} model ready after download.`);
    }
    return instance;
  } catch (error) {
    logError(`${CONSTANTS.LOG_PRE_FIX} Error creating ${apiName} instance:`, error);
    return null;
  }
};

const mergeModuleConfig = (config) => {
  // Start with a deep copy of default_config to ensure all keys are present
  const newConfig = JSON.parse(JSON.stringify(CONSTANTS.DEFAULT_CONFIG));
  if (config?.params) {
    mergeDeep(newConfig, config.params);
  }
  moduleConfig = newConfig; // Assign to module-level variable
  logMessage(`${CONSTANTS.LOG_PRE_FIX} Module config set:`, moduleConfig);
  return moduleConfig;
};

export const getCurrentUrl = () => window.location.href;

export const getPageText = () => {
  const text = document.body.textContent;
  if (!text || text.length < CONSTANTS.MIN_TEXT_LENGTH) {
    logMessage(`${CONSTANTS.LOG_PRE_FIX} Not enough text content (length: ${text?.length || 0}) for processing.`);
    return null;
  }
  return text;
};

// --- Chrome AI LocalStorage Helper Functions ---
export const _getChromeAiDataFromLocalStorage = (url) => {
  if (!storage.hasLocalStorage() || !storage.localStorageIsEnabled()) {
    return null;
  }
  const currentUrl = url || getCurrentUrl();
  const storedJson = storage.getDataFromLocalStorage(CONSTANTS.STORAGE_KEY);
  if (storedJson) {
    try {
      const storedObject = JSON.parse(storedJson);
      return storedObject?.[currentUrl] || null;
    } catch (e) {
      logError(`${CONSTANTS.LOG_PRE_FIX} Error parsing Chrome AI data from localStorage:`, e);
    }
  }
  return null;
};

const _storeChromeAiDataInLocalStorage = (url, data) => {
  try {
    if (!storage.hasLocalStorage() || !storage.localStorageIsEnabled()) {
      logMessage(`${CONSTANTS.LOG_PRE_FIX} localStorage is not available, cannot store Chrome AI data.`);
      return false;
    }
    let overallStorageObject = {};
    const existingStoredJson = storage.getDataFromLocalStorage(CONSTANTS.STORAGE_KEY);
    if (existingStoredJson) {
      try {
        overallStorageObject = JSON.parse(existingStoredJson);
      } catch (e) {
        logError(`${CONSTANTS.LOG_PRE_FIX} Error parsing existing Chrome AI data from localStorage:`, e);
      }
    }
    const currentUrl = url || getCurrentUrl();
    overallStorageObject[currentUrl] = {
      ...overallStorageObject[currentUrl], // Preserve any existing data
      ...data // Overwrite or add new data
    };
    storage.setDataInLocalStorage(CONSTANTS.STORAGE_KEY, JSON.stringify(overallStorageObject));
    logMessage(`${CONSTANTS.LOG_PRE_FIX} Chrome AI data stored in localStorage for ${currentUrl}:`, data);
    return true;
  } catch (error) {
    logError(`${CONSTANTS.LOG_PRE_FIX} Error storing Chrome AI data to localStorage:`, error);
    return false;
  }
};

const isLanguageInLocalStorage = (url) => {
  const chromeAiData = _getChromeAiDataFromLocalStorage(url);
  return chromeAiData?.language || null;
};

export const getPrioritizedLanguageData = (reqBidsConfigObj) => {
  // 1. Check auction-specific ORTB2 (passed in reqBidsConfigObj for getBidRequestData)
  // Uses configurable path for language
  if (reqBidsConfigObj && moduleConfig.languageDetector) {
    const langPath = moduleConfig.languageDetector.ortb2Path;
    const lang = deepAccess(reqBidsConfigObj.ortb2Fragments?.global, langPath);
    if (lang) {
      logMessage(`${CONSTANTS.LOG_PRE_FIX} Language '${lang}' found in auction-specific ortb2Fragments at path '${langPath}'.`);
      return { language: lang, source: 'auction_ortb2' };
    }
  }

  // 2. Check localStorage (relevant for both init and getBidRequestData)
  const storedLangData = isLanguageInLocalStorage(getCurrentUrl());
  if (storedLangData) {
    logMessage(`${CONSTANTS.LOG_PRE_FIX} Language '${storedLangData.language}' found in localStorage.`);
    return { ...storedLangData, source: 'localStorage' };
  }

  return null;
};

const getPrioritizedKeywordsData = (reqBidsConfigObj) => {
  // 1. Check auction-specific ORTB2 (passed in reqBidsConfigObj for getBidRequestData)
  if (reqBidsConfigObj && moduleConfig.summarizer) {
    const keywordsPath = moduleConfig.summarizer.ortb2Path;
    const keywords = deepAccess(reqBidsConfigObj.ortb2Fragments?.global, keywordsPath);
    if (keywords && Array.isArray(keywords) && keywords.length > 0) {
      logMessage(`${CONSTANTS.LOG_PRE_FIX} Keywords found in auction-specific ortb2Fragments at path '${keywordsPath}'.`, keywords);
      return { keywords: keywords, source: 'auction_ortb2' };
    }
  }

  // 2. Check localStorage (if enabled)
  if (moduleConfig.summarizer?.cacheInLocalStorage === true) {
    const chromeAiData = _getChromeAiDataFromLocalStorage();
    const storedKeywords = chromeAiData?.keywords;
    if (storedKeywords && Array.isArray(storedKeywords) && storedKeywords.length > 0) {
      logMessage(`${CONSTANTS.LOG_PRE_FIX} Keywords found in localStorage.`, storedKeywords);
      return { keywords: storedKeywords, source: 'localStorage' };
    }
  }
  return null;
};

export const storeDetectedLanguage = (language, confidence, url) => {
  if (!language) {
    logMessage(`${CONSTANTS.LOG_PRE_FIX} No valid language to store`);
    return false;
  }
  const dataPayload = { language: language, confidence: confidence };
  return _storeChromeAiDataInLocalStorage(url, { language: dataPayload });
};

export const detectLanguage = async (text) => {
  const detector = await _createAiApiInstance(LanguageDetector);
  if (!detector) {
    return null; // Error already logged by _createAiApiInstance
  }

  try {
    const results = await detector.detect(text);
    if (!results || results.length === 0) {
      logMessage(`${CONSTANTS.LOG_PRE_FIX} No language results from API.`);
      return null;
    }
    const topResult = results[0];
    logMessage(`${CONSTANTS.LOG_PRE_FIX} Detected lang: ${topResult.detectedLanguage} (conf: ${topResult.confidence.toFixed(2)})`);
    if (topResult.confidence < moduleConfig.languageDetector.confidence) {
      logMessage(`${CONSTANTS.LOG_PRE_FIX} Lang confidence (${topResult.confidence.toFixed(2)}) < threshold (${moduleConfig.languageDetector.confidence}).`);
      return null;
    }
    return { language: topResult.detectedLanguage, confidence: topResult.confidence };
  } catch (error) {
    logError(`${CONSTANTS.LOG_PRE_FIX} Error during LanguageDetector.detect():`, error);
    return null;
  }
};

export const detectSummary = async (text, config) => {
  const summaryOptions = {
    type: config.type,
    format: config.format,
    length: config.length,
  };
  const summarizer = await _createAiApiInstance(Summarizer, summaryOptions);
  if (!summarizer) {
    return null; // Error already logged by _createAiApiInstance
  }

  try {
    const summaryResult = await summarizer.summarize(text, summaryOptions);
    if (!summaryResult) {
      logMessage(`${CONSTANTS.LOG_PRE_FIX} No summary result from API.`);
      return null;
    }
    logMessage(`${CONSTANTS.LOG_PRE_FIX} Summary generated (type: ${summaryOptions.type}, len: ${summaryOptions.length}):`, summaryResult.substring(0, 100) + '...');
    return summaryResult; // This is a string
  } catch (error) {
    logError(`${CONSTANTS.LOG_PRE_FIX} Error during Summarizer.summarize():`, error);
    return null;
  }
};

const initLanguageDetector = async () => {
  const existingLanguage = getPrioritizedLanguageData(null); // Pass null or undefined for reqBidsConfigObj
  if (existingLanguage && existingLanguage.source === 'localStorage') {
    logMessage(`${CONSTANTS.LOG_PRE_FIX} Language detection skipped, language '${existingLanguage.language}' found in localStorage.`);
    return true;
  }

  const pageText = getPageText();
  if (!pageText) return false;

  const detectionResult = await detectLanguage(pageText);
  if (!detectionResult) {
    logMessage(`${CONSTANTS.LOG_PRE_FIX} Failed to detect language from page content.`);
    return false;
  }
  return storeDetectedLanguage(detectionResult.language, detectionResult.confidence, getCurrentUrl());
};

export const storeDetectedKeywords = (keywords, url) => {
  if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
    logMessage(`${CONSTANTS.LOG_PRE_FIX} No valid keywords array to store`);
    return false;
  }
  return _storeChromeAiDataInLocalStorage(url, { keywords: keywords });
};

const initSummarizer = async () => {
  // Check for prioritized/cached keywords first (reqBidsConfigObj is null during init)
  const prioritizedData = getPrioritizedKeywordsData(null);
  if (prioritizedData && prioritizedData.source === 'localStorage') {
    detectedKeywords = prioritizedData.keywords;
    logMessage(`${CONSTANTS.LOG_PRE_FIX} Summarizer skipped, keywords from localStorage.`, detectedKeywords);
    return true;
  }
  // If auction_ortb2 had data, it would be handled by getBidRequestData directly, init focuses on detection/localStorage

  const pageText = getPageText();
  if (!pageText) {
    logMessage(`${CONSTANTS.LOG_PRE_FIX} Summarizer: No/short text, cannot generate keywords.`);
    return false;
  }

  if (!moduleConfig.summarizer) {
    logError(`${CONSTANTS.LOG_PRE_FIX} Summarizer config missing during init.`);
    return false;
  }

  // If the model is not 'available' (needs download), it typically requires a user gesture.
  // We check availability and defer if needed.
  try {
    const availability = await Summarizer.availability();
    const needsDownload = availability !== 'available' && availability !== 'unavailable'; // 'after-download', 'downloading', etc.

    if (needsDownload && !navigator.userActivation?.isActive) {
      logMessage(`${CONSTANTS.LOG_PRE_FIX} Summarizer needs download (${availability}) but user inactive. Deferring init...`);

      const onUserActivation = () => {
        CONSTANTS.ACTIVATION_EVENTS.forEach(evt => window.removeEventListener(evt, onUserActivation));
        logMessage(`${CONSTANTS.LOG_PRE_FIX} User activation detected. Retrying initSummarizer...`);
        // Retry initialization with fresh gesture
        initSummarizer();
      };

      CONSTANTS.ACTIVATION_EVENTS.forEach(evt => window.addEventListener(evt, onUserActivation, { once: true }));

      return false; // Return false to not block main init, will retry later
    }
  } catch (e) {
    logError(`${CONSTANTS.LOG_PRE_FIX} Error checking Summarizer availability:`, e);
  }

  const summaryText = await detectSummary(pageText, moduleConfig.summarizer);
  if (summaryText) {
    // The API returns a single summary string. We treat this string as a single keyword.
    // If multiple keywords were desired from the summary, further processing would be needed here.
    detectedKeywords = [summaryText];
    logMessage(`${CONSTANTS.LOG_PRE_FIX} Summary processed and new keywords generated:`, detectedKeywords);

    if (moduleConfig.summarizer.cacheInLocalStorage === true) {
      storeDetectedKeywords(detectedKeywords, getCurrentUrl());
    }
    return true;
  }
  logMessage(`${CONSTANTS.LOG_PRE_FIX} Failed to generate summary, no new keywords.`);
  return false;
};

const init = async (config) => {
  moduleConfig = mergeModuleConfig(config);
  logMessage(`${CONSTANTS.LOG_PRE_FIX} Initializing with config:`, moduleConfig);

  const activeInitializations = [];

  if (moduleConfig.languageDetector?.enabled !== false) {
    logMessage(`${CONSTANTS.LOG_PRE_FIX} Language detection enabled. Initializing...`);
    activeInitializations.push(initLanguageDetector());
  } else {
    logMessage(`${CONSTANTS.LOG_PRE_FIX} Language detection disabled by config.`);
  }

  // Summarizer Initialization
  if (moduleConfig.summarizer?.enabled === true) {
    logMessage(`${CONSTANTS.LOG_PRE_FIX} Summarizer enabled. Initializing...`);
    activeInitializations.push(initSummarizer());
  } else {
    logMessage(`${CONSTANTS.LOG_PRE_FIX} Summarizer disabled by config.`);
  }

  if (activeInitializations.length === 0) {
    logMessage(`${CONSTANTS.LOG_PRE_FIX} No features enabled for initialization.`);
    return true; // Module is considered initialized if no features are active/enabled.
  }

  // Wait for all enabled features to attempt initialization
  try {
    const results = await Promise.all(activeInitializations);
    // Consider init successful if at least one feature init succeeded, or if no features were meant to run.
    const overallSuccess = results.length > 0 ? results.some(result => result === true) : true;
    if (overallSuccess) {
      logMessage(`${CONSTANTS.LOG_PRE_FIX} Relevant features initialized.`);
    } else {
      logError(`${CONSTANTS.LOG_PRE_FIX} All enabled features failed to initialize.`);
    }
    return overallSuccess;
  } catch (error) {
    logError(`${CONSTANTS.LOG_PRE_FIX} Error during feature initializations:`, error);
    return false;
  }
};

/**
 * Add language data to bid request
 * @param {Object} reqBidsConfigObj - Request bids configuration object
 * @param {function} callback - Callback function
 */
const getBidRequestData = (reqBidsConfigObj, callback) => {
  logMessage(`${CONSTANTS.LOG_PRE_FIX} reqBidsConfigObj:`, reqBidsConfigObj);

  // Ensure ortb2Fragments and global path exist for potential deepSetValue operations
  reqBidsConfigObj.ortb2Fragments = reqBidsConfigObj.ortb2Fragments || {};
  reqBidsConfigObj.ortb2Fragments.global = reqBidsConfigObj.ortb2Fragments.global || {};

  // Language Data Enrichment
  if (moduleConfig.languageDetector?.enabled !== false) {
    const languageData = getPrioritizedLanguageData(reqBidsConfigObj);
    if (languageData && languageData.source !== 'auction_ortb2') {
      const langPath = moduleConfig.languageDetector.ortb2Path;
      logMessage(`${CONSTANTS.LOG_PRE_FIX} Enriching ORTB2 path '${langPath}' with lang '${languageData.language}' from ${languageData.source}.`);
      deepSetValue(reqBidsConfigObj.ortb2Fragments.global, langPath, languageData.language);
    } else if (languageData?.source === 'auction_ortb2') {
      const langPath = moduleConfig.languageDetector.ortb2Path;
      logMessage(`${CONSTANTS.LOG_PRE_FIX} Lang already in auction ORTB2 at path '${langPath}', no enrichment needed.`);
    }
  } else {
    logMessage(`${CONSTANTS.LOG_PRE_FIX} Language detection disabled, no lang enrichment.`);
  }

  // Summarizer Data (Keywords) Enrichment
  if (moduleConfig.summarizer?.enabled === true) {
    const keywordsPath = moduleConfig.summarizer.ortb2Path;
    const auctionKeywords = deepAccess(reqBidsConfigObj.ortb2Fragments.global, keywordsPath);

    if (auctionKeywords && Array.isArray(auctionKeywords) && auctionKeywords.length > 0) {
      logMessage(`${CONSTANTS.LOG_PRE_FIX} Keywords already present in auction_ortb2 at path '${keywordsPath}', no enrichment from module.`, auctionKeywords);
    } else {
      // auction_ortb2 path is empty, try to use keywords from initSummarizer (localStorage or fresh detection)
      if (detectedKeywords && detectedKeywords.length > 0) {
        logMessage(`${CONSTANTS.LOG_PRE_FIX} Enriching ORTB2 path '${keywordsPath}' with keywords from module (localStorage/detection):`, detectedKeywords);
        deepSetValue(reqBidsConfigObj.ortb2Fragments.global, keywordsPath, detectedKeywords);
      } else {
        logMessage(`${CONSTANTS.LOG_PRE_FIX} Summarizer enabled, but no keywords from auction_ortb2, localStorage, or fresh detection for path '${keywordsPath}'.`);
      }
    }
  } else {
    logMessage(`${CONSTANTS.LOG_PRE_FIX} Summarizer disabled, no keyword enrichment.`);
  }

  logMessage(`${CONSTANTS.LOG_PRE_FIX} Final reqBidsConfigObj for auction:`, reqBidsConfigObj);
  callback();
};

/** @type {RtdSubmodule} */
export const chromeAiSubmodule = {
  name: CONSTANTS.SUBMODULE_NAME,
  disclosureURL: 'local://modules/chromeAiRtdProvider.json',
  init,
  getBidRequestData
};

export const registerSubModule = () => {
  submodule(CONSTANTS.REAL_TIME_MODULE, chromeAiSubmodule);
};

registerSubModule();
