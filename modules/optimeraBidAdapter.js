import { registerBidder } from '../src/adapters/bidderFactory.js';
import { deepAccess } from '../src/utils.js';

const BIDDER_CODE = 'optimera';
const SCORES_BASE_URL = 'https://dyv1bugovvq1g.cloudfront.net/';

export const spec = {
  code: BIDDER_CODE,
  /**
   * Determines whether or not the given bid request is valid.
   *
   * @param {bidRequest} bid The bid params to validate.
   * @return boolean True if this is a valid bid, and false otherwise.
   */
  isBidRequestValid (bidRequest) {
    if (typeof bidRequest.params !== 'undefined' && typeof bidRequest.params.clientID !== 'undefined') {
      return true;
    }
    return false;
  },
  /**
   * Make a server request from the list of BidRequests.
   *
   * We call the existing scores data file for ad slot placement scores.
   * These scores will be added to the dealId to be pushed to DFP.
   *
   * @param {validBidRequests[]} - an array of bids
   * @return ServerRequest Info describing the request to the server.
   */
  buildRequests (validBidRequests) {
    const optimeraHost = window.location.host;
    const optimeraPathName = window.location.pathname;
    if (typeof validBidRequests[0].params.clientID !== 'undefined') {
      const { clientID } = validBidRequests[0].params;
      const scoresURL = `${SCORES_BASE_URL + clientID}/${optimeraHost}${optimeraPathName}.js`;
      return {
        method: 'GET',
        url: scoresURL,
        payload: validBidRequests,
      };
    }
    return {};
  },
  /**
   * Unpack the response from the server into a list of bids.
   *
   * Some required bid params are not needed for this so default
   * values are used.
   *
   * @param {*} serverResponse A successful response from the server.
   * @return {Bid[]} An array of bids which were nested inside the server.
   */
  interpretResponse (serverResponse, bidRequest) {
    const validBids = bidRequest.payload;
    const bidResponses = [];
    let dealId = '';
    if (typeof serverResponse.body !== 'undefined') {
      const scores = serverResponse.body;
      for (let i = 0; i < validBids.length; i += 1) {
        if (typeof validBids[i].params.clientID !== 'undefined') {
          if (validBids[i].adUnitCode in scores) {
            const deviceDealId = deepAccess(scores, `device.${validBids[i].params.device}.${validBids[i].adUnitCode}`);
            dealId = deviceDealId || scores[validBids[i].adUnitCode];
          }
          const bidResponse = {
            requestId: validBids[i].bidId,
            ad: '<div></div>',
            cpm: 0.01,
            width: 0,
            height: 0,
            dealId,
            ttl: 300,
            creativeId: '1',
            netRevenue: '0',
            currency: 'USD'
          };
          bidResponses.push(bidResponse);
        }
      }
    }
    return bidResponses;
  }
}

registerBidder(spec);
