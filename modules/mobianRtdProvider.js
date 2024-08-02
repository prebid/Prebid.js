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

        const categoryFlags = {
          adult: categories.includes('adult'),
          arms: categories.includes('arms'),
          crime: categories.includes('crime'),
          death_injury: categories.includes('death_injury'),
          piracy: categories.includes('piracy'),
          hate_speech: categories.includes('hate_speech'),
          obscenity: categories.includes('obscenity'),
          drugs: categories.includes('drugs'),
          spam: categories.includes('spam'),
          terrorism: categories.includes('terrorism'),
          debated_issue: categories.includes('debated_issue')
        };

        const emotionFlags = {
          love: emotions.includes('love'),
          joy: emotions.includes('joy'),
          anger: emotions.includes('anger'),
          surprise: emotions.includes('surprise'),
          sadness: emotions.includes('sadness'),
          fear: emotions.includes('fear')
        };

        deepSetValue(ortb2Site.ext, 'data.mobianRisk', mobianRisk);
        deepSetValue(ortb2Site.ext, 'data.mobianSentiment', sentiment);

        Object.entries(categoryFlags).forEach(([category, value]) => {
          deepSetValue(ortb2Site.ext, `data.mobianCategory${category.charAt(0).toUpperCase() + category.slice(1)}`, value);
        });

        Object.entries(emotionFlags).forEach(([emotion, value]) => {
          deepSetValue(ortb2Site.ext, `data.mobianEmotion${emotion.charAt(0).toUpperCase() + emotion.slice(1)}`, value);
        });

        resolve({
          risk: mobianRisk,
          sentiment: sentiment,
          categoryFlags: categoryFlags,
          emotionFlags: emotionFlags
        });
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
