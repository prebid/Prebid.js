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

let adUnits = [];

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
        adUnits = args.adUnits;
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

function getAdSlotData(adUnitCode) {
  let adserverAdSlot, pbAdSlot;

  if (adUnitCode && adUnits && adUnits.length) {
    const matchingAdUnit = adUnits.find(au => au.code === adUnitCode);

    if (matchingAdUnit && matchingAdUnit.ortb2Imp &&
        matchingAdUnit.ortb2Imp.ext &&
        matchingAdUnit.ortb2Imp.ext.data) {
      // Get GAM ad slot
      if (matchingAdUnit.ortb2Imp.ext.data.adserver) {
        adserverAdSlot = matchingAdUnit.ortb2Imp.ext.data.adserver.adslot;
      }

      // Get Prebid ad slot
      pbAdSlot = matchingAdUnit.ortb2Imp.ext.data.pbadslot;
    }
  }

  return { adserverAdSlot, pbAdSlot };
}

function mapBidResponse(bidResponse, status) {
  const { adserverAdSlot, pbAdSlot } = getAdSlotData(bidResponse.adUnitCode);

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
    const bid = events.bids.filter(o => o.bidId === bidResponse.bidId || o.bidId === bidResponse.requestId)[0];
    const responseTimestamp = Date.now();
    Object.assign(bid, {
      bidderCode: bidResponse.bidder,
      bidId: (status === 'timeout' || status === 'no_bid') ? bidResponse.bidId : bidResponse.requestId,
      adUnitCode: bidResponse.adUnitCode,
      auctionId: bidResponse.auctionId,
      creativeId: bidResponse.creativeId,
      transactionId: bidResponse.transactionId,
      currency: bidResponse.currency,
      cpm: bidResponse.cpm,
      netRevenue: bidResponse.netRevenue,
      width: bidResponse.width,
      height: bidResponse.height,
      mediaType: bidResponse.mediaType,
      statusMessage: bidResponse.statusMessage,
      status: bidResponse.status,
      renderStatus: status === 'timeout' ? 3 : (status === 'no_bid' ? 5 : 2),
      timeToRespond: bidResponse.timeToRespond,
      requestTimestamp: bidResponse.requestTimestamp,
      responseTimestamp: bidResponse.responseTimestamp ? bidResponse.responseTimestamp : responseTimestamp,
      adserverAdSlot: adserverAdSlot,
      pbAdSlot: pbAdSlot,
      ttl: bidResponse.ttl,
      dealId: bidResponse.dealId,
      ad: bidResponse.ad,
      adUrl: bidResponse.adUrl,
      adId: bidResponse.adId,
      size: bidResponse.size,
      adserverTargeting: bidResponse.adserverTargeting,
      videoCacheKey: bidResponse.videoCacheKey,
      native: bidResponse.native,
      meta: bidResponse.meta || {}
    });
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
