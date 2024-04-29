/**
 * This module adds Sirdata provider to the real time data module
 * and now supports Seller Defined Audience
 * The {@link module:modules/realTimeData} module is required
 * The module will fetch segments (user-centric) and categories (page-centric) from Sirdata server
 * The module will automatically handle user's privacy and choice in California (IAB TL CCPA Framework) and in Europe (IAB EU TCF FOR GDPR)
 * @module modules/sirdataRtdProvider
 * @requires module:modules/realTimeData
 */
import {deepAccess, deepSetValue, isEmpty, logError, logInfo, mergeDeep} from '../src/utils.js';
import {submodule} from '../src/hook.js';
import {ajax} from '../src/ajax.js';
import {findIndex} from '../src/polyfill.js';
import {getRefererInfo} from '../src/refererDetection.js';
import {config} from '../src/config.js';
import {getGlobal} from '../src/prebidGlobal.js';

/** @type {string} */
const MODULE_NAME = 'realTimeData';
const SUBMODULE_NAME = 'SirdataRTDModule';
const ORTB2_NAME = 'sirdata.com';
const LOG_PREFIX = 'Sirdata RTD: ';

const partnerIds = {
  'criteo': 27443,
  'openx': 30342,
  'pubmatic': 30345,
  'smaato': 27520,
  'triplelift': 27518,
  'yahoossp': 30339,
  'rubicon': 27452,
  'appnexus': 27446,
  'appnexusAst': 27446,
  'brealtime': 27446,
  'emetriq': 27446,
  'emxdigital': 27446,
  'pagescience': 27446,
  'gourmetads': 33394,
  'matomy': 27446,
  'featureforward': 27446,
  'oftmedia': 27446,
  'districtm': 27446,
  'adasta': 27446,
  'beintoo': 27446,
  'gravity': 27446,
  'msq_classic': 27878,
  'msq_max': 27878,
  '366_apx': 27878,
  'mediasquare': 27878,
  'smartadserver': 27440,
  'smart': 27440,
  'proxistore': 27484,
  'ix': 27248,
  'sdRtdForGpt': 27449,
  'smilewanted': 28690,
  'taboola': 33379,
  'ttd': 33382,
  'zeta_global': 33385,
  'teads': 33388,
  'conversant': 33391,
  'improvedigital': 33397,
  'invibes': 33400,
  'sublime': 33403,
  'rtbhouse': 33406,
  'zeta_global_ssp': 33385,
};

export function getSegmentsAndCategories(reqBidsConfigObj, onDone, moduleConfig, userConsent) {
  logInfo(LOG_PREFIX, 'init');
  moduleConfig.params = moduleConfig.params || {};

  let tcString = (userConsent && userConsent.gdpr && userConsent.gdpr.consentString ? userConsent.gdpr.consentString : '');
  let gdprApplies = (userConsent && userConsent.gdpr && userConsent.gdpr.gdprApplies ? userConsent.gdpr.gdprApplies : '');

  moduleConfig.params.partnerId = moduleConfig.params.partnerId ? moduleConfig.params.partnerId : 1;
  moduleConfig.params.key = moduleConfig.params.key ? moduleConfig.params.key : 1;
  moduleConfig.params.actualUrl = moduleConfig.params.actualUrl || null;

  let sirdataDomain;
  let sendWithCredentials;

  if (userConsent.coppa || (userConsent.usp && (userConsent.usp[0] === '1' && (userConsent.usp[1] === 'N' || userConsent.usp[2] === 'Y')))) {
    // if children or "Do not Sell" management in California, no segments, page categories only whatever TCF signal
    sirdataDomain = 'cookieless-data.com';
    sendWithCredentials = false;
    gdprApplies = null;
    tcString = '';
  } else if (config.getConfig('consentManagement.gdpr')) {
    // Default endpoint for Contextual results only is cookieless if gdpr management is set. Needed because the cookie-based endpoint will fail and return error if user is located in Europe and no consent has been given
    sirdataDomain = 'cookieless-data.com';
    sendWithCredentials = false;
  }

  // default global endpoint is cookie-based if no rules falls into cookieless or consent has been given or GDPR doesn't apply

  if (!sirdataDomain || !gdprApplies || (deepAccess(userConsent, 'gdpr.vendorData.vendor.consents') && userConsent.gdpr.vendorData.vendor.consents[53] && userConsent.gdpr.vendorData.purpose.consents[1] && userConsent.gdpr.vendorData.purpose.consents[4])) {
    sirdataDomain = 'sddan.com';
    sendWithCredentials = true;
  }

  let actualUrl = moduleConfig.params.actualUrl || getRefererInfo().stack.pop() || getRefererInfo().page;

  const url = 'https://kvt.' + sirdataDomain + '/api/v1/public/p/' + moduleConfig.params.partnerId + '/d/' + moduleConfig.params.key + '/s?callback=&gdpr=' + gdprApplies + '&gdpr_consent=' + tcString + (actualUrl ? '&url=' + encodeURIComponent(actualUrl) : '');

  ajax(url,
    {
      success: function (response, req) {
        if (req.status === 200) {
          try {
            const data = JSON.parse(response);
            if (data && data.segments) {
              addSegmentData(reqBidsConfigObj, data, moduleConfig, onDone);
            } else {
              onDone();
            }
          } catch (e) {
            onDone();
            logError('unable to parse Sirdata data' + e);
          }
        } else if (req.status === 204) {
          onDone();
        }
      },
      error: function () {
        onDone();
        logError('unable to get Sirdata data');
      }
    },
    null,
    {
      contentType: 'text/plain',
      method: 'GET',
      withCredentials: sendWithCredentials,
      referrerPolicy: 'unsafe-url',
      crossOrigin: true
    });
}

export function pushToOrtb2(ortb2Fragments, bidder, data, segtaxid, cattaxid) {
  try {
    if (!isEmpty(data.segments)) {
      if (segtaxid) {
        setOrtb2Sda(ortb2Fragments, bidder, 'user', data.segments, segtaxid);
      } else {
        setOrtb2(ortb2Fragments, bidder, 'user.ext.data', {sd_rtd: {segments: data.segments}});
      }
    }
    if (!isEmpty(data.categories)) {
      if (cattaxid) {
        setOrtb2Sda(ortb2Fragments, bidder, 'site', data.categories, cattaxid);
      } else {
        setOrtb2(ortb2Fragments, bidder, 'site.ext.data', {sd_rtd: {categories: data.categories}});
      }
    }
    if (!isEmpty(data.categories_score) && !cattaxid) {
      setOrtb2(ortb2Fragments, bidder, 'site.ext.data', {sd_rtd: {categories_score: data.categories_score}});
    }
  } catch (e) {
    logError(e)
  }
  return true;
}

export function setOrtb2Sda(ortb2Fragments, bidder, type, segments, segtaxValue) {
  try {
    let ortb2Data = [{
      name: ORTB2_NAME,
      segment: segments.map((segmentId) => ({ id: segmentId })),
    }];
    if (segtaxValue) {
      ortb2Data[0].ext = { segtax: segtaxValue };
    }
    let ortb2Conf = (type === 'site' ? {site: {content: {data: ortb2Data}}} : {user: {data: ortb2Data}});
    if (bidder) {
      ortb2Conf = {[bidder]: ortb2Conf};
    }
    mergeDeep(ortb2Fragments, ortb2Conf);
  } catch (e) {
    logError(e)
  }
  return true;
}

export function setOrtb2(ortb2Fragments, bidder, path, segments) {
  try {
    if (isEmpty(segments)) { return false; }
    let ortb2Conf = {};
    deepSetValue(ortb2Conf, path, segments || {});
    if (bidder) {
      ortb2Conf = {[bidder]: ortb2Conf};
    }
    mergeDeep(ortb2Fragments, ortb2Conf);
  } catch (e) {
    logError(e)
  }

  return true;
}

export function loadCustomFunction(todo, adUnit, list, data, bid) {
  try {
    if (typeof todo == 'function') {
      todo(adUnit, list, data, bid);
    }
  } catch (e) {
    logError(e);
  }
  return true;
}

export function getSegAndCatsArray(data, minScore, pid) {
  let sirdataData = {'segments': [], 'categories': [], 'categories_score': {}};
  minScore = minScore && typeof minScore == 'number' ? minScore : 30;
  let cattaxid = data.cattaxid || null;
  let segtaxid = data.segtaxid || null;
  try {
    if (data && data.contextual_categories) {
      for (let catId in data.contextual_categories) {
        if (data.contextual_categories.hasOwnProperty(catId) && data.contextual_categories[catId]) {
          let value = data.contextual_categories[catId];
          if (value >= minScore && sirdataData.categories.indexOf(catId) === -1) {
            if (pid && pid === '27440' && cattaxid) { // Equativ only
              sirdataData.categories.push(pid.toString() + 'cc' + catId.toString());
            } else {
              sirdataData.categories.push(catId.toString());
              sirdataData.categories_score[catId] = value;
            }
          }
        }
      }
    }
  } catch (e) {
    logError(e);
  }
  try {
    if (data && data.segments) {
      for (let segId in data.segments) {
        if (data.segments.hasOwnProperty(segId) && data.segments[segId]) {
          let id = data.segments[segId].toString();
          if (pid && pid === '27440' && segtaxid) { // Equativ only
            sirdataData.segments.push(pid.toString() + 'us' + id);
          } else {
            sirdataData.segments.push(id);
          }
        }
      }
    }
  } catch (e) {
    logError(e);
  }
  return sirdataData;
}

export function applySdaGetSpecificData(data, sirdataData, biddersParamsExist, minScore, reqBids, bid, moduleConfig, indexFound, bidderIndex, adUnit) {
  // only share SDA data if whitelisted
  if (!biddersParamsExist || indexFound) {
    // SDA Publisher
    let sirdataDataForSDA = getSegAndCatsArray(data, minScore, moduleConfig.params.partnerId.toString());
    pushToOrtb2(reqBids.ortb2Fragments?.bidder, bid.bidder, sirdataDataForSDA, data.segtaxid, data.cattaxid);
  }

  // always share SDA for curation
  let curationId = (indexFound && moduleConfig.params.bidders[bidderIndex].hasOwnProperty('curationId') ? moduleConfig.params.bidders[bidderIndex].curationId : (partnerIds[bid.bidder] ? partnerIds[bid.bidder] : null));
  if (curationId) {
    // seller defined audience & bidder specific data
    if (data.shared_taxonomy && data.shared_taxonomy[curationId]) {
      // Get Bidder Specific Data
      let curationData = getSegAndCatsArray(data.shared_taxonomy[curationId], minScore, curationId.toString());
      pushToOrtb2(reqBids.ortb2Fragments?.bidder, bid.bidder, curationData, data.shared_taxonomy[curationId].segtaxid, data.shared_taxonomy[curationId].cattaxid);
    }
  }

  // Apply custom function or return Bidder Specific Data if publisher is ok
  if (!biddersParamsExist || indexFound) {
    if (indexFound && moduleConfig.params.bidders[bidderIndex].hasOwnProperty('customFunction')) {
      return loadCustomFunction(moduleConfig.params.bidders[bidderIndex].customFunction, adUnit, sirdataData, data, bid);
    } else {
      return sirdataData;
    }
  }
}

export function addSegmentData(reqBids, data, moduleConfig, onDone) {
  const adUnits = (reqBids && reqBids.adUnits) || getGlobal().adUnits;
  if (!adUnits) {
    onDone();
    return;
  }

  moduleConfig = moduleConfig || {};
  moduleConfig.params = moduleConfig.params || {};
  const globalMinScore = moduleConfig.params.hasOwnProperty('contextualMinRelevancyScore') ? moduleConfig.params.contextualMinRelevancyScore : 30;
  let sirdataData = getSegAndCatsArray(data, globalMinScore, null);

  const biddersParamsExist = (!!(moduleConfig.params && moduleConfig.params.bidders && moduleConfig.params.bidders.length > 0));

  // Global ortb2 SDA
  if (data.global_taxonomy && !isEmpty(data.global_taxonomy)) {
    let globalData = {'segments': [], 'categories': [], 'categories_score': []};
    for (let i in data.global_taxonomy) {
      if (!isEmpty(data.global_taxonomy[i])) {
        globalData = getSegAndCatsArray(data.global_taxonomy[i], globalMinScore, null);
        pushToOrtb2(reqBids.ortb2Fragments?.global, null, globalData, data.global_taxonomy[i].segtaxid, data.global_taxonomy[i].cattaxid);
      }
    }
  }

  // Google targeting
  if (typeof window.googletag !== 'undefined' && (moduleConfig.params.setGptKeyValues || !moduleConfig.params.hasOwnProperty('setGptKeyValues'))) {
    try {
      let gptCurationId = (moduleConfig.params.gptCurationId ? moduleConfig.params.gptCurationId : (partnerIds['sdRtdForGpt'] ? partnerIds['sdRtdForGpt'] : null));
      let sirdataMergedList = [];
      if (gptCurationId && data.shared_taxonomy && data.shared_taxonomy[gptCurationId]) {
        let gamCurationData = getSegAndCatsArray(data.shared_taxonomy[gptCurationId], globalMinScore, null);
        sirdataMergedList = sirdataMergedList.concat(gamCurationData.segments).concat(gamCurationData.categories);
      } else {
        sirdataMergedList = sirdataData.segments.concat(sirdataData.categories);
      }
      window.googletag.cmd.push(function() {
        window.googletag.pubads().getSlots().forEach(function (n) {
          if (typeof n.setTargeting !== 'undefined' && sirdataMergedList && sirdataMergedList.length > 0) {
            n.setTargeting('sd_rtd', sirdataMergedList);
          }
        });
      });
    } catch (e) {
      logError(e);
    }
  }

  // Bid targeting level for FPD non-generic biders
  let bidderIndex = '';
  let indexFound = false;

  adUnits.forEach(adUnit => {
    adUnit.hasOwnProperty('bids') && adUnit.bids.forEach(bid => {
      bidderIndex = (moduleConfig.params.hasOwnProperty('bidders') ? findIndex(moduleConfig.params.bidders, function (i) {
        return i.bidder === bid.bidder;
      }) : false);
      indexFound = (!!(typeof bidderIndex == 'number' && bidderIndex >= 0));
      try {
        let minScore = (indexFound && moduleConfig.params.bidders[bidderIndex].hasOwnProperty('contextualMinRelevancyScore') ? moduleConfig.params.bidders[bidderIndex].contextualMinRelevancyScore : globalMinScore);
        switch (bid.bidder) {
          case 'appnexus':
          case 'appnexusAst':
          case 'brealtime':
          case 'emetriq':
          case 'emxdigital':
          case 'pagescience':
          case 'gourmetads':
          case 'matomy':
          case 'featureforward':
          case 'oftmedia':
          case 'districtm':
          case 'adasta':
          case 'beintoo':
          case 'gravity':
          case 'msq_classic':
          case 'msq_max':
          case '366_apx':
            sirdataData = applySdaGetSpecificData(data, sirdataData, biddersParamsExist, minScore, reqBids, bid, moduleConfig, indexFound, bidderIndex, adUnit);
            if (sirdataData.segments && sirdataData.segments.length > 0) {
              setOrtb2(reqBids.ortb2Fragments?.bidder, bid.bidder, 'user.keywords', 'sd_rtd=' + sirdataData.segments.join(',sd_rtd='));
            }
            if (sirdataData.categories && sirdataData.categories.length > 0) {
              setOrtb2(reqBids.ortb2Fragments?.bidder, bid.bidder, 'site.content.keywords', 'sd_rtd=' + sirdataData.categories.join(',sd_rtd='));
            }
            break;

          default:
            if (!biddersParamsExist || (indexFound && (!moduleConfig.params.bidders[bidderIndex].hasOwnProperty('adUnitCodes') || moduleConfig.params.bidders[bidderIndex].adUnitCodes.indexOf(adUnit.code) !== -1))) {
              applySdaGetSpecificData(data, sirdataData, biddersParamsExist, minScore, reqBids, bid, moduleConfig, indexFound, bidderIndex, adUnit);
            }
        }
      } catch (e) {
        logError(e);
      }
    })
  });
  onDone();
  return adUnits;
}

export function init(config) {
  logInfo(LOG_PREFIX, config);
  return true;
}

export const sirdataSubmodule = {
  name: SUBMODULE_NAME,
  init: init,
  getBidRequestData: getSegmentsAndCategories
};

submodule(MODULE_NAME, sirdataSubmodule);
