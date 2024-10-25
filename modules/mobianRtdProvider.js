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

export const MOBIAN_URL = 'https://prebid.outcomes.net/api/prebid/v1/assessment/async';

/** @type {RtdSubmodule} */
export const mobianBrandSafetySubmodule = {
  name: 'mobianBrandSafety',
  init: init,
  getBidRequestData: getBidRequestData
};

function init() {
  return true;
}

function getBidRequestData(bidReqConfig, callback, config) {
  const { site: ortb2Site } = bidReqConfig.ortb2Fragments.global;
  const pageUrl = encodeURIComponent(getPageUrl());
  const requestUrl = `${MOBIAN_URL}?url=${pageUrl}`;

  const ajax = ajaxBuilder();

  return new Promise((resolve) => {
    ajax(requestUrl, {
      success: function(responseData) {
        let response = safeJSONParse(responseData);
        if (!response || !response.meta.has_results) {
          resolve({});
          callback();
          return;
        }

        const results = response.results;
        const mobianRisk = results.mobianRisk || 'unknown';
        const contentCategories = results.mobianContentCategories || [];
        const sentiment = results.mobianSentiment || 'unknown';
        const emotions = results.mobianEmotions || [];
        const themes = results.mobianThemes || [];
        const tones = results.mobianTones || [];
        const genres = results.mobianGenres || [];
        const apValues = results.ap || {};

        const risk = {
          risk: mobianRisk,
          contentCategories: contentCategories,
          sentiment: sentiment,
          emotions: emotions,
          themes: themes,
          tones: tones,
          genres: genres,
          apValues: apValues,
        };

        deepSetValue(ortb2Site, 'ext.data.mobianRisk', mobianRisk);
        deepSetValue(ortb2Site, 'ext.data.mobianContentCategories', contentCategories);
        deepSetValue(ortb2Site, 'ext.data.mobianSentiment', sentiment);
        deepSetValue(ortb2Site, 'ext.data.mobianEmotions', emotions);
        deepSetValue(ortb2Site, 'ext.data.mobianThemes', themes);
        deepSetValue(ortb2Site, 'ext.data.mobianTones', tones);
        deepSetValue(ortb2Site, 'ext.data.mobianGenres', genres);
        deepSetValue(ortb2Site, 'ext.data.apValues', apValues);

        setKeyValue('mobianRisk', mobianRisk);
        setKeyValue('mobianContentCategories', contentCategories);
        setKeyValue('mobianSentiment', sentiment);
        setKeyValue('mobianEmotions', emotions);
        setKeyValue('mobianThemes', themes);
        setKeyValue('mobianTones', tones);
        setKeyValue('mobianGenres', genres);
        setKeyValue('ap_a0', apValues.a0 || []);
        setKeyValue('ap_a1', apValues.a1 || []);
        setKeyValue('ap_p0', apValues.p0 || []);
        setKeyValue('ap_p1', apValues.p1 || []);

        resolve(risk);
        callback();
      },
      error: function () {
        resolve({});
        callback();
      }
    });
  });
}

function getPageUrl() {
  return window.location.href;
}

submodule('realTimeData', mobianBrandSafetySubmodule);
