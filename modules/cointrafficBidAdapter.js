import * as utils from '../src/utils.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import {BANNER} from '../src/mediaTypes.js'

const BIDDER_CODE = 'cointraffic';
const ENDPOINT_URL = 'https://appspb.cointraffic.io/pb/tmp';

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
    return !!(bid.params.placementId);
  },

  /**
   * Make a server request from the list of BidRequests.
   *
   * @param validBidRequests
   * @param bidderRequest
   * @return Array Info describing the request to the server.
   */
  buildRequests: function (validBidRequests, bidderRequest) {
    return validBidRequests.map(bidRequest => {
      const sizes = utils.parseSizesInput(bidRequest.params.size || bidRequest.sizes);

      const payload = {
        placementId: bidRequest.params.placementId,
        sizes: sizes,
        bidId: bidRequest.bidId,
        referer: bidderRequest.refererInfo.referer,
      };

      return {
        method: 'POST',
        url: ENDPOINT_URL,
        data: payload
      };
    });
  },

  /**
   * Unpack the response from the server into a list of bids.
   *
   * @param {ServerResponse} serverResponse A successful response from the server.
   * @param bidRequest
   * @return {Bid[]} An array of bids which were nested inside the server.
   */
  interpretResponse: function (serverResponse, bidRequest) {
    const bidResponses = [];
    const response = serverResponse.body;

    if (utils.isEmpty(response)) {
      return bidResponses;
    }

    const bidResponse = {
      requestId: response.requestId,
      cpm: response.cpm,
      currency: response.currency,
      netRevenue: response.netRevenue,
      width: response.width,
      height: response.height,
      creativeId: response.creativeId,
      ttl: response.ttl,
      ad: response.ad
    };

    bidResponses.push(bidResponse);

    return bidResponses;
  }
};

registerBidder(spec);
