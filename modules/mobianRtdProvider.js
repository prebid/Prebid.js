/**
 * This module adds the Mobian RTD provider to the real time data module
 * The {@link module:modules/realTimeData} module is required
 */
import { submodule } from '../src/hook.js';
import { ajaxBuilder } from '../src/ajax.js';
import { deepSetValue } from '../src/utils.js';

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
      success: function(response) {
        const risks = ['garm_high_risk', 'garm_medium_risk', 'garm_low_risk', 'garm_no_risk'];
        const riskLevels = ['high_risk', 'medium_risk', 'low_risk', 'no_risk'];

        let mobianGarmRisk = 'unknown';
        for (let i = 0; i < risks.length; i++) {
          if (response[risks[i]]) {
            mobianGarmRisk = riskLevels[i];
            break;
          }
        }

        // Get GARM content categories
        const garmCategories = Object.keys(response)
          .filter(key => key.startsWith('garm_content_category_') && response[key])
          .map(key => key.replace('garm_content_category_', ''));

        // Get sentiment
        const sentiment = Object.keys(response)
          .find(key => key.startsWith('sentiment_') && response[key])
          ?.replace('sentiment_', '') || 'unknown';

        // Get emotions
        const emotions = Object.keys(response)
          .filter(key => key.startsWith('emotion_') && response[key])
          .map(key => key.replace('emotion_', ''));

        const risk = {
          'mobianGarmRisk': mobianGarmRisk,
          'garmContentCategories': garmCategories,
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
