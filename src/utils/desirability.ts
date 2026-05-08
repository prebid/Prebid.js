import { auctionManager } from '../auctionManager.js';
import type { BidRequest } from '../adapterManager.ts';
import { bidderSettings } from '../bidderSettings.js';
import type { Bid } from '../bidfactory.ts';
import type { BidderCode } from '../types/common';
import { logError } from '../utils.js';

export type SortByHighestDesirabilityDeps = {
  index?: { getBidRequest(bid: Bid): BidRequest<BidderCode> | undefined };
  bs?: typeof bidderSettings;
};

/**
 * Numeric score for targeting sort (higher wins). Uses publisher `bidDesirabilityAdjustment` when configured;
 * otherwise returns `bid.cpm`. The hook is assumed to return a number.
 */
export function bidDesirabilityScore(bid: Bid, deps: SortByHighestDesirabilityDeps = {}): number {
  const index = deps.index ?? auctionManager.index;
  const bs = deps.bs ?? bidderSettings;
  const bidRequest = index.getBidRequest(bid);
  const adapterCode = bid.adapterCode;
  const bidderCode = bid.bidderCode ?? bidRequest?.bidder;
  const useAdapterScope = Boolean(bs.get(adapterCode, 'adjustAlternateBids'));
  const adjust =
    bs.getOwn(bidderCode, 'bidDesirabilityAdjustment') ??
    bs.get(useAdapterScope ? adapterCode : bidderCode, 'bidDesirabilityAdjustment');

  if (typeof adjust !== 'function') {
    return bid.cpm;
  }

  try {
    return adjust(bid.cpm, Object.assign({}, bid) as Bid, bidRequest);
  } catch (e) {
    logError('Error during bid desirability adjustment', e);
    return bid.cpm;
  }
}

/** Sort comparator: descending by {@link bidDesirabilityScore}. Same order as raw CPM when no adjustment is set. */
export function sortByHighestDesirability(a: Bid, b: Bid, deps: SortByHighestDesirabilityDeps = {}): number {
  const resolved: SortByHighestDesirabilityDeps = {
    index: auctionManager.index,
    bs: bidderSettings,
    ...deps,
  };
  return bidDesirabilityScore(b, resolved) - bidDesirabilityScore(a, resolved);
}
