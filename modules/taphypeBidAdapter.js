import {registerBidder} from '../src/adapters/bidderFactory.js';

export const spec = {
  code: 'taphype',
  isBidRequestValid: function (bid) {
    return !!bid.params.placementId;
  },
  buildRequests: function (bidRequests) {
    const requests = bidRequests.map(function (bid) {
      const params = {
        placementId: bid.params.placementId,
        url: encodeURIComponent(window.location.href),
        size: bid.sizes[0][0] + 'x' + bid.sizes[0][1],
        rnd: Math.random(),
        bidId: bid.bidId,
      };

      return {method: 'GET', url: 'https://us-central1-taphype-internal.cloudfunctions.net/th-prebid', data: params, options: {withCredentials: false}}
    });

    return requests;
  },
  interpretResponse: function (serverResponse, bidRequest) {
    if (!serverResponse || !serverResponse.body || !serverResponse.body.ad) {
      return [];
    }

    const bid = serverResponse.body;
    const sizes = bid.size.split(',');

    return [{
      requestId: bidRequest.data.bidId,
      cpm: bid.price,
      width: sizes[0],
      height: sizes[1],
      creativeId: bidRequest.data.bidId,
      currency: bid.currency || 'USD',
      netRevenue: true,
      ad: bid.ad,
      ttl: 360
    }];
  },
};

registerBidder(spec);
