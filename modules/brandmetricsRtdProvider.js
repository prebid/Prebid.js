/**
 * This module adds brandmetrics provider to the real time data module
 * The {@link module:modules/realTimeData} module is required
 * The module will set brandmetrics survey targeting to ad units of specific bidders
 * @module modules/brandmetricsRtdProvider
 * @requires module:modules/realTimeData
 */
import { getGlobal } from '../src/prebidGlobal.js'
import { submodule } from '../src/hook.js'
import { deepSetValue, mergeDeep, logError } from '../src/utils.js'
const MODULE_NAME = 'brandmetrics'

function init (config, userConsent) {
  return true
}

/**
* Set targeting for brandmetrics surveys
*/
function setSurveyTargeting (reqBidsConfigObj, callback, customConfig) {
  const config = mergeDeep({
    waitForIt: false,
    params: {
    }
  }, customConfig)

  if (config.waitForIt) {
    const onBrandmetricsReady = () => {
      const brandmetricsApi = window.brandmetrics.api;
      if (brandmetricsApi.surveyLoadCompleted()) {
        setBidTargeting(reqBidsConfigObj, brandmetricsApi);
        callback();
      } else {
        brandmetricsApi.addEventListener({
          event: 'surveyloaded',
          handler: () => {
            setBidTargeting(reqBidsConfigObj, brandmetricsApi);
            callback();
          }
        })
      }
    };

    window._brandmetrics = window._brandmetrics || [];
    window._brandmetrics.push({
      cmd: '_addeventlistener',
      val: {
        event: 'ready',
        handler: onBrandmetricsReady
      }
    });
  } else {
    callback()
  }
}

function setBidTargeting (reqBidsConfigObj, brandmetricsApi) {
  const adUnits = reqBidsConfigObj.adUnits || getGlobal().adUnits

  const targetingConf = brandmetricsApi.getSurveyTargeting('pb')
  if (targetingConf) {
    adUnits.forEach(adUnit => {
      adUnit.bids.forEach(bid => {
        const bidder = bid.bidder
        switch (bidder) {
          case 'ozone':
            deepSetValue(bid, 'params.customData.0.targeting.' + targetingConf.key, targetingConf.val)
            break;
          default:
            break;
        }
      })
    })
  }
}

/** @type {RtdSubmodule} */
export const brandmetricsSubmodule = {
  name: MODULE_NAME,
  getBidRequestData: function (reqBidsConfigObj, callback, customConfig) {
    try {
      setSurveyTargeting(reqBidsConfigObj, callback, customConfig);
    } catch (e) {
      logError(e)
    }
  },
  init: init
}

submodule('realTimeData', brandmetricsSubmodule)
