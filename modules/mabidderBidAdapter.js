import { registerBidder } from '../src/adapters/bidderFactory.js';
import { config } from '../src/config.js';
import { BANNER, VIDEO, NATIVE } from '../src/mediaTypes.js';
import { deepAccess } from '../src/utils.js';
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
    const fpd = config.getConfig('ortb2');
    const bids = [];

    validBidRequests.forEach(bidRequest => {
      const sizes = [];
      bidRequest.sizes.forEach(size => {
        sizes.push({
          width: size[0],
          height: size[1]
        });
      });
      bids.push({
        bidId: bidRequest.bidId,
        sizes: sizes,
        ppid: bidRequest.params.ppid,
        mediaType: getFormatType(bidRequest)
      })
    });
    const req = {
        url: baseUrl,
        method: 'POST',
        data: {
          v: $$PREBID_GLOBAL$$.version,
          bids: bids,
          url: bidderRequest.refererInfo.canonicalUrl || '',
          referer: bidderRequest.refererInfo.referer || '',
          fpd: fpd ? JSON.stringify(fpd) : JSON.stringify({})
        }
    };

    return req;
  },
  interpretResponse: function(serverResponse, request) {
    const bidResponses = [];
    if (serverResponse.body) {
      const body = serverResponse.body;
      if (!body || typeof body !== 'object' || !body.Responses || !body.Responses.length > 0) {
        return [];
      }
      body.Responses.forEach((bidResponse) => {
        bidResponses.push(bidResponse);
      });
    }
    return bidResponses;
  },
  supportedMediaTypes: [BANNER]
}

function getFormatType(bidRequest) {
  if (deepAccess(bidRequest, 'mediaTypes.banner')) return BANNER
  if (deepAccess(bidRequest, 'mediaTypes.video')) return VIDEO
  if (deepAccess(bidRequest, 'mediaTypes.native')) return NATIVE
  return BANNER
}
registerBidder(spec);
