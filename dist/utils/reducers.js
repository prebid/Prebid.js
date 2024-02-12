"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getOldestHighestCpmBid = exports.getLatestHighestCpmBid = exports.getHighestCpm = void 0;
exports.keyCompare = keyCompare;
exports.maximum = maximum;
exports.minimum = minimum;
exports.reverseCompare = reverseCompare;
exports.simpleCompare = simpleCompare;
exports.tiebreakCompare = tiebreakCompare;
function simpleCompare(a, b) {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}
function keyCompare() {
  let key = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : item => item;
  return (a, b) => simpleCompare(key(a), key(b));
}
function reverseCompare() {
  let compare = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : simpleCompare;
  return (a, b) => -compare(a, b) || 0;
}
function tiebreakCompare() {
  for (var _len = arguments.length, compares = new Array(_len), _key = 0; _key < _len; _key++) {
    compares[_key] = arguments[_key];
  }
  return function (a, b) {
    for (const cmp of compares) {
      const val = cmp(a, b);
      if (val !== 0) return val;
    }
    return 0;
  };
}
function minimum() {
  let compare = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : simpleCompare;
  return (min, item) => compare(item, min) < 0 ? item : min;
}
function maximum() {
  let compare = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : simpleCompare;
  return minimum(reverseCompare(compare));
}
const cpmCompare = keyCompare(bid => bid.cpm);
const timestampCompare = keyCompare(bid => bid.responseTimestamp);

// This function will get highest cpm value bid, in case of tie it will return the bid with lowest timeToRespond
const getHighestCpm = exports.getHighestCpm = maximum(tiebreakCompare(cpmCompare, reverseCompare(keyCompare(bid => bid.timeToRespond))));

// This function will get the oldest hightest cpm value bid, in case of tie it will return the bid which came in first
// Use case for tie: https://github.com/prebid/Prebid.js/issues/2448
const getOldestHighestCpmBid = exports.getOldestHighestCpmBid = maximum(tiebreakCompare(cpmCompare, reverseCompare(timestampCompare)));

// This function will get the latest hightest cpm value bid, in case of tie it will return the bid which came in last
// Use case for tie: https://github.com/prebid/Prebid.js/issues/2539
const getLatestHighestCpmBid = exports.getLatestHighestCpmBid = maximum(tiebreakCompare(cpmCompare, timestampCompare));