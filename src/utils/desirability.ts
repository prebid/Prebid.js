import type { BidRequest } from '../adapterManager.ts';
import { bidderSettings } from '../bidderSettings.js';
import type { Bid } from '../bidfactory.ts';
import type { BidderCode } from '../types/common';
import { logError } from '../utils.js';
import { getBidAdjustmentFn } from './cpm.js';

export type SortByHighestDesirabilityDeps = {
  bs?: typeof bidderSettings;
};

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

  const adjustedCpm = bid.cpm;

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

/** Compare bids that already carry `.desirability` (e.g. after `adjustBids` in the auction). Higher wins. */
export function sortByHighestDesirability(a: Bid, b: Bid): number {
  if (b.desirability && a.desirability) {
    return b.desirability - a.desirability;
  }
  return b.cpm - a.cpm;
}
