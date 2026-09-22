/**
 * This module adds the Mobian RTD provider to the real time data module
 * The {@link module:modules/realTimeData} module is required
 */
import { submodule } from '../src/hook.js';
import { ajaxBuilder } from '../src/ajax.js';
import { getGlobal } from '../src/prebidGlobal.js';
import { safeJSONParse, logMessage as _logMessage } from '../src/utils.js';
import { setKeyValue } from '../libraries/gptUtils/gptUtils.js';

/**
 * @typedef {import('../modules/rtdModule/index.js').RtdSubmodule} RtdSubmodule
 * @typedef {import('./mobianRtdProvider.d.ts').MobianRtdProviderConfig} MobianRtdProviderConfig
 * @typedef {import('./mobianRtdProvider.d.ts').MobianResolvedConfig} MobianResolvedConfig
 * @typedef {import('./mobianRtdProvider.d.ts').MobianTargetingKey} MobianTargetingKey
 * @typedef {import('./mobianRtdProvider.d.ts').MobianContextData} MobianContextData
 * @typedef {import('./mobianRtdProvider.d.ts').MobianViewabilityData} MobianViewabilityData
 */

export const MOBIAN_URL = 'https://prebid.outcomes.net/api/prebid/v1/assessment/async';
export const MOBIAN_QUALITY_URL = 'https://quality.outcomes.net/api/prebid/v1/ivt';
export const MOBIAN_VIEWABILITY_URL = 'https://quality.outcomes.net/api/prebid/v1/viewability';
const MOBIAN_TCF_ID = 1348;
export const AP_VALUES = 'apValues';
export const CATEGORIES = 'categories';
export const EMOTIONS = 'emotions';
export const GENRES = 'genres';
export const RISK = 'risk';
export const SENTIMENT = 'sentiment';
export const TQ = 'tq';
export const TG = 'tg';
export const VP = 'vp';
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
export const VIEWABILITY_KEYS = [VP];
const ALL_TARGETING_KEYS = [...CONTEXT_KEYS, ...TRAFFIC_QUALITY_KEYS, ...VIEWABILITY_KEYS];
const AP_KEYS = ['a0', 'a1', 'p0', 'p1'];
const VIEWABILITY_FIELDS = ['likely_viewable', 'probability', 'bucket_percent', 'confidence'];
const viewabilityTargetingData = new Map();

export const MAX_CACHE_SIZE = 10;
export const VIEWABILITY_TARGETING_MAX_CACHE_SIZE = 100;

function setViewabilityTargetingData(key, value) {
  if (
    !viewabilityTargetingData.has(key) &&
    viewabilityTargetingData.size >= VIEWABILITY_TARGETING_MAX_CACHE_SIZE
  ) {
    viewabilityTargetingData.delete(viewabilityTargetingData.keys().next().value);
  }
  viewabilityTargetingData.set(key, value);
}

export function getPageUrl() {
  return window.location.href;
}

// eslint-disable-next-line no-restricted-syntax
const logMessage = (...args) => {
  _logMessage('Mobian', ...args);
};

export function makeMemoizedFetch(maxSize = MAX_CACHE_SIZE) {
  const sanitizedMaxSize = (Number.isFinite(maxSize) && maxSize >= 1) ? Math.floor(maxSize) : MAX_CACHE_SIZE;
  const cache = new Map();
  return function () {
    const pageUrl = getPageUrl();
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

export function makeMemoizedViewabilityFetch(maxSize = VIEWABILITY_TARGETING_MAX_CACHE_SIZE) {
  const sanitizedMaxSize = (Number.isFinite(maxSize) && maxSize >= 1) ? Math.floor(maxSize) : VIEWABILITY_TARGETING_MAX_CACHE_SIZE;
  const cache = new Map();
  return function (pageUrl, adUnitCode, viewabilityTargetingPlacementSource) {
    const cacheKey = JSON.stringify([pageUrl, adUnitCode, viewabilityTargetingPlacementSource]);
    if (cache.has(cacheKey)) {
      return cache.get(cacheKey);
    }
    if (cache.size >= sanitizedMaxSize) {
      cache.delete(cache.keys().next().value);
    }
    const pending = fetchViewabilityData(pageUrl, adUnitCode, viewabilityTargetingPlacementSource)
      .then((response) => {
        return makeViewabilityDataFromResponse(response);
      })
      .catch((error) => {
        logMessage('error', error);
        cache.delete(cacheKey);
        return {};
      });
    cache.set(cacheKey, pending);
    return pending;
  };
}

export const getViewabilityData = makeMemoizedViewabilityFetch(VIEWABILITY_TARGETING_MAX_CACHE_SIZE);

dep.getContextData = getContextData;
dep.getTrafficQualityData = getTrafficQualityData;
dep.getViewabilityData = getViewabilityData;

const entriesToObjectReducer = (acc, [key, value]) => ({ ...acc, [key]: value });

/**
 * @param {MobianResolvedConfig} config
 */
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
  const pageUrl = encodeURIComponent(getPageUrl());
  const requestUrl = `${MOBIAN_URL}?url=${pageUrl}`;
  const request = dep.ajaxBuilder();

  return new Promise((resolve, reject) => {
    request(requestUrl, { success: resolve, error: reject });
  });
}

export async function fetchTrafficQualityData() {
  const pageUrl = encodeURIComponent(getPageUrl());
  const requestUrl = `${MOBIAN_QUALITY_URL}?url=${pageUrl}`;
  const request = dep.ajaxBuilder();

  return new Promise((resolve, reject) => {
    request(requestUrl, { success: resolve, error: reject });
  });
}

export async function fetchViewabilityData(pageUrl, adUnitCode, viewabilityTargetingPlacementSource) {
  const encodedPageUrl = encodeURIComponent(pageUrl);
  const requestUrl = `${MOBIAN_VIEWABILITY_URL}?url=${encodedPageUrl}&placement_source=${encodeURIComponent(viewabilityTargetingPlacementSource)}&placement_id=${encodeURIComponent(adUnitCode)}`;
  const request = dep.ajaxBuilder();

  return new Promise((resolve, reject) => {
    request(requestUrl, { success: resolve, error: reject });
  });
}

/**
 * @param {MobianRtdProviderConfig} config
 * @returns {MobianResolvedConfig}
 */
export function getConfig(config) {
  const includeTrafficQuality = config?.params?.includeTrafficQuality === true;
  const includeViewabilityTargeting = config?.params?.includeViewabilityTargeting === true;
  const [advertiserTargeting, publisherTargeting] = ['advertiserTargeting', 'publisherTargeting'].map((key) => {
    const value = config?.params?.[key];
    if (!value) {
      return [];
    } else if (value === true) {
      return [
        ...CONTEXT_KEYS,
        ...(includeTrafficQuality ? TRAFFIC_QUALITY_KEYS : []),
        ...(key === 'advertiserTargeting' && includeViewabilityTargeting ? VIEWABILITY_KEYS : [])
      ];
    } else if (Array.isArray(value) && value.length) {
      return value.filter((key) => ALL_TARGETING_KEYS.includes(key));
    }
    return [];
  });

  const prefix = config?.params?.prefix || 'mobian';
  const viewabilityTargetingPlacementSource = config?.params?.viewabilityTargetingPlacementSource;
  return {
    advertiserTargeting,
    prefix,
    publisherTargeting,
    ...(viewabilityTargetingPlacementSource ? { viewabilityTargetingPlacementSource } : {})
  };
}

/**
 * @param {MobianResolvedConfig} config
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
 * @returns {MobianContextData}
 */
export function makeTrafficQualityDataFromResponse(trafficQualityData) {
  const data = typeof trafficQualityData === 'string' ? safeJSONParse(trafficQualityData) : trafficQualityData;
  // access `results` without optional chaining so an unparseable response throws and is retried
  const trafficQuality = data.results?.mobian_tq;
  return trafficQuality == null ? {} : { [TQ]: trafficQuality };
}

/**
 * @param {Object|string} viewabilityData
 * @returns {MobianViewabilityData}
 */
export function makeViewabilityDataFromResponse(viewabilityData) {
  const data = typeof viewabilityData === 'string' ? safeJSONParse(viewabilityData) : viewabilityData;
  // access `results` without optional chaining so an unparseable response throws and is retried
  const viewability = data.results?.viewability;
  if (viewability?.status !== 'known' || VIEWABILITY_FIELDS.some((field) => viewability[field] == null)) {
    return {};
  }
  return VIEWABILITY_FIELDS.reduce((data, field) => {
    data[field] = String(viewability[field]);
    return data;
  }, {});
}

/**
 * @param {MobianTargetingKey[]} targetingKeys
 * @returns {Promise<MobianContextData>}
 */
export async function getContextAndTrafficQualityData(targetingKeys) {
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
 * @param {MobianResolvedConfig} config
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

function makeViewabilityTargetingKey(pageUrl, adUnitCode, viewabilityTargetingPlacementSource) {
  return JSON.stringify([pageUrl, adUnitCode, viewabilityTargetingPlacementSource]);
}

/**
 * @param {MobianResolvedConfig} config
 * @param {MobianViewabilityData} viewabilityData
 * @returns {Object}
 */
function makeViewabilityTargetingMap(config, viewabilityData) {
  if (!viewabilityData || VIEWABILITY_FIELDS.some((field) => viewabilityData[field] == null)) {
    return {};
  }

  return {
    [`${config.prefix}_vp_likely_viewable`]: viewabilityData.likely_viewable,
    [`${config.prefix}_vp_probability`]: viewabilityData.probability,
    [`${config.prefix}_vp_bucket_percent`]: viewabilityData.bucket_percent,
    [`${config.prefix}_vp_confidence`]: viewabilityData.confidence,
  };
}

/**
 * Return viewability targeting for the requested ad units to RTD core. RTD core
 * merges this map into the auction's adserverTargeting before Prebid applies
 * targeting to the primary ad server.
 *
 * @param {string[]} adUnitCodes
 * @param {MobianRtdProviderConfig} rawConfig
 * @returns {Object}
 */
export function getTargetingData(adUnitCodes, rawConfig) {
  const config = getConfig(rawConfig);
  if (!config.advertiserTargeting.includes(VP) || !config.viewabilityTargetingPlacementSource) {
    return {};
  }

  const pageUrl = getPageUrl();
  return adUnitCodes.reduce((targeting, adUnitCode) => {
    const viewabilityTargetingKey = makeViewabilityTargetingKey(
      pageUrl,
      adUnitCode,
      config.viewabilityTargetingPlacementSource
    );
    const viewabilityData = viewabilityTargetingData.get(viewabilityTargetingKey);
    const keyValues = makeViewabilityTargetingMap(config, viewabilityData);
    if (Object.keys(keyValues).length) {
      targeting[adUnitCode] = keyValues;
    }
    return targeting;
  }, {});
}

/**
 * @param {Object[]} adUnits
 * @param {MobianResolvedConfig} config
 * @returns {Promise<void[]>}
 */
export function storeViewabilityDataForAdUnits(adUnits, config) {
  if (!config.viewabilityTargetingPlacementSource) {
    return Promise.resolve([]);
  }
  const pageUrl = getPageUrl();
  const adUnitCodes = [...new Set(adUnits.map((adUnit) => adUnit.code).filter(Boolean))];
  return Promise.all(adUnitCodes.map((adUnitCode) => dep.getViewabilityData(pageUrl, adUnitCode, config.viewabilityTargetingPlacementSource)
    .catch((error) => {
      logMessage('error', error);
      return {};
    })
    .then((viewabilityData) => {
      setViewabilityTargetingData(
        makeViewabilityTargetingKey(pageUrl, adUnitCode, config.viewabilityTargetingPlacementSource),
        viewabilityData
      );
    })));
}

/**
 * @param {MobianRtdProviderConfig} rawConfig
 * @returns {boolean}
 */
function init(rawConfig) {
  logMessage('init', rawConfig);
  const config = getConfig(rawConfig);
  if (config.publisherTargeting.length) {
    getContextAndTrafficQualityData(config.publisherTargeting)
      .then((contextData) => setTargeting(config, contextData));
  }
  return true;
}

/**
 * @param {Object} bidReqConfig
 * @param {() => void} callback
 * @param {MobianRtdProviderConfig} rawConfig
 */
function getBidRequestData(bidReqConfig, callback, rawConfig) {
  logMessage('getBidRequestData', bidReqConfig);

  const config = getConfig(rawConfig);
  const { advertiserTargeting } = config;
  const shouldRequestViewabilityData = advertiserTargeting.some((key) => VIEWABILITY_KEYS.includes(key)) &&
    Boolean(config.viewabilityTargetingPlacementSource);

  if (!advertiserTargeting.length) {
    callback();
    return;
  }

  const requests = [];

  if (advertiserTargeting.length) {
    requests.push(getContextAndTrafficQualityData(advertiserTargeting)
      .then((contextData) => {
        extendBidRequestConfig(bidReqConfig, contextData, config);
      }));
  }

  // Ad units are only available in `getBidRequestData`, so request and store
  // their viewability data here for the RTD getTargetingData hook.
  if (shouldRequestViewabilityData) {
    const adUnits = bidReqConfig.adUnits || getGlobal().adUnits || [];
    requests.push(storeViewabilityDataForAdUnits(adUnits, config));
  }

  Promise.all(requests)
    .catch(() => {})
    .finally(() => callback());
}

/** @type {RtdSubmodule} */
export const mobianBrandSafetySubmodule = {
  name: 'mobianBrandSafety',
  init: init,
  getBidRequestData: getBidRequestData,
  getTargetingData: getTargetingData,
  gvlid: MOBIAN_TCF_ID
};

submodule('realTimeData', mobianBrandSafetySubmodule);
