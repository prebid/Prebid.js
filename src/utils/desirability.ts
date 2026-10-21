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
  if (bidderRequest?.allowPriorityBids && Number.isFinite(pacingAdjustedCpm) && pacingAdjustedCpm >= 0) {
    const adjusted = adjustCpm(pacingAdjustedCpm, bid, bidRequest, { bs });
    // like adjustBids, ignore adjustments that would make the value negative
    return adjusted >= 0 ? adjusted : pacingAdjustedCpm;
  }
  return bid.cpm;
}

export function getPriority(bid: Bid, bidderRequest: BidderRequest<any>) {
  if (bidderRequest?.allowPriorityBids && Number.isFinite(bid.meta?.deal?.priority)) {
    return bid.meta.deal.priority;
  }
  return DEFAULT_PRIORITY;
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
