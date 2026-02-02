import {getBidIdParameter} from '../src/utils.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import {BANNER} from '../src/mediaTypes.js';
import {tryAppendQueryString} from '../libraries/urlUtils/urlUtils.js';
import {interpretResponse} from '../libraries/uniquestUtils/uniquestUtils.js';

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
    const bidRequests = [];

    for (let i = 0; i < validBidRequests.length; i++) {
      let queryString = '';
      const request = validBidRequests[i];

      const bid = request.bidId;
      const sid = getBidIdParameter('sid', request.params);
      const widths = request.sizes.map(size => size[0]).join(',');
      const heights = request.sizes.map(size => size[1]).join(',');
      const timeout = bidderRequest.timeout

      queryString = tryAppendQueryString(queryString, 'bid', bid);
      queryString = tryAppendQueryString(queryString, 'sid', sid);
      queryString = tryAppendQueryString(queryString, 'widths', widths);
      queryString = tryAppendQueryString(queryString, 'heights', heights);
      queryString = tryAppendQueryString(queryString, 'timeout', timeout);

      bidRequests.push({
        method: 'GET',
        url: ENDPOINT,
        data: queryString,
      });
    }
    return bidRequests;
  },
  interpretResponse: interpretResponse,
};

registerBidder(spec);
