import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER } from '../src/mediaTypes.js';
import { getGlobal } from '../src/prebidGlobal.js';
import { ortbConverter } from '../libraries/ortbConverter/converter.js';

const BIDDER_CODE = 'mabidder';
export const baseUrl = 'https://prebid.ecdrsvc.com/bid';
const converter = ortbConverter({})

export const spec = {
  supportedMediaTypes: [BANNER],
  code: BIDDER_CODE,
  isBidRequestValid: function(bid) {
    if (typeof bid.params === 'undefined') {
      return false;
    }
    return !!(bid.params.ppid && bid.sizes && Array.isArray(bid.sizes) && Array.isArray(bid.sizes[0]))
  },
  buildRequests: function(validBidRequests, bidderRequest) {
    const fpd = converter.toORTB({ bidRequests: validBidRequests, bidderRequest: bidderRequest });

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
        mediaType: BANNER
      })
    });
    const req = {
      url: baseUrl,
      method: 'POST',
      data: {
        v: getGlobal().version,
        bids: bids,
        url: bidderRequest.refererInfo.page || '',
        referer: bidderRequest.refererInfo.ref || '',
        fpd: fpd || {}
      }
    };

    return req;
  },
  interpretResponse: function(serverResponse, request) {
    const bidResponses = [];
    if (serverResponse.body) {
      const body = serverResponse.body;
      if (!body || typeof body !== 'object' || !body.Responses || !(body.Responses.length > 0)) {
        return [];
      }
      body.Responses.forEach((bidResponse) => {
        bidResponses.push(bidResponse);
      });
    }
    return bidResponses;
  }
}
registerBidder(spec);
