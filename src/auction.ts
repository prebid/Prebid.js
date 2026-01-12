import {
  generateUUID,
  isEmpty,
  isEmptyStr,
  isFn,
  logError,
  logInfo,
  logMessage,
  logWarn,
  parseUrl,
  timestamp
} from './utils.js';
import {getPriceBucketString} from './cpmBucketManager.js';
import {isNativeResponse, setNativeResponseProperties} from './native.js';
import {batchAndStore, storeLocally} from './videoCache.js';
import {Renderer} from './Renderer.js';
import {config} from './config.js';
import {userSync} from './userSync.js';
import {hook, ignoreCallbackArg} from './hook.js';
import {OUTSTREAM} from './video.js';
import {AUDIO, VIDEO} from './mediaTypes.js';
import {auctionManager} from './auctionManager.js';
import {bidderSettings} from './bidderSettings.js';
import * as events from './events.js';
import adapterManager, {type BidderRequest, type BidRequest} from './adapterManager.js';
import {EVENTS, GRANULARITY_OPTIONS, JSON_MAPPING, REJECTION_REASON, S2S, TARGETING_KEYS} from './constants.js';
import {defer, PbPromise} from './utils/promise.js';
import {type Metrics, useMetrics} from './utils/perfMetrics.js';
import {adjustCpm} from './utils/cpm.js';
import {getGlobal} from './prebidGlobal.js';
import {ttlCollection} from './utils/ttlCollection.js';
import {getMinBidCacheTTL, onMinBidCacheTTLChange} from './bidTTL.js';
import type {Bid, BidResponse} from "./bidfactory.ts";
import type {AdUnitCode, BidderCode, Identifier, ORTBFragments} from './types/common.d.ts';
import type {TargetingMap} from "./targeting.ts";
import type {AdUnit} from "./adUnits.ts";
import type {MediaType} from "./mediaTypes.ts";
import type {VideoContext} from "./video.ts";

const { syncUsers } = userSync;

export const AUCTION_STARTED = 'started';
export const AUCTION_IN_PROGRESS = 'inProgress';
export const AUCTION_COMPLETED = 'completed';

type AuctionStatus = typeof AUCTION_STARTED | typeof AUCTION_COMPLETED | typeof AUCTION_IN_PROGRESS;

// register event for bid adjustment
events.on(EVENTS.BID_ADJUSTMENT, function (bid) {
  adjustBids(bid);
});

const MAX_REQUESTS_PER_ORIGIN = 4;
const outstandingRequests = {};
const sourceInfo = {};
const queuedCalls = [];

const pbjsInstance = getGlobal();

/**
 * Clear global state for tests
 */
export function resetAuctionState() {
  queuedCalls.length = 0;
  [outstandingRequests, sourceInfo].forEach((ob) => Object.keys(ob).forEach((k) => { delete ob[k] }));
}

type AuctionOptions = {
  adUnits: AdUnit[],
  adUnitCodes: AdUnitCode[],
  callback: () => void;
  cbTimeout: number;
  labels: string[];
  auctionId: Identifier;
  ortb2Fragments: ORTBFragments;
  metrics: Metrics;
}

export type AuctionProperties = ReturnType<ReturnType<typeof newAuction>['getProperties']>;

declare module './events' {
  interface Events {
    /**
     * Fired when an auction starts.
     */
    [EVENTS.AUCTION_INIT]: [AuctionProperties];
    /**
     * Fired when an auction ends.
     */
    [EVENTS.AUCTION_END]: [AuctionProperties];
    /**
     * Fired when an auction times out (at least some of the bid adapters
     * did not reply before the timeout.
     */
    [EVENTS.AUCTION_TIMEOUT]: [AuctionProperties];
    /**
     * Fired when an auction times out.
     */
    [EVENTS.BID_TIMEOUT]: [BidRequest<BidderCode>[]];
    /**
     * Fired when a bid is received.
     */
    [EVENTS.BID_ACCEPTED]: [Partial<Bid>];
    /**
     * Fired when a bid is rejected.
     */
    [EVENTS.BID_REJECTED]: [Partial<Bid>];
    /**
     * Fired once for each bid request (unique combination of auction, ad unit and bidder)
     * that produced no bid.
     */
    [EVENTS.NO_BID]: [BidRequest<BidderCode>];
    /**
     * Fired when a bid is received.
     */
    [EVENTS.BID_RESPONSE]: [Bid];
    /**
     * Fired once for each bid, immediately after its adjustment (see bidCpmAdjustment).
     */
    [EVENTS.BID_ADJUSTMENT]: [Partial<Bid>];
  }
}

export interface AuctionOptionsConfig {
  /**
   * Specifies bidders that the Prebid auction will no longer wait for before determining the auction has completed.
   * This may be helpful if you find there are a number of low performing and/or high timeout bidders in your page’s rotation.
   */
  secondaryBidders?: BidderCode[]
  /**
   * When true, prevents banner bids from being rendered more than once. It should only be enabled after auto-refreshing is implemented correctly. Default is false.
   */
  suppressStaleRender?: boolean;
  /**
   * When true, prevent bids from being rendered if TTL is reached. Default is false.
   */
  suppressExpiredRender?: boolean;
}

export interface PriceBucketConfig {
  buckets: {
    precision?: number;
    max: number;
    increment: number;
  }[];
}

declare module './config' {
  interface Config {
    /**
     * Since browsers have a limit of how many requests they will allow to a specific domain before they block,
     * Prebid.js will queue auctions that would cause requests to a specific origin to exceed that limit.
     * The limit is different for each browser. Prebid.js defaults to a max of 4 requests per origin.
     */
    maxRequestsPerOrigin?: number;
    auctionOptions?: AuctionOptionsConfig;
    priceGranularity?: (typeof GRANULARITY_OPTIONS)[keyof typeof GRANULARITY_OPTIONS];
    customPriceBucket?: PriceBucketConfig;
    mediaTypePriceGranularity?: {[K in MediaType]?: PriceBucketConfig} & {[K in VideoContext as `${typeof VIDEO}-${K}`]?: PriceBucketConfig};
  }
}

export const beforeInitAuction = hook('sync', (auction) => {})

export function newAuction({adUnits, adUnitCodes, callback, cbTimeout, labels, auctionId, ortb2Fragments, metrics}: AuctionOptions) {
  metrics = useMetrics(metrics);
  const _adUnits = adUnits;
  const _labels = labels;
  const _adUnitCodes = adUnitCodes;
  const _auctionId: Identifier = auctionId || generateUUID();
  const _timeout = cbTimeout;
  const _timelyRequests = new Set();
  const done = defer<void>();
  const requestsDone = defer<void>();
  let _bidsRejected: Partial<Bid>[] = [];
  let _callback = callback;
  let _bidderRequests: BidderRequest<BidderCode>[] = [];
  const _bidsReceived = ttlCollection<Bid>({
    startTime: (bid) => bid.responseTimestamp,
    ttl: (bid) => getMinBidCacheTTL() == null ? null : Math.max(getMinBidCacheTTL(), bid.ttl) * 1000
  });
  let _noBids: BidRequest<BidderCode>[] = [];
  let _winningBids: Bid[] = [];
  let _auctionStart: number;
  let _auctionEnd: number;
  let _timeoutTimer;
  let _auctionStatus: AuctionStatus;
  let _nonBids = [];

  onMinBidCacheTTLChange(() => _bidsReceived.refresh());

  function addBidRequests(bidderRequests) { _bidderRequests = _bidderRequests.concat(bidderRequests); }
  function addBidReceived(bid) { _bidsReceived.add(bid); }
  function addBidRejected(bidsRejected) { _bidsRejected = _bidsRejected.concat(bidsRejected); }
  function addNoBid(noBid) { _noBids = _noBids.concat(noBid); }
  function addNonBids(seatnonbids) { _nonBids = _nonBids.concat(seatnonbids); }

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
      bidsReceived: _bidsReceived.toArray(),
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
      events.emit(EVENTS.AUCTION_TIMEOUT, getProperties());
    }
    if (_auctionEnd === undefined) {
      let timedOutRequests = [];
      if (timedOut) {
        logMessage(`Auction ${_auctionId} timedOut`);
        timedOutRequests = _bidderRequests.filter(rq => !_timelyRequests.has(rq.bidderRequestId)).flatMap(br => br.bids)
        if (timedOutRequests.length) {
          events.emit(EVENTS.BID_TIMEOUT, timedOutRequests);
        }
      }

      _auctionStatus = AUCTION_COMPLETED;
      _auctionEnd = Date.now();
      metrics.checkpoint('auctionEnd');
      metrics.timeBetween('requestBids', 'auctionEnd', 'requestBids.total');
      metrics.timeBetween('callBids', 'auctionEnd', 'requestBids.callBids');
      done.resolve();

      events.emit(EVENTS.AUCTION_END, getProperties());
      bidsBackCallback(_adUnits, function () {
        try {
          if (_callback != null) {
            const bids = _bidsReceived.toArray()
              .filter(bid => _adUnitCodes.includes(bid.adUnitCode))
              .reduce(groupByPlacement, {});
            _callback.apply(pbjsInstance, [bids, timedOut, _auctionId]);
            _callback = null;
          }
        } catch (e) {
          logError('Error executing bidsBackHandler', null, e);
        } finally {
          // Calling timed out bidders
          if (timedOutRequests.length) {
            adapterManager.callTimedOutBidders(adUnits, timedOutRequests, _timeout);
          }
          // Only automatically sync if the publisher has not chosen to "enableOverride"
          const userSyncConfig = config.getConfig('userSync') ?? {} as any;
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
    logInfo(`Bids Received for Auction with id: ${_auctionId}`, _bidsReceived.toArray());
    _auctionStatus = AUCTION_COMPLETED;
    executeCallback(false);
  }

  function onTimelyResponse(bidderRequestId) {
    _timelyRequests.add(bidderRequestId);
  }

  function callBids() {
    _auctionStatus = AUCTION_STARTED;
    _auctionStart = Date.now();

    const bidRequests = metrics.measureTime('requestBids.makeRequests',
      () => adapterManager.makeBidRequests(_adUnits, _auctionStart, _auctionId, _timeout, _labels, ortb2Fragments, metrics));
    logInfo(`Bids Requested for Auction with id: ${_auctionId}`, bidRequests);

    metrics.checkpoint('callBids')

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

    const requests = {};
    const call = {
      bidRequests,
      run: () => {
        beforeInitAuction(this);
        startAuctionTimer();

        _auctionStatus = AUCTION_IN_PROGRESS;

        events.emit(EVENTS.AUCTION_INIT, getProperties());

        const callbacks = auctionCallbacks(auctionDone, this);
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
        requestsDone.resolve();
      }
    };

    if (!runIfOriginHasCapacity(call)) {
      logWarn('queueing auction due to limited endpoint capacity');
      queuedCalls.push(call);
    }

    function runIfOriginHasCapacity(call) {
      let hasCapacity = true;

      const maxRequests = config.getConfig('maxRequestsPerOrigin') || MAX_REQUESTS_PER_ORIGIN;

      call.bidRequests.some(bidRequest => {
        let requests = 1;
        const source = (typeof bidRequest.src !== 'undefined' && bidRequest.src === S2S.SRC) ? 's2s'
          : bidRequest.bidderCode;

        // if the bidder has alwaysHasCapacity flag set and forceMaxRequestsPerOrigin is false, don't check capacity
        if (bidRequest.alwaysHasCapacity && !config.getConfig('forceMaxRequestsPerOrigin')) {
          return false;
        }

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
    if (!winningBid.deferBilling) {
      adapterManager.triggerBilling(winningBid)
    }
  }

  function setBidTargeting(bid) {
    adapterManager.callSetTargetingBidder(bid.adapterCode || bid.bidder, bid);
  }

  events.on(EVENTS.SEAT_NON_BID, (event) => {
    if (event.auctionId === _auctionId) {
      addNonBids(event.seatnonbid)
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
    getBidsReceived: () => _bidsReceived.toArray(),
    getNoBids: () => _noBids,
    getNonBids: () => _nonBids,
    getFPD: () => ortb2Fragments,
    getMetrics: () => metrics,
    end: done.promise,
    requestsDone: requestsDone.promise,
    getProperties
  };
}

declare module './hook' {
  interface NamedHooks {
    addBidResponse: typeof addBidResponse
  }
}

/**
 * Hook into this to intercept bids before they are added to an auction.
 */
export const addBidResponse = ignoreCallbackArg(hook('async', function(adUnitCode: string, bid: Partial<Bid>, reject: (reason: (typeof REJECTION_REASON)[keyof typeof REJECTION_REASON]) => void): void {
  if (!isValidPrice(bid)) {
    reject(REJECTION_REASON.PRICE_TOO_HIGH)
  } else {
    this.dispatch.call(null, adUnitCode, bid);
  }
}, 'addBidResponse'));

/**
 * Delay hook for adapter responses.
 *
 * `ready` is a promise; auctions wait for it to resolve before closing. Modules can hook into this
 * to delay the end of auctions while they perform initialization that does not need to delay their start.
 */
export const responsesReady = hook('sync', (ready) => ready, 'responsesReady');

export const addBidderRequests = hook('sync', function(bidderRequests) {
  this.dispatch.call(this.context, bidderRequests);
}, 'addBidderRequests');

export const bidsBackCallback = hook('async', function (adUnits, callback) {
  if (callback) {
    callback();
  }
}, 'bidsBackCallback');

export type AddBidResponse = {
  (adUnitCode: AdUnitCode, bid: BidResponse): void;
  reject(adUnitCode: AdUnitCode, bid: BidResponse, reason: typeof REJECTION_REASON[keyof typeof REJECTION_REASON]) : void;
}

export function auctionCallbacks(auctionDone, auctionInstance, {index = auctionManager.index} = {}) {
  let outstandingBidsAdded = 0;
  let allAdapterCalledDone = false;
  const bidderRequestsDone = new Set();
  const bidResponseMap = {};

  function afterBidAdded() {
    outstandingBidsAdded--;
    if (allAdapterCalledDone && outstandingBidsAdded === 0) {
      auctionDone()
    }
  }

  function handleBidResponse(adUnitCode: string, bid: Partial<Bid>, handler) {
    bidResponseMap[bid.requestId] = true;
    addCommonResponseProperties(bid, adUnitCode)
    outstandingBidsAdded++;
    return handler(afterBidAdded);
  }

  function acceptBidResponse(adUnitCode: string, bid: Partial<Bid>) {
    handleBidResponse(adUnitCode, bid, (done) => {
      const bidResponse = getPreparedBidForAuction(bid);
      events.emit(EVENTS.BID_ACCEPTED, bidResponse);
      if ((FEATURES.VIDEO && bidResponse.mediaType === VIDEO) || (FEATURES.AUDIO && bidResponse.mediaType === AUDIO)) {
        tryAddVideoAudioBid(auctionInstance, bidResponse, done);
      } else {
        if (FEATURES.NATIVE && isNativeResponse(bidResponse)) {
          setNativeResponseProperties(bidResponse, index.getAdUnit(bidResponse));
        }
        addBidToAuction(auctionInstance, bidResponse);
        done();
      }
    });
  }

  function rejectBidResponse(adUnitCode, bid, reason) {
    return handleBidResponse(adUnitCode, bid, (done) => {
      bid.rejectionReason = reason;
      logWarn(`Bid from ${bid.bidder || 'unknown bidder'} was rejected: ${reason}`, bid)
      events.emit(EVENTS.BID_REJECTED, bid);
      auctionInstance.addBidRejected(bid);
      done();
    })
  }

  function adapterDone() {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const bidderRequest = this;
    let bidderRequests = auctionInstance.getBidRequests();
    const auctionOptionsConfig = config.getConfig('auctionOptions');

    bidderRequestsDone.add(bidderRequest);

    if (auctionOptionsConfig && !isEmpty(auctionOptionsConfig)) {
      const secondaryBidders = auctionOptionsConfig.secondaryBidders;
      if (secondaryBidders && !bidderRequests.every(bidder => secondaryBidders.includes(bidder.bidderCode))) {
        bidderRequests = bidderRequests.filter(request => !secondaryBidders.includes(request.bidderCode));
      }
    }

    allAdapterCalledDone = bidderRequests.every(bidderRequest => bidderRequestsDone.has(bidderRequest));

    bidderRequest.bids.forEach(bid => {
      if (!bidResponseMap[bid.bidId]) {
        addBidTimingProperties(bid);
        auctionInstance.addNoBid(bid);
        events.emit(EVENTS.NO_BID, bid);
      }
    });

    if (allAdapterCalledDone && outstandingBidsAdded === 0) {
      auctionDone();
    }
  }

  return {
    addBidResponse: (function () {
      function addBid(adUnitCode, bid) {
        addBidResponse.call({
          dispatch: acceptBidResponse,
        }, adUnitCode, bid, (() => {
          let rejected = false;
          return (reason) => {
            if (!rejected) {
              rejectBidResponse(adUnitCode, bid, reason);
              rejected = true;
            }
          }
        })())
      }
      addBid.reject = rejectBidResponse;
      return addBid;
    })(),
    adapterDone: function () {
      responsesReady(PbPromise.resolve()).finally(() => adapterDone.call(this));
    }
  }
}

// Add a bid to the auction.
export function addBidToAuction(auctionInstance, bidResponse: Bid) {
  setupBidTargeting(bidResponse);

  useMetrics(bidResponse.metrics).timeSince('addBidResponse', 'addBidResponse.total');
  auctionInstance.addBidReceived(bidResponse);
  events.emit(EVENTS.BID_RESPONSE, bidResponse);
}

// Video bids may fail if the cache is down, or there's trouble on the network.
function tryAddVideoAudioBid(auctionInstance, bidResponse, afterBidAdded, {index = auctionManager.index} = {}) {
  let addBid = true;

  const videoMediaType = index.getMediaTypes({
    requestId: bidResponse.originalRequestId || bidResponse.requestId,
    adUnitId: bidResponse.adUnitId
  })?.video;
  const context = videoMediaType && videoMediaType?.context;
  const useCacheKey = videoMediaType && videoMediaType?.useCacheKey;
  const {
    useLocal,
    url: cacheUrl,
    ignoreBidderCacheKey
  } = config.getConfig('cache') || {};

  if (useLocal) {
    // stores video/audio bid vast as local blob in the browser
    storeLocally(bidResponse);
  } else if (cacheUrl && (useCacheKey || context !== OUTSTREAM)) {
    if (!bidResponse.videoCacheKey || ignoreBidderCacheKey) {
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
  if (FEATURES.VIDEO || FEATURES.AUDIO) {
    batchAndStore(auctionInstance, bidResponse, afterBidAdded);
  }
}, 'callPrebidCache');

declare module './bidfactory' {
  interface BaseBidResponse {
    /**
     * Targeting custom key-value pairs for this bid.
     */
    adserverTargeting?: TargetingMap<unknown>;
  }

  interface BaseBid {
    /**
     * true if this bid is for an interstitial slot.
     */
    instl: boolean;
    /**
     * Timestamp of when the request for this bid was generated.
     */
    requestTimestamp: number;
    /**
     * Timestamp of when the response for this bid was received.
     */
    responseTimestamp: number;
    /**
     * responseTimestamp - requestTimestamp
     */
    timeToRespond: number;
    /**
     * alias of `bidderCode`.
     */
    bidder: BidderCode;
    /**
     * Code of the ad unit this bid is for.
     */
    adUnitCode: string;
    /**
     * TTL buffer for this bid; it will expire after `.ttl` - `.ttlBuffer` seconds have elapsed.
     */
    ttlBuffer?: number;
    /**
     * Low granularity price bucket for this bid.
     */
    pbLg: string;
    /**
     * Medium granularity price bucket for this bid.
     */
    pbMg: string;
    /**
     * High granularity price bucket for this bid.
     */
    pbHg: string;
    /**
     * Auto granularity price bucket for this bid.
     */
    pbAg: string;
    /**
     * Dense granularity price bucket for this bid.
     */
    pbDg: string;
    /**
     * Custom granularity price bucket for this bid.
     */
    pbCg: string;
    /**
     * This bid's creative size, expressed as width x height.
     */
    size: ReturnType<BaseBid['getSize']>
    /**
     * If custom targeting was defined, whether standard targeting should also be used for this bid.
     */
    sendStandardTargeting?: boolean;
    adserverTargeting: BaseBidResponse['adserverTargeting'];
  }
}

/**
 * Add timing properties to a bid response
 */
function addBidTimingProperties(bidResponse: Partial<Bid>, {index = auctionManager.index} = {}) {
  const bidderRequest = index.getBidderRequest(bidResponse);
  const start = (bidderRequest && bidderRequest.start) || bidResponse.requestTimestamp;

  Object.assign(bidResponse, {
    responseTimestamp: bidResponse.responseTimestamp || timestamp(),
    requestTimestamp: bidResponse.requestTimestamp || start,
  });
  bidResponse.timeToRespond = bidResponse.responseTimestamp - bidResponse.requestTimestamp;
}

/**
 * Augment `bidResponse` with properties that are common across all bids - including rejected bids.
 */
function addCommonResponseProperties(bidResponse: Partial<Bid>, adUnitCode: string, {index = auctionManager.index} = {}) {
  const adUnit = index.getAdUnit(bidResponse);

  addBidTimingProperties(bidResponse, {index})

  Object.assign(bidResponse, {
    cpm: parseFloat(bidResponse.cpm) || 0,
    bidder: bidResponse.bidder || bidResponse.bidderCode,
    adUnitCode
  });

  if (adUnit?.ttlBuffer != null) {
    bidResponse.ttlBuffer = adUnit.ttlBuffer;
  }
}

/**
 * Add additional bid response properties that are universal for all _accepted_ bids.
 */
function getPreparedBidForAuction(bid: Partial<Bid>, {index = auctionManager.index} = {}): Bid {
  // Let listeners know that now is the time to adjust the bid, if they want to.
  //
  // CAREFUL: Publishers rely on certain bid properties to be available (like cpm),
  // but others to not be set yet (like priceStrings). See #1372 and #1389.
  events.emit(EVENTS.BID_ADJUSTMENT, bid);

  const adUnit = index.getAdUnit(bid);
  bid.instl = adUnit?.ortb2Imp?.instl === 1;

  // a publisher-defined renderer can be used to render bids
  const bidRenderer = index.getBidRequest(bid)?.renderer || adUnit.renderer;

  // a publisher can also define a renderer for a mediaType
  const bidObjectMediaType = bid.mediaType;
  const mediaTypes = index.getMediaTypes(bid);
  const bidMediaType = mediaTypes && mediaTypes[bidObjectMediaType];

  var mediaTypeRenderer = bidMediaType && bidMediaType.renderer;

  var renderer = null;

  // the renderer for the mediaType takes precendence
  if (mediaTypeRenderer && mediaTypeRenderer.render && !(mediaTypeRenderer.backupOnly === true && bid.renderer)) {
    renderer = mediaTypeRenderer;
  } else if (bidRenderer && bidRenderer.render && !(bidRenderer.backupOnly === true && bid.renderer)) {
    renderer = bidRenderer;
  }

  if (renderer) {
    // be aware, an adapter could already have installed the bidder, in which case this overwrite's the existing adapter
    bid.renderer = Renderer.install({ url: renderer.url, config: renderer.options, renderNow: renderer.url == null });// rename options to config, to make it consistent?
    bid.renderer.setRender(renderer.render);
  }

  // Use the config value 'mediaTypeGranularity' if it has been defined for mediaType, else use 'customPriceBucket'
  const mediaTypeGranularity = getMediaTypeGranularity(bid.mediaType, mediaTypes, config.getConfig('mediaTypePriceGranularity'));
  const priceStringsObj = getPriceBucketString(
    bid.cpm,
    (typeof mediaTypeGranularity === 'object') ? mediaTypeGranularity : config.getConfig('customPriceBucket'),
    config.getConfig('currency.granularityMultiplier')
  );
  bid.pbLg = priceStringsObj.low;
  bid.pbMg = priceStringsObj.med;
  bid.pbHg = priceStringsObj.high;
  bid.pbAg = priceStringsObj.auto;
  bid.pbDg = priceStringsObj.dense;
  bid.pbCg = priceStringsObj.custom;

  return bid as Bid;
}

function setupBidTargeting(bidObject: Bid) {
  let keyValues;
  const cpmCheck = (bidderSettings.get(bidObject.bidderCode, 'allowZeroCpmBids') === true) ? bidObject.cpm >= 0 : bidObject.cpm > 0;
  if (bidObject.bidderCode && (cpmCheck || bidObject.dealId)) {
    keyValues = getKeyValueTargetingPairs(bidObject.bidderCode, bidObject);
  }

  // use any targeting provided as defaults, otherwise just set from getKeyValueTargetingPairs
  bidObject.adserverTargeting = Object.assign(bidObject.adserverTargeting || {}, keyValues);
}

export function getMediaTypeGranularity(mediaType, mediaTypes, mediaTypePriceGranularity) {
  if (mediaType && mediaTypePriceGranularity) {
    if (FEATURES.VIDEO && mediaType === VIDEO) {
      const context = mediaTypes?.[VIDEO]?.context ?? 'instream';
      if (mediaTypePriceGranularity[`${VIDEO}-${context}`]) {
        return mediaTypePriceGranularity[`${VIDEO}-${context}`];
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
export const getPriceByGranularity = (granularity?) => {
  return (bid) => {
    const bidGranularity = granularity || getPriceGranularity(bid);
    if (bidGranularity === GRANULARITY_OPTIONS.AUTO) {
      return bid.pbAg;
    } else if (bidGranularity === GRANULARITY_OPTIONS.DENSE) {
      return bid.pbDg;
    } else if (bidGranularity === GRANULARITY_OPTIONS.LOW) {
      return bid.pbLg;
    } else if (bidGranularity === GRANULARITY_OPTIONS.MEDIUM) {
      return bid.pbMg;
    } else if (bidGranularity === GRANULARITY_OPTIONS.HIGH) {
      return bid.pbHg;
    } else if (bidGranularity === GRANULARITY_OPTIONS.CUSTOM) {
      return bid.pbCg;
    }
  }
}

/**
 * This function returns a function to get crid from bid response
 * @returns {function}
 */
export const getCreativeId = () => {
  return (bid) => {
    return (bid.creativeId) ? bid.creativeId : '';
  }
}

/**
 * This function returns a function to get first advertiser domain from bid response meta
 * @returns {function}
 */
export const getAdvertiserDomain = () => {
  return (bid) => {
    return (bid.meta && bid.meta.advertiserDomains && bid.meta.advertiserDomains.length > 0) ? [bid.meta.advertiserDomains].flat()[0] : '';
  }
}

/**
 * This function returns a function to get dsp name or id from bid response meta
 * @returns {function}
 */
export const getDSP = () => {
  return (bid) => {
    return (bid.meta && (bid.meta.networkId || bid.meta.networkName)) ? bid?.meta?.networkName || bid?.meta?.networkId : '';
  }
}

/**
 * This function returns a function to get the primary category id from bid response meta
 * @returns {function}
 */
export const getPrimaryCatId = () => {
  return (bid) => {
    const catId = bid?.meta?.primaryCatId;
    if (Array.isArray(catId)) {
      return catId[0] || '';
    }
    return catId || '';
  };
}

export interface DefaultTargeting {
  /**
   * Bidder code.
   */
  [TARGETING_KEYS.BIDDER]: Bid['bidderCode'];
  /**
   * Ad ID.
   */
  [TARGETING_KEYS.AD_ID]: Bid['adId'];
  /**
   * Price bucket.
   */
  [TARGETING_KEYS.PRICE_BUCKET]: string;
  /**
   * Size, expressed as ${width}x${height}.
   */
  [TARGETING_KEYS.SIZE]: Bid['size'];
  /**
   * Deal ID.
   */
  [TARGETING_KEYS.DEAL]: Bid['dealId'];
  /**
   * Bid source - either client or s2s.
   */
  [TARGETING_KEYS.SOURCE]: Bid['source'];
  /**
   * Media type.
   */
  [TARGETING_KEYS.FORMAT]: Bid['mediaType'];
  /**
   * Advertiser domain.
   */
  [TARGETING_KEYS.ADOMAIN]: Bid['meta']['advertiserDomains'][0];
  /**
   * Primary category ID.
   */
  [TARGETING_KEYS.ACAT]: Bid['meta']['primaryCatId'];
  /**
   * DSP network name.
   */
  [TARGETING_KEYS.DSP]: Bid['meta']['networkName'];
  /**
   * Creative ID.
   */
  [TARGETING_KEYS.CRID]: Bid['creativeId'];
  /**
   * Video cache key.
   */
  [TARGETING_KEYS.UUID]: Bid['videoCacheKey'];
  /**
   * Video cache key.
   */
  [TARGETING_KEYS.CACHE_ID]: Bid['videoCacheKey'];
  /**
   * Video cache host.
   */
  [TARGETING_KEYS.CACHE_HOST]: string;
}

type KeyValFn<K extends keyof DefaultTargeting> = (bidResponse: Bid, bidRequest: BidRequest<BidderCode>) => DefaultTargeting[K];
type KeyValProp<K extends keyof DefaultTargeting> = {
  [P in keyof Bid]: Bid[P] extends DefaultTargeting[K] ? P : never
}[keyof Bid];

function createKeyVal<K extends keyof DefaultTargeting>(key: K, value: KeyValFn<K> | KeyValProp<K>) {
  return {
    key,
    val: (typeof value === 'function')
      ? function (bidResponse, bidReq) {
        return value(bidResponse, bidReq);
      }
      : function (bidResponse) {
        return bidResponse[value];
      }
  };
}

function defaultAdserverTargeting() {
  return [
    createKeyVal(TARGETING_KEYS.BIDDER, 'bidderCode'),
    createKeyVal(TARGETING_KEYS.AD_ID, 'adId'),
    createKeyVal(TARGETING_KEYS.PRICE_BUCKET, getPriceByGranularity()),
    createKeyVal(TARGETING_KEYS.SIZE, 'size'),
    createKeyVal(TARGETING_KEYS.DEAL, 'dealId'),
    createKeyVal(TARGETING_KEYS.SOURCE, 'source'),
    createKeyVal(TARGETING_KEYS.FORMAT, 'mediaType'),
    createKeyVal(TARGETING_KEYS.ADOMAIN, getAdvertiserDomain()),
    createKeyVal(TARGETING_KEYS.ACAT, getPrimaryCatId()),
    createKeyVal(TARGETING_KEYS.DSP, getDSP()),
    createKeyVal(TARGETING_KEYS.CRID, getCreativeId()),
  ]
}

/**
 * @param {string} mediaType
 * @param {string} bidderCode
 * @returns {*}
 */
export function getStandardBidderSettings(mediaType, bidderCode) {
  const standardSettings = Object.assign({}, bidderSettings.settingsFor(null));
  if (!standardSettings[JSON_MAPPING.ADSERVER_TARGETING]) {
    standardSettings[JSON_MAPPING.ADSERVER_TARGETING] = defaultAdserverTargeting();
  }

  if (FEATURES.VIDEO && mediaType === 'video') {
    const adserverTargeting = standardSettings[JSON_MAPPING.ADSERVER_TARGETING].slice();
    standardSettings[JSON_MAPPING.ADSERVER_TARGETING] = adserverTargeting;

    // Adding hb_uuid + hb_cache_id
    [TARGETING_KEYS.UUID, TARGETING_KEYS.CACHE_ID].forEach(targetingKeyVal => {
      if (typeof adserverTargeting.find(kvPair => kvPair.key === targetingKeyVal) === 'undefined') {
        adserverTargeting.push(createKeyVal(targetingKeyVal, 'videoCacheKey'));
      }
    });

    // Adding hb_cache_host
    if (config.getConfig('cache.url') && (!bidderCode || bidderSettings.get(bidderCode, 'sendStandardTargeting') !== false)) {
      const urlInfo = parseUrl(config.getConfig('cache.url'));

      if (typeof adserverTargeting.find(targetingKeyVal => targetingKeyVal.key === TARGETING_KEYS.CACHE_HOST) === 'undefined') {
        adserverTargeting.push(createKeyVal(TARGETING_KEYS.CACHE_HOST, function(bidResponse) {
          return (bidResponse?.adserverTargeting?.[TARGETING_KEYS.CACHE_HOST] || urlInfo.hostname) as string;
        }));
      }
    }
  }

  return standardSettings;
}

export function getKeyValueTargetingPairs(bidderCode, custBidObj: Bid, {index = auctionManager.index} = {}) {
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
  if (bidderCode && bidderSettings.getOwn(bidderCode, JSON_MAPPING.ADSERVER_TARGETING)) {
    setKeys(keyValues, bidderSettings.ownSettingsFor(bidderCode), custBidObj, bidRequest);
    custBidObj.sendStandardTargeting = bidderSettings.get(bidderCode, 'sendStandardTargeting');
  }

  return keyValues;
}

function setKeys(keyValues, bidderSettings, custBidObj, bidReq) {
  var targeting = bidderSettings[JSON_MAPPING.ADSERVER_TARGETING];
  custBidObj.size = custBidObj.getSize();

  (targeting || []).forEach(function (kvPair) {
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
        key === TARGETING_KEYS.DEAL || key === TARGETING_KEYS.ACAT || key === TARGETING_KEYS.DSP || key === TARGETING_KEYS.CRID) && // hb_deal & hb_acat are suppressed automatically if not set
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
  const bidPriceAdjusted = adjustCpm(bid.cpm, bid);

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
 * isValidPrice is price validation function
 * which checks if price from bid response
 * is not higher than top limit set in config
 * @type {Function}
 * @param bid
 * @returns {boolean}
 */
function isValidPrice(bid) {
  const maxBidValue = config.getConfig('maxBid');
  if (!maxBidValue || !bid.cpm) return true;
  return maxBidValue >= Number(bid.cpm);
}
