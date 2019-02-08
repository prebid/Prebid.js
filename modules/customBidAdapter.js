import { registerBidder } from 'src/adapters/bidderFactory';
import { BANNER, NATIVE, VIDEO } from 'src/mediaTypes';

const BIDDER_CODE = 'customBidAdapter';

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER, VIDEO, NATIVE],

  /**
   * Determines whether or not the given bid request is valid.
   * If there is no 'isBidRequestValid' handler, the bid is considered valid .
   *
   * @param {object} bid The bid to validate.
   * @return boolean True if this is a valid bid, and false otherwise.
   */
  isBidRequestValid: function (bid) {
    const { handlers = {} } = bid;
    return typeof handlers.isBidRequestValid === 'function' ? handlers.isBidRequestValid(bid) : true;
  },

  /**
   * Make a request from the list of BidRequests.
   *
   * @param {BidRequest[]} bidRequests A non-empty list of bid requests which should be sent to the Server.
   * @param {object}  bidderRequest The Bidder Request associated to the requests.
   * @return [ServerRequest] Info describing the requests to the server.
   */
  buildRequests: function (bidRequests, bidderRequest) {
    const { handlers = {} } = bidderRequest;
    if (typeof handlers.buildRequests !== 'function') return [];
    return handlers.buildRequests(bidRequests, bidRequest).filter(isPromise);
  },

  /**
   * Unpack the response from the server into a list of bids.
   *
   * @param {*} serverResponse A successful response from the server.
   * @param {ServerRequest} serverRequest The server request
   * @return {Bid[]} An array of bids which were nested inside the server.
   */
  interpretResponse: function (serverResponse, serverRequest) {
    const { handlers = {} } = bidderRequest;
    if (typeof handlers.interpretResponse !== 'function') return [];
    return handlers.interpretResponse(serverResponse, serverRequest);
  },

};

function isPromise(obj) {
  return typeof obj === 'object' && obj.then && typeof obj.then === 'function';
}

registerBidder(spec);
