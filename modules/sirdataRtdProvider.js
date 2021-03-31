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
  } catch (e) {}
};

export function getSegmentsAndCategories(reqBidsConfigObj, onDone, config, userConsent) {
  const globalConfig = getGlobal();
  const adUnits = reqBidsConfigObj.adUnits || globalConfig.adUnits;
  config.params = config.params || {};

  var tcString = (userConsent && userConsent.gdpr && userConsent.gdpr.consentString ? userConsent.gdpr.consentString : '');
  var gdprApplies = (userConsent && userConsent.gdpr && userConsent.gdpr.gdprApplies ? userConsent.gdpr.gdprApplies : '');
  var sirdataDomain = 'sddan.com';
  var sendWithCredentials = true;

  config.params.partnerId = config.params.partnerId ? config.params.partnerId : 1;
  config.params.key = config.params.key ? config.params.key : 1;

  if (userConsent.coppa) { // if children, no segments, page categories only
    sirdataDomain = 'cookieless-data.com';
    tcString = '';
    sendWithCredentials = false;
  } else if (userConsent.usp) {
    // Si pas de transprence ou optout on passe en contextuel seulement
    if (userConsent.usp[0] == '1' && (userConsent.usp[1] == 'N' || userConsent.usp[2] == 'Y')) {
      sirdataDomain = 'cookieless-data.com';
      sendWithCredentials = false;
      gdprApplies = false;
    }
  } else if (gdprApplies && gdprApplies !== '0' && gdprApplies !== 'null') {
    if (userConsent && userConsent.gdpr && userConsent.gdpr.vendorData && userConsent.gdpr.vendorData.vendor && userConsent.gdpr.vendorData.vendor.consents) {
      if (!userConsent.gdpr.vendorData.vendor.consents[53] || !userConsent.gdpr.vendorData.purpose.consents[1] || !userConsent.gdpr.vendorData.purpose.consents[3]) {
        sirdataDomain = 'cookieless-data.com';
        sendWithCredentials = false;
      }
    }
  }

  var actualUrl = null;
  try {
    actualUrl = window.top.location.href;
  } catch (e) {}
  if (!actualUrl && config.params.actualUrl) {
    try {
      actualUrl = new URL(config.params.actualUrl);
    } catch (err) {}
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
        } catch (err) {
          onDone();
          utils.logError('unable to parse Sirdata data');
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
  var ortb2Valid = true;

  try {
    if (parseFloat(globalConfig.version.substring(1)) < 4.3) {
      ortb2Valid = false;
    }
  } catch (er) {}

  if (!ortb2Valid) {
    // do it with FPD
    return setGlobalFpd(segments, categories, globalConfig);
  }

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
  } catch (err) {
    utils.logError(err.message)
  }

  return true;
}

export function setGlobalFpd(segments, categories, globalConfig) {
  try {
    globalConfig.setConfig({
      fpd: {
        context: {
          data: {
            sd_rtd: categories
          }
        },
        user: {
          data: {
            sd_rtd: segments
          }
        }
      }
    });
  } catch (err) {
    utils.logError(err.message)
  }
  return true;
}

export function setBidderOrtb2(bidder, segments, categories, globalConfig) {
  var ortb2Valid = true;

  try {
    if (parseFloat(globalConfig.version.substring(1)) < 4.3) {
      ortb2Valid = false;
    }
  } catch (er) {}

  if (!ortb2Valid) {
    // do it with FPD
    return setBidderFpd(bidder, segments, categories, globalConfig);
  }

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
  } catch (err) {
    utils.logError(err.message)
  }

  return true;
}

export function setBidderFpd(bidder, segments, categories, globalConfig) {
  try {
    globalConfig.setBidderConfig({
      bidders: [bidder],
      config: {
        fpd: {
          context: {
            data: {
              sd_rtd: categories
            }
          },
          user: {
            data: {
              sd_rtd: segments
            }
          }
        }
      }
    });
  } catch (err) {
    utils.logError(err.message)
  }
  return true;
}

export function loadCustomFunction (todo, adUnit, list, data, bid) {
  try {
    if (typeof todo == 'function') {
      todo(adUnit, list, data, bid);
    }
  } catch (er) { utils.logError(er); }
  return true;
}

export function getSegAndCatsArray(data, minScore) {
  var sirdataData = {'segments': [], 'categories': []};
  minScore = minScore && typeof minScore == 'number' ? minScore : 30;
  try {
    if (data && data.contextual_categories && minScore) {
      Object.entries(data.contextual_categories).forEach(([cat, value]) => {
        if (value >= minScore && sirdataData.categories.indexOf(cat) === -1) {
          sirdataData.categories.push(cat.toString());
        }
      });
    }
  } catch (e) {}
  try {
    if (data && data.segments) {
      Object.entries(data.segments).forEach(([entry, segment]) => {
        if (sirdataData.segments.indexOf(sirdataData.segment) === -1) {
          sirdataData.segments.push(segment.toString());
        }
      });
    }
  } catch (e) {}
  return sirdataData;
}

export function addSegmentData(adUnits, data, config, onDone, globalConfig) {
  config.params = config.params || {};
  const minScore = config.params.contextualMinRelevancyScore ? config.params.contextualMinRelevancyScore : 30;
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
  if (typeof window.googletag !== 'undefined' && config.params.setGptKeyValues) {
    // For curation GG is pid 27449
    curationId = config.params.gptCurationId || '27449';
    if (data[curationId]) {
      curationData = getSegAndCatsArray(data[curationId], minScore);
    }
    window.googletag.pubads().getSlots().forEach(function(n) {
      if (typeof n.setTargeting !== 'undefined') {
        n.setTargeting('sd_rtd', sirdataList.concat(curationData.segments).concat(curationData.categories));
      }
    })
  }

  // Bidder Targeting for FPD generic bidders
  if (config.params && config.params.bidders) {
    config.params.bidders.forEach(bidder => {
      curationData = {'segments': [], 'categories': []};
      if (bidder.bidder == 'ix') {
        var ixConfig = globalConfig.getConfig('ix.firstPartyData') || {};
        // For curation index is pid 27248
        curationId = bidder.curationId || '27248';
        if (data[curationId]) { curationData = getSegAndCatsArray(data[curationId], minScore); }
        if (bidder.customFunction == 'function') {
          loadCustomFunction(bidder.customFunction, null, sirdataList.concat(curationData.segments).concat(curationData.categories), data, null);
        } else {
          var cappIxCategories = [];
          var ixLength = 0;
          var ixLimit = bidder.sizeLimit || 1000;
          // Push ids For publisher use and for curation if exists but limit size because the bidder uses GET parameters
          sirdataList.concat(curationData.segments).concat(curationData.categories).forEach(function(entry) {
            if (ixLength < ixLimit) {
              cappIxCategories.push(entry);
              ixLength += entry.toString().length;
            }
          });
          if (cappIxCategories.length > 0) {
            var newFpd = Object.assign(ixConfig, {'sd_rtd': cappIxCategories});
            globalConfig.setConfig({ix: {firstPartyData: newFpd}});
          }
        }
      }
    })
  }

  // Bid taregting level for FPD non-generic biders
  var bidderIndex = '';
  var indexFound = false;

  adUnits.forEach(adUnit => {
    if (!biddersParamsExist && adUnit.ortb2Imp && !adUnit.ortb2Imp.ext.data.sd_rtd) {
      _set(adUnit, 'ortb2Imp.ext.data.sd_rtd', sirdataList, true);
    }

    adUnit.hasOwnProperty('bids') && adUnit.bids.forEach(bid => {
      bidderIndex = config.params.bidders.findIndex(i => i.bidder === bid.bidder);
      indexFound = (!!(typeof bidderIndex == 'number' && bidderIndex >= 0));

      if (!biddersParamsExist || (indexFound && (!config.params.bidders[bidderIndex].adUnitCodes || config.params.bidders[bidderIndex].adUnitCodes.indexOf(adUnit.code) !== -1))) {
        curationData = {'segments': [], 'categories': []};

        if ((['appnexus', 'appnexusAst', 'brealtime', 'emxdigital', 'pagescience', 'defymedia', 'gourmetads', 'matomy', 'featureforward', 'oftmedia', 'districtm', 'adasta', 'beintoo', 'gravity', 'msq_classic', 'msq_max', '366_apx'].indexOf(bid.bidder) !== -1) && (!biddersParamsExist || indexFound)) {
          try {
            // For curation Xandr is pid 27446
            curationId = (config.params && config.params.bidders[bidderIndex] && config.params.bidders[bidderIndex].curationId) || '27446';
            if (data[curationId]) {
              curationData = getSegAndCatsArray(data[curationId], minScore);
            }
            if (indexFound && typeof config.params.bidders[bidderIndex].customFunction == 'function') {
              loadCustomFunction(config.params.bidders[bidderIndex].customFunction, adUnit, sirdataList.concat(curationData.segments).concat(curationData.categories), data, bid);
            } else {
              _set(bid, 'params.keywords.sd_rtd', sirdataList.concat(curationData.segments).concat(curationData.categories), true);
            }
          } catch (e) { utils.logError(e) }
        } else if ((['smartadserver', 'smart'].indexOf(bid.bidder) !== -1) && (!biddersParamsExist || indexFound)) {
          try {
            var target = [];
            if (bid.params && bid.params.target) {
              target.push(bid.params.target);
            }
            // For curation Smart is pid 27440
            curationId = (config.params && config.params.bidders[bidderIndex] && config.params.bidders[bidderIndex].curationId) || '27440';
            if (data[curationId]) {
              curationData = getSegAndCatsArray(data[curationId], minScore);
            }
            if (indexFound && typeof config.params.bidders[bidderIndex].customFunction == 'function') {
              loadCustomFunction(config.params.bidders[bidderIndex].customFunction, adUnit, sirdataList.concat(curationData.segments).concat(curationData.categories), data, bid);
            } else {
              sirdataList.concat(curationData.segments).concat(curationData.categories).forEach(function(entry) {
                if (target.indexOf('sd_rtd=' + entry) === -1) {
                  target.push('sd_rtd=' + entry);
                }
              });
              _set(bid, 'params.target', target.join(';'), true);
            }
          } catch (e) { utils.logError(e) }
        } else if ((['criteo'].indexOf(bid.bidder) !== -1) && (!biddersParamsExist || indexFound)) {
          try {
            // For curation Smart is pid 27443
            curationId = (config.params && config.params.bidders[bidderIndex] && config.params.bidders[bidderIndex].curationId) || '27443';
            if (data[curationId]) {
              curationData = getSegAndCatsArray(data[curationId], minScore);
            }
            if (indexFound && typeof config.params.bidders[bidderIndex].customFunction == 'function') {
              loadCustomFunction(config.params.bidders[bidderIndex].customFunction, adUnit, sirdataList.concat(curationData.segments).concat(curationData.categories), data, bid);
            } else {
              setBidderOrtb2(bid.bidder, sirdataList.concat(curationData.segments).concat(curationData.categories), sirdataList.concat(curationData.segments).concat(curationData.categories), globalConfig);
            }
          } catch (e) { utils.logError(e) }
        } else if ((['rubicon'].indexOf(bid.bidder) !== -1) && (!biddersParamsExist || indexFound)) {
          try {
            // For curation Maginte is pid 27452
            curationId = (config.params && config.params.bidders[bidderIndex] && config.params.bidders[bidderIndex].curationId) || '27452';
            if (data[curationId]) {
              curationData = getSegAndCatsArray(data[curationId], minScore);
            }
            if (indexFound && typeof config.params.bidders[bidderIndex].customFunction == 'function') {
              loadCustomFunction(config.params.bidders[bidderIndex].customFunction, adUnit, sirdataList.concat(curationData.segments).concat(curationData.categories), data, bid);
            } else {
              setBidderOrtb2(bid.bidder, data.segments.concat(curationData.segments), sirdataList.concat(curationData.segments).concat(curationData.categories), globalConfig);
            }
          } catch (e) { utils.logError(e) }
        } else if ((['triplelift'].indexOf(bid.bidder) !== -1) && (!biddersParamsExist || indexFound)) {
          try {
            // For curation Maginte is pid 27452
            curationId = (config.params && config.params.bidders[bidderIndex] && config.params.bidders[bidderIndex].curationId) || '27452';
            if (data[curationId]) {
              curationData = getSegAndCatsArray(data[curationId], minScore);
            }
            if (indexFound && typeof config.params.bidders[bidderIndex].customFunction == 'function') {
              loadCustomFunction(config.params.bidders[bidderIndex].customFunction, adUnit, sirdataList.concat(curationData.segments).concat(curationData.categories), data, bid);
            } else {
              if (adUnit.ortb2Imp && adUnit.ortb2Imp.ext && adUnit.ortb2Imp.ext.data && adUnit.ortb2Imp.ext.data.sd_rtd) {
                // Just add curation
                _set(adUnit, 'ortb2Imp.ext.data.sd_rtd', adUnit.ortb2Imp.ext.data.sd_rtd.concat(curationData.segments).concat(curationData.categories), true);
              } else {
                // Add all data
                _set(adUnit, 'ortb2Imp.ext.data.sd_rtd', sirdataList.concat(curationData.segments).concat(curationData.categories), true);
              }
            }
          } catch (e) { utils.logError(e) }
        } else if ((['proxistore'].indexOf(bid.bidder) !== -1) && (!biddersParamsExist || indexFound)) {
          try {
            // For curation Proxistore is pid 27484
            curationId = (config.params && config.params.bidders[bidderIndex] && config.params.bidders[bidderIndex].curationId) || '27484';
            if (data[curationId] && data[curationId].contextual_categories) {
              curationData = getSegAndCatsArray(data[curationId], minScore);
            } else {
              data[curationId] = {contextual_categories: {}};
            }
            if (indexFound && typeof config.params.bidders[bidderIndex].customFunction == 'function') {
              loadCustomFunction(config.params.bidders[bidderIndex].customFunction, adUnit, sirdataList.concat(curationData.segments).concat(curationData.categories), data, bid);
            } else {
              _set(bid, 'ortb2.user.ext.data', {segments: sirdataData.segments.concat(curationData.segments), contextual_categories: {...data.contextual_categories, ...data[curationId].contextual_categories}}, true);
            }
          } catch (e) { utils.logError(e) }
        } else if (!biddersParamsExist || !indexFound) {
          _set(bid, 'ortb2.site.ext.data.sd_rtd', sirdataList, true);
        }
      }
    })
  });

  onDone();
  return adUnits;
}

export function init(config) {
  return true;
}

export const subModuleObj = {
  name: SUBMODULE_NAME,
  init: init,
  getBidRequestData: getSegmentsAndCategories
};

submodule(MODULE_NAME, subModuleObj);
