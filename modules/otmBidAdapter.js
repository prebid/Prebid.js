import {BANNER} from 'src/mediaTypes';
import {registerBidder} from 'src/adapters/bidderFactory';

export const spec = {
  code: 'otm',
  supportedMediaTypes: [BANNER],
  isBidRequestValid: function (bid) {
    return !!bid.params.tid;
  },
  buildRequests: function (bidRequests) {
    const requests = bidRequests.map(function (bid) {
      const params = {
        tz: getTz(),
        w: bid.sizes[0][0],
        h: bid.sizes[0][1],
        s: bid.params.tid,
        bidid: bid.bidId,
        transactionid: bid.transactionId,
        auctionid: bid.auctionId,
        bidfloor: bid.params.bidfloor
      };

      return {method: 'GET', url: 'https://ssp.otm-r.com/adjson', data: params}
    });

    return requests;
  },
  interpretResponse: function (serverResponse, bidRequest) {
    if (!serverResponse || !serverResponse.body) {
      return [];
    }

    const answer = [];

    serverResponse.body.forEach(bid => {
      if (bid.ad) {
        answer.push({
          requestId: bid.bidid,
          cpm: bid.cpm,
          width: bid.w,
          height: bid.h,
          creativeId: bid.creativeid,
          currency: bid.currency || 'RUB',
          netRevenue: true,
          ad: bid.ad,
          ttl: bid.ttl,
          transactionId: bid.transactionid
        });
      }
    });

    return answer;
  },
};

function getTz() {
  return new Date().getTimezoneOffset();
}

registerBidder(spec);
