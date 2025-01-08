/**
 * This module adds the Mobian RTD provider to the real time data module
 * The {@link module:modules/realTimeData} module is required
 */
import { submodule } from '../src/hook.js';
import { ajaxBuilder } from '../src/ajax.js';
import { safeJSONParse, logMessage as _logMessage } from '../src/utils.js';
import { setKeyValue } from '../libraries/gptUtils/gptUtils.js';

/**
 * @typedef {import('../modules/rtdModule/index.js').RtdSubmodule} RtdSubmodule
 */

/**
 * @typedef {Object} MobianConfig
 * @property {MobianConfigParams} params
 */

/**
 * @typedef {Object} MobianConfigParams
 * @property {string} [prefix] - Optional prefix for targeting keys (default: 'mobian')
 * @property {boolean} [publisherTargeting] - Optional boolean to enable targeting for publishers (default: false)
 * @property {boolean} [advertiserTargeting] - Optional boolean to enable targeting for advertisers (default: false)
 */

/**
 * @typedef {Object} MobianContextData
 * @property {Object} apValues
 * @property {string[]} categories
 * @property {string[]} emotions
 * @property {string[]} genres
 * @property {string} risk
 * @property {string} sentiment
 * @property {string[]} themes
 * @property {string[]} tones
 */

export const MOBIAN_URL = 'https://prebid.outcomes.net/api/prebid/v1/assessment/async';

export const AP_VALUES = 'apValues';
export const CATEGORIES = 'categories';
export const EMOTIONS = 'emotions';
export const GENRES = 'genres';
export const RISK = 'risk';
export const SENTIMENT = 'sentiment';
export const THEMES = 'themes';
export const TONES = 'tones';

export const CONTEXT_KEYS = [
  AP_VALUES,
  CATEGORIES,
  EMOTIONS,
  GENRES,
  RISK,
  SENTIMENT,
  THEMES,
  TONES
];

const AP_KEYS = ['a0', 'a1', 'p0', 'p1'];

const logMessage = (...args) => {
  _logMessage('Mobian', ...args);
};

function makeMemoizedFetch() {
  let cachedResponse = null;
  return async function () {
    if (cachedResponse) {
      return Promise.resolve(cachedResponse);
    }
    try {
      const response = await fetchContextData();
      cachedResponse = makeDataFromResponse(response);
      return cachedResponse;
    } catch (error) {
      logMessage('error', error);
      return Promise.resolve({});
    }
  }
}

export const getContextData = makeMemoizedFetch();

const entriesToObjectReducer = (acc, [key, value]) => ({ ...acc, [key]: value });

export function makeContextDataToKeyValuesReducer(config) {
  const { prefix } = config;
  return function contextDataToKeyValuesReducer(keyValues, [key, value]) {
    if (key === AP_VALUES) {
      AP_KEYS.forEach((apKey) => {
        if (!value?.[apKey]?.length) return;
        keyValues.push([`${prefix}_ap_${apKey}`, value[apKey].map((v) => String(v))]);
      });
    }
    if (value?.length) {
      keyValues.push([`${prefix}_${key}`, value]);
    }
    return keyValues;
  }
}

export async function fetchContextData() {
  const pageUrl = encodeURIComponent(window.location.href);
  const requestUrl = `${MOBIAN_URL}?url=${pageUrl}`;
  const request = ajaxBuilder();

  return new Promise((resolve, reject) => {
    request(requestUrl, { success: resolve, error: reject });
  });
}

export function getConfig(config) {
  const [advertiserTargeting, publisherTargeting] = ['advertiserTargeting', 'publisherTargeting'].map((key) => {
    const value = config?.params?.[key];
    if (!value) {
      return [];
    } else if (value === true) {
      return CONTEXT_KEYS;
    } else if (Array.isArray(value) && value.length) {
      return value.filter((key) => CONTEXT_KEYS.includes(key));
    }
    return [];
  });

  const prefix = config?.params?.prefix || 'mobian';
  return { advertiserTargeting, prefix, publisherTargeting };
}

/**
 * @param {MobianConfig} config
 * @param {MobianContextData} contextData
 */
export function setTargeting(config, contextData) {
  logMessage('context', contextData);
  const keyValues = Object.entries(contextData)
    .filter(([key]) => config.publisherTargeting.includes(key))
    .reduce(makeContextDataToKeyValuesReducer(config), [])

  keyValues.forEach(([key, value]) => setKeyValue(key, value));
}

/**
 * @param {Object|string} contextData
 * @returns {MobianContextData}
 */
export function makeDataFromResponse(contextData) {
  const data = typeof contextData === 'string' ? safeJSONParse(contextData) : contextData;
  const results = data.results;
  if (!results) {
    return {};
  }
  return {
    [AP_VALUES]: results.ap || {},
    [CATEGORIES]: results.mobianContentCategories,
    [EMOTIONS]: results.mobianEmotions,
    [GENRES]: results.mobianGenres,
    [RISK]: results.mobianRisk || 'unknown',
    [SENTIMENT]: results.mobianSentiment || 'unknown',
    [THEMES]: results.mobianThemes,
    [TONES]: results.mobianTones,
  };
}

/**
 * @param {Object} bidReqConfig
 * @param {MobianContextData} contextData
 * @param {MobianConfig} config
 */
export function extendBidRequestConfig(bidReqConfig, contextData, config) {
  logMessage('extendBidRequestConfig', bidReqConfig, contextData);
  const { site: ortb2Site } = bidReqConfig.ortb2Fragments.global;
  const keyValues = Object.entries(contextData)
    .filter(([key]) => config.advertiserTargeting.includes(key))
    .reduce(makeContextDataToKeyValuesReducer(config), [])
    .reduce(entriesToObjectReducer, {});

  ortb2Site.ext = ortb2Site.ext || {};
  ortb2Site.ext.data = {
    ...(ortb2Site.ext.data || {}),
    ...keyValues
  };

  return bidReqConfig;
}

/**
 * @param {MobianConfig} rawConfig
 * @returns {boolean}
 */
function init(rawConfig) {
  logMessage('init', rawConfig);
  const config = getConfig(rawConfig);
  if (config.publisherTargeting.length) {
    getContextData().then((contextData) => setTargeting(config, contextData));
  }
  return true;
}

function getBidRequestData(bidReqConfig, callback, rawConfig) {
  logMessage('getBidRequestData', bidReqConfig);

  const config = getConfig(rawConfig);
  const { advertiserTargeting } = config;

  if (!advertiserTargeting.length) {
    callback();
    return;
  }

  getContextData()
    .then((contextData) => {
      extendBidRequestConfig(bidReqConfig, contextData, config);
    })
    .catch(() => {})
    .finally(() => callback());
}

/** @type {RtdSubmodule} */
export const mobianBrandSafetySubmodule = {
  name: 'mobianBrandSafety',
  init: init,
  getBidRequestData: getBidRequestData
};

submodule('realTimeData', mobianBrandSafetySubmodule);
