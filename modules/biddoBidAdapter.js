import {registerBidder} from '../src/adapters/bidderFactory.js';
import {BANNER} from '../src/mediaTypes.js';

/**
 * @typedef {import('../src/adapters/bidderFactory.js').BidRequest} BidRequest
 * @typedef {import('../src/adapters/bidderFactory.js').ServerResponse} ServerResponse
 */

const BIDDER_CODE = 'biddo';
const ENDPOINT_URL = 'https://ad.adopx.net/delivery/impress';

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER],
  /**
   * Determines whether or not the given bid request is valid.
   *
   * @param {BidRequest} bidRequest The bid request params to validate.
   * @return boolean True if this is a valid bid request, and false otherwise.
   */
  isBidRequestValid: function(bidRequest) {
    return !!bidRequest.params.zoneId;
  },
  /**
   * Make a server request from the list of BidRequests.
   *
   * @param {Array<BidRequest>} validBidRequests an array of bid requests
   * @return ServerRequest Info describing the request to the server.
   */
  buildRequests: function(validBidRequests) {
    let serverRequests = [];

    validBidRequests.forEach(bidRequest => {
      const sizes = bidRequest.mediaTypes.banner.sizes;

      sizes.forEach(([width, height]) => {
        bidRequest.params.requestedSizes = [width, height];

        const payload = {
          ctype: 'div',
          pzoneid: bidRequest.params.zoneId,
          width,
          height,
        };

        const payloadString = Object.keys(payload).map(k => k + '=' + encodeURIComponent(payload[k])).join('&');

        serverRequests.push({
          method: 'GET',
          url: ENDPOINT_URL,
          data: payloadString,
          bidderRequest: bidRequest,
        });
      });
    });

    return serverRequests;
  },
  /**
   * Unpack the response from the server into a list of bids.
   *
   * @param {ServerResponse} serverResponse A successful response from the server.
   * @param {BidRequest} bidderRequest A matched bid request for this response.
   * @return Array<BidResponse> An array of bids which were nested inside the server.
   */
  interpretResponse: function(serverResponse, {bidderRequest}) {
    const response = serverResponse.body;
    const bidResponses = [];

    if (response && response.template && response.template.html) {
      const {bidId} = bidderRequest;
      const [width, height] = bidderRequest.params.requestedSizes;

      const bidResponse = {
        requestId: bidId,
        cpm: response.hb.cpm,
        creativeId: response.banner.hash,
        currency: 'USD',
        netRevenue: response.hb.netRevenue,
        ttl: 600,
        ad: response.template.html,
        mediaType: 'banner',
        meta: {
          advertiserDomains: response.hb.adomains || [],
        },
        width,
        height,
      };

      bidResponses.push(bidResponse);
    }

    return bidResponses;
  },
}

registerBidder(spec);
