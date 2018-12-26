import {BANNER} from 'src/mediaTypes';
import {registerBidder} from 'src/adapters/bidderFactory';

export const spec = {
  code: 'otm',
  supportedMediaTypes: [BANNER],
  isBidRequestValid: function (bid) {
    return !!bid.params.pid && !!bid.params.tid;
  },
  buildRequests: function (bidRequests) {
    const requests = bidRequests.map(function (bid) {
      const params = {
        pid: bid.params.pid,
        tid: bid.params.tid,
        bidfloor: bid.params.bidfloor,
        url: encodeURIComponent(window.location.href),
        size: bid.sizes[0][0] + 'x' + bid.sizes[0][1],
        resp_type: 'json',
        rnd: Math.random(),
        bidId: bid.bidId,
      };

      return {method: 'GET', url: 'https://ads2.otm-r.com/banner/hb', data: params}
    });

    return requests;
  },
  interpretResponse: function (serverResponse, bidRequest) {
    if (!serverResponse || !serverResponse.body || !serverResponse.body.ad) {
      return [];
    }

    const bid = serverResponse.body;
    const sizes = bid.size.split('x');

    return [{
      requestId: bidRequest.data.bidId,
      cpm: bid.price,
      width: sizes[0],
      height: sizes[1],
      creativeId: bidRequest.data.bidId,
      currency: bid.currency || 'RUB',
      netRevenue: true,
      ad: bid.ad,
      ttl: 360
    }];
  },
};

registerBidder(spec);
