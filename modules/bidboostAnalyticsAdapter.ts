import AnalyticsAdapter, { type AnalyticsConfig } from '../libraries/analyticsAdapter/AnalyticsAdapter.js';
import { ajax } from '../src/ajax.js';
import adapterManager, { type BidderRequest } from '../src/adapterManager.js';
import { EVENTS } from '../src/constants.js';
import type { EventPayload } from '../src/events.js';
import type { Bid } from '../src/bidfactory.ts';
import type { AuctionProperties } from '../src/auction.ts';
import type { BidderCode } from '../src/types/common.d.ts';
import { getWindowLocation, getWindowSelf, logError, logWarn } from '../src/utils.js';
import {
  BIDBOOST_ANALYTICS_CODE,
  ALL_BIDDERS,
  type BidboostModuleParams,
  type BidboostAdUnitDefinition,
  type BidboostModuleParamsInput,
  type PredictorSnapshot,
  toFiniteNumber,
  consumePredictorSnapshotForAuction,
  getConnectionType,
  hasRequiredParams,
  normalizeBidboostParams,
  peekPredictorSnapshotForAuction
} from '../src/bidboostShared.js';

interface CollectorBid {
  b: string;
  u: number;
  s: number;
  c?: number;
  m?: number;
  r?: number;
  p?: number;
  z?: number;
}

interface CollectorPlacement {
  c: string;
  b: CollectorBid[];
}

interface CollectorRequest {
  c: string;
  s: string;
  p: string;
  g: number;
  ct: number;
  bt: number;
  fa: number;
  na: number;
  pl: CollectorPlacement[];
}

interface BidLikeWithIdentity {
  bidderCode?: string;
  bidder?: string;
}

type BidboostAnalyticsConfig = AnalyticsConfig<'bidboost'> & { options?: BidboostModuleParamsInput };

type EventPayloadMap = {
  [EVENTS.BID_REQUESTED]: EventPayload<typeof EVENTS.BID_REQUESTED>;
  [EVENTS.AUCTION_END]: EventPayload<typeof EVENTS.AUCTION_END>;
  [EVENTS.AD_RENDER_SUCCEEDED]: EventPayload<typeof EVENTS.AD_RENDER_SUCCEEDED>;
};

const bidSourceIds: Record<string, number> = {
  client: 1,
  s2s: 2
};

const mediaTypeIds: Record<string, number> = {
  banner: 1,
  video: 2,
  native: 3
};

const currencyIds: Record<string, number> = {
  EUR: 1,
  USD: 2,
  GBP: 3,
  JPY: 4
};

const BidState = {
  NoBid: 1,
  Timeout: 2,
  BidResponse: 3,
  FilledImpression: 4,
  BidRejected: 5
} as const;

const MAX_SNAPSHOT_ENTRIES = 10;

let params: BidboostModuleParams | null = null;
let pendingAuctionId: string | null = null;
let pendingCollectorRequest: CollectorRequest | null = null;
let pendingCollectorTimeout: ReturnType<typeof setTimeout> | null = null;
let activeAuctionId: string | null = null;
let runningAuction = false;
let pageLifecycleHooksRegistered = false;
let analyticsEnabled = false;

const snapshotByAuctionId: Record<string, PredictorSnapshot> = {};
const snapshotAuctionIds: string[] = [];
const sourcesByBidder: Record<string, number> = {};
const uidsByBidder: Record<string, boolean> = {};

function rememberSnapshot(auctionId: string, snapshot: PredictorSnapshot): void {
  if (!snapshotByAuctionId[auctionId]) {
    snapshotAuctionIds.push(auctionId);
    if (snapshotAuctionIds.length > MAX_SNAPSHOT_ENTRIES) {
      const evictedAuctionId = snapshotAuctionIds.shift();
      if (evictedAuctionId) {
        delete snapshotByAuctionId[evictedAuctionId];
      }
    }
  }
  snapshotByAuctionId[auctionId] = snapshot;
}

function clearSnapshotCache(): void {
  snapshotAuctionIds.length = 0;
  Object.keys(snapshotByAuctionId).forEach((auctionId) => {
    delete snapshotByAuctionId[auctionId];
  });
}

function removeSnapshot(auctionId: string): void {
  delete snapshotByAuctionId[auctionId];
  const index = snapshotAuctionIds.indexOf(auctionId);
  if (index !== -1) {
    snapshotAuctionIds.splice(index, 1);
  }
}

function onBidRequested(data: BidderRequest<BidderCode>): void {
  if (!data) {
    return;
  }

  runningAuction = true;
  activeAuctionId = data.auctionId || activeAuctionId;

  const bidderCode = data.bidderCode;
  if (bidderCode) {
    sourcesByBidder[bidderCode] = getBidSourceId(data.src);
    if (hasUserIdSignal(data)) {
      uidsByBidder[bidderCode] = true;
    }
  }

  const bids = Array.isArray(data.bids) ? data.bids : [];
  bids.forEach((bid) => {
    const bidder = getBidderCode(bid) || bidderCode;
    if (!bidder) {
      return;
    }
    sourcesByBidder[bidder] = getBidSourceId(data.src);
    if (hasUserIdSignal(bid)) {
      uidsByBidder[bidder] = true;
    }
  });
}

function onAuctionEnd(data: AuctionProperties): void {
  if (!data || !params) {
    return;
  }
  const activeParams = params;

  runningAuction = false;
  activeAuctionId = null;

  const snapshot = consumePredictorSnapshotForAuction(data.auctionId) || null;
  if (snapshot) {
    rememberSnapshot(data.auctionId, snapshot);
  }

  const bidsByAdUnit: Record<string, CollectorBid[]> = {};
  const processedBiddersByAdUnit: Record<string, Set<string>> = {};

  processRejectedBids(data, bidsByAdUnit, processedBiddersByAdUnit);
  processNoBids(data, bidsByAdUnit, processedBiddersByAdUnit);
  if (!processBidResponses(data, bidsByAdUnit, processedBiddersByAdUnit)) {
    removeSnapshot(data.auctionId);
    return;
  }
  processBidTimeouts(data, bidsByAdUnit, processedBiddersByAdUnit);

  const request = createDataCollectorRequest(activeParams, snapshot);
  Object.keys(bidsByAdUnit).forEach((adUnitCode) => {
    request.pl.push({
      c: resolvePlacementCode(activeParams, snapshot, adUnitCode),
      b: bidsByAdUnit[adUnitCode]
    });
  });
  queueDataCollectorRequest(data.auctionId, request);
}

function onAdRenderSucceeded(data: EventPayload<typeof EVENTS.AD_RENDER_SUCCEEDED>): void {
  if (!data || !data.bid || !params) {
    return;
  }

  const bid = data.bid;
  const bidder = getBidderCode(bid);
  if (
    !bidder ||
    isBidFromNonPrebidIntegration(bid) ||
    bid.mediaType === 'audio' ||
    params.ignoredBidders.has(bidder)
  ) {
    return;
  }

  const snapshot = snapshotByAuctionId[bid.auctionId] || null;
  const placementCode = resolvePlacementCode(params, snapshot, bid.adUnitCode);
  const price = getPrice(bid);
  if (!price) {
    logError(`bidboostAnalyticsAdapter: unsupported currency '${bid.originalCurrency ?? bid.currency}'`);
    return;
  }
  const filledImpressionBid: CollectorBid = {
    b: params.bidderMapper(bidder),
    u: hasUid(uidsByBidder, bidder),
    s: BidState.FilledImpression,
    c: sourcesByBidder[bidder],
    m: mediaTypeIds[bid.mediaType],
    r: bid.responseTimestamp - bid.requestTimestamp,
    p: price._cpm,
    z: price._currencyId
  };

  if (pendingAuctionId === bid.auctionId && pendingCollectorRequest && pendingCollectorTimeout !== null) {
    const placement = pendingCollectorRequest.pl.find((entry) => entry.c === placementCode);
    if (placement) {
      placement.b.push(filledImpressionBid);
    }
    return;
  }

  const request = createDataCollectorRequest(params, snapshot);
  request.na = 0;
  request.pl = [{ c: placementCode, b: [filledImpressionBid] }];
  postDataCollectorRequest(params.collectorUrl, request);
}

function processRejectedBids(
  data: AuctionProperties,
  bidsByAdUnit: Record<string, CollectorBid[]>,
  processedBiddersByAdUnit: Record<string, Set<string>>
): void {
  const rejectedBids = Array.isArray(data.bidsRejected) ? data.bidsRejected : [];
  rejectedBids.forEach((bid) => {
    const bidder = getBidderCode(bid);
    if (bid.adUnitCode && bidder && bidderIncluded(bidder)) {
      addBid(bidsByAdUnit, processedBiddersByAdUnit, bid.adUnitCode, bidder, {
        s: BidState.BidRejected,
        c: sourcesByBidder[bidder],
        r: (bid.responseTimestamp ?? 500) - (bid.requestTimestamp ?? 0)
      });
    }
  });
}

function processNoBids(
  data: AuctionProperties,
  bidsByAdUnit: Record<string, CollectorBid[]>,
  processedBiddersByAdUnit: Record<string, Set<string>>
): void {
  const noBids = Array.isArray(data.noBids) ? data.noBids : [];
  noBids.forEach((bid) => {
    const bidder = getBidderCode(bid);
    if (bidder && bidderIncluded(bidder)) {
      addBid(bidsByAdUnit, processedBiddersByAdUnit, bid.adUnitCode, bidder, {
        s: BidState.NoBid,
        c: sourcesByBidder[bidder],
        r: data.auctionEnd - data.timestamp
      });
    }
  });
}

function processBidResponses(
  data: AuctionProperties,
  bidsByAdUnit: Record<string, CollectorBid[]>,
  processedBiddersByAdUnit: Record<string, Set<string>>
): boolean {
  const bidsReceived = Array.isArray(data.bidsReceived) ? data.bidsReceived : [];
  for (const bid of bidsReceived) {
    const bidder = getBidderCode(bid);
    if (bidder && bidderIncluded(bidder) && bid.mediaType !== 'audio') {
      const price = getPrice(bid);
      if (!price) {
        logError(`bidboostAnalyticsAdapter: unsupported currency '${bid.originalCurrency ?? bid.currency}'`);
        return false;
      }
      addBid(bidsByAdUnit, processedBiddersByAdUnit, bid.adUnitCode, bidder, {
        s: BidState.BidResponse,
        c: sourcesByBidder[bidder],
        m: mediaTypeIds[bid.mediaType],
        r: bid.responseTimestamp - bid.requestTimestamp,
        p: price._cpm,
        z: price._currencyId
      });
    }
  }

  return true;
}

function processBidTimeouts(
  data: AuctionProperties,
  bidsByAdUnit: Record<string, CollectorBid[]>,
  processedBiddersByAdUnit: Record<string, Set<string>>
): void {
  const bidderRequests = Array.isArray(data.bidderRequests) ? data.bidderRequests : [];
  bidderRequests.forEach((bidderRequest) => {
    const bidder = bidderRequest.bidderCode;
    if (!bidder) {
      return;
    }
    bidderRequest.bids.forEach((bid) => {
      const adUnitCode = bid.adUnitCode;
      const processedBidders = processedBiddersByAdUnit[adUnitCode];
      if (bidderIncluded(bidder) && (!processedBidders || !processedBidders.has(bidder))) {
        addBid(bidsByAdUnit, processedBiddersByAdUnit, adUnitCode, bidder, {
          s: BidState.Timeout,
          c: sourcesByBidder[bidder]
        });
      }
    });
  });
}

function addBid(
  bidsByAdUnit: Record<string, CollectorBid[]>,
  processedBiddersByAdUnit: Record<string, Set<string>>,
  adUnitCode: string,
  bidder: string,
  bid: Omit<CollectorBid, 'b' | 'u'>
): void {
  if (!params) {
    return;
  }

  (processedBiddersByAdUnit[adUnitCode] ||= new Set()).add(bidder);

  const augmentedBid: CollectorBid = {
    b: params.bidderMapper(bidder),
    u: hasUid(uidsByBidder, bidder),
    s: bid.s,
    c: bid.c,
    m: bid.m,
    r: bid.r,
    p: bid.p,
    z: bid.z
  };

  (bidsByAdUnit[adUnitCode] ||= []).push(augmentedBid);
}

function bidderIncluded(bidder: string): boolean {
  return !!params && !params.ignoredBidders.has(bidder);
}

function queueDataCollectorRequest(auctionId: string, request: CollectorRequest): void {
  if (!params) {
    return;
  }

  flushPendingCollectorRequest();
  pendingAuctionId = auctionId;
  pendingCollectorRequest = request;
  pendingCollectorTimeout = setTimeout(flushPendingCollectorRequest, params.analyticsBatchWindowMs);
}

function flushPendingCollectorRequest(): void {
  if (!pendingCollectorRequest || !params) {
    return;
  }

  if (pendingCollectorTimeout !== null) {
    clearTimeout(pendingCollectorTimeout);
    pendingCollectorTimeout = null;
  }

  postDataCollectorRequest(params.collectorUrl, pendingCollectorRequest);
  pendingCollectorRequest = null;
  pendingAuctionId = null;
}

function onPageHide(): void {
  if (!params) {
    return;
  }

  if (pendingCollectorRequest) {
    flushPendingCollectorRequest();
    return;
  }

  if (!runningAuction) {
    return;
  }
  const snapshot = activeAuctionId ? peekPredictorSnapshotForAuction(activeAuctionId) : null;
  const request = createDataCollectorRequest(params, snapshot);
  postDataCollectorRequest(params.collectorUrl, request);
}

function onVisibilityChange(event: Event): void {
  const target = event.target as any;
  if (target?.visibilityState === 'hidden') {
    flushPendingCollectorRequest();
  }
}

function hasUserIdSignal(input: unknown): boolean {
  if (!input || typeof input !== 'object') {
    return false;
  }

  const data = input as {
    userId?: unknown;
    userIdAsEids?: unknown;
    userIdAsEid?: unknown;
    ortb2?: { user?: { eids?: unknown[] } };
  };

  if (data.userId && typeof data.userId === 'object' && Object.keys(data.userId).length > 0) {
    return true;
  }

  const eids = data.userIdAsEids || data.userIdAsEid;
  if (Array.isArray(eids) && eids.length > 0) {
    uidsByBidder[ALL_BIDDERS] = true;
    return true;
  }

  if (Array.isArray(data.ortb2?.user?.eids) && data.ortb2.user.eids.length > 0) {
    uidsByBidder[ALL_BIDDERS] = true;
    return true;
  }

  return false;
}

function getBidSourceId(source: string): number {
  return bidSourceIds[source] || bidSourceIds.client;
}

function hasUid(uidLookup: Record<string, boolean>, bidder: string): number {
  return uidLookup[ALL_BIDDERS] || uidLookup[bidder] ? 1 : 0;
}

function getPrice(bid: Bid): { _cpm: number; _currencyId: number } | null {
  if (bid.originalCpm && bid.originalCurrency) {
    const originalCurrencyId = currencyIds[bid.originalCurrency];
    if (originalCurrencyId !== undefined) {
      return { _cpm: bid.originalCpm, _currencyId: originalCurrencyId };
    }
  }

  const currencyId = currencyIds[bid.currency];
  if (currencyId !== undefined) {
    return { _cpm: bid.cpm, _currencyId: currencyId };
  }

  return null;
}

function createDataCollectorRequest(activeParams: BidboostModuleParams, snapshot: PredictorSnapshot | null): CollectorRequest {
  const connectionType = getConnectionType();
  return {
    c: activeParams.client,
    s: activeParams.site,
    p: getPage(),
    g: toFiniteNumber(snapshot?.g, 0),
    ct: toFiniteNumber(snapshot?.t, connectionType),
    bt: toFiniteNumber(snapshot?.b, 3000),
    fa: snapshot?.fa === 1 ? 1 : 0,
    na: 1,
    pl: []
  };
}

function postDataCollectorRequest(collectorUrl: string, request: CollectorRequest): void {
  const checksum = computeChecksum(request);
  const body = JSON.stringify(request);
  const url = `${collectorUrl}/auction?id=${checksum}`;
  const window = getWindowSelf();

  try {
    if (body.length < 60000 && window?.navigator?.sendBeacon && window.navigator.sendBeacon(url, body)) {
      return;
    }
  } catch (_error) {
    // ignore and fallback to ajax
  }

  ajax(url, undefined, body, { method: 'POST', contentType: 'text/plain', withCredentials: false });
}

function resolvePlacementCode(activeParams: BidboostModuleParams, snapshot: PredictorSnapshot | null, adUnitCode: string): string {
  const placementByAdUnitCode = snapshot?.m;
  if (placementByAdUnitCode && placementByAdUnitCode[adUnitCode]) {
    return placementByAdUnitCode[adUnitCode];
  }

  try {
    return activeParams.placementMapper({ code: adUnitCode } as BidboostAdUnitDefinition);
  } catch (_error) {
    return adUnitCode;
  }
}

function getPage(): string {
  try {
    return getWindowLocation()?.pathname.replace(/\/$/g, '') || '';
  } catch (_error) {
    return '';
  }
}

function computeChecksum(request: CollectorRequest): number {
  let checksum = addToChecksumUuid(0, request.c);
  checksum = addToChecksumString(checksum, request.s);
  checksum = addToChecksumString(checksum, request.p);

  request.pl.forEach((placement) => {
    checksum = addToChecksumString(checksum, placement.c);
    placement.b.forEach((bid) => {
      checksum = addToChecksumString(checksum, bid.b);
    });
  });

  return checksum;
}

function addToChecksumUuid(checksum: number, uuid: string): number {
  checksum = addToChecksum(checksum, byteAt(uuid, 6));
  checksum = addToChecksum(checksum, byteAt(uuid, 4));
  checksum = addToChecksum(checksum, byteAt(uuid, 2));
  checksum = addToChecksum(checksum, byteAt(uuid, 0));

  checksum = addToChecksum(checksum, byteAt(uuid, 11));
  checksum = addToChecksum(checksum, byteAt(uuid, 9));

  checksum = addToChecksum(checksum, byteAt(uuid, 16));
  checksum = addToChecksum(checksum, byteAt(uuid, 14));

  checksum = addToChecksum(checksum, byteAt(uuid, 19));
  checksum = addToChecksum(checksum, byteAt(uuid, 21));

  checksum = addToChecksum(checksum, byteAt(uuid, 24));
  checksum = addToChecksum(checksum, byteAt(uuid, 26));
  checksum = addToChecksum(checksum, byteAt(uuid, 28));
  checksum = addToChecksum(checksum, byteAt(uuid, 30));
  checksum = addToChecksum(checksum, byteAt(uuid, 32));
  checksum = addToChecksum(checksum, byteAt(uuid, 34));

  return checksum;
}

function byteAt(uuid: string, charIndex: number): number {
  return Number(`0x${uuid.substring(charIndex, charIndex + 2)}`);
}

function addToChecksumString(checksum: number, str: string): number {
  for (let index = 0; index < str.length; index++) {
    checksum = addToChecksum(checksum, str.charCodeAt(index));
  }
  return checksum;
}

function addToChecksum(checksum: number, value: number): number {
  checksum = (checksum << 5) - checksum + value;
  checksum &= checksum;
  return checksum;
}

function getBidderCode(value: BidLikeWithIdentity | unknown): string | null {
  if (!value || typeof value !== 'object') {
    return null;
  }
  const bidderCode = (value as BidLikeWithIdentity).bidderCode;
  if (typeof bidderCode === 'string') {
    return bidderCode;
  }
  const bidder = (value as BidLikeWithIdentity).bidder;
  return typeof bidder === 'string' ? bidder : null;
}

function isBidFromNonPrebidIntegration(bid: Bid): boolean {
  const integrationType = (bid as Bid & { integrationType?: unknown }).integrationType;
  return integrationType !== undefined && integrationType !== 'prebid';
}

const bidboostAnalyticsAdapter = AnalyticsAdapter<'bidboost'>({
  url: '',
  analyticsType: 'endpoint'
});

const originalEnableAnalytics = bidboostAnalyticsAdapter.enableAnalytics;
const originalDisableAnalytics = bidboostAnalyticsAdapter.disableAnalytics;

bidboostAnalyticsAdapter.track = function track({ eventType, args }: { eventType: keyof EventPayloadMap; args: unknown }) {
  if (!params) {
    return;
  }

  if (eventType === EVENTS.BID_REQUESTED) {
    onBidRequested(args as EventPayload<typeof EVENTS.BID_REQUESTED>);
    return;
  }

  if (eventType === EVENTS.AUCTION_END) {
    onAuctionEnd(args as EventPayload<typeof EVENTS.AUCTION_END>);
    return;
  }

  if (eventType === EVENTS.AD_RENDER_SUCCEEDED) {
    onAdRenderSucceeded(args as EventPayload<typeof EVENTS.AD_RENDER_SUCCEEDED>);
  }
};

bidboostAnalyticsAdapter.enableAnalytics = function enableAnalytics(config: BidboostAnalyticsConfig) {
  const normalizedParams = normalizeBidboostParams(config?.options || {});
  if (hasRequiredParams(normalizedParams)) {
    params = normalizedParams;
  } else {
    params = null;
    logWarn('bidboostAnalyticsAdapter: missing required options "client" and/or "site"');
  }

  if (!pageLifecycleHooksRegistered) {
    pageLifecycleHooksRegistered = true;
    const window = getWindowSelf();
    const document = window?.document;
    if (window && typeof window.addEventListener === 'function') {
      window.addEventListener('pagehide', onPageHide);
      if (document && typeof document.addEventListener === 'function') {
        document.addEventListener('visibilitychange', onVisibilityChange);
      } else {
        // Fallback for non-DOM environments where document is unavailable.
        window.addEventListener('visibilitychange', onVisibilityChange);
      }
    }
  }

  const result = originalEnableAnalytics.call(this, config);
  analyticsEnabled = true;
  return result;
};

bidboostAnalyticsAdapter.disableAnalytics = function disableAnalytics() {
  flushPendingCollectorRequest();
  runningAuction = false;
  activeAuctionId = null;
  clearSnapshotCache();
  if (!analyticsEnabled) {
    return;
  }
  analyticsEnabled = false;
  return originalDisableAnalytics.call(this);
};

adapterManager.registerAnalyticsAdapter({
  adapter: bidboostAnalyticsAdapter,
  code: BIDBOOST_ANALYTICS_CODE
});

export default bidboostAnalyticsAdapter;
