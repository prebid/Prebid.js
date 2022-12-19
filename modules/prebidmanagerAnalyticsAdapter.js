import { generateUUID, getParameterByName, logError, parseUrl, logInfo } from '../src/utils.js';
import {ajaxBuilder} from '../src/ajax.js';
import adapter from '../libraries/analyticsAdapter/AnalyticsAdapter.js';
import adapterManager from '../src/adapterManager.js';
import { getStorageManager } from '../src/storageManager.js';
import CONSTANTS from '../src/constants.json';

/**
 * prebidmanagerAnalyticsAdapter.js - analytics adapter for prebidmanager
 */
export const storage = getStorageManager({gvlid: undefined, moduleName: 'prebidmanager'});
const DEFAULT_EVENT_URL = 'https://endpoint.prebidmanager.com/endpoint';
const analyticsType = 'endpoint';
const analyticsName = 'Prebid Manager Analytics: ';

let ajax = ajaxBuilder(0);

var _VERSION = 1;
var initOptions = null;
var _pageViewId = generateUUID();
var _startAuction = 0;
var _bidRequestTimeout = 0;
let flushInterval;
var pmAnalyticsEnabled = false;
const utmTags = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];

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
  initOptions = config.options || {};
  initOptions.url = initOptions.url || DEFAULT_EVENT_URL;
  pmAnalyticsEnabled = true;
  prebidmanagerAnalytics.originEnableAnalytics(config);
  flushInterval = setInterval(flush, 1000);
};

prebidmanagerAnalytics.originDisableAnalytics = prebidmanagerAnalytics.disableAnalytics;
prebidmanagerAnalytics.disableAnalytics = function() {
  if (!pmAnalyticsEnabled) {
    return;
  }
  flush();
  clearInterval(flushInterval);
  prebidmanagerAnalytics.originDisableAnalytics();
};

function collectUtmTagData() {
  let newUtm = false;
  let pmUtmTags = {};
  try {
    utmTags.forEach(function (utmKey) {
      let utmValue = getParameterByName(utmKey);
      if (utmValue !== '') {
        newUtm = true;
      }
      pmUtmTags[utmKey] = utmValue;
    });
    if (newUtm === false) {
      utmTags.forEach(function (utmKey) {
        let itemValue = storage.getDataFromLocalStorage(`pm_${utmKey}`);
        if (itemValue && itemValue.length !== 0) {
          pmUtmTags[utmKey] = itemValue;
        }
      });
    } else {
      utmTags.forEach(function (utmKey) {
        storage.setDataInLocalStorage(`pm_${utmKey}`, pmUtmTags[utmKey]);
      });
    }
  } catch (e) {
    logError(`${analyticsName}Error`, e);
    pmUtmTags['error_utm'] = 1;
  }
  return pmUtmTags;
}

function collectPageInfo() {
  const pageInfo = {
    domain: window.location.hostname,
  }
  if (document.referrer) {
    pageInfo.referrerDomain = parseUrl(document.referrer).hostname;
  }
  return pageInfo;
}

function flush() {
  if (!pmAnalyticsEnabled) {
    return;
  }

  if (_eventQueue.length > 1) {
    var data = {
      pageViewId: _pageViewId,
      ver: _VERSION,
      bundleId: initOptions.bundleId,
      events: _eventQueue,
      utmTags: collectUtmTagData(),
      pageInfo: collectPageInfo(),
    };

    ajax(
      initOptions.url,
      () => logInfo(`${analyticsName} sent events batch`),
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
  logInfo(`${analyticsName}Event ${event.eventType}:`, event);

  if (event.eventType === CONSTANTS.EVENTS.AUCTION_END) {
    flush();
  }
}

adapterManager.registerAnalyticsAdapter({
  adapter: prebidmanagerAnalytics,
  code: 'prebidmanager'
});

prebidmanagerAnalytics.getOptions = function () {
  return initOptions;
};

prebidmanagerAnalytics.flush = flush;

export default prebidmanagerAnalytics;
