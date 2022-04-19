import * as utils from 'src/utils';
import { registerBidder } from 'src/adapters/bidderFactory';
import { config } from 'src/config';
import { BANNER, VIDEO, NATIVE } from 'src/mediaTypes';
const BIDDER_CODE = 'jwplayer';
const GVLID = 1046;

export const spec = {
    code: BIDDER_CODE,
    gvlid: GVLID,
    supportedMediaTypes: [BANNER, VIDEO, NATIVE],

  /**
   * Determines whether or not the given bid request is valid.
   *
   * @param {object} bid The bid to validate.
   * @return boolean True if this is a valid bid, and false otherwise.
   */
    isBidRequestValid: function(bid) {},

  /**
   * Make a server request from the list of BidRequests.
   *
   * @param {BidRequest[]} bidRequests A non-empty list of bid requests which should be sent to the Server.
   * @return ServerRequest Info describing the request to the server.
   */
    buildRequests: function(validBidRequests, bidderRequest) {},

  /**
   * Unpack the response from the server into a list of bids.
   *
   * @param {*} serverResponse A successful response from the server.
   * @return {Bid[]} An array of bids which were nested inside the server.
   */
    interpretResponse: function(serverResponse, request) {},
    getUserSyncs: function(syncOptions, serverResponses, gdprConsent, uspConsent) {},
    onTimeout: function(timeoutData) {},

  /**
   * Add element selector to javascript tracker to improve native viewability
   * @param {Bid} bid
   */
    onBidWon: function(bid) {},
    onSetTargeting: function(bid) {},
    onBidderError: function({ error, bidderRequest }) {}
};

registerBidder(spec);