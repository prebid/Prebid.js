import { uniques, isGptPubadsDefined, getHighestCpm, getOldestHighestCpmBid, groupBy, isAdUnitCodeMatchingSlot, timestamp, deepAccess, deepClone, logError, logWarn, logInfo } from './utils.js';
import { config } from './config.js';
import { NATIVE_TARGETING_KEYS } from './native.js';
import { auctionManager } from './auctionManager.js';
import { sizeSupported } from './sizeMapping.js';
import { ADPOD } from './mediaTypes.js';
import includes from 'core-js-pure/features/array/includes.js';

const utils = require('./utils.js');
var CONSTANTS = require('./constants.json');

var pbTargetingKeys = [];

const MAX_DFP_KEYLENGTH = 20;
const TTL_BUFFER = 1000;

export const TARGETING_KEYS = Object.keys(CONSTANTS.TARGETING_KEYS).map(
  key => CONSTANTS.TARGETING_KEYS[key]
);

// return unexpired bids
const isBidNotExpired = (bid) => (bid.responseTimestamp + bid.ttl * 1000 + TTL_BUFFER) > timestamp();

// return bids whose status is not set. Winning bids can only have a status of `rendered`.
const isUnusedBid = (bid) => bid && ((bid.status && !includes([CONSTANTS.BID_STATUS.RENDERED], bid.status)) || !bid.status);

export let filters = {
  isBidNotExpired,
  isUnusedBid
};

// If two bids are found for same adUnitCode, we will use the highest one to take part in auction
// This can happen in case of concurrent auctions
// If adUnitBidLimit is set above 0 return top N number of bids
export function getHighestCpmBidsFromBidPool(bidsReceived, highestCpmCallback, adUnitBidLimit = 0) {
  const bids = [];
  const dealPrioritization = config.getConfig('sendBidsControl.dealPrioritization');
  // bucket by adUnitcode
  let buckets = groupBy(bidsReceived, 'adUnitCode');
  // filter top bid for each bucket by bidder
  Object.keys(buckets).forEach(bucketKey => {
    let bucketBids = [];
    let bidsByBidder = groupBy(buckets[bucketKey], 'bidderCode');
    Object.keys(bidsByBidder).forEach(key => bucketBids.push(bidsByBidder[key].reduce(highestCpmCallback)));
    // if adUnitBidLimit is set, pass top N number bids
    if (adUnitBidLimit > 0) {
      bucketBids = dealPrioritization ? bucketBids.sort(sortByDealAndPriceBucketOrCpm(true)) : bucketBids.sort((a, b) => b.cpm - a.cpm);
      bids.push(...bucketBids.slice(0, adUnitBidLimit));
    } else {
      bids.push(...bucketBids);
    }
  });
  return bids;
}

/**
* A descending sort function that will sort the list of objects based on the following two dimensions:
*  - bids with a deal are sorted before bids w/o a deal
*  - then sort bids in each grouping based on the hb_pb value
* eg: the following list of bids would be sorted like:
*  [{
*    "hb_adid": "vwx",
*    "hb_pb": "28",
*    "hb_deal": "7747"
*  }, {
*    "hb_adid": "jkl",
*    "hb_pb": "10",
*    "hb_deal": "9234"
*  }, {
*    "hb_adid": "stu",
*    "hb_pb": "50"
*  }, {
*    "hb_adid": "def",
*    "hb_pb": "2"
*  }]
*/
export function sortByDealAndPriceBucketOrCpm(useCpm = false) {
  return function(a, b) {
    if (a.adserverTargeting.hb_deal !== undefined && b.adserverTargeting.hb_deal === undefined) {
      return -1;
    }

    if ((a.adserverTargeting.hb_deal === undefined && b.adserverTargeting.hb_deal !== undefined)) {
      return 1;
    }

    // assuming both values either have a deal or don't have a deal - sort by the hb_pb param
    if (useCpm) {
      return b.cpm - a.cpm;
    }

    return b.adserverTargeting.hb_pb - a.adserverTargeting.hb_pb;
  }
}

/**
 * @typedef {Object.<string,string>} targeting
 * @property {string} targeting_key
 */

/**
 * @typedef {Object.<string,Object.<string,string[]>[]>[]} targetingArray
 */

export function newTargeting(auctionManager) {
  let targeting = {};
  let latestAuctionForAdUnit = {};

  targeting.setLatestAuctionForAdUnit = function(adUnitCode, auctionId) {
    latestAuctionForAdUnit[adUnitCode] = auctionId;
  };

  targeting.resetPresetTargeting = function(adUnitCode, customSlotMatching) {
    if (isGptPubadsDefined()) {
      const adUnitCodes = getAdUnitCodes(adUnitCode);
      const adUnits = auctionManager.getAdUnits().filter(adUnit => includes(adUnitCodes, adUnit.code));
      window.googletag.pubads().getSlots().forEach(slot => {
        let customSlotMatchingFunc = utils.isFn(customSlotMatching) && customSlotMatching(slot);
        pbTargetingKeys.forEach(function(key) {
          // reset only registered adunits
          adUnits.forEach(function(unit) {
            if (unit.code === slot.getAdUnitPath() ||
                unit.code === slot.getSlotElementId() ||
                (utils.isFn(customSlotMatchingFunc) && customSlotMatchingFunc(unit.code))) {
              slot.setTargeting(key, null);
            }
          });
        });
      });
    }
  };

  targeting.resetPresetTargetingAST = function(adUnitCode) {
    const adUnitCodes = getAdUnitCodes(adUnitCode);
    adUnitCodes.forEach(function(unit) {
      const astTag = window.apntag.getTag(unit);
      if (astTag && astTag.keywords) {
        const currentKeywords = Object.keys(astTag.keywords);
        const newKeywords = {};
        currentKeywords.forEach((key) => {
          if (!includes(pbTargetingKeys, key.toLowerCase())) {
            newKeywords[key] = astTag.keywords[key];
          }
        })
        window.apntag.modifyTag(unit, { keywords: newKeywords })
      }
    });
  };

  /**
   * checks if bid has targeting set and belongs based on matching ad unit codes
   * @return {boolean} true or false
   */
  function bidShouldBeAddedToTargeting(bid, adUnitCodes) {
    return bid.adserverTargeting && adUnitCodes &&
      ((utils.isArray(adUnitCodes) && includes(adUnitCodes, bid.adUnitCode)) ||
      (typeof adUnitCodes === 'string' && bid.adUnitCode === adUnitCodes));
  };

  /**
   * Returns targeting for any bids which have deals if alwaysIncludeDeals === true
   */
  function getDealBids(adUnitCodes, bidsReceived) {
    if (config.getConfig('targetingControls.alwaysIncludeDeals') === true) {
      const standardKeys = TARGETING_KEYS.concat(NATIVE_TARGETING_KEYS);

      // we only want the top bid from bidders who have multiple entries per ad unit code
      const bids = getHighestCpmBidsFromBidPool(bidsReceived, getHighestCpm);

      // populate targeting keys for the remaining bids if they have a dealId
      return bids.map(bid => {
        if (bid.dealId && bidShouldBeAddedToTargeting(bid, adUnitCodes)) {
          return {
            [bid.adUnitCode]: getTargetingMap(bid, standardKeys.filter(
              key => typeof bid.adserverTargeting[key] !== 'undefined')
            )
          };
        }
      }).filter(bid => bid); // removes empty elements in array
    }
    return [];
  };

  /**
   * Returns all ad server targeting for all ad units.
   * @param {string=} adUnitCode
   * @return {Object.<string,targeting>} targeting
   */
  targeting.getAllTargeting = function(adUnitCode, bidsReceived = getBidsReceived()) {
    const adUnitCodes = getAdUnitCodes(adUnitCode);

    // Get targeting for the winning bid. Add targeting for any bids that have
    // `alwaysUseBid=true`. If sending all bids is enabled, add targeting for losing bids.
    var targeting = getWinningBidTargeting(adUnitCodes, bidsReceived)
      .concat(getCustomBidTargeting(adUnitCodes, bidsReceived))
      .concat(config.getConfig('enableSendAllBids') ? getBidLandscapeTargeting(adUnitCodes, bidsReceived) : getDealBids(adUnitCodes, bidsReceived));

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

    const auctionKeysThreshold = config.getConfig('targetingControls.auctionKeyMaxChars');
    if (auctionKeysThreshold) {
      logInfo(`Detected 'targetingControls.auctionKeyMaxChars' was active for this auction; set with a limit of ${auctionKeysThreshold} characters.  Running checks on auction keys...`);
      targeting = filterTargetingKeys(targeting, auctionKeysThreshold);
    }

    // make sure at least there is a entry per adUnit code in the targetingSet so receivers of SET_TARGETING call's can know what ad units are being invoked
    adUnitCodes.forEach(code => {
      if (!targeting[code]) {
        targeting[code] = {};
      }
    });

    return targeting;
  };

  // create an encoded string variant based on the keypairs of the provided object
  //  - note this will encode the characters between the keys (ie = and &)
  function convertKeysToQueryForm(keyMap) {
    return Object.keys(keyMap).reduce(function (queryString, key) {
      let encodedKeyPair = `${key}%3d${encodeURIComponent(keyMap[key])}%26`;
      return queryString += encodedKeyPair;
    }, '');
  }

  function filterTargetingKeys(targeting, auctionKeysThreshold) {
    // read each targeting.adUnit object and sort the adUnits into a list of adUnitCodes based on priorization setting (eg CPM)
    let targetingCopy = deepClone(targeting);

    let targetingMap = Object.keys(targetingCopy).map(adUnitCode => {
      return {
        adUnitCode,
        adserverTargeting: targetingCopy[adUnitCode]
      };
    }).sort(sortByDealAndPriceBucketOrCpm());

    // iterate through the targeting based on above list and transform the keys into the query-equivalent and count characters
    return targetingMap.reduce(function (accMap, currMap, index, arr) {
      let adUnitQueryString = convertKeysToQueryForm(currMap.adserverTargeting);

      // for the last adUnit - trim last encoded ampersand from the converted query string
      if ((index + 1) === arr.length) {
        adUnitQueryString = adUnitQueryString.slice(0, -3);
      }

      // if under running threshold add to result
      let code = currMap.adUnitCode;
      let querySize = adUnitQueryString.length;
      if (querySize <= auctionKeysThreshold) {
        auctionKeysThreshold -= querySize;
        logInfo(`AdUnit '${code}' auction keys comprised of ${querySize} characters.  Deducted from running threshold; new limit is ${auctionKeysThreshold}`, targetingCopy[code]);

        accMap[code] = targetingCopy[code];
      } else {
        logWarn(`The following keys for adUnitCode '${code}' exceeded the current limit of the 'auctionKeyMaxChars' setting.\nThe key-set size was ${querySize}, the current allotted amount was ${auctionKeysThreshold}.\n`, targetingCopy[code]);
      }

      if ((index + 1) === arr.length && Object.keys(accMap).length === 0) {
        logError('No auction targeting keys were permitted due to the setting in setConfig(targetingControls.auctionKeyMaxChars).  Please review setup and consider adjusting.');
      }
      return accMap;
    }, {});
  }

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
  targeting.setTargetingForGPT = function(targetingConfig, customSlotMatching) {
    window.googletag.pubads().getSlots().forEach(slot => {
      Object.keys(targetingConfig).filter(customSlotMatching ? customSlotMatching(slot) : isAdUnitCodeMatchingSlot(slot))
        .forEach(targetId =>
          Object.keys(targetingConfig[targetId]).forEach(key => {
            let valueArr = targetingConfig[targetId][key];
            if (typeof valueArr === 'string') {
              valueArr = valueArr.split(',');
            }
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
    let bidsReceived = auctionManager.getBidsReceived();

    if (!config.getConfig('useBidCache')) {
      bidsReceived = bidsReceived.filter(bid => latestAuctionForAdUnit[bid.adUnitCode] === bid.auctionId)
    }

    bidsReceived = bidsReceived
      .filter(bid => deepAccess(bid, 'video.context') !== ADPOD)
      .filter(bid => bid.mediaType !== 'banner' || sizeSupported([bid.width, bid.height]))
      .filter(filters.isUnusedBid)
      .filter(filters.isBidNotExpired)
    ;

    return getHighestCpmBidsFromBidPool(bidsReceived, getOldestHighestCpmBid);
  }

  /**
   * Returns top bids for a given adUnit or set of adUnits.
   * @param  {(string|string[])} adUnitCode adUnitCode or array of adUnitCodes
   * @return {[type]}            [description]
   */
  targeting.getWinningBids = function(adUnitCode, bidsReceived = getBidsReceived()) {
    const adUnitCodes = getAdUnitCodes(adUnitCode);
    return bidsReceived
      .filter(bid => includes(adUnitCodes, bid.adUnitCode))
      .filter(bid => bid.cpm > 0)
      .map(bid => bid.adUnitCode)
      .filter(uniques)
      .map(adUnitCode => bidsReceived
        .filter(bid => bid.adUnitCode === adUnitCode ? bid : null)
        .reduce(getHighestCpm));
  };

  /**
   * @param  {(string|string[])} adUnitCode adUnitCode or array of adUnitCodes
   * Sets targeting for AST
   */
  targeting.setTargetingForAst = function(adUnitCodes) {
    let astTargeting = targeting.getAllTargeting(adUnitCodes);

    try {
      targeting.resetPresetTargetingAST(adUnitCodes);
    } catch (e) {
      utils.logError('unable to reset targeting for AST' + e)
    }

    Object.keys(astTargeting).forEach(targetId =>
      Object.keys(astTargeting[targetId]).forEach(key => {
        utils.logMessage(`Attempting to set targeting for targetId: ${targetId} key: ${key} value: ${astTargeting[targetId][key]}`);
        // setKeywords supports string and array as value
        if (utils.isStr(astTargeting[targetId][key]) || utils.isArray(astTargeting[targetId][key])) {
          let keywordsObj = {};
          let regex = /pt[0-9]/;
          if (key.search(regex) < 0) {
            keywordsObj[key.toUpperCase()] = astTargeting[targetId][key];
          } else {
            // pt${n} keys should not be uppercased
            keywordsObj[key] = astTargeting[targetId][key];
          }
          window.apntag.setKeywords(targetId, keywordsObj, { overrideKeyValue: true });
        }
      })
    );
  };

  /**
   * Get targeting key value pairs for winning bid.
   * @param {string[]}    AdUnit code array
   * @return {targetingArray}   winning bids targeting
   */
  function getWinningBidTargeting(adUnitCodes, bidsReceived) {
    let winners = targeting.getWinningBids(adUnitCodes, bidsReceived);
    let standardKeys = getStandardKeys();

    winners = winners.map(winner => {
      return {
        [winner.adUnitCode]: Object.keys(winner.adserverTargeting)
          .filter(key =>
            typeof winner.sendStandardTargeting === 'undefined' ||
            winner.sendStandardTargeting ||
            standardKeys.indexOf(key) === -1)
          .reduce((acc, key) => {
            const targetingValue = [winner.adserverTargeting[key]];
            const targeting = { [key.substring(0, MAX_DFP_KEYLENGTH)]: targetingValue };
            if (key === CONSTANTS.TARGETING_KEYS.DEAL) {
              const bidderCodeTargetingKey = `${key}_${winner.bidderCode}`.substring(0, MAX_DFP_KEYLENGTH);
              const bidderCodeTargeting = { [bidderCodeTargetingKey]: targetingValue };
              return [...acc, targeting, bidderCodeTargeting];
            }
            return [...acc, targeting];
          }, [])
      };
    });

    return winners;
  }

  function getStandardKeys() {
    return auctionManager.getStandardBidderAdServerTargeting() // in case using a custom standard key set
      .map(targeting => targeting.key)
      .concat(TARGETING_KEYS).filter(uniques); // standard keys defined in the library.
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
    let standardKeys = getStandardKeys().concat(NATIVE_TARGETING_KEYS);
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
  function getCustomBidTargeting(adUnitCodes, bidsReceived) {
    return bidsReceived
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
  function getBidLandscapeTargeting(adUnitCodes, bidsReceived) {
    const standardKeys = TARGETING_KEYS.concat(NATIVE_TARGETING_KEYS);
    const adUnitBidLimit = config.getConfig('sendBidsControl.bidLimit');
    const bids = getHighestCpmBidsFromBidPool(bidsReceived, getHighestCpm, adUnitBidLimit);

    // populate targeting keys for the remaining bids
    return bids.map(bid => {
      if (bidShouldBeAddedToTargeting(bid, adUnitCodes)) {
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

  return targeting;
}

export const targeting = newTargeting(auctionManager);
