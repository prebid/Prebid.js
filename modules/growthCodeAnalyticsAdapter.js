/**
 * growthCodeAnalyticsAdapter.js - GrowthCode Analytics Adapter
 */
import { ajax } from '../src/ajax.js';
import adapter from '../libraries/analyticsAdapter/AnalyticsAdapter.js';
import adapterManager from '../src/adapterManager.js';
import * as utils from '../src/utils.js';
import { EVENTS } from '../src/constants.js';
import {getStorageManager} from '../src/storageManager.js';
import {getRefererInfo} from '../src/refererDetection.js';
import {logError, logInfo} from '../src/utils.js';
import {MODULE_TYPE_ANALYTICS} from '../src/activities/modules.js';

const MODULE_NAME = 'growthCodeAnalytics';
const DEFAULT_PID = 'INVALID_PID'
const ENDPOINT_URL = 'https://analytics.gcprivacy.com/v3/pb/analytics'

export const storage = getStorageManager({moduleType: MODULE_TYPE_ANALYTICS, moduleName: MODULE_NAME});

let sessionId = utils.generateUUID();

let trackEvents = [];
let pid = DEFAULT_PID;
let url = ENDPOINT_URL;

let eventQueue = [];

let startAuction = 0;
let bidRequestTimeout = 0;
let analyticsType = 'endpoint';

let growthCodeAnalyticsAdapter = Object.assign(adapter({url: url, analyticsType}), {
  track({eventType, args}) {
    let eventData = args ? JSON.parse(JSON.stringify(args)) : {};
    let data = {};
    if (!trackEvents.includes(eventType)) return;
    switch (eventType) {
      case EVENTS.AUCTION_INIT: {
        data = eventData;
        startAuction = data.timestamp;
        bidRequestTimeout = data.timeout;
        break;
      }

      case EVENTS.AUCTION_END: {
        data = eventData;
        data.start = startAuction;
        data.end = Date.now();
        break;
      }

      case EVENTS.BID_ADJUSTMENT: {
        data.bidders = eventData;
        break;
      }

      case EVENTS.BID_TIMEOUT: {
        data.bidders = eventData;
        data.duration = bidRequestTimeout;
        break;
      }

      case EVENTS.BID_REQUESTED: {
        data = eventData;
        break;
      }

      case EVENTS.BID_RESPONSE: {
        data = eventData;
        delete data.ad;
        break;
      }

      case EVENTS.BID_WON: {
        data = eventData;
        delete data.ad;
        delete data.adUrl;
        break;
      }

      case EVENTS.BIDDER_DONE: {
        data = eventData;
        break;
      }

      case EVENTS.SET_TARGETING: {
        data.targetings = eventData;
        break;
      }

      case EVENTS.REQUEST_BIDS: {
        data = eventData;
        break;
      }

      case EVENTS.ADD_AD_UNITS: {
        data = eventData;
        break;
      }

      case EVENTS.NO_BID: {
        data = eventData
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

growthCodeAnalyticsAdapter.originEnableAnalytics = growthCodeAnalyticsAdapter.enableAnalytics;

growthCodeAnalyticsAdapter.enableAnalytics = function(conf = {}) {
  if (typeof conf.options === 'object') {
    if (conf.options.pid) {
      pid = conf.options.pid;
      url = conf.options.url ? conf.options.url : ENDPOINT_URL;
    } else {
      logError(MODULE_NAME + ' Not a valid PartnerID')
      return
    }
    if (conf.options.trackEvents) {
      trackEvents = conf.options.trackEvents;
    }
  } else {
    logError(MODULE_NAME + ' Invalid configuration');
    return;
  }

  growthCodeAnalyticsAdapter.originEnableAnalytics(conf);
};

function logToServer() {
  if (pid === DEFAULT_PID) return;
  if (eventQueue.length >= 1) {
    // Get the correct GCID
    let gcid = localStorage.getItem('gcid')

    let data = {
      session: sessionId,
      pid: pid,
      gcid: gcid,
      timestamp: Date.now(),
      url: getRefererInfo().page,
      referer: document.referrer,
      events: eventQueue
    };

    ajax(url, {
      success: response => {
        logInfo(MODULE_NAME + ' Send Data to Server')
      },
      error: error => {
        logInfo(MODULE_NAME + ' Problem Send Data to Server: ' + error)
      }
    }, JSON.stringify(data), {method: 'POST', withCredentials: true})

    eventQueue = [
    ];
  }
}

function sendEvent(event) {
  eventQueue.push(event);
  logInfo(MODULE_NAME + 'Analytics Event: ' + event);

  if ((event.eventType === EVENTS.AUCTION_END) || (event.eventType === EVENTS.BID_WON)) {
    logToServer();
  }
}

adapterManager.registerAnalyticsAdapter({
  adapter: growthCodeAnalyticsAdapter,
  code: 'growthCodeAnalytics'
});

growthCodeAnalyticsAdapter.logToServer = logToServer;

export default growthCodeAnalyticsAdapter;
