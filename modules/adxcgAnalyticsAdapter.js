import { ajax } from 'src/ajax';
import adapter from 'src/AnalyticsAdapter';
import adaptermanager from 'src/adaptermanager';
import CONSTANTS from 'src/constants.json';
import * as url from 'src/url';
import * as utils from 'src/utils';

const emptyUrl = '';
const analyticsType = 'endpoint';
const adxcgAnalyticsVersion = 'v2.01';

var adxcgAnalyticsAdapter = Object.assign(adapter(
  {
    emptyUrl,
    analyticsType
  }), {
  track ({eventType, args}) {
    switch (eventType) {
      case CONSTANTS.EVENTS.AUCTION_INIT:
        adxcgAnalyticsAdapter.context.events.auctionInit = mapAuctionInit(args);
        adxcgAnalyticsAdapter.context.auctionTimestamp = args.timestamp;
        break;
      case CONSTANTS.EVENTS.BID_REQUESTED:
        adxcgAnalyticsAdapter.context.auctionId = args.auctionId;
        adxcgAnalyticsAdapter.context.events.bidRequests.push(mapBidRequested(args));
        break;
      case CONSTANTS.EVENTS.BID_ADJUSTMENT:
        break;
      case CONSTANTS.EVENTS.BID_TIMEOUT:
        adxcgAnalyticsAdapter.context.events.bidTimeout = args.map(item => item.bidder).filter(utils.uniques);
        break;
      case CONSTANTS.EVENTS.BIDDER_DONE:
        break;
      case CONSTANTS.EVENTS.BID_RESPONSE:
        adxcgAnalyticsAdapter.context.events.bidResponses.push(mapBidResponse(args, eventType));
        break;
      case CONSTANTS.EVENTS.BID_WON:
        let outData2 = {bidWons: mapBidWon(args)};
        send(outData2);
        break;
      case CONSTANTS.EVENTS.AUCTION_END:
        send(adxcgAnalyticsAdapter.context.events);
        break;
    }
  }

});

function mapAuctionInit (auctionInit) {
  return {
    timeout: auctionInit.timeout
  };
}

function mapBidRequested (bidRequests) {
  return {
    bidderCode: bidRequests.bidderCode,
    time: bidRequests.start,
    bids: bidRequests.bids.map(function (bid) {
      return {
        transactionId: bid.transactionId,
        adUnitCode: bid.adUnitCode,
        bidId: bid.bidId,
        start: bid.startTime,
        sizes: utils.parseSizesInput(bid.sizes).toString(),
        params: bid.params
      };
    }),
  };
}

function mapBidResponse (bidResponse, eventType) {
  return {
    bidderCode: bidResponse.bidder,
    transactionId: bidResponse.transactionId,
    adUnitCode: bidResponse.adUnitCode,
    statusMessage: bidResponse.statusMessage,
    mediaType: bidResponse.mediaType,
    renderedSize: bidResponse.size,
    cpm: bidResponse.cpm,
    currency: bidResponse.currency,
    netRevenue: bidResponse.netRevenue,
    timeToRespond: bidResponse.timeToRespond,
    bidId: eventType === CONSTANTS.EVENTS.BID_TIMEOUT ? bidResponse.bidId : bidResponse.requestId,
    dealId: bidResponse.dealId,
    status: bidResponse.status,
    creativeId: bidResponse.creativeId.toString()
  };
}

function mapBidWon (bidResponse) {
  return [{
    bidderCode: bidResponse.bidder,
    adUnitCode: bidResponse.adUnitCode,
    statusMessage: bidResponse.statusMessage,
    mediaType: bidResponse.mediaType,
    renderedSize: bidResponse.size,
    cpm: bidResponse.cpm,
    currency: bidResponse.currency,
    netRevenue: bidResponse.netRevenue,
    timeToRespond: bidResponse.timeToRespond,
    bidId: bidResponse.requestId,
    dealId: bidResponse.dealId,
    status: bidResponse.status,
    creativeId: bidResponse.creativeId.toString()
  }];
}

function send (data) {
  let location = utils.getTopWindowLocation();
  let secure = location.protocol === 'https:';

  let adxcgAnalyticsRequestUrl = url.format({
    protocol: secure ? 'https' : 'http',
    hostname: adxcgAnalyticsAdapter.context.host,
    pathname: '/pbrx/v2',
    search: {
      pid: adxcgAnalyticsAdapter.context.initOptions.publisherId,
      aid: adxcgAnalyticsAdapter.context.auctionId,
      ats: adxcgAnalyticsAdapter.context.auctionTimestamp,
      aav: adxcgAnalyticsVersion,
      iob: intersectionObserverAvailable(window) ? '1' : '0',
      pbv: $$PREBID_GLOBAL$$.version,
      sz: window.screen.width + 'x' + window.screen.height
    }
  });

  ajax(adxcgAnalyticsRequestUrl, undefined, JSON.stringify(data), {
    contentType: 'text/plain',
    method: 'POST',
    withCredentials: true
  });
}

function intersectionObserverAvailable (win) {
  return win && win.IntersectionObserver && win.IntersectionObserverEntry &&
    win.IntersectionObserverEntry.prototype && 'intersectionRatio' in win.IntersectionObserverEntry.prototype;
}

adxcgAnalyticsAdapter.context = {};
adxcgAnalyticsAdapter.originEnableAnalytics = adxcgAnalyticsAdapter.enableAnalytics;
adxcgAnalyticsAdapter.enableAnalytics = function (config) {
  if (!config.options.publisherId) {
    utils.logError('PublisherId option is not defined. Analytics won\'t work');
    return;
  }

  let secure = location.protocol === 'https:';
  adxcgAnalyticsAdapter.context = {
    events: {
      bidRequests: [],
      bidResponses: []
    },
    initOptions: config.options,
    host: config.options.host || (secure ? 'hbarxs.adxcg.net' : 'hbarx.adxcg.net')
  };

  adxcgAnalyticsAdapter.originEnableAnalytics(config);
};

adaptermanager.registerAnalyticsAdapter({
  adapter: adxcgAnalyticsAdapter,
  code: 'adxcg'
});

export default adxcgAnalyticsAdapter;
