import {registerBidder} from '../src/adapters/bidderFactory.js';
import {BANNER} from '../src/mediaTypes.js';

// ------------------------------------
const BIDDER_CODE = 'cwire';
export const ENDPOINT_URL = 'https://embed.cwi.re/prebid/bid';

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER],
  /**
   * Determines whether or not the given bid request is valid.
   *
   * @param {BidRequest} bid The bid params to validate.
   * @return boolean True if this is a valid bid, and false otherwise.
   */
  isBidRequestValid: function(bid) {
    return true;
  },

  /**
   * Make a server request from the list of BidRequests.
   *
   * @param {validBidRequests[]} - an array of bids
   * @return ServerRequest Info describing the request to the server.
   */
  buildRequests: function(validBidRequests, bidderRequest) {
    // These are passed from C WIRE config:
    // let placementId = getValue(bid.params, 'placementId');
    // let pageId = getValue(bid.params, 'pageId');

    // There are more fields on the refererInfo object
    let referrer = bidderRequest?.refererInfo?.page
    const payload = {
      userTracker: {
        sharedId: '123',
      },
      slots: validBidRequests,
      referrer: referrer
      /*
      Use `bidderRequest.bids[]` to get bidder-dependent
      request info.

      If your bidder supports multiple currencies, use
      `config.getConfig(currency)` to find which one the ad
      server needs.

      Pull the requested transaction ID from
      `bidderRequest.bids[].transactionId`.
      */
    };
    const payloadString = JSON.stringify(payload);
    return {
      method: 'POST',
      url: ENDPOINT_URL,
      data: payloadString,
    };
  },
  /**
   * Unpack the response from the server into a list of bids.
   *
   * @param {ServerResponse} serverResponse A successful response from the server.
   * @return {Bid[]} An array of bids which were nested inside the server.
   */
  interpretResponse: function(serverResponse, bidRequest) {
    return serverResponse.body?.bids || [];
  },
};
registerBidder(spec);
