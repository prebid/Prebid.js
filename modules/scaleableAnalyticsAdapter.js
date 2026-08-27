/**
 * Prebid.js analytics adapter for Scaleable (https://scaleable.ai). One batched
 * POST per auction, sent a short delay after AUCTION_END so late BID_WON and
 * render events are included; flushes in-flight auctions via sendBeacon on unload.
 */

import { deepAccess, logError, logInfo, logWarn, deepClone } from '../src/utils.js';
import buildAdapter from '../libraries/analyticsAdapter/AnalyticsAdapter.js';
import adapterManager, {
  coppaDataHandler,
  gdprDataHandler,
  gppDataHandler,
  uspDataHandler
} from '../src/adapterManager.js';
import { EVENTS } from '../src/constants.js';
import { ajax, sendBeacon } from '../src/ajax.js';
import { getRefererInfo } from '../src/refererDetection.js';

const ANALYTICS_VERSION = '3.0.0';
const PROVIDER_NAME = 'scaleable';
export const DEFAULT_ENDPOINT = 'https://ingest.scaleable.ai/api/ingest/auction';
// Wait after AUCTION_END so GAM's slotRenderEnded and late BID_WON events land.
export const DEFAULT_AUCTION_END_DELAY = 1500;

export const log = getLogger();

/** @typedef {'banner'|'video'|'native'} MediaType */

/**
 * @typedef {Object} FloorData
 * @property {number} [floorValue]
 * @property {string} [floorRule]
 * @property {string} [floorRuleValue]
 * @property {string} [floorCurrency]
 * @property {string} [fetchStatus]
 * @property {string} [floorProvider]
 * @property {string} [location]
 * @property {string} [modelVersion]
 * @property {number} [modelWeight]
 * @property {boolean} [skipped]
 * @property {number} [skipRate]
 * @property {number} [floorMin]
 * @property {number} [cpmAfterAdjustments]
 */

/**
 * @typedef {Object} BidMeta
 * @property {string[]} [advertiserDomains]
 * @property {number|string} [networkId]
 * @property {string} [networkName]
 * @property {number|string} [advertiserId]
 * @property {string} [advertiserName]
 * @property {number|string} [brandId]
 * @property {string} [brandName]
 * @property {number} [primaryCatId]
 * @property {number[]} [secondaryCatIds]
 * @property {string} [mediaType]
 */

/**
 * @typedef {Object} RenderOutcome
 * @property {'success'|'failed'} [status]
 * @property {string} [reason]
 * @property {string} [message]
 * @property {number|string} [lineItemId]
 * @property {number|string} [advertiserId]
 * @property {number|string} [creativeId]
 * @property {number|string} [sourceAgnosticCreativeId]
 * @property {number|string} [sourceAgnosticLineItemId]
 * @property {boolean} [isEmpty]
 * @property {string} [renderedSize]
 * @property {string} [slotElementId]
 * @property {boolean} [viewable]
 */

/**
 * @typedef {Object} GamRenderInfo
 * @property {number|string} [lineItemId]
 * @property {number|string} [advertiserId]
 * @property {number|string} [creativeId]
 * @property {number|string} [sourceAgnosticCreativeId]
 * @property {number|string} [sourceAgnosticLineItemId]
 * @property {boolean} [isEmpty]
 * @property {string} [renderedSize]
 * @property {string} [slotElementId]
 * @property {boolean} [viewable]
 */

/**
 * @typedef {Object} BidRecord
 * @property {string} bidder
 * @property {string} requestId
 * @property {string} [adUnitCode]
 * @property {'client'|'server'} source
 * @property {'pending'|'received'|'noBid'|'timeout'|'rejected'|'won'|'lost'} status
 * @property {string} [rejectionReason] - From BID_REJECTED (e.g. below floor)
 * @property {boolean} [isSeatNonBid] - Synthesized from PBS ext.seatnonbid; no client-side BID_RESPONSE exists
 * @property {number} [seatNonBidStatus] - Raw OpenRTB nonbid status code reported by Prebid Server
 * @property {number} [cpm]
 * @property {string} [currency]
 * @property {number} [originalCpm]
 * @property {string} [originalCurrency]
 * @property {number} [timeToRespond] - Total client-side latency, ms
 * @property {number} [networkLatencyMs] - ajax round-trip portion only, ms
 * @property {string} [size] - e.g. "300x250"
 * @property {number} [width]
 * @property {number} [height]
 * @property {MediaType} [mediaType]
 * @property {boolean} [netRevenue]
 * @property {Object} [params]
 * @property {Object<string,string>} [adserverTargeting] - winning bid only
 * @property {string} [adId]
 * @property {string} [creativeId]
 * @property {string} [dealId]
 * @property {FloorData} [floorData]
 * @property {BidMeta} [meta]
 * @property {string[]} [eidsPresent] - source names only, never the IDs
 * @property {string} [vastUrl]
 * @property {Object} [native]
 * @property {RenderOutcome} [render]
 */

/**
 * @typedef {Object} AdUnitRecord
 * @property {string} code
 * @property {string} [gpid]
 * @property {string[]} mediaTypes
 * @property {string[]} sizes - Array of "WxH" strings
 * @property {BidRecord[]} bids
 * @property {GamRenderInfo} [gamRender] - GAM rendered the slot but no Prebid bid won
 */

/**
 * @typedef {Object} ConsentMetadata
 * @property {boolean} [gdprApplies]
 * @property {string} [tcfConsentString]
 * @property {string} [gppString]
 * @property {number[]} [gppSid]
 * @property {string} [usPrivacy]
 */

/**
 * @typedef {Object} AuctionMetadata
 * @property {string} url
 * @property {string} referrer
 * @property {string} userAgent
 * @property {string} language
 * @property {{w:number,h:number}} screen
 * @property {Object<string,string>} [utm]
 * @property {string} prebidVersion
 * @property {number} timestamp
 * @property {ConsentMetadata} consent
 * @property {Object} [siteContext] - verbatim ortb2.site.ext.data
 */

/**
 * @typedef {Object} AuctionRecord
 * @property {string} auctionId
 * @property {string} siteId
 * @property {string} analyticsVersion
 * @property {string} pbjsVersion
 * @property {number} startTime
 * @property {number} [endTime]
 * @property {number} [duration]
 * @property {number} [timeout]
 * @property {boolean} [timeoutReached]
 * @property {AuctionMetadata} metadata
 * @property {AdUnitRecord[]} adUnits
 * @property {Array<{bidder: string, error: string}>} [bidderErrors] - one per BIDDER_ERROR, auction-level
 * @property {boolean} [truncated] - emitted on unload before AUCTION_END finalized; partial state
 */

/**
 * @typedef {Object} AnalyticsConfig
 * @property {string} provider - 'scaleable'
 * @property {Object} options
 * @property {string} options.siteId - Required
 * @property {string} [options.endpoint=DEFAULT_ENDPOINT]
 * @property {number} [options.auctionEndDelay=DEFAULT_AUCTION_END_DELAY]
 * @property {number} [options.sampling] - 0..1; passed through to the base class
 */

/** Module-local state. Exported for spec resets. */
export const locals = {
  /** @type {Object<string, AuctionRecord>} */
  auctions: {},
  /** @type {Object<string, ReturnType<typeof setTimeout>>} */
  flushTimers: {},
  /** @type {string} */
  endpoint: DEFAULT_ENDPOINT,
  /** @type {string|null} */
  siteId: null,
  /** @type {number} */
  auctionEndDelay: DEFAULT_AUCTION_END_DELAY,
  /** @type {((event: Event) => void) | null} */
  unloadHandler: null,
  /** @type {{slotRenderEnded?: Function, impressionViewable?: Function}} */
  gamHandlers: {},
  reset() {
    Object.keys(this.flushTimers).forEach(id => clearTimeout(this.flushTimers[id]));
    this.auctions = {};
    this.flushTimers = {};
    this.endpoint = DEFAULT_ENDPOINT;
    this.siteId = null;
    this.auctionEndDelay = DEFAULT_AUCTION_END_DELAY;
    this.unloadHandler = null;
    this.gamHandlers = {};
  }
};

const analyticsAdapter = Object.assign(
  buildAdapter({ analyticsType: 'endpoint' }),
  { track: analyticEventHandler }
);

analyticsAdapter.originEnableAnalytics = analyticsAdapter.enableAnalytics;
analyticsAdapter.enableAnalytics = enableAnalyticsWrapper;
analyticsAdapter.originDisableAnalytics = analyticsAdapter.disableAnalytics;
analyticsAdapter.disableAnalytics = disableAnalyticsWrapper;

/**
 * @param {AnalyticsConfig} config
 */
function enableAnalyticsWrapper(config) {
  const options = (config && config.options) || {};

  if (!options.siteId || typeof options.siteId !== 'string') {
    log.error('No siteId provided for "options.siteId". No analytics will be sent.');
    return;
  }

  locals.siteId = options.siteId;
  locals.endpoint = typeof options.endpoint === 'string' && /^https?:\/\//.test(options.endpoint)
    ? options.endpoint
    : DEFAULT_ENDPOINT;
  locals.auctionEndDelay = (typeof options.auctionEndDelay === 'number' && options.auctionEndDelay >= 0)
    ? options.auctionEndDelay
    : DEFAULT_AUCTION_END_DELAY;

  locals.unloadHandler = (/** @type {Event} */ ev) => {
    if (ev.type === 'visibilitychange' && document.visibilityState !== 'hidden') return;
    flushAllAuctions();
  };
  if (typeof window !== 'undefined' && window.addEventListener) {
    window.addEventListener('pagehide', locals.unloadHandler);
    document.addEventListener('visibilitychange', locals.unloadHandler);
  }

  subscribeToGamSlotEvents();

  analyticsAdapter.originEnableAnalytics(config);
}

function disableAnalyticsWrapper() {
  if (locals.unloadHandler && typeof window !== 'undefined' && window.removeEventListener) {
    window.removeEventListener('pagehide', locals.unloadHandler);
    document.removeEventListener('visibilitychange', locals.unloadHandler);
  }
  unsubscribeFromGamSlotEvents();
  locals.reset();
  analyticsAdapter.originDisableAnalytics();
  // Reinstate our wrapper so later enable calls still run config validation.
  analyticsAdapter.enableAnalytics = enableAnalyticsWrapper;
}

// GAM (googletag) slot tracking: enrich the winning bid with line item /
// advertiser / creative IDs and a viewability flag.
function subscribeToGamSlotEvents() {
  if (typeof window === 'undefined') return;
  window.googletag = window.googletag || { cmd: [] };
  window.googletag.cmd.push(function () {
    try {
      const pubads = window.googletag.pubads();
      locals.gamHandlers.slotRenderEnded = onGamSlotRenderEnded;
      locals.gamHandlers.impressionViewable = onGamImpressionViewable;
      pubads.addEventListener('slotRenderEnded', locals.gamHandlers.slotRenderEnded);
      pubads.addEventListener('impressionViewable', locals.gamHandlers.impressionViewable);
    } catch (e) {
      log.warn('Failed to subscribe to GAM slot events', e);
    }
  });
}

function unsubscribeFromGamSlotEvents() {
  if (typeof window === 'undefined' || !window.googletag || !window.googletag.cmd) return;
  const handlers = locals.gamHandlers || {};
  window.googletag.cmd.push(function () {
    try {
      const pubads = window.googletag.pubads();
      if (handlers.slotRenderEnded) pubads.removeEventListener('slotRenderEnded', handlers.slotRenderEnded);
      if (handlers.impressionViewable) pubads.removeEventListener('impressionViewable', handlers.impressionViewable);
    } catch (_) { /* googletag not loaded; nothing to do */ }
  });
}

/**
 * Resolve a rendered GAM slot to one of our active auctions, falling back to the
 * slot element id when the ad-unit-path lookup misses.
 * @param {{slot: {getAdUnitPath: () => string, getSlotElementId: () => string}}} event
 * @returns {{auctionId: string, adUnit: AdUnitRecord} | null}
 */
function matchGamSlotToAuction(event) {
  if (!event || !event.slot) return null;
  const adUnitPath = event.slot.getAdUnitPath();
  const elementId = event.slot.getSlotElementId();
  // Walk most-recent first; render events belong to the auction that just ended.
  const ids = Object.keys(locals.auctions);
  for (let i = ids.length - 1; i >= 0; i--) {
    const auction = locals.auctions[ids[i]];
    const adUnit = auction.adUnits.find(au => au.code === adUnitPath || au.code === elementId);
    if (adUnit) return { auctionId: ids[i], adUnit };
  }
  return null;
}

function buildGamRenderPayload(event) {
  const size = event.size;
  const out = {
    isEmpty: Boolean(event.isEmpty),
    slotElementId: event.slot.getSlotElementId()
  };
  // GAM nulls these when isEmpty; skip rather than ship explicit nulls.
  if (event.lineItemId != null) out.lineItemId = event.lineItemId;
  if (event.advertiserId != null) out.advertiserId = event.advertiserId;
  if (event.creativeId != null) out.creativeId = event.creativeId;
  if (event.sourceAgnosticCreativeId != null) out.sourceAgnosticCreativeId = event.sourceAgnosticCreativeId;
  if (event.sourceAgnosticLineItemId != null) out.sourceAgnosticLineItemId = event.sourceAgnosticLineItemId;
  if (Array.isArray(size) && size.length === 2) out.renderedSize = `${size[0]}x${size[1]}`;
  return out;
}

function onGamSlotRenderEnded(event) {
  const match = matchGamSlotToAuction(event);
  if (!match) return;
  const renderInfo = buildGamRenderPayload(event);
  const wonBid = match.adUnit.bids.find(b => b.status === 'won');
  if (wonBid) {
    wonBid.render = Object.assign({}, wonBid.render, renderInfo);
  } else {
    // No Prebid winner — GAM rendered a house ad / direct-sold creative (or nothing).
    match.adUnit.gamRender = Object.assign({}, match.adUnit.gamRender, renderInfo);
  }
}

function onGamImpressionViewable(event) {
  const match = matchGamSlotToAuction(event);
  if (!match) return;
  const wonBid = match.adUnit.bids.find(b => b.status === 'won');
  if (wonBid) {
    wonBid.render = wonBid.render || {};
    wonBid.render.viewable = true;
  } else {
    match.adUnit.gamRender = match.adUnit.gamRender || {};
    match.adUnit.gamRender.viewable = true;
  }
}

/**
 * @param {{eventType: string, args: any}} payload
 */
function analyticEventHandler({ eventType, args }) {
  if (!locals.siteId) return;

  switch (eventType) {
    case EVENTS.AUCTION_INIT:
      onAuctionInit(args);
      break;
    case EVENTS.BID_REQUESTED:
      onBidRequested(args);
      break;
    case EVENTS.BID_RESPONSE:
      onBidResponse(args);
      break;
    case EVENTS.BID_REJECTED:
      onBidRejected(args);
      break;
    case EVENTS.BIDDER_DONE:
      onBidderDone(args);
      break;
    case EVENTS.NO_BID:
      onNoBid(args);
      break;
    case EVENTS.BIDDER_ERROR:
      onBidderError(args);
      break;
    case EVENTS.BID_TIMEOUT:
      onBidTimeout(args);
      break;
    case EVENTS.BID_WON:
      onBidWon(args);
      break;
    case EVENTS.BID_VIEWABLE:
      onBidViewable(args);
      break;
    case EVENTS.AUCTION_END:
      onAuctionEnd(args);
      break;
    case EVENTS.AD_RENDER_SUCCEEDED:
      onAdRenderSucceeded(args);
      break;
    case EVENTS.AD_RENDER_FAILED:
      onAdRenderFailed(args);
      break;
    default:
      break;
  }
}

/**
 * @param {{auctionId: string, adUnits: Array<Object>, timestamp?: number, auctionStart?: number, timeout?: number, bidderRequests?: Array<Object>}} args
 */
function onAuctionInit(args) {
  if (!args || typeof args.auctionId !== 'string' || !Array.isArray(args.adUnits)) {
    log.warn('AUCTION_INIT missing fields; skipping');
    return;
  }

  const startTime = args.timestamp || args.auctionStart || Date.now();
  const metadata = buildMetadata(startTime);
  const siteContext = deepAccess(args, 'bidderRequests.0.ortb2.site.ext.data');
  if (siteContext && typeof siteContext === 'object') {
    metadata.siteContext = siteContext;
  }

  locals.auctions[args.auctionId] = {
    auctionId: args.auctionId,
    siteId: locals.siteId,
    analyticsVersion: ANALYTICS_VERSION,
    pbjsVersion: '$prebid.version$',
    startTime,
    timeout: typeof args.timeout === 'number' ? args.timeout : undefined,
    metadata,
    adUnits: args.adUnits.map(au => ({
      code: au.code,
      gpid: deepAccess(au, 'ortb2Imp.ext.gpid'),
      mediaTypes: Object.keys(au.mediaTypes || {}),
      sizes: (au.sizes || []).map(s => Array.isArray(s) ? s.join('x') : String(s)),
      bids: []
    }))
  };
}

/**
 * @param {{auctionId: string, bids: Array<Object>}} args
 */
function onBidRequested(args) {
  const auction = locals.auctions[args.auctionId];
  if (!auction) return;
  for (const b of (args.bids || [])) {
    const adUnit = auction.adUnits.find(au => au.code === b.adUnitCode);
    if (!adUnit) continue;
    adUnit.bids.push({
      bidder: b.bidder,
      requestId: b.bidId,
      adUnitCode: b.adUnitCode,
      source: b.src === 's2s' ? 'server' : 'client',
      status: 'pending',
      params: b.params,
      eidsPresent: extractEidsPresence(b.userIdAsEids || args.userIdAsEids)
    });
  }
}

/**
 * @param {Object} bid - Prebid bid response object
 */
function onBidResponse(bid) {
  const record = findBidRecord(bid.auctionId, bid.requestId || bid.bidId);
  if (!record) return;
  Object.assign(record, {
    cpm: bid.cpm,
    currency: bid.currency,
    originalCpm: bid.originalCpm,
    originalCurrency: bid.originalCurrency,
    netRevenue: typeof bid.netRevenue === 'boolean' ? bid.netRevenue : undefined,
    timeToRespond: bid.timeToRespond,
    networkLatencyMs: extractNetworkLatency(bid),
    size: bid.size || (bid.width && bid.height ? `${bid.width}x${bid.height}` : undefined),
    width: typeof bid.width === 'number' ? bid.width : undefined,
    height: typeof bid.height === 'number' ? bid.height : undefined,
    mediaType: bid.mediaType,
    adId: bid.adId,
    creativeId: bid.creativeId,
    dealId: bid.dealId,
    floorData: pruneFloorData(bid.floorData),
    meta: pruneMeta(bid.meta)
  });

  if (record.status === 'pending') {
    record.status = 'received';
  }

  if (bid.mediaType === 'video' && bid.vastUrl) {
    record.vastUrl = bid.vastUrl;
  }
  if (bid.mediaType === 'native' && bid.native) {
    record.native = pruneNative(bid.native);
  }
}

function onBidRejected(bid) {
  const record = findBidRecord(bid.auctionId, bid.requestId || bid.bidId);
  if (!record) return;
  onBidResponse(bid);
  record.status = 'rejected';
  if (bid.rejectionReason) record.rejectionReason = bid.rejectionReason;
}

/**
 * Mark still-pending bids for this bidder as 'noBid'.
 * @param {{auctionId: string, bids: Array<Object>}} args
 */
function onBidderDone(args) {
  const auction = locals.auctions[args.auctionId];
  if (!auction || !Array.isArray(args.bids)) return;
  for (const b of args.bids) {
    const record = findBidRecord(args.auctionId, b.bidId);
    if (record && record.status === 'pending') {
      record.status = 'noBid';
    }
  }
}

/**
 * @param {{auctionId: string, bidId: string}} args
 */
function onNoBid(args) {
  if (!args || !args.auctionId || !args.bidId) return;
  const record = findBidRecord(args.auctionId, args.bidId);
  if (record && (record.status === 'pending' || record.status === 'received')) {
    record.status = 'noBid';
  }
}

/**
 * Tracked at the auction level: BIDDER_ERROR carries the whole bidder's bid list,
 * not the specific failed bid, so per-bid status stays driven by NO_BID / BID_TIMEOUT.
 * @param {{bidderRequest?: {auctionId: string, bidderCode: string}, error?: any}} args
 */
function onBidderError(args) {
  const auctionId = deepAccess(args, 'bidderRequest.auctionId');
  const auction = auctionId && locals.auctions[auctionId];
  if (!auction) return;
  auction.bidderErrors = auction.bidderErrors || [];
  auction.bidderErrors.push({
    bidder: deepAccess(args, 'bidderRequest.bidderCode') || 'unknown',
    error: formatBidderError(args.error)
  });
}

/**
 * @param {string|{timedOut?: boolean, status?: number, statusText?: string, message?: string}} err
 * @returns {string}
 */
function formatBidderError(err) {
  if (typeof err === 'string') return err;
  if (!err || typeof err !== 'object') return 'unknown';
  if (err.timedOut) return 'timeout';
  if (err.statusText && err.status) return `${err.statusText} (HTTP ${err.status})`;
  if (err.statusText) return err.statusText;
  if (err.status === 0) return 'network error';
  if (err.status) return `HTTP ${err.status}`;
  if (err.message) return err.message;
  return 'unknown';
}

/**
 * @param {Array<{auctionId: string, bidId: string}>} bids
 */
function onBidTimeout(bids) {
  if (!Array.isArray(bids)) return;
  for (const b of bids) {
    const record = findBidRecord(b.auctionId, b.bidId);
    if (record) record.status = 'timeout';
  }
}

function onBidWon(bid) {
  const auction = locals.auctions[bid.auctionId];
  if (!auction) return;
  const requestId = bid.requestId || bid.bidId;
  for (const adUnit of auction.adUnits) {
    const record = adUnit.bids.find(b => b.requestId === requestId);
    if (!record) continue;
    record.status = 'won';
    record.adserverTargeting = pruneAdserverTargeting(bid.adserverTargeting);
    // GAM slot/viewability events can land before this win and park render data on
    // adUnit.gamRender; reclaim it onto the winning bid.
    if (adUnit.gamRender) {
      record.render = Object.assign({}, adUnit.gamRender, record.render);
      delete adUnit.gamRender;
    }
    return;
  }
}

function onBidViewable(bid) {
  if (!bid) return;
  const record = findBidRecord(bid.auctionId, bid.requestId || bid.bidId);
  if (record) {
    record.render = record.render || {};
    record.render.viewable = true;
  }
}

/**
 * Keep only the well-known hb_* targeting keys; drop high-cardinality publisher extras.
 * @param {Object} [t]
 * @returns {Object<string,string>|undefined}
 */
function pruneAdserverTargeting(t) {
  if (!t || typeof t !== 'object') return undefined;
  const keys = ['hb_bidder', 'hb_pb', 'hb_size', 'hb_deal', 'hb_format', 'hb_adid', 'hb_uuid', 'hb_cache_host'];
  const out = {};
  for (const k of keys) if (t[k] !== undefined) out[k] = t[k];
  return Object.keys(out).length ? out : undefined;
}

/**
 * Bucket a raw OpenRTB seatnonbid status code into our per-bid status. Ranges per the IAB
 * Seat Non-Bid spec: 0–99 no-bid, 100–199 error (101 = timeout), 200–399 blocked/rejected.
 * @param {number} code
 * @returns {'noBid'|'timeout'|'rejected'}
 */
function mapSeatNonBidStatus(code) {
  if (code === 101) return 'timeout';
  if (typeof code === 'number' && code >= 200 && code < 400) return 'rejected';
  return 'noBid';
}

/**
 * Apply Prebid Server seat-level non-bids (`ext.seatnonbid`) — server bidders that never
 * returned a client-side BID_RESPONSE. Enrich the matching server record, or synthesize one.
 * @param {AuctionRecord} auction
 * @param {Array<{seat?: string, nonbid?: Array<{impid?: string, status?: number, statusCode?: number}>}>} [seatNonBids]
 */
function applySeatNonBids(auction, seatNonBids) {
  if (!Array.isArray(seatNonBids)) return;
  for (const seatObj of seatNonBids) {
    if (!seatObj || !Array.isArray(seatObj.nonbid)) continue;
    const seat = seatObj.seat;
    for (const nb of seatObj.nonbid) {
      if (!nb) continue;
      const code = nb.statuscode != null ? nb.statuscode : (nb.status != null ? nb.status : nb.statusCode);
      const adUnit = auction.adUnits.find(au => au.code === nb.impid);
      if (!adUnit) continue;
      const status = mapSeatNonBidStatus(code);
      const record = adUnit.bids.find(b =>
        b.bidder === seat && b.source === 'server' &&
        (b.status === 'pending' || b.status === 'noBid' || b.status === 'lost'));
      if (record) {
        record.status = status;
        record.seatNonBidStatus = code;
      } else {
        adUnit.bids.push({
          bidder: seat,
          adUnitCode: nb.impid,
          source: 'server',
          status,
          isSeatNonBid: true,
          seatNonBidStatus: code
        });
      }
    }
  }
}

/**
 * @param {{auctionId: string, auctionEnd?: number, bidsReceived?: Array<Object>, seatNonBids?: Array<Object>}} args
 */
function onAuctionEnd(args) {
  const auctionId = args && args.auctionId;
  const auction = locals.auctions[auctionId];
  if (!auction) return;

  // Use the event's auctionEnd; the base adapter debounces before we run, so Date.now() would
  // inflate duration and could mis-flag timeoutReached.
  auction.endTime = typeof args.auctionEnd === 'number' ? args.auctionEnd : Date.now();

  for (const adUnit of auction.adUnits) {
    for (const record of adUnit.bids) {
      if (record.status === 'received') {
        record.status = 'lost';
      }
    }
  }

  applySeatNonBids(auction, args.seatNonBids);

  if (locals.flushTimers[auctionId]) clearTimeout(locals.flushTimers[auctionId]);
  locals.flushTimers[auctionId] = setTimeout(() => finalizeAndSend(auctionId), locals.auctionEndDelay);
}

function onAdRenderSucceeded(args) {
  const bid = args && args.bid;
  if (!bid) return;
  const record = findBidRecord(bid.auctionId, bid.requestId || bid.bidId);
  // Merge — slotRenderEnded usually fires first and seeds render with GAM IDs.
  if (record) record.render = Object.assign({}, record.render, { status: 'success' });
}

function onAdRenderFailed(args) {
  const bid = args && args.bid;
  if (!bid) return;
  const record = findBidRecord(bid.auctionId, bid.requestId || bid.bidId);
  if (record) record.render = Object.assign({}, record.render, { status: 'failed', reason: args.reason, message: args.message });
}

function finalizeAndSend(auctionId) {
  const auction = locals.auctions[auctionId];
  if (!auction) return;
  delete locals.flushTimers[auctionId];
  delete locals.auctions[auctionId];
  // COPPA: never transmit — drop the data rather than send.
  if (coppaDataHandler.getCoppa()) return;

  if (typeof auction.endTime === 'number' && typeof auction.startTime === 'number') {
    auction.duration = auction.endTime - auction.startTime;
    if (typeof auction.timeout === 'number') {
      auction.timeoutReached = auction.duration >= auction.timeout;
    }
  }

  const body = JSON.stringify(auction);
  // Prefer sendBeacon; fall back to ajax when it refuses (payload too large / unsupported).
  if (sendBeacon(locals.endpoint, body)) {
    log.info(`Auction report sent (${auctionId})`);
    return;
  }
  ajax(
    locals.endpoint,
    () => log.info(`Auction report sent via ajax fallback (${auctionId})`),
    body,
    { method: 'POST', contentType: 'application/json', withCredentials: false }
  );
}

/**
 * Synchronously flush in-flight auctions on page unload, tagged `truncated: true`.
 */
function flushAllAuctions() {
  const coppa = coppaDataHandler.getCoppa();
  const ids = Object.keys(locals.auctions);
  for (const auctionId of ids) {
    const auction = locals.auctions[auctionId];
    if (locals.flushTimers[auctionId]) {
      clearTimeout(locals.flushTimers[auctionId]);
      delete locals.flushTimers[auctionId];
    }
    delete locals.auctions[auctionId];
    if (coppa) continue; // COPPA: never transmit
    auction.truncated = true;
    if (!sendBeacon(locals.endpoint, JSON.stringify(auction))) {
      log.warn('sendBeacon refused payload; auction lost on unload', auction.auctionId);
    }
  }
}

/**
 * @param {number} [auctionStart]
 * @returns {AuctionMetadata}
 */
function buildMetadata(auctionStart) {
  const ref = getRefererInfo();
  const pageUrl = ref.page || (typeof location !== 'undefined' ? location.href : '');
  return {
    url: pageUrl,
    referrer: ref.ref || '',
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
    language: typeof navigator !== 'undefined' ? navigator.language : '',
    screen: typeof window !== 'undefined' && window.screen
      ? { w: window.screen.width, h: window.screen.height }
      : { w: 0, h: 0 },
    utm: extractUtm(pageUrl),
    prebidVersion: '$prebid.version$',
    timestamp: auctionStart || Date.now(),
    consent: collectConsent()
  };
}

function extractUtm(url) {
  /** @type {Object<string,string>} */
  const utm = {};
  try {
    const u = new URL(url);
    u.searchParams.forEach((v, k) => {
      if (k.toLowerCase().startsWith('utm_')) utm[k] = v;
    });
  } catch (_) { /* ignore malformed URLs */ }
  return utm;
}

/**
 * @returns {ConsentMetadata}
 */
function collectConsent() {
  /** @type {ConsentMetadata} */
  const consent = {};
  const gdpr = gdprDataHandler.getConsentData();
  if (gdpr) {
    consent.gdprApplies = Boolean(gdpr.gdprApplies);
    consent.tcfConsentString = gdpr.consentString || '';
  }
  const gpp = gppDataHandler.getConsentData();
  if (gpp) {
    consent.gppString = gpp.gppString;
    consent.gppSid = gpp.applicableSections;
  }
  const usp = uspDataHandler.getConsentData();
  if (usp) {
    consent.usPrivacy = usp;
  }
  return consent;
}

/**
 * Return EID source names only — the IDs themselves never leave the page.
 * @param {Array<{source?: string}>} [eids]
 * @returns {string[]}
 */
function extractEidsPresence(eids) {
  if (!Array.isArray(eids)) return [];
  return eids.map(e => e && e.source).filter(s => typeof s === 'string');
}

/**
 * @param {Object} [meta]
 * @returns {BidMeta|undefined}
 */
function pruneMeta(meta) {
  if (!meta || typeof meta !== 'object') return undefined;
  const out = {};
  const keys = [
    'advertiserDomains', 'networkId', 'networkName', 'advertiserId', 'advertiserName',
    'brandId', 'brandName', 'primaryCatId', 'secondaryCatIds'
  ];
  for (const k of keys) if (meta[k] !== undefined) out[k] = meta[k];
  return Object.keys(out).length ? out : undefined;
}

/**
 * ajax round-trip time from bid.metrics, if present. Total latency is already on
 * the bid as `timeToRespond`.
 * @param {Object} bid
 * @returns {number|undefined}
 */
function extractNetworkLatency(bid) {
  try {
    if (!bid.metrics || typeof bid.metrics.getMetrics !== 'function') return undefined;
    const metrics = bid.metrics.getMetrics() || {};
    const src = bid.src || bid.source || 'client';
    const netRaw = metrics[`adapter.${src}.net`];
    const net = Array.isArray(netRaw) ? netRaw[netRaw.length - 1] : netRaw;
    return typeof net === 'number' ? net : undefined;
  } catch (_) {
    return undefined;
  }
}

/**
 * @param {Object} [fd]
 * @returns {FloorData|undefined}
 */
function pruneFloorData(fd) {
  if (!fd || typeof fd !== 'object') return undefined;
  const out = {};
  const keys = [
    'floorValue', 'floorRule', 'floorRuleValue', 'floorCurrency', 'fetchStatus',
    'floorProvider', 'location', 'modelVersion', 'modelWeight', 'skipped',
    'skipRate', 'floorMin', 'cpmAfterAdjustments'
  ];
  for (const k of keys) if (fd[k] !== undefined) out[k] = fd[k];
  return Object.keys(out).length ? out : undefined;
}

/**
 * Keep only URL-shaped fields from native creatives — never raw asset blobs.
 * @param {Object} native
 */
function pruneNative(native) {
  const out = {};
  if (native.title) out.title = native.title;
  if (native.body) out.body = native.body;
  if (native.sponsoredBy) out.sponsoredBy = native.sponsoredBy;
  if (native.clickUrl) out.clickUrl = native.clickUrl;
  if (native.image && native.image.url) out.imageUrl = native.image.url;
  if (native.icon && native.icon.url) out.iconUrl = native.icon.url;
  return Object.keys(out).length ? out : undefined;
}

function findBidRecord(auctionId, requestId) {
  const auction = locals.auctions[auctionId];
  if (!auction) return undefined;
  for (const adUnit of auction.adUnits) {
    for (const record of adUnit.bids) {
      if (record.requestId === requestId) return record;
    }
  }
  return undefined;
}

function getLogger() {
  const LPREFIX = `${PROVIDER_NAME} Analytics: `;
  return {
    info: (msg, ...args) => logInfo(`${LPREFIX}${msg}`, ...deepClone(args)),
    warn: (msg, ...args) => logWarn(`${LPREFIX}${msg}`, ...deepClone(args)),
    error: (msg, ...args) => logError(`${LPREFIX}${msg}`, ...deepClone(args))
  };
}

adapterManager.registerAnalyticsAdapter({
  adapter: analyticsAdapter,
  code: PROVIDER_NAME
});

export default analyticsAdapter;
