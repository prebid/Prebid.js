import { parseSizesInput } from '../src/utils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';

const BIDDER_CODE = 'vuukle';
const URL = 'https://pb.vuukle.com/adapter';
const TIME_TO_LIVE = 360;

export const spec = {
  code: BIDDER_CODE,

  isBidRequestValid: function(bid) {
    return true
  },

  buildRequests: function(bidRequests) {
    const requests = bidRequests.map(function (bid) {
      const parseSized = parseSizesInput(bid.sizes);
      const arrSize = parseSized[0].split('x');
      const params = {
        url: encodeURIComponent(window.location.href),
        sizes: JSON.stringify(parseSized),
        width: arrSize[0],
        height: arrSize[1],
        params: JSON.stringify(bid.params),
        rnd: Math.random(),
        bidId: bid.bidId,
        source: 'pbjs',
        version: '$prebid.version$',
        v: 1,
      };

      return {
        method: 'GET',
        url: URL,
        data: params,
        options: {withCredentials: false}
      }
    });

    return requests;
  },

  interpretResponse: function(serverResponse, bidRequest) {
    if (!serverResponse || !serverResponse.body || !serverResponse.body.ad) {
      return [];
    }

    const res = serverResponse.body;
    const bidResponse = {
      requestId: bidRequest.data.bidId,
      cpm: res.cpm,
      width: res.width,
      height: res.height,
      creativeId: res.creative_id,
      currency: res.currency || 'USD',
      netRevenue: true,
      ttl: TIME_TO_LIVE,
      ad: res.ad,
      meta: {
        advertiserDomains: Array.isArray(res.adomain) ? res.adomain : []
      }
    };

    return [bidResponse];
  },
}
registerBidder(spec);
