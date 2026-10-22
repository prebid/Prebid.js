/**
 * This module provides the "skinny" preset for the generic analytics adapter:
 * it reduces event payloads to the fields that are typically useful for analytics,
 * leaving out large or redundant data (such as full EIDs or repeated first party data).
 *
 * Enable it with `pbjs.enableAnalytics({provider: 'generic', options: {preset: 'skinny', ...}})`.
 */
import { submodule } from '../src/hook.js';
import { EVENTS } from '../src/constants.js';
import { deepClone } from '../src/utils/objects.js';
import type { EventMapping } from './genericAnalyticsAdapter.ts';
import type { BidderRequest, BidRequest } from '../src/adapterManager.ts';
import type { Bid } from '../src/bidfactory.ts';
import type { BidFloorData } from './priceFloors.ts';

export const PRESET_NAME = 'skinny';

type AnalyticsLabels = { analyticsLabels?: Record<string, unknown> };

export type SkinnyNoBid = {
  eventType: typeof EVENTS.NO_BID;
  auctionId: BidRequest<any>['auctionId'];
  bidId: BidRequest<any>['bidId'];
  bidderRequestId: BidRequest<any>['bidderRequestId'];
  adUnitCode: BidRequest<any>['adUnitCode'];
  bidder: BidRequest<any>['bidder'];
  source: BidRequest<any>['src'];
} & AnalyticsLabels;

export function noBid(bidRequest: BidRequest<any> & AnalyticsLabels): SkinnyNoBid {
  return {
    eventType: EVENTS.NO_BID,
    auctionId: bidRequest.auctionId,
    // so that the no-bid can be matched to its request in bidRequested, even when a bidder has several on an ad unit
    bidId: bidRequest.bidId,
    bidderRequestId: bidRequest.bidderRequestId,
    adUnitCode: bidRequest.adUnitCode,
    bidder: bidRequest.bidder,
    source: bidRequest.src,
    analyticsLabels: bidRequest.analyticsLabels,
  };
}

type SkinnyBidFields = Pick<Bid,
  'auctionId' | 'adUnitCode' | 'transactionId' | 'requestId' | 'adId' |
  'bidder' | 'bidderCode' | 'cpm' | 'currency' | 'originalCpm' | 'originalCurrency' |
  'mediaType' | 'width' | 'height' | 'size' | 'dealId' | 'meta' | 'adserverTargeting' |
  'requestTimestamp' | 'responseTimestamp' | 'timeToRespond' | 'ttl' | 'source'
> & {
  floorData?: BidFloorData;
} & AnalyticsLabels;

export type SkinnyBidResponse = SkinnyBidFields & {
  eventType: typeof EVENTS.BID_RESPONSE;
};

export type SkinnyBidWon = SkinnyBidFields & {
  eventType: typeof EVENTS.BID_WON;
  status: Bid['status'];
};

type BidWithExtras = Bid & AnalyticsLabels & { floorData?: BidFloorData };

function bidFields(bid: BidWithExtras): SkinnyBidFields {
  return {
    auctionId: bid.auctionId,
    adUnitCode: bid.adUnitCode,
    transactionId: bid.transactionId,
    requestId: bid.requestId,
    adId: bid.adId,
    bidder: bid.bidder,
    bidderCode: bid.bidderCode,
    cpm: bid.cpm,
    currency: bid.currency,
    originalCpm: bid.originalCpm,
    originalCurrency: bid.originalCurrency,
    mediaType: bid.mediaType,
    width: bid.width,
    height: bid.height,
    size: bid.size,
    dealId: bid.dealId,
    meta: bid.meta,
    adserverTargeting: bid.adserverTargeting,
    floorData: bid.floorData,
    requestTimestamp: bid.requestTimestamp,
    responseTimestamp: bid.responseTimestamp,
    timeToRespond: bid.timeToRespond,
    ttl: bid.ttl,
    source: bid.source,
    analyticsLabels: bid.analyticsLabels,
  };
}

export function bidResponse(bid: BidWithExtras): SkinnyBidResponse {
  return {
    eventType: EVENTS.BID_RESPONSE,
    ...bidFields(bid),
  };
}

export function bidWon(bid: BidWithExtras): SkinnyBidWon {
  return {
    eventType: EVENTS.BID_WON,
    ...bidFields(bid),
    status: bid.status,
  };
}

type ORTB2 = BidRequest<any>['ortb2'];

/**
 * List of unique sources across the EIDs in `ortb2.user` (both `user.eids` and `user.ext.eids`).
 */
export function eidsSources(ortb2: ORTB2): string[] {
  const user: any = ortb2?.user;
  const eids = [...(user?.eids ?? []), ...(user?.ext?.eids ?? [])];
  return [...new Set(eids.map(eid => eid?.source).filter(source => source != null))] as string[];
}

/**
 * Copy of `ortb2` without EIDs (which tend to be the bulk of it).
 */
export function stripEids(ortb2: ORTB2): ORTB2 {
  const user: any = ortb2?.user;
  if (user?.eids == null && user?.ext?.eids == null) {
    return ortb2;
  }
  const copy: any = deepClone(ortb2);
  delete copy.user.eids;
  if (copy.user.ext != null) {
    delete copy.user.ext.eids;
  }
  return copy;
}

export type SkinnyBidRequestFields = Pick<BidRequest<any>,
  'bidId' | 'bidderRequestId' | 'auctionId' | 'adUnitCode' | 'transactionId' | 'bidder' |
  'mediaTypes' | 'sizes' | 'auctionsCount' | 'bidRequestsCount' | 'bidderRequestsCount' | 'bidderWinsCount' |
  'ortb2Imp'
> & {
  source: BidRequest<any>['src'];
};

function bidRequestFields(bidRequest: BidRequest<any>): SkinnyBidRequestFields {
  return {
    bidId: bidRequest.bidId,
    bidderRequestId: bidRequest.bidderRequestId,
    auctionId: bidRequest.auctionId,
    adUnitCode: bidRequest.adUnitCode,
    transactionId: bidRequest.transactionId,
    bidder: bidRequest.bidder,
    source: bidRequest.src,
    mediaTypes: bidRequest.mediaTypes,
    sizes: bidRequest.sizes,
    auctionsCount: bidRequest.auctionsCount,
    bidRequestsCount: bidRequest.bidRequestsCount,
    bidderRequestsCount: bidRequest.bidderRequestsCount,
    bidderWinsCount: bidRequest.bidderWinsCount,
    ortb2Imp: bidRequest.ortb2Imp,
  };
}

export type SkinnyBidRequested = Pick<BidderRequest<any>,
  'auctionId' | 'bidderRequestId' | 'bidderCode' | 'auctionStart' | 'timeout' | 'ortb2'
> & {
  eventType: typeof EVENTS.BID_REQUESTED;
  start?: number;
  eidsSources: string[];
  bids: SkinnyBidRequestFields[];
} & AnalyticsLabels;

/**
 * Bid requests share the bidder request's `ortb2`, so it's sent only once, at the top level, and without EIDs
 * (only their sources are included, as `eidsSources`).
 */
export function bidRequested(bidderRequest: BidderRequest<any> & AnalyticsLabels & { start?: number }): SkinnyBidRequested {
  return {
    eventType: EVENTS.BID_REQUESTED,
    auctionId: bidderRequest.auctionId,
    bidderRequestId: bidderRequest.bidderRequestId,
    bidderCode: bidderRequest.bidderCode,
    auctionStart: bidderRequest.auctionStart,
    start: bidderRequest.start,
    timeout: bidderRequest.timeout,
    ortb2: stripEids(bidderRequest.ortb2),
    eidsSources: eidsSources(bidderRequest.ortb2),
    bids: (bidderRequest.bids ?? []).map(bidRequestFields),
    analyticsLabels: bidderRequest.analyticsLabels,
  };
}

export type SkinnyTimedOutBidderRequest = Pick<SkinnyBidRequested,
  'auctionId' | 'bidderRequestId' | 'bidderCode' | 'ortb2' | 'eidsSources' | 'bids'
>;

export type SkinnyBidTimeout = {
  eventType: typeof EVENTS.BID_TIMEOUT;
  bidderRequests: SkinnyTimedOutBidderRequest[];
} & AnalyticsLabels;

/**
 * Timed out bids are grouped by bidder request, in the same shape as `bidRequested`: `ortb2` (without EIDs) is
 * always on the bidder request, and `ortb2Imp` always on each bid.
 */
export function bidTimeout(args: BidRequest<any>[] | ({ [index: number]: BidRequest<any> } & AnalyticsLabels)): SkinnyBidTimeout {
  // when analytics labels are set, the analytics adapter spreads the event args into an object:
  // {analyticsLabels, 0: bidRequest, 1: bidRequest, ...}
  const bidRequests: BidRequest<any>[] = Array.isArray(args)
    ? args
    : Object.keys(args ?? {}).filter(key => /^\d+$/.test(key)).map(key => args[key]);
  const bidderRequests = new Map<string, SkinnyTimedOutBidderRequest>();
  bidRequests.forEach(bidRequest => {
    if (!bidderRequests.has(bidRequest.bidderRequestId)) {
      // bid requests share their bidder request's ortb2
      bidderRequests.set(bidRequest.bidderRequestId, {
        auctionId: bidRequest.auctionId,
        bidderRequestId: bidRequest.bidderRequestId,
        bidderCode: bidRequest.bidder,
        ortb2: stripEids(bidRequest.ortb2),
        eidsSources: eidsSources(bidRequest.ortb2),
        bids: [],
      });
    }
    bidderRequests.get(bidRequest.bidderRequestId).bids.push(bidRequestFields(bidRequest));
  });
  return {
    eventType: EVENTS.BID_TIMEOUT,
    bidderRequests: [...bidderRequests.values()],
    analyticsLabels: (args as AnalyticsLabels)?.analyticsLabels,
  };
}

export const skinnyEvents = {
  [EVENTS.NO_BID]: noBid,
  [EVENTS.BID_RESPONSE]: bidResponse,
  [EVENTS.BID_WON]: bidWon,
  [EVENTS.BID_REQUESTED]: bidRequested,
  [EVENTS.BID_TIMEOUT]: bidTimeout,
} satisfies EventMapping;

submodule('genericAnalytics', PRESET_NAME, skinnyEvents);
