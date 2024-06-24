import { submodule } from '../src/hook.js';
import { ajaxBuilder } from '../src/ajax.js';
export const MOBIAN_URL = 'https://impact-api-prod.themobian.com/brand_safety';

export const mobianBrandSafetySubmodule = {
  name: 'mobianBrandSafety',
  gvlid: null,
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
        const risk = {
          'mobianGarmRisk': mobianGarmRisk
        };
        resolve(risk);
        ortb2Site.ext.data['mobian'] = risk
      },
      error: function () {
        resolve({});
      }
    });
  });
}

function getPageUrl() {
  return window.location.href;
}

submodule('realTimeData', mobianBrandSafetySubmodule);
