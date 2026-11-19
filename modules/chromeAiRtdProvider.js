import { submodule } from '../src/hook.js';
import { logError, logWarn, mergeDeep, logMessage, deepSetValue, deepAccess, cyrb53Hash, isArray, isPlainObject, isStr } from '../src/utils.js';
import { getStorageManager } from '../src/storageManager.js';
import { MODULE_TYPE_RTD } from '../src/activities/modules.js';

/**
 * @typedef {import('../modules/rtdModule/index.js').RtdSubmodule} RtdSubmodule
 * @typedef {import('./chromeAiRtdProvider.d.ts').ChromeAiRtdParams} ChromeAiRtdParams
 * @typedef {import('./chromeAiRtdProvider.d.ts').ChromeAiDecisionQuestion} ChromeAiDecisionQuestion
 */

export const CONSTANTS = Object.freeze({
  SUBMODULE_NAME: 'chromeAi',
  REAL_TIME_MODULE: 'realTimeData',
  LOG_PRE_FIX: 'ChromeAI-Rtd-Provider:',
  STORAGE_KEY: 'chromeAi_detected_data', // Single key for all detected data, keyed by page URL
  MIN_TEXT_LENGTH: 20,
  ACTIVATION_EVENTS: ['click', 'keydown', 'mousedown', 'touchend', 'pointerdown', 'pointerup'],
  MAX_TEXT_LENGTH: 1000, // Limit to prevent QuotaExceededError with Chrome AI APIs
  DECISION_TYPES: ['boolean', 'choice', 'score'],
  CATTAX_IAB_CONTENT_2_2: 6,
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
    },
    keywords: {
      enabled: false,
      maxKeywords: 10,
      ortb2Path: 'site.content.keywords',
      cacheInLocalStorage: true
    },
    categories: {
      enabled: false,
      minScore: 0.5,
      maxCategories: 3,
      gamPps: true,
      taxonomy: 6,
      cacheInLocalStorage: true
    },
    decisions: {
      enabled: false,
      questions: [],
      minConfidence: 0,
      promptFallback: true,
      cacheInLocalStorage: true
    }
  }
});

/**
 * Tier 1 of each supported IAB content taxonomy (ID to name), keyed by AdCOM `cattax`. The model may only answer with
 * these IDs; the full taxonomies are too large to bundle.
 * - 1, Content Category Taxonomy 1.0: IAB1 - IAB23. IAB24 Uncategorized, IAB25 Non-Standard Content and
 *   IAB26 Illegal Content are left out because they aren't page topics.
 * - 6, Content Taxonomy 2.2: only tier 1 rows with a numeric ID from 1 to 680 inclusive, nothing past 680. The file's
 *   other parentless rows, Sensitive Topics (v9i3On), Brand Suitability and Risk (MRkz4Q) and the Content
 *   Channel/Type/Source/Media Format/Language/Source Geo extension dimensions (1000 - 1219), aren't page topics.
 */
export const TIER_1_CATEGORIES = Object.freeze({
  1: {
    'IAB1': 'Arts & Entertainment',
    'IAB2': 'Automotive',
    'IAB3': 'Business',
    'IAB4': 'Careers',
    'IAB5': 'Education',
    'IAB6': 'Family & Parenting',
    'IAB7': 'Health & Fitness',
    'IAB8': 'Food & Drink',
    'IAB9': 'Hobbies & Interests',
    'IAB10': 'Home & Garden',
    'IAB11': "Law, Gov't & Politics",
    'IAB12': 'News',
    'IAB13': 'Personal Finance',
    'IAB14': 'Society',
    'IAB15': 'Science',
    'IAB16': 'Pets',
    'IAB17': 'Sports',
    'IAB18': 'Style & Fashion',
    'IAB19': 'Technology & Computing',
    'IAB20': 'Travel',
    'IAB21': 'Real Estate',
    'IAB22': 'Shopping',
    'IAB23': 'Religion & Spirituality'
  },
  6: {
    '1': 'Automotive',
    '42': 'Books and Literature',
    '52': 'Business and Finance',
    '123': 'Careers',
    '132': 'Education',
    '150': 'Events and Attractions',
    '186': 'Family and Relationships',
    '201': 'Fine Art',
    '210': 'Food & Drink',
    '223': 'Healthy Living',
    '239': 'Hobbies & Interests',
    '274': 'Home & Garden',
    '286': 'Medical Health',
    '324': 'Movies',
    '338': 'Music and Audio',
    '379': 'News and Politics',
    '391': 'Personal Finance',
    '422': 'Pets',
    '432': 'Pop Culture',
    '441': 'Real Estate',
    '453': 'Religion & Spirituality',
    '464': 'Science',
    '473': 'Shopping',
    '483': 'Sports',
    '552': 'Style & Fashion',
    '596': 'Technology & Computing',
    '640': 'Television',
    '653': 'Travel',
    '680': 'Video Gaming'
  }
});

const TAXONOMY_NAMES = {
  1: 'IAB Content Category Taxonomy 1.0',
  6: 'IAB Content Taxonomy 2.2'
};

const DEFERRED = 'deferred';
// Chrome warns when a LanguageModel session doesn't declare its output language.
const LANGUAGE_MODEL_OPTIONS = Object.freeze({ expectedOutputs: [{ type: 'text', languages: ['en'] }] });

export const storage = getStorageManager({ moduleType: MODULE_TYPE_RTD, moduleName: CONSTANTS.SUBMODULE_NAME });

/** @type {any} */
let moduleConfig = JSON.parse(JSON.stringify(CONSTANTS.DEFAULT_CONFIG));
/** Results ready for getBidRequestData, keyed like the localStorage cache entry. */
let detected = {};

const getAiApi = (name) => (typeof self[name] === 'function' ? self[name] : null);

const isUserActive = () => navigator.userActivation?.isActive === true;

const withDownloadMonitor = (apiName, options) => ({
  ...options,
  monitor(m) {
    m.addEventListener('downloadprogress', (e) => {
      logMessage(`${CONSTANTS.LOG_PRE_FIX} ${apiName} model download: ${Math.round(e.loaded * 100)}%`);
    });
  }
});

/**
 * Creates an instance of a Chrome built-in AI API. Callers must have checked availability and user activation.
 */
const createApiInstance = (apiName, options) => getAiApi(apiName).create(withDownloadMonitor(apiName, options));

// LanguageDetector keeps its original flow: no user activation check, unavailable APIs are errors.
const _createAiApiInstance = async (apiName, options) => {
  try {
    const Api = getAiApi(apiName);
    if (!Api) {
      logError(`${CONSTANTS.LOG_PRE_FIX} ${apiName} API not available or not a constructor in self.`);
      return null;
    }
    const availability = await Api.availability(options);
    if (availability === 'unavailable') {
      logError(`${CONSTANTS.LOG_PRE_FIX} ${apiName} is unavailable.`);
      return null;
    }
    const instance = await createApiInstance(apiName, options);
    logMessage(`${CONSTANTS.LOG_PRE_FIX} ${apiName} instance created (availability: ${availability}).`);
    return instance;
  } catch (error) {
    logError(`${CONSTANTS.LOG_PRE_FIX} Error creating ${apiName} instance:`, error);
    return null;
  }
};

export const getApiAvailability = async (apiName, options) => {
  const Api = getAiApi(apiName);
  if (!Api) {
    logMessage(`${CONSTANTS.LOG_PRE_FIX} ${apiName} API not available.`);
    return 'unavailable';
  }
  try {
    const availability = await Api.availability(options);
    logMessage(`${CONSTANTS.LOG_PRE_FIX} ${apiName} availability: ${availability}.`);
    return availability;
  } catch (error) {
    logError(`${CONSTANTS.LOG_PRE_FIX} Error checking ${apiName} availability:`, error);
    return 'unavailable';
  }
};

const deferUntilUserActivation = (feature, retry) => {
  logMessage(`${CONSTANTS.LOG_PRE_FIX} ${feature} needs a model download but the user is inactive. Deferring until user activation...`);
  const onUserActivation = () => {
    CONSTANTS.ACTIVATION_EVENTS.forEach(evt => window.removeEventListener(evt, onUserActivation));
    logMessage(`${CONSTANTS.LOG_PRE_FIX} User activation detected. Retrying ${feature}...`);
    retry();
  };
  CONSTANTS.ACTIVATION_EVENTS.forEach(evt => window.addEventListener(evt, onUserActivation, { once: true }));
};

/**
 * Picks the first API in `candidates` (in order of preference) that isn't unavailable.
 * Model downloads need user activation, so when the chosen API isn't downloaded yet and the user is inactive,
 * `retry` runs on the next user activation and DEFERRED is returned.
 */
export const selectApi = async (feature, candidates, retry) => {
  for (const candidate of candidates) {
    const availability = await getApiAvailability(candidate.name, candidate.options);
    if (availability === 'unavailable') continue;
    if (availability !== 'available' && !isUserActive()) {
      deferUntilUserActivation(feature, retry);
      return DEFERRED;
    }
    return candidate;
  }
  logMessage(`${CONSTANTS.LOG_PRE_FIX} ${feature}: none of ${candidates.map(c => c.name).join(', ')} is available.`);
  return null;
};

const promptForJson = async (prompt, responseConstraint) => {
  const session = await createApiInstance('LanguageModel', LANGUAGE_MODEL_OPTIONS);
  try {
    return JSON.parse(await session.prompt(prompt, { responseConstraint }));
  } finally {
    session.destroy?.();
  }
};

const mergeModuleConfig = (config) => {
  const newConfig = JSON.parse(JSON.stringify(CONSTANTS.DEFAULT_CONFIG));
  if (config?.params) {
    mergeDeep(newConfig, config.params);
  }
  moduleConfig = newConfig;
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
  // Limit text length to prevent QuotaExceededError with Chrome AI APIs
  if (text.length > CONSTANTS.MAX_TEXT_LENGTH) {
    logMessage(`${CONSTANTS.LOG_PRE_FIX} Truncating text from ${text.length} to ${CONSTANTS.MAX_TEXT_LENGTH} chars.`);
    return text.substring(0, CONSTANTS.MAX_TEXT_LENGTH);
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

export const storeDetectedLanguage = (language, confidence, url) => {
  if (!language) {
    logMessage(`${CONSTANTS.LOG_PRE_FIX} No valid language to store`);
    return false;
  }
  const dataPayload = { language: language, confidence: confidence };
  return _storeChromeAiDataInLocalStorage(url, { language: dataPayload });
};

export const detectLanguage = async (text) => {
  const detector = await _createAiApiInstance('LanguageDetector');
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

const getSummarizerOptions = (config) => ({
  type: config.type,
  format: config.format,
  length: config.length,
});

/**
 * Summarizes `text`; callers must have checked Summarizer availability and user activation.
 */
export const detectSummary = async (text, config) => {
  const summaryOptions = getSummarizerOptions(config);
  const summarizer = await createApiInstance('Summarizer', summaryOptions);
  try {
    const summaryResult = await summarizer.summarize(text);
    if (!summaryResult) {
      logMessage(`${CONSTANTS.LOG_PRE_FIX} No summary result from API.`);
      return null;
    }
    logMessage(`${CONSTANTS.LOG_PRE_FIX} Summary generated (type: ${summaryOptions.type}, len: ${summaryOptions.length}):`, summaryResult.substring(0, 100) + '...');
    return summaryResult;
  } finally {
    summarizer.destroy?.();
  }
};

const initLanguageDetector = async () => {
  const existingLanguage = getPrioritizedLanguageData(null);
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

const isNonEmptyArray = (value) => isArray(value) && value.length > 0;

/**
 * Fills `detected[key]` (a non-empty array) from the localStorage cache for this URL, or else by running `detect`
 * on the page text. `detect` returns DEFERRED when it will call the retry it is given once the user activates the page.
 * With `cacheSettings`, the settings that shape the result, the cache entry is `{ settings: <hash>, value }` and is
 * only reused while those settings are unchanged; without them (legacy summarizer keywords) it is the bare value.
 */
const initFeature = async (key, config, detect, cacheSettings) => {
  const useCache = config.cacheInLocalStorage !== false;
  const settingsHash = cacheSettings && cyrb53Hash(JSON.stringify(cacheSettings));
  if (useCache) {
    const entry = _getChromeAiDataFromLocalStorage()?.[key];
    const cached = settingsHash ? (entry?.settings === settingsHash ? entry.value : null) : entry;
    if (isNonEmptyArray(cached)) {
      detected[key] = cached;
      logMessage(`${CONSTANTS.LOG_PRE_FIX} '${key}' found in localStorage.`, cached);
      return true;
    }
  }
  const pageText = getPageText();
  if (!pageText) return false;
  try {
    const value = await detect(pageText, config, () => initFeature(key, config, detect, cacheSettings));
    if (value === DEFERRED || !isNonEmptyArray(value)) {
      if (value !== DEFERRED) logMessage(`${CONSTANTS.LOG_PRE_FIX} No '${key}' detected.`);
      return false;
    }
    detected[key] = value;
    logMessage(`${CONSTANTS.LOG_PRE_FIX} '${key}' detected:`, value);
    if (useCache) _storeChromeAiDataInLocalStorage(getCurrentUrl(), { [key]: settingsHash ? { settings: settingsHash, value } : value });
    return true;
  } catch (error) {
    logError(`${CONSTANTS.LOG_PRE_FIX} Error detecting '${key}':`, error);
    return false;
  }
};

// --- Summarizer (legacy keywords) ---
const summarizeToKeywords = async (text, config, retry) => {
  const api = await selectApi('Summarizer', [{ name: 'Summarizer', options: getSummarizerOptions(config) }], retry);
  if (!api || api === DEFERRED) return api;
  // The summary is a single string, used as a single keyword.
  const summary = await detectSummary(text, config);
  return summary ? [summary] : null;
};

// --- Keywords (Prompt API, Summarizer fallback) ---
const getKeywordsSchema = (maxKeywords) => ({
  type: 'object',
  properties: {
    keywords: { type: 'array', items: { type: 'string' }, maxItems: maxKeywords }
  },
  required: ['keywords'],
  additionalProperties: false
});

export const extractKeywords = async (text, config, retry) => {
  const summarizerConfig = moduleConfig.summarizer;
  const api = await selectApi('Keywords', [
    { name: 'LanguageModel', options: LANGUAGE_MODEL_OPTIONS },
    { name: 'Summarizer', options: getSummarizerOptions(summarizerConfig) }
  ], retry);
  if (!api || api === DEFERRED) return api;
  if (api.name === 'Summarizer') {
    const summary = await detectSummary(text, summarizerConfig);
    return summary ? [summary] : null;
  }
  const maxKeywords = config.maxKeywords;
  const response = await promptForJson(
    (config.prompt ?? `List up to ${maxKeywords} short keywords that describe the topic of this web page text.`) +
      `\n\nPage text:\n${text}`,
    getKeywordsSchema(maxKeywords)
  );
  const keywords = (response?.keywords || []).filter(isStr).map(kw => kw.trim()).filter(Boolean);
  return [...new Set(keywords)].slice(0, maxKeywords);
};

// --- Categories (Prompt API) ---
const getCategoriesSchema = (taxonomy, maxCategories) => ({
  type: 'object',
  properties: {
    categories: {
      type: 'array',
      maxItems: maxCategories,
      items: {
        type: 'object',
        properties: {
          id: { type: 'string', enum: Object.keys(TIER_1_CATEGORIES[taxonomy]) },
          confidence: { type: 'number', minimum: 0, maximum: 1 }
        },
        required: ['id', 'confidence'],
        additionalProperties: false
      }
    }
  },
  required: ['categories'],
  additionalProperties: false
});

// A publisher `prompt` replaces only the instruction; the category list and page text are always appended.
const getCategoriesPrompt = (text, { taxonomy, maxCategories, prompt }) =>
  (prompt ?? `Classify this web page text into at most ${maxCategories} ${TAXONOMY_NAMES[taxonomy]} categories, ` +
    `each with your confidence between 0 and 1.`) +
  `\n\nCategory IDs (ID: name):\n` +
  Object.entries(TIER_1_CATEGORIES[taxonomy]).map(([id, name]) => `${id}: ${name}`).join('\n') +
  `\n\nPage text:\n${text}`;

/**
 * Keeps the highest-scoring tier 1 IDs of `taxonomy` that reach `minScore`, at most `maxCategories` of them.
 * @param {Array<{id: string, confidence: number}>} classifications
 */
export const selectCategories = (classifications, { taxonomy, minScore, maxCategories }) => {
  const allowed = TIER_1_CATEGORIES[taxonomy] || {};
  const ids = (isArray(classifications) ? classifications : [])
    .filter(c => isStr(c?.id) && Object.hasOwn(allowed, c.id) && typeof c.confidence === 'number' && c.confidence >= minScore)
    .sort((a, b) => b.confidence - a.confidence)
    .map(c => c.id);
  return [...new Set(ids)].slice(0, maxCategories);
};

export const classifyPage = async (text, config, retry) => {
  const api = await selectApi('Categories', [{ name: 'LanguageModel', options: LANGUAGE_MODEL_OPTIONS }], retry);
  if (!api || api === DEFERRED) return api;
  const classifications = (await promptForJson(
    getCategoriesPrompt(text, config),
    getCategoriesSchema(config.taxonomy, config.maxCategories)
  ))?.categories;
  return selectCategories(classifications, config);
};

// --- Publisher questions (Decisions API, Prompt API fallback) ---
/**
 * @param {ChromeAiDecisionQuestion} question
 * @returns {string[]}
 */
const getAnswerLabels = (question) => {
  if (question.type === 'boolean') return ['true', 'false'];
  if (isArray(question.options)) return question.options.map(option => String(option.label));
  return ['1', '2', '3', '4', '5']; // Decisions API default for score questions
};

export const getValidQuestions = (questions) => (isArray(questions) ? questions : []).filter(question => {
  const valid = isPlainObject(question) && isStr(question.id) && question.id !== '' && isStr(question.prompt) &&
    CONSTANTS.DECISION_TYPES.includes(question.type) &&
    (question.type !== 'choice' || isNonEmptyArray(question.options)) &&
    (question.options == null || (isArray(question.options) && question.options.every(option => isStr(option?.label))));
  if (!valid) logError(`${CONSTANTS.LOG_PRE_FIX} Ignoring invalid decisions question:`, question);
  return valid;
});

/**
 * JSON schema for the Prompt API fallback: one property per question, restricted to that question's answers.
 */
export const getDecisionsSchema = (questions) => ({
  type: 'object',
  properties: Object.fromEntries(questions.map(question => [question.id, { type: 'string', enum: getAnswerLabels(question) }])),
  required: questions.map(question => question.id),
  additionalProperties: false
});

const getDecisionsPrompt = (text, questions) =>
  `Answer each question about this web page text. For each question ID, answer with exactly one of its listed answers.\n\n` +
  questions.map(question => {
    const answers = question.options?.some(option => option.description)
      ? question.options.map(option => `"${option.label}"${option.description ? ` (${option.description})` : ''}`)
      : getAnswerLabels(question).map(label => `"${label}"`);
    return `${question.id}: ${question.prompt} Answers: ${answers.join(', ')}`;
  }).join('\n') +
  `\n\nPage text:\n${text}`;

export const answerQuestions = async (text, config, retry) => {
  const questions = getValidQuestions(config.questions);
  if (!questions.length) return null;
  const schema = { questions };
  const candidates = [{ name: 'DecisionModel', options: schema }];
  if (config.promptFallback !== false) {
    candidates.push({ name: 'LanguageModel', options: LANGUAGE_MODEL_OPTIONS });
  }
  const api = await selectApi('Decisions', candidates, retry);
  if (!api || api === DEFERRED) return api;
  let answers;
  if (api.name === 'DecisionModel') {
    const model = await createApiInstance('DecisionModel', schema);
    try {
      const result = await model.decide(text);
      answers = Object.fromEntries(questions
        .filter(question => result?.[question.id]?.label != null &&
          (typeof result[question.id].confidence !== 'number' || result[question.id].confidence >= config.minConfidence))
        .map(question => [question.id, String(result[question.id].label)]));
    } finally {
      model.destroy?.();
    }
  } else {
    // The Prompt API gives no calibrated confidence, so minConfidence doesn't apply here.
    answers = await promptForJson(getDecisionsPrompt(text, questions), getDecisionsSchema(questions));
  }
  const segment = questions
    .filter(question => getAnswerLabels(question).includes(answers?.[question.id]))
    .map(question => ({ id: question.id, value: answers[question.id] }));
  return segment;
};

const init = async (config) => {
  moduleConfig = mergeModuleConfig(config);
  detected = {};
  ['keywords', 'categories'].forEach(feature => {
    const prompt = moduleConfig[feature]?.prompt;
    if (prompt !== undefined && !(isStr(prompt) && prompt.trim() !== '')) {
      logWarn(`${CONSTANTS.LOG_PRE_FIX} ${feature}.prompt must be a non-empty string; using the default prompt.`);
      delete moduleConfig[feature].prompt;
    }
  });
  logMessage(`${CONSTANTS.LOG_PRE_FIX} Initializing with config:`, moduleConfig);

  const activeInitializations = [];

  if (moduleConfig.languageDetector?.enabled !== false) {
    logMessage(`${CONSTANTS.LOG_PRE_FIX} Language detection enabled. Initializing...`);
    activeInitializations.push(initLanguageDetector());
  } else {
    logMessage(`${CONSTANTS.LOG_PRE_FIX} Language detection disabled by config.`);
  }

  if (moduleConfig.keywords?.enabled === true) {
    logMessage(`${CONSTANTS.LOG_PRE_FIX} Keywords enabled. Initializing...`);
    activeInitializations.push(initFeature('extractedKeywords', moduleConfig.keywords, extractKeywords,
      [moduleConfig.keywords.maxKeywords, moduleConfig.keywords.prompt ?? null]));
    if (moduleConfig.summarizer?.enabled === true) {
      logMessage(`${CONSTANTS.LOG_PRE_FIX} keywords is enabled, so the Summarizer only runs as its fallback.`);
    }
  } else if (moduleConfig.summarizer?.enabled === true) {
    logMessage(`${CONSTANTS.LOG_PRE_FIX} Summarizer enabled. Initializing...`);
    activeInitializations.push(initFeature('keywords', moduleConfig.summarizer, summarizeToKeywords));
  } else {
    logMessage(`${CONSTANTS.LOG_PRE_FIX} Summarizer disabled by config.`);
  }

  if (moduleConfig.categories?.enabled === true && !TIER_1_CATEGORIES[moduleConfig.categories.taxonomy]) {
    logWarn(`${CONSTANTS.LOG_PRE_FIX} Unsupported categories.taxonomy ${moduleConfig.categories.taxonomy}; use 1 or 6. Categories disabled.`);
    moduleConfig.categories.enabled = false;
  }
  if (moduleConfig.categories?.enabled === true) {
    const { taxonomy, minScore, maxCategories, prompt } = moduleConfig.categories;
    logMessage(`${CONSTANTS.LOG_PRE_FIX} Categories enabled (taxonomy ${taxonomy}). Initializing...`);
    activeInitializations.push(initFeature('categories', moduleConfig.categories, classifyPage,
      [taxonomy, minScore, maxCategories, prompt ?? null]));
  }

  if (moduleConfig.decisions?.enabled === true) {
    logMessage(`${CONSTANTS.LOG_PRE_FIX} Decisions enabled. Initializing...`);
    activeInitializations.push(initFeature('decisions', moduleConfig.decisions, answerQuestions,
      [getValidQuestions(moduleConfig.decisions.questions), moduleConfig.decisions.minConfidence]));
  }

  if (activeInitializations.length === 0) {
    logMessage(`${CONSTANTS.LOG_PRE_FIX} No features enabled for initialization.`);
    return true;
  }

  try {
    const results = await Promise.all(activeInitializations);
    const overallSuccess = results.some(result => result === true);
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

const hasValue = (value) => value != null && value !== '' && !(isArray(value) && value.length === 0);

const enrichKeywords = (global, path, keywords, format) => {
  const existing = deepAccess(global, path);
  if (hasValue(existing)) {
    logMessage(`${CONSTANTS.LOG_PRE_FIX} Keywords already present in auction_ortb2 at path '${path}', no enrichment from module.`, existing);
  } else if (isNonEmptyArray(keywords)) {
    logMessage(`${CONSTANTS.LOG_PRE_FIX} Enriching ORTB2 path '${path}' with keywords from module (localStorage/detection):`, keywords);
    deepSetValue(global, path, format(keywords));
  } else {
    logMessage(`${CONSTANTS.LOG_PRE_FIX} No keywords from auction_ortb2, localStorage, or fresh detection for path '${path}'.`);
  }
};

/**
 * The taxonomy of the publisher's site categories. OpenRTB 2.6 defaults an omitted `cattax` to 1, which only
 * matters when `cat` or `sectioncat` is present.
 */
const getPublisherCattax = (site) => site.cattax ?? (hasValue(site.cat) || hasValue(site.sectioncat) ? 1 : null);

const hasChromeAiData = (global, segtax) => (global.site?.content?.data || [])
  .some(entry => entry?.name === CONSTANTS.SUBMODULE_NAME && entry.ext?.segtax === segtax);

const enrichCategories = (global) => {
  const categories = detected.categories;
  const taxonomy = moduleConfig.categories.taxonomy;
  if (!isNonEmptyArray(categories)) return;
  // gptPreAuction sends segtax 6 entries of site.content.data to GAM as IAB_CONTENT_2_2 Publisher Provided Signals.
  // GAM has no 1.0 equivalent.
  if (taxonomy === CONSTANTS.CATTAX_IAB_CONTENT_2_2 && moduleConfig.categories.gamPps !== false) {
    if (hasChromeAiData(global, taxonomy)) {
      logMessage(`${CONSTANTS.LOG_PRE_FIX} site.content.data already has a segtax ${taxonomy} '${CONSTANTS.SUBMODULE_NAME}' entry.`);
    } else {
      mergeDeep(global, { site: { content: { data: [{ name: CONSTANTS.SUBMODULE_NAME, ext: { segtax: taxonomy }, segment: categories.map(id => ({ id })) }] } } });
    }
  }
  const site = global.site || {};
  if (hasValue(site.pagecat)) {
    logMessage(`${CONSTANTS.LOG_PRE_FIX} site.pagecat already in auction ORTB2, no category enrichment.`);
  } else if (getPublisherCattax(site) != null && getPublisherCattax(site) !== taxonomy) {
    // site.cattax also describes site.cat and site.sectioncat, so it can't be switched to another taxonomy.
    logMessage(`${CONSTANTS.LOG_PRE_FIX} Publisher site categories are in taxonomy ${getPublisherCattax(site)}, not ${taxonomy}, no category enrichment.`);
  } else {
    logMessage(`${CONSTANTS.LOG_PRE_FIX} Enriching site.pagecat with categories:`, categories);
    deepSetValue(global, 'site.pagecat', categories);
    if (site.cattax == null) deepSetValue(global, 'site.cattax', taxonomy);
  }
};

const enrichDecisions = (global) => {
  const segment = detected.decisions;
  if (!isNonEmptyArray(segment)) return;
  if (hasChromeAiData(global, undefined)) {
    logMessage(`${CONSTANTS.LOG_PRE_FIX} site.content.data already has a '${CONSTANTS.SUBMODULE_NAME}' entry, no decisions enrichment.`);
    return;
  }
  logMessage(`${CONSTANTS.LOG_PRE_FIX} Enriching site.content.data with decisions:`, segment);
  mergeDeep(global, { site: { content: { data: [{ name: CONSTANTS.SUBMODULE_NAME, segment }] } } });
};

/**
 * Add detected data to the bid request
 * @param {Object} reqBidsConfigObj - Request bids configuration object
 * @param {function} callback - Callback function
 */
const getBidRequestData = (reqBidsConfigObj, callback) => {
  logMessage(`${CONSTANTS.LOG_PRE_FIX} reqBidsConfigObj:`, reqBidsConfigObj);

  reqBidsConfigObj.ortb2Fragments = reqBidsConfigObj.ortb2Fragments || {};
  reqBidsConfigObj.ortb2Fragments.global = reqBidsConfigObj.ortb2Fragments.global || {};
  const global = reqBidsConfigObj.ortb2Fragments.global;

  if (moduleConfig.languageDetector?.enabled !== false) {
    const languageData = getPrioritizedLanguageData(reqBidsConfigObj);
    if (languageData && languageData.source !== 'auction_ortb2') {
      const langPath = moduleConfig.languageDetector.ortb2Path;
      logMessage(`${CONSTANTS.LOG_PRE_FIX} Enriching ORTB2 path '${langPath}' with lang '${languageData.language}' from ${languageData.source}.`);
      deepSetValue(global, langPath, languageData.language);
    } else if (languageData?.source === 'auction_ortb2') {
      const langPath = moduleConfig.languageDetector.ortb2Path;
      logMessage(`${CONSTANTS.LOG_PRE_FIX} Lang already in auction ORTB2 at path '${langPath}', no enrichment needed.`);
    }
  } else {
    logMessage(`${CONSTANTS.LOG_PRE_FIX} Language detection disabled, no lang enrichment.`);
  }

  if (moduleConfig.keywords?.enabled === true) {
    const path = moduleConfig.keywords.ortb2Path;
    // OpenRTB `keywords` is a comma-separated string; `kwarray` is the array form.
    enrichKeywords(global, path, detected.extractedKeywords, keywords => (/(^|\.)kwarray$/.test(path) ? keywords : keywords.join(',')));
  } else if (moduleConfig.summarizer?.enabled === true) {
    enrichKeywords(global, moduleConfig.summarizer.ortb2Path, detected.keywords, keywords => keywords);
  } else {
    logMessage(`${CONSTANTS.LOG_PRE_FIX} Summarizer disabled, no keyword enrichment.`);
  }

  if (moduleConfig.categories?.enabled === true) enrichCategories(global);
  if (moduleConfig.decisions?.enabled === true) enrichDecisions(global);

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
