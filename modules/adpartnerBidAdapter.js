import { registerBidder } from '../src/adapters/bidderFactory.js';
import { createBuildRequests, interpretMIResponse, createOnBidWon, getUserSyncs, postRequest } from '../libraries/mediaImpactUtils/index.js';

const BIDDER_CODE = 'adpartner';
export const ENDPOINT_PROTOCOL = 'https';
export const ENDPOINT_DOMAIN = 'a4p.adpartner.pro';
export const ENDPOINT_PATH = '/hb/bid';

export const spec = {
  code: BIDDER_CODE,

  isBidRequestValid: function (bidRequest) {
    return !!parseInt(bidRequest.params.unitId) || !!parseInt(bidRequest.params.partnerId);
  },

  buildRequests: createBuildRequests(ENDPOINT_PROTOCOL, ENDPOINT_DOMAIN, ENDPOINT_PATH),

  interpretResponse: function (serverResponse, bidRequest) {
    return interpretMIResponse(serverResponse, bidRequest, spec);
  },

  adResponse: function (bid, ad) {
    const bidObject = {
      requestId: bid.bidId,
      ad: ad.ad,
      cpm: ad.cpm,
      width: ad.width,
      height: ad.height,
      ttl: 60,
      creativeId: ad.creativeId,
      netRevenue: ad.netRevenue,
      currency: ad.currency,
      winNotification: ad.winNotification,
      meta: ad.adomain && ad.adomain.length > 0 ? { advertiserDomains: ad.adomain } : {},
    };

    return bidObject;
  },

  onBidWon: function (data) {
    return createOnBidWon(ENDPOINT_PROTOCOL, ENDPOINT_DOMAIN, postRequest)(data);
  },

  getUserSyncs: getUserSyncs,
};

registerBidder(spec);
