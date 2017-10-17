import { uniques, isGptPubadsDefined, getHighestCpm, adUnitsFilter, groupBy } from './utils';
import { config } from './config';
import { NATIVE_TARGETING_KEYS } from './native';
const bidmanager = require('./bidmanager');
const utils = require('./utils');
var CONSTANTS = require('./constants');

var targeting = exports;
var pbTargetingKeys = [];

targeting.resetPresetTargeting = function(adUnitCode) {
  if (isGptPubadsDefined()) {
    const adUnitCodes = getAdUnitCodes(adUnitCode);
    const adUnits = $$PREBID_GLOBAL$$.adUnits.filter(adUnit => adUnitCodes.includes(adUnit.code));
    window.googletag.pubads().getSlots().forEach(slot => {
      pbTargetingKeys.forEach(function(key) {
        // reset only registered adunits
        adUnits.forEach(function(unit) {
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
  const adUnitCodes = getAdUnitCodes(adUnitCode);

  // Get targeting for the winning bid. Add targeting for any bids that have
  // `alwaysUseBid=true`. If sending all bids is enabled, add targeting for losing bids.
  var targeting = getWinningBidTargeting(adUnitCodes)
    .concat(getAlwaysUseBidTargeting(adUnitCodes))
    .concat(config.getConfig('enableSendAllBids') ? getBidLandscapeTargeting(adUnitCodes) : []);

  // store a reference of the targeting keys
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

/**
 * normlizes input to a `adUnit.code` array
 * @param  {(string|string[])} adUnitCode [description]
 * @return {string[]}     AdUnit code array
 */
function getAdUnitCodes(adUnitCode) {
  if (typeof adUnitCode === 'string') {
    return [adUnitCode];
  } else if (utils.isArray(adUnitCode)) {
    return adUnitCode;
  }
  return $$PREBID_GLOBAL$$._adUnitCodes || [];
}

/**
 * Returns top bids for a given adUnit or set of adUnits.
 * @param  {(string|string[])} adUnitCode adUnitCode or array of adUnitCodes
 * @return {[type]}            [description]
 */
targeting.getWinningBids = function(adUnitCode) {
  const adUnitCodes = getAdUnitCodes(adUnitCode);

  return $$PREBID_GLOBAL$$._bidsReceived
    .filter(bid => adUnitCodes.includes(bid.adUnitCode))
    .filter(bid => bid.cpm > 0)
    .map(bid => bid.adUnitCode)
    .filter(uniques)
    .map(adUnitCode => $$PREBID_GLOBAL$$._bidsReceived
      .filter(bid => bid.adUnitCode === adUnitCode ? bid : null)
      .reduce(getHighestCpm, getEmptyBid(adUnitCode)));
};

targeting.setTargetingForAst = function() {
  let targeting = $$PREBID_GLOBAL$$.getAdserverTargeting();
  Object.keys(targeting).forEach(targetId =>
    Object.keys(targeting[targetId]).forEach(key => {
      utils.logMessage(`Attempting to set targeting for targetId: ${targetId} key: ${key} value: ${targeting[targetId][key]}`);
      // setKeywords supports string and array as value
      if (utils.isStr(targeting[targetId][key]) || utils.isArray(targeting[targetId][key])) {
        let keywordsObj = {};
        let input = 'hb_adid';
        let nKey = (key.substring(0, input.length) === input) ? key.toUpperCase() : key;
        keywordsObj[nKey] = targeting[targetId][key];
        window.apntag.setKeywords(targetId, keywordsObj);
      }
    })
  );
};

function getWinningBidTargeting(adUnitCodes) {
  let winners = targeting.getWinningBids(adUnitCodes);
  let standardKeys = getStandardKeys();

  winners = winners.map(winner => {
    return {
      [winner.adUnitCode]: Object.keys(winner.adserverTargeting)
        .filter(key =>
          typeof winner.sendStandardTargeting === 'undefined' ||
          winner.sendStandardTargeting ||
          standardKeys.indexOf(key) === -1)
        .map(key => ({ [key.substring(0, 20)]: [winner.adserverTargeting[key]] }))
    };
  });

  return winners;
}

function getStandardKeys() {
  return bidmanager.getStandardBidderAdServerTargeting() // in case using a custom standard key set
    .map(targeting => targeting.key)
    .concat(CONSTANTS.TARGETING_KEYS).filter(uniques); // standard keys defined in the library.
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
  const standardKeys = CONSTANTS.TARGETING_KEYS.concat(NATIVE_TARGETING_KEYS);
  const bids = [];
  // bucket by adUnitcode
  let buckets = groupBy($$PREBID_GLOBAL$$._bidsReceived, 'adUnitCode');
  // filter top bid for each bucket by bidder
  Object.keys(buckets).forEach(bucketKey => {
    let bidsByBidder = groupBy(buckets[bucketKey], 'bidderCode');
    Object.keys(bidsByBidder).forEach(key => bids.push(bidsByBidder[key].reduce(getHighestCpm, getEmptyBid())));
  });
  // populate targeting keys for the remaining bids
  return bids.map(bid => {
    if (bid.adserverTargeting) {
      return {
        [bid.adUnitCode]: getTargetingMap(bid, standardKeys.filter(
          key => typeof bid.adserverTargeting[key] !== 'undefined')
        )
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

targeting.isApntagDefined = function() {
  if (window.apntag && utils.isFn(window.apntag.setKeywords)) {
    return true;
  }
};

function getEmptyBid(adUnitCode) {
  return {
    adUnitCode: adUnitCode,
    cpm: 0,
    adserverTargeting: {},
    timeToRespond: 0
  };
}
