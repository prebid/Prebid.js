import adapter from '../libraries/analyticsAdapter/AnalyticsAdapter.js';
import adapterManager from '../src/adapterManager.js';
import { EVENTS } from '../src/constants.js';
import { ajax } from '../src/ajax.js';
import { logError } from '../src/utils.js';

/**
 * goadserver Analytics Adapter
 *
 * Collects Prebid.js bid events and POSTs them in batches to the
 * goadserver `/openrtb2/analytics` ingestion endpoint. Publishers
 * running goadserver deployments get bid-level telemetry (auction
 * lifetime, win rates, timeouts, CPMs) in the same system that
 * handles auctions + cookie sync + Prebid Cache.
 *
 * Configuration:
 *
 *   pbjs.enableAnalytics({
 *     provider: 'goadserver',
 *     options: {
 *       host: 'ads.example.com',  // required — your goadserver domain
 *       token: 'your-sspcampaigns-hash',  // optional — publisher id for attribution
 *       flushInterval: 5000  // optional, ms (default 5000)
 *     }
 *   });
 *
 * Events captured:
 *   AUCTION_INIT, BID_REQUESTED, BID_RESPONSE, BID_WON,
 *   BID_TIMEOUT, AUCTION_END
 *
 * Flush triggers:
 *   - Periodic interval (default 5s)
 *   - AUCTION_END (immediate flush of the batched events for that auction)
 *   - Page unload (best-effort via navigator.sendBeacon when available)
 */

const MODULE_CODE = 'goadserver';
const DEFAULT_FLUSH_INTERVAL = 5000;

let host = '';
let token = '';
let flushIntervalMs = DEFAULT_FLUSH_INTERVAL;
let queue = [];
let flushTimer = null;

function endpointURL() {
  return 'https://' + host + '/openrtb2/analytics';
}

function pushEvent(eventType, args) {
  const ev = {
    eventType,
    timestamp: Date.now(),
  };
  if (!args) {
    queue.push(ev);
    return;
  }
  // Normalize the most commonly-reported fields across event types.
  if (args.auctionId) ev.auctionId = args.auctionId;
  if (args.adUnitCode) ev.adUnitCode = args.adUnitCode;
  if (args.bidder) ev.bidder = args.bidder;
  if (args.bidderCode) ev.bidder = args.bidderCode;
  if (args.bidId) ev.bidId = args.bidId;
  if (args.cpm != null) ev.cpm = args.cpm;
  if (args.currency) ev.currency = args.currency;
  if (args.mediaType) ev.mediaType = args.mediaType;
  if (args.creativeId) ev.creativeId = args.creativeId;
  if (args.size) ev.size = args.size;
  if (args.timeToRespond != null) ev.timeToRespond = args.timeToRespond;
  if (args.status) ev.status = args.status;
  queue.push(ev);
}

function flush(sync) {
  if (queue.length === 0) return;
  if (!host) return;

  const batch = {
    token: token,
    host: (typeof window !== 'undefined' && window.location) ? window.location.hostname : '',
    events: queue.splice(0, queue.length),
  };
  const body = JSON.stringify(batch);
  const url = endpointURL();

  // Sync flush on page unload via sendBeacon when available — more
  // reliable than ajax() which the browser may cancel.
  if (sync && typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
    try {
      const blob = new Blob([body], { type: 'application/json' });
      navigator.sendBeacon(url, blob);
      return;
    } catch (e) {
      // Fall through to ajax.
    }
  }

  try {
    ajax(url, null, body, {
      contentType: 'application/json',
      method: 'POST',
      withCredentials: true,
    });
  } catch (e) {
    logError('[goadserver-analytics] flush failed', e);
  }
}

function scheduleFlush() {
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    flush(false);
  }, flushIntervalMs);
}

const goadserverAnalytics = Object.assign(adapter({ analyticsType: 'endpoint' }), {
  track({ eventType, args }) {
    switch (eventType) {
      case EVENTS.AUCTION_INIT:
      case EVENTS.BID_REQUESTED:
      case EVENTS.BID_RESPONSE:
      case EVENTS.BID_TIMEOUT:
      case EVENTS.BID_WON:
        pushEvent(eventType, args);
        scheduleFlush();
        break;
      case EVENTS.AUCTION_END:
        pushEvent(eventType, args);
        flush(false);
        break;
    }
  },
});

// Patch the base adapter's enableAnalytics to capture our options
// before the default behavior kicks in. Publishers call this via
// pbjs.enableAnalytics({provider: 'goadserver', options: {...}}).
const origEnable = goadserverAnalytics.enableAnalytics;
goadserverAnalytics.enableAnalytics = function (config) {
  if (config && config.options) {
    host = config.options.host || '';
    token = config.options.token || '';
    if (typeof config.options.flushInterval === 'number' && config.options.flushInterval > 0) {
      flushIntervalMs = config.options.flushInterval;
    }
  }
  if (!host) {
    logError('[goadserver-analytics] missing required option: host');
    return;
  }
  // Best-effort final flush on page unload.
  if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
    window.addEventListener('pagehide', () => flush(true));
    window.addEventListener('beforeunload', () => flush(true));
  }
  origEnable.apply(this, arguments);
};

adapterManager.registerAnalyticsAdapter({
  adapter: goadserverAnalytics,
  code: MODULE_CODE,
});

export default goadserverAnalytics;
