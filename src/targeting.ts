import {auctionManager} from './auctionManager.js';
import {getBufferedTTL} from './bidTTL.js';
import {bidderSettings} from './bidderSettings.js';
import {config} from './config.js';
import {BID_STATUS, DEFAULT_TARGETING_KEYS, EVENTS, JSON_MAPPING, TARGETING_KEYS} from './constants.js';
import * as events from './events.js';
import {hook} from './hook.js';
import {ADPOD} from './mediaTypes.js';
import {
  deepAccess,
  deepClone,
  groupBy,
  isAdUnitCodeMatchingSlot,
  isArray,
  isFn,
  isStr,
  logError,
  logInfo,
  logMessage,
  logWarn,
  sortByHighestCpm,
  timestamp,
  uniques,
} from './utils.js';
import {getHighestCpm, getOldestHighestCpmBid} from './utils/reducers.js';
import type {Bid} from './bidfactory.ts';
import type {AdUnitCode, ByAdUnit, Identifier} from './types/common.d.ts';
import type {DefaultTargeting} from './auction.ts';
import {lock} from "./targeting/lock.ts";

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
const isUnusedBid = (bid) => bid && ((bid.status && ![BID_STATUS.RENDERED].includes(bid.status)) || !bid.status);

const isBidNotLocked = (bid) => !lock.isLocked(bid.adserverTargeting);

export const filters = {
  isBidNotExpired,
  isUnusedBid,
  isBidNotLocked
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
    const buckets = groupBy(bidsReceived, 'adUnitCode');
    // filter top bid for each bucket by bidder
    Object.keys(buckets).forEach(bucketKey => {
      let bucketBids = [];
      const bidsByBidder = groupBy(buckets[bucketKey], 'bidderCode')
      Object.keys(bidsByBidder).forEach(key => { bucketBids.push(bidsByBidder[key].reduce(winReducer)) });
      // if adUnitBidLimit is set, pass top N number bids
      const bidLimit = typeof adUnitBidLimit === 'object' ? adUnitBidLimit[bucketKey] : adUnitBidLimit;
      if (bidLimit) {
        bucketBids = dealPrioritization ? bucketBids.sort(sortByDealAndPriceBucketOrCpm(true)) : bucketBids.sort((a, b) => b.cpm - a.cpm);
        bids.push(...bucketBids.slice(0, bidLimit));
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
 * @param adUnitCodes
 * @param customSlotMatching
 * @param getSlots
 */
export function getGPTSlotsForAdUnits(adUnitCodes: AdUnitCode[], customSlotMatching, getSlots = () => window.googletag.pubads().getSlots()): ByAdUnit<googletag.Slot[]> {
  return getSlots().reduce((auToSlots, slot) => {
    const customMatch = isFn(customSlotMatching) && customSlotMatching(slot);
    Object.keys(auToSlots).filter(isFn(customMatch) ? customMatch : isAdUnitCodeMatchingSlot(slot)).forEach(au => auToSlots[au].push(slot));
    return auToSlots;
  }, Object.fromEntries(adUnitCodes.map(au => [au, []])));
}
/* *
  * Returns a map of adUnitCodes to their bid limits. If sendAllBids is disabled, all adUnits will have a bid limit of 0.
  * If sendAllBids is enabled, the bid limit for each adUnit will be determined by the following precedence:
  * 1. The bidLimit property of the adUnit object
  * 2. The bidLimit parameter passed to this function
  * 3. The global sendBidsControl.bidLimit config property
  *
  * @param adUnitCodes
  * @param bidLimit
  */
export function getAdUnitBidLimitMap(adUnitCodes: AdUnitCode[], bidLimit: number): ByAdUnit<number> | number {
  if (!config.getConfig('enableSendAllBids')) return 0;
  const bidLimitConfigValue = config.getConfig('sendBidsControl.bidLimit');
  const adUnitCodesSet = new Set(adUnitCodes);

  const result: ByAdUnit<number> = {};
  for (const au of auctionManager.getAdUnits()) {
    if (adUnitCodesSet.has(au.code)) {
      result[au.code] = au?.bidLimit || bidLimit || bidLimitConfigValue;
    }
  }

  return result;
}

export type TargetingMap<V> = Partial<DefaultTargeting> & {
  [targetingKey: string]: V
}

export type TargetingValues = TargetingMap<string>;
type GPTTargetingValues = TargetingMap<string | string[]>;

type TargetingValueLists = TargetingMap<string[]>;
type TargetingArray = ByAdUnit<TargetingValueLists[]>[];

type AdUnitPredicate = (adUnitCode: AdUnitCode) => boolean;
export type SlotMatchingFn = (slot: googletag.Slot) => AdUnitPredicate;

declare module './events' {
  interface Events {
    [EVENTS.SET_TARGETING]: [ByAdUnit<GPTTargetingValues>];
  }
}

export interface TargetingControlsConfig {
  /**
   * Specifies the maximum number of characters the system can add to ad server targeting.
   */
  auctionKeyMaxChars?: number;
  /**
   * If enableSendAllBids is false, set this value to true to ensure that deals are sent along with the winning bid
   */
  alwaysIncludeDeals?: boolean;
  /**
   * Selects supported default targeting keys.
   */
  allowTargetingKeys?: (keyof typeof TARGETING_KEYS)[];
  /**
   * Selects targeting keys to be supported in addition to the default ones
   */
  addTargetingKeys?: (keyof typeof TARGETING_KEYS)[];
  /**
   * Selects supported default targeting keys.
   */
  allowSendAllBidsTargetingKeys?: (keyof typeof TARGETING_KEYS)[];
  /**
   * Set to false to prevent custom targeting values from being set for non-winning bids
   */
  allBidsCustomTargeting?: boolean
  /**
   * The value to set for 'hb_ver'. Set to false to disable.
   */
  version?: false | string;
}

const DEFAULT_HB_VER = '1.17.2';

declare module './config' {
  interface Config {
    targetingControls?: TargetingControlsConfig;
  }
}

export function newTargeting(auctionManager) {
  const latestAuctionForAdUnit = {};

  const targeting = {
    setLatestAuctionForAdUnit(adUnitCode: AdUnitCode, auctionId: Identifier) {
      latestAuctionForAdUnit[adUnitCode] = auctionId;
    },

    resetPresetTargetingAST(adUnitCode?: AdUnitCode | AdUnitCode[]) {
      const adUnitCodes = getAdUnitCodes(adUnitCode);
      adUnitCodes.forEach(function(unit) {
        const astTag = window.apntag.getTag(unit);
        if (astTag && astTag.keywords) {
          const currentKeywords = Object.keys(astTag.keywords);
          const newKeywords = {};
          currentKeywords.forEach((key) => {
            if (!pbTargetingKeys.includes(key.toLowerCase())) {
              newKeywords[key] = astTag.keywords[key];
            }
          })
          window.apntag.modifyTag(unit, { keywords: newKeywords })
        }
      });
    },

    /**
     * Returns all ad server targeting for all ad units.
     * @param adUnitCode
     * @param bidLimit
     * @param bidsReceived - The received bids, defaulting to the result of getBidsReceived().
     * @param [winReducer = getHighestCpm] - reducer method
     * @param [winSorter = sortByHighestCpm] - sorter method
     * @return targeting
     */
    getAllTargeting(adUnitCode?: AdUnitCode | AdUnitCode[], bidLimit?: number, bidsReceived?: Bid[], winReducer = getHighestCpm, winSorter = sortByHighestCpm): ByAdUnit<TargetingValues> {
      bidsReceived ||= getBidsReceived(winReducer, winSorter);
      const adUnitCodes = getAdUnitCodes(adUnitCode);
      const adUnitBidLimit = getAdUnitBidLimitMap(adUnitCodes, bidLimit);
      const { customKeysByUnit, filteredBids } = getfilteredBidsAndCustomKeys(adUnitCodes, bidsReceived);
      const bidsSorted = getHighestCpmBidsFromBidPool(filteredBids, winReducer, adUnitBidLimit, undefined, winSorter);
      let targeting = getTargetingLevels(bidsSorted, customKeysByUnit, adUnitCodes);

      const defaultKeys = Object.keys(Object.assign({}, DEFAULT_TARGETING_KEYS));
      let allowedKeys = config.getConfig(CFG_ALLOW_TARGETING_KEYS);
      const addedKeys = config.getConfig(CFG_ADD_TARGETING_KEYS);

      if (addedKeys != null && allowedKeys != null) {
        throw new Error(TARGETING_KEY_CONFIGURATION_ERROR_MSG);
      } else if (addedKeys != null) {
        allowedKeys = defaultKeys.concat(addedKeys) as any;
      } else {
        allowedKeys = allowedKeys || defaultKeys as any;
      }

      if (Array.isArray(allowedKeys) && allowedKeys.length > 0) {
        targeting = getAllowedTargetingKeyValues(targeting, allowedKeys);
      }

      let flatTargeting = flattenTargeting(targeting);

      const auctionKeysThreshold = config.getConfig('targetingControls.auctionKeyMaxChars');
      if (auctionKeysThreshold) {
        logInfo(`Detected 'targetingControls.auctionKeyMaxChars' was active for this auction; set with a limit of ${auctionKeysThreshold} characters.  Running checks on auction keys...`);
        flatTargeting = filterTargetingKeys(flatTargeting, auctionKeysThreshold);
      }

      adUnitCodes.forEach(code => {
        // make sure at least there is a entry per adUnit code in the targetingSet so receivers of SET_TARGETING call's can know what ad units are being invoked
        if (!flatTargeting[code]) {
          flatTargeting[code] = {};
        }
        // do not send just "hb_ver"
        if (Object.keys(flatTargeting[code]).length === 1 && flatTargeting[code][TARGETING_KEYS.VERSION] != null) {
          delete flatTargeting[code][TARGETING_KEYS.VERSION];
        }
      });

      return flatTargeting;
    },

    setTargetingForGPT: hook('sync', function (adUnit?: AdUnitCode | AdUnitCode[], customSlotMatching?: SlotMatchingFn) {
      // get our ad unit codes
      const targetingSet: ByAdUnit<GPTTargetingValues> = targeting.getAllTargeting(adUnit);

      const resetMap = Object.fromEntries(pbTargetingKeys.map(key => [key, null]));

      Object.entries(getGPTSlotsForAdUnits(Object.keys(targetingSet), customSlotMatching)).forEach(([targetId, slots]) => {
        slots.forEach(slot => {
          // now set new targeting keys
          Object.keys(targetingSet[targetId]).forEach(key => {
            let value: string | string[] = targetingSet[targetId][key];
            if (typeof value === 'string' && value.indexOf(',') !== -1) {
              // due to the check the array will be formed only if string has ',' else plain string will be assigned as value
              value = value.split(',');
            }
            targetingSet[targetId][key] = value;
          });
          logMessage(`Attempting to set targeting-map for slot: ${slot.getSlotElementId()} with targeting-map:`, targetingSet[targetId]);
          slot.updateTargetingFromMap(Object.assign({}, resetMap, targetingSet[targetId]))
          lock.lock(targetingSet[targetId]);
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
    }, 'setTargetingForGPT'),

    targetingDone: hook('sync', function (targetingSet: ByAdUnit<GPTTargetingValues>) {
      return targetingSet;
    }, 'targetingDone'),

    /**
     * Returns top bids for a given adUnit or set of adUnits.
     * @param  adUnitCode adUnitCode or array of adUnitCodes
     * @param  bids - The received bids, defaulting to the result of getBidsReceived().
     * @param  [winReducer = getHighestCpm] - reducer method
     * @param  [winSorter = sortByHighestCpm] - sorter method
     * @return An array of winning bids.
     */
    getWinningBids(adUnitCode: AdUnitCode | AdUnitCode[], bids?: Bid[], winReducer = getHighestCpm, winSorter = sortByHighestCpm): Bid[] {
      const bidsReceived = bids || getBidsReceived(winReducer, winSorter);
      const adUnitCodes = getAdUnitCodes(adUnitCode);

      return bidsReceived
        .filter(bid => adUnitCodes.includes(bid.adUnitCode))
        .filter(bid => (bidderSettings.get(bid.bidderCode, 'allowZeroCpmBids') === true) ? bid.cpm >= 0 : bid.cpm > 0)
        .map(bid => bid.adUnitCode)
        .filter(uniques)
        .map(adUnitCode => bidsReceived
          .filter(bid => bid.adUnitCode === adUnitCode ? bid : null)
          .reduce(getHighestCpm));
    },

    /**
     * @param  adUnitCodes adUnitCode or array of adUnitCodes
     * Sets targeting for AST
     */
    setTargetingForAst(adUnitCodes?: AdUnitCode | AdUnitCode[]) {
      const astTargeting = targeting.getAllTargeting(adUnitCodes);

      try {
        targeting.resetPresetTargetingAST(adUnitCodes);
      } catch (e) {
        logError('unable to reset targeting for AST' + e)
      }

      Object.keys(astTargeting).forEach(targetId => {
        lock.lock(astTargeting[targetId]);
        Object.keys(astTargeting[targetId]).forEach(key => {
          logMessage(`Attempting to set targeting for targetId: ${targetId} key: ${key} value: ${astTargeting[targetId][key]}`);
          // setKeywords supports string and array as value
          if (isStr(astTargeting[targetId][key]) || isArray(astTargeting[targetId][key])) {
            const keywordsObj = {};
            const regex = /pt[0-9]/;
            if (key.search(regex) < 0) {
              keywordsObj[key.toUpperCase()] = astTargeting[targetId][key];
            } else {
              // pt${n} keys should not be uppercased
              keywordsObj[key] = astTargeting[targetId][key];
            }
            window.apntag.setKeywords(targetId, keywordsObj, {overrideKeyValue: true});
          }
        })
      }
      );
    },
    isApntagDefined() {
      if (window.apntag && isFn(window.apntag.setKeywords)) {
        return true;
      }
    },
  }

  function addBidToTargeting(bids, enableSendAllBids = false, deals = false): TargetingArray {
    const standardKeys = TARGETING_KEYS_ARR.slice();
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
   * @param targeting
   * @param allowedKeys
   * @return filtered targeting
   */
  function getAllowedTargetingKeyValues(targeting: TargetingArray, allowedKeys: string[]): TargetingArray {
    const defaultKeyring = Object.assign({}, TARGETING_KEYS);
    const defaultKeys = Object.keys(TARGETING_KEYS);
    const keyDispositions = {};
    logInfo(`allowTargetingKeys - allowed keys [ ${allowedKeys.map(k => defaultKeyring[k]).join(', ')} ]`);
    targeting.forEach(adUnit => {
      const adUnitCode = Object.keys(adUnit)[0];
      const keyring = adUnit[adUnitCode];
      const keys = keyring.filter(kvPair => {
        const key = Object.keys(kvPair)[0];
        // check if key is in default keys, if not, it's custom, we won't remove it.
        const isCustom = defaultKeys.filter(defaultKey => key.indexOf(defaultKeyring[defaultKey]) === 0).length === 0;
        // check if key explicitly allowed, if not, we'll remove it.
        const found = isCustom || allowedKeys.find(allowedKey => {
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

  function getTargetingLevels(bidsSorted, customKeysByUnit, adUnitCodes) {
    const useAllBidsCustomTargeting = config.getConfig('targetingControls.allBidsCustomTargeting') === true;
    const targeting = getWinningBidTargeting(bidsSorted, adUnitCodes)
      .concat(getBidderTargeting(bidsSorted))
      .concat(getAdUnitTargeting(adUnitCodes))
      .concat(getVersionTargeting(adUnitCodes));

    if (useAllBidsCustomTargeting) {
      targeting.push(...getCustomBidTargeting(bidsSorted, customKeysByUnit))
    }

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
      const adUnitIsEligible = adUnitCodes.includes(bid.adUnitCode);
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
      const encodedKeyPair = `${key}%3d${encodeURIComponent(keyMap[key])}%26`;
      queryString += encodedKeyPair;
      return queryString;
    }, '');
  }

  function filterTargetingKeys(targeting: ByAdUnit<TargetingValues>, auctionKeysThreshold: number) {
    // read each targeting.adUnit object and sort the adUnits into a list of adUnitCodes based on priorization setting (eg CPM)
    const targetingCopy = deepClone(targeting);

    const targetingMap = Object.keys(targetingCopy).map(adUnitCode => {
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
      const code = currMap.adUnitCode;
      const querySize = adUnitQueryString.length;
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
   * @param targeting
   * @return targeting
   */
  function flattenTargeting(targeting: TargetingArray): ByAdUnit<TargetingValues> {
    return targeting.map(targeting => {
      return {
        [Object.keys(targeting)[0]]: targeting[Object.keys(targeting)[0]]
          .map(target => {
            return {
              [Object.keys(target)[0]]: target[Object.keys(target)[0]].join(',')
            };
          }).reduce((p, c) => Object.assign(c, p), {})
      };
    }).reduce(function (accumulator, targeting) {
      var key = Object.keys(targeting)[0];
      accumulator[key] = Object.assign({}, accumulator[key], targeting[key]);
      return accumulator;
    }, {});
  }

  /**
   * normlizes input to a `adUnit.code` array
   * @param  adUnitCode
   * @return AdUnit code array
   */
  function getAdUnitCodes(adUnitCode?: AdUnitCode | AdUnitCode[]): AdUnitCode[] {
    if (typeof adUnitCode === 'string') {
      return [adUnitCode];
    } else if (isArray(adUnitCode)) {
      return adUnitCode;
    }
    return auctionManager.getAdUnitCodes() || [];
  }

  function getBidsReceived(winReducer = getOldestHighestCpmBid, winSorter = undefined) {
    const bidsReceived = auctionManager.getBidsReceived().reduce((bids, bid) => {
      const bidCacheEnabled = config.getConfig('useBidCache');
      const filterFunction = config.getConfig('bidCacheFilterFunction');
      const isBidFromLastAuction = latestAuctionForAdUnit[bid.adUnitCode] === bid.auctionId;
      const filterFunctionResult = bidCacheEnabled && !isBidFromLastAuction && typeof filterFunction === 'function' ? !!filterFunction(bid) : true;
      const cacheFilter = bidCacheEnabled || isBidFromLastAuction;
      const bidFilter = cacheFilter && filterFunctionResult;

      if (bidFilter && bid?.video?.context !== ADPOD && isBidUsable(bid)) {
        bid.latestTargetedAuctionId = latestAuctionForAdUnit[bid.adUnitCode];
        bids.push(bid)
      }

      return bids;
    }, []);

    return getHighestCpmBidsFromBidPool(bidsReceived, winReducer, undefined, undefined, winSorter);
  }

  /**
   * Get targeting key value pairs for winning bid.
   * @param bidsReceived code array
   * @param adUnitCodes code array
   * @return winning bids targeting
   */
  function getWinningBidTargeting(bidsReceived, adUnitCodes): TargetingArray {
    const winners = targeting.getWinningBids(adUnitCodes, bidsReceived);
    const standardKeys = getStandardKeys();

    return winners.map(winner => {
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
  }

  function getStandardKeys() {
    return auctionManager.getStandardBidderAdServerTargeting() // in case using a custom standard key set
      .map(targeting => targeting.key)
      .concat(TARGETING_KEYS_ARR).filter(uniques); // standard keys defined in the library.
  }

  function getCustomKeys() {
    const standardKeys = getStandardKeys();
    return function(key) {
      return standardKeys.indexOf(key) === -1;
    }
  }

  /**
   * Get custom targeting key value pairs for bids.
   * @param {Array<Object>} bidsSorted code array
   * @param {Object} customKeysByUnit code array
   * @return bids with custom targeting defined in bidderSettings
   */
  function getCustomBidTargeting(bidsSorted: Bid[], customKeysByUnit: ByAdUnit<any>): TargetingArray {
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

  function getTargetingMap(bid: Bid, keys: string[]): TargetingValueLists[] {
    return keys.reduce((targeting, key) => {
      const value = bid.adserverTargeting[key];
      if (value) {
        targeting.push({[`${key}_${bid.bidderCode}`.substring(0, MAX_DFP_KEYLENGTH)]: [bid.adserverTargeting[key]]})
      }
      return targeting;
    }, []);
  }

  function getVersionTargeting(adUnitCodes) {
    let version = config.getConfig('targetingControls.version');
    if (version === false) return [];
    return adUnitCodes.map(au => ({[au]: [{[TARGETING_KEYS.VERSION]: [version ?? DEFAULT_HB_VER]}]}));
  }

  function getAdUnitTargeting(adUnitCodes) {
    function getTargetingObj(adUnit) {
      return adUnit?.[JSON_MAPPING.ADSERVER_TARGETING];
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
      .filter(adUnit => adUnitCodes.includes(adUnit.code) && getTargetingObj(adUnit))
      .reduce((result, adUnit) => {
        const targetingValues = getTargetingValues(adUnit);

        if (targetingValues)result.push({[adUnit.code]: targetingValues});
        return result;
      }, []);
  }

  return targeting;
}

export const targeting = newTargeting(auctionManager);
