import {getBidIdParameter} from '../src/utils.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import {BANNER} from '../src/mediaTypes.js';
import {tryAppendQueryString} from '../libraries/urlUtils/urlUtils.js';

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

  /**
   * Unpack the response from the server into a list of bids.
   *
   * @param {*} serverResponse A successful response from the server.
   * @return {Bid[]} An array of bids which were nested inside the server.
   */
  interpretResponse: function (serverResponse, requests) {
    const response = serverResponse.body;

    if (!response || Object.keys(response).length === 0) {
      return []
    }

    const bid = {
      requestId: response.request_id,
      cpm: response.cpm,
      currency: response.currency,
      width: response.width,
      height: response.height,
      ad: response.ad,
      creativeId: response.bid_id,
      netRevenue: response.net_revenue,
      mediaType: response.media_type,
      ttl: response.ttl,
      meta: {
        advertiserDomains: response.meta && response.meta.advertiser_domains ? response.meta.advertiser_domains : [],
      },
    };

    return [bid];
  },
};

registerBidder(spec);
