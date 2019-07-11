import * as utils from 'src/utils';
import { registerBidder } from 'src/adapters/bidderFactory';
import { config } from 'src/config';

const BIDDER_CODE = 'adroll';

export const spec = {
    code: BIDDER_CODE,
    /**
     * Determines whether or not the given bid request is valid.
     *
     * @param {BidRequest} bid The bid params to validate.
     * @return boolean True if this is a valid bid, and false otherwise.
     */
    isBidRequestValid: function(bid) {
        return !!(bid.params.id);
    },

   /**
   * Make a server request from the list of BidRequests.
   *
   * @param {BidRequest[]} bidRequests A non-empty list of bid requests which should be sent to the Server.
   * @return ServerRequest Info describing the request to the server.
   */
    buildRequests: function(validBidRequests, bidderRequest) {

    },

    interpretResponse: function(serverResponse, request) {},
    getUserSyncs: function(syncOptions, serverResponses) {},
    onTimeout: function(timeoutData) {},
    onBidWon: function(bid) {},
    onSetTargeting: function(bid) {}
}

registerBidder(spec);
