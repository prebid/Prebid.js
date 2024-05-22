import { ajax } from '../src/ajax.js';
import adapter from '../libraries/analyticsAdapter/AnalyticsAdapter.js';
import adapterManager from '../src/adapterManager.js';
import * as utils from '../src/utils.js';
import { EVENTS } from '../src/constants.js';
import {getStorageManager} from '../src/storageManager.js';
import {getRefererInfo} from '../src/refererDetection.js';
import {MODULE_TYPE_ANALYTICS} from '../src/activities/modules.js';

/**
 * hadronAnalyticsAdapter.js - Audigent Hadron Analytics Adapter
 */

const HADRON_ANALYTICS_URL = 'https://analytics.hadron.ad.gt/api/v1/analytics';
const HADRONID_ANALYTICS_VER = 'pbadgt0';
const DEFAULT_PARTNER_ID = 0;
const AU_GVLID = 561;
const MODULE_CODE = 'hadronAnalytics';

export const storage = getStorageManager({moduleType: MODULE_TYPE_ANALYTICS, moduleName: MODULE_CODE});

var viewId = utils.generateUUID();

var partnerId = DEFAULT_PARTNER_ID;
var eventsToTrack = [];

var w = window;
var d = document;
var e = d.documentElement;
var g = d.getElementsByTagName('body')[0];
var x = w.innerWidth || e.clientWidth || g.clientWidth;
var y = w.innerHeight || e.clientHeight || g.clientHeight;

var pageView = {
  eventType: 'pageView',
  userAgent: window.navigator.userAgent,
  timestamp: Date.now(),
  timezoneOffset: new Date().getTimezoneOffset(),
  language: window.navigator.language,
  vendor: window.navigator.vendor,
  pageUrl: getRefererInfo().page,
  screenWidth: x,
  screenHeight: y
};

var eventQueue = [
  pageView
];

var startAuction = 0;
var bidRequestTimeout = 0;
let analyticsType = 'endpoint';

let hadronAnalyticsAdapter = Object.assign(adapter({url: HADRON_ANALYTICS_URL, analyticsType}), {
  track({eventType, args}) {
    args = args ? JSON.parse(JSON.stringify(args)) : {};
    var data = {};
    if (!eventsToTrack.includes(eventType)) return;
    switch (eventType) {
      case EVENTS.AUCTION_INIT: {
        data = args;
        startAuction = data.timestamp;
        bidRequestTimeout = data.timeout;
        break;
      }

      case EVENTS.AUCTION_END: {
        data = args;
        data.start = startAuction;
        data.end = Date.now();
        break;
      }

      case EVENTS.BID_ADJUSTMENT: {
        data.bidders = args;
        break;
      }

      case EVENTS.BID_TIMEOUT: {
        data.bidders = args;
        data.duration = bidRequestTimeout;
        break;
      }

      case EVENTS.BID_REQUESTED: {
        data = args;
        break;
      }

      case EVENTS.BID_RESPONSE: {
        data = args;
        delete data.ad;
        break;
      }

      case EVENTS.BID_WON: {
        data = args;
        delete data.ad;
        delete data.adUrl;
        break;
      }

      case EVENTS.BIDDER_DONE: {
        data = args;
        break;
      }

      case EVENTS.SET_TARGETING: {
        data.targetings = args;
        break;
      }

      case EVENTS.REQUEST_BIDS: {
        data = args;
        break;
      }

      case EVENTS.ADD_AD_UNITS: {
        data = args;
        break;
      }

      case EVENTS.AD_RENDER_FAILED: {
        data = args;
        break;
      }

      default:
        return;
    }

    data.eventType = eventType;
    data.timestamp = data.timestamp || Date.now();

    sendEvent(data);
  }
});

hadronAnalyticsAdapter.originEnableAnalytics = hadronAnalyticsAdapter.enableAnalytics;

hadronAnalyticsAdapter.enableAnalytics = function(conf = {}) {
  if (typeof conf.options === 'object') {
    if (conf.options.partnerId) {
      partnerId = conf.options.partnerId;
    } else {
      partnerId = DEFAULT_PARTNER_ID;
    }
    if (conf.options.eventsToTrack) {
      eventsToTrack = conf.options.eventsToTrack;
    }
  } else {
    utils.logError('HADRON_ANALYTICS_NO_CONFIG_ERROR');
    return;
  }

  hadronAnalyticsAdapter.originEnableAnalytics(conf);
};

function flush() {
  // Don't send anything if no partner id was declared
  if (partnerId === DEFAULT_PARTNER_ID) return;
  if (eventQueue.length > 1) {
    var data = {
      pageViewId: viewId,
      ver: HADRONID_ANALYTICS_VER,
      partnerId: partnerId,
      events: eventQueue
    };

    ajax(HADRON_ANALYTICS_URL,
      () => utils.logInfo('HADRON_ANALYTICS_BATCH_SEND'),
      JSON.stringify(data),
      {
        contentType: 'application/json',
        method: 'POST'
      }
    );

    eventQueue = [
      pageView
    ];
  }
}

function sendEvent(event) {
  eventQueue.push(event);
  utils.logInfo(`HADRON_ANALYTICS_EVENT ${event.eventType} `, event);

  if (event.eventType === EVENTS.AUCTION_END) {
    flush();
  }
}

adapterManager.registerAnalyticsAdapter({
  adapter: hadronAnalyticsAdapter,
  code: MODULE_CODE,
  gvlid: AU_GVLID
});

hadronAnalyticsAdapter.flush = flush;

export default hadronAnalyticsAdapter;
