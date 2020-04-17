import adapter from '../src/AnalyticsAdapter.js';
import CONSTANTS from '../src/constants.json';
import adapterManager from '../src/adapterManager.js';
import { config } from '../src/config.js';
import { ajax } from '../src/ajax.js';
import * as utils from '../src/utils.js';

const {
  EVENTS: { AUCTION_INIT, BID_REQUESTED, BID_RESPONSE, BID_TIMEOUT, BID_WON }
} = CONSTANTS;

const SLOT_LOADED = 'slotOnload';

const ENDPOINT = 'https://ads.openx.net/w/1.0/pban';

let initOptions;

let auctionMap = {};

function onAuctionInit({ auctionId }) {
  auctionMap[auctionId] = {
    adUnitMap: {}
  };
}

function onBidRequested({ auctionId, auctionStart, bids, start }) {
  const adUnitMap = auctionMap[auctionId]['adUnitMap'];

  bids.forEach(bid => {
    const { adUnitCode, bidId, bidder, params, transactionId } = bid;

    adUnitMap[adUnitCode] = adUnitMap[adUnitCode] || {
      auctionId,
      auctionStart,
      transactionId,
      bidMap: {}
    };

    adUnitMap[adUnitCode]['bidMap'][bidId] = {
      bidder,
      params,
      requestTimestamp: start
    };
  });
}

function onBidResponse({
  auctionId,
  adUnitCode,
  requestId: bidId,
  cpm,
  creativeId,
  responseTimestamp,
  ts,
  adId
}) {
  const adUnit = auctionMap[auctionId]['adUnitMap'][adUnitCode];
  const bid = adUnit['bidMap'][bidId];
  bid.cpm = cpm;
  bid.creativeId = creativeId;
  bid.responseTimestamp = responseTimestamp;
  bid.ts = ts;
  bid.adId = adId;
}

function onBidTimeout(args) {
  utils
    ._map(args, value => value)
    .forEach(({ auctionId, adUnitCode, bidId }) => {
      const bid =
        auctionMap[auctionId]['adUnitMap'][adUnitCode]['bidMap'][bidId];
      bid.timedOut = true;
    });
}

function onBidWon({ auctionId, adUnitCode, requestId: bidId }) {
  const adUnit = auctionMap[auctionId]['adUnitMap'][adUnitCode];
  const bid = adUnit['bidMap'][bidId];
  bid.won = true;
}

function onSlotLoaded({ slot }) {
  const targeting = slot.getTargetingKeys().reduce((targeting, key) => {
    targeting[key] = slot.getTargeting(key);
    return targeting;
  }, {});
  utils.logMessage(
    'GPT slot is loaded. Current targeting set on slot:',
    targeting
  );

  const adId = slot.getTargeting('hb_adid')[0];
  if (!adId) {
    return;
  }

  const adUnit = getAdUnitByAdId(adId);
  if (!adUnit) {
    return;
  }

  const adUnitData = getAdUnitData(adUnit);
  const performanceData = getPerformanceData(adUnit.auctionStart);
  const commonFields = {
    'hb.asiid': slot.getAdUnitPath(),
    'hb.cur': config.getConfig('currency.adServerCurrency'),
    'hb.pubid': initOptions.publisherId
  };

  const data = Object.assign({}, adUnitData, performanceData, commonFields);
  sendEvent(data);
}

function getAdUnitByAdId(adId) {
  let result;

  utils._map(auctionMap, value => value).forEach(auction => {
    utils._map(auction.adUnitMap, value => value).forEach(adUnit => {
      utils._map(adUnit.bidMap, value => value).forEach(bid => {
        if (adId === bid.adId) {
          result = adUnit;
        }
      })
    });
  });

  return result;
}

function getAdUnitData(adUnit) {
  const bids = utils._map(adUnit.bidMap, value => value);
  const bidders = bids.map(bid => bid.bidder);
  const requestTimes = bids.map(
    bid => bid.requestTimestamp && bid.requestTimestamp - adUnit.auctionStart
  );
  const responseTimes = bids.map(
    bid => bid.responseTimestamp && bid.responseTimestamp - adUnit.auctionStart
  );
  const bidValues = bids.map(bid => bid.cpm || 0);
  const timeouts = bids.map(bid => !!bid.timedOut);
  const creativeIds = bids.map(bid => bid.creativeId);
  const winningBid = bids.filter(bid => bid.won)[0];
  const winningExchangeIndex = bids.indexOf(winningBid);
  const openxBid = bids.filter(bid => bid.bidder === 'openx')[0];

  return {
    'hb.ct': adUnit.auctionStart,
    'hb.rid': adUnit.auctionId,
    'hb.exn': bidders.join(','),
    'hb.sts': requestTimes.join(','),
    'hb.ets': responseTimes.join(','),
    'hb.bv': bidValues.join(','),
    'hb.to': timeouts.join(','),
    'hb.crid': creativeIds.join(','),
    'hb.we': winningExchangeIndex,
    'hb.g1': winningExchangeIndex === -1,
    dddid: adUnit.transactionId,
    ts: openxBid && openxBid.ts,
    auid: openxBid && openxBid.params && openxBid.params.unit
  };
}

function getPerformanceData(auctionStart) {
  let timing;
  try {
    timing = window.top.performance.timing;
  } catch (e) {}

  if (!timing) {
    return;
  }

  const { fetchStart, domContentLoadedEventEnd, loadEventEnd } = timing;
  const domContentLoadTime = domContentLoadedEventEnd - fetchStart;
  const pageLoadTime = loadEventEnd - fetchStart;
  const timeToAuction = auctionStart - fetchStart;
  const timeToRender = Date.now() - fetchStart;

  return {
    'hb.dcl': domContentLoadTime,
    'hb.dl': pageLoadTime,
    'hb.tta': timeToAuction,
    'hb.ttr': timeToRender
  };
}

function sendEvent(data) {
  utils._map(data, (value, key) => [key, value]).forEach(([key, value]) => {
    if (
      value === undefined ||
      value === null ||
      (typeof value === 'number' && isNaN(value))
    ) {
      delete data[key];
    }
  });
  ajax(ENDPOINT, null, data, { method: 'GET' });
}

let googletag = window.googletag || {};
googletag.cmd = googletag.cmd || [];
googletag.cmd.push(function() {
  googletag.pubads().addEventListener(SLOT_LOADED, args => {
    openxAdapter.track({ eventType: SLOT_LOADED, args });
  });
});

const openxAdapter = Object.assign(
  adapter({ url: ENDPOINT, analyticsType: 'endpoint' }),
  {
    track({ eventType, args }) {
      utils.logMessage(eventType, Object.assign({}, args));
      switch (eventType) {
        case AUCTION_INIT:
          onAuctionInit(args);
          break;
        case BID_REQUESTED:
          onBidRequested(args);
          break;
        case BID_RESPONSE:
          onBidResponse(args);
          break;
        case BID_TIMEOUT:
          onBidTimeout(args);
          break;
        case BID_WON:
          onBidWon(args);
          break;
        case SLOT_LOADED:
          onSlotLoaded(args);
          break;
      }
    }
  }
);

// save the base class function
openxAdapter.originEnableAnalytics = openxAdapter.enableAnalytics;

// override enableAnalytics so we can get access to the config passed in from the page
openxAdapter.enableAnalytics = function(config) {
  if (!config || !config.options || !config.options.publisherId) {
    utils.logError('OpenX analytics adapter: publisherId is required.');
    return;
  }
  initOptions = config.options;
  openxAdapter.originEnableAnalytics(config); // call the base class function
};

// reset the cache for unit tests
openxAdapter.reset = function() {
  auctionMap = {};
};

adapterManager.registerAnalyticsAdapter({
  adapter: openxAdapter,
  code: 'openx'
});

export default openxAdapter;
