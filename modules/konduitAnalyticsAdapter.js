import { parseSizesInput, logError, uniques } from '../src/utils.js';
import { ajax } from '../src/ajax.js';
import adapter from '../libraries/analyticsAdapter/AnalyticsAdapter.js';
import adapterManager from '../src/adapterManager.js';
import { targeting } from '../src/targeting.js';
import { config } from '../src/config.js';
import {EVENTS} from '../src/constants.js';

const TRACKER_HOST = 'tracker.konduit.me';
const KONDUIT_PREBID_MODULE_VERSION = '1.0.0';

const analyticsType = 'endpoint';

const eventDataComposerMap = {
  [EVENTS.AUCTION_INIT]: obtainAuctionInfo,
  [EVENTS.AUCTION_END]: obtainAuctionInfo,
  [EVENTS.BID_REQUESTED]: obtainBidRequestsInfo,
  [EVENTS.BID_TIMEOUT]: obtainBidTimeoutInfo,
  [EVENTS.BID_RESPONSE]: obtainBidResponseInfo,
  [EVENTS.BID_WON]: obtainWinnerBidInfo,
  [EVENTS.NO_BID]: obtainNoBidInfo,
};

// This function is copy from prebid core
function formatQS(query) {
  return Object
    .keys(query)
    .map(k => Array.isArray(query[k])
      ? query[k].map(v => `${k}[]=${v}`).join('&')
      : `${k}=${query[k]}`)
    .join('&');
}

// This function is copy from prebid core
function buildUrl(obj) {
  return (obj.protocol || 'http') + '://' +
    (obj.host ||
      obj.hostname + (obj.port ? `:${obj.port}` : '')) +
    (obj.pathname || '') +
    (obj.search ? `?${formatQS(obj.search || '')}` : '') +
    (obj.hash ? `#${obj.hash}` : '');
}

const getWinnerBidFromAggregatedEvents = () => {
  return konduitAnalyticsAdapter.context.aggregatedEvents
    .filter(evt => evt.eventType === EVENTS.BID_WON)[0];
};

const isWinnerBidDetected = () => {
  return !!getWinnerBidFromAggregatedEvents();
};
const isWinnerBidExist = () => {
  return !!targeting.getWinningBids()[0];
};

const konduitAnalyticsAdapter = Object.assign(
  adapter({ analyticsType }),
  {
    track ({ eventType, args }) {
      if (EVENTS.AUCTION_INIT === eventType) {
        konduitAnalyticsAdapter.context.aggregatedEvents.splice(0);
      }

      if (eventDataComposerMap[eventType]) {
        konduitAnalyticsAdapter.context.aggregatedEvents.push({
          eventType,
          data: eventDataComposerMap[eventType](args),
        });
      }

      if (eventType === EVENTS.AUCTION_END) {
        if (!isWinnerBidDetected() && isWinnerBidExist()) {
          const bidWonData = eventDataComposerMap[EVENTS.BID_WON](targeting.getWinningBids()[0]);

          konduitAnalyticsAdapter.context.aggregatedEvents.push({
            eventType: EVENTS.BID_WON,
            data: bidWonData,
          });
        }
        sendRequest({ method: 'POST', path: '/analytics-initial-event', payload: composeRequestPayload() });
      }
    }
  }
);

function obtainBidTimeoutInfo (args) {
  return args.map(item => item.bidder).filter(uniques);
}

function obtainAuctionInfo (auction) {
  return {
    auctionId: auction.auctionId,
    timestamp: auction.timestamp,
    auctionEnd: auction.auctionEnd,
    auctionStatus: auction.auctionStatus,
    adUnitCodes: auction.adUnitCodes,
    labels: auction.labels,
    timeout: auction.timeout
  };
}

function obtainBidRequestsInfo (bidRequests) {
  return {
    bidderCode: bidRequests.bidderCode,
    time: bidRequests.start,
    bids: bidRequests.bids.map(function (bid) {
      return {
        transactionId: bid.transactionId,
        adUnitCode: bid.adUnitCode,
        bidId: bid.bidId,
        startTime: bid.startTime,
        sizes: parseSizesInput(bid.sizes).toString(),
        params: bid.params
      };
    }),
  };
}

function obtainBidResponseInfo (bidResponse) {
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
    bidId: bidResponse.bidId,
    requestId: bidResponse.requestId,
    creativeId: bidResponse.creativeId
  };
}

function obtainNoBidInfo (bidResponse) {
  return {
    bidderCode: bidResponse.bidder,
    transactionId: bidResponse.transactionId,
    adUnitCode: bidResponse.adUnitCode,
    bidId: bidResponse.bidId,
  };
}

function obtainWinnerBidInfo (bidResponse) {
  return {
    adId: bidResponse.adId,
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
    creativeId: bidResponse.creativeId
  };
}

function composeRequestPayload () {
  const konduitId = config.getConfig('konduit.konduitId');
  const { width, height } = window.screen;

  return {
    konduitId,
    prebidVersion: '$prebid.version$',
    konduitPrebidModuleVersion: KONDUIT_PREBID_MODULE_VERSION,
    environment: {
      screen: { width, height },
      language: navigator.language,
    },
    events: konduitAnalyticsAdapter.context.aggregatedEvents,
  };
}

function sendRequest ({ host = TRACKER_HOST, method, path, payload }) {
  const formattedUrlOptions = {
    protocol: 'https',
    hostname: host,
    pathname: path,
  };
  if (method === 'GET') {
    formattedUrlOptions.search = payload;
  }

  let konduitAnalyticsRequestUrl = buildUrl(formattedUrlOptions);

  ajax(
    konduitAnalyticsRequestUrl,
    undefined,
    method === 'POST' ? JSON.stringify(payload) : null,
    {
      contentType: 'application/json',
      method,
      withCredentials: true
    }
  );
}

konduitAnalyticsAdapter.originEnableAnalytics = konduitAnalyticsAdapter.enableAnalytics;

konduitAnalyticsAdapter.enableAnalytics = function (analyticsConfig) {
  const konduitId = config.getConfig('konduit.konduitId');

  if (!konduitId) {
    logError('A konduitId in config is required to use konduitAnalyticsAdapter');
    return;
  }

  konduitAnalyticsAdapter.context = {
    aggregatedEvents: [],
  };

  konduitAnalyticsAdapter.originEnableAnalytics(analyticsConfig);
};

adapterManager.registerAnalyticsAdapter({
  adapter: konduitAnalyticsAdapter,
  code: 'konduit'
});

export default konduitAnalyticsAdapter;
