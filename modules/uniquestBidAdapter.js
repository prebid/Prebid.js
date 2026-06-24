import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER } from '../src/mediaTypes.js';
import { interpretResponse, buildQueryString } from '../libraries/uniquestUtils/uniquestUtils.js';

/**
 * @typedef {import('../src/adapters/bidderFactory').Bid} Bid
 * @typedef {import('../src/adapters/bidderFactory').BidRequest} BidRequest
 * @typedef {import('../src/auction').BidderRequest} BidderRequest
 */

const BIDDER_CODE = 'uniquest';
const ENDPOINT = 'https://adpb.ust-ad.com/hb/prebid';

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER],

  /**
   * Determines whether or not the given bid request is valid.
   *
   * @param {BidRequest} bid The bid params to validate.
   * @return boolean True if this is a valid bid, and false otherwise.
   */
  isBidRequestValid: function (bid) {
    return !!(bid.params && bid.params.sid);
  },

  /**
   * Make a server request from the list of BidRequests.
   *
   * @param {validBidRequests} validBidRequests an array of bids
   * @param {BidderRequest} bidderRequest
   * @return ServerRequest Info describing the request to the server.
   */
  buildRequests: function (validBidRequests, bidderRequest) {
    return validBidRequests.map(request => ({
      method: 'GET',
      url: ENDPOINT,
      data: buildQueryString(request, bidderRequest, 'sid'),
    }));
  },
  interpretResponse: interpretResponse,
};

registerBidder(spec);
