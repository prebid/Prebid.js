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

export const CONTEXT_KEYS = [
  'apValues',
  'categories',
  'emotions',
  'genres',
  'risk',
  'sentiment',
  'themes',
  'tones'
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
 * @param {MobianConfigParams} parsedConfig
 * @param {MobianContextData} contextData
 * @returns {function}
 */
export function setTargeting(parsedConfig, contextData) {
  const { publisherTargeting, prefix } = parsedConfig;
  logMessage('context', contextData);

  CONTEXT_KEYS.forEach((key) => {
    if (!publisherTargeting.includes(key)) return;

    if (key === 'apValues') {
      AP_KEYS.forEach((apKey) => {
        if (!contextData[key]?.[apKey]?.length) return;
        logMessage(`${prefix}_ap_${apKey}`, contextData[key][apKey]);
        setKeyValue(`${prefix}_ap_${apKey}`, contextData[key][apKey]);
      });
      return;
    }

    if (contextData[key]?.length) {
      logMessage(`${prefix}_${key}`, contextData[key]);
      setKeyValue(`${prefix}_${key}`, contextData[key]);
    }
  });
}

export function makeDataFromResponse(contextData) {
  const data = typeof contextData === 'string' ? safeJSONParse(contextData) : contextData;
  const results = data.results;
  if (!results) {
    return {};
  }
  return {
    apValues: results.ap || {},
    categories: results.mobianContentCategories,
    emotions: results.mobianEmotions,
    genres: results.mobianGenres,
    risk: results.mobianRisk || 'unknown',
    sentiment: results.mobianSentiment || 'unknown',
    themes: results.mobianThemes,
    tones: results.mobianTones,
  };
}

export function extendBidRequestConfig(bidReqConfig, contextData) {
  logMessage('extendBidRequestConfig', bidReqConfig, contextData);
  const { site: ortb2Site } = bidReqConfig.ortb2Fragments.global;

  ortb2Site.ext = ortb2Site.ext || {};
  ortb2Site.ext.data = {
    ...(ortb2Site.ext.data || {}),
    ...contextData
  };

  return bidReqConfig;
}

/**
 * @param {MobianConfig} config
 * @returns {boolean}
 */
function init(config) {
  logMessage('init', config);

  const parsedConfig = getConfig(config);

  if (parsedConfig.publisherTargeting.length) {
    getContextData().then((contextData) => setTargeting(parsedConfig, contextData));
  }

  return true;
}

function getBidRequestData(bidReqConfig, callback, config) {
  logMessage('getBidRequestData', bidReqConfig);

  const { advertiserTargeting } = getConfig(config);

  if (!advertiserTargeting.length) {
    callback();
    return;
  }

  getContextData()
    .then((contextData) => {
      extendBidRequestConfig(bidReqConfig, contextData);
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
