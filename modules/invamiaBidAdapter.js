import {registerBidder} from '../src/adapters/bidderFactory.js';
import {BANNER} from '../src/mediaTypes.js';

const BIDDER_CODE = 'invamia';
const ENDPOINT_URL = 'https://ad.invamia.com/delivery/impress';

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
    const bidRequest = validBidRequests[0];
    const {bidId, mediaTypes: {banner: {sizes: [[width, height]]}}} = bidRequest;

    window.invamiaBidRequest = {bidId, width, height};

    const payload = {
      ctype: 'div',
      pzoneid: bidRequest.params.zoneId,
      width,
      height,
    };

    const payloadString = Object.keys(payload).map(k => k + '=' + encodeURIComponent(payload[k])).join('&');

    return {
      method: 'GET',
      url: ENDPOINT_URL,
      data: payloadString,
    };
  },
  /**
   * Unpack the response from the server into a list of bids.
   *
   * @param {ServerResponse} serverResponse A successful response from the server.
   * @return Array<BidResponse> An array of bids which were nested inside the server.
   */
  interpretResponse: function(serverResponse) {
    const response = serverResponse.body;
    const bidResponses = [];

    if (response && response.template && response.template.html) {
      const {bidId, width, height} = window.invamiaBidRequest;

      const bidResponse = {
        requestId: bidId,
        cpm: response.hb.cpm,
        width: width,
        height: height,
        creativeId: response.banner.hash,
        currency: 'USD',
        netRevenue: response.hb.netRevenue,
        ttl: 600,
        ad: response.template.html,
      };

      bidResponses.push(bidResponse);
    }

    return bidResponses;
  },
}

registerBidder(spec);
