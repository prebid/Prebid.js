import { noCredsAjax } from '../src/ajax.js';
import adapter from '../libraries/analyticsAdapter/AnalyticsAdapter.js';
import { type AnalyticsConfig } from '../libraries/analyticsAdapter/AnalyticsAdapter.js';
import { EVENTS } from '../src/constants.js';
import adapterManager from '../src/adapterManager.js';
import { logInfo, logError } from '../src/utils.js';
import { Nexx360ImpressionAuction, Nexx360ServerAuction } from '../libraries/nexx360Utils/types.js';

const analyticsType = 'endpoint';
const ANALYTICS_CODE = 'nexx360';
const GVLID = 965;
const DEFAULT_ENDPOINT = 'https://monitoring.nexx360.io';

const {
  AUCTION_INIT,
  AUCTION_END,
  BID_REQUESTED,
  BID_RESPONSE,
  BID_WON,
  BID_TIMEOUT,
  AD_RENDER_SUCCEEDED,
  AD_RENDER_FAILED,
} = EVENTS;

const EVENT_TYPE_MAP: Record<string, string> = {
  [AUCTION_INIT]: 'auctionInit',
  [BID_REQUESTED]: 'bidRequested',
  [BID_RESPONSE]: 'bidResponse',
  [BID_WON]: 'bidWon',
  [BID_TIMEOUT]: 'bidTimeout',
  [AD_RENDER_SUCCEEDED]: 'adRenderSucceeded',
  [AD_RENDER_FAILED]: 'adRenderFailed',
};

// --- Types ---

/** Publisher-facing options for `pbjs.enableAnalytics({provider: 'nexx360'})` */
export interface Nexx360AnalyticsOptions {
  /** Nexx360 publisher (account) ID. Required. */
  publisherId: string;
  /** Collector base URL. Defaults to https://monitoring.nexx360.io */
  endpoint?: string;
  /** Optional label to segment A/B test traffic in reports */
  abTestLabel?: string;
}

declare module '../libraries/analyticsAdapter/AnalyticsAdapter' {
  interface AnalyticsProviderConfig {
    nexx360: {
      options: Nexx360AnalyticsOptions;
    }
  }
}

/** Options after defaults are applied */
interface AnalyticsOptions {
  publisherId: string;
  endpoint: string;
  abTestLabel?: string;
}

interface Ortb2Imp {
  ext?: {
    gpid?: string;
  };
}

interface AuctionInitAdUnitBid {
  bidder: string;
}

interface AuctionInitAdUnit {
  code: string;
  mediaTypes: Record<string, unknown>;
  ortb2Imp?: Ortb2Imp;
  bids?: AuctionInitAdUnitBid[];
}

interface Eid {
  source: string;
  uids?: { id: string; atype?: number }[];
}

interface BidderRequest {
  ortb2?: {
    user?: {
      ext?: {
        eids?: Eid[];
      };
    };
  };
}

interface AuctionInitArgs {
  auctionId: string;
  adUnits?: AuctionInitAdUnit[];
  bidderRequests?: BidderRequest[];
  timeout: number;
}

interface BidRequestBid {
  bidder: string;
  adUnitCode: string;
  bidId: string;
  ortb2Imp?: Ortb2Imp;
  sizes?: [number, number] | [number, number][];
}

interface BidRequestedArgs {
  auctionId: string;
  bidderCode: string;
  bids?: BidRequestBid[];
}

interface BidMeta {
  demandSource?: string;
  advertiserDomains?: string[];
}

interface BidFloorData {
  floorValue?: number;
  floorRule?: string;
  floorRuleValue?: number;
  floorCurrency?: string;
  cpmAfterAdjustments?: number;
  matchedFields?: Record<string, string>;
}

interface BidResponseArgs {
  auctionId: string;
  bidderCode?: string;
  bidder?: string;
  adUnitCode: string;
  ortb2Imp?: Ortb2Imp;
  cpm: number;
  currency: string;
  width?: number;
  height?: number;
  timeToRespond: number;
  requestId: string;
  statusMessage: string;
  meta?: BidMeta;
  floorData?: BidFloorData;
  serverAuctionData?: Nexx360ServerAuction;
}

interface BidWonArgs {
  auctionId: string;
  bidderCode?: string;
  bidder?: string;
  adUnitCode: string;
  ortb2Imp?: Ortb2Imp;
  cpm: number;
  currency: string;
  width?: number;
  height?: number;
  requestId: string;
  meta?: BidMeta;
  floorData?: BidFloorData;
}

interface BidTimeoutBid {
  auctionId: string;
  bidder: string;
  adUnitCode: string;
  bidId: string;
  ortb2Imp?: Ortb2Imp;
  sizes?: [number, number] | [number, number][];
}

interface AdRenderBid {
  auctionId?: string;
  bidder?: string;
  bidderCode?: string;
  adUnitCode: string;
  ortb2Imp?: Ortb2Imp;
  adId?: string;
  cpm?: number;
  currency?: string;
  width?: number;
  height?: number;
  mediaType?: string;
  requestId?: string;
  timeToRespond?: number;
  source?: string;
  status?: string;
  ttl?: number;
  creativeId?: string;
  netRevenue?: boolean;
  meta?: BidMeta;
  floorData?: BidFloorData;
}

interface AdRenderArgs {
  bid?: AdRenderBid;
  adId?: string;
  reason?: string;
}

// --- Event payloads ---

type ConnectionType = 'client' | 'nexx360';

interface BaseEvent {
  eventType: string;
  auctionId: string;
  timestamp: number;
  publisherId: string;
  prebidVersion: string;
  referrer: string;
  domain: string;
  connectionType: ConnectionType;
  gpid?: string;
  abTestLabel?: string;
}

// --- Auction-scoped events ---

type BaseAuctionEvent = BaseEvent;

interface AdUnitEventPayload {
  code: string;
  mediaTypes: Record<string, unknown>;
  gpid?: string;
  bids: { bidder: string }[];
}

interface IdSolutionsPayload {
  id5?: boolean;
  firstId?: boolean;
  euid2?: boolean;
  liveramp?: boolean;
}

interface AuctionInitEvent extends BaseAuctionEvent {
  adUnits: AdUnitEventPayload[];
  timeout: number;
  idSolutions?: IdSolutionsPayload;
  refreshIndex: number;
}

interface BidRequestBidPayload {
  bidder: string;
  adUnitCode: string;
  bidId: string;
  gpid?: string;
  sizes: string[];
}

interface BidRequestedEvent extends BaseAuctionEvent {
  bidderCode: string;
  bids: BidRequestBidPayload[];
}

interface BidTimeoutBidPayload {
  bidder: string;
  adUnitCode: string;
  bidId: string;
  gpid?: string;
  sizes: string[];
}

interface BidTimeoutEvent extends BaseAuctionEvent {
  bids: BidTimeoutBidPayload[];
}

// --- Bid & Impression events ---

interface FloorDataPayload {
  floorValue?: number;
  floorRule?: string;
  floorCurrency?: string;
  cpmAfterAdjustments?: number;
}

interface BaseBidImpressionEvent extends BaseEvent {
  clientSsp?: string;
  fullSsp?: string;
  adUnitCode: string;
  cpm?: number;
  currency?: string;
  size?: string;
  requestId?: string;
  floorData?: FloorDataPayload;
}

interface BidResponseEvent extends BaseBidImpressionEvent {
  clientSsp: string;
  fullSsp: string;
  cpm: number;
  currency: string;
  requestId: string;
  timeToRespond: number;
  statusMessage: string;
}

interface BidWonEvent extends BaseBidImpressionEvent {
  clientSsp: string;
  fullSsp: string;
  cpm: number;
  currency: string;
  requestId: string;
}

interface AdRenderEvent extends BaseBidImpressionEvent {
  adId?: string;
  mediaType?: string;
  timeToRespond?: number;
  source?: string;
  status?: string;
  ttl?: number;
  creativeId?: string;
  netRevenue?: boolean;
  reason?: string;
}

// --- Server auction ---

interface ServerAuctionEvent extends BaseEvent {
  eventType: 'serverAuction';
  serverAuctionId: string;
  serverTimestamp: number;
  impressions: Nexx360ImpressionAuction[];
  totalImpressions: number;
  totalSspsCalled: number;
  totalBidsReceived: number;
  totalTimeouts: number;
  totalErrors: number;
  auctionTimeMs: number;
}

type AnalyticsEvent =
  | AuctionInitEvent
  | BidRequestedEvent
  | BidResponseEvent
  | BidWonEvent
  | BidTimeoutEvent
  | AdRenderEvent
  | ServerAuctionEvent;

type TrackArgs =
  | AuctionInitArgs
  | BidRequestedArgs
  | BidResponseArgs
  | BidWonArgs
  | BidTimeoutBid[]
  | AdRenderArgs
  | { auctionId: string };

interface AuctionCacheEntry {
  events: AnalyticsEvent[];
  sent: boolean;
  serverAuctionSent: boolean;
}

// --- State ---

let analyticsOptions: AnalyticsOptions = {
  publisherId: '',
  endpoint: DEFAULT_ENDPOINT,
  abTestLabel: undefined,
};

let auctionCache: Record<string, AuctionCacheEntry> = {};
let auctionCount = 0;

// --- Helpers ---

function formatSize(width?: number, height?: number): string | undefined {
  return width && height ? `${width}x${height}` : undefined;
}

function formatSizes(sizes?: [number, number] | [number, number][]): string[] {
  if (!Array.isArray(sizes) || sizes.length === 0) return [];
  // Prebid also allows a single size as a flat tuple, e.g. `[300, 250]`.
  if (typeof sizes[0] === 'number') {
    const [width, height] = sizes as [number, number];
    return typeof height === 'number' ? [`${width}x${height}`] : [];
  }
  return (sizes as [number, number][]).map(s => `${s[0]}x${s[1]}`);
}

function getAuctionCache(auctionId: string): AuctionCacheEntry {
  if (!auctionCache[auctionId]) {
    auctionCache[auctionId] = {
      events: [],
      sent: false,
      serverAuctionSent: false,
    };
  }
  return auctionCache[auctionId];
}

function getConnectionType(bidderCode?: string): ConnectionType {
  return bidderCode === 'nexx360' ? 'nexx360' : 'client';
}

function resolveBidderCode(bidderCode?: string, meta?: BidMeta): string {
  if (bidderCode === 'nexx360' && meta?.demandSource) {
    return meta.demandSource;
  }
  return bidderCode || '';
}

const ID_SOLUTION_SOURCES: Record<keyof IdSolutionsPayload, string> = {
  id5: 'id5-sync.com',
  firstId: 'first-id.fr',
  euid2: 'uidapi.com',
  liveramp: 'liveramp.com',
};

function extractIdSolutions(bidderRequests?: BidderRequest[]): IdSolutionsPayload | undefined {
  if (!bidderRequests || bidderRequests.length === 0) return undefined;
  const eids = bidderRequests[0]?.ortb2?.user?.ext?.eids;
  if (!eids || eids.length === 0) return undefined;
  const sources = new Set(eids.map(eid => eid.source));
  const result: IdSolutionsPayload = {};
  let hasAny = false;
  Object.keys(ID_SOLUTION_SOURCES).forEach((key) => {
    const k = key as keyof IdSolutionsPayload;
    if (sources.has(ID_SOLUTION_SOURCES[k])) {
      result[k] = true;
      hasAny = true;
    }
  });
  return hasAny ? result : undefined;
}

function extractFloorData(floorData?: BidFloorData): FloorDataPayload | undefined {
  if (!floorData || floorData.floorValue == null) return undefined;
  return {
    floorValue: floorData.floorValue,
    floorRule: floorData.floorRule,
    floorCurrency: floorData.floorCurrency,
    cpmAfterAdjustments: floorData.cpmAfterAdjustments,
  };
}

function createBaseEvent(
  eventType: string,
  auctionId: string,
  connectionType: ConnectionType = 'client',
): BaseEvent {
  return {
    eventType: EVENT_TYPE_MAP[eventType] || eventType,
    auctionId,
    timestamp: Date.now(),
    publisherId: analyticsOptions.publisherId,
    prebidVersion: '$prebid.version$',
    referrer: window.location.href,
    domain: window.location.hostname,
    connectionType,
    ...(analyticsOptions.abTestLabel ? { abTestLabel: analyticsOptions.abTestLabel } : {}),
  };
}

// --- Event builders ---

interface BidImpressionInput {
  eventType: string;
  auctionId: string;
  rawBidderCode: string;
  meta?: BidMeta;
  adUnitCode: string;
  ortb2Imp?: Ortb2Imp;
  cpm?: number;
  currency?: string;
  width?: number;
  height?: number;
  requestId?: string;
  floorData?: BidFloorData;
}

function createBidImpressionEvent(input: BidImpressionInput): BaseBidImpressionEvent {
  const event: BaseBidImpressionEvent = {
    ...createBaseEvent(input.eventType, input.auctionId, getConnectionType(input.rawBidderCode)),
    clientSsp: input.rawBidderCode,
    fullSsp: resolveBidderCode(input.rawBidderCode, input.meta),
    adUnitCode: input.adUnitCode,
    gpid: input.ortb2Imp?.ext?.gpid,
    cpm: input.cpm,
    currency: input.currency,
    size: formatSize(input.width, input.height),
    requestId: input.requestId,
  };
  const floorData = extractFloorData(input.floorData);
  if (floorData) event.floorData = floorData;
  return event;
}

function buildAuctionInitEvent(args: AuctionInitArgs): AuctionInitEvent {
  const refreshIndex = auctionCount;
  auctionCount++;
  const event: AuctionInitEvent = {
    ...createBaseEvent(AUCTION_INIT, args.auctionId),
    adUnits: (args.adUnits || []).map((adUnit: AuctionInitAdUnit): AdUnitEventPayload => ({
      code: adUnit.code,
      mediaTypes: adUnit.mediaTypes,
      gpid: adUnit.ortb2Imp?.ext?.gpid,
      bids: (adUnit.bids || []).map((bid: AuctionInitAdUnitBid) => ({
        bidder: bid.bidder,
      })),
    })),
    timeout: args.timeout,
    refreshIndex,
  };
  const idSolutions = extractIdSolutions(args.bidderRequests);
  if (idSolutions) event.idSolutions = idSolutions;
  return event;
}

function buildBidRequestedEvent(args: BidRequestedArgs): BidRequestedEvent {
  const event: BidRequestedEvent = {
    ...createBaseEvent(BID_REQUESTED, args.auctionId, getConnectionType(args.bidderCode)),
    bidderCode: args.bidderCode,
    bids: (args.bids || []).map((bid: BidRequestBid): BidRequestBidPayload => ({
      bidder: bid.bidder,
      adUnitCode: bid.adUnitCode,
      bidId: bid.bidId,
      gpid: bid.ortb2Imp?.ext?.gpid,
      sizes: formatSizes(bid.sizes),
    })),
  };
  return event;
}

function buildBidResponseEvent(args: BidResponseArgs): BidResponseEvent {
  return {
    ...createBidImpressionEvent({
      eventType: BID_RESPONSE,
      auctionId: args.auctionId,
      rawBidderCode: args.bidderCode || args.bidder || '',
      meta: args.meta,
      adUnitCode: args.adUnitCode,
      ortb2Imp: args.ortb2Imp,
      cpm: args.cpm,
      currency: args.currency,
      width: args.width,
      height: args.height,
      requestId: args.requestId,
      floorData: args.floorData,
    }),
    timeToRespond: args.timeToRespond,
    statusMessage: args.statusMessage,
  } as BidResponseEvent;
}

function buildBidWonEvent(args: BidWonArgs): BidWonEvent {
  return createBidImpressionEvent({
    eventType: BID_WON,
    auctionId: args.auctionId,
    rawBidderCode: args.bidderCode || args.bidder || '',
    meta: args.meta,
    adUnitCode: args.adUnitCode,
    ortb2Imp: args.ortb2Imp,
    cpm: args.cpm,
    currency: args.currency,
    width: args.width,
    height: args.height,
    requestId: args.requestId,
    floorData: args.floorData,
  }) as BidWonEvent;
}

function buildBidTimeoutEvent(args: BidTimeoutBid[]): BidTimeoutEvent[] {
  const events: BidTimeoutEvent[] = [];
  const bidsByAuction: Record<string, BidTimeoutBidPayload[]> = {};

  (args || []).forEach((bid: BidTimeoutBid) => {
    const { auctionId } = bid;
    if (!bidsByAuction[auctionId]) {
      bidsByAuction[auctionId] = [];
    }
    bidsByAuction[auctionId].push({
      bidder: bid.bidder,
      adUnitCode: bid.adUnitCode,
      bidId: bid.bidId,
      gpid: bid.ortb2Imp?.ext?.gpid,
      sizes: formatSizes(bid.sizes),
    });
  });

  Object.keys(bidsByAuction).forEach((auctionId: string) => {
    events.push({
      ...createBaseEvent(BID_TIMEOUT, auctionId),
      bids: bidsByAuction[auctionId],
    });
  });

  return events;
}

function buildAdRenderEvent(eventType: string, args: AdRenderArgs): AdRenderEvent {
  const bid: AdRenderBid = args.bid || {} as AdRenderBid;
  const event: AdRenderEvent = {
    ...createBidImpressionEvent({
      eventType,
      auctionId: bid.auctionId || 'unknown',
      rawBidderCode: bid.bidder || bid.bidderCode || '',
      meta: bid.meta,
      adUnitCode: bid.adUnitCode,
      ortb2Imp: bid.ortb2Imp,
      cpm: bid.cpm,
      currency: bid.currency,
      width: bid.width,
      height: bid.height,
      requestId: bid.requestId,
      floorData: bid.floorData,
    }),
    adId: args.adId || bid.adId,
    mediaType: bid.mediaType,
    timeToRespond: bid.timeToRespond,
    source: bid.source,
    status: bid.status,
    ttl: bid.ttl,
    creativeId: bid.creativeId,
    netRevenue: bid.netRevenue,
  };
  if (eventType === AD_RENDER_FAILED) {
    event.reason = args.reason;
  }
  return event;
}

function buildServerAuctionEvent(auctionId: string, data: Nexx360ServerAuction): ServerAuctionEvent {
  return {
    ...createBaseEvent('serverAuction', auctionId, 'nexx360'),
    eventType: 'serverAuction',
    serverAuctionId: data.auctionId,
    serverTimestamp: data.timestamp,
    impressions: data.impressions,
    totalImpressions: data.totalImpressions,
    totalSspsCalled: data.totalSspsCalled,
    totalBidsReceived: data.totalBidsReceived,
    totalTimeouts: data.totalTimeouts,
    totalErrors: data.totalErrors,
    auctionTimeMs: data.auctionTimeMs,
  };
}

// --- Transport ---

function sendEvents(events: AnalyticsEvent[]): void {
  if (!events || events.length === 0) {
    return;
  }

  const endpoint = `${analyticsOptions.endpoint}/events`;

  // Send as text/plain (a CORS "simple request") with no credentials so the
  // cross-origin POST avoids a preflight OPTIONS round-trip. The body is still
  // a JSON string; the collector parses it regardless of content type.
  noCredsAjax(endpoint, {
    success: () => {
      logInfo(`Nexx360 Analytics: sent ${events.length} events`);
    },
    error: (error: string) => {
      logError(`Nexx360 Analytics: failed to send events: ${error}`);
    },
  }, JSON.stringify(events), {
    contentType: 'text/plain',
    method: 'POST',
    // Low-priority telemetry: let the request survive page navigation.
    keepalive: true,
  });
}

function sendSingleEvent(event: AnalyticsEvent): void {
  sendEvents([event]);
}

function flushAuctionEvents(auctionId: string): void {
  const cache = getAuctionCache(auctionId);
  if (cache.sent || cache.events.length === 0) {
    return;
  }
  cache.sent = true;
  sendEvents(cache.events);
  // Clean up cache after a delay to allow post-auction events
  setTimeout(() => {
    delete auctionCache[auctionId];
  }, 30000);
}

// --- Adapter ---

export const nexx360AnalyticsAdapter = Object.assign(adapter({ analyticsType }), {
  track({ eventType, args }: { eventType: string; args: TrackArgs }) {
    if (!analyticsOptions.publisherId) {
      return;
    }

    try {
      switch (eventType) {
        // --- Auction-scoped events: buffered, flushed on AUCTION_END ---

        case AUCTION_INIT: {
          const initArgs = args as AuctionInitArgs;
          const cache = getAuctionCache(initArgs.auctionId);
          cache.events.push(buildAuctionInitEvent(initArgs));
          break;
        }

        case BID_REQUESTED: {
          const reqArgs = args as BidRequestedArgs;
          const cache = getAuctionCache(reqArgs.auctionId);
          cache.events.push(buildBidRequestedEvent(reqArgs));
          break;
        }

        case BID_RESPONSE: {
          const respArgs = args as BidResponseArgs;
          const cache = getAuctionCache(respArgs.auctionId);
          cache.events.push(buildBidResponseEvent(respArgs));
          const bidderCode = respArgs.bidderCode || respArgs.bidder || '';
          if (bidderCode === 'nexx360' && !cache.serverAuctionSent && respArgs.serverAuctionData) {
            cache.events.push(buildServerAuctionEvent(respArgs.auctionId, respArgs.serverAuctionData));
            cache.serverAuctionSent = true;
          }
          break;
        }

        case BID_TIMEOUT: {
          const events = buildBidTimeoutEvent(args as BidTimeoutBid[]);
          events.forEach((event: BidTimeoutEvent) => {
            const cache = getAuctionCache(event.auctionId);
            cache.events.push(event);
          });
          break;
        }

        case AUCTION_END: {
          const endArgs = args as { auctionId: string };
          flushAuctionEvents(endArgs.auctionId);
          break;
        }

        // --- Impression events: sent immediately ---

        case BID_WON: {
          sendSingleEvent(buildBidWonEvent(args as BidWonArgs));
          break;
        }

        case AD_RENDER_SUCCEEDED:
        case AD_RENDER_FAILED: {
          sendSingleEvent(buildAdRenderEvent(eventType, args as AdRenderArgs));
          break;
        }

        default:
          break;
      }
    } catch (error) {
      logError(`Nexx360 Analytics: error processing event ${eventType}:`, error);
    }
  },
});

const originEnableAnalytics = nexx360AnalyticsAdapter.enableAnalytics;

// Partial, because this validates what the publisher actually passed rather
// than what the configuration type asks for.
nexx360AnalyticsAdapter.enableAnalytics = function(config: { options?: Partial<Nexx360AnalyticsOptions> }) {
  const options = config.options || {};

  if (!options.publisherId) {
    logError('Nexx360 Analytics: publisherId is required');
    return;
  }

  analyticsOptions = {
    publisherId: options.publisherId,
    endpoint: options.endpoint || DEFAULT_ENDPOINT,
    abTestLabel: options.abTestLabel,
  };

  logInfo(`Nexx360 Analytics: enabled with publisherId ${analyticsOptions.publisherId}`);

  originEnableAnalytics.call(this, config as AnalyticsConfig<'nexx360'>);
};

adapterManager.registerAnalyticsAdapter({
  adapter: nexx360AnalyticsAdapter,
  code: ANALYTICS_CODE,
  gvlid: GVLID,
});

export default nexx360AnalyticsAdapter;
