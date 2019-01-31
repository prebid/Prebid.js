import * as utils from '../src/utils';
import { addBidToAuction, doCallbacksIfTimedout } from '../src/auction';
import { store } from '../src/videoCache';
import { hooks } from '../src/hook';
import { config } from '../src/config';
import Set from 'core-js/library/fn/set';

const from = require('core-js/library/fn/array/from');
export const ADPOD = 'adpod';

// NOTE - can these global vars be handled differently???
// NOTE - are these good defaults?
let queueTimeDelay = 50;
let queueSizeLimit = 5;
let bidCacheRegistry = createBidCacheRegistry();

function createBidCacheRegistry() {
  let registry = {};
  return {
    addBid: function (bid) {
      // create parent level object based on auction ID (in case there are concurrent auctions running) to store objects for that auction
      if (!registry[bid.auctionId]) {
        registry[bid.auctionId] = {};
        registry[bid.auctionId].bidStorage = new Set();
        registry[bid.auctionId].queueDispatcher = createDispatcher(queueTimeDelay);
        registry[bid.auctionId].initialCacheKey = utils.generateUUID();
      }
      registry[bid.auctionId].bidStorage.add(bid);
    },
    removeBid: function (bid) {
      registry[bid.auctionId].bidStorage.delete(bid);
    },
    getBids: function (bid) {
      return registry[bid.auctionId] && registry[bid.auctionId].bidStorage.values();
    },
    getQueueDispatcher: function(bid) {
      return registry[bid.auctionId] && registry[bid.auctionId].queueDispatcher;
    },
    getInitialCacheKey: function(bid) {
      return registry[bid.auctionId] && registry[bid.auctionId].initialCacheKey;
    }
  }
}

function createDispatcher(timeoutDuration) {
  let timeout;
  let counter = 1;

  return function() {
    const context = this;
    const args = arguments;

    var callbackFn = function() {
      firePrebidCacheCall.apply(context, args);
    };

    clearTimeout(timeout);

    // want to fire off the queue if either: size limit is reached or time has passed since last call to dispatcher
    if (counter === queueSizeLimit) {
      counter = 1;
      callbackFn();
    } else {
      counter++;
      timeout = setTimeout(callbackFn, timeoutDuration);
    }
  };
}

function updateBidQueue(auctionInstance, bidResponse, afterBidAdded) {
  let bidListIter = bidCacheRegistry.getBids(bidResponse);

  if (bidListIter) {
    let bidListArr = from(bidListIter);
    let callDispatcher = bidCacheRegistry.getQueueDispatcher(bidResponse);
    callDispatcher(auctionInstance, bidListArr, afterBidAdded);
  } else {
    utils.logWarn('Attempted to cache a bid from an unkonwn auction. Bid:', bidResponse);
  }
}

function removeBidsFromStorage(bidResponses) {
  for (let i = 0; i < bidResponses.length; i++) {
    bidCacheRegistry.removeBid(bidResponses[i]);
  }
}

function firePrebidCacheCall(auctionInstance, bidList, afterBidAdded) {
  // note to reviewers - doing this to ensure the variable wouldn't be malformed by the additional incoming bids
  // while the current list is being processed by PBC and the store callback
  // ...but is this copy really needed?
  let bidListCopy = bidList.slice();

  // remove entries now so other incoming bids won't accidentally have a stale version of the list while PBC is processing the current submitted list
  removeBidsFromStorage(bidListCopy);

  store(bidListCopy, function (error, cacheIds) {
    if (error) {
      utils.logWarn(`Failed to save to the video cache: ${error}. Video bid(s) must be discarded.`);
      for (let i = 0; i < bidList.length; i++) {
        doCallbacksIfTimedout(auctionInstance, bidList[i]);
      }
    } else {
      for (let i = 0; i < cacheIds.length; i++) {
        // when uuid in response is empty string then the key already existed, so this bid wasn't cached
        // TODO - should we throw warning here?  should we call the afterBidAdded() anyway to decrement the internal bid counter?
        // TODO - verify the cacheKey is one of the expected values (eg in case PBC returns generic UUID)?
        if (cacheIds[i].uuid !== '') {
          // bidListCopy[i].videoCacheKey = cacheIds[i].uuid; // remove later
          addBidToAuction(auctionInstance, bidListCopy[i]);
          afterBidAdded();
        }
      }
    }
  });
}

export function callPrebidCacheHook(fn, auctionInstance, bidResponse, afterBidAdded, bidderRequest) {
  let videoConfig = bidderRequest.mediaTypes && bidderRequest.mediaTypes.video;
  // if (videoConfig && videoConfig.context === 'instream') { //remove later
  if (videoConfig && videoConfig.context === ADPOD) {
    bidCacheRegistry.addBid(bidResponse);
    updateBidQueue(auctionInstance, bidResponse, afterBidAdded);
  } else {
    fn.call(this, auctionInstance, bidResponse, afterBidAdded, bidderRequest);
  }
}

export function checkAdUnitSetupHook(fn, adUnits) {
  let goodAdUnits = adUnits.filter(adUnit => {
    let videoConfig = adUnit.mediaTypes && adUnit.mediaTypes.video;
    if (videoConfig && videoConfig.context === ADPOD) {
      let errMsg = `Detected missing or incorrectly setup fields for an adpod adUnit.  Please review the following fields of adUnitCode: ${adUnit.code}.  This adUnit will be removed from the auction.`;

      let playerSize = !!(videoConfig.playerSize && utils.isArrayOfNums(videoConfig.playerSize));
      let adPodDurationSec = !!(videoConfig.adPodDurationSec && utils.isNumber(videoConfig.adPodDurationSec));
      let durationRangeSec = !!(videoConfig.durationRangeSec && utils.isArrayOfNums(videoConfig.durationRangeSec));

      if (!playerSize || !adPodDurationSec || !durationRangeSec) {
        errMsg += (!playerSize) ? '\nmediaTypes.video.playerSize' : '';
        errMsg += (!adPodDurationSec) ? '\nmediaTypes.video.adPodDurationSec' : '';
        errMsg += (!durationRangeSec) ? '\nmediaTypes.video.durationRangeSec' : '';
        utils.logWarn(errMsg);
        return false;
      }
    }
    return true;
  });
  adUnits = goodAdUnits;
  fn.call(this, adUnits);
}

export function checkVideoBidSetupHook(fn, bid, bidRequest, videoMediaType, context) {
  if (context === ADPOD) {
    // TODO - check internally on field name for FW category
    if (!utils.deepAccess(bid, 'meta.primaryCatId')) {
      return false;
    }

    if (utils.deepAccess(bid, 'video')) {
      if (!utils.deepAccess(bid, 'video.context') || bid.video.context !== ADPOD) {
        return false;
      }

      if (!utils.deepAccess(bid, 'video.durationSeconds')) {
        return false;
      }
    }

    if (!config.getConfig('cache.url') && bid.vastXml && !bid.vastUrl) {
      utils.logError(`
        This bid contains only vastXml and will not work when a prebid cache url is not specified.
        Try enabling prebid cache with pbjs.setConfig({ cache: {url: "..."} });
      `);
      return false;
    };

    return true;
  } else {
    fn.call(this, bid, bidRequest, videoMediaType, context);
  }
}

export function adpodSetConfig(config) {
  if (config.bidQueueTimeDelay !== undefined) {
    if (typeof config.bidQueueTimeDelay === 'number' && config.bidQueueTimeDelay > 0) {
    // add check to see if config setting is too high?
      queueTimeDelay = config.bidQueueTimeDelay;
    } else {
      utils.logWarn(`Detected invalid value for adpod.bidQueueTimeDelay in setConfig; must be a positive number.  Using default: ${queueTimeDelay}`)
    }
  }

  if (config.bidQueueSizeLimit !== undefined) {
    if (typeof config.bidQueueSizeLimit === 'number' && config.bidQueueSizeLimit > 0) {
    // add check to see if config setting is too high? too low?
      queueSizeLimit = config.bidQueueSizeLimit;
    } else {
      utils.logWarn(`Detected invalid value for adpod.bidQueueSizeLimit in setConfig; must be a positive number.  Using default: ${queueSizeLimit}`)
    }
  }
}
config.getConfig('adpod', config => adpodSetConfig(config.adpod));

export function initAdpod() {
  hooks['callPrebidCache'].before(callPrebidCacheHook, 15);
  hooks['checkAdUnitSetup'].before(checkAdUnitSetupHook, 15);
  hooks['checkVideoBidSetup'].before(checkVideoBidSetupHook, 15);
}
