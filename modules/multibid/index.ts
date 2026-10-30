/**
 * This module adds Multibid support to prebid.js
 * @module modules/multibid
 */

import { config } from '../../src/config.js';
import { getHook, setupBeforeHookFnOnce } from '../../src/hook.js';
import { deepAccess, deepSetValue, getUniqueIdentifierStr, groupBy, logWarn } from '../../src/utils.js';
import * as events from '../../src/events.js';
import { EVENTS } from '../../src/constants.js';
import { addBidderRequests } from '../../src/auction.js';
import { auctionStore } from '../../libraries/weakStore/weakStore.js';
import { getHighestCpmBidsFromBidPool, sortByDealAndPriceBucketOrDesirability } from '../../src/targeting.js';
import { PBS, registerOrtbProcessor, REQUEST } from '../../src/pbjsORTB.js';
import { timedBidResponseHook } from '../../src/utils/perfMetrics.js';
import type { BidderCode } from "../../src/types/common.d.ts";
import {
  highestDesirabilityFirst,
  priorityCompare,
  reverseCompare,
  tiebreakCompare
} from '../../src/utils/reducers.js';

const MODULE_NAME = 'multibid';
let hasMultibid = false;
let multiConfig = {};
type MultibidUnit = { count: number, maxReached?: boolean };
const getMultibidUnits: (auctionId: string) => Record<string, Record<BidderCode, MultibidUnit>> | undefined = auctionStore();

type MultiBidConfig = ({
  /**
   * A bidder code.
   */
  bidder: BidderCode;
  bidders?: undefined
} | {
  /**
   * Multiple bidder codes.
   */
  bidders: BidderCode[];
  bidder?: undefined;
}) & {
  /**
   * The number of bids the named bidder(s) can supply. Max of 9.
   */
  maxBids: number;
  /**
   * An alternate (short) bidder code to send to the ad server. A number will be appended, starting from 2, e.g. hb_pb_PREFIX2.
   * If not provided, the extra bids will not go to the ad server.
   */
  targetBiddercodePrefix?: string;
};

declare module '../../src/config' {
  interface Config {
    multibid?: MultiBidConfig[];
  }
}

// Storing this globally on init for easy reference to configuration
config.getConfig(MODULE_NAME, conf => {
  if (!Array.isArray(conf.multibid) || !conf.multibid.length || !validateMultibid(conf.multibid)) return;

  resetMultiConfig();
  hasMultibid = true;

  conf.multibid.forEach(entry => {
    if (entry.bidder) {
      multiConfig[entry.bidder] = {
        maxbids: entry.maxBids,
        prefix: entry.targetBiddercodePrefix
      };
    } else {
      entry.bidders.forEach(key => {
        multiConfig[key] = {
          maxbids: entry.maxBids,
          prefix: entry.targetBiddercodePrefix
        };
      });
    }
  });
});

/**
 * @summary validates multibid configuration entries
 * @param {Object[]} conf - example [{bidder: 'bidderA', maxBids: 2, targetBiddercodePrefix: 'bidA'}, {bidder: 'bidderB', maxBids: 2}]
 * @return {Boolean}
 */
export function validateMultibid(conf) {
  let check = true;
  const duplicate = conf.filter(entry => {
    // Check if entry.bidder is not defined or typeof string, filter entry and reset configuration
    if ((!entry.bidder || typeof entry.bidder !== 'string') && (!entry.bidders || !Array.isArray(entry.bidders))) {
      logWarn('Filtering multibid entry. Missing required bidder or bidders property.');
      check = false;
      return false;
    }

    return true;
  }).map(entry => {
    if (!Number.isInteger(entry.maxBids) || entry.maxBids < 1 || entry.maxBids > 9) {
      entry.maxBids = typeof entry.maxBids !== 'number' || Number.isNaN(entry.maxBids) || entry.maxBids < 1 ? 1 : Math.min(9, Math.floor(entry.maxBids));
      check = false;
    }

    return entry;
  });

  if (!check) config.setConfig({ multibid: duplicate });

  return check;
}

/**
 * @summary addBidderRequests before hook
 * @param {Function} fn reference to original function (used by hook logic)
 * @param {Object[]} bidderRequests containing copy of each bidderRequest object
 */
export function adjustBidderRequestsHook(fn, bidderRequests) {
  bidderRequests.map(bidRequest => {
    // Loop through bidderRequests and check if bidderCode exists in multiconfig
    // If true, add bidderRequest.bidLimit to bidder request
    if (multiConfig[bidRequest.bidderCode]) {
      bidRequest.bidLimit = multiConfig[bidRequest.bidderCode].maxbids;
    }
    return bidRequest;
  });

  fn.call(this, bidderRequests);
}

declare module '../../src/bidfactory' {
  interface BaseBid {
    // TODO multibid alters bid's `requestId` and `bidderCode`, which is not
    // necessary if the objective is to just alter targeting.
    // is it desirable for e.g. analytics to see bogus bidder codes?
    multibidPrefix?: string;
    originalBidder?: BaseBid['bidderCode'];
    originalRequestId?: BaseBid['requestId'];
    targetingBidder?: string;
  }
}
/**
 * @summary addBidResponse before hook
 * @param {Function} fn reference to original function (used by hook logic)
 * @param {String} ad unit code for bid
 * @param {Object} bid object
 */
export const addBidResponseHook = timedBidResponseHook('multibid', function addBidResponseHook(fn, adUnitCode, bid, reject) {
  const floor = deepAccess(bid, 'floorData.floorValue');

  if (!config.getConfig('multibid')) resetMultiConfig();
  // Checks if multiconfig exists and bid bidderCode exists within config
  // Else continue with no modifications
  if (hasMultibid && multiConfig[bid.bidderCode]) {
    // Set property multibidPrefix on bid
    if (multiConfig[bid.bidderCode].prefix) bid.multibidPrefix = multiConfig[bid.bidderCode].prefix;
    bid.originalBidder = bid.bidderCode;
    const units = getMultibidUnits(bid.auctionId) ?? {};
    const unitPath = [adUnitCode, bid.bidderCode];
    const unit: MultibidUnit = deepAccess(units, unitPath);
    if (unit) {
      if (!unit.maxReached && (!floor || floor <= bid.cpm)) {
        bid.originalRequestId = bid.requestId;

        bid.requestId = getUniqueIdentifierStr();
        const length = ++unit.count;

        if (multiConfig[bid.bidderCode].prefix) bid.targetingBidder = multiConfig[bid.bidderCode].prefix + length;
        if (length === multiConfig[bid.bidderCode].maxbids) unit.maxReached = true;

        fn.call(this, adUnitCode, bid, reject);
      } else {
        logWarn(`Filtering multibid received from bidder ${bid.bidderCode}: ` + ((unit.maxReached) ? `Maximum bid limit reached for ad unit code ${adUnitCode}` : 'Bid cpm under floors value.'));
      }
    } else {
      deepSetValue(units, unitPath, { count: 1, maxReached: multiConfig[bid.bidderCode].maxbids === 1 });

      fn.call(this, adUnitCode, bid, reject);
    }
  } else {
    fn.call(this, adUnitCode, bid, reject);
  }
});

export function sortByMultibid(fallback) {
  const dealPrioritization = config.getConfig('sendBidsControl.dealPrioritization');
  return tiebreakCompare(reverseCompare(priorityCompare), aliasedBiddersFirst, dealPrioritization ? sortByDealAndPriceBucketOrDesirability(fallback) : fallback);
}

/**
 * A descending sort function that will sort the list of objects based on the following:
 *  - bids without dynamic aliases are sorted before bids with dynamic aliases
 */
export function aliasedBiddersFirst(a, b) {
  if (a.bidder !== a.bidderCode && b.bidder === b.bidderCode) {
    return 1;
  }

  if (a.bidder === a.bidderCode && b.bidder !== b.bidderCode) {
    return -1;
  }

  return 0;
}

/**
 * @summary getHighestCpmBidsFromBidPool before hook
 * @param {Function} fn reference to original function (used by hook logic)
 * @param {Object[]} bidsReceived array of objects containing all bids from bid pool
 * @param {Function} winReducer function to reduce to only highest cpm value for each bidderCode
 * @param {Number} adUnitBidLimit bidder targeting limit, default set to 0
 * @param {Boolean} hasModified default set to false, this hook modifies targeting and sets to true
 */
export function targetBidPoolHook(fn, bidsReceived, winReducer, adUnitBidLimit = 0, hasModified = false, winSorter = highestDesirabilityFirst) {
  if (!config.getConfig('multibid')) resetMultiConfig();
  if (hasMultibid) {
    const modifiedBids = [];
    const buckets = groupBy(bidsReceived, 'adUnitCode');
    Object.keys(buckets).forEach((slotId) => {
      let bucketBids = [];
      // Get bids and group by property originalBidder
      const bidsByBidderName = groupBy(buckets[slotId], 'originalBidder');
      const adjustedBids = [].concat(...Object.keys(bidsByBidderName).map(key => {
        // Reset all bidderCodes to original bidder values and sort by CPM
        return bidsByBidderName[key].sort((bidA, bidB) => {
          if (bidA.originalBidder && bidA.originalBidder !== bidA.bidderCode) bidA.bidderCode = bidA.originalBidder;
          if (bidA.originalBidder && bidB.originalBidder !== bidB.bidderCode) bidB.bidderCode = bidB.originalBidder;
          return winSorter(bidA, bidB);
        }).map((bid, index) => {
          // For each bid (post CPM sort), set dynamic bidderCode using prefix and index if less than maxbid amount
          if (deepAccess(multiConfig, `${bid.bidderCode}.prefix`) && index !== 0 && index < multiConfig[bid.bidderCode].maxbids) {
            bid.bidderCode = multiConfig[bid.bidderCode].prefix + (index + 1);
          }

          return bid;
        });
      }));
      // Get adjustedBids by bidderCode and reduce using highestCpmCallback
      const bidsByBidderCode = groupBy(adjustedBids, 'bidderCode');
      Object.keys(bidsByBidderCode).forEach(key => bucketBids.push(bidsByBidderCode[key].reduce(winReducer)));
      // if adUnitBidLimit is set, pass top N number bids
      const slotBidLimit = Number(typeof adUnitBidLimit === 'number' ? adUnitBidLimit : adUnitBidLimit?.[slotId]) || 0;
      if (slotBidLimit > 0) {
        bucketBids.sort(sortByMultibid(winSorter));
        modifiedBids.push(...bucketBids.slice(0, slotBidLimit));
      } else {
        modifiedBids.push(...bucketBids);
      }
    });
    const bids = modifiedBids;

    fn.call(this, bids, winReducer, adUnitBidLimit, true);
  } else {
    fn.call(this, bidsReceived, winReducer, adUnitBidLimit);
  }
}

/**
 * Resets globally stored multibid configuration
 */
export const resetMultiConfig = () => { hasMultibid = false; multiConfig = {}; };

/**
 * Set up hooks on init
 */
function init() {
  setupBeforeHookFnOnce(addBidderRequests, adjustBidderRequestsHook);
  getHook('addBidResponse').before(addBidResponseHook, 3);
  setupBeforeHookFnOnce(getHighestCpmBidsFromBidPool, targetBidPoolHook);
}

init();

export function setOrtbExtPrebidMultibid(ortbRequest) {
  const multibid = config.getConfig('multibid');
  if (multibid) {
    deepSetValue(ortbRequest, 'ext.prebid.multibid', multibid.map(o =>
      Object.fromEntries(Object.entries(o).map(([k, v]) => [k.toLowerCase(), v])))
    );
  }
}

registerOrtbProcessor({ type: REQUEST, name: 'extPrebidMultibid', fn: setOrtbExtPrebidMultibid, dialects: [PBS] });
