/**
 * This module houses the functionality to evaluate and process adpod adunits/bids.  Specifically there are several hooked functions,
 * that either supplement the base function (ie to check something additional or unique to adpod objects) or to replace the base function
 * entirely when appropriate.
 *
 * Brief outline of each hook:
 * - `callPrebidCacheHook` - for any adpod bids, this function will temporarily hold them in a queue in order to send the bids to Prebid Cache in bulk
 * - `checkAdUnitSetupHook` - evaluates the adUnits to ensure that required fields for adpod adUnits are present.  Invalid adpod adUntis are removed from the array.
 * - `checkVideoBidSetupHook` - evaluates the adpod bid returned from an adaptor/bidder to ensure required fields are populated; also initializes duration bucket field.
 *
 * To initialize the module, there is an `initAdpodHooks()` function that should be imported and executed by a corresponding `...AdServerVideo`
 * module that designed to support adpod video type ads.  This import process allows this module to effectively act as a sub-module.
 */

import {
  compareOn,
  deepAccess,
  generateUUID,
  groupBy,
  isArray,
  isArrayOfNums,
  isNumber,
  isPlainObject,
  logError,
  logInfo,
  logWarn
} from '../src/utils.js';
import {
  addBidToAuction,
  AUCTION_IN_PROGRESS,
  callPrebidCache,
  doCallbacksIfTimedout,
  getPriceByGranularity,
  getPriceGranularity
} from '../src/auction.js';
import {checkAdUnitSetup} from '../src/prebid.js';
import {checkVideoBidSetup} from '../src/video.js';
import {module, setupBeforeHookFnOnce} from '../src/hook.js';
import {store} from '../src/videoCache.js';
import {config} from '../src/config.js';
import {ADPOD} from '../src/mediaTypes.js';
import {find, arrayFrom as from} from '../src/polyfill.js';
import {auctionManager} from '../src/auctionManager.js';
import CONSTANTS from '../src/constants.json';

const TARGETING_KEY_PB_CAT_DUR = 'hb_pb_cat_dur';
const TARGETING_KEY_CACHE_ID = 'hb_cache_id';

let queueTimeDelay = 50;
let queueSizeLimit = 5;
let bidCacheRegistry = createBidCacheRegistry();

/**
 * Create a registry object that stores/manages bids while be held in queue for Prebid Cache.
 * @returns registry object with defined accessor functions
 */
function createBidCacheRegistry() {
  let registry = {};

  function setupRegistrySlot(auctionId) {
    registry[auctionId] = {};
    registry[auctionId].bidStorage = new Set();
    registry[auctionId].queueDispatcher = createDispatcher(queueTimeDelay);
    registry[auctionId].initialCacheKey = generateUUID();
  }

  return {
    addBid: function (bid) {
      // create parent level object based on auction ID (in case there are concurrent auctions running) to store objects for that auction
      if (!registry[bid.auctionId]) {
        setupRegistrySlot(bid.auctionId);
      }
      registry[bid.auctionId].bidStorage.add(bid);
    },
    removeBid: function (bid) {
      registry[bid.auctionId].bidStorage.delete(bid);
    },
    getBids: function (bid) {
      return registry[bid.auctionId] && registry[bid.auctionId].bidStorage.values();
    },
    getQueueDispatcher: function (bid) {
      return registry[bid.auctionId] && registry[bid.auctionId].queueDispatcher;
    },
    setupInitialCacheKey: function (bid) {
      if (!registry[bid.auctionId]) {
        registry[bid.auctionId] = {};
        registry[bid.auctionId].initialCacheKey = generateUUID();
      }
    },
    getInitialCacheKey: function (bid) {
      return registry[bid.auctionId] && registry[bid.auctionId].initialCacheKey;
    }
  }
}

/**
 * Creates a function that when called updates the bid queue and extends the running timer (when called subsequently).
 * Once the time threshold for the queue (defined by queueSizeLimit) is reached, the queue will be flushed by calling the `firePrebidCacheCall` function.
 * If there is a long enough time between calls (based on timeoutDration), the queue will automatically flush itself.
 * @param {Number} timeoutDuration number of milliseconds to pass before timer expires and current bid queue is flushed
 * @returns {Function}
 */
function createDispatcher(timeoutDuration) {
  let timeout;
  let counter = 1;

  return function (auctionInstance, bidListArr, afterBidAdded, killQueue) {
    const context = this;

    var callbackFn = function () {
      firePrebidCacheCall.call(context, auctionInstance, bidListArr, afterBidAdded);
    };

    clearTimeout(timeout);

    if (!killQueue) {
      // want to fire off the queue if either: size limit is reached or time has passed since last call to dispatcher
      if (counter === queueSizeLimit) {
        counter = 1;
        callbackFn();
      } else {
        counter++;
        timeout = setTimeout(callbackFn, timeoutDuration);
      }
    } else {
      counter = 1;
    }
  };
}

function getPricePartForAdpodKey(bid) {
  let pricePart
  let prioritizeDeals = config.getConfig('adpod.prioritizeDeals');
  if (prioritizeDeals && deepAccess(bid, 'video.dealTier')) {
    const adpodDealPrefix = config.getConfig(`adpod.dealTier.${bid.bidderCode}.prefix`);
    pricePart = (adpodDealPrefix) ? adpodDealPrefix + deepAccess(bid, 'video.dealTier') : deepAccess(bid, 'video.dealTier');
  } else {
    const granularity = getPriceGranularity(bid);
    pricePart = getPriceByGranularity(granularity)(bid);
  }
  return pricePart
}

/**
 * This function reads certain fields from the bid to generate a specific key used for caching the bid in Prebid Cache
 * @param {Object} bid bid object to update
 * @param {Boolean} brandCategoryExclusion value read from setConfig; influences whether category is required or not
 */
function attachPriceIndustryDurationKeyToBid(bid, brandCategoryExclusion) {
  let initialCacheKey = bidCacheRegistry.getInitialCacheKey(bid);
  let duration = deepAccess(bid, 'video.durationBucket');
  const pricePart = getPricePartForAdpodKey(bid);
  let pcd;

  if (brandCategoryExclusion) {
    let category = deepAccess(bid, 'meta.adServerCatId');
    pcd = `${pricePart}_${category}_${duration}s`;
  } else {
    pcd = `${pricePart}_${duration}s`;
  }

  if (!bid.adserverTargeting) {
    bid.adserverTargeting = {};
  }
  bid.adserverTargeting[TARGETING_KEY_PB_CAT_DUR] = pcd;
  bid.adserverTargeting[TARGETING_KEY_CACHE_ID] = initialCacheKey;
  bid.videoCacheKey = initialCacheKey;
  bid.customCacheKey = `${pcd}_${initialCacheKey}`;
}

/**
 * Updates the running queue for the associated auction.
 * Does a check to ensure the auction is still running; if it's not - the previously running queue is killed.
 * @param {*} auctionInstance running context of the auction
 * @param {Object} bidResponse bid object being added to queue
 * @param {Function} afterBidAdded callback function used when Prebid Cache responds
 */
function updateBidQueue(auctionInstance, bidResponse, afterBidAdded) {
  let bidListIter = bidCacheRegistry.getBids(bidResponse);

  if (bidListIter) {
    let bidListArr = from(bidListIter);
    let callDispatcher = bidCacheRegistry.getQueueDispatcher(bidResponse);
    let killQueue = !!(auctionInstance.getAuctionStatus() !== AUCTION_IN_PROGRESS);
    callDispatcher(auctionInstance, bidListArr, afterBidAdded, killQueue);
  } else {
    logWarn('Attempted to cache a bid from an unknown auction. Bid:', bidResponse);
  }
}

/**
 * Small helper function to remove bids from internal storage; normally b/c they're about to sent to Prebid Cache for processing.
 * @param {Array[Object]} bidResponses list of bids to remove
 */
function removeBidsFromStorage(bidResponses) {
  for (let i = 0; i < bidResponses.length; i++) {
    bidCacheRegistry.removeBid(bidResponses[i]);
  }
}

/**
 * This function will send a list of bids to Prebid Cache.  It also removes the same bids from the internal bidCacheRegistry
 * to maintain which bids are in queue.
 * If the bids are successfully cached, they will be added to the respective auction.
 * @param {*} auctionInstance running context of the auction
 * @param {Array[Object]} bidList list of bid objects that need to be sent to Prebid Cache
 * @param {Function} afterBidAdded callback function used when Prebid Cache responds
 */
function firePrebidCacheCall(auctionInstance, bidList, afterBidAdded) {
  // remove entries now so other incoming bids won't accidentally have a stale version of the list while PBC is processing the current submitted list
  removeBidsFromStorage(bidList);

  store(bidList, function (error, cacheIds) {
    if (error) {
      logWarn(`Failed to save to the video cache: ${error}. Video bid(s) must be discarded.`);
      for (let i = 0; i < bidList.length; i++) {
        doCallbacksIfTimedout(auctionInstance, bidList[i]);
      }
    } else {
      for (let i = 0; i < cacheIds.length; i++) {
        // when uuid in response is empty string then the key already existed, so this bid wasn't cached
        if (cacheIds[i].uuid !== '') {
          addBidToAuction(auctionInstance, bidList[i]);
        } else {
          logInfo(`Detected a bid was not cached because the custom key was already registered.  Attempted to use key: ${bidList[i].customCacheKey}. Bid was: `, bidList[i]);
        }
        afterBidAdded();
      }
    }
  });
}

/**
 * This is the main hook function to handle adpod bids; maintains the logic to temporarily hold bids in a queue in order to send bulk requests to Prebid Cache.
 * @param {Function} fn reference to original function (used by hook logic)
 * @param {*} auctionInstance running context of the auction
 * @param {Object} bidResponse incoming bid; if adpod, will be processed through hook function.  If not adpod, returns to original function.
 * @param {Function} afterBidAdded callback function used when Prebid Cache responds
 * @param {Object} videoConfig mediaTypes.video from the bid's adUnit
 */
export function callPrebidCacheHook(fn, auctionInstance, bidResponse, afterBidAdded, videoConfig) {
  if (videoConfig && videoConfig.context === ADPOD) {
    let brandCategoryExclusion = config.getConfig('adpod.brandCategoryExclusion');
    let adServerCatId = deepAccess(bidResponse, 'meta.adServerCatId');
    if (!adServerCatId && brandCategoryExclusion) {
      logWarn('Detected a bid without meta.adServerCatId while setConfig({adpod.brandCategoryExclusion}) was enabled.  This bid has been rejected:', bidResponse);
      afterBidAdded();
    } else {
      if (config.getConfig('adpod.deferCaching') === false) {
        bidCacheRegistry.addBid(bidResponse);
        attachPriceIndustryDurationKeyToBid(bidResponse, brandCategoryExclusion);

        updateBidQueue(auctionInstance, bidResponse, afterBidAdded);
      } else {
        // generate targeting keys for bid
        bidCacheRegistry.setupInitialCacheKey(bidResponse);
        attachPriceIndustryDurationKeyToBid(bidResponse, brandCategoryExclusion);

        // add bid to auction
        addBidToAuction(auctionInstance, bidResponse);
        afterBidAdded();
      }
    }
  } else {
    fn.call(this, auctionInstance, bidResponse, afterBidAdded, videoConfig);
  }
}

/**
 * This hook function will review the adUnit setup and verify certain required values are present in any adpod adUnits.
 * If the fields are missing or incorrectly setup, the adUnit is removed from the list.
 * @param {Function} fn reference to original function (used by hook logic)
 * @param {Array[Object]} adUnits list of adUnits to be evaluated
 * @returns {Array[Object]} list of adUnits that passed the check
 */
export function checkAdUnitSetupHook(fn, adUnits) {
  let goodAdUnits = adUnits.filter(adUnit => {
    let mediaTypes = deepAccess(adUnit, 'mediaTypes');
    let videoConfig = deepAccess(mediaTypes, 'video');
    if (videoConfig && videoConfig.context === ADPOD) {
      // run check to see if other mediaTypes are defined (ie multi-format); reject adUnit if so
      if (Object.keys(mediaTypes).length > 1) {
        logWarn(`Detected more than one mediaType in adUnitCode: ${adUnit.code} while attempting to define an 'adpod' video adUnit.  'adpod' adUnits cannot be mixed with other mediaTypes.  This adUnit will be removed from the auction.`);
        return false;
      }

      let errMsg = `Detected missing or incorrectly setup fields for an adpod adUnit.  Please review the following fields of adUnitCode: ${adUnit.code}.  This adUnit will be removed from the auction.`;

      let playerSize = !!(
        (
          videoConfig.playerSize && (
            isArrayOfNums(videoConfig.playerSize, 2) || (
              isArray(videoConfig.playerSize) && videoConfig.playerSize.every(sz => isArrayOfNums(sz, 2))
            )
          )
        ) || (videoConfig.sizeConfig)
      );
      let adPodDurationSec = !!(videoConfig.adPodDurationSec && isNumber(videoConfig.adPodDurationSec) && videoConfig.adPodDurationSec > 0);
      let durationRangeSec = !!(videoConfig.durationRangeSec && isArrayOfNums(videoConfig.durationRangeSec) && videoConfig.durationRangeSec.every(range => range > 0));

      if (!playerSize || !adPodDurationSec || !durationRangeSec) {
        errMsg += (!playerSize) ? '\nmediaTypes.video.playerSize' : '';
        errMsg += (!adPodDurationSec) ? '\nmediaTypes.video.adPodDurationSec' : '';
        errMsg += (!durationRangeSec) ? '\nmediaTypes.video.durationRangeSec' : '';
        logWarn(errMsg);
        return false;
      }
    }
    return true;
  });
  adUnits = goodAdUnits;
  fn.call(this, adUnits);
}

/**
 * This check evaluates the incoming bid's `video.durationSeconds` field and tests it against specific logic depending on adUnit config.  Summary of logic below:
 * when adUnit.mediaTypes.video.requireExactDuration is true
 *  - only bids that exactly match those listed values are accepted (don't round at all).
 *  - populate the `bid.video.durationBucket` field with the matching duration value
 * when adUnit.mediaTypes.video.requireExactDuration is false
 *  - round the duration to the next highest specified duration value based on adunit.  If the duration is above a range within a set buffer, that bid falls down into that bucket.
 *      (eg if range was [5, 15, 30] -> 2s is rounded to 5s; 17s is rounded back to 15s; 18s is rounded up to 30s)
 *  - if the bid is above the range of the listed durations (and outside the buffer), reject the bid
 *  - set the rounded duration value in the `bid.video.durationBucket` field for accepted bids
 * @param {Object} videoMediaType 'mediaTypes.video' associated to bidResponse
 * @param {Object} bidResponse incoming bidResponse being evaluated by bidderFactory
 * @returns {boolean} return false if bid duration is deemed invalid as per adUnit configuration; return true if fine
*/
function checkBidDuration(videoMediaType, bidResponse) {
  const buffer = 2;
  let bidDuration = deepAccess(bidResponse, 'video.durationSeconds');
  let adUnitRanges = videoMediaType.durationRangeSec;
  adUnitRanges.sort((a, b) => a - b); // ensure the ranges are sorted in numeric order

  if (!videoMediaType.requireExactDuration) {
    let max = Math.max(...adUnitRanges);
    if (bidDuration <= (max + buffer)) {
      let nextHighestRange = find(adUnitRanges, range => (range + buffer) >= bidDuration);
      bidResponse.video.durationBucket = nextHighestRange;
    } else {
      logWarn(`Detected a bid with a duration value outside the accepted ranges specified in adUnit.mediaTypes.video.durationRangeSec.  Rejecting bid: `, bidResponse);
      return false;
    }
  } else {
    if (find(adUnitRanges, range => range === bidDuration)) {
      bidResponse.video.durationBucket = bidDuration;
    } else {
      logWarn(`Detected a bid with a duration value not part of the list of accepted ranges specified in adUnit.mediaTypes.video.durationRangeSec.  Exact match durations must be used for this adUnit. Rejecting bid: `, bidResponse);
      return false;
    }
  }
  return true;
}

/**
 * This hooked function evaluates an adpod bid and determines if the required fields are present.
 * If it's found to not be an adpod bid, it will return to original function via hook logic
 * @param {Function} fn reference to original function (used by hook logic)
 * @param {Object} bid incoming bid object
 * @param {Object} adUnit adUnit object of associated bid
 * @param {Object} videoMediaType copy of the `bidRequest.mediaTypes.video` object; used in original function
 * @param {String} context value of the `bidRequest.mediaTypes.video.context` field; used in original function
 * @returns {boolean} this return is only used for adpod bids
 */
export function checkVideoBidSetupHook(fn, bid, adUnit, videoMediaType, context) {
  if (context === ADPOD) {
    let result = true;
    let brandCategoryExclusion = config.getConfig('adpod.brandCategoryExclusion');
    if (brandCategoryExclusion && !deepAccess(bid, 'meta.primaryCatId')) {
      result = false;
    }

    if (deepAccess(bid, 'video')) {
      if (!deepAccess(bid, 'video.context') || bid.video.context !== ADPOD) {
        result = false;
      }

      if (!deepAccess(bid, 'video.durationSeconds') || bid.video.durationSeconds <= 0) {
        result = false;
      } else {
        let isBidGood = checkBidDuration(videoMediaType, bid);
        if (!isBidGood) result = false;
      }
    }

    if (!config.getConfig('cache.url') && bid.vastXml && !bid.vastUrl) {
      logError(`
        This bid contains only vastXml and will not work when a prebid cache url is not specified.
        Try enabling prebid cache with pbjs.setConfig({ cache: {url: "..."} });
      `);
      result = false;
    };

    fn.bail(result);
  } else {
    fn.call(this, bid, adUnit, videoMediaType, context);
  }
}

/**
 * This function reads the (optional) settings for the adpod as set from the setConfig()
 * @param {Object} config contains the config settings for adpod module
 */
export function adpodSetConfig(config) {
  if (config.bidQueueTimeDelay !== undefined) {
    if (typeof config.bidQueueTimeDelay === 'number' && config.bidQueueTimeDelay > 0) {
      queueTimeDelay = config.bidQueueTimeDelay;
    } else {
      logWarn(`Detected invalid value for adpod.bidQueueTimeDelay in setConfig; must be a positive number.  Using default: ${queueTimeDelay}`)
    }
  }

  if (config.bidQueueSizeLimit !== undefined) {
    if (typeof config.bidQueueSizeLimit === 'number' && config.bidQueueSizeLimit > 0) {
      queueSizeLimit = config.bidQueueSizeLimit;
    } else {
      logWarn(`Detected invalid value for adpod.bidQueueSizeLimit in setConfig; must be a positive number.  Using default: ${queueSizeLimit}`)
    }
  }
}
config.getConfig('adpod', config => adpodSetConfig(config.adpod));

/**
 * This function initializes the adpod module's hooks.  This is called by the corresponding adserver video module.
 */
function initAdpodHooks() {
  setupBeforeHookFnOnce(callPrebidCache, callPrebidCacheHook);
  setupBeforeHookFnOnce(checkAdUnitSetup, checkAdUnitSetupHook);
  setupBeforeHookFnOnce(checkVideoBidSetup, checkVideoBidSetupHook);
}

initAdpodHooks()

/**
 *
 * @param {Array[Object]} bids list of 'winning' bids that need to be cached
 * @param {Function} callback send the cached bids (or error) back to adserverVideoModule for further processing
 }}
 */
export function callPrebidCacheAfterAuction(bids, callback) {
  // will call PBC here and execute cb param to initialize player code
  store(bids, function (error, cacheIds) {
    if (error) {
      callback(error, null);
    } else {
      let successfulCachedBids = [];
      for (let i = 0; i < cacheIds.length; i++) {
        if (cacheIds[i] !== '') {
          successfulCachedBids.push(bids[i]);
        }
      }
      callback(null, successfulCachedBids);
    }
  })
}

/**
 * Compare function to be used in sorting long-form bids. This will compare bids on price per second.
 * @param {Object} bid
 * @param {Object} bid
 */
export function sortByPricePerSecond(a, b) {
  if (a.adserverTargeting[CONSTANTS.TARGETING_KEYS.PRICE_BUCKET] / a.video.durationBucket < b.adserverTargeting[CONSTANTS.TARGETING_KEYS.PRICE_BUCKET] / b.video.durationBucket) {
    return 1;
  }
  if (a.adserverTargeting[CONSTANTS.TARGETING_KEYS.PRICE_BUCKET] / a.video.durationBucket > b.adserverTargeting[CONSTANTS.TARGETING_KEYS.PRICE_BUCKET] / b.video.durationBucket) {
    return -1;
  }
  return 0;
}

/**
 * This function returns targeting keyvalue pairs for long-form adserver modules. Freewheel and GAM are currently supporting Prebid long-form
 * @param {Object} options
 * @param {Array[string]} codes
 * @param {function} callback
 * @returns targeting kvs for adUnitCodes
 */
export function getTargeting({ codes, callback } = {}) {
  if (!callback) {
    logError('No callback function was defined in the getTargeting call.  Aborting getTargeting().');
    return;
  }
  codes = codes || [];
  const adPodAdUnits = getAdPodAdUnits(codes);
  const bidsReceived = auctionManager.getBidsReceived();
  const competiveExclusionEnabled = config.getConfig('adpod.brandCategoryExclusion');
  const deferCachingSetting = config.getConfig('adpod.deferCaching');
  const deferCachingEnabled = (typeof deferCachingSetting === 'boolean') ? deferCachingSetting : true;

  let bids = getBidsForAdpod(bidsReceived, adPodAdUnits);
  bids = (competiveExclusionEnabled || deferCachingEnabled) ? getExclusiveBids(bids) : bids;

  let prioritizeDeals = config.getConfig('adpod.prioritizeDeals');
  if (prioritizeDeals) {
    let [otherBids, highPriorityDealBids] = bids.reduce((partitions, bid) => {
      let bidDealTier = deepAccess(bid, 'video.dealTier');
      let minDealTier = config.getConfig(`adpod.dealTier.${bid.bidderCode}.minDealTier`);
      if (minDealTier && bidDealTier) {
        if (bidDealTier >= minDealTier) {
          partitions[1].push(bid)
        } else {
          partitions[0].push(bid)
        }
      } else if (bidDealTier) {
        partitions[1].push(bid)
      } else {
        partitions[0].push(bid);
      }
      return partitions;
    }, [[], []]);
    highPriorityDealBids.sort(sortByPricePerSecond);
    otherBids.sort(sortByPricePerSecond);
    bids = highPriorityDealBids.concat(otherBids);
  } else {
    bids.sort(sortByPricePerSecond);
  }

  let targeting = {};
  if (deferCachingEnabled === false) {
    adPodAdUnits.forEach((adUnit) => {
      let adPodTargeting = [];
      let adPodDurationSeconds = deepAccess(adUnit, 'mediaTypes.video.adPodDurationSec');

      bids
        .filter((bid) => bid.adUnitCode === adUnit.code)
        .forEach((bid, index, arr) => {
          if (bid.video.durationBucket <= adPodDurationSeconds) {
            adPodTargeting.push({
              [TARGETING_KEY_PB_CAT_DUR]: bid.adserverTargeting[TARGETING_KEY_PB_CAT_DUR]
            });
            adPodDurationSeconds -= bid.video.durationBucket;
          }
          if (index === arr.length - 1 && adPodTargeting.length > 0) {
            adPodTargeting.push({
              [TARGETING_KEY_CACHE_ID]: bid.adserverTargeting[TARGETING_KEY_CACHE_ID]
            });
          }
        });
      targeting[adUnit.code] = adPodTargeting;
    });

    callback(null, targeting);
  } else {
    let bidsToCache = [];
    adPodAdUnits.forEach((adUnit) => {
      let adPodDurationSeconds = deepAccess(adUnit, 'mediaTypes.video.adPodDurationSec');

      bids
        .filter((bid) => bid.adUnitCode === adUnit.code)
        .forEach((bid) => {
          if (bid.video.durationBucket <= adPodDurationSeconds) {
            bidsToCache.push(bid);
            adPodDurationSeconds -= bid.video.durationBucket;
          }
        });
    });

    callPrebidCacheAfterAuction(bidsToCache, function (error, bidsSuccessfullyCached) {
      if (error) {
        callback(error, null);
      } else {
        let groupedBids = groupBy(bidsSuccessfullyCached, 'adUnitCode');
        Object.keys(groupedBids).forEach((adUnitCode) => {
          let adPodTargeting = [];

          groupedBids[adUnitCode].forEach((bid, index, arr) => {
            adPodTargeting.push({
              [TARGETING_KEY_PB_CAT_DUR]: bid.adserverTargeting[TARGETING_KEY_PB_CAT_DUR]
            });

            if (index === arr.length - 1 && adPodTargeting.length > 0) {
              adPodTargeting.push({
                [TARGETING_KEY_CACHE_ID]: bid.adserverTargeting[TARGETING_KEY_CACHE_ID]
              });
            }
          });
          targeting[adUnitCode] = adPodTargeting;
        });

        callback(null, targeting);
      }
    });
  }
  return targeting;
}

/**
 * This function returns the adunit of mediaType adpod
 * @param {Array} codes adUnitCodes
 * @returns {Array[Object]} adunits of mediaType adpod
 */
function getAdPodAdUnits(codes) {
  return auctionManager.getAdUnits()
    .filter((adUnit) => deepAccess(adUnit, 'mediaTypes.video.context') === ADPOD)
    .filter((adUnit) => (codes.length > 0) ? codes.indexOf(adUnit.code) != -1 : true);
}

/**
 * This function removes bids of same category. It will be used when competitive exclusion is enabled.
 * @param {Array[Object]} bidsReceived
 * @returns {Array[Object]} unique category bids
 */
function getExclusiveBids(bidsReceived) {
  let bids = bidsReceived
    .map((bid) => Object.assign({}, bid, { [TARGETING_KEY_PB_CAT_DUR]: bid.adserverTargeting[TARGETING_KEY_PB_CAT_DUR] }));
  bids = groupBy(bids, TARGETING_KEY_PB_CAT_DUR);
  let filteredBids = [];
  Object.keys(bids).forEach((targetingKey) => {
    bids[targetingKey].sort(compareOn('responseTimestamp'));
    filteredBids.push(bids[targetingKey][0]);
  });
  return filteredBids;
}

/**
 * This function returns bids for adpod adunits
 * @param {Array[Object]} bidsReceived
 * @param {Array[Object]} adPodAdUnits
 * @returns {Array[Object]} bids of mediaType adpod
 */
function getBidsForAdpod(bidsReceived, adPodAdUnits) {
  let adUnitCodes = adPodAdUnits.map((adUnit) => adUnit.code);
  return bidsReceived
    .filter((bid) => adUnitCodes.indexOf(bid.adUnitCode) != -1 && (bid.video && bid.video.context === ADPOD))
}

const sharedMethods = {
  TARGETING_KEY_PB_CAT_DUR: TARGETING_KEY_PB_CAT_DUR,
  TARGETING_KEY_CACHE_ID: TARGETING_KEY_CACHE_ID,
  'getTargeting': getTargeting
}
Object.freeze(sharedMethods);

module('adpod', function shareAdpodUtilities(...args) {
  if (!isPlainObject(args[0])) {
    logError('Adpod module needs plain object to share methods with submodule');
    return;
  }
  function addMethods(object, func) {
    for (let name in func) {
      object[name] = func[name];
    }
  }
  addMethods(args[0], sharedMethods);
});
