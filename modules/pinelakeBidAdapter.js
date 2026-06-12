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

const URL = 'https://rtb.pinelake.media/hb';
// Export const spec
export const spec = {
  code: 'pinelake',
  supportedMediaTypes: [BANNER, NATIVE],
  // Determines whether given bid request is valid or not
  isBidRequestValid: (bidReq) => {
    return !!(bidReq.params.placement_id);
  },
  // Make a server request from the list of BidRequests
  buildRequests: (bidRequest, serverRequest) => {
    // Get Requests based on media types
    return getBannerRequest(bidRequest, serverRequest, URL);
  },
  // Unpack the response from the server into a list of bids.
  interpretResponse: (bidResp, bidRq) => {
    let Response = {};
    const media = JSON.parse(bidRq.data)[0].MediaType;
    if (media === BANNER) {
      Response = getBannerResponse(bidResp, BANNER);
    } else if (media === NATIVE) {
      Response = getNativeResponse(bidResp, bidRq, NATIVE);
    }
    return Response;
  }
}

registerBidder(spec);
