import * as utils from '../src/utils.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';

const PAPYRUS_ENDPOINT = 'https://prebid.papyrus.global';
const PAPYRUS_CODE = 'papyrus';

export const spec = {
  code: PAPYRUS_CODE,

  /**
  * Determines whether or not the given bid request is valid. Valid bid request must have placementId and hbid
  *
  * @param {BidRequest} bid The bid params to validate.
  * @return boolean True if this is a valid bid, and false otherwise.
  */
  isBidRequestValid: bid => {
    return !!(bid && bid.params && bid.params.address && bid.params.placementId);
  },

  /**
   * Make a server request from the list of BidRequests.
   *
   * @param {BidRequest[]} validBidRequests - an array of bids
   * @return ServerRequest Info describing the request to the server.
   */
  buildRequests: function(validBidRequests) {
    const bidParams = [];
    utils._each(validBidRequests, function(bid) {
      bidParams.push({
        address: bid.params.address,
        placementId: bid.params.placementId,
        bidId: bid.bidId,
        transactionId: bid.transactionId,
        sizes: utils.parseSizesInput(bid.sizes)
      });
    });

    return {
      method: 'POST',
      url: PAPYRUS_ENDPOINT,
      data: bidParams
    };
  },

  /**
   * Unpack the response from the server into a list of bids.
   *
   * @param {*} serverResponse A successful response from the server.
   * @return {Bid[]} An array of bids which were nested inside the server.
   */
  interpretResponse: function(serverResponse, request) {
    const bidResponses = [];

    if (serverResponse && serverResponse.body && serverResponse.body.bids) {
      serverResponse.body.bids.forEach(bid => {
        const bidResponse = {
          requestId: bid.id,
          creativeId: bid.id,
          adId: bid.id,
          transactionId: bid.transactionId,
          cpm: bid.cpm,
          width: bid.width,
          height: bid.height,
          currency: bid.currency,
          netRevenue: true,
          ttl: 300,
          ad: bid.ad
        }
        bidResponses.push(bidResponse);
      });
    }

    return bidResponses;
  }
};

registerBidder(spec);
