import { parseSizesInput, getWindowLocation, buildUrl } from '../src/utils.js';
import { ajax, sendBeacon } from '../src/ajax.js';
import adapter from '../libraries/analyticsAdapter/AnalyticsAdapter.js';
import adapterManager from '../src/adapterManager.js';
import { EVENTS } from '../src/constants.js';

/**
 * @typedef {import('./terceptAnalyticsAdapter.d.ts').TerceptAnalyticsAdapterOptions} TerceptAnalyticsAdapterOptions
 */

const emptyUrl = '';
const analyticsType = 'endpoint';
const terceptAnalyticsVersion = 'v2.3.0';
const defaultHostName = 'b-s.tercept.com';
const defaultPathName = '/prebid-analytics';
const DEFAULT_ANALYTICS_BATCH_TIMEOUT = 0;

/** @type {TerceptAnalyticsAdapterOptions} */
let initOptions;

const pendingAuctions = new Map();

let adUnitMap = new Map();

let firstSent = false;

function flush(auctionId, useBeacon = false) {
  const auction = pendingAuctions.get(auctionId);
  if (!auction) return;
  clearTimeout(auction.timer);
  const isFirst = !firstSent;
  firstSent = true;
  auction.bids.forEach((bid, i) => {
    bid.is_pl = isFirst && i === 0;
  });
  send({ auctionInit: auction.auctionInit, bids: auction.bids }, useBeacon);
  pendingAuctions.delete(auctionId);
}

// flush remaining auctions via sendBeacon on page exit
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    pendingAuctions.forEach((_, auctionId) => flush(auctionId, true));
  }
});

var terceptAnalyticsAdapter = Object.assign(adapter(
  {
    emptyUrl,
    analyticsType
  }), {
  track({ eventType, args }) {
    if (typeof args === 'undefined') return;
    try {
      if (eventType === EVENTS.AUCTION_INIT) {
        const auctionId = args.auctionId;
        adUnitMap.set(auctionId, args.adUnits);

        // only first bidderRequest needed, device/site data is identical across all
        const auctionInit = Object.assign({}, args, {
          bidderRequests: args.bidderRequests ? args.bidderRequests.slice(0, 1) : []
        });

        pendingAuctions.set(auctionId, {
          auctionInit,
          bids: [],
          timer: null
        });
      } else if (eventType === EVENTS.BID_REQUESTED) {
        mapBidRequests(args).forEach(bid => {
          const auction = pendingAuctions.get(bid.auctionId);
          if (auction) auction.bids.push(bid);
        });
      } else if (eventType === EVENTS.BID_RESPONSE) {
        updateBid(args.auctionId, args.requestId, mapBidResponse(args, 'response'));
      } else if (eventType === EVENTS.BID_TIMEOUT) {
        args.forEach(item => {
          updateBid(item.auctionId, item.bidId, mapBidResponse(item, 'timeout'));
        });
      } else if (eventType === EVENTS.NO_BID) {
        updateBid(args.auctionId, args.bidId, mapBidResponse(args, 'no_bid'));
      } else if (eventType === EVENTS.AUCTION_END) {
        const auction = pendingAuctions.get(args.auctionId);
        if (!auction) return;
        // configurable window to collect BID_WON, AD_RENDER_SUCCEEDED, AD_RENDER_FAILED, BIDDER_ERROR
        const timeout = initOptions?.analyticsBatchTimeout ?? DEFAULT_ANALYTICS_BATCH_TIMEOUT;
        auction.timer = setTimeout(() => flush(args.auctionId), timeout);
      } else if (eventType === EVENTS.BID_WON) {
        const { adserverAdSlot, pbAdSlot } = getAdSlotData(args.auctionId, args.adUnitCode);
        const winFields = {
          renderStatus: 4,
          renderedSize: args.size,
          host: getWindowLocation().hostname,
          path: getWindowLocation().pathname,
          search: getWindowLocation().search,
          adserverAdSlot,
          pbAdSlot
        };
        updateBid(args.auctionId, args.requestId, winFields);
        send({
          bidWon: {
            bidId: args.requestId,
            bidderCode: args.bidderCode,
            adUnitCode: args.adUnitCode,
            auctionId: args.auctionId,
            creativeId: args.creativeId,
            transactionId: args.transactionId,
            currency: args.currency,
            cpm: args.cpm,
            netRevenue: args.netRevenue,
            mediaType: args.mediaType,
            statusMessage: args.statusMessage,
            status: args.status,
            timeToRespond: args.timeToRespond,
            requestTimestamp: args.requestTimestamp,
            responseTimestamp: args.responseTimestamp,
            playerWidth: args.playerWidth ?? null,
            playerHeight: args.playerHeight ?? null,
            ...winFields
          }
        });
      } else if (eventType === EVENTS.AD_RENDER_SUCCEEDED) {
        const bid = args.bid;
        const { adserverAdSlot, pbAdSlot } = getAdSlotData(bid.auctionId, bid.adUnitCode);
        updateBid(bid.auctionId, bid.requestId, {
          renderStatus: 7,
          renderTimestamp: Date.now(),
          renderedSize: bid.size,
          host: getWindowLocation().hostname,
          path: getWindowLocation().pathname,
          search: getWindowLocation().search,
          adserverAdSlot,
          pbAdSlot
        });
      } else if (eventType === EVENTS.AD_RENDER_FAILED) {
        const bid = args.bid;
        updateBid(bid.auctionId, bid.requestId, {
          renderStatus: 8,
          reason: args.reason,
          message: args.message,
          host: getWindowLocation().hostname,
          path: getWindowLocation().pathname,
          search: getWindowLocation().search
        });
      } else if (eventType === EVENTS.BIDDER_ERROR) {
        const { bidderRequest, error } = args;
        if (!bidderRequest || !bidderRequest.bids) return;
        bidderRequest.bids.forEach(bid => {
          const { adserverAdSlot, pbAdSlot } = getAdSlotData(bid.auctionId, bid.adUnitCode);
          updateBid(bid.auctionId, bid.bidId, {
            renderStatus: 6,
            status: 'bidError',
            error: error?.message || error,
            adserverAdSlot,
            pbAdSlot
          });
        });
      }
    } catch (e) { /* do not disrupt the publisher page */ }
  }
});

function updateBid(auctionId, bidId, fields) {
  const auction = pendingAuctions.get(auctionId);
  if (!auction) return;
  const bid = auction.bids.find(b => b.bidId === bidId);
  if (!bid) return;
  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined) bid[key] = value;
  }
}

function mapBidRequests(params) {
  const arr = [];
  if (typeof params.bids !== 'undefined' && params.bids.length) {
    params.bids.forEach(function (bid) {
      const mediaTypeKeys = Object.keys(bid.mediaTypes || {});
      const mediaType = mediaTypeKeys.length === 1
        ? (bid.mediaTypes.video ? 'video' : bid.mediaTypes.banner ? 'banner' : 'native')
        : null;
      const sizes = bid.mediaTypes?.banner?.sizes
        ? parseSizesInput(bid.mediaTypes.banner.sizes).toString()
        : bid.mediaTypes?.video?.playerSize
          ? parseSizesInput(bid.mediaTypes.video.playerSize).toString()
          : '';
      arr.push({
        bidderCode: bid.bidder,
        bidId: bid.bidId,
        adUnitCode: bid.adUnitCode,
        requestId: bid.bidderRequestId,
        auctionId: bid.auctionId,
        transactionId: bid.transactionId,
        mediaType,
        sizes,
        videoContext: bid.mediaTypes?.video?.context || null,
        renderStatus: 1,
        requestTimestamp: params.auctionStart
      });
    });
  }
  return arr;
}

function getAdSlotData(auctionId, adUnitCode) {
  const auctionAdUnits = adUnitMap?.get(auctionId);

  if (!Array.isArray(auctionAdUnits)) {
    return {};
  }

  const matchingAdUnit = auctionAdUnits.find(au => au.code === adUnitCode);

  return {
    adserverAdSlot: matchingAdUnit?.ortb2Imp?.ext?.data?.adserver?.adslot,
    pbAdSlot: matchingAdUnit?.ortb2Imp?.ext?.data?.pbadslot,
  };
}

function mapBidResponse(bidResponse, status) {
  const { adserverAdSlot, pbAdSlot } = getAdSlotData(bidResponse?.auctionId, bidResponse?.adUnitCode);

  const getRenderStatus = () => {
    if (status === 'timeout') return 3;
    if (status === 'no_bid') return 5;
    return 2;
  };

  return {
    bidderCode: bidResponse.bidder,
    bidId: (status === 'timeout' || status === 'no_bid') ? bidResponse.bidId : bidResponse.requestId,
    adUnitCode: bidResponse.adUnitCode,
    auctionId: bidResponse.auctionId,
    creativeId: bidResponse.creativeId,
    transactionId: bidResponse.transactionId,
    currency: bidResponse.currency,
    cpm: bidResponse.cpm,
    netRevenue: bidResponse.netRevenue,
    renderedSize: null,
    width: bidResponse.width,
    height: bidResponse.height,
    mediaType: bidResponse.mediaType,
    statusMessage: bidResponse.statusMessage,
    status: bidResponse.status,
    renderStatus: getRenderStatus(),
    timeToRespond: bidResponse.timeToRespond,
    requestTimestamp: bidResponse.requestTimestamp,
    responseTimestamp: bidResponse.responseTimestamp,
    renderTimestamp: null,
    reason: null,
    message: null,
    host: null,
    path: null,
    search: null,
    adserverAdSlot,
    pbAdSlot,
    ttl: bidResponse.ttl,
    dealId: bidResponse.dealId,
    adId: bidResponse.adId,
    adserverTargeting: bidResponse.adserverTargeting,
    videoCacheKey: bidResponse.videoCacheKey,
    playerWidth: bidResponse.playerWidth ?? null,
    playerHeight: bidResponse.playerHeight ?? null,
    meta: bidResponse.meta || {}
  };
}

function send(data, useBeacon = false) {
  const location = getWindowLocation();
  if (data.auctionInit) {
    Object.assign(data.auctionInit, {
      host: location.hostname,
      path: location.pathname,
      search: location.search
    });
  }
  data.initOptions = initOptions;

  const terceptAnalyticsRequestUrl = buildUrl({
    protocol: 'https',
    hostname: (initOptions && initOptions.hostName) || defaultHostName,
    pathname: (initOptions && initOptions.pathName) || defaultPathName,
    search: {
      terceptAnalyticsVersion: terceptAnalyticsVersion,
      prebidVersion: 'v' + '$prebid.version$'
    }
  });

  const body = JSON.stringify(data);
  if (useBeacon) {
    sendBeacon(terceptAnalyticsRequestUrl, new Blob([body], { type: 'text/plain' }));
  } else {
    ajax(terceptAnalyticsRequestUrl, undefined, body, { method: 'POST', contentType: 'text/plain' });
  }
}

terceptAnalyticsAdapter.originEnableAnalytics = terceptAnalyticsAdapter.enableAnalytics;
terceptAnalyticsAdapter.enableAnalytics = function (config) {
  initOptions = config.options;
  terceptAnalyticsAdapter.originEnableAnalytics(config);
};

terceptAnalyticsAdapter.originDisableAnalytics = terceptAnalyticsAdapter.disableAnalytics;
terceptAnalyticsAdapter.disableAnalytics = function () {
  pendingAuctions.forEach(auction => clearTimeout(auction.timer));
  pendingAuctions.clear();
  adUnitMap.clear();
  firstSent = false;
  terceptAnalyticsAdapter.originDisableAnalytics();
};

adapterManager.registerAnalyticsAdapter({
  adapter: terceptAnalyticsAdapter,
  code: 'tercept'
});

export default terceptAnalyticsAdapter;
