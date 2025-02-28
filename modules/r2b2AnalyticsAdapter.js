import {ajax} from '../src/ajax.js';
import adapter from '../libraries/analyticsAdapter/AnalyticsAdapter.js';
import {EVENTS} from '../src/constants.js';
import adapterManager from '../src/adapterManager.js';
import {getGlobal} from '../src/prebidGlobal.js';
import {isNumber, isPlainObject, isStr, logError, logWarn} from '../src/utils.js';
import {getRefererInfo} from '../src/refererDetection.js';
import {config} from '../src/config.js';

const ADAPTER_VERSION = '1.1.0';
const ADAPTER_CODE = 'r2b2';
const MODULE_NAME = 'R2B2 Analytics'
const GVLID = 1235;
const analyticsType = 'endpoint';

const DEFAULT_SERVER = 'log.r2b2.cz';
const DEFAULT_EVENT_PATH = 'prebid/events';
const DEFAULT_ERROR_PATH = 'error';
const DEFAULT_PROTOCOL = 'https';

const ERROR_MAX = 10;
const BATCH_SIZE = 50;
const BATCH_DELAY = 500;
const MAX_CALL_DEPTH = 20;
const REPORTED_URL = getRefererInfo().page || getRefererInfo().topmostLocation || '';

const START_TIME = Date.now();

const CACHE_TTL = 300 * 1000;

const EVENT_MAP = {};
EVENT_MAP[EVENTS.NO_BID] = 'noBid';
EVENT_MAP[EVENTS.AUCTION_INIT] = 'init';
EVENT_MAP[EVENTS.BID_REQUESTED] = 'request';
EVENT_MAP[EVENTS.BID_TIMEOUT] = 'timeout';
EVENT_MAP[EVENTS.BID_RESPONSE] = 'response';
EVENT_MAP[EVENTS.BID_REJECTED] = 'reject';
EVENT_MAP[EVENTS.BIDDER_ERROR] = 'bidError';
EVENT_MAP[EVENTS.BIDDER_DONE] = 'bidderDone';
EVENT_MAP[EVENTS.AUCTION_END] = 'auction';
EVENT_MAP[EVENTS.BID_WON] = 'bidWon';
EVENT_MAP[EVENTS.SET_TARGETING] = 'targeting';
EVENT_MAP[EVENTS.STALE_RENDER] = 'staleRender';
EVENT_MAP[EVENTS.AD_RENDER_SUCCEEDED] = 'render';
EVENT_MAP[EVENTS.AD_RENDER_FAILED] = 'renderFail';
EVENT_MAP[EVENTS.BID_VIEWABLE] = 'view';

/* CONFIGURATION */
let WEBSITE = 0;
let CONFIG_ID = 0;
let CONFIG_VERSION = 0;
let LOG_SERVER = DEFAULT_SERVER;

/* CACHED DATA */
let latestAuction = '';
let previousAuction = '';
let auctionCount = 0;
let auctionsData = {};
let bidsData = {};
let adServerCurrency = '';

let flushTimer;
let eventBuffer = [];
let errors = 0;

let callDepth = 0;
function flushEvents () {
  let events = { prebid: { e: eventBuffer, c: adServerCurrency } };
  eventBuffer = [];
  callDepth++;
  try {
    // check for recursion in case reportEvents propagates error events
    // and execution doesn't finish before BATCH_SIZE is reached again
    if (callDepth >= MAX_CALL_DEPTH) {
      if (callDepth === MAX_CALL_DEPTH) {
        logError(`${MODULE_NAME}: Maximum call depth reached, discarding events`);
      }
      return;
    }
    // clear out old data only in state without recursion
    if (callDepth === 1) {
      clearCache(bidsData);
      clearCache(auctionsData);
    }

    reportEvents(events);
  } finally {
    callDepth--;
  }
}

function clearCache(cache) {
  const now = Date.now();
  for (const [key, { t }] of Object.entries(cache)) {
    if ((t + CACHE_TTL) < now) {
      delete cache[key];
    }
  }
}

export function resetAnalyticAdapter() {
  latestAuction = '';
  previousAuction = '';
  auctionCount = 0;
  auctionsData = {};
  bidsData = {};
  adServerCurrency = '';
  clearTimeout(flushTimer);
  eventBuffer = [];
  errors = 0;
  callDepth = 0;

  WEBSITE = 0;
  CONFIG_ID = 0;
  CONFIG_VERSION = 0;
  LOG_SERVER = DEFAULT_SERVER;
}
function processEvent (event) {
  // console.log('process event:', event);
  // console.log(JSON.stringify(event));
  if (!event) {
    return
  }
  eventBuffer.push(event);
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null
  }
  if (eventBuffer.length >= BATCH_SIZE) {
    flushEvents();
  } else {
    flushTimer = setTimeout(flushEvents, BATCH_DELAY);
  }
}

function processErrorParams(params) {
  if (isPlainObject(params)) {
    try {
      return JSON.stringify(params);
    } catch (e) { /* do nothing */ }
  }
  return null
}
function reportError (message, params) {
  errors++;
  if (errors > ERROR_MAX) return;
  params = processErrorParams(params);
  message = `[ANALYTICS-${ADAPTER_VERSION}] ${message}`;
  const url = r2b2Analytics.getErrorUrl() +
    `?d=${encodeURIComponent(WEBSITE)}` +
    `&m=${encodeURIComponent(message)}` +
    `&t=prebid` +
    `&p=1` +
    (params ? `&pr=${encodeURIComponent(params)}` : '') +
    (CONFIG_ID ? `&conf=${encodeURIComponent(CONFIG_ID)}` : '') +
    (CONFIG_VERSION ? `&conf_ver=${encodeURIComponent(CONFIG_VERSION)}` : '') +
    `&u=${encodeURIComponent(REPORTED_URL)}`;
  ajax(url, null, null, {});
}
function reportEvents (events) {
  try {
    let data = 'events=' + JSON.stringify(events);
    let url = r2b2Analytics.getUrl() +
      `?v=${encodeURIComponent(ADAPTER_VERSION)}` +
      `&hbDomain=${encodeURIComponent(WEBSITE)}` +
      (CONFIG_ID ? `&conf=${encodeURIComponent(CONFIG_ID)}` : '') +
      (CONFIG_VERSION ? `&conf_ver=${encodeURIComponent(CONFIG_VERSION)}` : '') +
      `&u=${encodeURIComponent(REPORTED_URL)}`;
    let headers = {
      contentType: 'application/x-www-form-urlencoded'
    }
    data = data.replace(/&/g, '%26');
    ajax(url, null, data, headers);
  } catch (e) {
    const msg = `Error sending events - ${e.message}`;
    logError(`${MODULE_NAME}: ${msg}`);
    reportError(msg);
  }
}

function getStandardTargeting (obj) {
  if (obj) {
    return {
      b: obj.hb_bidder || '',
      sz: obj.hb_size || '',
      pb: obj.hb_pb || '',
      fmt: obj.hb_format || ''
    }
  }
}
function getEventTimestamps (eventName, auctionId) {
  const timestamps = {
    t: Date.now() - START_TIME
  };
  if (!auctionId || !auctionsData[auctionId]) {
    return timestamps
  }
  const auctionData = auctionsData[auctionId];

  timestamps.to = auctionData.timeout;
  timestamps.ts = auctionData.start - START_TIME;
  if (auctionData.end) {
    timestamps.te = auctionData.end - START_TIME;
  }
  if (eventName === EVENT_MAP[EVENTS.AUCTION_INIT] && auctionCount > 1) {
    timestamps.tprev = auctionsData[previousAuction].start - START_TIME;
  }
  return timestamps
}

function createEvent (name, data, auctionId) {
  if (!auctionId || !auctionsData[auctionId]) {
    reportError('No auction data when creating event', {
      event: name,
      auctionId: !!auctionId
    });
    return null
  }
  if (auctionsData[auctionId] && auctionsData[auctionId].empty) {
    return null
  }

  data = data || {};
  data.ai = auctionId;

  return {
    e: name,
    d: data,
    t: getEventTimestamps(name, auctionId)
  }
}

function createAuctionData (auction, empty) {
  const auctionId = auction.auctionId;
  previousAuction = latestAuction;
  latestAuction = auctionId;
  auctionCount++;
  auctionsData[auctionId] = {
    start: auction.timestamp,
    end: auction.auctionEnd ? auction.auctionEnd : null,
    timeout: auction.timeout,
    empty: !!empty,
    t: Date.now(),
  };
}
function handleAuctionInit (args) {
  // console.log('auction init:', arguments);
  createAuctionData(args);
  const auctionId = args.auctionId;
  const bidderRequests = args.bidderRequests || [];
  const data = {
    o: auctionCount,
    u: bidderRequests.reduce((result, bidderRequest) => {
      bidderRequest.bids.forEach((bid) => {
        if (!result[bid.adUnitCode]) {
          result[bid.adUnitCode] = []
        }
        result[bid.adUnitCode].push(bid.bidder)
      });
      return result
    }, {})
  };
  const event = createEvent(EVENT_MAP[EVENTS.AUCTION_INIT], data, auctionId);
  processEvent(event);
}
function handleBidRequested (args) {
  // console.log('bid request:', arguments);
  const data = {
    b: args.bidderCode,
    u: args.bids.reduce((result, bid) => {
      if (!result[bid.adUnitCode]) {
        result[bid.adUnitCode] = 1
      } else {
        result[bid.adUnitCode]++
      }
      return result
    }, {})
  };
  const event = createEvent(EVENT_MAP[EVENTS.BID_REQUESTED], data, args.auctionId);
  processEvent(event);
}
function handleBidTimeout (args) {
  // console.log('bid timeout:', arguments);
  const auctionId = args.length ? args[0].auctionId : null;
  if (auctionId) {
    let bidders = args.reduce((result, bid) => {
      if (!result[bid.bidder]) {
        result[bid.bidder] = {}
      }
      const bidderData = result[bid.bidder];
      if (!bidderData[bid.adUnitCode]) {
        bidderData[bid.adUnitCode] = 1
      } else {
        bidderData[bid.adUnitCode]++
      }
      return result
    }, {});

    const data = {
      b: bidders,
    }
    const event = createEvent(EVENT_MAP[EVENTS.BID_TIMEOUT], data, auctionId);
    processEvent(event);
  }
}
function handleNoBid (args) {
  // console.log('no bid:', arguments);
  const data = {
    b: args.bidder,
    u: args.adUnitCode
  };
  const event = createEvent(EVENT_MAP[EVENTS.NO_BID], data, args.auctionId);
  processEvent(event);
}
function handleBidResponse (args) {
  // console.log('bid response:', arguments);
  bidsData[args.adId] = {
    id: args.requestId,
    auctionId: args.auctionId,
    t: Date.now(),
  };
  const data = {
    b: args.bidder,
    u: args.adUnitCode,
    p: args.cpm,
    op: args.originalCpm,
    c: args.currency,
    oc: args.originalCurrency,
    sz: args.size,
    st: args.status,
    rt: args.timeToRespond,
    bi: args.requestId,
  };
  const event = createEvent(EVENT_MAP[EVENTS.BID_RESPONSE], data, args.auctionId);
  processEvent(event);
}
function handleBidRejected (args) {
  // console.log('bid rejected:', arguments);
  const data = {
    b: args.bidder,
    u: args.adUnitCode,
    p: args.cpm,
    c: args.currency,
    r: args.rejectionReason,
    bi: args.requestId,
  };
  const event = createEvent(EVENT_MAP[EVENTS.BID_REJECTED], data, args.auctionId);
  processEvent(event);
}
function handleBidderDone (args) {
  // console.log('bidder done:', arguments);
  const data = {
    b: args.bidderCode
  };
  const event = createEvent(EVENT_MAP[EVENTS.BIDDER_DONE], data, args.auctionId);
  processEvent(event);
}
function getAuctionUnitsData (auctionObject) {
  let unitsData = {};
  const {bidsReceived, bidsRejected} = auctionObject;
  let _unitsDataBidReducer = function(data, bid, key) {
    const {adUnitCode, bidder} = bid;
    data[adUnitCode] = data[adUnitCode] || {};
    data[adUnitCode][key] = data[adUnitCode][key] || {};
    data[adUnitCode][key][bidder] = (data[adUnitCode][key][bidder] || 0) + 1;
    return data
  };
  unitsData = bidsReceived.reduce((data, bid) => {
    if (!bid.cpm) return data;
    return _unitsDataBidReducer(data, bid, 'b')
  }, unitsData);
  unitsData = bidsRejected.reduce((data, bid) => {
    return _unitsDataBidReducer(data, bid, 'rj')
  }, unitsData);
  return unitsData
}
function handleEmptyAuction(auction) {
  let auctionId = auction.auctionId;
  if (!auctionsData[auctionId]) {
    createAuctionData(auction, true);
  }
}
function handleAuctionEnd (args) {
  // console.log('auction end:', arguments);
  if (!args.bidderRequests.length) {
    handleEmptyAuction(args);
    return
  }
  auctionsData[args.auctionId].end = args.auctionEnd;
  let winningBids = getGlobal().getHighestCpmBids() || [];
  if (winningBids.length === 0) {
    winningBids = getGlobal().getAllWinningBids() || [];
  }
  const wins = [];
  winningBids.forEach((bid) => {
    if (bid.auctionId === args.auctionId) {
      wins.push({
        b: bid.bidder,
        u: bid.adUnitCode,
        p: bid.cpm,
        c: bid.currency,
        sz: bid.size,
        bi: bid.requestId,
      })
    }
  });
  const data = {
    wins,
    u: getAuctionUnitsData(args),
    o: auctionCount,
    bc: args.bidsReceived.length,
    nbc: args.noBids.length,
    rjc: args.bidsRejected.length,
    brc: args.bidderRequests.reduce((count, bidderRequest) => {
      const c = bidderRequest.bids.length || 0;
      return count + c
    }, 0)
  };
  const event = createEvent(EVENT_MAP[EVENTS.AUCTION_END], data, args.auctionId);
  processEvent(event);
}
function handleBidWon (args) {
  // console.log('bid won:', arguments);
  const data = {
    b: args.bidder,
    u: args.adUnitCode,
    p: args.cpm,
    op: args.originalCpm,
    c: args.currency,
    oc: args.originalCurrency,
    sz: args.size,
    mt: args.mediaType,
    at: getStandardTargeting(args.adserverTargeting),
    o: auctionCount,
    bi: args.requestId,
  };
  const event = createEvent(EVENT_MAP[EVENTS.BID_WON], data, args.auctionId);
  processEvent(event);
}
function handleSetTargeting (args) {
  // console.log('set targeting:', arguments);
  let adId;
  const filteredTargetings = {};
  Object.keys(args).forEach((unit) => {
    if (Object.keys(args[unit]).length) {
      if (!adId) {
        adId = args[unit].hb_adid
      }
      filteredTargetings[unit] = getStandardTargeting(args[unit]);
    }
  });
  if (adId) {
    const auctionId = bidsData[adId].auctionId;
    const data = {
      u: filteredTargetings
    }
    const event = createEvent(EVENT_MAP[EVENTS.SET_TARGETING], data, auctionId);
    processEvent(event);
  }
}
function handleStaleRender (args) {
  // console.log('stale render:', arguments);
  const data = {
    b: args.bidder,
    u: args.adUnitCode,
    p: args.cpm,
    c: args.currency,
    bi: args.requestId,
  };
  const event = createEvent(EVENT_MAP[EVENTS.STALE_RENDER], data, args.auctionId);
  processEvent(event);
}
function handleRenderSuccess (args) {
  // console.log('render success:', arguments);
  const {bid} = args;
  bidsData[bid.adId].renderTime = Date.now();
  const data = {
    b: bid.bidder,
    u: bid.adUnitCode,
    p: bid.cpm,
    c: bid.currency,
    sz: bid.size,
    mt: bid.mediaType,
    bi: bid.requestId,
  };
  const event = createEvent(EVENT_MAP[EVENTS.AD_RENDER_SUCCEEDED], data, bid.auctionId);
  processEvent(event);
}
function handleRenderFailed (args) {
  // console.log('render failed:', arguments);
  const {bid, reason} = args;
  const data = {
    b: bid.bidder,
    u: bid.adUnitCode,
    p: bid.cpm,
    c: bid.currency,
    r: reason,
    bi: bid.requestId,
  };
  const event = createEvent(EVENT_MAP[EVENTS.AD_RENDER_FAILED], data, bid.auctionId);
  processEvent(event);
}
function handleBidViewable (args) {
  // console.log('bid viewable:', arguments);
  const renderTime = bidsData[args.adId].renderTime;
  const data = {
    b: args.bidder,
    u: args.adUnitCode,
    rt: Date.now() - renderTime,
    bi: args.requestId,
  };
  const event = createEvent(EVENT_MAP[EVENTS.BID_VIEWABLE], data, args.auctionId);
  processEvent(event);
}

let baseAdapter = adapter({analyticsType});
let r2b2Analytics = Object.assign({}, baseAdapter, {
  getUrl() {
    return `${DEFAULT_PROTOCOL}://${LOG_SERVER}/${DEFAULT_EVENT_PATH}`
  },
  getErrorUrl() {
    return `${DEFAULT_PROTOCOL}://${LOG_SERVER}/${DEFAULT_ERROR_PATH}`
  },
  enableAnalytics(conf = {}) {
    if (isPlainObject(conf.options)) {
      const {domain, configId, configVer, server} = conf.options;
      if (!domain || !isStr(domain)) {
        logWarn(`${MODULE_NAME}: Mandatory parameter 'domain' not configured, analytics disabled`);
        return
      }
      WEBSITE = domain
      if (server) {
        if (isStr(server)) {
          LOG_SERVER = server
        } else {
          logWarn(`options.server must be a string`);
        }
      }
      if (configId) {
        if (isNumber(configId)) {
          CONFIG_ID = configId
        } else {
          logWarn(`options.configId must be a number`);
        }
      }
      if (configVer) {
        if (isNumber(configVer)) {
          CONFIG_VERSION = configVer
        } else {
          logWarn(`options.configVer must be a number`);
        }
      }
    }
    baseAdapter.enableAnalytics.call(this, conf);
  },
  track(event) {
    const {eventType, args} = event;
    try {
      if (!adServerCurrency) {
        const currencyObj = config.getConfig('currency');
        adServerCurrency = (currencyObj && currencyObj.adServerCurrency) || 'USD';
      }
      switch (eventType) {
        case EVENTS.NO_BID:
          handleNoBid(args)
          break;
        case EVENTS.AUCTION_INIT:
          handleAuctionInit(args)
          break;
        case EVENTS.BID_REQUESTED:
          handleBidRequested(args)
          break;
        case EVENTS.BID_TIMEOUT:
          handleBidTimeout(args)
          break;
        case EVENTS.BID_RESPONSE:
          handleBidResponse(args)
          break;
        case EVENTS.BID_REJECTED:
          handleBidRejected(args)
          break;
        case EVENTS.BIDDER_DONE:
          handleBidderDone(args)
          break;
        case EVENTS.AUCTION_END:
          handleAuctionEnd(args)
          break;
        case EVENTS.BID_WON:
          handleBidWon(args)
          break;
        case EVENTS.SET_TARGETING:
          handleSetTargeting(args)
          break;
        case EVENTS.STALE_RENDER:
          handleStaleRender(args)
          break;
        case EVENTS.AD_RENDER_SUCCEEDED:
          handleRenderSuccess(args)
          break;
        case EVENTS.AD_RENDER_FAILED:
          handleRenderFailed(args)
          break;
        case EVENTS.BID_VIEWABLE:
          handleBidViewable(args)
          break;
      }
    } catch (e) {
      reportError(`${eventType} - ${e.message}`)
    }
  }
});

// save the base class function
r2b2Analytics.originEnableAnalytics = r2b2Analytics.enableAnalytics;

// override enableAnalytics so we can get access to the config passed in from the page
r2b2Analytics.enableAnalytics = function (config) {
  r2b2Analytics.originEnableAnalytics(config); // call the base class function
};

adapterManager.registerAnalyticsAdapter({
  adapter: r2b2Analytics,
  code: ADAPTER_CODE,
  gvlid: GVLID
});

export default r2b2Analytics;
