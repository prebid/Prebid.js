import { uniques, isGptPubadsDefined, getHighestCpm, adUnitsFilter } from './utils';
const bidmanager = require('./bidmanager.js');
const utils = require('./utils.js');
var CONSTANTS = require('./constants.json');

var targeting = exports;
var pbTargetingKeys = [];

targeting.resetPresetTargeting = function() {
  if (isGptPubadsDefined()) {
    window.googletag.pubads().getSlots().forEach(slot => {
      pbTargetingKeys.forEach(function(key){
        // reset only registered adunits
        $$PREBID_GLOBAL$$.adUnits.find(function(unit) {
          if (unit.code === slot.getAdUnitPath() ||
              unit.code === slot.getSlotElementId()) {
            slot.setTargeting(key, null);
          }
        });
      });
    });
  }
};

targeting.getAllTargeting = function(adUnitCode) {
  const adUnitCodes = adUnitCode && adUnitCode.length ? [adUnitCode] : $$PREBID_GLOBAL$$._adUnitCodes;

  // Get targeting for the winning bid. Add targeting for any bids that have
  // `alwaysUseBid=true`. If sending all bids is enabled, add targeting for losing bids.
  var targeting = getWinningBidTargeting(adUnitCodes)
      .concat(getAlwaysUseBidTargeting(adUnitCodes))
      .concat($$PREBID_GLOBAL$$._sendAllBids ? getBidLandscapeTargeting(adUnitCodes) : [])
      .concat(getDealTargeting(adUnitCodes));

  //store a reference of the targeting keys
  targeting.map(adUnitCode => {
    Object.keys(adUnitCode).map(key => {
      adUnitCode[key].map(targetKey => {
        if (pbTargetingKeys.indexOf(Object.keys(targetKey)[0]) === -1) {
          pbTargetingKeys = Object.keys(targetKey).concat(pbTargetingKeys);
        }
      });
    });
  });
  return targeting;
};

targeting.setTargeting = function(targetingConfig) {
  window.googletag.pubads().getSlots().forEach(slot => {
    targetingConfig.filter(targeting => Object.keys(targeting)[0] === slot.getAdUnitPath() ||
      Object.keys(targeting)[0] === slot.getSlotElementId())
      .forEach(targeting => targeting[Object.keys(targeting)[0]]
        .forEach(key => {
          key[Object.keys(key)[0]]
            .map((value) => {
              utils.logMessage(`Attempting to set key value for slot: ${slot.getSlotElementId()} key: ${Object.keys(key)[0]} value: ${value}`);
              return value;
            })
            .forEach(value => {
              slot.setTargeting(Object.keys(key)[0], value);
            });
        }));
  });
};

targeting.getWinningBids = function(adUnitCode) {
  // use the given adUnitCode as a filter if present or all adUnitCodes if not
  const adUnitCodes = adUnitCode ? [adUnitCode] : $$PREBID_GLOBAL$$._adUnitCodes;

  return $$PREBID_GLOBAL$$._bidsReceived
    .filter(bid => adUnitCodes.includes(bid.adUnitCode))
    .filter(bid => bid.cpm > 0)
    .map(bid => bid.adUnitCode)
    .filter(uniques)
    .map(adUnitCode => $$PREBID_GLOBAL$$._bidsReceived
      .filter(bid => bid.adUnitCode === adUnitCode ? bid : null)
      .reduce(getHighestCpm,
        {
          adUnitCode: adUnitCode,
          cpm: 0,
          adserverTargeting: {},
          timeToRespond: 0
        }));
};

targeting.setTargetingForAst = function() {
  let targeting = $$PREBID_GLOBAL$$.getAdserverTargeting();
  Object.keys(targeting).forEach(targetId =>
    Object.keys(targeting[targetId]).forEach(key => {
      utils.logMessage(`Attempting to set targeting for targetId: ${targetId} key: ${key} value: ${targeting[targetId][key]}`);
      //setKeywords supports string and array as value
      if(utils.isStr(targeting[targetId][key]) || utils.isArray(targeting[targetId][key])) {
        var keywordsObj = {};
        var nKey = (key === 'hb_adid') ? key.toUpperCase() : key;
        keywordsObj[nKey] = targeting[targetId][key];
        window.apntag.setKeywords(targetId,keywordsObj);
      }
    })
  );
};

function getWinningBidTargeting() {
  let winners = targeting.getWinningBids();

  // winning bids with deals need an hb_deal targeting key
  // adding hb_deal to bid.adserverTargeting if it exists in winners array
  winners
    .filter(bid => bid.dealId)
    .map(bid => bid.adserverTargeting.hb_deal = bid.dealId);

  let standardKeys = getStandardKeys();
  winners = winners.map(winner => {
    return {
      [winner.adUnitCode]: Object.keys(winner.adserverTargeting)
        .filter(key =>
          typeof winner.sendStandardTargeting === "undefined" ||
          winner.sendStandardTargeting ||
          standardKeys.indexOf(key) === -1)
        .map(key => ({ [key.substring(0, 20)]: [winner.adserverTargeting[key]] }))
    };
  });

  return winners;
}

function getStandardKeys() {
  return bidmanager.getStandardBidderAdServerTargeting()        // in case using a custom standard key set
                   .map(targeting => targeting.key)
                   .concat(CONSTANTS.TARGETING_KEYS).filter(uniques);     // standard keys defined in the library.
}

/**
 * Get custom targeting keys for bids that have `alwaysUseBid=true`.
 */
function getAlwaysUseBidTargeting(adUnitCodes) {
  let standardKeys = getStandardKeys();
  return $$PREBID_GLOBAL$$._bidsReceived
    .filter(adUnitsFilter.bind(this, adUnitCodes))
    .map(bid => {
      if (bid.alwaysUseBid) {
        return {
          [bid.adUnitCode]: Object.keys(bid.adserverTargeting).map(key => {
            // Get only the non-standard keys of the losing bids, since we
            // don't want to override the standard keys of the winning bid.
            if (standardKeys.indexOf(key) > -1) {
              return;
            }

            return { [key.substring(0, 20)]: [bid.adserverTargeting[key]] };

          }).filter(key => key) // remove empty elements
        };
      }
    })
    .filter(bid => bid); // removes empty elements in array;
}

function getBidLandscapeTargeting(adUnitCodes) {
  const standardKeys = CONSTANTS.TARGETING_KEYS;

  return $$PREBID_GLOBAL$$._bidsReceived
    .filter(adUnitsFilter.bind(this, adUnitCodes))
    .map(bid => {
      if (bid.adserverTargeting) {
        return {
          [bid.adUnitCode]: getTargetingMap(bid, standardKeys)
        };
      }
    }).filter(bid => bid); // removes empty elements in array
}

function getTargetingMap(bid, keys) {
  return keys.map(key => {
    return {
      [`${key}_${bid.bidderCode}`.substring(0, 20)]: [bid.adserverTargeting[key]]
    };
  });
}

function getDealTargeting() {
  return $$PREBID_GLOBAL$$._bidsReceived.filter(bid => bid.dealId).map(bid => {
    const dealKey = `hb_deal_${bid.bidderCode}`;
    return {
      [bid.adUnitCode]: getTargetingMap(bid, CONSTANTS.TARGETING_KEYS)
      .concat({ [dealKey.substring(0, 20)]: [bid.adserverTargeting[dealKey]] })
    };
  });
}

targeting.isApntagDefined = function() {
  if (window.apntag && utils.isFn(window.apntag.setKeywords)) {
    return true;
  }
};
