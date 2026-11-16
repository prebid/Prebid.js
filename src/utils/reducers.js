import { DEFAULT_PRIORITY, PRIORITY_INCREMENT } from './desirability.js';

export function simpleCompare(a, b) {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

export function keyCompare(key = (item) => item) {
  return (a, b) => simpleCompare(key(a), key(b));
}

export function reverseCompare(compare = simpleCompare) {
  return (a, b) => -compare(a, b) || 0;
}

export function tiebreakCompare(...compares) {
  return function (a, b) {
    for (const cmp of compares) {
      const val = cmp(a, b);
      if (val !== 0) return val;
    }
    return 0;
  };
}

export function minimum(compare = simpleCompare) {
  return (min, item) => compare(item, min) < 0 ? item : min;
}

export function maximum(compare = simpleCompare) {
  return minimum(reverseCompare(compare));
}

const cpmCompare = keyCompare((bid) => bid.cpm);
const timestampCompare = keyCompare((bid) => bid.responseTimestamp);

// This function will get highest cpm value bid, in case of tie it will return the bid with lowest timeToRespond
export const getHighestCpm = maximum(tiebreakCompare(cpmCompare, reverseCompare(keyCompare((bid) => bid.timeToRespond))));

export function priorityCompare(left, right) {
  const a = left.priority ?? DEFAULT_PRIORITY;
  const b = right.priority ?? DEFAULT_PRIORITY;
  if (a === b) return 0;
  return a < b ? -PRIORITY_INCREMENT : PRIORITY_INCREMENT;
}

export function dealsFirst(a, b) {
  if (a.adserverTargeting.hb_deal !== undefined && b.adserverTargeting.hb_deal === undefined) {
    return -1;
  }
  if ((a.adserverTargeting.hb_deal === undefined && b.adserverTargeting.hb_deal !== undefined)) {
    return 1;
  }
  return 0;
}

export const bidDesirabilityCompare = tiebreakCompare(priorityCompare, keyCompare((bid) => bid.desirability ?? bid.cpm));

// Sort comparator that orders bids by `.desirability` (falling back to cpm), highest first.
export const highestDesirabilityFirst = reverseCompare(bidDesirabilityCompare);

// This function will get highest bid by `.desirability` (publisher `bidDesirabilityAdjustment` when set, else mirrors cpm via `adjustBids`);
// ties use lowest `timeToRespond`, matching {@link getHighestCpm}.
export const getHighestDesirability = maximum(
  tiebreakCompare(bidDesirabilityCompare, reverseCompare(keyCompare((bid) => bid.timeToRespond)))
);

// This function will get the oldest highest cpm value bid, in case of tie it will return the bid which came in first
// Use case for tie: https://github.com/prebid/Prebid.js/issues/2448
export const getOldestHighestCpmBid = maximum(tiebreakCompare(cpmCompare, reverseCompare(timestampCompare)));

// This function will get the latest highest cpm value bid, in case of tie it will return the bid which came in last
// Use case for tie: https://github.com/prebid/Prebid.js/issues/2539
export const getLatestHighestCpmBid = maximum(tiebreakCompare(cpmCompare, timestampCompare));
