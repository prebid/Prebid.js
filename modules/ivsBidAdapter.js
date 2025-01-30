import { ortbConverter } from '../libraries/ortbConverter/converter.js';
import {deepAccess, deepSetValue, getBidIdParameter, logError} from '../src/utils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { VIDEO } from '../src/mediaTypes.js';
import { INSTREAM } from '../src/video.js';

/**
 * @typedef {import('../src/adapters/bidderFactory.js').BidRequest} BidRequest
 * @typedef {import('../src/adapters/bidderFactory.js').Bid} Bid
 * @typedef {import('../src/adapters/bidderFactory.js').ServerResponse} ServerResponse
 * @typedef {import('../src/adapters/bidderFactory.js').validBidRequests} validBidRequests
 */

const BIDDER_CODE = 'ivs';
const ENDPOINT_URL = 'https://a.ivstracker.net/prod/openrtb/2.5';

export const converter = ortbConverter({
  context: {
    mediaType: VIDEO,
    ttl: 360,
    netRevenue: true
  }
});

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [VIDEO],

  /**
   * Determines whether or not the given bid request is valid.
   *
   * @param {BidRequest} bid The bid params to validate.
   * @return boolean True if this is a valid bid, and false otherwise.
   */
  isBidRequestValid: function(bid) {
    if (bid && typeof bid.params !== 'object') {
      logError(BIDDER_CODE + ': params is not defined or is incorrect in the bidder settings.');
      return false;
    }

    if (!deepAccess(bid, 'mediaTypes.video')) {
      logError(BIDDER_CODE + ': mediaTypes.video is not present in the bidder settings.');
      return false;
    }

    if (deepAccess(bid, 'mediaTypes.video.context') !== INSTREAM) {
      logError(BIDDER_CODE + ': only instream video context is allowed.');
      return false;
    }

    if (!getBidIdParameter('publisherId', bid.params)) {
      logError(BIDDER_CODE + ': publisherId is not present in bidder params.');
      return false;
    }

    return true;
  },

  /**
   * Make a server request from the list of BidRequests.
   *
   * @param {validBidRequests[]} - an array of bids
   * @param {bidderRequest} - master bidRequest object
   * @return ServerRequest Info describing the request to the server.
   */
  buildRequests: function(validBidRequests, bidderRequest) {
    const data = converter.toORTB({ bidderRequest, validBidRequests, context: {mediaType: 'video'} });
    deepSetValue(data.site, 'publisher.id', validBidRequests[0].params.publisherId);

    return {
      method: 'POST',
      url: ENDPOINT_URL,
      data: data,
      options: {
        contentType: 'application/json'
      },
    };
  },

  /**
   * Unpack the response from the server into a list of bids.
   *
   * @param {ServerResponse} serverResponse A successful response from the server.
   * @return {Bid[]} An array of bids which were nested inside the server.
   */
  interpretResponse: function(serverResponse, bidRequest) {
    if (!serverResponse.body) return;
    return converter.fromORTB({ response: serverResponse.body, request: bidRequest.data }).bids;
  },
}

registerBidder(spec);
