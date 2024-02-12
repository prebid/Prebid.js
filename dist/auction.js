"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.addBidResponse = exports.AUCTION_STARTED = exports.AUCTION_IN_PROGRESS = exports.AUCTION_COMPLETED = void 0;
exports.addBidToAuction = addBidToAuction;
exports.addBidderRequests = void 0;
exports.adjustBids = adjustBids;
exports.auctionCallbacks = auctionCallbacks;
exports.getDSP = exports.getCreativeId = exports.getAdvertiserDomain = exports.callPrebidCache = exports.bidsBackCallback = exports.batchingCache = void 0;
exports.getKeyValueTargetingPairs = getKeyValueTargetingPairs;
exports.getMediaTypeGranularity = getMediaTypeGranularity;
exports.getPrimaryCatId = exports.getPriceGranularity = exports.getPriceByGranularity = void 0;
exports.getStandardBidderSettings = getStandardBidderSettings;
exports.newAuction = newAuction;
exports.resetAuctionState = resetAuctionState;
exports.responsesReady = void 0;
var _utils = require("./utils.js");
var _cpmBucketManager = require("./cpmBucketManager.js");
var _native = require("./native.js");
var _videoCache = require("./videoCache.js");
var _Renderer = require("./Renderer.js");
var _config = require("./config.js");
var _userSync = require("./userSync.js");
var _hook = require("./hook.js");
var _polyfill = require("./polyfill.js");
var _video = require("./video.js");
var _mediaTypes = require("./mediaTypes.js");
var _auctionManager = require("./auctionManager.js");
var _bidderSettings = require("./bidderSettings.js");
var events = _interopRequireWildcard(require("./events.js"));
var _adapterManager = _interopRequireDefault(require("./adapterManager.js"));
var _constants = _interopRequireDefault(require("./constants.json"));
var _promise = require("./utils/promise.js");
var _perfMetrics = require("./utils/perfMetrics.js");
var _cpm = require("./utils/cpm.js");
var _prebidGlobal = require("./prebidGlobal.js");
function _getRequireWildcardCache(e) { if ("function" != typeof WeakMap) return null; var r = new WeakMap(), t = new WeakMap(); return (_getRequireWildcardCache = function (e) { return e ? t : r; })(e); }
function _interopRequireWildcard(e, r) { if (!r && e && e.__esModule) return e; if (null === e || "object" != typeof e && "function" != typeof e) return { default: e }; var t = _getRequireWildcardCache(r); if (t && t.has(e)) return t.get(e); var n = { __proto__: null }, a = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var u in e) if ("default" !== u && Object.prototype.hasOwnProperty.call(e, u)) { var i = a ? Object.getOwnPropertyDescriptor(e, u) : null; i && (i.get || i.set) ? Object.defineProperty(n, u, i) : n[u] = e[u]; } return n.default = e, t && t.set(e, n), n; }
/**
 * Module for auction instances.
 *
 * In Prebid 0.x, $$PREBID_GLOBAL$$ had _bidsRequested and _bidsReceived as public properties.
 * Starting 1.0, Prebid will support concurrent auctions. Each auction instance will store private properties, bidsRequested and bidsReceived.
 *
 * AuctionManager will create an instance of auction and will store all the auctions.
 *
 */

/**
 * @typedef {import('../src/adapters/bidderFactory.js').BidRequest} BidRequest
 * @typedef {import('../src/adapters/bidderFactory.js').Bid} Bid
 * @typedef {import('../src/config.js').MediaTypePriceGranularity} MediaTypePriceGranularity
 * @typedef {import('../src/mediaTypes.js').MediaType} MediaType
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

const {
  syncUsers
} = _userSync.userSync;
const AUCTION_STARTED = exports.AUCTION_STARTED = 'started';
const AUCTION_IN_PROGRESS = exports.AUCTION_IN_PROGRESS = 'inProgress';
const AUCTION_COMPLETED = exports.AUCTION_COMPLETED = 'completed';

// register event for bid adjustment
events.on(_constants.default.EVENTS.BID_ADJUSTMENT, function (bid) {
  adjustBids(bid);
});
const MAX_REQUESTS_PER_ORIGIN = 4;
const outstandingRequests = {};
const sourceInfo = {};
const queuedCalls = [];
const pbjsInstance = (0, _prebidGlobal.getGlobal)();

/**
 * Clear global state for tests
 */
function resetAuctionState() {
  queuedCalls.length = 0;
  [outstandingRequests, sourceInfo].forEach(ob => Object.keys(ob).forEach(k => {
    delete ob[k];
  }));
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
 * @param {{global: {}, bidder: {}}} requestConfig.ortb2Fragments first party data, separated into global
 *    (from getConfig('ortb2') + requestBids({ortb2})) and bidder (a map from bidderCode to ortb2)
 * @param {Object} requestConfig.metrics
 * @returns {Auction} auction instance
 */
function newAuction(_ref) {
  let {
    adUnits,
    adUnitCodes,
    callback,
    cbTimeout,
    labels,
    auctionId,
    ortb2Fragments,
    metrics
  } = _ref;
  metrics = (0, _perfMetrics.useMetrics)(metrics);
  const _adUnits = adUnits;
  const _labels = labels;
  const _adUnitCodes = adUnitCodes;
  const _auctionId = auctionId || (0, _utils.generateUUID)();
  const _timeout = cbTimeout;
  const _timelyRequests = new Set();
  const done = (0, _promise.defer)();
  let _bidsRejected = [];
  let _callback = callback;
  let _bidderRequests = [];
  let _bidsReceived = [];
  let _noBids = [];
  let _winningBids = [];
  let _auctionStart;
  let _auctionEnd;
  let _timeoutTimer;
  let _auctionStatus;
  let _nonBids = [];
  function addBidRequests(bidderRequests) {
    _bidderRequests = _bidderRequests.concat(bidderRequests);
  }
  function addBidReceived(bidsReceived) {
    _bidsReceived = _bidsReceived.concat(bidsReceived);
  }
  function addBidRejected(bidsRejected) {
    _bidsRejected = _bidsRejected.concat(bidsRejected);
  }
  function addNoBid(noBid) {
    _noBids = _noBids.concat(noBid);
  }
  function addNonBids(seatnonbids) {
    _nonBids = _nonBids.concat(seatnonbids);
  }
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
      bidsRejected: _bidsRejected,
      winningBids: _winningBids,
      timeout: _timeout,
      metrics: metrics,
      seatNonBids: _nonBids
    };
  }
  function startAuctionTimer() {
    _timeoutTimer = setTimeout(() => executeCallback(true), _timeout);
  }
  function executeCallback(timedOut) {
    if (!timedOut) {
      clearTimeout(_timeoutTimer);
    } else {
      events.emit(_constants.default.EVENTS.AUCTION_TIMEOUT, getProperties());
    }
    if (_auctionEnd === undefined) {
      let timedOutRequests = [];
      if (timedOut) {
        (0, _utils.logMessage)("Auction ".concat(_auctionId, " timedOut"));
        timedOutRequests = _bidderRequests.filter(rq => !_timelyRequests.has(rq.bidderRequestId)).flatMap(br => br.bids);
        if (timedOutRequests.length) {
          events.emit(_constants.default.EVENTS.BID_TIMEOUT, timedOutRequests);
        }
      }
      _auctionStatus = AUCTION_COMPLETED;
      _auctionEnd = Date.now();
      metrics.checkpoint('auctionEnd');
      metrics.timeBetween('requestBids', 'auctionEnd', 'requestBids.total');
      metrics.timeBetween('callBids', 'auctionEnd', 'requestBids.callBids');
      done.resolve();
      events.emit(_constants.default.EVENTS.AUCTION_END, getProperties());
      bidsBackCallback(_adUnits, function () {
        try {
          if (_callback != null) {
            const bids = _bidsReceived.filter(bid => _adUnitCodes.includes(bid.adUnitCode)).reduce(groupByPlacement, {});
            _callback.apply(pbjsInstance, [bids, timedOut, _auctionId]);
            _callback = null;
          }
        } catch (e) {
          (0, _utils.logError)('Error executing bidsBackHandler', null, e);
        } finally {
          // Calling timed out bidders
          if (timedOutRequests.length) {
            _adapterManager.default.callTimedOutBidders(adUnits, timedOutRequests, _timeout);
          }
          // Only automatically sync if the publisher has not chosen to "enableOverride"
          let userSyncConfig = _config.config.getConfig('userSync') || {};
          if (!userSyncConfig.enableOverride) {
            // Delay the auto sync by the config delay
            syncUsers(userSyncConfig.syncDelay);
          }
        }
      });
    }
  }
  function auctionDone() {
    _config.config.resetBidder();
    // when all bidders have called done callback atleast once it means auction is complete
    (0, _utils.logInfo)("Bids Received for Auction with id: ".concat(_auctionId), _bidsReceived);
    _auctionStatus = AUCTION_COMPLETED;
    executeCallback(false);
  }
  function onTimelyResponse(bidderRequestId) {
    _timelyRequests.add(bidderRequestId);
  }
  function callBids() {
    _auctionStatus = AUCTION_STARTED;
    _auctionStart = Date.now();
    let bidRequests = metrics.measureTime('requestBids.makeRequests', () => _adapterManager.default.makeBidRequests(_adUnits, _auctionStart, _auctionId, _timeout, _labels, ortb2Fragments, metrics));
    (0, _utils.logInfo)("Bids Requested for Auction with id: ".concat(_auctionId), bidRequests);
    metrics.checkpoint('callBids');
    if (bidRequests.length < 1) {
      (0, _utils.logWarn)('No valid bid requests returned for auction');
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
        events.emit(_constants.default.EVENTS.AUCTION_INIT, getProperties());
        let callbacks = auctionCallbacks(auctionDone, this);
        _adapterManager.default.callBids(_adUnits, bidRequests, callbacks.addBidResponse, callbacks.adapterDone, {
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
      (0, _utils.logWarn)('queueing auction due to limited endpoint capacity');
      queuedCalls.push(call);
    }
    function runIfOriginHasCapacity(call) {
      let hasCapacity = true;
      let maxRequests = _config.config.getConfig('maxRequestsPerOrigin') || MAX_REQUESTS_PER_ORIGIN;
      call.bidRequests.some(bidRequest => {
        let requests = 1;
        let source = typeof bidRequest.src !== 'undefined' && bidRequest.src === _constants.default.S2S.SRC ? 's2s' : bidRequest.bidderCode;
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
        obj[prop] = 1;
      } else {
        obj[prop]++;
      }
    }
  }
  function addWinningBid(winningBid) {
    const winningAd = adUnits.find(adUnit => adUnit.adUnitId === winningBid.adUnitId);
    _winningBids = _winningBids.concat(winningBid);
    (0, _utils.callBurl)(winningBid);
    _adapterManager.default.callBidWonBidder(winningBid.adapterCode || winningBid.bidder, winningBid, adUnits);
    if (winningAd && !winningAd.deferBilling) _adapterManager.default.callBidBillableBidder(winningBid);
  }
  function setBidTargeting(bid) {
    _adapterManager.default.callSetTargetingBidder(bid.adapterCode || bid.bidder, bid);
  }
  events.on(_constants.default.EVENTS.SEAT_NON_BID, event => {
    if (event.auctionId === _auctionId) {
      addNonBids(event.seatnonbid);
    }
  });
  return {
    addBidReceived,
    addBidRejected,
    addNoBid,
    callBids,
    addWinningBid,
    setBidTargeting,
    getWinningBids: () => _winningBids,
    getAuctionStart: () => _auctionStart,
    getAuctionEnd: () => _auctionEnd,
    getTimeout: () => _timeout,
    getAuctionId: () => _auctionId,
    getAuctionStatus: () => _auctionStatus,
    getAdUnits: () => _adUnits,
    getAdUnitCodes: () => _adUnitCodes,
    getBidRequests: () => _bidderRequests,
    getBidsReceived: () => _bidsReceived,
    getNoBids: () => _noBids,
    getNonBids: () => _nonBids,
    getFPD: () => ortb2Fragments,
    getMetrics: () => metrics,
    end: done.promise
  };
}

/**
 * Hook into this to intercept bids before they are added to an auction.
 *
 * @type {Function}
 * @param adUnitCode
 * @param bid
 * @param {function(String): void} reject a function that, when called, rejects `bid` with the given reason.
 */
const addBidResponse = exports.addBidResponse = (0, _hook.hook)('sync', function (adUnitCode, bid, reject) {
  this.dispatch.call(null, adUnitCode, bid);
}, 'addBidResponse');

/**
 * Delay hook for adapter responses.
 *
 * `ready` is a promise; auctions wait for it to resolve before closing. Modules can hook into this
 * to delay the end of auctions while they perform initialization that does not need to delay their start.
 */
const responsesReady = exports.responsesReady = (0, _hook.hook)('sync', ready => ready, 'responsesReady');
const addBidderRequests = exports.addBidderRequests = (0, _hook.hook)('sync', function (bidderRequests) {
  this.dispatch.call(this.context, bidderRequests);
}, 'addBidderRequests');
const bidsBackCallback = exports.bidsBackCallback = (0, _hook.hook)('async', function (adUnits, callback) {
  if (callback) {
    callback();
  }
}, 'bidsBackCallback');
function auctionCallbacks(auctionDone, auctionInstance) {
  let {
    index = _auctionManager.auctionManager.index
  } = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
  let outstandingBidsAdded = 0;
  let allAdapterCalledDone = false;
  let bidderRequestsDone = new Set();
  let bidResponseMap = {};
  function afterBidAdded() {
    outstandingBidsAdded--;
    if (allAdapterCalledDone && outstandingBidsAdded === 0) {
      auctionDone();
    }
  }
  function handleBidResponse(adUnitCode, bid, handler) {
    bidResponseMap[bid.requestId] = true;
    addCommonResponseProperties(bid, adUnitCode);
    outstandingBidsAdded++;
    return handler(afterBidAdded);
  }
  function acceptBidResponse(adUnitCode, bid) {
    handleBidResponse(adUnitCode, bid, done => {
      let bidResponse = getPreparedBidForAuction(bid);
      events.emit(_constants.default.EVENTS.BID_ACCEPTED, bidResponse);
      if (true && bidResponse.mediaType === _mediaTypes.VIDEO) {
        tryAddVideoBid(auctionInstance, bidResponse, done);
      } else {
        if (true && bidResponse.native != null && typeof bidResponse.native === 'object') {
          // NOTE: augment bidResponse.native even if bidResponse.mediaType !== NATIVE; it's possible
          // to treat banner responses as native
          addLegacyFieldsIfNeeded(bidResponse);
        }
        addBidToAuction(auctionInstance, bidResponse);
        done();
      }
    });
  }
  function rejectBidResponse(adUnitCode, bid, reason) {
    return handleBidResponse(adUnitCode, bid, done => {
      bid.rejectionReason = reason;
      (0, _utils.logWarn)("Bid from ".concat(bid.bidder || 'unknown bidder', " was rejected: ").concat(reason), bid);
      events.emit(_constants.default.EVENTS.BID_REJECTED, bid);
      auctionInstance.addBidRejected(bid);
      done();
    });
  }
  function adapterDone() {
    let bidderRequest = this;
    let bidderRequests = auctionInstance.getBidRequests();
    const auctionOptionsConfig = _config.config.getConfig('auctionOptions');
    bidderRequestsDone.add(bidderRequest);
    if (auctionOptionsConfig && !(0, _utils.isEmpty)(auctionOptionsConfig)) {
      const secondaryBidders = auctionOptionsConfig.secondaryBidders;
      if (secondaryBidders && !bidderRequests.every(bidder => (0, _polyfill.includes)(secondaryBidders, bidder.bidderCode))) {
        bidderRequests = bidderRequests.filter(request => !(0, _polyfill.includes)(secondaryBidders, request.bidderCode));
      }
    }
    allAdapterCalledDone = bidderRequests.every(bidderRequest => bidderRequestsDone.has(bidderRequest));
    bidderRequest.bids.forEach(bid => {
      if (!bidResponseMap[bid.bidId]) {
        auctionInstance.addNoBid(bid);
        events.emit(_constants.default.EVENTS.NO_BID, bid);
      }
    });
    if (allAdapterCalledDone && outstandingBidsAdded === 0) {
      auctionDone();
    }
  }
  return {
    addBidResponse: function () {
      function addBid(adUnitCode, bid) {
        addBidResponse.call({
          dispatch: acceptBidResponse
        }, adUnitCode, bid, (() => {
          let rejected = false;
          return reason => {
            if (!rejected) {
              rejectBidResponse(adUnitCode, bid, reason);
              rejected = true;
            }
          };
        })());
      }
      addBid.reject = rejectBidResponse;
      return addBid;
    }(),
    adapterDone: function () {
      responsesReady(_promise.GreedyPromise.resolve()).finally(() => adapterDone.call(this));
    }
  };
}

// Add a bid to the auction.
function addBidToAuction(auctionInstance, bidResponse) {
  setupBidTargeting(bidResponse);
  (0, _perfMetrics.useMetrics)(bidResponse.metrics).timeSince('addBidResponse', 'addBidResponse.total');
  auctionInstance.addBidReceived(bidResponse);
  events.emit(_constants.default.EVENTS.BID_RESPONSE, bidResponse);
}

// Video bids may fail if the cache is down, or there's trouble on the network.
function tryAddVideoBid(auctionInstance, bidResponse, afterBidAdded) {
  let {
    index = _auctionManager.auctionManager.index
  } = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : {};
  let addBid = true;
  const videoMediaType = (0, _utils.deepAccess)(index.getMediaTypes({
    requestId: bidResponse.originalRequestId || bidResponse.requestId,
    adUnitId: bidResponse.adUnitId
  }), 'video');
  const context = videoMediaType && (0, _utils.deepAccess)(videoMediaType, 'context');
  const useCacheKey = videoMediaType && (0, _utils.deepAccess)(videoMediaType, 'useCacheKey');
  if (_config.config.getConfig('cache.url') && (useCacheKey || context !== _video.OUTSTREAM)) {
    if (!bidResponse.videoCacheKey || _config.config.getConfig('cache.ignoreBidderCacheKey')) {
      addBid = false;
      callPrebidCache(auctionInstance, bidResponse, afterBidAdded, videoMediaType);
    } else if (!bidResponse.vastUrl) {
      (0, _utils.logError)('videoCacheKey specified but not required vastUrl for video bid');
      addBid = false;
    }
  }
  if (addBid) {
    addBidToAuction(auctionInstance, bidResponse);
    afterBidAdded();
  }
}

// Native bid response might be in ortb2 format - adds legacy field for backward compatibility
const addLegacyFieldsIfNeeded = bidResponse => {
  var _auctionManager$index, _bidResponse$native;
  const nativeOrtbRequest = (_auctionManager$index = _auctionManager.auctionManager.index.getAdUnit(bidResponse)) === null || _auctionManager$index === void 0 ? void 0 : _auctionManager$index.nativeOrtbRequest;
  const nativeOrtbResponse = (_bidResponse$native = bidResponse.native) === null || _bidResponse$native === void 0 ? void 0 : _bidResponse$native.ortb;
  if (nativeOrtbRequest && nativeOrtbResponse) {
    const legacyResponse = (0, _native.toLegacyResponse)(nativeOrtbResponse, nativeOrtbRequest);
    Object.assign(bidResponse.native, legacyResponse);
  }
};
const _storeInCache = batch => {
  (0, _videoCache.store)(batch.map(entry => entry.bidResponse), function (error, cacheIds) {
    cacheIds.forEach((cacheId, i) => {
      const {
        auctionInstance,
        bidResponse,
        afterBidAdded
      } = batch[i];
      if (error) {
        (0, _utils.logWarn)("Failed to save to the video cache: ".concat(error, ". Video bid must be discarded."));
      } else {
        if (cacheId.uuid === '') {
          (0, _utils.logWarn)("Supplied video cache key was already in use by Prebid Cache; caching attempt was rejected. Video bid must be discarded.");
        } else {
          bidResponse.videoCacheKey = cacheId.uuid;
          if (!bidResponse.vastUrl) {
            bidResponse.vastUrl = (0, _videoCache.getCacheUrl)(bidResponse.videoCacheKey);
          }
          addBidToAuction(auctionInstance, bidResponse);
          afterBidAdded();
        }
      }
    });
  });
};
const storeInCache = true ? _storeInCache : () => {};
let batchSize, batchTimeout;
_config.config.getConfig('cache', cacheConfig => {
  batchSize = typeof cacheConfig.cache.batchSize === 'number' && cacheConfig.cache.batchSize > 0 ? cacheConfig.cache.batchSize : 1;
  batchTimeout = typeof cacheConfig.cache.batchTimeout === 'number' && cacheConfig.cache.batchTimeout > 0 ? cacheConfig.cache.batchTimeout : 0;
});
const batchingCache = function () {
  let timeout = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : setTimeout;
  let cache = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : storeInCache;
  let batches = [[]];
  let debouncing = false;
  const noTimeout = cb => cb();
  return function (auctionInstance, bidResponse, afterBidAdded) {
    const batchFunc = batchTimeout > 0 ? timeout : noTimeout;
    if (batches[batches.length - 1].length >= batchSize) {
      batches.push([]);
    }
    batches[batches.length - 1].push({
      auctionInstance,
      bidResponse,
      afterBidAdded
    });
    if (!debouncing) {
      debouncing = true;
      batchFunc(() => {
        batches.forEach(cache);
        batches = [[]];
        debouncing = false;
      }, batchTimeout);
    }
  };
};
exports.batchingCache = batchingCache;
const batchAndStore = batchingCache();
const callPrebidCache = exports.callPrebidCache = (0, _hook.hook)('async', function (auctionInstance, bidResponse, afterBidAdded, videoMediaType) {
  batchAndStore(auctionInstance, bidResponse, afterBidAdded);
}, 'callPrebidCache');

/**
 * Augment `bidResponse` with properties that are common across all bids - including rejected bids.
 *
 */
function addCommonResponseProperties(bidResponse, adUnitCode) {
  let {
    index = _auctionManager.auctionManager.index
  } = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
  const bidderRequest = index.getBidderRequest(bidResponse);
  const adUnit = index.getAdUnit(bidResponse);
  const start = bidderRequest && bidderRequest.start || bidResponse.requestTimestamp;
  Object.assign(bidResponse, {
    responseTimestamp: bidResponse.responseTimestamp || (0, _utils.timestamp)(),
    requestTimestamp: bidResponse.requestTimestamp || start,
    cpm: parseFloat(bidResponse.cpm) || 0,
    bidder: bidResponse.bidder || bidResponse.bidderCode,
    adUnitCode
  });
  if ((adUnit === null || adUnit === void 0 ? void 0 : adUnit.ttlBuffer) != null) {
    bidResponse.ttlBuffer = adUnit.ttlBuffer;
  }
  bidResponse.timeToRespond = bidResponse.responseTimestamp - bidResponse.requestTimestamp;
}

/**
 * Add additional bid response properties that are universal for all _accepted_ bids.
 */
function getPreparedBidForAuction(bid) {
  var _index$getBidRequest;
  let {
    index = _auctionManager.auctionManager.index
  } = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  // Let listeners know that now is the time to adjust the bid, if they want to.
  //
  // CAREFUL: Publishers rely on certain bid properties to be available (like cpm),
  // but others to not be set yet (like priceStrings). See #1372 and #1389.
  events.emit(_constants.default.EVENTS.BID_ADJUSTMENT, bid);

  // a publisher-defined renderer can be used to render bids
  const bidRenderer = ((_index$getBidRequest = index.getBidRequest(bid)) === null || _index$getBidRequest === void 0 ? void 0 : _index$getBidRequest.renderer) || index.getAdUnit(bid).renderer;

  // a publisher can also define a renderer for a mediaType
  const bidObjectMediaType = bid.mediaType;
  const mediaTypes = index.getMediaTypes(bid);
  const bidMediaType = mediaTypes && mediaTypes[bidObjectMediaType];
  var mediaTypeRenderer = bidMediaType && bidMediaType.renderer;
  var renderer = null;

  // the renderer for the mediaType takes precendence
  if (mediaTypeRenderer && mediaTypeRenderer.url && mediaTypeRenderer.render && !(mediaTypeRenderer.backupOnly === true && bid.renderer)) {
    renderer = mediaTypeRenderer;
  } else if (bidRenderer && bidRenderer.url && bidRenderer.render && !(bidRenderer.backupOnly === true && bid.renderer)) {
    renderer = bidRenderer;
  }
  if (renderer) {
    // be aware, an adapter could already have installed the bidder, in which case this overwrite's the existing adapter
    bid.renderer = _Renderer.Renderer.install({
      url: renderer.url,
      config: renderer.options
    }); // rename options to config, to make it consistent?
    bid.renderer.setRender(renderer.render);
  }

  // Use the config value 'mediaTypeGranularity' if it has been defined for mediaType, else use 'customPriceBucket'
  const mediaTypeGranularity = getMediaTypeGranularity(bid.mediaType, mediaTypes, _config.config.getConfig('mediaTypePriceGranularity'));
  const priceStringsObj = (0, _cpmBucketManager.getPriceBucketString)(bid.cpm, typeof mediaTypeGranularity === 'object' ? mediaTypeGranularity : _config.config.getConfig('customPriceBucket'), _config.config.getConfig('currency.granularityMultiplier'));
  bid.pbLg = priceStringsObj.low;
  bid.pbMg = priceStringsObj.med;
  bid.pbHg = priceStringsObj.high;
  bid.pbAg = priceStringsObj.auto;
  bid.pbDg = priceStringsObj.dense;
  bid.pbCg = priceStringsObj.custom;
  return bid;
}
function setupBidTargeting(bidObject) {
  let keyValues;
  const cpmCheck = _bidderSettings.bidderSettings.get(bidObject.bidderCode, 'allowZeroCpmBids') === true ? bidObject.cpm >= 0 : bidObject.cpm > 0;
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
function getMediaTypeGranularity(mediaType, mediaTypes, mediaTypePriceGranularity) {
  if (mediaType && mediaTypePriceGranularity) {
    if (true && mediaType === _mediaTypes.VIDEO) {
      const context = (0, _utils.deepAccess)(mediaTypes, "".concat(_mediaTypes.VIDEO, ".context"), 'instream');
      if (mediaTypePriceGranularity["".concat(_mediaTypes.VIDEO, "-").concat(context)]) {
        return mediaTypePriceGranularity["".concat(_mediaTypes.VIDEO, "-").concat(context)];
      }
    }
    return mediaTypePriceGranularity[mediaType];
  }
}

/**
 * This function returns the price granularity defined. It can be either publisher defined or default value
 * @param {Bid} bid bid response object
 * @param {object} obj
 * @param {object} obj.index
 * @returns {string} granularity
 */
const getPriceGranularity = function (bid) {
  let {
    index = _auctionManager.auctionManager.index
  } = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  // Use the config value 'mediaTypeGranularity' if it has been set for mediaType, else use 'priceGranularity'
  const mediaTypeGranularity = getMediaTypeGranularity(bid.mediaType, index.getMediaTypes(bid), _config.config.getConfig('mediaTypePriceGranularity'));
  const granularity = typeof bid.mediaType === 'string' && mediaTypeGranularity ? typeof mediaTypeGranularity === 'string' ? mediaTypeGranularity : 'custom' : _config.config.getConfig('priceGranularity');
  return granularity;
};

/**
 * This function returns a function to get bid price by price granularity
 * @param {string} granularity
 * @returns {function}
 */
exports.getPriceGranularity = getPriceGranularity;
const getPriceByGranularity = granularity => {
  return bid => {
    const bidGranularity = granularity || getPriceGranularity(bid);
    if (bidGranularity === _constants.default.GRANULARITY_OPTIONS.AUTO) {
      return bid.pbAg;
    } else if (bidGranularity === _constants.default.GRANULARITY_OPTIONS.DENSE) {
      return bid.pbDg;
    } else if (bidGranularity === _constants.default.GRANULARITY_OPTIONS.LOW) {
      return bid.pbLg;
    } else if (bidGranularity === _constants.default.GRANULARITY_OPTIONS.MEDIUM) {
      return bid.pbMg;
    } else if (bidGranularity === _constants.default.GRANULARITY_OPTIONS.HIGH) {
      return bid.pbHg;
    } else if (bidGranularity === _constants.default.GRANULARITY_OPTIONS.CUSTOM) {
      return bid.pbCg;
    }
  };
};

/**
 * This function returns a function to get crid from bid response
 * @returns {function}
 */
exports.getPriceByGranularity = getPriceByGranularity;
const getCreativeId = () => {
  return bid => {
    return bid.creativeId ? bid.creativeId : '';
  };
};

/**
 * This function returns a function to get first advertiser domain from bid response meta
 * @returns {function}
 */
exports.getCreativeId = getCreativeId;
const getAdvertiserDomain = () => {
  return bid => {
    return bid.meta && bid.meta.advertiserDomains && bid.meta.advertiserDomains.length > 0 ? [bid.meta.advertiserDomains].flat()[0] : '';
  };
};

/**
 * This function returns a function to get dsp name or id from bid response meta
 * @returns {function}
 */
exports.getAdvertiserDomain = getAdvertiserDomain;
const getDSP = () => {
  return bid => {
    return bid.meta && (bid.meta.networkId || bid.meta.networkName) ? (0, _utils.deepAccess)(bid, 'meta.networkName') || (0, _utils.deepAccess)(bid, 'meta.networkId') : '';
  };
};

/**
 * This function returns a function to get the primary category id from bid response meta
 * @returns {function}
 */
exports.getDSP = getDSP;
const getPrimaryCatId = () => {
  return bid => {
    return bid.meta && bid.meta.primaryCatId ? bid.meta.primaryCatId : '';
  };
};

// factory for key value objs
exports.getPrimaryCatId = getPrimaryCatId;
function createKeyVal(key, value) {
  return {
    key,
    val: typeof value === 'function' ? function (bidResponse, bidReq) {
      return value(bidResponse, bidReq);
    } : function (bidResponse) {
      return (0, _utils.getValue)(bidResponse, value);
    }
  };
}
function defaultAdserverTargeting() {
  const TARGETING_KEYS = _constants.default.TARGETING_KEYS;
  return [createKeyVal(TARGETING_KEYS.BIDDER, 'bidderCode'), createKeyVal(TARGETING_KEYS.AD_ID, 'adId'), createKeyVal(TARGETING_KEYS.PRICE_BUCKET, getPriceByGranularity()), createKeyVal(TARGETING_KEYS.SIZE, 'size'), createKeyVal(TARGETING_KEYS.DEAL, 'dealId'), createKeyVal(TARGETING_KEYS.SOURCE, 'source'), createKeyVal(TARGETING_KEYS.FORMAT, 'mediaType'), createKeyVal(TARGETING_KEYS.ADOMAIN, getAdvertiserDomain()), createKeyVal(TARGETING_KEYS.ACAT, getPrimaryCatId()), createKeyVal(TARGETING_KEYS.DSP, getDSP()), createKeyVal(TARGETING_KEYS.CRID, getCreativeId())];
}

/**
 * @param {string} mediaType
 * @param {string} bidderCode
 * @returns {*}
 */
function getStandardBidderSettings(mediaType, bidderCode) {
  const TARGETING_KEYS = _constants.default.TARGETING_KEYS;
  const standardSettings = Object.assign({}, _bidderSettings.bidderSettings.settingsFor(null));
  if (!standardSettings[_constants.default.JSON_MAPPING.ADSERVER_TARGETING]) {
    standardSettings[_constants.default.JSON_MAPPING.ADSERVER_TARGETING] = defaultAdserverTargeting();
  }
  if (true && mediaType === 'video') {
    const adserverTargeting = standardSettings[_constants.default.JSON_MAPPING.ADSERVER_TARGETING].slice();
    standardSettings[_constants.default.JSON_MAPPING.ADSERVER_TARGETING] = adserverTargeting;

    // Adding hb_uuid + hb_cache_id
    [TARGETING_KEYS.UUID, TARGETING_KEYS.CACHE_ID].forEach(targetingKeyVal => {
      if (typeof (0, _polyfill.find)(adserverTargeting, kvPair => kvPair.key === targetingKeyVal) === 'undefined') {
        adserverTargeting.push(createKeyVal(targetingKeyVal, 'videoCacheKey'));
      }
    });

    // Adding hb_cache_host
    if (_config.config.getConfig('cache.url') && (!bidderCode || _bidderSettings.bidderSettings.get(bidderCode, 'sendStandardTargeting') !== false)) {
      const urlInfo = (0, _utils.parseUrl)(_config.config.getConfig('cache.url'));
      if (typeof (0, _polyfill.find)(adserverTargeting, targetingKeyVal => targetingKeyVal.key === TARGETING_KEYS.CACHE_HOST) === 'undefined') {
        adserverTargeting.push(createKeyVal(TARGETING_KEYS.CACHE_HOST, function (bidResponse) {
          return (0, _utils.deepAccess)(bidResponse, "adserverTargeting.".concat(TARGETING_KEYS.CACHE_HOST)) ? bidResponse.adserverTargeting[TARGETING_KEYS.CACHE_HOST] : urlInfo.hostname;
        }));
      }
    }
  }
  return standardSettings;
}
function getKeyValueTargetingPairs(bidderCode, custBidObj) {
  let {
    index = _auctionManager.auctionManager.index
  } = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
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
  if (bidderCode && _bidderSettings.bidderSettings.getOwn(bidderCode, _constants.default.JSON_MAPPING.ADSERVER_TARGETING)) {
    setKeys(keyValues, _bidderSettings.bidderSettings.ownSettingsFor(bidderCode), custBidObj, bidRequest);
    custBidObj.sendStandardTargeting = _bidderSettings.bidderSettings.get(bidderCode, 'sendStandardTargeting');
  }

  // set native key value targeting
  if (true && custBidObj['native']) {
    keyValues = Object.assign({}, keyValues, (0, _native.getNativeTargeting)(custBidObj));
  }
  return keyValues;
}
function setKeys(keyValues, bidderSettings, custBidObj, bidReq) {
  var targeting = bidderSettings[_constants.default.JSON_MAPPING.ADSERVER_TARGETING];
  custBidObj.size = custBidObj.getSize();
  (targeting || []).forEach(function (kvPair) {
    var key = kvPair.key;
    var value = kvPair.val;
    if (keyValues[key]) {
      (0, _utils.logWarn)('The key: ' + key + ' is being overwritten');
    }
    if ((0, _utils.isFn)(value)) {
      try {
        value = value(custBidObj, bidReq);
      } catch (e) {
        (0, _utils.logError)('bidmanager', 'ERROR', e);
      }
    }
    if ((typeof bidderSettings.suppressEmptyKeys !== 'undefined' && bidderSettings.suppressEmptyKeys === true || key === _constants.default.TARGETING_KEYS.DEAL || key === _constants.default.TARGETING_KEYS.ACAT || key === _constants.default.TARGETING_KEYS.DSP || key === _constants.default.TARGETING_KEYS.CRID) && (
    // hb_deal & hb_acat are suppressed automatically if not set

    (0, _utils.isEmptyStr)(value) || value === null || value === undefined)) {
      (0, _utils.logInfo)("suppressing empty key '" + key + "' from adserver targeting");
    } else {
      keyValues[key] = value;
    }
  });
  return keyValues;
}
function adjustBids(bid) {
  let bidPriceAdjusted = (0, _cpm.adjustCpm)(bid.cpm, bid);
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
  if (!bidsByPlacement[bid.adUnitCode]) {
    bidsByPlacement[bid.adUnitCode] = {
      bids: []
    };
  }
  bidsByPlacement[bid.adUnitCode].bids.push(bid);
  return bidsByPlacement;
}