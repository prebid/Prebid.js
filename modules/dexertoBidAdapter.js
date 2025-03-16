import {
  BANNER
} from '../src/mediaTypes.js';
import {
  registerBidder
} from '../src/adapters/bidderFactory.js';
import {
  getBannerRequest,
  getBannerResponse,
} from '../libraries/audUtils/bidderUtils.js';

const ENDPOINT_URL = 'https://rtb.dexerto.media/hb/dexerto';
// Export const spec
export const spec = {
  code: 'dexerto',
  supportedMediaTypes: BANNER,
  // Determines whether or not the given bid request is valid
  isBidRequestValid: (bid) => {
    return !!(bid.params.placement_id);
  },
  // Make a server request from the list of BidRequests
  buildRequests: (bidRequests, bidderRequest) => {
    return getBannerRequest(bidRequests, bidderRequest, ENDPOINT_URL);
  },
  // Unpack the response from the server into a list of bids.
  interpretResponse: (bidResponse, bidRequest) => {
    return getBannerResponse(bidResponse, BANNER);
  }
}

registerBidder(spec);
