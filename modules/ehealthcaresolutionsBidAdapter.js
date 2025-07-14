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

const ENDPOINT_URL = 'https://rtb.ehealthcaresolutions.com/hb';
// Export const spec
export const spec = {
  code: 'ehealthcaresolutions',
  supportedMediaTypes: [BANNER, NATIVE],
  // Determines whether or not the given bid request is valid
  isBidRequestValid: (bParam) => {
    return !!(bParam.params.placement_id);
  },
  // Make a server request from the list of BidRequests
  buildRequests: (bidRequests, serverRequest) => {
    // Get Requests based on media types
    return getBannerRequest(bidRequests, serverRequest, ENDPOINT_URL);
  },
  // Unpack the response from the server into a list of bids.
  interpretResponse: (bResponse, bRequest) => {
    let Response = {};
    const mediaType = JSON.parse(bRequest.data)[0].MediaType;
    if (mediaType === BANNER) {
      Response = getBannerResponse(bResponse, BANNER);
    } else if (mediaType === NATIVE) {
      Response = getNativeResponse(bResponse, bRequest, NATIVE);
    }
    return Response;
  }
}

registerBidder(spec);
