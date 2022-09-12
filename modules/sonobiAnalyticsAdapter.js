import { deepClone, logInfo, logError } from '../src/utils.js';
import adapter from '../libraries/analyticsAdapter/AnalyticsAdapter.js';
import CONSTANTS from '../src/constants.json';
import adapterManager from '../src/adapterManager.js';
import {ajaxBuilder} from '../src/ajax.js';

let ajax = ajaxBuilder(0);

const DEFAULT_EVENT_URL = 'apex.go.sonobi.com/keymaker';
const analyticsType = 'endpoint';
const QUEUE_TIMEOUT_DEFAULT = 200;
const {
  EVENTS: {
    AUCTION_INIT,
    AUCTION_END,
    BID_REQUESTED,
    BID_ADJUSTMENT,
    BIDDER_DONE,
    BID_WON,
    BID_RESPONSE,
    BID_TIMEOUT
  }
} = CONSTANTS;

let initOptions = {};
let auctionCache = {};
let auctionTtl = 60 * 60 * 1000;

function deleteOldAuctions() {
  for (let auctionId in auctionCache) {
    let auction = auctionCache[auctionId];
    if (Date.now() - auction.start > auctionTtl) {
      delete auctionCache[auctionId];
    }
  }
}

function buildAuctionEntity(args) {
  return {
    'id': args.auctionId,
    'start': args.timestamp,
    'timeout': args.timeout,
    'adUnits': {},
    'stats': {},
    'queue': [],
    'qTimeout': false
  };
}
function buildAdUnit(data) {
  return `/${initOptions.pubId}/${initOptions.siteId}/${data.adUnitCode.toLowerCase()}`;
}
function getLatency(data) {
  if (!data.responseTimestamp) {
    return -1;
  } else {
    return data.responseTimestamp - data.requestTimestamp;
  }
}
function getBid(data) {
  if (data.cpm) {
    return Math.round(data.cpm * 100);
  } else {
    return 0;
  }
}
function buildItem(data, response, phase = 1) {
  let size = data.width ? {width: data.width, height: data.height} : {width: data.sizes[0][0], height: data.sizes[0][1]};
  return {
    'bidid': data.bidId || data.requestId,
    'p': phase,
    'buyerid': data.bidder.toLowerCase(),
    'bid': getBid(data),
    'adunit_code': buildAdUnit(data),
    's': `${size.width}x${size.height}`,
    'latency': getLatency(data),
    'response': response,
    'jsLatency': getLatency(data),
    'buyername': data.bidder.toLowerCase()
  };
}
function sendQueue(auctionId) {
  let auction = auctionCache[auctionId];
  let data = auction.queue;
  auction.queue = [];
  auction.qTimeout = false;
  sonobiAdapter.sendData(auction, data);
}
function addToAuctionQueue(auctionId, id) {
  let auction = auctionCache[auctionId];
  auction.queue = auction.queue.filter((item) => {
    if (item.bidid !== id) { return true; }
    return auction.stats[id].data.p !== item.p;
  });
  auction.queue.push(deepClone(auction.stats[id].data));
  if (!auction.qTimeout) {
    auction.qTimeout = setTimeout(() => {
      sendQueue(auctionId);
    }, initOptions.delay)
  }
}
function updateBidStats(auctionId, id, data) {
  let auction = auctionCache[auctionId];
  auction.stats[id].data = {...auction.stats[id].data, ...data};
  addToAuctionQueue(auctionId, id);
  _logInfo('Updated Bid Stats: ', auction.stats[id]);
  return auction.stats[id];
}

function handleOtherEvents(eventType, args) {
  _logInfo('Other Event: ' + eventType, args);
}

function handlerAuctionInit(args) {
  auctionCache[args.auctionId] = buildAuctionEntity(args);
  deleteOldAuctions();
  _logInfo('Auction Init', args);
}
function handlerBidRequested(args) {
  let auction = auctionCache[args.auctionId];
  let data = [];
  let phase = 1;
  let response = 1;
  args.bids.forEach(function (bidRequest) {
    auction = auctionCache[bidRequest.auctionId]
    let built = buildItem(bidRequest, response, phase);
    auction.stats[built.bidid] = {id: built.bidid, adUnitCode: bidRequest.adUnitCode, data: built};
    addToAuctionQueue(args.auctionId, built.bidid);
  })

  _logInfo('Bids Requested ', data);
}

function handlerBidAdjustment(args) {
  _logInfo('Bid Adjustment', args);
}
function handlerBidderDone(args) {
  _logInfo('Bidder Done', args);
}

function handlerAuctionEnd(args) {
  let winners = {};
  args.bidsReceived.forEach((bid) => {
    if (!winners[bid.adUnitCode]) {
      winners[bid.adUnitCode] = {bidId: bid.requestId, cpm: bid.cpm};
    } else if (winners[bid.adUnitCode].cpm < bid.cpm) {
      winners[bid.adUnitCode] = {bidId: bid.requestId, cpm: bid.cpm};
    }
  })
  args.adUnitCodes.forEach((adUnitCode) => {
    if (winners[adUnitCode]) {
      let bidId = winners[adUnitCode].bidId;
      updateBidStats(args.auctionId, bidId, {response: 4});
    }
  })
  _logInfo('Auction End', args);
  _logInfo('Auction Cache', auctionCache[args.auctionId].stats);
}
function handlerBidWon(args) {
  let {auctionId, requestId} = args;
  let res = updateBidStats(auctionId, requestId, {p: 3, response: 6});
  _logInfo('Bid Won ', args);
  _logInfo('Bid Update Result: ', res);
}
function handlerBidResponse(args) {
  let {auctionId, requestId, cpm, size, timeToRespond} = args;
  updateBidStats(auctionId, requestId, {bid: cpm, s: size, jsLatency: timeToRespond, latency: timeToRespond, p: 2, response: 9});

  _logInfo('Bid Response ', args);
}
function handlerBidTimeout(args) {
  let {auctionId, bidId} = args;
  _logInfo('Bid Timeout ', args);
  updateBidStats(auctionId, bidId, {p: 2, response: 0, latency: args.timeout, jsLatency: args.timeout});
}
let sonobiAdapter = Object.assign(adapter({url: DEFAULT_EVENT_URL, analyticsType}), {
  track({eventType, args}) {
    switch (eventType) {
      case AUCTION_INIT:
        handlerAuctionInit(args);
        break;
      case BID_REQUESTED:
        handlerBidRequested(args);
        break;
      case BID_ADJUSTMENT:
        handlerBidAdjustment(args);
        break;
      case BIDDER_DONE:
        handlerBidderDone(args);
        break;
      case AUCTION_END:
        handlerAuctionEnd(args);
        break;
      case BID_WON:
        handlerBidWon(args);
        break;
      case BID_RESPONSE:
        handlerBidResponse(args);
        break;
      case BID_TIMEOUT:
        handlerBidTimeout(args);
        break;
      default:
        handleOtherEvents(eventType, args);
        break;
    }
  },

});

sonobiAdapter.originEnableAnalytics = sonobiAdapter.enableAnalytics;

sonobiAdapter.enableAnalytics = function (config) {
  if (this.initConfig(config)) {
    _logInfo('Analytics adapter enabled', initOptions);
    sonobiAdapter.originEnableAnalytics(config);
  }
};

sonobiAdapter.initConfig = function (config) {
  let isCorrectConfig = true;
  initOptions = {};
  initOptions.options = deepClone(config.options);

  initOptions.pubId = initOptions.options.pubId || null;
  initOptions.siteId = initOptions.options.siteId || null;
  initOptions.delay = initOptions.options.delay || QUEUE_TIMEOUT_DEFAULT;
  if (!initOptions.pubId) {
    _logError('"options.pubId" is empty');
    isCorrectConfig = false;
  }
  if (!initOptions.siteId) {
    _logError('"options.siteId" is empty');
    isCorrectConfig = false;
  }

  initOptions.server = DEFAULT_EVENT_URL;
  initOptions.host = initOptions.options.host || window.location.hostname;
  this.initOptions = initOptions;
  return isCorrectConfig;
};

sonobiAdapter.getOptions = function () {
  return initOptions;
};

sonobiAdapter.sendData = function (auction, data) {
  let url = 'https://' + initOptions.server + '?pageviewid=' + auction.id + '&corscred=1&pubId=' + initOptions.pubId + '&siteId=' + initOptions.siteId;
  ajax(
    url,
    function () { _logInfo('Auction [' + auction.id + '] sent ', data); },
    JSON.stringify(data),
    {
      method: 'POST',
      // withCredentials: true,
      contentType: 'text/plain'
    }
  );
};

function _logInfo(message, meta) {
  logInfo(buildLogMessage(message), meta);
}

function _logError(message) {
  logError(buildLogMessage(message));
}

function buildLogMessage(message) {
  return 'Sonobi Prebid Analytics: ' + message;
}

adapterManager.registerAnalyticsAdapter({
  adapter: sonobiAdapter,
  code: 'sonobi'
});

export default sonobiAdapter;
