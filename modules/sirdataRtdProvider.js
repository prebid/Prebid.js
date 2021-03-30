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

const _set = (obj, path, val) => {
  const keys = path.split('.');
  const lastKey = keys.pop();
  const lastObj = keys.reduce((obj, key) => obj[key] = obj[key] || {}, obj);
  lastObj[lastKey] = lastObj[lastKey] || val;
};

export function getSegmentsAndCategories(reqBidsConfigObj, onDone, config, userConsent) {
  const gobalConfig = getGlobal();
  const adUnits = reqBidsConfigObj.adUnits || gobalConfig.adUnits;
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
            addSegmentData(adUnits, data, config, onDone, gobalConfig);
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

export function setBidderOrtb2(bid, segments, categories, gobalConfig) {
  var ortb2Valid = true;

  try {
    if (parseFloat(gobalConfig.version.substring(1)) < 4.3) {
      ortb2Valid = false;
    }
  } catch (er) {}

  if (!ortb2Valid) {
    // do it with FPD
    return setBidderFpd(bid, segments, categories, gobalConfig);
  }

  try {
    gobalConfig.setBidderConfig({
      bidders: [bid.bidder],
      config: {
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
      }
    });
  } catch (err) {
    utils.logError(err.message)
  }

  return true;
}

export function setBidderFpd(bid, segments, categories, gobalConfig) {
  try {
    gobalConfig.setBidderConfig({
      bidders: [bid.bidder],
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
      todo(adUnit, list, data);
    }
  } catch (er) {}
  return true;
}

export function getSegAndCatsArray(data, minScore) {
  var sirdataData = {'segments': [], 'categories': []};
  minScore = minScore && typeof minScore == 'number' ? minScore : 30;
  try {
    if (data && data.contextual_categories && minScore) {
      Object.entries(data.contextual_categories).forEach(([cat, value]) => {
        if (value >= minScore && sirdataData.categories.indexOf(cat) === -1) {
          sirdataData.categories.push(cat);
        }
      });
    }
  } catch (e) {}
  try {
    if (data && data.segments) {
      Object.entries(data.segments).forEach(([entry, segment]) => {
        if (sirdataData.segments.indexOf(sirdataData.segment) === -1) {
          sirdataData.segments.push(segment);
        }
      });
    }
  } catch (e) {}
  return sirdataData;
}

export function addSegmentData(adUnits, data, config, onDone, gobalConfig) {
  config.params = config.params || {};
  const minScore = config.params.contextualMinRelevancyScore ? config.params.contextualMinRelevancyScore : 30;
  var sirdataData = getSegAndCatsArray(data, minScore);

  if (!sirdataData || sirdataData.segments.concat(sirdataData.categories).length < 1) { utils.logInfo('no cats'); onDone(); return adUnits; }

  var curationData = {'segments': [], 'categories': []};
  var curationId = '1';

  if (typeof window.googletag !== 'undefined' && config.params.setGptKeyValues) {
    // For curation GG is pid 27449
    curationId = config.params.gptCurationId || '27449';
    if (data[curationId]) {
      curationData = getSegAndCatsArray(data[curationId], minScore);
    }
    window.googletag.pubads().getSlots().forEach(function(n) {
      if (typeof n.setTargeting !== 'undefined') {
        utils.logInfo('Set GPT Targeting : done');
        n.setTargeting('sd_rtd', sirdataData.segments.concat(sirdataData.categories).concat(curationData.segments).concat(curationData.categories));
      }
    })
  }

  var bidderIndex = '';
  adUnits.forEach(adUnit => {
    adUnit.hasOwnProperty('bids') && adUnit.bids.forEach(bid => {
      bidderIndex = config.params.bidders ? config.params.bidders.findIndex(i => i.bidder === bid.bidder) : null;

      if (!config.params.bidders || (typeof bidderIndex == 'number' && bidderIndex >= 0 && (!config.params.bidders[bidderIndex].adUnitCodes || config.params.bidders[bidderIndex].adUnitCodes.indexOf(adUnit.code) !== -1))) {
        curationData = {'segments': [], 'categories': []};

        if (['appnexus', 'appnexusAst', 'brealtime', 'emxdigital', 'pagescience', 'defymedia', 'gourmetads', 'matomy', 'featureforward', 'oftmedia', 'districtm', 'adasta', 'beintoo', 'gravity', 'msq_classic', 'msq_max', '366_apx'].indexOf(bid.bidder) !== -1) {
          var keywords = {};
          if (bid.params.keywords !== undefined) {
            keywords = bid.params.keywords;
          }
          // For curation Xandr is pid 27446
          curationId = config.params.bidders[bidderIndex].curationId || '27446';
          if (data[curationId]) {
            curationData = getSegAndCatsArray(data[curationId], minScore);
          }
          if (bidderIndex && bidderIndex >= 0 && typeof config.params.bidders[bidderIndex].customFunction == 'function') {
            loadCustomFunction(config.params.bidders[bidderIndex].customFunction, adUnit, sirdataData.segments.concat(sirdataData.categories).concat(curationData.segments).concat(curationData.categories), data, bid);
          } else {
            try {
              keywords.sd_rtd = sirdataData.segments.concat(sirdataData.categories).concat(curationData.segments).concat(curationData.categories);
              _set(bid, 'params.keywords', keywords);
              //_set(bid, 'params.user.segments', curationData.segments.concat(curationData.categories));
            } catch (err) {
              utils.logError(err.message)
            }
          }
        } else if (['smartadserver', 'smart'].indexOf(bid.bidder) !== -1) {
          var target = [];
          if (typeof bid.params.target !== 'undefined') {
            target.push(bid.params.target);
          }
          // For curation Smart is pid 27440
          curationId = config.params.bidders[bidderIndex].curationId || '27440';
          if (data[curationId]) {
            curationData = getSegAndCatsArray(data[curationId], minScore);
          }
          if (bidderIndex && bidderIndex >= 0 && typeof config.params.bidders[bidderIndex].customFunction == 'function') {
            loadCustomFunction(config.params.bidders[bidderIndex].customFunction, adUnit, sirdataData.segments.concat(sirdataData.categories).concat(curationData.segments).concat(curationData.categories), data, bid);
          } else {
            try {
              sirdataData.segments.concat(sirdataData.categories).concat(curationData.segments).concat(curationData.categories).forEach(function(entry) {
                if (target.indexOf('sd_rtd=' + entry) === -1) {
                  target.push('sd_rtd=' + entry);
                }
              });
              _set(bid, 'params.target', target.join(';'));
            } catch (err) {
              utils.logError(err.message)
            }
          }
        } else if (bid.bidder == 'ix') {
          try {
            var ixConfig = gobalConfig.getConfig('ix.firstPartyData') || {};
            // For curation index is pid 27248
            curationId = config.params.bidders[bidderIndex].curationId || '27248';
            if (data[curationId]) {
              curationData = getSegAndCatsArray(data[curationId], minScore);
            }
            if (bidderIndex && bidderIndex >= 0 && typeof config.params.bidders[bidderIndex].customFunction == 'function') {
              loadCustomFunction(config.params.bidders[bidderIndex].customFunction, adUnit, sirdataData.segments.concat(sirdataData.categories).concat(curationData.segments).concat(curationData.categories), data, bid);
            } else {
              // Push ids For publisher use and for curation if exists
              var newFpd = Object.assign(ixConfig, {'sd_rtd': sirdataData.segments.concat(sirdataData.categories).concat(curationData.segments).concat(curationData.categories)});
              gobalConfig.setConfig({
                ix: {
                  firstPartyData: newFpd
                }
              });
            }
          } catch (err) {
            utils.logError(err.message)
          }
        } else if (bid.bidder == 'rubicon') {
          // For curation Maginte is pid 27452
          curationId = config.params.bidders[bidderIndex].curationId || '27452';
          if (data[curationId]) {
            curationData = getSegAndCatsArray(data[curationId], minScore);
          }
          if (bidderIndex && bidderIndex >= 0 && typeof config.params.bidders[bidderIndex].customFunction == 'function') {
            loadCustomFunction(config.params.bidders[bidderIndex].customFunction, adUnit, sirdataData.segments.concat(sirdataData.categories).concat(curationData.segments).concat(curationData.categories), data, bid);
          } else {
            setBidderOrtb2(bid, sirdataData.segments.concat(curationData.segments), sirdataData.categories.concat(curationData.categories), gobalConfig);
          }
        } else {
          if (bidderIndex && bidderIndex >= 0 && typeof config.params.bidders[bidderIndex].customFunction == 'function') {
            loadCustomFunction(config.params.bidders[bidderIndex].customFunction, adUnit, sirdataData.segments.concat(sirdataData.categories), data, bid);
          } else {
            setBidderOrtb2(bid, sirdataData.segments, sirdataData.categories, gobalConfig);
          }
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
