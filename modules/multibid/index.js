

import {config} from '../../src/config.js';
import {setupBeforeHookFnOnce} from '../../src/hook.js';
import * as utils from '../../src/utils.js';
import events from '../../src/events.js';
import CONSTANTS from '../../src/constants.json';
import {addBidderRequests, addBidResponse} from '../../src/auction.js';
import {getHighestCpmBidsFromBidPool, sortByDealAndPriceBucketOrCpm, targeting} from '../../src/targeting.js';

/** @type {string} */
const MODULE_NAME = 'multibid';
let multiConfig = {};
let multibidUnits = {};
let multibidCache = {};

config.getConfig(MODULE_NAME,  conf => {
    if (!Array.isArray(conf.multibid) || !validateMultibid(conf.multibid)) return;

    resetMultiConfig();

    conf.multibid.forEach(entry => {
      multiConfig[entry.bidder] = {
        maxbids: entry.maxbids,
        prefix: entry.targetbiddercodeprefix
      }
    });
});

events.on(CONSTANTS.EVENTS.BIDDER_DONE, removeBidderBidData);

function validateMultibid(conf) {
  let check = true;

  let duplicate = conf.filter(entry => {
    if (!entry.bidder || typeof entry.bidder !== 'string') {
      utils.logWarn('Filtering multibid entry due to missing required bidder property.');
      check = false;
      return false;
    } 
  }).map(entry => {
    if (typeof entry.maxbids !== 'number' || entry.maxbids < 1 || entry.maxbids > 9) {
      entry.maxbids = (typeof entry.maxbids !== 'number' || entry.maxbids < 1) ? 1 : 9;
      check = false;
      return entry;
    } 
  });

  if (!check) config.setConfig({multibid: duplicate});

  return check;
}

function addResponses(fn, adUnitCode, bid) {
    if (multiConfig && multiConfig[bid.bidderCode]) {
      if (multiConfig[bid.bidderCode].prefix) bid.multibidPrefix = multiConfig[bid.bidderCode].prefix;
      bid.originalBidder = bid.bidderCode;
      if (utils.deepAccess(multibidUnits, `${adUnitCode}.${bid.bidderCode}`)) {
        if (!multibidUnits[adUnitCode][bid.bidderCode].maxReached) {
          multibidUnits[adUnitCode][bid.bidderCode].ads.push(bid);

          if (multibidUnits[adUnitCode][bid.bidderCode].ads.length === multiConfig[bid.bidderCode].maxbids) multibidUnits[adUnitCode][bid.bidderCode].maxReached = true;

          fn.call(this, adUnitCode, bid);
        } 
      } else {
        utils.deepSetValue(multibidUnits, `${adUnitCode}.${bid.bidderCode}`, {ads: [bid]});
        fn.call(this, adUnitCode, bid);
      }
    } else {
      fn.call(this, adUnitCode, bid);
    }
}

function removeBidderBidData(bidRequest) {
  bidRequest.bids.forEach(bid => {
    if(utils.deepAccess(multibidUnits, `${bid.adUnitCode}.${bid.bidder}`)) delete multibidUnits[bid.adUnitCode][bid.bidder];
  });
}

/**
* A descending sort function that will sort the list of objects based on the following:
*  - bids without dynamic aliases are sorted before bids with dynamic aliases
**/
function sortByMultibid(a, b) {
    if (a.bidder !== a.bidderCode && b.bidder === b.bidderCode) {
      return 1;
    }

    if (a.bidder === a.bidderCode && b.bidder !== b.bidderCode) {
      return -1;
    }

    return 0;
}

function targetBidPoolHook(fn, bidsReceived, highestCpmCallback, adUnitBidLimit = 0, hasModified = false) {
  const dealPrioritization = config.getConfig('sendBidsControl.dealPrioritization');
  let modifiedBids = [];
  let buckets = utils.groupBy(bidsReceived, 'adUnitCode');
  let bids = [].concat.apply([], Object.keys(buckets).reduce((result, slotId) => {
    let bucketBids = [];
    let bidsByBidderName = utils.groupBy(buckets[slotId], 'originalBidder');
    let adjustedBids = [].concat.apply([], Object.keys(bidsByBidderName).map(key => {
      return bidsByBidderName[key].sort((bidA, bidB) => {
        if (bidA.originalBidder && bidA.originalBidder !== bidA.bidderCode) bidA.bidderCode = bidA.originalBidder;
        if (bidA.originalBidder && bidB.originalBidder !== bidB.bidderCode) bidB.bidderCode = bidB.originalBidder;
        return bidA.cpm > bidB.cpm ? -1 : (bidA.cpm < bidB.cpm ? 1 : 0);
      }).map((bid, index) => {
        if (utils.deepAccess(multiConfig, `${bid.bidderCode}.prefix`) && index !== 0 && index < multiConfig[bid.bidderCode].maxbids) {
          bid.bidderCode = multiConfig[bid.bidderCode].prefix + (index + 1);
        }

        return bid
      })
    }));
    let bidsByBidderCode = utils.groupBy(adjustedBids, 'bidderCode');
    Object.keys(bidsByBidderCode).forEach(key => bucketBids.push(bidsByBidderCode[key].reduce(highestCpmCallback)));

    // if adUnitBidLimit is set, pass top N number bids
    if (adUnitBidLimit > 0) {
      bucketBids = dealPrioritization ? bucketBids.sort(sortByDealAndPriceBucketOrCpm(true)) : bucketBids.sort((a, b) => b.cpm - a.cpm);
      bucketBids.sort(sortByMultibid);
      modifiedBids.push(...bucketBids.slice(0, adUnitBidLimit));
    } else {
      modifiedBids.push(...bucketBids);
    }

    return [].concat.apply([], modifiedBids);
  }, []));

  fn.call(this, bids, highestCpmCallback, adUnitBidLimit, true);
}

const resetMultiConfig = () =>  multiConfig = {};

export function init() {
  setupBeforeHookFnOnce(addBidResponse, addResponses);
  setupBeforeHookFnOnce(getHighestCpmBidsFromBidPool, targetBidPoolHook);
}

init();
