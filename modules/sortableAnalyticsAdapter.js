import adapter from '../src/AnalyticsAdapter.js';
import CONSTANTS from '../src/constants.json';
import adapterManager from '../src/adapterManager.js';
import * as utils from '../src/utils.js';
import {ajax} from '../src/ajax.js';
import {getGlobal} from '../src/prebidGlobal.js';
import { config } from '../src/config.js';

const DEFAULT_PROTOCOL = 'https';
const DEFAULT_HOST = 'pa.deployads.com';
const DEFAULT_URL = `${DEFAULT_PROTOCOL}://${DEFAULT_HOST}/pae`;
const ANALYTICS_TYPE = 'endpoint';
const UTM_STORE_KEY = 'sortable_utm';

export const DEFAULT_PBID_TIMEOUT = 1000;
export const TIMEOUT_FOR_REGISTRY = 250;

const settings = {};
const {
  EVENTS: {
    AUCTION_INIT,
    AUCTION_END,
    BID_REQUESTED,
    BID_ADJUSTMENT,
    BID_WON,
    BID_TIMEOUT,
  }
} = CONSTANTS;

const minsToMillis = mins => mins * 60 * 1000;
const UTM_TTL = minsToMillis(30);

const SORTABLE_EVENTS = {
  BID_WON: 'pbrw',
  BID_TIMEOUT: 'pbto',
  ERROR: 'pber',
  PB_BID: 'pbid'
};

const UTM_PARAMS = [
  'utm_campaign',
  'utm_source',
  'utm_medium',
  'utm_content',
  'utm_term'
];

const EVENT_KEYS_SHORT_NAMES = {
  'auctionId': 'ai',
  'adUnitCode': 'ac',
  'adId': 'adi',
  'bidderAlias': 'bs',
  'bidFactor': 'bif',
  'bidId': 'bid',
  'bidRequestCount': 'brc',
  'bidderRequestId': 'brid',
  'bidRequestedSizes': 'rs',
  'bidTopCpm': 'btcp',
  'bidTopCpmCurrency': 'btcc',
  'bidTopIsNetRevenue': 'btin',
  'bidTopFactor': 'btif',
  'bidTopSrc': 'btsrc',
  'cpm': 'c',
  'currency': 'cc',
  'dealId': 'did',
  'isNetRevenue': 'inr',
  'isTop': 'it',
  'isWinner': 'iw',
  'isTimeout': 'ito',
  'mediaType': 'mt',
  'reachedTop': 'rtp',
  'numIframes': 'nif',
  'size': 'siz',
  'start': 'st',
  'tagId': 'tgid',
  'transactionId': 'trid',
  'ttl': 'ttl',
  'ttr': 'ttr',
  'url': 'u',
  'utm_campaign': 'uc',
  'utm_source': 'us',
  'utm_medium': 'um',
  'utm_content': 'un',
  'utm_term': 'ut'
};

const auctionCache = {};

let bidderFactors = null;

let timeoutId = null;
let eventsToBeSent = [];

function getStorage() {
  try {
    return window['sessionStorage'];
  } catch (e) {
    return null;
  }
}

function putParams(k, v) {
  try {
    const storage = getStorage();
    if (!storage) {
      return false;
    }
    if (v === null) {
      storage.removeItem(k);
    } else {
      storage.setItem(k, JSON.stringify(v));
    }
    return true;
  } catch (e) {
    return false;
  }
}

function getParams(k) {
  try {
    let storage = getStorage();
    if (!storage) {
      return null;
    }
    let value = storage.getItem(k);
    return value === null ? null : JSON.parse(value);
  } catch (e) {
    return null;
  }
}

function storeParams(key, paramsToSave) {
  if (!settings.disableSessionTracking) {
    for (let property in paramsToSave) {
      if (paramsToSave.hasOwnProperty(property)) {
        putParams(key, paramsToSave);
        break;
      }
    }
  }
}

function getSiteKey(options) {
  const sortableConfig = config.getConfig('sortable') || {};
  const globalSiteId = sortableConfig.siteId;
  return globalSiteId || options.siteId;
}

function generateRandomId() {
  let s = (+new Date()).toString(36);
  for (let i = 0; i < 6; ++i) { s += (Math.random() * 36 | 0).toString(36); }
  return s;
}

function getSessionParams() {
  const stillValid = paramsFromStorage => (paramsFromStorage.created) < (+new Date() + UTM_TTL);
  let sessionParams = null;
  if (!settings.disableSessionTracking) {
    const paramsFromStorage = getParams(UTM_STORE_KEY);
    sessionParams = paramsFromStorage && stillValid(paramsFromStorage) ? paramsFromStorage : null;
  }
  sessionParams = sessionParams || {'created': +new Date(), 'sessionId': generateRandomId()};
  const urlParams = UTM_PARAMS.map(utils.getParameterByName);
  if (UTM_PARAMS.every(key => !sessionParams[key])) {
    UTM_PARAMS.forEach((v, i) => sessionParams[v] = urlParams[i] || sessionParams[v]);
    sessionParams.created = +new Date();
    storeParams(UTM_STORE_KEY, sessionParams);
  }
  return sessionParams;
}

function getPrebidVersion() {
  return getGlobal().version;
}

function getFactor(bidder) {
  if (bidder && bidder.bidCpmAdjustment) {
    return bidder.bidCpmAdjustment(1.0);
  } else {
    return null;
  }
}

function getBiddersFactors() {
  const pb = getGlobal();
  const result = {};
  if (pb && pb.bidderSettings) {
    Object.keys(pb.bidderSettings).forEach(bidderKey => {
      const bidder = pb.bidderSettings[bidderKey];
      const factor = getFactor(bidder);
      if (factor !== null) {
        result[bidderKey] = factor;
      }
    });
  }
  return result;
}

function getBaseEvent(auctionId, adUnitCode, bidderCode) {
  const event = {};
  event.s = settings.key;
  event.ai = auctionId;
  event.ac = adUnitCode;
  event.bs = bidderCode;
  return event;
}

function getBidBaseEvent(auctionId, adUnitCode, bidderCode) {
  const sessionParams = getSessionParams();
  const prebidVersion = getPrebidVersion();
  const event = getBaseEvent(auctionId, adUnitCode, bidderCode);
  event.sid = sessionParams.sessionId;
  event.pv = settings.pageviewId;
  event.to = auctionCache[auctionId].timeout;
  event.pbv = prebidVersion;
  UTM_PARAMS.filter(k => sessionParams[k]).forEach(k => event[EVENT_KEYS_SHORT_NAMES[k]] = sessionParams[k]);
  return event;
}

function createPBBidEvent(bid) {
  const event = getBidBaseEvent(bid.auctionId, bid.adUnitCode, bid.bidderAlias);
  Object.keys(bid).forEach(k => {
    const shortName = EVENT_KEYS_SHORT_NAMES[k];
    if (shortName) {
      event[shortName] = bid[k];
    }
  });
  event._type = SORTABLE_EVENTS.PB_BID;
  return event;
}

function getBidFactor(bidderAlias) {
  if (!bidderFactors) {
    bidderFactors = getBiddersFactors();
  }
  const factor = bidderFactors[bidderAlias];
  return typeof factor !== 'undefined' ? factor : 1.0;
}

function createPrebidBidWonEvent({auctionId, adUnitCode, bidderAlias, cpm, currency, isNetRevenue}) {
  const bidFactor = getBidFactor(bidderAlias);
  const event = getBaseEvent(auctionId, adUnitCode, bidderAlias);
  event.bif = bidFactor;
  bidderFactors = null;
  event.c = cpm;
  event.cc = currency;
  event.inr = isNetRevenue;
  event._type = SORTABLE_EVENTS.BID_WON;
  return event;
}

function createPrebidTimeoutEvent({auctionId, adUnitCode, bidderAlias}) {
  const event = getBaseEvent(auctionId, adUnitCode, bidderAlias);
  event._type = SORTABLE_EVENTS.BID_TIMEOUT;
  return event;
}

function getDistinct(arr) {
  return arr.filter((v, i, a) => a.indexOf(v) === i);
}

function groupBy(list, keyGetterFn) {
  const map = {};
  list.forEach(item => {
    const key = keyGetterFn(item);
    map[key] = map[key] ? map[key].concat(item) : [item];
  });
  return map;
}

function mergeAndCompressEventsByType(events, type) {
  if (!events.length) {
    return {};
  }
  const allKeys = getDistinct(events.map(ev => Object.keys(ev)).reduce((prev, curr) => prev.concat(curr), []));
  const eventsAsMap = {};
  allKeys.forEach(k => {
    events.forEach(ev => eventsAsMap[k] = eventsAsMap[k] ? eventsAsMap[k].concat(ev[k]) : [ev[k]]);
  });
  const allSame = arr => arr.every(el => arr[0] === el);
  Object.keys(eventsAsMap)
    .forEach(k => eventsAsMap[k] = (eventsAsMap[k].length && allSame(eventsAsMap[k])) ? eventsAsMap[k][0] : eventsAsMap[k]);
  eventsAsMap._count = events.length;
  const result = {};
  result[type] = eventsAsMap;
  return result;
}

function mergeAndCompressEvents(events) {
  const types = getDistinct(events.map(e => e._type));
  const groupedEvents = groupBy(events, e => e._type);
  const results = types.map(t => groupedEvents[t])
    .map(events => mergeAndCompressEventsByType(events, events[0]._type));
  return results.reduce((prev, eventMap) => {
    const key = Object.keys(eventMap)[0];
    prev[key] = eventMap[key];
    return prev;
  }, {});
}

function registerEvents(events) {
  eventsToBeSent = eventsToBeSent.concat(events);
  if (!timeoutId) {
    timeoutId = setTimeout(() => {
      const _eventsToBeSent = eventsToBeSent.slice();
      eventsToBeSent = [];
      sendEvents(_eventsToBeSent);
      timeoutId = null;
    }, TIMEOUT_FOR_REGISTRY);
  }
}

function sendEvents(events) {
  const url = settings.url;
  const mergedEvents = mergeAndCompressEvents(events);
  const options = {
    'contentType': 'text/plain',
    'method': 'POST',
    'withCredentials': true
  };
  const onSend = () => utils.logInfo('Sortable Analytics data sent');
  ajax(url, onSend, JSON.stringify(mergedEvents), options);
}

// converts [[300, 250], [728, 90]] to '300x250,728x90'
function sizesToString(sizes) {
  return sizes.map(s => s.join('x')).join(',');
}

function dimsToSizeString(width, height) {
  return `${width}x${height}`;
}

function handleBidRequested(event) {
  const refererInfo = event.refererInfo;
  const url = refererInfo.referer;
  const reachedTop = refererInfo.reachedTop;
  const numIframes = refererInfo.numIframes;
  event.bids.forEach(bid => {
    const auctionId = bid.auctionId;
    const adUnitCode = bid.adUnitCode;
    const tagId = bid.bidder === 'sortable' ? bid.params.tagId : '';
    if (!auctionCache[auctionId].adUnits[adUnitCode]) {
      auctionCache[auctionId].adUnits[adUnitCode] = {bids: {}};
    }
    const adUnit = auctionCache[auctionId].adUnits[adUnitCode];
    const bids = adUnit.bids;
    const newBid = {
      adUnitCode: bid.adUnitCode,
      auctionId: event.auctionId,
      bidderAlias: bid.bidder,
      bidId: bid.bidId,
      bidderRequestId: bid.bidderRequestId,
      bidRequestCount: bid.bidRequestsCount,
      bidRequestedSizes: sizesToString(bid.sizes),
      currency: bid.currency,
      cpm: 0.0,
      isTimeout: false,
      isTop: false,
      isWinner: false,
      numIframes: numIframes,
      start: event.start,
      tagId: tagId,
      transactionId: bid.transactionId,
      reachedTop: reachedTop,
      url: encodeURI(url)
    };
    bids[newBid.bidderAlias] = newBid;
  });
}

function handleBidAdjustment(event) {
  const auctionId = event.auctionId;
  const adUnitCode = event.adUnitCode;
  const adUnit = auctionCache[auctionId].adUnits[adUnitCode];
  const bid = adUnit.bids[event.bidderCode];
  const bidFactor = getBidFactor(event.bidderCode);
  bid.adId = event.adId;
  bid.adUnitCode = event.adUnitCode;
  bid.auctionId = event.auctionId;
  bid.bidderAlias = event.bidderCode;
  bid.bidFactor = bidFactor;
  bid.cpm = event.cpm;
  bid.currency = event.currency;
  bid.dealId = event.dealId;
  bid.isNetRevenue = event.netRevenue;
  bid.mediaType = event.mediaType;
  bid.responseTimestamp = event.responseTimestamp;
  bid.size = dimsToSizeString(event.width, event.height);
  bid.ttl = event.ttl;
  bid.ttr = event.timeToRespond;
}

function handleBidWon(event) {
  const auctionId = event.auctionId;
  const auction = auctionCache[auctionId];
  if (auction) {
    const adUnitCode = event.adUnitCode;
    const adUnit = auction.adUnits[adUnitCode];
    Object.keys(adUnit.bids).forEach(bidderCode => {
      const bidFromUnit = adUnit.bids[bidderCode];
      bidFromUnit.isWinner = event.bidderCode === bidderCode;
    });
  } else {
    const ev = createPrebidBidWonEvent({
      adUnitCode: event.adUnitCode,
      auctionId: event.auctionId,
      bidderAlias: event.bidderCode,
      currency: event.currency,
      cpm: event.cpm,
      isNetRevenue: event.netRevenue,
    });
    registerEvents([ev]);
  }
}

function handleBidTimeout(event) {
  event.forEach(timeout => {
    const auctionId = timeout.auctionId;
    const adUnitCode = timeout.adUnitCode;
    const bidderAlias = timeout.bidder;
    const auction = auctionCache[auctionId];
    if (auction) {
      const adUnit = auction.adUnits[adUnitCode];
      const bid = adUnit.bids[bidderAlias];
      bid.isTimeout = true;
    } else {
      const prebidTimeoutEvent = createPrebidTimeoutEvent({auctionId, adUnitCode, bidderAlias});
      registerEvents([prebidTimeoutEvent]);
    }
  });
}

function handleAuctionInit(event) {
  const auctionId = event.auctionId;
  const timeout = event.timeout;
  auctionCache[auctionId] = {timeout: timeout, auctionId: auctionId, adUnits: {}};
}

function handleAuctionEnd(event) {
  const auction = auctionCache[event.auctionId];
  const adUnits = auction.adUnits;
  setTimeout(() => {
    const events = Object.keys(adUnits).map(adUnitCode => {
      const bidderKeys = Object.keys(auction.adUnits[adUnitCode].bids);
      const bids = bidderKeys.map(bidderCode => auction.adUnits[adUnitCode].bids[bidderCode]);
      const highestBid = bids.length ? bids.reduce(utils.getOldestHighestCpmBid) : null;
      return bidderKeys.map(bidderCode => {
        const bid = auction.adUnits[adUnitCode].bids[bidderCode];
        if (highestBid && highestBid.cpm) {
          bid.isTop = highestBid.bidderAlias === bid.bidderAlias;
          bid.bidTopFactor = getBidFactor(highestBid.bidderAlias);
          bid.bidTopCpm = highestBid.cpm;
          bid.bidTopCpmCurrency = highestBid.currency;
          bid.bidTopIsNetRevenue = highestBid.isNetRevenue;
          bid.bidTopSrc = highestBid.bidderAlias;
        }
        return createPBBidEvent(bid);
      });
    }).reduce((prev, curr) => prev.concat(curr), []);
    bidderFactors = null;
    sendEvents(events);
    delete auctionCache[event.auctionId];
  }, settings.timeoutForPbid);
}

function handleError(eventType, event, e) {
  const ev = {};
  ev.s = settings.key;
  ev.ti = eventType;
  ev.args = JSON.stringify(event);
  ev.msg = e.message;
  ev._type = SORTABLE_EVENTS.ERROR;
  registerEvents([ev]);
}

const sortableAnalyticsAdapter = Object.assign(adapter({url: DEFAULT_URL, ANALYTICS_TYPE}), {
  track({eventType, args}) {
    try {
      switch (eventType) {
        case AUCTION_INIT:
          handleAuctionInit(args);
          break;
        case AUCTION_END:
          handleAuctionEnd(args);
          break;
        case BID_REQUESTED:
          handleBidRequested(args);
          break;
        case BID_ADJUSTMENT:
          handleBidAdjustment(args);
          break;
        case BID_WON:
          handleBidWon(args);
          break;
        case BID_TIMEOUT:
          handleBidTimeout(args);
          break;
      }
    } catch (e) {
      handleError(eventType, args, e);
    }
  }
});

sortableAnalyticsAdapter.originEnableAnalytics = sortableAnalyticsAdapter.enableAnalytics;

sortableAnalyticsAdapter.enableAnalytics = function (setupConfig) {
  if (this.initConfig(setupConfig)) {
    utils.logInfo('Sortable Analytics adapter enabled');
    sortableAnalyticsAdapter.originEnableAnalytics(setupConfig);
  }
};

sortableAnalyticsAdapter.initConfig = function (setupConfig) {
  settings.disableSessionTracking = setupConfig.disableSessionTracking === undefined ? false : setupConfig.disableSessionTracking;
  settings.key = getSiteKey(setupConfig.options);
  settings.protocol = setupConfig.options.protocol || DEFAULT_PROTOCOL;
  settings.url = `${settings.protocol}://${setupConfig.options.eventHost || DEFAULT_HOST}/pae/${settings.key}`;
  settings.pageviewId = generateRandomId();
  settings.timeoutForPbid = setupConfig.timeoutForPbid ? Math.max(setupConfig.timeoutForPbid, 0) : DEFAULT_PBID_TIMEOUT;
  return !!settings.key;
};

sortableAnalyticsAdapter.getOptions = function () {
  return settings;
};

adapterManager.registerAnalyticsAdapter({
  adapter: sortableAnalyticsAdapter,
  code: 'sortable'
});

export default sortableAnalyticsAdapter;
