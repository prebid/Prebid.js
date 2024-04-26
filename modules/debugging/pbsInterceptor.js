import {deepClone, delayExecution} from '../../src/utils.js';
import { STATUS } from '../../src/constants.js';

export function makePbsInterceptor({createBid}) {
  return function pbsBidInterceptor(next, interceptBids, s2sBidRequest, bidRequests, ajax, {
    onResponse,
    onError,
    onBid,
    onFledge,
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
        bid: Object.assign(createBid(STATUS.GOOD, bidRequest), bid)
      })
    }
    bidRequests = bidRequests
      .map((req) => interceptBids({
        bidRequest: req,
        addBid,
        addPaapiConfig(config, bidRequest, bidderRequest) {
          onFledge({
            adUnitCode: bidRequest.adUnitCode,
            ortb2: bidderRequest.ortb2,
            ortb2Imp: bidRequest.ortb2Imp,
            config
          })
        },
        done
      }).bidRequest)
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
}
