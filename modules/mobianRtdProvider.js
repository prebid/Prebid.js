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
 * @property {boolean|string[]} [publisherTargeting] - Optional targeting keys to enable for publishers (default: false)
 * @property {boolean|string[]} [advertiserTargeting] - Optional targeting keys to enable for advertisers (default: false)
 * @property {boolean} [includeTrafficQuality] - Include traffic quality when targeting is enabled with boolean true (default: false)
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
export const MOBIAN_QUALITY_URL = 'https://quality.outcomes.net/api/prebid/v1/ivt';
const MOBIAN_TCF_ID = 1348;
export const AP_VALUES = 'apValues';
export const CATEGORIES = 'categories';
export const EMOTIONS = 'emotions';
export const GENRES = 'genres';
export const RISK = 'risk';
export const SENTIMENT = 'sentiment';
export const TQ = 'tq';
export const TG = 'tg';
export const THEMES = 'themes';
export const TONES = 'tones';
export const dep = {
  ajaxBuilder
};

export const CONTEXT_KEYS = [
  AP_VALUES,
  CATEGORIES,
  EMOTIONS,
  GENRES,
  RISK,
  SENTIMENT,
  TG,
  THEMES,
  TONES
];

export const TRAFFIC_QUALITY_KEYS = [TQ];
const ALL_TARGETING_KEYS = [...CONTEXT_KEYS, ...TRAFFIC_QUALITY_KEYS];
const AP_KEYS = ['a0', 'a1', 'p0', 'p1'];

export const MAX_CACHE_SIZE = 10;

// eslint-disable-next-line no-restricted-syntax
const logMessage = (...args) => {
  _logMessage('Mobian', ...args);
};

export function makeMemoizedFetch(maxSize = MAX_CACHE_SIZE) {
  const sanitizedMaxSize = (Number.isFinite(maxSize) && maxSize >= 1) ? Math.floor(maxSize) : MAX_CACHE_SIZE;
  const cache = new Map();
  return function () {
    const pageUrl = window.location.href;
    if (cache.has(pageUrl)) {
      return cache.get(pageUrl);
    }
    if (cache.size >= sanitizedMaxSize) {
      cache.delete(cache.keys().next().value);
    }
    const pending = fetchContextData()
      .then((response) => makeDataFromResponse(response))
      .catch((error) => {
        logMessage('error', error);
        cache.delete(pageUrl);
        return {};
      });
    cache.set(pageUrl, pending);
    return pending;
  };
}

export const getContextData = makeMemoizedFetch();

export function makeMemoizedTrafficQualityFetch() {
  let pending;
  return function () {
    if (pending) {
      return pending;
    }
    pending = fetchTrafficQualityData()
      .then((response) => makeTrafficQualityDataFromResponse(response))
      .catch((error) => {
        logMessage('error', error);
        pending = undefined;
        return {};
      });
    return pending;
  };
}

export const getTrafficQualityData = makeMemoizedTrafficQualityFetch();

dep.getContextData = getContextData;
dep.getTrafficQualityData = getTrafficQualityData;

const entriesToObjectReducer = (acc, [key, value]) => ({ ...acc, [key]: value });

export function makeContextDataToKeyValuesReducer(config) {
  const { prefix } = config;
  return function contextDataToKeyValuesReducer(keyValues, [key, value]) {
    if (key === AP_VALUES) {
      AP_KEYS.forEach((apKey) => {
        if (!value?.[apKey]?.length) return;
        keyValues.push([`${prefix}_ap_${apKey}`, value[apKey].map((v) => String(v))]);
      });
    } else if ((key === TQ || key === TG) && value != null) {
      keyValues.push([`${prefix}_${key}`, value]);
    } else if (value?.length) {
      keyValues.push([`${prefix}_${key}`, value]);
    }
    return keyValues;
  };
}

export async function fetchContextData() {
  const pageUrl = encodeURIComponent(window.location.href);
  const requestUrl = `${MOBIAN_URL}?url=${pageUrl}`;
  const request = dep.ajaxBuilder();

  return new Promise((resolve, reject) => {
    request(requestUrl, { success: resolve, error: reject });
  });
}

export async function fetchTrafficQualityData() {
  const pageUrl = encodeURIComponent(window.location.href);
  const requestUrl = `${MOBIAN_QUALITY_URL}?url=${pageUrl}`;
  const request = dep.ajaxBuilder();

  return new Promise((resolve, reject) => {
    request(requestUrl, { success: resolve, error: reject });
  });
}

export function getConfig(config) {
  const includeTrafficQuality = config?.params?.includeTrafficQuality === true;
  const [advertiserTargeting, publisherTargeting] = ['advertiserTargeting', 'publisherTargeting'].map((key) => {
    const value = config?.params?.[key];
    if (!value) {
      return [];
    } else if (value === true) {
      return [...(includeTrafficQuality ? ALL_TARGETING_KEYS : CONTEXT_KEYS)];
    } else if (Array.isArray(value) && value.length) {
      return value.filter((key) => ALL_TARGETING_KEYS.includes(key));
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
    .reduce(makeContextDataToKeyValuesReducer(config), []);

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
    [TG]: results.mobian_tg,
    [THEMES]: results.mobianThemes,
    [TONES]: results.mobianTones,
  };
}

/**
 * @param {Object|string} trafficQualityData
 * @returns {Partial<MobianContextData>}
 */
export function makeTrafficQualityDataFromResponse(trafficQualityData) {
  const data = typeof trafficQualityData === 'string' ? safeJSONParse(trafficQualityData) : trafficQualityData;
  // access `results` without optional chaining so an unparseable response throws and is retried
  const trafficQuality = data.results?.mobian_tq;
  return trafficQuality == null ? {} : { [TQ]: trafficQuality };
}

/**
 * @param {string[]} targetingKeys
 * @returns {Promise<Partial<MobianContextData>>}
 */
export async function getTargetingData(targetingKeys) {
  const requests = [];
  if (targetingKeys.some((key) => CONTEXT_KEYS.includes(key))) {
    requests.push(dep.getContextData());
  }
  if (targetingKeys.some((key) => TRAFFIC_QUALITY_KEYS.includes(key))) {
    requests.push(dep.getTrafficQualityData());
  }

  const results = await Promise.all(requests.map((request) => request.catch((error) => {
    logMessage('error', error);
    return {};
  })));
  return Object.assign({}, ...results);
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
    getTargetingData(config.publisherTargeting)
      .then((contextData) => setTargeting(config, contextData));
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

  getTargetingData(advertiserTargeting)
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
  getBidRequestData: getBidRequestData,
  gvlid: MOBIAN_TCF_ID
};

submodule('realTimeData', mobianBrandSafetySubmodule);
