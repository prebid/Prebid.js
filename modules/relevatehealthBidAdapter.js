import {
  registerBidder
} from '../src/adapters/bidderFactory.js';
import {
  BANNER
} from '../src/mediaTypes.js';
import {
  getBannerRequest,
  getBannerResponse
} from '../libraries/audUtils/bidderUtils.js';

const BCODE = 'relevatehealth';
const ENDPOINT_URL = 'https://rtb.relevate.health/prebid/relevate';

export const spec = {
  code: BCODE,
  supportedMediaTypes: BANNER,
  // Determines whether given bid request is valid or not
  isBidRequestValid: (bidReqParam) => {
    return !!(bidReqParam.params.placement_id);
  },
  // Make a server request from the list of BidRequests
  buildRequests: (bidReq, serverReq) => {
    // Get Requests based on media types
    return getBannerRequest(bidReq, serverReq, ENDPOINT_URL);
  },
  // Unpack the response from the server into a list of bids.
  interpretResponse: (bidResp, bidReq) => {
    const Response = getBannerResponse(bidResp, BANNER);
    return Response;
  }
}

registerBidder(spec);
