/**
 * This module adds the Mobian RTD provider to the real time data module
 * The {@link module:modules/realTimeData} module is required
 */
import { submodule } from '../src/hook.js';
import { ajaxBuilder } from '../src/ajax.js';
import { deepSetValue, safeJSONParse } from '../src/utils.js';

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

        const risk = {
          risk: mobianRisk,
          contentCategories: contentCategories,
          sentiment: sentiment,
          emotions: emotions
        };

        deepSetValue(ortb2Site.ext, 'data.mobianRisk', mobianRisk);
        deepSetValue(ortb2Site.ext, 'data.mobianContentCategories', contentCategories);
        deepSetValue(ortb2Site.ext, 'data.mobianSentiment', sentiment);
        deepSetValue(ortb2Site.ext, 'data.mobianEmotions', emotions);

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
