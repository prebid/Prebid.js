import { parseSizesInput, getWindowLocation, buildUrl } from '../src/utils.js';
import { ajax } from '../src/ajax.js';
import adapter from '../libraries/analyticsAdapter/AnalyticsAdapter.js';
import adapterManager from '../src/adapterManager.js';
import { EVENTS } from '../src/constants.js';

const emptyUrl = '';
const analyticsType = 'endpoint';
const terceptAnalyticsVersion = 'v1.0.0';
const defaultHostName = 'us-central1-quikr-ebay.cloudfunctions.net';
const defaultPathName = '/prebid-analytics';

let initOptions;
let auctionTimestamp;
const events = {
  bids: []
};

let adUnitMap = new Map();

var terceptAnalyticsAdapter = Object.assign(adapter(
  {
    emptyUrl,
    analyticsType
  }), {
  track({ eventType, args }) {
    if (typeof args !== 'undefined') {
      if (eventType === EVENTS.BID_TIMEOUT) {
        args.forEach(item => { mapBidResponse(item, 'timeout'); });
      } else if (eventType === EVENTS.AUCTION_INIT) {
        Object.assign(events, {bids: []});
        events.auctionInit = args;
        auctionTimestamp = args.timestamp;
        adUnitMap.set(args.auctionId, args.adUnits);
      } else if (eventType === EVENTS.BID_REQUESTED) {
        mapBidRequests(args).forEach(item => { events.bids.push(item) });
      } else if (eventType === EVENTS.BID_RESPONSE) {
        mapBidResponse(args, 'response');
      } else if (eventType === EVENTS.NO_BID) {
        mapBidResponse(args, 'no_bid');
      } else if (eventType === EVENTS.BIDDER_ERROR) {
        send({
          bidderError: mapBidResponse(args, 'bidder_error')
        });
      } else if (eventType === EVENTS.BID_WON) {
        send({
          bidWon: mapBidResponse(args, 'win')
        });
      } else if (eventType === EVENTS.AD_RENDER_SUCCEEDED) {
        send({
          adRenderSucceeded: mapBidResponse(args, 'render_succeeded')
        });
      } else if (eventType === EVENTS.AD_RENDER_FAILED) {
        send({
          adRenderFailed: mapBidResponse(args, 'render_failed')
        });
      }
    }

    if (eventType === EVENTS.AUCTION_END) {
      send(events);
    }
  }
});

function mapBidRequests(params) {
  const arr = [];
  if (typeof params.bids !== 'undefined' && params.bids.length) {
    params.bids.forEach(function (bid) {
      arr.push({
        bidderCode: bid.bidder,
        bidId: bid.bidId,
        adUnitCode: bid.adUnitCode,
        requestId: bid.bidderRequestId,
        auctionId: bid.auctionId,
        transactionId: bid.transactionId,
        sizes: parseSizesInput(bid.mediaTypes.banner.sizes).toString(),
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
  const isRenderEvent = (status === 'render_succeeded' || status === 'render_failed');
  const bid = isRenderEvent ? bidResponse.bid : bidResponse;
  const { adserverAdSlot, pbAdSlot } = getAdSlotData(bid?.auctionId, bid?.adUnitCode);

  if (status === 'bidder_error') {
    return {
      ...bidResponse,
      adserverAdSlot: adserverAdSlot,
      pbAdSlot: pbAdSlot,
      status: 6,
      host: window.location.hostname,
      path: window.location.pathname,
      search: window.location.search
    }
  } else if (status !== 'win') {
    const existingBid = isRenderEvent ? null : events.bids.filter(o => o.bidId === bid.bidId || o.bidId === bid.requestId)[0];
    const responseTimestamp = Date.now();

    const getRenderStatus = () => {
      if (status === 'timeout') return 3;
      if (status === 'no_bid') return 5;
      if (status === 'render_succeeded') return 7;
      if (status === 'render_failed') return 8;
      return 2;
    };

    const mappedData = {
      bidderCode: bid.bidder,
      bidId: (status === 'timeout' || status === 'no_bid') ? bid.bidId : bid.requestId,
      adUnitCode: bid.adUnitCode,
      auctionId: bid.auctionId,
      creativeId: bid.creativeId,
      transactionId: bid.transactionId,
      currency: bid.currency,
      cpm: bid.cpm,
      netRevenue: bid.netRevenue,
      renderedSize: isRenderEvent ? bid.size : null,
      width: bid.width,
      height: bid.height,
      mediaType: bid.mediaType,
      statusMessage: bid.statusMessage,
      status: bid.status,
      renderStatus: getRenderStatus(),
      timeToRespond: bid.timeToRespond,
      requestTimestamp: bid.requestTimestamp,
      responseTimestamp: bid.responseTimestamp ? bid.responseTimestamp : responseTimestamp,
      renderTimestamp: isRenderEvent ? Date.now() : null,
      reason: status === 'render_failed' ? bidResponse.reason : null,
      message: status === 'render_failed' ? bidResponse.message : null,
      host: isRenderEvent ? window.location.hostname : null,
      path: isRenderEvent ? window.location.pathname : null,
      search: isRenderEvent ? window.location.search : null,
      adserverAdSlot: adserverAdSlot,
      pbAdSlot: pbAdSlot,
      ttl: bid.ttl,
      dealId: bid.dealId,
      ad: isRenderEvent ? null : bid.ad,
      adUrl: isRenderEvent ? null : bid.adUrl,
      adId: bid.adId,
      size: isRenderEvent ? null : bid.size,
      adserverTargeting: isRenderEvent ? null : bid.adserverTargeting,
      videoCacheKey: isRenderEvent ? null : bid.videoCacheKey,
      native: isRenderEvent ? null : bid.native,
      meta: bid.meta || {}
    };

    if (isRenderEvent) {
      return mappedData;
    } else {
      Object.assign(existingBid, mappedData);
    }
  } else {
    return {
      bidderCode: bidResponse.bidder,
      bidId: bidResponse.requestId,
      adUnitCode: bidResponse.adUnitCode,
      auctionId: bidResponse.auctionId,
      creativeId: bidResponse.creativeId,
      transactionId: bidResponse.transactionId,
      currency: bidResponse.currency,
      cpm: bidResponse.cpm,
      netRevenue: bidResponse.netRevenue,
      renderedSize: bidResponse.size,
      width: bidResponse.width,
      height: bidResponse.height,
      mediaType: bidResponse.mediaType,
      statusMessage: bidResponse.statusMessage,
      status: bidResponse.status,
      renderStatus: 4,
      timeToRespond: bidResponse.timeToRespond,
      requestTimestamp: bidResponse.requestTimestamp,
      responseTimestamp: bidResponse.responseTimestamp,
      renderTimestamp: null,
      reason: null,
      message: null,
      host: window.location.hostname,
      path: window.location.pathname,
      search: window.location.search,
      adserverAdSlot: adserverAdSlot,
      pbAdSlot: pbAdSlot,
      ttl: bidResponse.ttl,
      dealId: bidResponse.dealId,
      ad: bidResponse.ad,
      adUrl: bidResponse.adUrl,
      adId: bidResponse.adId,
      adserverTargeting: bidResponse.adserverTargeting,
      videoCacheKey: bidResponse.videoCacheKey,
      native: bidResponse.native,
      meta: bidResponse.meta || {}
    }
  }
}

function send(data) {
  const location = getWindowLocation();
  if (typeof data !== 'undefined' && typeof data.auctionInit !== 'undefined') {
    Object.assign(data.auctionInit, { host: location.host, path: location.pathname, search: location.search });
  }
  data.initOptions = initOptions;

  const terceptAnalyticsRequestUrl = buildUrl({
    protocol: 'https',
    hostname: (initOptions && initOptions.hostName) || defaultHostName,
    pathname: (initOptions && initOptions.pathName) || defaultPathName,
    search: {
      auctionTimestamp: auctionTimestamp,
      terceptAnalyticsVersion: terceptAnalyticsVersion,
      prebidVersion: 'v' + '$prebid.version$'
    }
  });

  ajax(terceptAnalyticsRequestUrl, undefined, JSON.stringify(data), { method: 'POST', contentType: 'text/plain' });
}

terceptAnalyticsAdapter.originEnableAnalytics = terceptAnalyticsAdapter.enableAnalytics;
terceptAnalyticsAdapter.enableAnalytics = function (config) {
  initOptions = config.options;
  terceptAnalyticsAdapter.originEnableAnalytics(config);
};

adapterManager.registerAnalyticsAdapter({
  adapter: terceptAnalyticsAdapter,
  code: 'tercept'
});

export default terceptAnalyticsAdapter;
