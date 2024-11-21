/**
 * This module adds the Mobian RTD provider to the real time data module
 * The {@link module:modules/realTimeData} module is required
 */
import { submodule } from '../src/hook.js';
import { ajaxBuilder } from '../src/ajax.js';
import { deepSetValue, safeJSONParse } from '../src/utils.js';
import { setKeyValue } from '../libraries/gptUtils/gptUtils.js';

/**
 * @typedef {import('../modules/rtdModule/index.js').RtdSubmodule} RtdSubmodule
 */

/**
 * @typedef {Object} MobianConfig
 * @property {Object} params
 * @property {string} [params.prefix] - Optional prefix for targeting keys (default: 'mobian')
 * @property {boolean} [params.enableTargeting] - Optional boolean to enable targeting (default: false)
 */

export const MOBIAN_URL = 'https://prebid.outcomes.net/api/prebid/v1/assessment/async';

function makeMemoizedFetch() {
  let cachedResponse = null;
  return async function () {
    if (cachedResponse) {
      return Promise.resolve(cachedResponse);
    }
    const response = await fetchContextData();
    cachedResponse = response;
    return response;
  }
}

async function getContextData() {
  return makeMemoizedFetch();
}

async function fetchContextData() {
  const pageUrl = encodeURIComponent(window.location.href);
  const requestUrl = `${MOBIAN_URL}?url=${pageUrl}`;
  const request = ajaxBuilder();

  return new Promise((resolve, reject) => {
    request(requestUrl, { success: resolve, error: reject });
  });
}

function getConfig(config) {
  return {
    enableTargeting: config?.params?.enableTargeting || false,
    prefix: config?.params?.prefix || 'mobian'
  }
}

function setTargeting(config) {
  return function (contextData) {
    const { enableTargeting, prefix } = getConfig(config);
    const { apValues, categories, emotions, genres, risk, sentiment, themes, tones } = makeDataFromResponse(contextData);

    if (enableTargeting) {
      risk && setKeyValue(`${prefix}_risk`, risk);
      categories && setKeyValue(`${prefix}_categories`, categories);
      emotions && setKeyValue(`${prefix}_emotions`, emotions);
      genres && setKeyValue(`${prefix}_genres`, genres);
      sentiment && setKeyValue(`${prefix}_sentiment`, sentiment);
      themes && setKeyValue(`${prefix}_themes`, themes);
      tones && setKeyValue(`${prefix}_tones`, tones);
      apValues.a0 && setKeyValue(`${prefix}_ap_a0`, apValues.a0);
      apValues.a1 && setKeyValue(`${prefix}_ap_a1`, apValues.a1);
      apValues.p0 && setKeyValue(`${prefix}_ap_p0`, apValues.p0);
      apValues.p1 && setKeyValue(`${prefix}_ap_p1`, apValues.p1);
    }
  };
}

function makeDataFromResponse (response) {
  const results = response?.results;
  if (!results) {
    return {};
  }
  return {
    categories: results.mobianContentCategories,
    emotions: results.mobianEmotions,
    genres: results.mobianGenres,
    risk: results.mobianRisk || 'unknown',
    sentiment: results.mobianSentiment || 'unknown',
    themes: results.mobianThemes,
    tones: results.mobianTones,
    apValues: results.ap || {},
  };
}

function extendBidRequestConfig(bidReqConfig, response) {
  const { site: ortb2Site } = bidReqConfig.ortb2Fragments.global;
  const { categories, emotions, genres, risk, sentiment, themes, tones, apValues } = makeDataFromResponse(response);
  deepSetValue(ortb2Site, 'ext.data.mobianCategories', categories);
  deepSetValue(ortb2Site, 'ext.data.mobianEmotions', emotions);
  deepSetValue(ortb2Site, 'ext.data.mobianGenres', genres);
  deepSetValue(ortb2Site, 'ext.data.mobianRisk', risk);
  deepSetValue(ortb2Site, 'ext.data.mobianSentiment', sentiment);
  deepSetValue(ortb2Site, 'ext.data.mobianThemes', themes);
  deepSetValue(ortb2Site, 'ext.data.mobianTones', tones);
  deepSetValue(ortb2Site, 'ext.data.apValues', apValues);
}

/**
 * @param {MobianConfig} config
 * @returns {boolean}
 */
function init(config) {
  getContextData().then(setTargeting(config));
  return true;
}

function getBidRequestData(bidReqConfig, callback, config) {
  getContextData()
    .then((contextData) => {
      const response = safeJSONParse(contextData);
      if (!response?.meta?.has_results) return;
      extendBidRequestConfig(bidReqConfig, response);
    })
    .catch(() => {})
    .finally(() => callback());
}

function beforeInit() {
  getContextData()
    .finally(() => {
      submodule('realTimeData', mobianBrandSafetySubmodule);
    });
}

beforeInit();

/** @type {RtdSubmodule} */
export const mobianBrandSafetySubmodule = {
  name: 'mobianBrandSafety',
  init: init,
  getBidRequestData: getBidRequestData
};
