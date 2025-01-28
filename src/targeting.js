import { auctionManager } from './auctionManager.js';
import { getBufferedTTL } from './bidTTL.js';
import { bidderSettings } from './bidderSettings.js';
import { config } from './config.js';
import {
  BID_STATUS,
  DEFAULT_TARGETING_KEYS,
  EVENTS,
  JSON_MAPPING,
  NATIVE_KEYS,
  STATUS,
  TARGETING_KEYS
} from './constants.js';
import * as events from './events.js';
import { hook } from './hook.js';
import { ADPOD } from './mediaTypes.js';
import { NATIVE_TARGETING_KEYS } from './native.js';
import { find, includes } from './polyfill.js';
import {
  deepAccess,
  deepClone,
  groupBy,
  isAdUnitCodeMatchingSlot,
  isArray,
  isFn,
  isGptPubadsDefined,
  isStr,
  logError,
  logInfo,
  logMessage,
  logWarn,
  sortByHighestCpm,
  timestamp,
  uniques,
} from './utils.js';
import { getHighestCpm, getOldestHighestCpmBid } from './utils/reducers.js';

var pbTargetingKeys = [];

const MAX_DFP_KEYLENGTH = 20;

const CFG_ALLOW_TARGETING_KEYS = `targetingControls.allowTargetingKeys`;
const CFG_ADD_TARGETING_KEYS = `targetingControls.addTargetingKeys`;
const TARGETING_KEY_CONFIGURATION_ERROR_MSG = `Only one of "${CFG_ALLOW_TARGETING_KEYS}" or "${CFG_ADD_TARGETING_KEYS}" can be set`;

export const TARGETING_KEYS_ARR = Object.keys(TARGETING_KEYS).map(
  key => TARGETING_KEYS[key]
);

// return unexpired bids
const isBidNotExpired = (bid) => (bid.responseTimestamp + getBufferedTTL(bid) * 1000) > timestamp();

// return bids whose status is not set. Winning bids can only have a status of `rendered`.
const isUnusedBid = (bid) => bid && ((bid.status && !includes([BID_STATUS.RENDERED], bid.status)) || !bid.status);

export let filters = {
  isActualBid(bid) {
    return bid.getStatusCode() === STATUS.GOOD
  },
  isBidNotExpired,
  isUnusedBid
};

export function isBidUsable(bid) {
  return !Object.values(filters).some((predicate) => !predicate(bid));
}

// If two bids are found for same adUnitCode, we will use the highest one to take part in auction
// This can happen in case of concurrent auctions
// If adUnitBidLimit is set above 0 return top N number of bids
export const getHighestCpmBidsFromBidPool = hook('sync', function(bidsReceived, winReducer, adUnitBidLimit = 0, hasModified = false, winSorter = sortByHighestCpm) {
  if (!hasModified) {
    const bids = [];
    const dealPrioritization = config.getConfig('sendBidsControl.dealPrioritization');
    // bucket by adUnitcode
    let buckets = groupBy(bidsReceived, 'adUnitCode');
    // filter top bid for each bucket by bidder
    Object.keys(buckets).forEach(bucketKey => {
      let bucketBids = [];
      let bidsByBidder = groupBy(buckets[bucketKey], 'bidderCode')
      Object.keys(bidsByBidder).forEach(key => { bucketBids.push(bidsByBidder[key].reduce(winReducer)) });
      // if adUnitBidLimit is set, pass top N number bids
      if (adUnitBidLimit) {
        bucketBids = dealPrioritization ? bucketBids.sort(sortByDealAndPriceBucketOrCpm(true)) : bucketBids.sort((a, b) => b.cpm - a.cpm);
        bids.push(...bucketBids.slice(0, adUnitBidLimit));
      } else {
        bucketBids = bucketBids.sort(winSorter)
        bids.push(...bucketBids);
      }
    });

    return bids;
  }

  return bidsReceived;
});

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
 * Return a map where each code in `adUnitCodes` maps to a list of GPT slots that match it.
 *
 * @param {Array<String>} adUnitCodes
 * @param customSlotMatching
 * @param getSlots
 * @return {Object.<string,any>}
 */
export function getGPTSlotsForAdUnits(adUnitCodes, customSlotMatching, getSlots = () => window.googletag.pubads().getSlots()) {
  return getSlots().reduce((auToSlots, slot) => {
    const customMatch = isFn(customSlotMatching) && customSlotMatching(slot);
    Object.keys(auToSlots).filter(isFn(customMatch) ? customMatch : isAdUnitCodeMatchingSlot(slot)).forEach(au => auToSlots[au].push(slot));
    return auToSlots;
  }, Object.fromEntries(adUnitCodes.map(au => [au, []])));
}

/**
 * Clears targeting for bids
 */
function clearTargeting(slot) {
  pbTargetingKeys.forEach(key => {
    if (slot.getTargeting(key)) {
      slot.clearTargeting(key)
    }
  })
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
      Object.values(getGPTSlotsForAdUnits(adUnitCodes, customSlotMatching)).forEach((slots) => {
        slots.forEach(slot => {
          clearTargeting(slot)
        })
      })
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

  function addBidToTargeting(bids, enableSendAllBids = false, deals = false) {
    const standardKeys = FEATURES.NATIVE ? TARGETING_KEYS_ARR.concat(NATIVE_TARGETING_KEYS) : TARGETING_KEYS_ARR.slice();
    const allowSendAllBidsTargetingKeys = config.getConfig('targetingControls.allowSendAllBidsTargetingKeys');

    const allowedSendAllBidTargeting = allowSendAllBidsTargetingKeys
      ? allowSendAllBidsTargetingKeys.map((key) => TARGETING_KEYS[key])
      : standardKeys;

    return bids.reduce((result, bid) => {
      if (enableSendAllBids || (deals && bid.dealId)) {
        const targetingValue = getTargetingMap(bid, standardKeys.filter(
          key => typeof bid.adserverTargeting[key] !== 'undefined' &&
          (deals || allowedSendAllBidTargeting.indexOf(key) !== -1)));

        if (targetingValue) {
          result.push({[bid.adUnitCode]: targetingValue})
        }
      }
      return result;
    }, []);
  }

  function getBidderTargeting(bids) {
    const alwaysIncludeDeals = config.getConfig('targetingControls.alwaysIncludeDeals');
    const enableSendAllBids = config.getConfig('enableSendAllBids');
    return addBidToTargeting(bids, enableSendAllBids, alwaysIncludeDeals);
  }

  /**
   * Returns filtered ad server targeting for custom and allowed keys.
   * @param {targetingArray} targeting
   * @param {string[]} allowedKeys
   * @return {targetingArray} filtered targeting
   */
  function getAllowedTargetingKeyValues(targeting, allowedKeys) {
    const defaultKeyring = Object.assign({}, TARGETING_KEYS, NATIVE_KEYS);
    const defaultKeys = Object.keys(defaultKeyring);
    const keyDispositions = {};
    logInfo(`allowTargetingKeys - allowed keys [ ${allowedKeys.map(k => defaultKeyring[k]).join(', ')} ]`);
    targeting.map(adUnit => {
      const adUnitCode = Object.keys(adUnit)[0];
      const keyring = adUnit[adUnitCode];
      const keys = keyring.filter(kvPair => {
        const key = Object.keys(kvPair)[0];
        // check if key is in default keys, if not, it's custom, we won't remove it.
        const isCustom = defaultKeys.filter(defaultKey => key.indexOf(defaultKeyring[defaultKey]) === 0).length === 0;
        // check if key explicitly allowed, if not, we'll remove it.
        const found = isCustom || find(allowedKeys, allowedKey => {
          const allowedKeyName = defaultKeyring[allowedKey];
          // we're looking to see if the key exactly starts with one of our default keys.
          // (which hopefully means it's not custom)
          const found = key.indexOf(allowedKeyName) === 0;
          return found;
        });
        keyDispositions[key] = !found;
        return found;
      });
      adUnit[adUnitCode] = keys;
    });
    const removedKeys = Object.keys(keyDispositions).filter(d => keyDispositions[d]);
    logInfo(`allowTargetingKeys - removed keys [ ${removedKeys.join(', ')} ]`);
    // remove any empty targeting objects, as they're unnecessary.
    const filteredTargeting = targeting.filter(adUnit => {
      const adUnitCode = Object.keys(adUnit)[0];
      const keyring = adUnit[adUnitCode];
      return keyring.length > 0;
    });
    return filteredTargeting
  }

  /**
   * Returns all ad server targeting for all ad units.
   * @param {string=} adUnitCode
   * @return {Object.<string,targeting>} targeting
   */
  targeting.getAllTargeting = function(adUnitCode, bidLimit, bidsReceived, winReducer = getHighestCpm, winSorter = sortByHighestCpm) {
    bidsReceived ||= getBidsReceived(winReducer, winSorter);
    const adUnitCodes = getAdUnitCodes(adUnitCode);
    const sendAllBids = config.getConfig('enableSendAllBids');
    const bidLimitConfigValue = config.getConfig('sendBidsControl.bidLimit');
    const adUnitBidLimit = (sendAllBids && (bidLimit || bidLimitConfigValue)) || 0;
    const { customKeysByUnit, filteredBids } = getfilteredBidsAndCustomKeys(adUnitCodes, bidsReceived);
    const bidsSorted = getHighestCpmBidsFromBidPool(filteredBids, winReducer, adUnitBidLimit, undefined, winSorter);
    let targeting = getTargetingLevels(bidsSorted, customKeysByUnit);

    const defaultKeys = Object.keys(Object.assign({}, DEFAULT_TARGETING_KEYS, NATIVE_KEYS));
    let allowedKeys = config.getConfig(CFG_ALLOW_TARGETING_KEYS);
    const addedKeys = config.getConfig(CFG_ADD_TARGETING_KEYS);

    if (addedKeys != null && allowedKeys != null) {
      throw new Error(TARGETING_KEY_CONFIGURATION_ERROR_MSG);
    } else if (addedKeys != null) {
      allowedKeys = defaultKeys.concat(addedKeys);
    } else {
      allowedKeys = allowedKeys || defaultKeys;
    }

    if (Array.isArray(allowedKeys) && allowedKeys.length > 0) {
      targeting = getAllowedTargetingKeyValues(targeting, allowedKeys);
    }

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

  function updatePBTargetingKeys(adUnitCode) {
    (Object.keys(adUnitCode)).forEach(key => {
      adUnitCode[key].forEach(targetKey => {
        const targetKeys = Object.keys(targetKey);
        if (pbTargetingKeys.indexOf(targetKeys[0]) === -1) {
          pbTargetingKeys = targetKeys.concat(pbTargetingKeys);
        }
      });
    });
  }

  function getTargetingLevels(bidsSorted, customKeysByUnit) {
    const targeting = getWinningBidTargeting(bidsSorted)
      .concat(getCustomBidTargeting(bidsSorted, customKeysByUnit))
      .concat(getBidderTargeting(bidsSorted))
      .concat(getAdUnitTargeting());

    targeting.forEach(adUnitCode => {
      updatePBTargetingKeys(adUnitCode);
    });

    return targeting;
  }

  function getfilteredBidsAndCustomKeys(adUnitCodes, bidsReceived) {
    const filteredBids = [];
    const customKeysByUnit = {};
    const alwaysIncludeDeals = config.getConfig('targetingControls.alwaysIncludeDeals');

    bidsReceived.forEach(bid => {
      const adUnitIsEligible = includes(adUnitCodes, bid.adUnitCode);
      const cpmAllowed = bidderSettings.get(bid.bidderCode, 'allowZeroCpmBids') === true ? bid.cpm >= 0 : bid.cpm > 0;
      const isPreferredDeal = alwaysIncludeDeals && bid.dealId;

      if (adUnitIsEligible && (isPreferredDeal || cpmAllowed)) {
        filteredBids.push(bid);
        Object.keys(bid.adserverTargeting)
          .filter(getCustomKeys())
          .forEach(key => {
            const truncKey = key.substring(0, MAX_DFP_KEYLENGTH);
            const data = customKeysByUnit[bid.adUnitCode] || {};
            const value = [bid.adserverTargeting[key]];

            if (data[truncKey]) {
              data[truncKey] = data[truncKey].concat(value).filter(uniques);
            } else {
              data[truncKey] = value;
            }

            customKeysByUnit[bid.adUnitCode] = data;
          })
      }
    });

    return {filteredBids, customKeysByUnit};
  }

  // warn about conflicting configuration
  config.getConfig('targetingControls', function (config) {
    if (deepAccess(config, CFG_ALLOW_TARGETING_KEYS) != null && deepAccess(config, CFG_ADD_TARGETING_KEYS) != null) {
      logError(TARGETING_KEY_CONFIGURATION_ERROR_MSG);
    }
  });

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
   *      "div-gpt-ad-1460505748561-0": [{"hb_bidder_appnexusAs": ["appnexusAst", "other"]}]
   *    }
   * ]
   * ```
   * Resulting array
   * ```
   * {
   *  "div-gpt-ad-1460505748561-0": {
   *    "hb_bidder": "appnexusAst",
   *    "hb_bidder_appnexusAs": "appnexusAst,other"
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
              [Object.keys(target)[0]]: target[Object.keys(target)[0]].join(',')
            };
          }).reduce((p, c) => Object.assign(c, p), {})
      };
    })

    targetingObj = targetingObj.reduce(function (accumulator, targeting) {
      var key = Object.keys(targeting)[0];
      accumulator[key] = Object.assign({}, accumulator[key], targeting[key]);
      return accumulator;
    }, {});

    return targetingObj;
  }

  targeting.setTargetingForGPT = hook('sync', function (adUnit, customSlotMatching) {
  // get our ad unit codes
    let targetingSet = targeting.getAllTargeting(adUnit);

    let resetMap = Object.fromEntries(pbTargetingKeys.map(key => [key, null]));

    Object.entries(getGPTSlotsForAdUnits(Object.keys(targetingSet), customSlotMatching)).forEach(([targetId, slots]) => {
      slots.forEach(slot => {
      // now set new targeting keys
        Object.keys(targetingSet[targetId]).forEach(key => {
          let value = targetingSet[targetId][key];
          if (typeof value === 'string' && value.indexOf(',') !== -1) {
          // due to the check the array will be formed only if string has ',' else plain string will be assigned as value
            value = value.split(',');
          }
          targetingSet[targetId][key] = value;
        });
        logMessage(`Attempting to set targeting-map for slot: ${slot.getSlotElementId()} with targeting-map:`, targetingSet[targetId]);
        slot.updateTargetingFromMap(Object.assign({}, resetMap, targetingSet[targetId]))
      })
    })

    Object.keys(targetingSet).forEach((adUnitCode) => {
      Object.keys(targetingSet[adUnitCode]).forEach((targetingKey) => {
        if (targetingKey === 'hb_adid') {
          auctionManager.setStatusForBids(targetingSet[adUnitCode][targetingKey], BID_STATUS.BID_TARGETING_SET);
        }
      });
    });

    targeting.targetingDone(targetingSet);

    // emit event
    events.emit(EVENTS.SET_TARGETING, targetingSet);
  }, 'setTargetingForGPT');

  targeting.targetingDone = hook('sync', function (targetingSet) {
    return targetingSet;
  }, 'targetingDone');

  /**
   * normlizes input to a `adUnit.code` array
   * @param  {(string|string[])} adUnitCode [description]
   * @return {string[]}     AdUnit code array
   */
  function getAdUnitCodes(adUnitCode) {
    if (typeof adUnitCode === 'string') {
      return [adUnitCode];
    } else if (isArray(adUnitCode)) {
      return adUnitCode;
    }
    return auctionManager.getAdUnitCodes() || [];
  }

  function getBidsReceived(winReducer = getOldestHighestCpmBid, winSorter = undefined) {
    let bidsReceived = auctionManager.getBidsReceived().reduce((bids, bid) => {
      const bidCacheEnabled = config.getConfig('useBidCache');
      const filterFunction = config.getConfig('bidCacheFilterFunction');
      const isBidFromLastAuction = latestAuctionForAdUnit[bid.adUnitCode] === bid.auctionId;
      const filterFunctionResult = bidCacheEnabled && !isBidFromLastAuction && typeof filterFunction === 'function' ? !!filterFunction(bid) : true;
      const cacheFilter = bidCacheEnabled || isBidFromLastAuction;
      const bidFilter = cacheFilter && filterFunctionResult;

      if (bidFilter && deepAccess(bid, 'video.context') !== ADPOD && isBidUsable(bid)) {
        bid.latestTargetedAuctionId = latestAuctionForAdUnit[bid.adUnitCode];
        bids.push(bid)
      }

      return bids;
    }, []);

    return getHighestCpmBidsFromBidPool(bidsReceived, winReducer, undefined, undefined, undefined, winSorter);
  }

  /**
   * Returns top bids for a given adUnit or set of adUnits.
   * @param  {(string|string[])} adUnitCode adUnitCode or array of adUnitCodes
   * @param  {(Array|undefined)} bids - The received bids, defaulting to the result of getBidsReceived().
   * @param  {function(Array<Object>): Array<Object>} [winReducer = getHighestCpm] - reducer method
   * @param  {function(Array<Object>): Array<Object>} [winSorter = sortByHighestCpm] - sorter method
   * @return {Array<Object>} - An array of winning bids.
   */
  targeting.getWinningBids = function(adUnitCode, bids, winReducer = getHighestCpm, winSorter = sortByHighestCpm) {
    const usedCodes = [];
    const bidsReceived = bids || getBidsReceived(winReducer, winSorter);
    const adUnitCodes = getAdUnitCodes(adUnitCode);

    return bidsReceived
      .reduce((result, bid) => {
        const code = bid.adUnitCode;
        const cpmEligible = bidderSettings.get(code, 'allowZeroCpmBids') === true ? bid.cpm >= 0 : bid.cpm > 0;
        const isPreferredDeal = config.getConfig('targetingControls.alwaysIncludeDeals') && bid.dealId;
        const eligible = includes(adUnitCodes, code) &&
          !includes(usedCodes, code) &&
          (isPreferredDeal || cpmEligible)
        if (eligible) {
          result.push(bid);
          usedCodes.push(code);
        }

        return result;
      }, []);
  };

  /**
   * @param  {(string|string[])} adUnitCodes adUnitCode or array of adUnitCodes
   * Sets targeting for AST
   */
  targeting.setTargetingForAst = function(adUnitCodes) {
    let astTargeting = targeting.getAllTargeting(adUnitCodes);

    try {
      targeting.resetPresetTargetingAST(adUnitCodes);
    } catch (e) {
      logError('unable to reset targeting for AST' + e)
    }

    Object.keys(astTargeting).forEach(targetId =>
      Object.keys(astTargeting[targetId]).forEach(key => {
        logMessage(`Attempting to set targeting for targetId: ${targetId} key: ${key} value: ${astTargeting[targetId][key]}`);
        // setKeywords supports string and array as value
        if (isStr(astTargeting[targetId][key]) || isArray(astTargeting[targetId][key])) {
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
   * @param {Array<Object>} bidsReceived code array
   * @return {targetingArray} winning bids targeting
   */
  function getWinningBidTargeting(bidsReceived) {
    let usedAdUnitCodes = [];
    let winners = bidsReceived
      .reduce((bids, bid) => {
        if (!includes(usedAdUnitCodes, bid.adUnitCode)) {
          bids.push(bid);
          usedAdUnitCodes.push(bid.adUnitCode);
        }
        return bids;
      }, []);

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
            if (key === TARGETING_KEYS.DEAL) {
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
      .concat(TARGETING_KEYS_ARR).filter(uniques); // standard keys defined in the library.
  }

  function getCustomKeys() {
    let standardKeys = getStandardKeys();
    if (FEATURES.NATIVE) {
      standardKeys = standardKeys.concat(NATIVE_TARGETING_KEYS);
    }
    return function(key) {
      return standardKeys.indexOf(key) === -1;
    }
  }

  /**
   * Get custom targeting key value pairs for bids.
   * @param {Array<Object>} bidsSorted code array
   * @param {Object} customKeysByUnit code array
   * @return {targetingArray} bids with custom targeting defined in bidderSettings
   */
  function getCustomBidTargeting(bidsSorted, customKeysByUnit) {
    return bidsSorted
      .reduce((acc, bid) => {
        const newBid = Object.assign({}, bid);
        const customKeysForUnit = customKeysByUnit[newBid.adUnitCode];
        const targeting = [];

        if (customKeysForUnit) {
          Object.keys(customKeysForUnit).forEach(key => {
            if (key && customKeysForUnit[key]) targeting.push({[key]: customKeysForUnit[key]});
          })
        }

        acc.push({[newBid.adUnitCode]: targeting});

        return acc;
      }, []);
  }

  function getTargetingMap(bid, keys) {
    return keys.reduce((targeting, key) => {
      const value = bid.adserverTargeting[key];
      if (value) {
        targeting.push({[`${key}_${bid.bidderCode}`.substring(0, MAX_DFP_KEYLENGTH)]: [bid.adserverTargeting[key]]})
      }
      return targeting;
    }, []);
  }

  function getAdUnitTargeting() {
    function getTargetingObj(adUnit) {
      return deepAccess(adUnit, JSON_MAPPING.ADSERVER_TARGETING);
    }

    function getTargetingValues(adUnit) {
      const aut = getTargetingObj(adUnit);

      return Object.keys(aut)
        .map(function(key) {
          if (isStr(aut[key])) aut[key] = aut[key].split(',').map(s => s.trim());
          if (!isArray(aut[key])) aut[key] = [ aut[key] ];
          return { [key]: aut[key] };
        });
    }

    return auctionManager.getAdUnits()
      .filter(adUnit => getTargetingObj(adUnit))
      .reduce((result, adUnit) => {
        const targetingValues = getTargetingValues(adUnit);

        if (targetingValues)result.push({[adUnit.code]: targetingValues});
        return result;
      }, []);
  }

  targeting.isApntagDefined = function() {
    if (window.apntag && isFn(window.apntag.setKeywords)) {
      return true;
    }
  };

  return targeting;
}

export const targeting = newTargeting(auctionManager);
