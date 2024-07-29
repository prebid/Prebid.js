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

export const MOBIAN_URL = 'https://impact-api-prod.themobian.com/brand_safety';

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
  const requestUrl = `${MOBIAN_URL}/by_url?url=${pageUrl}`;

  const ajax = ajaxBuilder();

  return new Promise((resolve) => {
    ajax(requestUrl, {
      success: function(responseData) {
        let response = safeJSONParse(responseData);
        if (!response) {
          resolve({});
          callback();
          return;
        }

        let mobianRisk = response.garm_risk || 'unknown';

        const categories = Object.keys(response)
          .filter(key => key.startsWith('garm_content_category_') && response[key])
          .map(key => key.replace('garm_content_category_', ''));

        const sentiment = Object.keys(response)
          .find(key => key.startsWith('sentiment_') && response[key])
          ?.replace('sentiment_', '') || 'unknown';

        const emotions = Object.keys(response)
          .filter(key => key.startsWith('emotion_') && response[key])
          .map(key => key.replace('emotion_', ''));

        const risk = {
          'risk': mobianRisk,
          'contentCategories': categories,
          'sentiment': sentiment,
          'emotions': emotions
        };

        resolve(risk);
        deepSetValue(ortb2Site.ext, 'data.mobian', risk);
        callback()
      },
      error: function () {
        resolve({});
        callback()
      }
    });
  });
}

function getPageUrl() {
  return window.location.href;
}

submodule('realTimeData', mobianBrandSafetySubmodule);
