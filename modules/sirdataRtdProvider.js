/**
 * This module adds Sirdata provider to the real time data module
 * The {@link module:modules/realTimeData} module is required
 * The module will fetch segments (user-centric) and categories (page-centric) from Sirdata server
 * The module will automatically handle user's privacy and choice in California (IAB TL CCPA Framework) and in Europe (IAB EU TCF FOR GDPR)
 * @module modules/sirdataRtdProvider
 * @requires module:modules/realTimeData
 */
import {getGlobal} from '../src/prebidGlobal.js';
import * as utils from '../src/utils.js';
import {submodule} from '../src/hook.js';
import {ajax} from '../src/ajax.js';

/** @type {string} */
const MODULE_NAME = 'realTimeData';
const SUBMODULE_NAME = 'SirdataRTDModule';

const _set = (obj, path, val, override) => {
  try {
    const keys = path.split('.');
    const lastKey = keys.pop();
    const lastObj = keys.reduce((obj, key) => obj[key] = obj[key] || {}, obj);
    lastObj[lastKey] = (override === true || !lastObj[lastKey] ? val : lastObj[lastKey]);
  } catch (e) { utils.logError(e); }
};

var findIndex = function(arr, fn) {
  return arr.reduce(function(carry, item, idx) {
    if (fn(item, idx)) {
      return idx;
    }

    return carry;
  }, -1);
};

export function hasOwnDeepProperty(obj, prop) {
  if (typeof obj === 'object' && obj !== null) { // only performs property checks on objects (taking care of the corner case for null as well)
    if (obj.hasOwnProperty(prop)) { // if this object already contains the property, we are done
      return true;
    }
    for (var p in obj) { // otherwise iterate on all the properties of this object.
      if (obj.hasOwnProperty(p) && // and as soon as you find the property you are looking for, return true
          hasOwnDeepProperty(obj[p], prop)) {
        return true;
      }
    }
  }
  return false;
}

export function getSegmentsAndCategories(reqBidsConfigObj, onDone, config, userConsent) {
  const globalConfig = getGlobal();
  const adUnits = reqBidsConfigObj.adUnits || globalConfig.adUnits;
  config.params = config.params || {};

  var tcString = (userConsent && userConsent.gdpr && userConsent.gdpr.consentString ? userConsent.gdpr.consentString : '');
  var gdprApplies = (userConsent && userConsent.gdpr && userConsent.gdpr.gdprApplies ? userConsent.gdpr.gdprApplies : '');

  config.params.partnerId = config.params.partnerId ? config.params.partnerId : 1;
  config.params.key = config.params.key ? config.params.key : 1;

  var sirdataDomain;
  var sendWithCredentials;

  if (userConsent.coppa || (userConsent.usp && (userConsent.usp[0] == '1' && (userConsent.usp[1] == 'N' || userConsent.usp[2] == 'Y')))) {
    // if children or "Do not Sell" management in California, no segments, page categories only whatever TCF signal
    sirdataDomain = 'cookieless-data.com';
    sendWithCredentials = false;
    gdprApplies = null;
    tcString = '';
  } else if (hasOwnDeepProperty(globalConfig, 'gdpr')) {
  // Default endpoint is cookieless if gdpr management is set. Needed because the cookie-based endpoint will fail and return error if user is located in Europe and no consent has been given
    sirdataDomain = 'cookieless-data.com';
    sendWithCredentials = false;
  }

  // default global endpoint is cookie-based if no rules falls into cookieless or consent has been given or GDPR doesn't apply
  if (!sirdataDomain || !gdprApplies || (hasOwnDeepProperty(userConsent, 'consents') && userConsent.gdpr.vendorData.vendor.consents[53] && userConsent.gdpr.vendorData.purpose.consents[1] && userConsent.gdpr.vendorData.purpose.consents[4])) {
    sirdataDomain = 'sddan.com';
    sendWithCredentials = true;
  }

  var actualUrl = null;
  try {
    actualUrl = window.top.location.href;
  } catch (e) { utils.logError(e); }
  if (!actualUrl && config.params.actualUrl) {
    try {
      actualUrl = new URL(config.params.actualUrl);
    } catch (e) { utils.logError(e); }
  }

  const url = 'https://kvt.' + sirdataDomain + '/api/v1/public/p/' + config.params.partnerId + '/d/' + config.params.key + '/s?callback=&gdpr=' + gdprApplies + '&gdpr_consent=' + tcString + (actualUrl ? '&url=' + actualUrl : '');
  ajax(url, {
    success: function (response, req) {
      if (req.status === 200) {
        try {
          const data = JSON.parse(response);
          if (data && data.segments) {
            addSegmentData(adUnits, data, config, onDone, globalConfig);
          } else {
            onDone();
          }
        } catch (e) {
          onDone();
          utils.logError('unable to parse Sirdata data' + e);
        }
      } else if (req.status === 204) {
        onDone();
      }
    },
    error: function () {
      onDone();
      utils.logError('unable to get Sirdata data');
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

export function setGlobalOrtb2(segments, categories, globalConfig) {
  try {
    globalConfig.setConfig({
      ortb2: {
        site: {
          ext: {
            data: {
              sd_rtd: categories
            }
          }
        },
        user: {
          ext: {
            data: {
              sd_rtd: segments
            }
          }
        }
      }
    });
  } catch (e) {
    utils.logError(e)
  }

  return true;
}

export function setBidderOrtb2(bidder, segments, categories, globalConfig) {
  try {
    globalConfig.setBidderConfig({
      bidders: [bidder],
      config: {
        ortb2: {
          site: {
            ext: {
              data: {
                sd_rtd: categories,
              }
            }
          },
          user: {
            ext: {
              data: {
                sd_rtd: segments
              }
            }
          }
        }
      }
    });
  } catch (e) {
    utils.logError(e)
  }

  return true;
}

export function loadCustomFunction (todo, adUnit, list, data, bid) {
  try {
    if (typeof todo == 'function') {
      todo(adUnit, list, data, bid);
    }
  } catch (e) { utils.logError(e); }
  return true;
}

export function getSegAndCatsArray(data, minScore) {
  var sirdataData = {'segments': [], 'categories': []};
  minScore = minScore && typeof minScore == 'number' ? minScore : 30;
  try {
    if (data && data.contextual_categories) {
      for (let catId in data.contextual_categories) {
        let value = data.contextual_categories[catId];
        if (value >= minScore && sirdataData.categories.indexOf(catId) === -1) {
          sirdataData.categories.push(catId.toString());
        }
      }
    }
  } catch (e) { utils.logError(e); }
  try {
    if (data && data.segments) {
      for (let segId in data.segments) {
        sirdataData.segments.push(data.segments[segId].toString());
      }
    }
  } catch (e) { utils.logError(e); }
  return sirdataData;
}

export function addSegmentData(adUnits, data, config, onDone, globalConfig) {
  config = config || {};
  config.params = config.params || {};
  const minScore = config.params.hasOwnProperty('contextualMinRelevancyScore') ? config.params.contextualMinRelevancyScore : 30;
  var sirdataData = getSegAndCatsArray(data, minScore);

  if (!sirdataData || (sirdataData.segments.length < 1 && sirdataData.categories.length < 1)) { utils.logError('no cats'); onDone(); return adUnits; }

  const sirdataList = sirdataData.segments.concat(sirdataData.categories);

  var curationData = {'segments': [], 'categories': []};
  var curationId = '1';
  const biddersParamsExist = (!!(config.params && config.params.bidders));

  // Global ortb2
  if (!biddersParamsExist) {
    setGlobalOrtb2(sirdataData.segments, sirdataData.categories, globalConfig);
  }

  // Google targeting
  if (typeof window.googletag !== 'undefined' && (config.params.setGptKeyValues || !config.params.hasOwnProperty('setGptKeyValues'))) {
    // For curation Google is pid 27449
    curationId = (config.params.gptCurationId ? config.params.gptCurationId : '27449');
    if (data.shared_taxonomy && data.shared_taxonomy[curationId]) {
      curationData = getSegAndCatsArray(data.shared_taxonomy[curationId], minScore);
    }
    window.googletag.pubads().getSlots().forEach(function(n) {
      if (typeof n.setTargeting !== 'undefined') {
        n.setTargeting('sd_rtd', sirdataList.concat(curationData.segments).concat(curationData.categories));
      }
    })
  }

  // Bid targeting level for FPD non-generic biders
  var bidderIndex = '';
  var indexFound = false;

  adUnits.forEach(adUnit => {
    if (!biddersParamsExist && !hasOwnDeepProperty(adUnit, 'sd_rtd')) {
      _set(adUnit, 'ortb2Imp.ext.data.sd_rtd', sirdataList, false);
    }

    adUnit.hasOwnProperty('bids') && adUnit.bids.forEach(bid => {
      bidderIndex = (config.params.hasOwnProperty('bidders') ? findIndex(config.params.bidders, function(i) { return i.bidder === bid.bidder; }) : false);
      indexFound = (!!(typeof bidderIndex == 'number' && bidderIndex >= 0));
      try {
        curationData = {'segments': [], 'categories': []};

        if (!biddersParamsExist || (indexFound && (!config.params.bidders[bidderIndex].hasOwnProperty('adUnitCodes') || config.params.bidders[bidderIndex].adUnitCodes.indexOf(adUnit.code) !== -1))) {
          switch (bid.bidder) {
            case 'appnexus':
            case 'appnexusAst':
            case 'brealtime':
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
              // For curation Xandr is pid 27446
              curationId = (indexFound && config.params.bidders[bidderIndex].hasOwnProperty('curationId') ? config.params.bidders[bidderIndex].curationId : '27446');
              if (data.shared_taxonomy && data.shared_taxonomy[curationId]) {
                curationData = getSegAndCatsArray(data.shared_taxonomy[curationId], minScore);
              }
              if (indexFound && config.params.bidders[bidderIndex].hasOwnProperty('customFunction')) {
                loadCustomFunction(config.params.bidders[bidderIndex].customFunction, adUnit, sirdataList.concat(curationData.segments).concat(curationData.categories), data, bid);
              } else {
                _set(bid, 'params.keywords.sd_rtd', sirdataList.concat(curationData.segments).concat(curationData.categories), true);
              }
              break;

            case 'smartadserver':
            case 'smart':
              var target = [];
              if (bid.hasOwnProperty('params') && bid.params.hasOwnProperty('target')) {
                target.push(bid.params.target);
              }
              // For curation Smart is pid 27440
              curationId = (indexFound && config.params.bidders[bidderIndex].hasOwnProperty('curationId') ? config.params.bidders[bidderIndex].curationId : '27440');
              if (data.shared_taxonomy && data.shared_taxonomy[curationId]) {
                curationData = getSegAndCatsArray(data.shared_taxonomy[curationId], minScore);
              }
              if (indexFound && config.params.bidders[bidderIndex].hasOwnProperty('customFunction')) {
                loadCustomFunction(config.params.bidders[bidderIndex].customFunction, adUnit, sirdataList.concat(curationData.segments).concat(curationData.categories), data, bid);
              } else {
                sirdataList.concat(curationData.segments).concat(curationData.categories).forEach(function(entry) {
                  if (target.indexOf('sd_rtd=' + entry) === -1) {
                    target.push('sd_rtd=' + entry);
                  }
                });
                _set(bid, 'params.target', target.join(';'), true);
              }
              break;

            case 'rubicon':
              // For curation Magnite is pid 27518
              curationId = (indexFound && config.params.bidders[bidderIndex].hasOwnProperty('curationId') ? config.params.bidders[bidderIndex].curationId : '27452');
              if (data.shared_taxonomy && data.shared_taxonomy[curationId]) {
                curationData = getSegAndCatsArray(data.shared_taxonomy[curationId], minScore);
              }
              if (indexFound && config.params.bidders[bidderIndex].hasOwnProperty('customFunction')) {
                loadCustomFunction(config.params.bidders[bidderIndex].customFunction, adUnit, sirdataList.concat(curationData.segments).concat(curationData.categories), data, bid);
              } else {
                setBidderOrtb2(bid.bidder, data.segments.concat(curationData.segments), sirdataList.concat(curationData.segments).concat(curationData.categories), globalConfig);
              }
              break;

            case 'ix':
              var ixConfig = globalConfig.getConfig('ix.firstPartyData.sd_rtd');
              if (!ixConfig) {
                // For curation index is pid 27248
                curationId = (indexFound && config.params.bidders[bidderIndex].hasOwnProperty('curationId') ? config.params.bidders[bidderIndex].curationId : '27248');
                if (data.shared_taxonomy && data.shared_taxonomy[curationId]) {
                  curationData = getSegAndCatsArray(data.shared_taxonomy[curationId], minScore);
                }
                if (indexFound && config.params.bidders[bidderIndex].hasOwnProperty('customFunction')) {
                  loadCustomFunction(config.params.bidders[bidderIndex].customFunction, adUnit, sirdataList.concat(curationData.segments).concat(curationData.categories), data, bid);
                } else {
                  var cappIxCategories = [];
                  var ixLength = 0;
                  var ixLimit = (indexFound && config.params.bidders[bidderIndex].hasOwnProperty('sizeLimit') ? config.params.bidders[bidderIndex].sizeLimit : 1000);
                  // Push ids For publisher use and for curation if exists but limit size because the bidder uses GET parameters
                  sirdataList.concat(curationData.segments).concat(curationData.categories).forEach(function(entry) {
                    if (ixLength < ixLimit) {
                      cappIxCategories.push(entry);
                      ixLength += entry.toString().length;
                    }
                  });
                  globalConfig.setConfig({ix: {firstPartyData: {sd_rtd: cappIxCategories}}});
                }
              }
              break;

            case 'proxistore':
              // For curation Proxistore is pid 27484
              curationId = (indexFound && config.params.bidders[bidderIndex].hasOwnProperty('curationId') ? config.params.bidders[bidderIndex].curationId : '27484');
              if (data.shared_taxonomy && data.shared_taxonomy[curationId]) {
                curationData = getSegAndCatsArray(data.shared_taxonomy[curationId], minScore);
              } else {
                data.shared_taxonomy[curationId] = {contextual_categories: {}};
              }
              if (indexFound && config.params.bidders[bidderIndex].hasOwnProperty('customFunction')) {
                loadCustomFunction(config.params.bidders[bidderIndex].customFunction, adUnit, sirdataList.concat(curationData.segments).concat(curationData.categories), data, bid);
              } else {
                _set(bid, 'ortb2.user.ext.data', {segments: sirdataData.segments.concat(curationData.segments), contextual_categories: {...data.contextual_categories, ...data.shared_taxonomy[curationId].contextual_categories}}, true);
              }
              break;

            case 'criteo':
              // For curation Smart is pid 27443
              curationId = (indexFound && config.params.bidders[bidderIndex].hasOwnProperty('curationId') ? config.params.bidders[bidderIndex].curationId : '27443');
              if (data.shared_taxonomy && data.shared_taxonomy[curationId]) {
                curationData = getSegAndCatsArray(data.shared_taxonomy[curationId], minScore);
              }
              if (indexFound && config.params.bidders[bidderIndex].hasOwnProperty('customFunction')) {
                loadCustomFunction(config.params.bidders[bidderIndex].customFunction, adUnit, sirdataList.concat(curationData.segments).concat(curationData.categories), data, bid);
              } else {
                setBidderOrtb2(bid.bidder, sirdataList.concat(curationData.segments).concat(curationData.categories), sirdataList.concat(curationData.segments).concat(curationData.categories), globalConfig);
              }
              break;

            case 'triplelift':
              // For curation Triplelift is pid 27518
              curationId = (indexFound && config.params.bidders[bidderIndex].hasOwnProperty('curationId') ? config.params.bidders[bidderIndex].curationId : '27518');
              if (data.shared_taxonomy && data.shared_taxonomy[curationId]) {
                curationData = getSegAndCatsArray(data.shared_taxonomy[curationId], minScore);
              }
              if (indexFound && config.params.bidders[bidderIndex].hasOwnProperty('customFunction')) {
                loadCustomFunction(config.params.bidders[bidderIndex].customFunction, adUnit, sirdataList.concat(curationData.segments).concat(curationData.categories), data, bid);
              } else {
                setBidderOrtb2(bid.bidder, data.segments.concat(curationData.segments), sirdataList.concat(curationData.segments).concat(curationData.categories), globalConfig);
              }
              break;

            case 'avct':
            case 'avocet':
              // For curation Avocet is pid 27522
              curationId = (indexFound && config.params.bidders[bidderIndex].hasOwnProperty('curationId') ? config.params.bidders[bidderIndex].curationId : '27522');
              if (data.shared_taxonomy && data.shared_taxonomy[curationId]) {
                curationData = getSegAndCatsArray(data.shared_taxonomy[curationId], minScore);
              }
              if (indexFound && config.params.bidders[bidderIndex].hasOwnProperty('customFunction')) {
                loadCustomFunction(config.params.bidders[bidderIndex].customFunction, adUnit, sirdataList.concat(curationData.segments).concat(curationData.categories), data, bid);
              } else {
                setBidderOrtb2(bid.bidder, data.segments.concat(curationData.segments), sirdataList.concat(curationData.segments).concat(curationData.categories), globalConfig);
              }
              break;

            case 'smaato':
              // For curation Smaato is pid 27520
              curationId = (indexFound && config.params.bidders[bidderIndex].hasOwnProperty('curationId') ? config.params.bidders[bidderIndex].curationId : '27520');
              if (data.shared_taxonomy && data.shared_taxonomy[curationId]) {
                curationData = getSegAndCatsArray(data.shared_taxonomy[curationId], minScore);
              }
              if (indexFound && config.params.bidders[bidderIndex].hasOwnProperty('customFunction')) {
                loadCustomFunction(config.params.bidders[bidderIndex].customFunction, adUnit, sirdataList.concat(curationData.segments).concat(curationData.categories), data, bid);
              } else {
                setBidderOrtb2(bid.bidder, data.segments.concat(curationData.segments), sirdataList.concat(curationData.segments).concat(curationData.categories), globalConfig);
              }
              break;

            default:
              if ((!biddersParamsExist || indexFound) && !hasOwnDeepProperty(bid, 'sd_rtd')) {
                _set(bid, 'ortb2.site.ext.data.sd_rtd', sirdataData.categories, false);
                _set(bid, 'ortb2.user.ext.data.sd_rtd', sirdataData.segments, false);
              }
          }
        }
      } catch (e) { utils.logError(e) }
    })
  });

  onDone();
  return adUnits;
}

export function init(config) {
  return true;
}

export const sirdataSubmodule = {
  name: SUBMODULE_NAME,
  init: init,
  getBidRequestData: getSegmentsAndCategories
};

submodule(MODULE_NAME, sirdataSubmodule);
