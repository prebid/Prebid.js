export function simpleCompare(a, b) {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

export function keyCompare(key = (item) => item) {
  return (a, b) => simpleCompare(key(a), key(b))
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
  }
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
export const getHighestCpm = maximum(tiebreakCompare(cpmCompare, reverseCompare(keyCompare((bid) => bid.timeToRespond))))

// This function will get the oldest hightest cpm value bid, in case of tie it will return the bid which came in first
// Use case for tie: https://github.com/prebid/Prebid.js/issues/2448
export const getOldestHighestCpmBid = maximum(tiebreakCompare(cpmCompare, reverseCompare(timestampCompare)))

// This function will get the latest hightest cpm value bid, in case of tie it will return the bid which came in last
// Use case for tie: https://github.com/prebid/Prebid.js/issues/2539
export const getLatestHighestCpmBid = maximum(tiebreakCompare(cpmCompare, timestampCompare))
