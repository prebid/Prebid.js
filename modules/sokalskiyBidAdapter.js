import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER } from '../src/mediaTypes.js';

const ENDPOINT_URL = 'our path';
const BIDDER_CODE = 'sokalskiy';
const TTL = 300;
const CURRENCY = 'USD';

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER],

  isBidRequestValid: function(bid) {
    return !!(bid.params && bid.params.placementId);
  },

  buildRequests: function(validBidRequests, bidderRequest) {
    const payload = {
      auctionId: bidderRequest.auctionId,
      bids: validBidRequests.map(bid => ({
        bidId: bid.bidId,
        placementId: bid.params.placementId,
        sizes: bid.mediaTypes?.banner?.sizes || bid.sizes,
        adUnitCode: bid.adUnitCode,
      }))
    };

    const payloadString = JSON.stringify(payload);

    return [{
      method: 'POST',
      url: ENDPOINT_URL,
      data: payloadString,
    }];
  },

  interpretResponse: function(serverResponse, bidRequest) {
    const serverBody = serverResponse.body;
    const bidResponses = [];

    if (!serverBody || !Array.isArray(serverBody)) {
      return bidResponses;
    }

    serverBody.forEach(bid => {
      bidResponses.push({
        requestId: bid.requestId,
        cpm: bid.cpm,
        width: bid.width,
        height: bid.height,
        creativeId: bid.creativeId || bid.requestId,
        currency: bid.currency || CURRENCY,
        netRevenue: true,
        ttl: TTL,
        ad: bid.ad,
        mediaType: BANNER
      });
    });

    return bidResponses;
  }
}

registerBidder(spec);
