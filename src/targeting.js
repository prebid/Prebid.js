import { uniques, isGptPubadsDefined, getHighestCpm, groupBy, isAdUnitCodeMatchingSlot, timestamp } from './utils';
import { config } from './config';
import { NATIVE_TARGETING_KEYS } from './native';
import { auctionManager } from './auctionManager';
import includes from 'core-js/library/fn/array/includes';

const utils = require('./utils.js');
var CONSTANTS = require('./constants.json');

var pbTargetingKeys = [];

export const BID_TARGETING_SET = 'targetingSet';

const MAX_DFP_KEYLENGTH = 20;

// return unexpired bids
export const isBidExpired = (bid) => (timestamp() - bid.responseTimestamp) < bid.ttl * 1000;

// return bids whose status is not set. Winning bid can have status `targetingSet` or `rendered`.
const isUnusedBid = (bid) => bid && ((bid.status && bid.status === BID_TARGETING_SET) || !bid.status);

/**
 * @typedef {Object.<string,string>} targeting
 * @property {string} targeting_key
 */

/**
 * @typedef {Object.<string,Object.<string,string[]>[]>[]} targetingArray
 */

export function newTargeting(auctionManager) {
  let targeting = {};

  targeting.resetPresetTargeting = function(adUnitCode) {
    if (isGptPubadsDefined()) {
      const adUnitCodes = getAdUnitCodes(adUnitCode);
      const adUnits = auctionManager.getAdUnits().filter(adUnit => includes(adUnitCodes, adUnit.code));
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

  /**
   * Returns all ad server targeting for all ad units.
   * @param {string=} adUnitCode
   * @return {Object.<string,targeting>} targeting
   */
  targeting.getAllTargeting = function(adUnitCode) {
    const adUnitCodes = getAdUnitCodes(adUnitCode);

    // Get targeting for the winning bid. Add targeting for any bids that have
    // `alwaysUseBid=true`. If sending all bids is enabled, add targeting for losing bids.
    var targeting = getWinningBidTargeting(adUnitCodes)
      .concat(getCustomBidTargeting(adUnitCodes))
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

    targeting = flattenTargeting(targeting);
    return targeting;
  };

  /**
   * Converts targeting array and flattens to make it easily iteratable
   * e.g: Sample input to this function
   * ```
   * [
   *    {
   *      "div-gpt-ad-1460505748561-0": [{"hb_bidder": ["appnexusAst"]}]
   *    },
   *    {
   *      "div-gpt-ad-1460505748561-0": [{"hb_bidder_appnexusAs": ["appnexusAst"]}]
   *    }
   * ]
   * ```
   * Resulting array
   * ```
   * {
   *  "div-gpt-ad-1460505748561-0": {
   *    "hb_bidder": "appnexusAst",
   *    "hb_bidder_appnexusAs": "appnexusAst"
   *  }
   * }
   * ```
   *
   * @param {targetingArray}  targeting
   * @return {Object.<string,targeting>}  targeting
   */
  function flattenTargeting(targeting) {
    let targetingObj = targeting.map(targeting => {
      return {
        [Object.keys(targeting)[0]]: targeting[Object.keys(targeting)[0]]
          .map(target => {
            return {
              [Object.keys(target)[0]]: target[Object.keys(target)[0]].join(', ')
            };
          }).reduce((p, c) => Object.assign(c, p), {})
      };
    }).reduce(function (accumulator, targeting) {
      var key = Object.keys(targeting)[0];
      accumulator[key] = Object.assign({}, accumulator[key], targeting[key]);
      return accumulator;
    }, {});
    return targetingObj;
  }

  /**
   * Sets targeting for DFP
   * @param {Object.<string,Object.<string,string>>} targetingConfig
   */
  targeting.setTargetingForGPT = function(targetingConfig) {
    window.googletag.pubads().getSlots().forEach(slot => {
      Object.keys(targetingConfig).filter(isAdUnitCodeMatchingSlot(slot))
        .forEach(targetId =>
          Object.keys(targetingConfig[targetId]).forEach(key => {
            let valueArr = targetingConfig[targetId][key].split(',');
            valueArr = (valueArr.length > 1) ? [valueArr] : valueArr;
            valueArr.map((value) => {
              utils.logMessage(`Attempting to set key value for slot: ${slot.getSlotElementId()} key: ${key} value: ${value}`);
              return value;
            }).forEach(value => {
              slot.setTargeting(key, value);
            });
          })
        )
    })
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
    return auctionManager.getAdUnitCodes() || [];
  }

  function getBidsReceived() {
    return auctionManager.getBidsReceived()
      .filter(isUnusedBid)
      .filter(exports.isBidExpired)
  }

  /**
   * Returns top bids for a given adUnit or set of adUnits.
   * @param  {(string|string[])} adUnitCode adUnitCode or array of adUnitCodes
   * @return {[type]}            [description]
   */
  targeting.getWinningBids = function(adUnitCode) {
    const adUnitCodes = getAdUnitCodes(adUnitCode);

    return getBidsReceived()
      .filter(bid => includes(adUnitCodes, bid.adUnitCode))
      .filter(bid => bid.cpm > 0)
      .map(bid => bid.adUnitCode)
      .filter(uniques)
      .map(adUnitCode => getBidsReceived()
        .filter(bid => bid.adUnitCode === adUnitCode ? bid : null)
        .reduce(getHighestCpm, getEmptyBid(adUnitCode)));
  };

  /**
   * Sets targeting for AST
   */
  targeting.setTargetingForAst = function() {
    let astTargeting = targeting.getAllTargeting();
    Object.keys(astTargeting).forEach(targetId =>
      Object.keys(astTargeting[targetId]).forEach(key => {
        utils.logMessage(`Attempting to set targeting for targetId: ${targetId} key: ${key} value: ${astTargeting[targetId][key]}`);
        // setKeywords supports string and array as value
        if (utils.isStr(astTargeting[targetId][key]) || utils.isArray(astTargeting[targetId][key])) {
          let keywordsObj = {};
          let input = 'hb_adid';
          let nKey = (key.substring(0, input.length) === input) ? key.toUpperCase() : key;
          keywordsObj[nKey] = astTargeting[targetId][key];
          window.apntag.setKeywords(targetId, keywordsObj);
        }
      })
    );
  };

  /**
   * Get targeting key value pairs for winning bid.
   * @param {string[]}    AdUnit code array
   * @return {targetingArray}   winning bids targeting
   */
  function getWinningBidTargeting(adUnitCodes) {
    let winners = targeting.getWinningBids(adUnitCodes);
    winners.forEach((winner) => {
      winner.status = BID_TARGETING_SET;
    });

    // TODO : Add losing bids to pool from here ?
    let standardKeys = getStandardKeys();

    winners = winners.map(winner => {
      return {
        [winner.adUnitCode]: Object.keys(winner.adserverTargeting)
          .filter(key =>
            typeof winner.sendStandardTargeting === 'undefined' ||
            winner.sendStandardTargeting ||
            standardKeys.indexOf(key) === -1)
          .map(key => ({
            [(key === 'hb_deal') ? `${key}_${winner.bidderCode}`.substring(0, MAX_DFP_KEYLENGTH) : key.substring(0, MAX_DFP_KEYLENGTH)]: [winner.adserverTargeting[key]]
          }))
      };
    });

    return winners;
  }

  function getStandardKeys() {
    return auctionManager.getStandardBidderAdServerTargeting() // in case using a custom standard key set
      .map(targeting => targeting.key)
      .concat(CONSTANTS.TARGETING_KEYS).filter(uniques); // standard keys defined in the library.
  }

  /**
   * Merge custom adserverTargeting with same key name for same adUnitCode.
   * e.g: Appnexus defining custom keyvalue pair foo:bar and Rubicon defining custom keyvalue pair foo:baz will be merged to foo: ['bar','baz']
   *
   * @param {Object[]} acc Accumulator for reducer. It will store updated bidResponse objects
   * @param {Object} bid BidResponse
   * @param {number} index current index
   * @param {Array} arr original array
   */
  function mergeAdServerTargeting(acc, bid, index, arr) {
    function concatTargetingValue(key) {
      return function(currentBidElement) {
        if (!utils.isArray(currentBidElement.adserverTargeting[key])) {
          currentBidElement.adserverTargeting[key] = [currentBidElement.adserverTargeting[key]];
        }
        currentBidElement.adserverTargeting[key] = currentBidElement.adserverTargeting[key].concat(bid.adserverTargeting[key]).filter(uniques);
        delete bid.adserverTargeting[key];
      }
    }

    function hasSameAdunitCodeAndKey(key) {
      return function(currentBidElement) {
        return currentBidElement.adUnitCode === bid.adUnitCode && currentBidElement.adserverTargeting[key]
      }
    }

    Object.keys(bid.adserverTargeting)
      .filter(getCustomKeys())
      .forEach(key => {
        if (acc.length) {
          acc.filter(hasSameAdunitCodeAndKey(key))
            .forEach(concatTargetingValue(key));
        }
      });
    acc.push(bid);
    return acc;
  }

  function getCustomKeys() {
    let standardKeys = getStandardKeys();
    return function(key) {
      return standardKeys.indexOf(key) === -1;
    }
  }

  function truncateCustomKeys(bid) {
    return {
      [bid.adUnitCode]: Object.keys(bid.adserverTargeting)
        // Get only the non-standard keys of the losing bids, since we
        // don't want to override the standard keys of the winning bid.
        .filter(getCustomKeys())
        .map(key => {
          return {
            [key.substring(0, MAX_DFP_KEYLENGTH)]: [bid.adserverTargeting[key]]
          };
        })
    }
  }

  /**
   * Get custom targeting key value pairs for bids.
   * @param {string[]}    AdUnit code array
   * @return {targetingArray}   bids with custom targeting defined in bidderSettings
   */
  function getCustomBidTargeting(adUnitCodes) {
    return getBidsReceived()
      .filter(bid => includes(adUnitCodes, bid.adUnitCode))
      .map(bid => Object.assign({}, bid))
      .reduce(mergeAdServerTargeting, [])
      .map(truncateCustomKeys)
      .filter(bid => bid); // removes empty elements in array;
  }

  /**
   * Get targeting key value pairs for non-winning bids.
   * @param {string[]}    AdUnit code array
   * @return {targetingArray}   all non-winning bids targeting
   */
  function getBidLandscapeTargeting(adUnitCodes) {
    const standardKeys = CONSTANTS.TARGETING_KEYS.concat(NATIVE_TARGETING_KEYS);
    const bids = [];
    // bucket by adUnitcode
    let buckets = groupBy(getBidsReceived(), 'adUnitCode');
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
        [`${key}_${bid.bidderCode}`.substring(0, MAX_DFP_KEYLENGTH)]: [bid.adserverTargeting[key]]
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
  return targeting;
}

export const targeting = newTargeting(auctionManager);
