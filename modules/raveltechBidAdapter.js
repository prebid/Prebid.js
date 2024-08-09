// Import the base adapter
import { spec as baseAdapter } from './appnexusBidAdapter.js'; // eslint-disable-line prebid/validate-imports
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { logInfo } from '../src/utils.js';
import { BidRequest, Bid } from '../src/bidfactory.js';

const BIDDER_CODE = 'raveltech';
const URL = 'https://pb1.rvlproxy.net/bid/bid';

export const spec = {
  code: BIDDER_CODE,
  gvlid: baseAdapter.GVLID, // use base adapter gvlid

  /**
   * Make a server request from the list of BidRequests.
   *
   * @param {BidRequest[]} bidRequests A non-empty list of bid requests which should be sent to the Server.
   * @return ServerRequest[] Info describing the requests to the server.
   */
  buildRequests: function(bidRequests, bidderRequest) {
    if (!baseAdapter.buildRequests) { return []; }

    let anonymizedBidRequests = baseAdapter.buildRequests(bidRequests, bidderRequest); // call the bid requests from the Appnexus adapter
    if (!anonymizedBidRequests) { return []; } // if no bid request, return empty Array
    if (!Array.isArray(anonymizedBidRequests)) { anonymizedBidRequests = [anonymizedBidRequests]; } // if only 1 bid request, anonymizedBidRequest will be an Object instead of an Array. Build Array with 1 bid request.

    // Load ZKAD runtime, used to anonymize the uids
    const ZKAD = window.ZKAD || { anonymizeID(v, p) { return []; } };
    logInfo('ZKAD.ready=', ZKAD.ready);

    anonymizedBidRequests.forEach(bid => {
      bid.url = URL;
      bid.data = JSON.parse(bid.data);

      let eids = bid.data.eids;
      if (!eids) { return; }

      eids.forEach(eid => {
        if (!eid || !eid.id) { return; }
        logInfo('eid.source=', eid.source);
        eid.id = ZKAD.anonymizeID(eid.id, eid.source);
        logInfo('Anonymized as byte array of length=', eid.id.length);
      });
    });

    return anonymizedBidRequests;
  },

  /**
   * Determines whether or not the given bid request is valid.
   *
   * @param {object} bid The bid to validate.
   * @return boolean True if this is a valid bid, and false otherwise.
   */
  isBidRequestValid: function (bid) {
    if (!baseAdapter.isBidRequestValid) { return false; }
    return baseAdapter.isBidRequestValid(bid);
  },

  /**
   * Unpack the response from the server into a list of bids.
   *
   * @param {*} serverResponse A successful response from the server.
   * @return {Bid[]} An array of bids which were nested inside the server.
   */
  interpretResponse: function (serverResponse, params) {
    if (!baseAdapter.interpretResponse) { return []; }
    return baseAdapter.interpretResponse(serverResponse, params);
  }
};

registerBidder(spec);
