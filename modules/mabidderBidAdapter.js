import { registerBidder } from '../src/adapters/bidderFactory.js';
import { config } from '../src/config.js';
import { BANNER } from '../src/mediaTypes.js';
const BIDDER_CODE = 'mabidder';
export const baseUrl = 'https://prometheus-ix.ecdrsvc.com/prometheus/bid';
export const spec = {
  code: BIDDER_CODE,
  isBidRequestValid: function(bid) {
    if (typeof bid.params === 'undefined') {
      return false;
    }
    return !!(bid.params.accountId && bid.params.placementId && bid.sizes)
  },
  buildRequests: function(validBidRequests, bidderRequest) {
    const referer = bidderRequest.refererInfo.referer || '';
    const fpd = config.getConfig('ortb2');
    return validBidRequests.map((bidRequest) => {
      let req = {
        url: baseUrl,
        method: 'POST',
        data: {
          v: $$PREBID_GLOBAL$$.version,
          referer: referer,
          bidId: bidRequest.bidId,
          auctionId: bidRequest.auctionId,
          transactionId: bidRequest.transactionId,
          adUnitCode: bidRequest.adUnitCode,
          bidRequestCount: bidRequest.bidRequestCount,
          params: bidRequest.params,
          sizes: bidRequest.sizes,
          mediaTypes: bidRequest.mediaTypes,
          fpd: fpd ? JSON.stringify(fpd) : JSON.stringify({})
        }
      };
      return req;
    });
  },
  interpretResponse: function(serverResponse, request) {
    const bidResponses = [];
    if (serverResponse.body) {
      const body = serverResponse.body;
      body.forEach((bidResponse) => {
        if (Array.isArray(bidResponse.advertiserDomains)) {
          bidResponse.meta = { advertiserDomains: bidResponse.advertiserDomains };
        } else {
          bidResponse.meta = { advertiserDomains: [] };
        }
        bidResponses.push(bidResponse);
      })
    }
    return bidResponses;
  },
  supportedMediaTypes: [BANNER]
}
registerBidder(spec);
