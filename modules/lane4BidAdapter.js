import {
  BANNER,
  NATIVE
} from '../src/mediaTypes.js';
import {
  registerBidder
} from '../src/adapters/bidderFactory.js';
import {
  getBannerRequest,
  getBannerResponse,
  getNativeResponse,
} from '../libraries/audUtils/bidderUtils.js';

const EP = 'https://rtb.lane4.io/hb';
// Export const spec
export const spec = {
  code: 'lane4',
  supportedMediaTypes: [BANNER, NATIVE],
  // Determines whether or not the given bid request is valid
  isBidRequestValid: (bidRequestParam) => {
    return !!(bidRequestParam.params.placement_id);
  },
  // Make a server request from the list of BidRequests
  buildRequests: (bidR, serverR) => {
    // Get Requests based on media types
    return getBannerRequest(bidR, serverR, EP);
  },
  // Unpack the response from the server into a list of bids.
  interpretResponse: (bidRS, bidRQ) => {
    let Response = {};
    const mediaType = JSON.parse(bidRQ.data)[0].MediaType;
    if (mediaType === BANNER) {
      Response = getBannerResponse(bidRS, BANNER);
    } else if (mediaType === NATIVE) {
      Response = getNativeResponse(bidRS, bidRQ, NATIVE);
    }
    return Response;
  }
}

registerBidder(spec);
