import { getBufferedTTL } from '../bidTTL.ts';
import { BID_STATUS } from '../constants.ts';
import { timestamp } from '../utils.js';
import { lock } from './lock.ts';

// return unexpired bids
const isBidNotExpired = (bid) => (bid.responseTimestamp + getBufferedTTL(bid) * 1000) > timestamp();

// return bids whose status is not set. Winning bids can only have a status of `rendered`.
const isUnusedBid = (bid) => bid && ((bid.status && ![BID_STATUS.RENDERED].includes(bid.status)) || !bid.status);

const isBidNotLocked = (bid) => !lock.isLocked(bid.adserverTargeting);

export const bidFilters = {
  isBidNotExpired,
  isUnusedBid,
  isBidNotLocked
};

export function isBidUsable(bid) {
  return !Object.values(bidFilters).some((predicate) => !predicate(bid));
}