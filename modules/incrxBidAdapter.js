import { parseSizesInput, isEmpty } from '../src/utils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER } from '../src/mediaTypes.js'

const BIDDER_CODE = 'incrementx';
const ENDPOINT_URL = 'https://hb.incrementxserv.com/vzhbidder/bid';
const DEFAULT_CURRENCY = 'USD';
const CREATIVE_TTL = 300;

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
      const sizes = parseSizesInput(bidRequest.params.size || bidRequest.sizes);

      const requestParams = {
        _vzPlacementId: bidRequest.params.placementId,
        sizes: sizes,
        _slotBidId: bidRequest.bidId,
        // TODO: is 'page' the right value here?
        _rqsrc: bidderRequest.refererInfo.page,
      };

      const payload = {
        q: encodeURI(JSON.stringify(requestParams))
      }

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
  * @return {Bid[]} An array of bids which were nested inside the server.
  */
  interpretResponse: function (serverResponse) {
    const response = serverResponse.body;
    const bids = [];
    if (isEmpty(response)) {
      return bids;
    }
    const responseBid = {
      requestId: response.slotBidId,
      cpm: response.cpm,
      currency: response.currency || DEFAULT_CURRENCY,
      width: response.adWidth,
      height: response.adHeight,
      ttl: CREATIVE_TTL,
      creativeId: response.creativeId || 0,
      netRevenue: response.netRevenue || false,
      meta: {
        mediaType: response.mediaType || BANNER,
        advertiserDomains: response.advertiserDomains || []
      },
      ad: response.ad
    };
    bids.push(responseBid);
    return bids;
  }

};

registerBidder(spec);
