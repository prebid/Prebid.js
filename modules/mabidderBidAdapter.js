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
    return !!(bid.params.accountId && bid.params.placementId && bid.params.ppid && bid.sizes && Array.isArray(bid.sizes) && Array.isArray(bid.sizes[0]))
  },
  buildRequests: function(validBidRequests, bidderRequest) {
    const referer = bidderRequest.refererInfo.referer || '';
    const fpd = config.getConfig('ortb2');
    const bids = [];

    validBidRequests.forEach(bidRequest => {
      bids.push({
        bidId: bidRequest.bidId,
        width: bidRequest.sizez[0][0],
        height: bidRequest.sizes[0][1],
        accountId: bidRequest.params.accountId,
        placementId: bidRequest.params.placementId,
        ppid: bidRequest.params.ppid,
        mediaTypes: bidRequest.mediaTypes,
        transactionId: bidRequest.transactionId,
      })
    });

    const req = {
        url: baseUrl,
        method: 'POST',
        data: {
          v: $$PREBID_GLOBAL$$.version,
          referer: referer,
          bids: bids,
          fpd: fpd ? JSON.stringify(fpd) : JSON.stringify({})
        }
    };

    return req;
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
