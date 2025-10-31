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

const ENDPOINT = 'https://rtb-east.tapnative.com/hb';
// Export const spec
export const spec = {
  code: 'tapnative',
  supportedMediaTypes: [BANNER, NATIVE],
  // Determines whether or not the given bid request is valid
  isBidRequestValid: function(bidParam) {
    return !!(bidParam.params.placement_id);
  },
  // Make a server request from the list of BidRequests
  buildRequests: function(bidRequests, serverRequest) {
    // Get Requests based on media types
    return getBannerRequest(bidRequests, serverRequest, ENDPOINT);
  },
  // Unpack the response from the server into a list of bids.
  interpretResponse: function(serverResponse, serverRequest) {
    let bidderResponse = {};
    const mType = JSON.parse(serverRequest.data)[0].MediaType;
    if (mType === BANNER) {
      bidderResponse = getBannerResponse(serverResponse, BANNER);
    } else if (mType === NATIVE) {
      bidderResponse = getNativeResponse(serverResponse, serverRequest, NATIVE);
    }
    return bidderResponse;
  }
}

registerBidder(spec);
