import type { BidderRequest, BidRequest } from '../adapterManager.ts';
import { bidderSettings } from '../bidderSettings.js';
import type { Bid } from '../bidfactory.ts';
import type { BidderCode } from '../types/common';
import { S2S } from '../constants.js';
import { logError } from '../utils.js';
import { adjustCpm, getBidAdjustmentFn } from './cpm.js';

export type SortByHighestDesirabilityDeps = {
  bs?: typeof bidderSettings;
  /**
   * The bidder request the bid answers; tells whether it came from a Prebid Server instance that allows priority bids.
   */
  bidderRequest?: BidderRequest<any>;
};

/**
 * Whether the publisher trusts this bid's deal metadata: `s2sConfig.allowPriorityBids` (and a matching seat) for Prebid Server bids,
 * otherwise `bidderSettings[adapterCode].allowPriorityBids` (adapter-specific settings only, not `standard`).
 */
export function isPriorityBidAllowed(
  bid: Bid,
  bidderRequest: BidderRequest<any> | undefined | null,
  bs: typeof bidderSettings = bidderSettings,
): boolean {
  if (bid.source === S2S.SRC || bidderRequest?.src === S2S.SRC) {
    // Prebid Server may not act on ext.prebid.allowprioritybids yet, so trust only bids whose seat is the bidder
    // they were requested for, and only if that bidder is in the trusted list sent to Prebid Server. Bids under
    // alternate or unknown seats, or without a matching request, are never trusted.
    if (bidderRequest?.src !== S2S.SRC || bid.bidderCode == null || bid.bidderCode !== bidderRequest.bidderCode) {
      return false;
    }
    const allowed = bidderRequest.allowPriorityBids;
    return allowed === true || (Array.isArray(allowed) && allowed.includes(bid.bidderCode));
  }
  const adapterCode = bid.adapterCode ?? bidderRequest?.bidderCode ?? bid.bidderCode;
  // a null scope would resolve to `standard`, which must not opt adapters in
  return adapterCode != null && bs.getOwn(adapterCode, 'allowPriorityBids') === true;
}

/**
 * The CPM that desirability starts from: `meta.deal.pacingAdjustedCpm` for bids from adapters the publisher
 * allows priority bids from, otherwise `cpm`. The pacing-adjusted value goes through `bidCpmAdjustment`
 * like the bid's own `cpm` (which has already been adjusted by the time this runs).
 */
function getRankingCpm(
  bid: Bid,
  bidRequest: BidRequest<BidderCode> | undefined | null,
  bidderRequest: BidderRequest<any> | undefined | null,
  bs: typeof bidderSettings,
): number {
  const pacingAdjustedCpm = bid.meta?.deal?.pacingAdjustedCpm;
  if (typeof pacingAdjustedCpm === 'number' && Number.isFinite(pacingAdjustedCpm) && pacingAdjustedCpm >= 0 &&
    isPriorityBidAllowed(bid, bidderRequest, bs)) {
    const adjusted = adjustCpm(pacingAdjustedCpm, bid, bidRequest, { bs });
    // like adjustBids, ignore adjustments that would make the value negative
    return adjusted >= 0 ? adjusted : pacingAdjustedCpm;
  }
  return bid.cpm;
}

type BidAdjustmentFn = (
  cpm: number,
  bid: Bid,
  bidRequest: BidRequest<BidderCode> | undefined | null
) => number;

export function adjustDesirability(
  bid: Bid,
  bidRequest: BidRequest<BidderCode> | undefined | null,
  deps: SortByHighestDesirabilityDeps = {},
): number {
  const bs = deps.bs ?? bidderSettings;
  const bidCopy = Object.assign({}, bid) as Bid;

  const adjustedCpm = getRankingCpm(bid, bidRequest, deps.bidderRequest, bs);

  const bidDesirabilityAdjustment = getBidAdjustmentFn(bid, bs, 'bidDesirabilityAdjustment', bidRequest) as BidAdjustmentFn | undefined;
  if (typeof bidDesirabilityAdjustment !== 'function') {
    return adjustedCpm;
  }

  try {
    return bidDesirabilityAdjustment(adjustedCpm, bidCopy, bidRequest);
  } catch (e) {
    logError('Error during bid desirability adjustment', e);
    return adjustedCpm;
  }
}
