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

const URL = 'https://rtb.dochaseadx.com/hb';
// Export const spec
export const spec = {
  code: 'dochase',
  supportedMediaTypes: [BANNER, NATIVE],
  // Determines whether given bid request is valid or not
  isBidRequestValid: (bidRParam) => {
    return !!(bidRParam.params.placement_id);
  },
  // Make a server request from the list of BidRequests
  buildRequests: (bidRq, serverRq) => {
    // Get Requests based on media types
    return getBannerRequest(bidRq, serverRq, URL);
  },
  // Unpack the response from the server into a list of bids.
  interpretResponse: (bidRes, bidReq) => {
    let Response = {};
    const media = JSON.parse(bidReq.data)[0].MediaType;
    if (media === BANNER) {
      Response = getBannerResponse(bidRes, BANNER);
    } else if (media === NATIVE) {
      Response = getNativeResponse(bidRes, bidReq, NATIVE);
    }
    return Response;
  }
}

registerBidder(spec);
