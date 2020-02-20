/**
 * invisiblyAdapterAdapter.js - analytics adapter for Invisibly
 */
import { ajaxBuilder } from '../src/ajax.js';
import adapter from '../src/AnalyticsAdapter.js';
import adapterManager from '../src/adapterManager.js';

const DEFAULT_EVENT_URL = 'https://api.pymx5.com/v1/' + 'sites/events';
const analyticsType = 'endpoint';
const analyticsName = 'Invisibly Analytics Adapter:';

const utils = require('../src/utils.js');
const CONSTANTS = require('../src/constants.json');
const ajax = ajaxBuilder(0);

// Events needed
const {
  EVENTS: {
    AUCTION_INIT,
    AUCTION_END,
    BID_ADJUSTMENT,
    BID_TIMEOUT,
    BID_REQUESTED,
    BID_RESPONSE,
    NO_BID,
    BID_WON,
    BIDDER_DONE,
    SET_TARGETING,
    REQUEST_BIDS,
    ADD_AD_UNITS,
    AD_RENDER_FAILED
  }
} = CONSTANTS;

const _VERSION = 1;
const _pageViewId = utils.generateUUID();
let initOptions = null;
let _startAuction = 0;
let _bidRequestTimeout = 0;
let flushInterval;
let invisiblyAnalyticsEnabled = false;

const w = window;
const d = document;
let e = d.documentElement;
let g = d.getElementsByTagName('body')[0];
let x = w.innerWidth || e.clientWidth || g.clientWidth;
let y = w.innerHeight || e.clientHeight || g.clientHeight;

let _pageView = {
  eventType: 'pageView',
  userAgent: window.navigator.userAgent,
  timestamp: Date.now(),
  timezoneOffset: new Date().getTimezoneOffset(),
  language: window.navigator.language,
  vendor: window.navigator.vendor,
  screenWidth: x,
  screenHeight: y
};

let _eventQueue = [_pageView];

let invisiblyAdapter = Object.assign(
  adapter({ url: DEFAULT_EVENT_URL, analyticsType }),
  {
    track({ eventType, args }) {
      handleEvent(eventType, args);
    },
    sendEvent
  }
);

invisiblyAdapter.originEnableAnalytics = invisiblyAdapter.enableAnalytics;
invisiblyAdapter.enableAnalytics = function(config) {
  initOptions = config.options || {};
  initOptions.url = initOptions.url || DEFAULT_EVENT_URL;
  if (initOptions.url && initOptions.account) {
    invisiblyAnalyticsEnabled = true;
    invisiblyAdapter.originEnableAnalytics(config);
  } else {
    invisiblyAnalyticsEnabled = false;
    invisiblyAdapter.originDisableAnalytics();
  }
  flushInterval = setInterval(flush, 1000);
};

invisiblyAdapter.originDisableAnalytics = invisiblyAdapter.disableAnalytics;
invisiblyAdapter.disableAnalytics = function() {
  if (!invisiblyAnalyticsEnabled) {
    return;
  }
  flush();
  clearInterval(flushInterval);
  invisiblyAdapter.originDisableAnalytics();
};

function flush() {
  if (!invisiblyAnalyticsEnabled) {
    return;
  }

  if (_eventQueue.length > 0) {
    while (_eventQueue.length) {
      let eventFromQue = _eventQueue.shift();
      let eventtype = 'PREBID_' + eventFromQue.eventType;
      delete eventFromQue.eventType;

      let data = {
        pageViewId: _pageViewId,
        ver: _VERSION,
        bundleId: initOptions.bundleId,
        ...eventFromQue
      };

      let payload = {
        event_type: eventtype,
        event_data: { ...data }
      };
      ajax(
        initOptions.url,
        () => utils.logInfo(`${analyticsName} sent events batch`),
        JSON.stringify(payload),
        {
          contentType: 'application/json',
          method: 'POST',
          withCredentials: true
        }
      );
    }
  }
}

function handleEvent(eventType, eventArgs) {
  eventArgs = eventArgs ? JSON.parse(JSON.stringify(eventArgs)) : {};
  let invisiblyEvent = {};

  switch (eventType) {
    case AUCTION_INIT: {
      invisiblyEvent = eventArgs;
      _startAuction = invisiblyEvent.timestamp;
      _bidRequestTimeout = invisiblyEvent.timeout;
      break;
    }
    case AUCTION_END: {
      invisiblyEvent = eventArgs;
      invisiblyEvent.start = _startAuction;
      invisiblyEvent.end = Date.now();
      break;
    }
    case BID_ADJUSTMENT: {
      invisiblyEvent.bidders = eventArgs;
      break;
    }
    case BID_TIMEOUT: {
      invisiblyEvent.bidders = eventArgs;
      invisiblyEvent.duration = _bidRequestTimeout;
      break;
    }
    case BID_REQUESTED: {
      invisiblyEvent = eventArgs;
      break;
    }
    case BID_RESPONSE: {
      invisiblyEvent = eventArgs;
      break;
    }
    case NO_BID: {
      invisiblyEvent.noBid = eventArgs;
      break;
    }
    case BID_WON: {
      invisiblyEvent = eventArgs;
      break;
    }
    case BIDDER_DONE: {
      invisiblyEvent = eventArgs;
      break;
    }
    case SET_TARGETING: {
      invisiblyEvent.targetings = eventArgs;
      break;
    }
    case REQUEST_BIDS: {
      invisiblyEvent = eventArgs;
      break;
    }
    case ADD_AD_UNITS: {
      invisiblyEvent = eventArgs;
      break;
    }
    case AD_RENDER_FAILED: {
      invisiblyEvent = eventArgs;
      break;
    }
    default:
      return;
  }
  invisiblyEvent.eventType = eventType;
  invisiblyEvent.timestamp = invisiblyEvent.timestamp || Date.now();
  sendEvent(invisiblyEvent);
}

function sendEvent(event) {
  _eventQueue.push(event);
  utils.logInfo(`${analyticsName}Event ${event.eventType}:`, event);

  if (event.eventType === AUCTION_END) {
    flush();
    clearInterval(flushInterval);
  }
}

adapterManager.registerAnalyticsAdapter({
  adapter: invisiblyAdapter,
  code: 'invisiblyAnalytics'
});

invisiblyAdapter.getOptions = function() {
  return initOptions;
};

invisiblyAdapter.flush = flush;

export default invisiblyAdapter;
