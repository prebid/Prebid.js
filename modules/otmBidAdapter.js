import {BANNER} from '../src/mediaTypes.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';

export const spec = {
  code: 'otm',
  supportedMediaTypes: [BANNER],
  isBidRequestValid: function (bid) {
    return !!bid.params.tid;
  },
  buildRequests: function (bidRequests) {
    const requests = bidRequests.map(function (bid) {
      const size = getMaxPrioritySize(bid.sizes);
      const params = {
        tz: getTz(),
        w: size[0],
        h: size[1],
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

function getMaxPrioritySize(sizes) {
  var maxPrioritySize = null;

  const sizesByPriority = [
    [300, 250],
    [240, 400],
    [728, 90],
    [300, 600],
    [970, 250],
    [300, 50],
    [320, 100]
  ];

  const sizeToString = (size) => {
    return size[0] + 'x' + size[1];
  };

  const sizesAsString = sizes.map(sizeToString);

  sizesByPriority.forEach(size => {
    if (!maxPrioritySize) {
      if (sizesAsString.indexOf(sizeToString(size)) !== -1) {
        maxPrioritySize = size;
      }
    }
  });

  if (maxPrioritySize) {
    return maxPrioritySize;
  } else {
    return sizes[0];
  }
}

registerBidder(spec);
