/**
 * growthCodeAnalyticsAdapter.js - GrowthCode Analytics Adapter
 */
import { ajax } from '../src/ajax.js';
import adapter from '../libraries/analyticsAdapter/AnalyticsAdapter.js';
import adapterManager from '../src/adapterManager.js';
import * as utils from '../src/utils.js';
import { EVENTS } from '../src/constants.js';
import { getStorageManager } from '../src/storageManager.js';
import { getRefererInfo } from '../src/refererDetection.js';
import { logError, logInfo } from '../src/utils.js';
import { MODULE_TYPE_ANALYTICS } from '../src/activities/modules.js';

const MODULE_NAME = 'growthCodeAnalytics';
const DEFAULT_PID = 'INVALID_PID';
const ENDPOINT_URL = 'https://ids.api.gcprivacy.id/v4/analytics';
const ANALYTICS_SOURCE = 'prebid_module';

export const storage = getStorageManager({ moduleType: MODULE_TYPE_ANALYTICS, moduleName: MODULE_NAME });

const fallbackSessionId = utils.generateUUID();

// The GrowthCode pixel (gcid_s.js) already establishes a session id in a
// `gc_session_id` cookie and uses it server-side to make the A/B test bucket
// decision (see ABTestingSessionFeature in gc_pixel). Read that same cookie
// here so Prebid-reported events use the same session id as the sync pixel,
// instead of minting an unrelated UUID that never matches. Fall back to a
// generated UUID if the cookie isn't present (e.g. pixel not yet loaded).
function getGCSessionId() {
  return storage.getCookie('gc_session_id') || fallbackSessionId;
}

let trackEvents = [];
let pid = DEFAULT_PID;
let url = ENDPOINT_URL;

let eventQueue = [];
let bidWonQueue = [];

let startAuction = 0;
let bidRequestTimeout = 0;
const analyticsType = 'endpoint';

const growthCodeAnalyticsAdapter = Object.assign(adapter({ url: url, analyticsType }), {
  track({ eventType, args }) {
    const eventData = args ? utils.deepClone(args) : {};
    let data = {};

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
        queueBidWon(args ? { ...args } : {});
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

      case EVENTS.NO_BID: {
        data = eventData;
        break;
      }

      default:
        return;
    }

    if (!trackEvents.includes(eventType)) return;

    data.eventType = eventType;
    data.timestamp = data.timestamp || Date.now();

    sendEvent(data);
  }
});

growthCodeAnalyticsAdapter.originEnableAnalytics = growthCodeAnalyticsAdapter.enableAnalytics;

growthCodeAnalyticsAdapter.enableAnalytics = function(conf = {}) {
  trackEvents = [];
  if (typeof conf.options === 'object') {
    if (conf.options.pid) {
      pid = conf.options.pid;
      url = conf.options.url ? conf.options.url : ENDPOINT_URL;
    } else {
      logError(MODULE_NAME + ' Not a valid PartnerID');
      return;
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

// normalizeBatchEvent maps a queued Prebid event to the snake_case wire shape
// the /v4/analytics server expects. The batch queue holds Prebid's raw event
// objects, whose keys are camelCase (auctionId, adUnitCode, bidderCode, ...);
// the server reads snake_case (auction_id, ad_unit_code, bidder, ...), so
// forwarding the raw object dropped these fields. Mirrors the field mapping the
// enriched sender (logBidWonToServer) already uses, so both senders agree.
function normalizeBatchEvent(e) {
  return {
    event: e.eventType || e.event || '',
    timestamp: e.timestamp,
    bidder: e.bidderCode || e.bidder || '',
    currency: e.currency || '',
    cpm: e.cpm || 0,
    auction_id: e.auctionId || '',
    ad_unit_code: e.adUnitCode || '',
    ad_id: e.adId || '',
    advertiser_domains: (e.meta && Array.isArray(e.meta.advertiserDomains)) ? e.meta.advertiserDomains : [],
    elm_test_name: e.elmTestName || ''
  };
}

function logToServer() {
  if (pid === DEFAULT_PID) return;
  if (eventQueue.length >= 1) {
    const gcid = storage.getDataFromLocalStorage('gcid');

    const data = {
      gc_session_id: getGCSessionId(),
      pid: pid,
      gcid: gcid,
      timestamp: Date.now(),
      url: getRefererInfo().page,
      referer: document.referrer,
      events: eventQueue.map(normalizeBatchEvent)
    };

    ajax(url, {
      success: response => {
        logInfo(MODULE_NAME + ' Send Data to Server');
      },
      error: error => {
        logInfo(MODULE_NAME + ' Problem Send Data to Server: ' + error);
      }
    }, JSON.stringify(data), { method: 'POST', withCredentials: true });

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

function queueBidWon(bid) {
  const eids = (bid.userIdAsEids || []).map(e => e.source);
  const advertiserDomains = (bid.meta && Array.isArray(bid.meta.advertiserDomains))
    ? bid.meta.advertiserDomains : [];

  bidWonQueue.push({
    _eids: eids,
    timestamp: bid.responseTimestamp || Date.now(),
    event: 'winningBid',
    bidder: bid.bidderCode || '',
    currency: bid.currency || '',
    cpm: bid.cpm || 0,
    auction_id: bid.auctionId || '',
    ad_unit_code: bid.adUnitCode || '',
    ad_id: bid.adId || '',
    advertiser_domains: advertiserDomains
  });

  logBidWonToServer();
}

function logBidWonToServer() {
  if (pid === DEFAULT_PID || bidWonQueue.length === 0) return;

  const gcid = storage.getDataFromLocalStorage('gcid') || '';
  if (!gcid) return;

  const allEids = [...new Set(bidWonQueue.flatMap(e => e._eids))];
  const events = bidWonQueue.map(({ _eids, ...entry }) => entry);

  const payload = {
    // gc_bucket/gc_test are written by the sync pixel from the server's A/B
    // test decision (see ABTestingSessionFeature in gc_pixel). gcABbucket is
    // the legacy key kept as a fallback for pixel versions that predate it.
    bucket_id: storage.getDataFromLocalStorage('gc_bucket') || storage.getDataFromLocalStorage('gcABbucket') || '',
    gctest: storage.getDataFromLocalStorage('gc_test') === 'true',
    ssp_count: allEids.length,
    live_intent: allEids.includes('liveintent.com'),
    pbjs_name: 'pbjs',
    gc_session_id: getGCSessionId(),
    gc_event_id: utils.generateUUID(),
    have_hem: !!(storage.getDataFromLocalStorage('gc_h1') && storage.getDataFromLocalStorage('gc_h3')),
    hem_source: storage.getDataFromLocalStorage('gc_hs') || '',
    eids: allEids,
    analytics_source: ANALYTICS_SOURCE,
    events
  };

  const requestUrl = url +
    '?gcid=' + encodeURIComponent(gcid) +
    '&pid=' + encodeURIComponent(pid) +
    '&u=' + encodeURIComponent(getRefererInfo().page || '');

  ajax(requestUrl, {
    success: () => logInfo(MODULE_NAME + ': analytics sent'),
    error: (err) => logInfo(MODULE_NAME + ': analytics error: ' + err)
  }, JSON.stringify(payload), { method: 'POST', withCredentials: true });

  bidWonQueue = [];
}

adapterManager.registerAnalyticsAdapter({
  adapter: growthCodeAnalyticsAdapter,
  code: 'growthCodeAnalytics'
});

growthCodeAnalyticsAdapter.logToServer = logToServer;

export default growthCodeAnalyticsAdapter;
