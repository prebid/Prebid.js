import { logInfo, logError, parseUrl, _each } from '../src/utils.js';
import adapter from '../libraries/analyticsAdapter/AnalyticsAdapter.js';
import { EVENTS } from '../src/constants.js';
import adapterManager from '../src/adapterManager.js';
import { getRefererInfo } from '../src/refererDetection.js';
import { ajax } from '../src/ajax.js';
import {getStorageManager} from '../src/storageManager.js';
import {MODULE_TYPE_ANALYTICS} from '../src/activities/modules.js';

const MODULE_CODE = 'staq';
const storageObj = getStorageManager({moduleType: MODULE_TYPE_ANALYTICS, moduleName: MODULE_CODE});

const ANALYTICS_VERSION = '1.0.0';
const DEFAULT_QUEUE_TIMEOUT = 4000;
const DEFAULT_HOST = 'tag.staq.com';

let staqAdapterRefWin;

const STAQ_EVENTS = {
  AUCTION_INIT: 'auctionInit',
  BID_REQUEST: 'bidRequested',
  BID_RESPONSE: 'bidResponse',
  BID_WON: 'bidWon',
  AUCTION_END: 'auctionEnd',
  TIMEOUT: 'adapterTimedOut'
};

function buildRequestTemplate(connId) {
  // TODO: what should these pick from refererInfo?
  const url = staqAdapterRefWin.topmostLocation;
  const ref = staqAdapterRefWin.topmostLocation;
  const topLocation = staqAdapterRefWin.topmostLocation;

  return {
    ver: ANALYTICS_VERSION,
    domain: topLocation.hostname,
    path: topLocation.pathname,
    userAgent: navigator.userAgent,
    connId: connId,
    env: {
      screen: {
        w: window.screen.width,
        h: window.screen.height
      },
      lang: navigator.language
    },
    src: getUmtSource(url, ref)
  }
}

let analyticsAdapter = Object.assign(adapter({ analyticsType: 'endpoint' }), {
  track({ eventType, args }) {
    if (!analyticsAdapter.context) {
      return;
    }
    let handler = null;
    switch (eventType) {
      case EVENTS.AUCTION_INIT:
        if (analyticsAdapter.context.queue) {
          analyticsAdapter.context.queue.init();
        }
        handler = trackAuctionInit;
        break;
      case EVENTS.BID_REQUESTED:
        handler = trackBidRequest;
        break;
      case EVENTS.BID_RESPONSE:
        handler = trackBidResponse;
        break;
      case EVENTS.BID_WON:
        handler = trackBidWon;
        break;
      case EVENTS.BID_TIMEOUT:
        handler = trackBidTimeout;
        break;
      case EVENTS.AUCTION_END:
        handler = trackAuctionEnd;
        break;
    }
    if (handler) {
      let events = handler(args);
      if (analyticsAdapter.context.queue) {
        analyticsAdapter.context.queue.push(events);
        if (eventType === EVENTS.BID_WON) {
          analyticsAdapter.context.queue.updateWithWins(events);
        }
      }
      if (eventType === EVENTS.AUCTION_END) {
        sendAll();
      }
    }
  }
});

analyticsAdapter.context = {};

analyticsAdapter.originEnableAnalytics = analyticsAdapter.enableAnalytics;

analyticsAdapter.enableAnalytics = (config) => {
  logInfo('Enabling STAQ Adapter');
  staqAdapterRefWin = getRefererInfo(window);
  if (!config.options.connId) {
    logError('ConnId is not defined. STAQ Analytics won\'t work');
    return;
  }
  if (!config.options.url) {
    logError('URL is not defined. STAQ Analytics won\'t work');
    return;
  }
  analyticsAdapter.context = {
    host: config.options.host || DEFAULT_HOST,
    url: config.options.url,
    connectionId: config.options.connId,
    requestTemplate: buildRequestTemplate(config.options.connId),
    queue: new ExpiringQueue(sendAll, config.options.queueTimeout || DEFAULT_QUEUE_TIMEOUT)
  };
  analyticsAdapter.originEnableAnalytics(config);
};

adapterManager.registerAnalyticsAdapter({
  adapter: analyticsAdapter,
  code: MODULE_CODE,
});

export default analyticsAdapter;

function sendAll() {
  let events = analyticsAdapter.context.queue.popAll();
  if (events.length !== 0) {
    let req = analyticsAdapter.context.requestTemplate;
    req.auctionId = analyticsAdapter.context.auctionId;
    req.events = events

    analyticsAdapter.ajaxCall(JSON.stringify(req));
  }
}

analyticsAdapter.ajaxCall = function ajaxCall(data) {
  logInfo('SENDING DATA: ' + data);
  ajax(`https://${analyticsAdapter.context.url}/prebid/${analyticsAdapter.context.connectionId}`, () => {}, data, { contentType: 'text/plain' });
};

function trackAuctionInit(args) {
  analyticsAdapter.context.auctionTimeStart = Date.now();
  analyticsAdapter.context.auctionId = args.auctionId;
  const event = createHbEvent(args.auctionId, undefined, STAQ_EVENTS.AUCTION_INIT);
  return [event];
}

function trackBidRequest(args) {
  return args.bids.map(bid =>
    createHbEvent(args.auctionId, args.bidderCode, STAQ_EVENTS.BID_REQUEST, bid.adUnitCode));
}

function trackBidResponse(args) {
  const event = createHbEvent(args.auctionId, args.bidderCode, STAQ_EVENTS.BID_RESPONSE,
    args.adUnitCode, args.cpm, args.timeToRespond / 1000, false, args);
  return [event];
}

function trackBidWon(args) {
  const event = createHbEvent(args.auctionId, args.bidderCode, STAQ_EVENTS.BID_WON, args.adUnitCode, args.cpm, undefined, true, args);
  return [event];
}

function trackAuctionEnd(args) {
  const event = createHbEvent(args.auctionId, undefined, STAQ_EVENTS.AUCTION_END, undefined,
    undefined, (Date.now() - analyticsAdapter.context.auctionTimeStart) / 1000);
  return [event];
}

function trackBidTimeout(args) {
  return args.map(arg => createHbEvent(arg.auctionId, arg.bidderCode, STAQ_EVENTS.TIMEOUT));
}

function createHbEvent(auctionId, adapter, event, adUnitCode = undefined, value = 0, time = 0, bidWon = undefined, eventArgs) {
  let ev = { event: event };
  if (adapter) {
    ev.adapter = adapter;
    ev.bidderName = adapter;
  }
  if (adUnitCode) {
    ev.adUnitCode = adUnitCode;
  }
  if (value) {
    ev.cpm = value;
  }
  if (time) {
    ev.timeToRespond = time;
  }
  if (typeof bidWon !== 'undefined') {
    ev.bidWon = bidWon;
  } else if (event === 'bidResponse') {
    ev.bidWon = false;
  }
  ev.auctionId = auctionId;

  if (eventArgs) {
    if (STAQ_EVENTS.BID_RESPONSE == event || STAQ_EVENTS.BID_WON == event) {
      ev.width = eventArgs.width;
      ev.height = eventArgs.height;

      ev.adId = eventArgs.adId;
    }
  }

  return ev;
}

const UTM_TAGS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
  'utm_c1', 'utm_c2', 'utm_c3', 'utm_c4', 'utm_c5'
];
const STAQ_PREBID_KEY = 'staq_analytics';
const DIRECT = '(direct)';
const REFERRAL = '(referral)';
const ORGANIC = '(organic)';

export let storage = {
  getItem: (name) => {
    return storageObj.getDataFromLocalStorage(name);
  },
  setItem: (name, value) => {
    storageObj.setDataInLocalStorage(name, value);
  }
};

export function getUmtSource(pageUrl, referrer) {
  let prevUtm = getPreviousTrafficSource();
  let currUtm = getCurrentTrafficSource(pageUrl, referrer);
  let [updated, actual] = chooseActualUtm(prevUtm, currUtm);
  if (updated) {
    storeUtm(actual);
  }
  return actual;

  function getPreviousTrafficSource() {
    let val = storage.getItem(STAQ_PREBID_KEY);
    if (!val) {
      return getDirect();
    }
    return JSON.parse(val);
  }

  function getCurrentTrafficSource(pageUrl, referrer) {
    var source = getUTM(pageUrl);
    if (source) {
      return source;
    }
    if (referrer) {
      let se = getSearchEngine(referrer);
      if (se) {
        return asUtm(se, ORGANIC, ORGANIC);
      }
      let parsedUrl = parseUrl(pageUrl);
      let [refHost, refPath] = getReferrer(referrer);
      if (refHost && refHost !== parsedUrl.hostname) {
        return asUtm(refHost, REFERRAL, REFERRAL, '', refPath);
      }
    }
    return getDirect();
  }

  function getSearchEngine(pageUrl) {
    let engines = {
      'google': /^https?\:\/\/(?:www\.)?(?:google\.(?:com?\.)?(?:com|cat|[a-z]{2})|g.cn)\//i,
      'yandex': /^https?\:\/\/(?:www\.)?ya(?:ndex\.(?:com|net)?\.?(?:asia|mobi|org|[a-z]{2})?|\.ru)\//i,
      'bing': /^https?\:\/\/(?:www\.)?bing\.com\//i,
      'duckduckgo': /^https?\:\/\/(?:www\.)?duckduckgo\.com\//i,
      'ask': /^https?\:\/\/(?:www\.)?ask\.com\//i,
      'yahoo': /^https?\:\/\/(?:[-a-z]+\.)?(?:search\.)?yahoo\.com\//i
    };

    for (let engine in engines) {
      if (engines.hasOwnProperty(engine) && engines[engine].test(pageUrl)) {
        return engine;
      }
    }
  }

  function getReferrer(referrer) {
    let ref = parseUrl(referrer);
    return [ref.hostname, ref.pathname];
  }

  function getUTM(pageUrl) {
    let urlParameters = parseUrl(pageUrl).search;
    if (!urlParameters['utm_campaign'] || !urlParameters['utm_source']) {
      return;
    }
    let utmArgs = [];
    _each(UTM_TAGS, (utmTagName) => {
      let utmValue = urlParameters[utmTagName] || '';
      utmArgs.push(utmValue);
    });
    return asUtm.apply(this, utmArgs);
  }

  function getDirect() {
    return asUtm(DIRECT, DIRECT, DIRECT);
  }

  function storeUtm(utm) {
    let val = JSON.stringify(utm);
    storage.setItem(STAQ_PREBID_KEY, val);
  }

  function asUtm(source, medium, campaign, term = '', content = '', c1 = '', c2 = '', c3 = '', c4 = '', c5 = '') {
    let result = {
      source: source,
      medium: medium,
      campaign: campaign
    };
    if (term) {
      result.term = term;
    }
    if (content) {
      result.content = content;
    }
    if (c1) {
      result.c1 = c1;
    }
    if (c2) {
      result.c2 = c2;
    }
    if (c3) {
      result.c3 = c3;
    }
    if (c4) {
      result.c4 = c4;
    }
    if (c5) {
      result.c5 = c5;
    }
    return result;
  }

  function chooseActualUtm(prev, curr) {
    if (ord(prev) < ord(curr)) {
      return [true, curr];
    }
    if (ord(prev) > ord(curr)) {
      return [false, prev];
    } else {
      if (prev.campaign === REFERRAL && prev.content !== curr.content) {
        return [true, curr];
      } else if (prev.campaign === ORGANIC && prev.source !== curr.source) {
        return [true, curr];
      } else if (isCampaignTraffic(prev) && (prev.campaign !== curr.campaign || prev.source !== curr.source)) {
        return [true, curr];
      }
    }
    return [false, prev];
  }

  function ord(utm) {
    switch (utm.campaign) {
      case DIRECT:
        return 0;
      case ORGANIC:
        return 1;
      case REFERRAL:
        return 2;
      default:
        return 3;
    }
  }

  function isCampaignTraffic(utm) {
    return [DIRECT, REFERRAL, ORGANIC].indexOf(utm.campaign) === -1;
  }
}

/**
 * Expiring queue implementation. Fires callback on elapsed timeout since last last update or creation.
 * @param callback
 * @param ttl
 * @constructor
 */
export function ExpiringQueue(callback, ttl) {
  let queue = [];
  let timeoutId;

  this.push = (event) => {
    if (event instanceof Array) {
      queue.push.apply(queue, event);
    } else {
      queue.push(event);
    }
    reset();
  };

  this.updateWithWins = (winEvents) => {
    winEvents.forEach(winEvent => {
      queue.forEach(prevEvent => {
        if (prevEvent.event === 'bidResponse' &&
          prevEvent.auctionId == winEvent.auctionId &&
          prevEvent.adUnitCode == winEvent.adUnitCode &&
          prevEvent.adId == winEvent.adId &&
          prevEvent.adapter == winEvent.adapter) {
          prevEvent.bidWon = true;
        }
      });
    });
  }

  this.popAll = () => {
    let result = queue;
    queue = [];
    reset();
    return result;
  };

  /**
   * For test/debug purposes only
   * @return {Array}
   */
  this.peekAll = () => {
    return queue;
  };

  this.init = reset;

  function reset() {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      if (queue.length) {
        callback();
      }
    }, ttl);
  }
}
