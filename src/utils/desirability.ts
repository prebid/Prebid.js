import type { BidderRequest, BidRequest } from '../adapterManager.ts';
import { bidderSettings } from '../bidderSettings.js';
import type { Bid } from '../bidfactory.ts';
import type { BidderCode } from '../types/common';
import { logError } from '../utils.js';
import { adjustCpm, getBidAdjustmentFn } from './cpm.js';

export const DEFAULT_PRIORITY = 12;
export const PRIORITY_INCREMENT = -1; // lower number is higher priority

export type SortByHighestDesirabilityDeps = {
  bs?: typeof bidderSettings;
  /**
   * The bidder request the bid answers; its `allowPriorityBids` tells whether the publisher trusts the bid's deal metadata.
   */
  bidderRequest?: BidderRequest<any>;
};

/**
 * The CPM that desirability starts from: `meta.deal.priorityAdjustedCpm` for bids from adapters the publisher
 * allows priority bids from, otherwise `cpm`. The priority-adjusted value goes through `bidCpmAdjustment`
 * like the bid's own `cpm` (which has already been adjusted by the time this runs).
 */
function getRankingCpm(
  bid: Bid,
  bidRequest: BidRequest<BidderCode> | undefined | null,
  bidderRequest: BidderRequest<any> | undefined | null,
  bs: typeof bidderSettings,
): number {
  const priorityAdjustedCpm = bid.meta?.deal?.priorityAdjustedCpm;
  if (bidderRequest?.allowPriorityBids && Number.isFinite(priorityAdjustedCpm) && priorityAdjustedCpm >= 0) {
    const adjusted = adjustCpm(priorityAdjustedCpm, bid, bidRequest, { bs });
    // like adjustBids, ignore adjustments that would make the value negative
    return adjusted >= 0 ? adjusted : priorityAdjustedCpm;
  }
  return bid.cpm;
}

/**
 * `meta.deal.type` of house deals: an ad server's lowest tier, meant to fill only when nothing else does.
 */
export const HOUSE_DEAL_TYPE = 4;
/**
 * Priority given to house bids that don't come with a trusted priority of their own, so that they rank below
 * ordinary demand (which has `DEFAULT_PRIORITY`).
 */
export const HOUSE_PRIORITY = 16;

/**
 * True for house bids (`meta.deal.type` 4) from adapters the publisher allows house bids from
 * (`bidderRequest.allowHouseBids`).
 */
export function isHouseBid(bid: Partial<Bid>, bidderRequest: BidderRequest<any> | undefined | null): boolean {
  return bidderRequest?.allowHouseBids === true && bid.meta?.deal?.type === HOUSE_DEAL_TYPE;
}

export function getPriority(bid: Bid, bidderRequest: BidderRequest<any>) {
  if (bidderRequest?.allowPriorityBids && Number.isFinite(bid.meta?.deal?.priority)) {
    return bid.meta.deal.priority;
  }
  if (isHouseBid(bid, bidderRequest)) {
    return HOUSE_PRIORITY;
  }
  return DEFAULT_PRIORITY;
}

/**
 * Whether a bid's CPM is high enough for it to be used: above 0, or 0 if the bidder allows zero-CPM bids
 * (`allowZeroCpmBids`) or the bid is an allowed house bid (`bid.houseBid`, set by `adjustBids`).
 */
export function isCpmEligible(bid: Bid, { bs = bidderSettings }: { bs?: typeof bidderSettings } = {}): boolean {
  return (bs.get(bid.bidderCode, 'allowZeroCpmBids') === true || bid.houseBid === true) ? bid.cpm >= 0 : bid.cpm > 0;
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
