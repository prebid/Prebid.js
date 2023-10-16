import { registerBidder } from '../src/adapters/bidderFactory.js'

import { BANNER, VIDEO } from '../src/mediaTypes.js'

const ENDPOINT = '//prebid.vlyby.com/';
const BIDDER_CODE = 'vlyby';

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [VIDEO, BANNER],

  isBidRequestValid: function (bid) {
    if (bid && bid.params && bid.params.publisherId) {
      return true
    }
    return false
  },

  buildRequests: function (validBidRequests, bidderRequest = {}) {
    const gdprConsent = bidderRequest.gdprConsent || {};
    return {
      method: 'POST',
      url: `${ENDPOINT}`,
      data: {
        request: {
          auctionId: bidderRequest.auctionId
        },
        gdprConsent: {
          consentString: gdprConsent.consentString,
          gdprApplies: gdprConsent.gdprApplies
        },
        bidRequests: validBidRequests.map(({ params, sizes, bidId, adUnitCode }) => ({
          bidId,
          adUnitCode,
          params,
          sizes
        }))
      },
      options: {
        withCredentials: false,
        contentType: 'application/json'
      },
      validBidRequests: validBidRequests,
    }
  },
  interpretResponse: function(serverResponse, bidRequest) {
    const bidResponses = [];
    if (serverResponse.body) {
      const vHB = serverResponse.body.bids;
      try {
        let bidResponse = {
          requestId: vHB.bid,
          cpm: vHB.cpm,
          width: vHB.size.width,
          height: vHB.size.height,
          creativeId: vHB.creative.id,
          currency: 'EUR',
          netRevenue: true,
          ttl: 360,
          ad: vHB.creative.ad,
          meta: {
            adomain: vHB.adomain && Array.isArray(vHB.adomain) ? vHB.adomain : []
          }
        };
        bidResponses.push(bidResponse);
      } catch (e) { }
    }
    return bidResponses;
  }
};
registerBidder(spec);
