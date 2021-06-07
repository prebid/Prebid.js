import { ajax } from '../src/ajax.js';
import adapter from '../src/AnalyticsAdapter.js';
import adapterManager from '../src/adapterManager.js';
import CONSTANTS from '../src/constants.json';
import * as utils from '../src/utils.js';

const emptyUrl = '';
const analyticsType = 'endpoint';
const pubxaiAnalyticsVersion = 'v1.0.0';
const defaultHost = 'api.pbxai.com';
const auctionPath = '/analytics/auction';
const winningBidPath = '/analytics/bidwon';

let initOptions;
let auctionTimestamp;
let events = {
  bids: []
};

var pubxaiAnalyticsAdapter = Object.assign(adapter(
  {
    emptyUrl,
    analyticsType
  }), {
  track({ eventType, args }) {
    if (typeof args !== 'undefined') {
      if (eventType === CONSTANTS.EVENTS.BID_TIMEOUT) {
        args.forEach(item => { mapBidResponse(item, 'timeout'); });
      } else if (eventType === CONSTANTS.EVENTS.AUCTION_INIT) {
        events.floorDetail = {};
        if (typeof args.bidderRequests[0].bids[0] !== 'undefined' && typeof args.bidderRequests[0].bids[0].floorData !== 'undefined') {
          Object.assign(events.floorDetail, args.bidderRequests[0].bids[0].floorData);
        }
        auctionTimestamp = args.timestamp;
      } else if (eventType === CONSTANTS.EVENTS.BID_REQUESTED) {
        events.bids = [];
        mapBidRequests(args).forEach(item => { events.bids.push(item) });
      } else if (eventType === CONSTANTS.EVENTS.BID_RESPONSE) {
        mapBidResponse(args, 'response');
      } else if (eventType === CONSTANTS.EVENTS.BID_WON) {
        send({
          winningBid: mapBidResponse(args, 'bidwon')
        }, 'bidwon');
      }
    }

    if (eventType === CONSTANTS.EVENTS.AUCTION_END) {
      send(events, 'auctionEnd');
    }
  }
});

function mapBidRequests(params) {
  let arr = [];
  if (typeof params.bids !== 'undefined' && params.bids.length) {
    params.bids.forEach(function (bid) {
      arr.push({
        bidderCode: bid.bidder,
        bidId: bid.bidId,
        adUnitCode: bid.adUnitCode,
        requestId: bid.bidderRequestId,
        auctionId: bid.auctionId,
        placementId: bid.params.placementId,
        floorData: bid.floorData,
        transactionId: bid.transactionId,
        sizes: utils.parseSizesInput(bid.mediaTypes.banner.sizes).toString(),
        renderStatus: 1,
        requestTimestamp: params.auctionStart
      });
    });
  }
  return arr;
}

function mapBidResponse(bidResponse, status) {
  if (status !== 'bidwon') {
    let bid = events.bids.filter(o => o.bidId === bidResponse.bidId || o.bidId === bidResponse.requestId)[0];
    Object.assign(bid, {
      bidderCode: bidResponse.bidder,
      bidId: status === 'timeout' ? bidResponse.bidId : bidResponse.requestId,
      adUnitCode: bidResponse.adUnitCode,
      auctionId: bidResponse.auctionId,
      creativeId: bidResponse.creativeId,
      transactionId: bidResponse.transactionId,
      currency: bidResponse.currency,
      cpm: bidResponse.cpm,
      netRevenue: bidResponse.netRevenue,
      mediaType: bidResponse.mediaType,
      statusMessage: bidResponse.statusMessage,
      floorData: bidResponse.floorData,
      status: bidResponse.status,
      renderStatus: status === 'timeout' ? 3 : 2,
      timeToRespond: bidResponse.timeToRespond,
      requestTimestamp: bidResponse.requestTimestamp,
      responseTimestamp: bidResponse.responseTimestamp,
      platform: navigator.platform,
      deviceType: getDeviceType()
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
      floorData: bidResponse.floorData,
      renderedSize: bidResponse.size,
      mediaType: bidResponse.mediaType,
      statusMessage: bidResponse.statusMessage,
      status: bidResponse.status,
      renderStatus: 4,
      timeToRespond: bidResponse.timeToRespond,
      requestTimestamp: bidResponse.requestTimestamp,
      responseTimestamp: bidResponse.responseTimestamp,
      platform: navigator.platform,
      deviceType: getDeviceType()
    }
  }
}

export function getDeviceType() {
  if ((/ipad|android 3.0|xoom|sch-i800|playbook|tablet|kindle/i.test(navigator.userAgent.toLowerCase()))) {
    return 'tablet';
  }
  if ((/iphone|ipod|android|blackberry|opera|mini|windows\sce|palm|smartphone|iemobile/i.test(navigator.userAgent.toLowerCase()))) {
    return 'mobile';
  }
  return 'desktop';
}

// add sampling rate
pubxaiAnalyticsAdapter.shouldFireEventRequest = function (samplingRate = 1) {
  return (Math.floor((Math.random() * samplingRate + 1)) === parseInt(samplingRate));
}

function send(data, status) {
  if (pubxaiAnalyticsAdapter.shouldFireEventRequest(initOptions.samplingRate)) {
    let location = utils.getWindowLocation();
    if (typeof data !== 'undefined') {
      data.pageDetail = {};
      Object.assign(data.pageDetail, { host: location.host, path: location.pathname, search: location.search });
    }
    data.initOptions = initOptions;

    let pubxaiAnalyticsRequestUrl = utils.buildUrl({
      protocol: 'https',
      hostname: (initOptions && initOptions.hostName) || defaultHost,
      pathname: status == 'bidwon' ? winningBidPath : auctionPath,
      search: {
        auctionTimestamp: auctionTimestamp,
        pubxaiAnalyticsVersion: pubxaiAnalyticsVersion,
        prebidVersion: $$PREBID_GLOBAL$$.version
      }
    });

    ajax(pubxaiAnalyticsRequestUrl, undefined, JSON.stringify(data), { method: 'POST', contentType: 'text/plain' });
  }
}

pubxaiAnalyticsAdapter.originEnableAnalytics = pubxaiAnalyticsAdapter.enableAnalytics;
pubxaiAnalyticsAdapter.enableAnalytics = function (config) {
  initOptions = config.options;
  pubxaiAnalyticsAdapter.originEnableAnalytics(config);
};

adapterManager.registerAnalyticsAdapter({
  adapter: pubxaiAnalyticsAdapter,
  code: 'pubxai'
});

export default pubxaiAnalyticsAdapter;
