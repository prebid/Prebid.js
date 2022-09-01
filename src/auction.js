/**
 * Module for auction instances.
 *
 * In Prebid 0.x, $$PREBID_GLOBAL$$ had _bidsRequested and _bidsReceived as public properties.
 * Starting 1.0, Prebid will support concurrent auctions. Each auction instance will store private properties, bidsRequested and bidsReceived.
 *
 * AuctionManager will create instance of auction and will store all the auctions.
 *
 */

/**
  * @typedef {Object} AdUnit An object containing the adUnit configuration.
  *
  * @property {string} code A code which will be used to uniquely identify this bidder. This should be the same
  *   one as is used in the call to registerBidAdapter
  * @property {Array.<size>} sizes A list of size for adUnit.
  * @property {object} params Any bidder-specific params which the publisher used in their bid request.
  *   This is guaranteed to have passed the spec.areParamsValid() test.
  */

/**
 * @typedef {Array.<number>} size
 */

/**
 * @typedef {Array.<string>} AdUnitCode
 */

/**
 * @typedef {Object} BidderRequest
 *
 * @property {string} bidderCode - adUnit bidder
 * @property {number} auctionId - random UUID
 * @property {string} bidderRequestId - random string, unique key set on all bidRequest.bids[]
 * @property {Array.<Bid>} bids
 * @property {number} auctionStart - Date.now() at auction start
 * @property {number} timeout - callback timeout
 * @property {refererInfo} refererInfo - referer info object
 * @property {string} [tid] - random UUID (used for s2s)
 * @property {string} [src] - s2s or client (used for s2s)
 */

/**
 * @typedef {Object} BidReceived
 * //TODO add all properties
 */

/**
 * @typedef {Object} Auction
 *
 * @property {function(): string} getAuctionStatus - returns the auction status which can be any one of 'started', 'in progress' or 'completed'
 * @property {function(): AdUnit[]} getAdUnits - return the adUnits for this auction instance
 * @property {function(): AdUnitCode[]} getAdUnitCodes - return the adUnitCodes for this auction instance
 * @property {function(): BidRequest[]} getBidRequests - get all bid requests for this auction instance
 * @property {function(): BidReceived[]} getBidsReceived - get all bid received for this auction instance
 * @property {function(): void} startAuctionTimer - sets the bidsBackHandler callback and starts the timer for auction
 * @property {function(): void} callBids - sends requests to all adapters for bids
 */

import {
  flatten, timestamp, adUnitsFilter, deepAccess, getValue, parseUrl, generateUUID,
  logMessage, bind, logError, logInfo, logWarn, isEmpty, _each, isFn, isEmptyStr
} from './utils.js';
import { getPriceBucketString } from './cpmBucketManager.js';
import { getNativeTargeting } from './native.js';
import { getCacheUrl, store } from './videoCache.js';
import { Renderer } from './Renderer.js';
import { config } from './config.js';
import { userSync } from './userSync.js';
import { hook } from './hook.js';
import {find, includes} from './polyfill.js';
import { OUTSTREAM } from './video.js';
import { VIDEO } from './mediaTypes.js';
import {auctionManager} from './auctionManager.js';
import {bidderSettings} from './bidderSettings.js';
import * as events from './events.js'
import adapterManager from './adapterManager.js';
import CONSTANTS from './constants.json';
import {GreedyPromise} from './utils/promise.js';

const { syncUsers } = userSync;

export const AUCTION_STARTED = 'started';
export const AUCTION_IN_PROGRESS = 'inProgress';
export const AUCTION_COMPLETED = 'completed';

// register event for bid adjustment
events.on(CONSTANTS.EVENTS.BID_ADJUSTMENT, function (bid) {
  adjustBids(bid);
});

const MAX_REQUESTS_PER_ORIGIN = 4;
const outstandingRequests = {};
const sourceInfo = {};
const queuedCalls = [];

/**
 * Clear global state for tests
 */
export function resetAuctionState() {
  queuedCalls.length = 0;
  [outstandingRequests, sourceInfo].forEach((ob) => Object.keys(ob).forEach((k) => { delete ob[k] }));
}

/**
  * Creates new auction instance
  *
  * @param {Object} requestConfig
  * @param {AdUnit} requestConfig.adUnits
  * @param {AdUnitCode} requestConfig.adUnitCodes
  * @param {function():void} requestConfig.callback
  * @param {number} requestConfig.cbTimeout
  * @param {Array.<string>} requestConfig.labels
  * @param {string} requestConfig.auctionId
  * @param {{global: {}, bidder: {}}} ortb2Fragments first party data, separated into global
  *    (from getConfig('ortb2') + requestBids({ortb2})) and bidder (a map from bidderCode to ortb2)
  * @returns {Auction} auction instance
  */
export function newAuction({adUnits, adUnitCodes, callback, cbTimeout, labels, auctionId, ortb2Fragments}) {
  let _adUnits = adUnits;
  let _labels = labels;
  let _adUnitCodes = adUnitCodes;
  let _bidderRequests = [];
  let _bidsReceived = [];
  let _noBids = [];
  let _auctionStart;
  let _auctionEnd;
  let _auctionId = auctionId || generateUUID();
  let _auctionStatus;
  let _callback = callback;
  let _timer;
  let _timeout = cbTimeout;
  let _winningBids = [];
  let _timelyBidders = new Set();

  function addBidRequests(bidderRequests) { _bidderRequests = _bidderRequests.concat(bidderRequests); }
  function addBidReceived(bidsReceived) { _bidsReceived = _bidsReceived.concat(bidsReceived); }
  function addNoBid(noBid) { _noBids = _noBids.concat(noBid); }

  function getProperties() {
    return {
      auctionId: _auctionId,
      timestamp: _auctionStart,
      auctionEnd: _auctionEnd,
      auctionStatus: _auctionStatus,
      adUnits: _adUnits,
      adUnitCodes: _adUnitCodes,
      labels: _labels,
      bidderRequests: _bidderRequests,
      noBids: _noBids,
      bidsReceived: _bidsReceived,
      winningBids: _winningBids,
      timeout: _timeout
    };
  }

  function startAuctionTimer() {
    const timedOut = true;
    const timeoutCallback = executeCallback.bind(null, timedOut);
    let timer = setTimeout(timeoutCallback, _timeout);
    _timer = timer;
  }

  function executeCallback(timedOut, cleartimer) {
    // clear timer when done calls executeCallback
    if (cleartimer) {
      clearTimeout(_timer);
    }

    if (_auctionEnd === undefined) {
      let timedOutBidders = [];
      if (timedOut) {
        logMessage(`Auction ${_auctionId} timedOut`);
        timedOutBidders = getTimedOutBids(_bidderRequests, _timelyBidders);
        if (timedOutBidders.length) {
          events.emit(CONSTANTS.EVENTS.BID_TIMEOUT, timedOutBidders);
        }
      }

      _auctionStatus = AUCTION_COMPLETED;
      _auctionEnd = Date.now();

      events.emit(CONSTANTS.EVENTS.AUCTION_END, getProperties());
      bidsBackCallback(_adUnits, function () {
        try {
          if (_callback != null) {
            const adUnitCodes = _adUnitCodes;
            const bids = _bidsReceived
              .filter(bind.call(adUnitsFilter, this, adUnitCodes))
              .reduce(groupByPlacement, {});
            _callback.apply($$PREBID_GLOBAL$$, [bids, timedOut, _auctionId]);
            _callback = null;
          }
        } catch (e) {
          logError('Error executing bidsBackHandler', null, e);
        } finally {
          // Calling timed out bidders
          if (timedOutBidders.length) {
            adapterManager.callTimedOutBidders(adUnits, timedOutBidders, _timeout);
          }
          // Only automatically sync if the publisher has not chosen to "enableOverride"
          let userSyncConfig = config.getConfig('userSync') || {};
          if (!userSyncConfig.enableOverride) {
            // Delay the auto sync by the config delay
            syncUsers(userSyncConfig.syncDelay);
          }
        }
      })
    }
  }

  function auctionDone() {
    config.resetBidder();
    // when all bidders have called done callback atleast once it means auction is complete
    logInfo(`Bids Received for Auction with id: ${_auctionId}`, _bidsReceived);
    _auctionStatus = AUCTION_COMPLETED;
    executeCallback(false, true);
  }

  function onTimelyResponse(bidderCode) {
    _timelyBidders.add(bidderCode);
  }

  function callBids() {
    _auctionStatus = AUCTION_STARTED;
    _auctionStart = Date.now();

    let bidRequests = adapterManager.makeBidRequests(_adUnits, _auctionStart, _auctionId, _timeout, _labels, ortb2Fragments);
    logInfo(`Bids Requested for Auction with id: ${_auctionId}`, bidRequests);

    if (bidRequests.length < 1) {
      logWarn('No valid bid requests returned for auction');
      auctionDone();
    } else {
      addBidderRequests.call({
        dispatch: addBidderRequestsCallback,
        context: this
      }, bidRequests);
    }
  }

  /**
   * callback executed after addBidderRequests completes
   * @param {BidRequest[]} bidRequests
   */
  function addBidderRequestsCallback(bidRequests) {
    bidRequests.forEach(bidRequest => {
      addBidRequests(bidRequest);
    });

    let requests = {};
    let call = {
      bidRequests,
      run: () => {
        startAuctionTimer();

        _auctionStatus = AUCTION_IN_PROGRESS;

        events.emit(CONSTANTS.EVENTS.AUCTION_INIT, getProperties());

        let callbacks = auctionCallbacks(auctionDone, this);
        adapterManager.callBids(_adUnits, bidRequests, callbacks.addBidResponse, callbacks.adapterDone, {
          request(source, origin) {
            increment(outstandingRequests, origin);
            increment(requests, source);

            if (!sourceInfo[source]) {
              sourceInfo[source] = {
                SRA: true,
                origin
              };
            }
            if (requests[source] > 1) {
              sourceInfo[source].SRA = false;
            }
          },
          done(origin) {
            outstandingRequests[origin]--;
            if (queuedCalls[0]) {
              if (runIfOriginHasCapacity(queuedCalls[0])) {
                queuedCalls.shift();
              }
            }
          }
        }, _timeout, onTimelyResponse, ortb2Fragments);
      }
    };

    if (!runIfOriginHasCapacity(call)) {
      logWarn('queueing auction due to limited endpoint capacity');
      queuedCalls.push(call);
    }

    function runIfOriginHasCapacity(call) {
      let hasCapacity = true;

      let maxRequests = config.getConfig('maxRequestsPerOrigin') || MAX_REQUESTS_PER_ORIGIN;

      call.bidRequests.some(bidRequest => {
        let requests = 1;
        let source = (typeof bidRequest.src !== 'undefined' && bidRequest.src === CONSTANTS.S2S.SRC) ? 's2s'
          : bidRequest.bidderCode;
        // if we have no previous info on this source just let them through
        if (sourceInfo[source]) {
          if (sourceInfo[source].SRA === false) {
            // some bidders might use more than the MAX_REQUESTS_PER_ORIGIN in a single auction.  In those cases
            // set their request count to MAX_REQUESTS_PER_ORIGIN so the auction isn't permanently queued waiting
            // for capacity for that bidder
            requests = Math.min(bidRequest.bids.length, maxRequests);
          }
          if (outstandingRequests[sourceInfo[source].origin] + requests > maxRequests) {
            hasCapacity = false;
          }
        }
        // return only used for terminating this .some() iteration early if it is determined we don't have capacity
        return !hasCapacity;
      });

      if (hasCapacity) {
        call.run();
      }

      return hasCapacity;
    }

    function increment(obj, prop) {
      if (typeof obj[prop] === 'undefined') {
        obj[prop] = 1
      } else {
        obj[prop]++;
      }
    }
  }

  function addWinningBid(winningBid) {
    _winningBids = _winningBids.concat(winningBid);
    adapterManager.callBidWonBidder(winningBid.adapterCode || winningBid.bidder, winningBid, adUnits);
  }

  function setBidTargeting(bid) {
    adapterManager.callSetTargetingBidder(bid.adapterCode || bid.bidder, bid);
  }

  return {
    addBidReceived,
    addNoBid,
    executeCallback,
    callBids,
    addWinningBid,
    setBidTargeting,
    getWinningBids: () => _winningBids,
    getAuctionStart: () => _auctionStart,
    getTimeout: () => _timeout,
    getAuctionId: () => _auctionId,
    getAuctionStatus: () => _auctionStatus,
    getAdUnits: () => _adUnits,
    getAdUnitCodes: () => _adUnitCodes,
    getBidRequests: () => _bidderRequests,
    getBidsReceived: () => _bidsReceived,
    getNoBids: () => _noBids,
    getFPD: () => ortb2Fragments
  }
}

export const addBidResponse = hook('sync', function(adUnitCode, bid) {
  this.dispatch.call(null, adUnitCode, bid);
}, 'addBidResponse');

export const addBidderRequests = hook('sync', function(bidderRequests) {
  this.dispatch.call(this.context, bidderRequests);
}, 'addBidderRequests');

export const bidsBackCallback = hook('async', function (adUnits, callback) {
  if (callback) {
    callback();
  }
}, 'bidsBackCallback');

export function auctionCallbacks(auctionDone, auctionInstance, {index = auctionManager.index} = {}) {
  let outstandingBidsAdded = 0;
  let allAdapterCalledDone = false;
  let bidderRequestsDone = new Set();
  let bidResponseMap = {};
  const ready = {};

  function waitFor(requestId, result) {
    if (ready[requestId] == null) {
      ready[requestId] = GreedyPromise.resolve();
    }
    ready[requestId] = ready[requestId].then(() => GreedyPromise.resolve(result).catch(() => {}))
  }

  function guard(bidderRequest, fn) {
    let timeout = bidderRequest.timeout;
    if (timeout == null || timeout > auctionInstance.getTimeout()) {
      timeout = auctionInstance.getTimeout();
    }
    const timeRemaining = auctionInstance.getAuctionStart() + timeout - Date.now();
    const wait = ready[bidderRequest.bidderRequestId];
    const orphanWait = ready['']; // also wait for "orphan" responses that are not associated with any request
    if ((wait != null || orphanWait != null) && timeRemaining > 0) {
      GreedyPromise.race([
        GreedyPromise.timeout(timeRemaining),
        GreedyPromise.resolve(orphanWait).then(() => wait)
      ]).then(fn);
    } else {
      fn();
    }
  }

  function afterBidAdded() {
    outstandingBidsAdded--;
    if (allAdapterCalledDone && outstandingBidsAdded === 0) {
      auctionDone()
    }
  }

  function handleBidResponse(adUnitCode, bid) {
    bidResponseMap[bid.requestId] = true;

    outstandingBidsAdded++;
    let auctionId = auctionInstance.getAuctionId();

    let bidResponse = getPreparedBidForAuction({adUnitCode, bid, auctionId});

    if (bidResponse.mediaType === 'video') {
      tryAddVideoBid(auctionInstance, bidResponse, afterBidAdded);
    } else {
      addBidToAuction(auctionInstance, bidResponse);
      afterBidAdded();
    }
  }

  function adapterDone() {
    let bidderRequest = this;
    let bidderRequests = auctionInstance.getBidRequests();
    const auctionOptionsConfig = config.getConfig('auctionOptions');

    bidderRequestsDone.add(bidderRequest);

    if (auctionOptionsConfig && !isEmpty(auctionOptionsConfig)) {
      const secondaryBidders = auctionOptionsConfig.secondaryBidders;
      if (secondaryBidders && !bidderRequests.every(bidder => includes(secondaryBidders, bidder.bidderCode))) {
        bidderRequests = bidderRequests.filter(request => !includes(secondaryBidders, request.bidderCode));
      }
    }

    allAdapterCalledDone = bidderRequests.every(bidderRequest => bidderRequestsDone.has(bidderRequest));

    bidderRequest.bids.forEach(bid => {
      if (!bidResponseMap[bid.bidId]) {
        auctionInstance.addNoBid(bid);
        events.emit(CONSTANTS.EVENTS.NO_BID, bid);
      }
    });

    if (allAdapterCalledDone && outstandingBidsAdded === 0) {
      auctionDone();
    }
  }

  return {
    addBidResponse: function (adUnit, bid) {
      const bidderRequest = index.getBidderRequest(bid);
      waitFor((bidderRequest && bidderRequest.bidderRequestId) || '', addBidResponse.call({
        dispatch: handleBidResponse,
      }, adUnit, bid));
    },
    adapterDone: function () {
      guard(this, adapterDone.bind(this))
    }
  }
}

export function doCallbacksIfTimedout(auctionInstance, bidResponse) {
  if (bidResponse.timeToRespond > auctionInstance.getTimeout() + config.getConfig('timeoutBuffer')) {
    auctionInstance.executeCallback(true);
  }
}

// Add a bid to the auction.
export function addBidToAuction(auctionInstance, bidResponse) {
  setupBidTargeting(bidResponse);

  events.emit(CONSTANTS.EVENTS.BID_RESPONSE, bidResponse);
  auctionInstance.addBidReceived(bidResponse);

  doCallbacksIfTimedout(auctionInstance, bidResponse);
}

// Video bids may fail if the cache is down, or there's trouble on the network.
function tryAddVideoBid(auctionInstance, bidResponse, afterBidAdded, {index = auctionManager.index} = {}) {
  let addBid = true;

  const videoMediaType = deepAccess(
    index.getMediaTypes({
      requestId: bidResponse.originalRequestId || bidResponse.requestId,
      transactionId: bidResponse.transactionId
    }), 'video');
  const context = videoMediaType && deepAccess(videoMediaType, 'context');

  if (config.getConfig('cache.url') && context !== OUTSTREAM) {
    if (!bidResponse.videoCacheKey || config.getConfig('cache.ignoreBidderCacheKey')) {
      addBid = false;
      callPrebidCache(auctionInstance, bidResponse, afterBidAdded, videoMediaType);
    } else if (!bidResponse.vastUrl) {
      logError('videoCacheKey specified but not required vastUrl for video bid');
      addBid = false;
    }
  }
  if (addBid) {
    addBidToAuction(auctionInstance, bidResponse);
    afterBidAdded();
  }
}

export const callPrebidCache = hook('async', function(auctionInstance, bidResponse, afterBidAdded, videoMediaType) {
  store([bidResponse], function (error, cacheIds) {
    if (error) {
      logWarn(`Failed to save to the video cache: ${error}. Video bid must be discarded.`);

      doCallbacksIfTimedout(auctionInstance, bidResponse);
    } else {
      if (cacheIds[0].uuid === '') {
        logWarn(`Supplied video cache key was already in use by Prebid Cache; caching attempt was rejected. Video bid must be discarded.`);

        doCallbacksIfTimedout(auctionInstance, bidResponse);
      } else {
        bidResponse.videoCacheKey = cacheIds[0].uuid;

        if (!bidResponse.vastUrl) {
          bidResponse.vastUrl = getCacheUrl(bidResponse.videoCacheKey);
        }
        addBidToAuction(auctionInstance, bidResponse);
        afterBidAdded();
      }
    }
  });
}, 'callPrebidCache');

// Postprocess the bids so that all the universal properties exist, no matter which bidder they came from.
// This should be called before addBidToAuction().
function getPreparedBidForAuction({adUnitCode, bid, auctionId}, {index = auctionManager.index} = {}) {
  const bidderRequest = index.getBidderRequest(bid);
  const start = (bidderRequest && bidderRequest.start) || bid.requestTimestamp;

  let bidObject = Object.assign({}, bid, {
    auctionId,
    responseTimestamp: timestamp(),
    requestTimestamp: start,
    cpm: parseFloat(bid.cpm) || 0,
    bidder: bid.bidderCode,
    adUnitCode
  });

  bidObject.timeToRespond = bidObject.responseTimestamp - bidObject.requestTimestamp;

  // Let listeners know that now is the time to adjust the bid, if they want to.
  //
  // CAREFUL: Publishers rely on certain bid properties to be available (like cpm),
  // but others to not be set yet (like priceStrings). See #1372 and #1389.
  events.emit(CONSTANTS.EVENTS.BID_ADJUSTMENT, bidObject);

  // a publisher-defined renderer can be used to render bids
  const adUnitRenderer = index.getAdUnit(bidObject).renderer;

  // a publisher can also define a renderer for a mediaType
  const bidObjectMediaType = bidObject.mediaType;
  const mediaTypes = index.getMediaTypes(bidObject)
  const bidMediaType = mediaTypes && mediaTypes[bidObjectMediaType];

  var mediaTypeRenderer = bidMediaType && bidMediaType.renderer;

  var renderer = null;

  // the renderer for the mediaType takes precendence
  if (mediaTypeRenderer && mediaTypeRenderer.url && mediaTypeRenderer.render && !(mediaTypeRenderer.backupOnly === true && bid.renderer)) {
    renderer = mediaTypeRenderer;
  } else if (adUnitRenderer && adUnitRenderer.url && adUnitRenderer.render && !(adUnitRenderer.backupOnly === true && bid.renderer)) {
    renderer = adUnitRenderer;
  }

  if (renderer) {
    // be aware, an adapter could already have installed the bidder, in which case this overwrite's the existing adapter
    bidObject.renderer = Renderer.install({ url: renderer.url, config: renderer.options });// rename options to config, to make it consistent?
    bidObject.renderer.setRender(renderer.render);
  }

  // Use the config value 'mediaTypeGranularity' if it has been defined for mediaType, else use 'customPriceBucket'
  const mediaTypeGranularity = getMediaTypeGranularity(bid.mediaType, mediaTypes, config.getConfig('mediaTypePriceGranularity'));
  const priceStringsObj = getPriceBucketString(
    bidObject.cpm,
    (typeof mediaTypeGranularity === 'object') ? mediaTypeGranularity : config.getConfig('customPriceBucket'),
    config.getConfig('currency.granularityMultiplier')
  );
  bidObject.pbLg = priceStringsObj.low;
  bidObject.pbMg = priceStringsObj.med;
  bidObject.pbHg = priceStringsObj.high;
  bidObject.pbAg = priceStringsObj.auto;
  bidObject.pbDg = priceStringsObj.dense;
  bidObject.pbCg = priceStringsObj.custom;

  return bidObject;
}

function setupBidTargeting(bidObject) {
  let keyValues;
  const cpmCheck = (bidderSettings.get(bidObject.bidderCode, 'allowZeroCpmBids') === true) ? bidObject.cpm >= 0 : bidObject.cpm > 0;
  if (bidObject.bidderCode && (cpmCheck || bidObject.dealId)) {
    keyValues = getKeyValueTargetingPairs(bidObject.bidderCode, bidObject);
  }

  // use any targeting provided as defaults, otherwise just set from getKeyValueTargetingPairs
  bidObject.adserverTargeting = Object.assign(bidObject.adserverTargeting || {}, keyValues);
}

/**
 * @param {MediaType} mediaType
 * @param mediaTypes media types map from adUnit
 * @param {MediaTypePriceGranularity} [mediaTypePriceGranularity]
 * @returns {(Object|string|undefined)}
 */
export function getMediaTypeGranularity(mediaType, mediaTypes, mediaTypePriceGranularity) {
  if (mediaType && mediaTypePriceGranularity) {
    if (mediaType === VIDEO) {
      const context = deepAccess(mediaTypes, `${VIDEO}.context`, 'instream');
      if (mediaTypePriceGranularity[`${VIDEO}-${context}`]) {
        return mediaTypePriceGranularity[`${VIDEO}-${context}`];
      }
    }
    return mediaTypePriceGranularity[mediaType];
  }
}

/**
 * This function returns the price granularity defined. It can be either publisher defined or default value
 * @param bid bid response object
 * @param index
 * @returns {string} granularity
 */
export const getPriceGranularity = (bid, {index = auctionManager.index} = {}) => {
  // Use the config value 'mediaTypeGranularity' if it has been set for mediaType, else use 'priceGranularity'
  const mediaTypeGranularity = getMediaTypeGranularity(bid.mediaType, index.getMediaTypes(bid), config.getConfig('mediaTypePriceGranularity'));
  const granularity = (typeof bid.mediaType === 'string' && mediaTypeGranularity) ? ((typeof mediaTypeGranularity === 'string') ? mediaTypeGranularity : 'custom') : config.getConfig('priceGranularity');
  return granularity;
}

/**
 * This function returns a function to get bid price by price granularity
 * @param {string} granularity
 * @returns {function}
 */
export const getPriceByGranularity = (granularity) => {
  return (bid) => {
    const bidGranularity = granularity || getPriceGranularity(bid);
    if (bidGranularity === CONSTANTS.GRANULARITY_OPTIONS.AUTO) {
      return bid.pbAg;
    } else if (bidGranularity === CONSTANTS.GRANULARITY_OPTIONS.DENSE) {
      return bid.pbDg;
    } else if (bidGranularity === CONSTANTS.GRANULARITY_OPTIONS.LOW) {
      return bid.pbLg;
    } else if (bidGranularity === CONSTANTS.GRANULARITY_OPTIONS.MEDIUM) {
      return bid.pbMg;
    } else if (bidGranularity === CONSTANTS.GRANULARITY_OPTIONS.HIGH) {
      return bid.pbHg;
    } else if (bidGranularity === CONSTANTS.GRANULARITY_OPTIONS.CUSTOM) {
      return bid.pbCg;
    }
  }
}

/**
 * This function returns a function to get first advertiser domain from bid response meta
 * @returns {function}
 */
export const getAdvertiserDomain = () => {
  return (bid) => {
    return (bid.meta && bid.meta.advertiserDomains && bid.meta.advertiserDomains.length > 0) ? bid.meta.advertiserDomains[0] : '';
  }
}

// factory for key value objs
function createKeyVal(key, value) {
  return {
    key,
    val: (typeof value === 'function')
      ? function (bidResponse, bidReq) {
        return value(bidResponse, bidReq);
      }
      : function (bidResponse) {
        return getValue(bidResponse, value);
      }
  };
}

function defaultAdserverTargeting() {
  const TARGETING_KEYS = CONSTANTS.TARGETING_KEYS;
  return [
    createKeyVal(TARGETING_KEYS.BIDDER, 'bidderCode'),
    createKeyVal(TARGETING_KEYS.AD_ID, 'adId'),
    createKeyVal(TARGETING_KEYS.PRICE_BUCKET, getPriceByGranularity()),
    createKeyVal(TARGETING_KEYS.SIZE, 'size'),
    createKeyVal(TARGETING_KEYS.DEAL, 'dealId'),
    createKeyVal(TARGETING_KEYS.SOURCE, 'source'),
    createKeyVal(TARGETING_KEYS.FORMAT, 'mediaType'),
    createKeyVal(TARGETING_KEYS.ADOMAIN, getAdvertiserDomain()),
  ]
}

/**
 * @param {string} mediaType
 * @param {string} bidderCode
 * @param {BidRequest} bidReq
 * @returns {*}
 */
export function getStandardBidderSettings(mediaType, bidderCode) {
  const TARGETING_KEYS = CONSTANTS.TARGETING_KEYS;
  const standardSettings = Object.assign({}, bidderSettings.settingsFor(null));

  if (!standardSettings[CONSTANTS.JSON_MAPPING.ADSERVER_TARGETING]) {
    standardSettings[CONSTANTS.JSON_MAPPING.ADSERVER_TARGETING] = defaultAdserverTargeting();
  }

  if (mediaType === 'video') {
    const adserverTargeting = standardSettings[CONSTANTS.JSON_MAPPING.ADSERVER_TARGETING].slice();
    standardSettings[CONSTANTS.JSON_MAPPING.ADSERVER_TARGETING] = adserverTargeting;

    // Adding hb_uuid + hb_cache_id
    [TARGETING_KEYS.UUID, TARGETING_KEYS.CACHE_ID].forEach(targetingKeyVal => {
      if (typeof find(adserverTargeting, kvPair => kvPair.key === targetingKeyVal) === 'undefined') {
        adserverTargeting.push(createKeyVal(targetingKeyVal, 'videoCacheKey'));
      }
    });

    // Adding hb_cache_host
    if (config.getConfig('cache.url') && (!bidderCode || bidderSettings.get(bidderCode, 'sendStandardTargeting') !== false)) {
      const urlInfo = parseUrl(config.getConfig('cache.url'));

      if (typeof find(adserverTargeting, targetingKeyVal => targetingKeyVal.key === TARGETING_KEYS.CACHE_HOST) === 'undefined') {
        adserverTargeting.push(createKeyVal(TARGETING_KEYS.CACHE_HOST, function(bidResponse) {
          return deepAccess(bidResponse, `adserverTargeting.${TARGETING_KEYS.CACHE_HOST}`)
            ? bidResponse.adserverTargeting[TARGETING_KEYS.CACHE_HOST] : urlInfo.hostname;
        }));
      }
    }
  }
  return standardSettings;
}

export function getKeyValueTargetingPairs(bidderCode, custBidObj, {index = auctionManager.index} = {}) {
  if (!custBidObj) {
    return {};
  }
  const bidRequest = index.getBidRequest(custBidObj);
  var keyValues = {};

  // 1) set the keys from "standard" setting or from prebid defaults
  // initialize default if not set
  const standardSettings = getStandardBidderSettings(custBidObj.mediaType, bidderCode);
  setKeys(keyValues, standardSettings, custBidObj, bidRequest);

  // 2) set keys from specific bidder setting override if they exist
  if (bidderCode && bidderSettings.getOwn(bidderCode, CONSTANTS.JSON_MAPPING.ADSERVER_TARGETING)) {
    setKeys(keyValues, bidderSettings.ownSettingsFor(bidderCode), custBidObj, bidRequest);
    custBidObj.sendStandardTargeting = bidderSettings.get(bidderCode, 'sendStandardTargeting');
  }

  // set native key value targeting
  if (FEATURES.NATIVE && custBidObj['native']) {
    keyValues = Object.assign({}, keyValues, getNativeTargeting(custBidObj));
  }

  return keyValues;
}

function setKeys(keyValues, bidderSettings, custBidObj, bidReq) {
  var targeting = bidderSettings[CONSTANTS.JSON_MAPPING.ADSERVER_TARGETING];
  custBidObj.size = custBidObj.getSize();

  _each(targeting, function (kvPair) {
    var key = kvPair.key;
    var value = kvPair.val;

    if (keyValues[key]) {
      logWarn('The key: ' + key + ' is being overwritten');
    }

    if (isFn(value)) {
      try {
        value = value(custBidObj, bidReq);
      } catch (e) {
        logError('bidmanager', 'ERROR', e);
      }
    }

    if (
      ((typeof bidderSettings.suppressEmptyKeys !== 'undefined' && bidderSettings.suppressEmptyKeys === true) ||
      key === CONSTANTS.TARGETING_KEYS.DEAL) && // hb_deal is suppressed automatically if not set
      (
        isEmptyStr(value) ||
        value === null ||
        value === undefined
      )
    ) {
      logInfo("suppressing empty key '" + key + "' from adserver targeting");
    } else {
      keyValues[key] = value;
    }
  });

  return keyValues;
}

export function adjustBids(bid) {
  let code = bid.bidderCode;
  let bidPriceAdjusted = bid.cpm;
  const bidCpmAdjustment = bidderSettings.get(code || null, 'bidCpmAdjustment');

  if (bidCpmAdjustment && typeof bidCpmAdjustment === 'function') {
    try {
      bidPriceAdjusted = bidCpmAdjustment(bid.cpm, Object.assign({}, bid));
    } catch (e) {
      logError('Error during bid adjustment', 'bidmanager.js', e);
    }
  }

  if (bidPriceAdjusted >= 0) {
    bid.cpm = bidPriceAdjusted;
  }
}

/**
 * groupByPlacement is a reduce function that converts an array of Bid objects
 * to an object with placement codes as keys, with each key representing an object
 * with an array of `Bid` objects for that placement
 * @returns {*} as { [adUnitCode]: { bids: [Bid, Bid, Bid] } }
 */
function groupByPlacement(bidsByPlacement, bid) {
  if (!bidsByPlacement[bid.adUnitCode]) { bidsByPlacement[bid.adUnitCode] = { bids: [] }; }
  bidsByPlacement[bid.adUnitCode].bids.push(bid);
  return bidsByPlacement;
}

/**
 * Returns a list of bids that we haven't received a response yet where the bidder did not call done
 * @param {BidRequest[]} bidderRequests List of bids requested for auction instance
 * @param {Set} timelyBidders Set of bidders which responded in time
 *
 * @typedef {Object} TimedOutBid
 * @property {string} bidId The id representing the bid
 * @property {string} bidder The string name of the bidder
 * @property {string} adUnitCode The code used to uniquely identify the ad unit on the publisher's page
 * @property {string} auctionId The id representing the auction
 *
 * @return {Array<TimedOutBid>} List of bids that Prebid hasn't received a response for
 */
function getTimedOutBids(bidderRequests, timelyBidders) {
  const timedOutBids = bidderRequests
    .map(bid => (bid.bids || []).filter(bid => !timelyBidders.has(bid.bidder)))
    .reduce(flatten, []);

  return timedOutBids;
}
