import {ajaxBuilder} from '../src/ajax';
import adapter from '../src/AnalyticsAdapter';
import adapterManager from '../src/adapterManager';

/**
 * prebidmanagerAnalyticsAdapter.js - analytics adapter for prebidmanager
 */
const DEFAULT_EVENT_URL = 'https://endpoint.prebidmanager.com/endpoint'
const analyticsType = 'endpoint';
const analyticsName = 'Prebid Manager Analytics: ';

var utils = require('src/utils');
var CONSTANTS = require('src/constants.json');
let ajax = ajaxBuilder(0);

function generateUUID() { // Public Domain/MIT
  var d = new Date().getTime();
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
    d += performance.now(); // use high-precision timer if available
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    var r = (d + Math.random() * 16) % 16 | 0;
    d = Math.floor(d / 16);
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

var _VERSION = 1;
var initOptions = null;
var _pageViewId = generateUUID();
var _startAuction = 0;
var _bidRequestTimeout = 0;
var pmAnalyticsEnabled = false;

var w = window;
var d = document;
var e = d.documentElement;
var g = d.getElementsByTagName('body')[0];
var x = w.innerWidth || e.clientWidth || g.clientWidth;
var y = w.innerHeight || e.clientHeight || g.clientHeight;

var _pageView = {
  eventType: 'pageView',
  userAgent: window.navigator.userAgent,
  timestamp: Date.now(),
  timezoneOffset: new Date().getTimezoneOffset(),
  language: window.navigator.language,
  vendor: window.navigator.vendor,
  screenWidth: x,
  screenHeight: y
};

var _eventQueue = [
  _pageView
];

let prebidmanagerAnalytics = Object.assign(adapter({url: DEFAULT_EVENT_URL, analyticsType}), {
  track({eventType, args}) {
    handleEvent(eventType, args);
  }
});

prebidmanagerAnalytics.originEnableAnalytics = prebidmanagerAnalytics.enableAnalytics;
prebidmanagerAnalytics.enableAnalytics = function (config) {
  initOptions = config.options;
  initOptions.url = initOptions.url || DEFAULT_EVENT_URL;
  pmAnalyticsEnabled = true;
  prebidmanagerAnalytics.originEnableAnalytics(config);
};

function flush() {
  if (!pmAnalyticsEnabled) {
    return;
  }

  if (_eventQueue.length > 1) {
    var data = {
      pageViewId: _pageViewId,
      bundleId: initOptions.bundleId,
      events: _eventQueue
    };

    ajax(
      initOptions.url,
      () => utils.logInfo(`${analyticsName} sent events batch`),
      _VERSION + ':' + JSON.stringify(data),
      {
        contentType: 'text/plain',
        method: 'POST',
        withCredentials: true
      }
    );
    _eventQueue = [
      _pageView
    ];
  }
}

function handleEvent(eventType, eventArgs) {
  eventArgs = eventArgs ? JSON.parse(JSON.stringify(eventArgs)) : {};
  var pmEvent = {};

  switch (eventType) {
    case CONSTANTS.EVENTS.AUCTION_INIT: {
      pmEvent = eventArgs;
      _startAuction = pmEvent.timestamp;
      _bidRequestTimeout = pmEvent.timeout;
      break;
    }
    case CONSTANTS.EVENTS.AUCTION_END: {
      pmEvent = eventArgs;
      pmEvent.start = _startAuction;
      pmEvent.end = Date.now();
      break;
    }
    case CONSTANTS.EVENTS.BID_ADJUSTMENT: {
      pmEvent.bidders = eventArgs;
      break;
    }
    case CONSTANTS.EVENTS.BID_TIMEOUT: {
      pmEvent.bidders = eventArgs;
      pmEvent.duration = _bidRequestTimeout;
      break;
    }
    case CONSTANTS.EVENTS.BID_REQUESTED: {
      pmEvent = eventArgs;
      break;
    }
    case CONSTANTS.EVENTS.BID_RESPONSE: {
      pmEvent = eventArgs;
      delete pmEvent.ad;
      break;
    }
    case CONSTANTS.EVENTS.BID_WON: {
      pmEvent = eventArgs;
      delete pmEvent.ad;
      delete pmEvent.adUrl;
      break;
    }
    case CONSTANTS.EVENTS.BIDDER_DONE: {
      pmEvent = eventArgs;
      break;
    }
    case CONSTANTS.EVENTS.SET_TARGETING: {
      pmEvent.targetings = eventArgs;
      break;
    }
    case CONSTANTS.EVENTS.REQUEST_BIDS: {
      pmEvent = eventArgs;
      break;
    }
    case CONSTANTS.EVENTS.ADD_AD_UNITS: {
      pmEvent = eventArgs;
      break;
    }
    case CONSTANTS.EVENTS.AD_RENDER_FAILED: {
      pmEvent = eventArgs;
      break;
    }
    default:
      return;
  }

  pmEvent.eventType = eventType;
  pmEvent.timestamp = pmEvent.timestamp || Date.now();

  sendEvent(pmEvent);
}

function sendEvent(event) {
  _eventQueue.push(event);
  utils.logInfo(`${analyticsName}Event ${event.eventType}:`, event);

  if (event.eventType === CONSTANTS.EVENTS.AUCTION_END) {
    flush();
  }
}

setInterval(flush, 1000);

adapterManager.registerAnalyticsAdapter({
  adapter: prebidmanagerAnalytics,
  code: 'prebidmanager'
});

prebidmanagerAnalytics.getOptions = function () {
  return initOptions;
};

prebidmanagerAnalytics.flush = flush;

export default prebidmanagerAnalytics;
