import { ajax } from '../src/ajax';
import adapter from '../src/AnalyticsAdapter';
import adapterManager from '../src/adapterManager';
import CONSTANTS from '../src/constants.json';
import * as url from '../src/url';
import * as utils from '../src/utils';

const emptyUrl = '';
const analyticsType = 'endpoint';
const yuktamediaAnalyticsVersion = 'v2.0.0';

let initOptions;
let auctionTimestamp;
let events = {
  bids: []
};

var yuktamediaAnalyticsAdapter = Object.assign(adapter(
  {
    emptyUrl,
    analyticsType
  }), {
  track({ eventType, args }) {
    if (typeof args !== 'undefined') {
      if (eventType === CONSTANTS.EVENTS.BID_TIMEOUT) {
        args.forEach(item => { mapBidResponse(item, 'timeout'); });
      } else if (eventType === CONSTANTS.EVENTS.AUCTION_INIT) {
        events.auctionInit = args;
        auctionTimestamp = args.timestamp;
      } else if (eventType === CONSTANTS.EVENTS.BID_REQUESTED) {
        mapBidRequests(args).forEach(item => { events.bids.push(item) });
      } else if (eventType === CONSTANTS.EVENTS.BID_RESPONSE) {
        mapBidResponse(args, 'response');
      } else if (eventType === CONSTANTS.EVENTS.BID_WON) {
        send({
          bidWon: mapBidResponse(args, 'win')
        }, 'won');
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
  if (status !== 'win') {
    let bid = events.bids.filter(o => o.bidId == bidResponse.bidId || o.bidId == bidResponse.requestId)[0];
    Object.assign(bid, {
      bidderCode: bidResponse.bidder,
      bidId: status == 'timeout' ? bidResponse.bidId : bidResponse.requestId,
      adUnitCode: bidResponse.adUnitCode,
      auctionId: bidResponse.auctionId,
      creativeId: bidResponse.creativeId,
      transactionId: bidResponse.transactionId,
      currency: bidResponse.currency,
      cpm: bidResponse.cpm,
      netRevenue: bidResponse.netRevenue,
      mediaType: bidResponse.mediaType,
      statusMessage: bidResponse.statusMessage,
      status: bidResponse.status,
      renderStatus: status == 'timeout' ? 3 : 2,
      timeToRespond: bidResponse.timeToRespond,
      requestTimestamp: bidResponse.requestTimestamp,
      responseTimestamp: bidResponse.responseTimestamp
    });
  } else if (status == 'win') {
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
      mediaType: bidResponse.mediaType,
      statusMessage: bidResponse.statusMessage,
      status: bidResponse.status,
      renderStatus: 4,
      timeToRespond: bidResponse.timeToRespond,
      requestTimestamp: bidResponse.requestTimestamp,
      responseTimestamp: bidResponse.responseTimestamp
    }
  }
}

function send(data, status) {
  let location = utils.getWindowLocation();
  if (typeof data !== 'undefined' && typeof data.auctionInit !== 'undefined') {
    data.auctionInit = Object.assign({ host: location.host, path: location.pathname, search: location.search }, data.auctionInit);
  }
  data.initOptions = initOptions;

  let yuktamediaAnalyticsRequestUrl = url.format({
    protocol: 'https',
    hostname: 'analytics-prebid.yuktamedia.com',
    pathname: status == 'auctionEnd' ? '/api/bids' : '/api/bid/won',
    search: {
      auctionTimestamp: auctionTimestamp,
      yuktamediaAnalyticsVersion: yuktamediaAnalyticsVersion,
      prebidVersion: $$PREBID_GLOBAL$$.version
    }
  });

  ajax(yuktamediaAnalyticsRequestUrl, undefined, JSON.stringify(data), { method: 'POST', contentType: 'text/plain' });
}

yuktamediaAnalyticsAdapter.originEnableAnalytics = yuktamediaAnalyticsAdapter.enableAnalytics;
yuktamediaAnalyticsAdapter.enableAnalytics = function (config) {
  initOptions = config.options;
  yuktamediaAnalyticsAdapter.originEnableAnalytics(config);
};

adapterManager.registerAnalyticsAdapter({
  adapter: yuktamediaAnalyticsAdapter,
  code: 'yuktamedia'
});

export default yuktamediaAnalyticsAdapter;
