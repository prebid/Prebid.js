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
  MAIN_CONTENT_LENGTH: 500,
  MIN_MAIN_CONTENT_LENGTH: 200,
  MAX_FIELD_LENGTH: 200,
  MAX_TAG_LENGTH: 60,
  // Bump when the model input or the result format changes, so older cached results are detected again.
  CACHE_VERSION: 3,
  MAX_DECISION_OPTIONS: 26, // DecisionModel limit per choice question
  DECISION_TYPES: ['boolean', 'choice', 'score'],
  CATTAX_IAB_CONTENT_2_2: 6,
  DEFAULT_CONFIG: {
    languageDetector: {
      enabled: true,
      confidence: 0.8,
      ortb2Path: 'site.content.language' // Default path for language
    },
    keywords: {
      enabled: false,
      maxKeywords: 10,
      ortb2Path: 'site.content.keywords',
      cacheInLocalStorage: true
    },
    categories: {
      enabled: false,
      maxCategories: 1,
      articlesOnly: true,
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
 * Tier 1 of each supported IAB content taxonomy (ID to name), keyed by AdCOM `cattax`. The model picks from these names,
 * which are mapped back to their IDs; the full taxonomies are too large to bundle. Names must stay unique.
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

// Models already on the device first, then one that is already downloading, so no new download starts if avoidable.
const AVAILABILITY_RANK = ['available', 'downloading', 'downloadable'];

/**
 * Checks every API in `candidates` (in order of preference) and picks the one whose model is furthest along:
 * `available`, then `downloading`, then `downloadable`; ties go to the earlier candidate.
 * Model downloads need user activation, so when the chosen API isn't downloaded yet and the user is inactive,
 * `retry` runs on the next user activation and DEFERRED is returned.
 */
export const selectApi = async (feature, candidates, retry) => {
  const availabilities = await Promise.all(candidates.map(c => getApiAvailability(c.name, c.options)));
  let best = -1;
  availabilities.forEach((availability, i) => {
    const rank = AVAILABILITY_RANK.indexOf(availability);
    if (rank !== -1 && (best === -1 || rank < AVAILABILITY_RANK.indexOf(availabilities[best]))) best = i;
  });
  if (best === -1) {
    logMessage(`${CONSTANTS.LOG_PRE_FIX} ${feature}: none of ${candidates.map(c => c.name).join(', ')} is available.`);
    return null;
  }
  if (availabilities[best] !== 'available' && !isUserActive()) {
    deferUntilUserActivation(feature, retry);
    return DEFERRED;
  }
  logMessage(`${CONSTANTS.LOG_PRE_FIX} ${feature}: using ${candidates[best].name} (${availabilities[best]}).`);
  return candidates[best];
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

// --- Page text ---
const normalizeSpace = (text) => (isStr(text) ? text.replace(/\s+/g, ' ').trim() : '');

const getMetaContents = (selector) => Array.from(document.querySelectorAll(selector))
  .map(meta => normalizeSpace(meta.getAttribute('content')))
  .filter(Boolean);

const toArray = (value) => (isArray(value) ? value : value == null ? [] : [value]);

/** JSON-LD nodes of the page: top level objects, array items and `@graph` members. */
export const getJsonLdNodes = () => {
  const nodes = [];
  document.querySelectorAll('script[type="application/ld+json"]').forEach(script => {
    let data;
    try {
      data = JSON.parse(script.textContent);
    } catch (e) {
      return;
    }
    toArray(data).forEach(node => {
      if (!isPlainObject(node)) return;
      nodes.push(node);
      toArray(node['@graph']).forEach(member => isPlainObject(member) && nodes.push(member));
    });
  });
  return nodes;
};

const hasType = (node, types) => toArray(node['@type']).some(type => types.includes(type));

/** schema.org `Article` and its subtypes, such as `ReportageNewsArticle`, `LiveBlogPosting` or `Report`. */
const isArticleType = (type) => isStr(type) && /(Article|BlogPosting|\bReport)$/.test(type);

/** Whether the page has a JSON-LD article node, or exactly one microdata article (listings have several). */
export const isArticlePage = () => getJsonLdNodes().some(node => toArray(node['@type']).some(isArticleType)) ||
  Array.from(document.querySelectorAll('[itemscope][itemtype]'))
    .filter(el => el.getAttribute('itemtype').split(/\s+/).some(isArticleType)).length === 1;

const NON_TEXT_ELEMENTS = 'script, style, noscript, template, svg, iframe, [hidden], [aria-hidden="true"]';
const SKIPPED_ELEMENTS = `${NON_TEXT_ELEMENTS}, nav, aside, header, footer, figure, button, label, select, textarea, ` +
  'dialog, [role=navigation], [role=complementary], [role=dialog], [role=alertdialog], [role=tooltip], [role=menu], ' +
  '[aria-modal="true"]';
const TEXT_BLOCKS = 'p, li, h2, h3, h4, h5, h6, blockquote, pre, dd';

// Unlike innerText, checkVisibility needs up to date styles but no layout.
// checkVisibilityCSS is visibilityProperty's name before Chrome 121.
const isRendered = (element) => element.checkVisibility?.({ visibilityProperty: true, checkVisibilityCSS: true }) ?? true;

/**
 * Up to `maxLength` characters of the text under `root`, leaving out script and style contents, navigation,
 * captions, controls, popups and text that isn't rendered.
 */
export const getVisibleText = (root, maxLength) => {
  if (!root) return '';
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
    acceptNode: (node) => {
      if (node.nodeType === Node.ELEMENT_NODE) {
        return node.matches(SKIPPED_ELEMENTS) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_SKIP;
      }
      return /\S/.test(node.nodeValue) && isRendered(node.parentElement) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
    }
  });
  let text = '';
  while (text.length <= maxLength && walker.nextNode()) {
    text += (text ? ' ' : '') + normalizeSpace(walker.currentNode.nodeValue);
  }
  return text.substring(0, maxLength);
};

const getLinkedLength = (element) => Array.from(element.querySelectorAll('a'))
  .reduce((length, link) => length + normalizeSpace(link.textContent).length, 0);

/** Like `getVisibleText`, but only paragraphs, list items, subheadings and quotes that are mostly not links. */
const getBlockText = (root, maxLength) => {
  let text = '';
  for (const block of root.querySelectorAll(TEXT_BLOCKS)) {
    if (text.length >= maxLength) break;
    const skipped = block.closest(SKIPPED_ELEMENTS);
    if (block.querySelector(TEXT_BLOCKS) || (skipped && skipped !== root && root.contains(skipped))) continue;
    const value = getVisibleText(block, maxLength);
    if (value && getLinkedLength(block) <= normalizeSpace(block.textContent).length / 2) text += (text ? ' ' : '') + value;
  }
  return text.substring(0, maxLength);
};

const decodeHtml = (text) => (isStr(text) && /[&<]/.test(text) ? new DOMParser().parseFromString(text, 'text/html').body.textContent : text);

/**
 * Up to `maxLength` characters of the page's main content: JSON-LD `articleBody` if it has at least
 * MIN_MAIN_CONTENT_LENGTH characters, else the text blocks of the first `article`, `main`, `[role=main]` element or
 * body that has that much, else a shorter `articleBody`, else all text of the first such element.
 */
export const getMainContent = (maxLength, nodes = getJsonLdNodes()) => {
  const minLength = CONSTANTS.MIN_MAIN_CONTENT_LENGTH;
  const body = nodes.map(node => node.articleBody).find(value => normalizeSpace(value));
  const articleBody = body ? normalizeSpace(decodeHtml(body)) : '';
  if (articleBody.length >= minLength) return articleBody.substring(0, maxLength);
  const elements = [
    ...Array.from(document.querySelectorAll('article, main, [role="main"]')).filter(el => !el.parentElement?.closest(SKIPPED_ELEMENTS)),
    document.body
  ].filter(Boolean);
  for (const element of elements) {
    const text = getBlockText(element, maxLength);
    if (text.length >= minLength) return text;
  }
  if (articleBody) return articleBody.substring(0, maxLength);
  return getVisibleText(elements.find(el => getVisibleText(el, minLength).length >= minLength) ?? document.body, maxLength);
};

const normalizeName = (text) => text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();

const getPath = (url) => {
  try {
    return isStr(url) ? new URL(url, window.location.href).pathname : null;
  } catch (e) {
    return null;
  }
};

/**
 * Publisher section and tags: `article:section`, `parsely-section`, JSON-LD `articleSection` and breadcrumbs other
 * than the home page and the page itself, `article:tag`, keywords meta tags and JSON-LD `keywords`. Tag lists separated
 * by commas or semicolons are split, and repeats and the page title are left out.
 */
const getSectionAndTags = (nodes) => {
  const seen = new Set([document.title, ...getMetaContents('meta[property="og:title"]'), ...nodes.map(node => node.headline)]
    .filter(isStr).map(normalizeName));
  const breadcrumbs = nodes.filter(node => hasType(node, ['BreadcrumbList']))
    .flatMap(node => toArray(node.itemListElement))
    .filter(item => !['/', window.location.pathname].includes(getPath(item?.item?.['@id'] ?? item?.item?.url ?? item?.item)))
    .map(item => item?.name ?? item?.item?.name);
  const tags = [
    ...getMetaContents('meta[property="article:tag"], meta[name="keywords"], meta[name="news_keywords"]'),
    ...nodes.flatMap(node => toArray(node.keywords))
  ].flatMap(value => (isStr(value) ? value.split(/[,;]/) : []));
  return [
    ...getMetaContents('meta[property="article:section"], meta[name="parsely-section"]'),
    ...nodes.flatMap(node => toArray(node.articleSection)),
    ...breadcrumbs,
    ...tags
  ].map(normalizeSpace).filter(value => {
    const name = normalizeName(value);
    if (!name || value.length > CONSTANTS.MAX_TAG_LENGTH || seen.has(name)) return false;
    seen.add(name);
    return true;
  }).join(', ');
};

const WORD_SEGMENT = new RegExp('^\\p{L}+(?:[-_+ ]\\p{L}+)*$', 'u');

/** URL path segments made only of words, such as `electric-cars`. */
const getPathWords = () => window.location.pathname.split('/').map(segment => {
  try {
    segment = decodeURIComponent(segment);
  } catch (e) {
    return '';
  }
  segment = segment.replace(/\.[a-z0-9]+$/i, '');
  return WORD_SEGMENT.test(segment) ? segment.replace(/[-_+]/g, ' ') : '';
}).filter(Boolean).join(' / ');

/**
 * Text for the Prompt and Decisions APIs: title, meta description, publisher section and tags, the URL path's words
 * and the start of the main content. Everything is read synchronously from the DOM.
 */
export const getPageText = () => {
  const nodes = getJsonLdNodes();
  const field = (value) => normalizeSpace(decodeHtml(value)).substring(0, CONSTANTS.MAX_FIELD_LENGTH);
  const lines = [
    ['Title', field(document.title || getMetaContents('meta[property="og:title"]')[0])],
    ['Description', field([...getMetaContents('meta[name="description"]'), ...getMetaContents('meta[property="og:description"]')][0])],
    ['Section and tags', field(getSectionAndTags(nodes))],
    ['URL path', field(getPathWords())],
    ['Content', getMainContent(CONSTANTS.MAIN_CONTENT_LENGTH, nodes)]
  ].filter(([, value]) => value).map(([label, value]) => `${label}: ${value}`);
  const text = lines.join('\n');
  if (text.length < CONSTANTS.MIN_TEXT_LENGTH) {
    logMessage(`${CONSTANTS.LOG_PRE_FIX} Not enough text content (length: ${text.length}) for processing.`);
    return null;
  }
  return text;
};

/** Up to MAX_TEXT_LENGTH characters of the main content, for language detection. */
export const getLanguageText = () => {
  const text = getMainContent(CONSTANTS.MAX_TEXT_LENGTH);
  if (text.length < CONSTANTS.MIN_TEXT_LENGTH) {
    logMessage(`${CONSTANTS.LOG_PRE_FIX} Not enough text content (length: ${text.length}) for processing.`);
    return null;
  }
  return text;
};

const whenDomReady = () => (document.readyState === 'loading'
  ? new Promise(resolve => document.addEventListener('DOMContentLoaded', resolve, { once: true }))
  : Promise.resolve());

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

const initLanguageDetector = async () => {
  const existingLanguage = getPrioritizedLanguageData(null);
  if (existingLanguage && existingLanguage.source === 'localStorage') {
    logMessage(`${CONSTANTS.LOG_PRE_FIX} Language detection skipped, language '${existingLanguage.language}' found in localStorage.`);
    return true;
  }

  const pageText = getLanguageText();
  if (!pageText) return false;

  const detectionResult = await detectLanguage(pageText);
  if (!detectionResult) {
    logMessage(`${CONSTANTS.LOG_PRE_FIX} Failed to detect language from page content.`);
    return false;
  }
  return storeDetectedLanguage(detectionResult.language, detectionResult.confidence, getCurrentUrl());
};

const isNonEmptyArray = (value) => isArray(value) && value.length > 0;

/**
 * Fills `detected[key]` (a non-empty array) from the localStorage cache for this URL, or else by running `detect`.
 * `detect` returns DEFERRED when it will call the retry it is given once the user activates the page.
 * The cache entry is `{ settings: <hash of cacheSettings>, value }`, reused only while the settings that shape the
 * result are unchanged. Detection waits for DOMContentLoaded, and is skipped when `shouldRun` returns false.
 */
const initFeature = async (key, config, detect, cacheSettings, shouldRun) => {
  const useCache = config.cacheInLocalStorage !== false;
  const settingsHash = cyrb53Hash(JSON.stringify([CONSTANTS.CACHE_VERSION, ...cacheSettings]));
  if (useCache) {
    const entry = _getChromeAiDataFromLocalStorage()?.[key];
    const cached = entry?.settings === settingsHash ? entry.value : null;
    if (isNonEmptyArray(cached)) {
      detected[key] = cached;
      logMessage(`${CONSTANTS.LOG_PRE_FIX} '${key}' found in localStorage.`, cached);
      return true;
    }
  }
  try {
    await whenDomReady();
    if (shouldRun && !shouldRun()) return false;
    const value = await detect(config, () => initFeature(key, config, detect, cacheSettings, shouldRun));
    if (value === DEFERRED || !isNonEmptyArray(value)) {
      if (value !== DEFERRED) logMessage(`${CONSTANTS.LOG_PRE_FIX} No '${key}' detected.`);
      return false;
    }
    detected[key] = value;
    logMessage(`${CONSTANTS.LOG_PRE_FIX} '${key}' detected:`, value);
    if (useCache) _storeChromeAiDataInLocalStorage(getCurrentUrl(), { [key]: { settings: settingsHash, value } });
    return true;
  } catch (error) {
    logError(`${CONSTANTS.LOG_PRE_FIX} Error detecting '${key}':`, error);
    return false;
  }
};

const LANGUAGE_MODEL = Object.freeze({ name: 'LanguageModel', options: LANGUAGE_MODEL_OPTIONS });

// --- Keywords (Prompt API) ---
const getKeywordsSchema = (maxKeywords) => ({
  type: 'object',
  properties: {
    keywords: { type: 'array', items: { type: 'string' }, maxItems: maxKeywords }
  },
  required: ['keywords'],
  additionalProperties: false
});

export const extractKeywords = async (config, retry) => {
  const api = await selectApi('Keywords', [LANGUAGE_MODEL], retry);
  if (!api || api === DEFERRED) return api;
  const text = getPageText();
  if (!text) return null;
  const maxKeywords = config.maxKeywords;
  const response = await promptForJson(
    (config.prompt ?? `List up to ${maxKeywords} short keywords that describe the topic of this web page.`) +
      `\n\nPage:\n${text}`,
    getKeywordsSchema(maxKeywords)
  );
  const keywords = (response?.keywords || []).filter(isStr).map(kw => kw.trim()).filter(Boolean);
  return [...new Set(keywords)].slice(0, maxKeywords);
};

// --- Categories (Decisions API or Prompt API) ---
const getCategoryNames = (taxonomy) => Object.values(TIER_1_CATEGORIES[taxonomy]);

const getCategoriesSchema = (taxonomy, maxCategories) => ({
  type: 'object',
  properties: {
    categories: { type: 'array', maxItems: maxCategories, items: { type: 'string', enum: getCategoryNames(taxonomy) } }
  },
  required: ['categories'],
  additionalProperties: false
});

const getCategoriesInstruction = ({ taxonomy, maxCategories, prompt }) => prompt ?? (maxCategories === 1
  ? `Pick the ${TAXONOMY_NAMES[taxonomy]} category that best describes this web page.`
  : `Pick up to ${maxCategories} ${TAXONOMY_NAMES[taxonomy]} categories that describe this web page, most relevant first.`);

// A publisher `prompt` replaces only the instruction; the category list and page text are always appended.
const getCategoriesPrompt = (text, config) =>
  getCategoriesInstruction(config) +
  `\n\nCategories:\n${getCategoryNames(config.taxonomy).join('\n')}` +
  `\n\nPage:\n${text}`;

/**
 * One choice question over the category names. DecisionModel allows at most 26 options per question, so longer
 * lists are split evenly over as few questions as that allows.
 */
export const getCategoryDecisionSchema = (config) => {
  const names = getCategoryNames(config.taxonomy);
  const count = Math.ceil(names.length / CONSTANTS.MAX_DECISION_OPTIONS);
  const size = Math.ceil(names.length / count);
  return {
    questions: Array.from({ length: count }, (_, i) => ({
      id: `category${i + 1}`,
      type: 'choice',
      prompt: getCategoriesInstruction({ ...config, maxCategories: 1 }),
      options: names.slice(i * size, (i + 1) * size).map(label => ({ label }))
    }))
  };
};

/**
 * Maps tier 1 category names of `taxonomy` to their IDs, in order, dropping unknown names and duplicates, and keeps
 * at most `maxCategories`.
 * @param {string[]} names
 */
export const selectCategories = (names, { taxonomy, maxCategories }) => {
  const idsByName = new Map(Object.entries(TIER_1_CATEGORIES[taxonomy] || {}).map(([id, name]) => [name, id]));
  const ids = (isArray(names) ? names : []).filter(name => idsByName.has(name)).map(name => idsByName.get(name));
  return [...new Set(ids)].slice(0, maxCategories);
};

/**
 * Category names from every category question, most probable first. Each question only sees part of the list, so
 * its winner competes with the other questions' winners on probability.
 */
const rankDecidedCategories = (result, questions) => questions
  .flatMap(question => {
    const decision = result?.[question.id];
    if (isPlainObject(decision?.probabilities) && Object.keys(decision.probabilities).length) {
      return Object.entries(decision.probabilities);
    }
    return decision?.label != null ? [[decision.label, decision.confidence]] : [];
  })
  .map(([label, probability]) => [String(label), typeof probability === 'number' ? probability : 0])
  .sort((a, b) => b[1] - a[1])
  .map(([label]) => label);

export const classifyPage = async (config, retry) => {
  const schema = getCategoryDecisionSchema(config);
  const api = await selectApi('Categories', [{ name: 'DecisionModel', options: schema }, LANGUAGE_MODEL], retry);
  if (!api || api === DEFERRED) return api;
  const text = getPageText();
  if (!text) return null;
  if (api.name === 'DecisionModel') {
    const model = await createApiInstance('DecisionModel', schema);
    try {
      return selectCategories(rankDecidedCategories(await model.decide(text), schema.questions), config);
    } finally {
      model.destroy?.();
    }
  }
  const names = (await promptForJson(
    getCategoriesPrompt(text, config),
    getCategoriesSchema(config.taxonomy, config.maxCategories)
  ))?.categories;
  return selectCategories(names, config);
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
  `Answer each question about this web page. For each question ID, answer with exactly one of its listed answers.\n\n` +
  questions.map(question => {
    const answers = question.options?.some(option => option.description)
      ? question.options.map(option => `"${option.label}"${option.description ? ` (${option.description})` : ''}`)
      : getAnswerLabels(question).map(label => `"${label}"`);
    return `${question.id}: ${question.prompt} Answers: ${answers.join(', ')}`;
  }).join('\n') +
  `\n\nPage:\n${text}`;

export const answerQuestions = async (config, retry) => {
  const questions = getValidQuestions(config.questions);
  if (!questions.length) return null;
  const schema = { questions };
  const candidates = [{ name: 'DecisionModel', options: schema }];
  if (config.promptFallback !== false) {
    candidates.push(LANGUAGE_MODEL);
  }
  const api = await selectApi('Decisions', candidates, retry);
  if (!api || api === DEFERRED) return api;
  const text = getPageText();
  if (!text) return null;
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
  const summarizer = moduleConfig.summarizer;
  if (summarizer) {
    // The Summarizer API is no longer used: its one-sentence summary made a poor keyword, and the Prompt API runs
    // on the same on-device model.
    const keywordsParams = config.params.keywords || {};
    const migrate = summarizer.enabled === true && keywordsParams.enabled === undefined;
    logWarn(`${CONSTANTS.LOG_PRE_FIX} params.summarizer is no longer supported; use params.keywords.` +
      (migrate ? ' Enabling keywords with summarizer.ortb2Path and summarizer.cacheInLocalStorage.' : ''));
    if (migrate) {
      moduleConfig.keywords.enabled = true;
      ['ortb2Path', 'cacheInLocalStorage'].forEach(key => {
        if (summarizer[key] !== undefined && keywordsParams[key] === undefined) moduleConfig.keywords[key] = summarizer[key];
      });
    }
    delete moduleConfig.summarizer;
  }
  if (moduleConfig.categories && moduleConfig.categories.minScore !== undefined) {
    logWarn(`${CONSTANTS.LOG_PRE_FIX} categories.minScore is no longer supported and is ignored; use categories.maxCategories.`);
    delete moduleConfig.categories.minScore;
  }
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
  } else {
    logMessage(`${CONSTANTS.LOG_PRE_FIX} Keywords disabled by config.`);
  }

  if (moduleConfig.categories?.enabled === true && !TIER_1_CATEGORIES[moduleConfig.categories.taxonomy]) {
    logWarn(`${CONSTANTS.LOG_PRE_FIX} Unsupported categories.taxonomy ${moduleConfig.categories.taxonomy}; use 1 or 6. Categories disabled.`);
    moduleConfig.categories.enabled = false;
  }
  if (moduleConfig.categories?.enabled === true) {
    const { taxonomy, maxCategories, articlesOnly, prompt } = moduleConfig.categories;
    logMessage(`${CONSTANTS.LOG_PRE_FIX} Categories enabled (taxonomy ${taxonomy}). Initializing...`);
    const articleCheck = articlesOnly !== false ? () => {
      const isArticle = isArticlePage();
      if (!isArticle) logMessage(`${CONSTANTS.LOG_PRE_FIX} No schema.org Article on the page; skipping categories.`);
      return isArticle;
    } : undefined;
    activeInitializations.push(initFeature('categories', moduleConfig.categories, classifyPage,
      [taxonomy, maxCategories, articlesOnly !== false, prompt ?? null], articleCheck));
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
  } else {
    logMessage(`${CONSTANTS.LOG_PRE_FIX} Keywords disabled, no keyword enrichment.`);
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
