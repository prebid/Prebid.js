import {deepClone, delayExecution} from '../../src/utils.js';
import {createBid} from '../../src/bidfactory.js';
import {default as CONSTANTS} from '../../src/constants.json';

export function pbsBidInterceptor (next, interceptBids, s2sBidRequest, bidRequests, ajax, {
  onResponse,
  onError,
  onBid
}) {
  let responseArgs;
  const done = delayExecution(() => onResponse(...responseArgs), bidRequests.length + 1)
  function signalResponse(...args) {
    responseArgs = args;
    done();
  }
  function addBid(bid, bidRequest) {
    onBid({
      adUnit: bidRequest.adUnitCode,
      bid: Object.assign(createBid(CONSTANTS.STATUS.GOOD, bidRequest), bid)
    })
  }
  bidRequests = bidRequests
    .map((req) => interceptBids({bidRequest: req, addBid, done}).bidRequest)
    .filter((req) => req.bids.length > 0)

  if (bidRequests.length > 0) {
    const bidIds = new Set();
    bidRequests.forEach((req) => req.bids.forEach((bid) => bidIds.add(bid.bidId)));
    s2sBidRequest = deepClone(s2sBidRequest);
    s2sBidRequest.ad_units.forEach((unit) => {
      unit.bids = unit.bids.filter((bid) => bidIds.has(bid.bid_id));
    })
    s2sBidRequest.ad_units = s2sBidRequest.ad_units.filter((unit) => unit.bids.length > 0);
    next(s2sBidRequest, bidRequests, ajax, {onResponse: signalResponse, onError, onBid});
  } else {
    signalResponse(true, []);
  }
}
