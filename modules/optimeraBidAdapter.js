import {registerBidder} from 'src/adapters/bidderFactory';
const BIDDER_CODE = 'optimera';
const SCORES_BASE_URL = 'https://s3.amazonaws.com/elasticbeanstalk-us-east-1-397719490216/json/client/';

export const spec = {
  code: BIDDER_CODE,
  /**
   * Determines whether or not the given bid request is valid.
   *
   * @param {bidRequest} bid The bid params to validate.
   * @return boolean True if this is a valid bid, and false otherwise.
   */
  isBidRequestValid: function (bidRequest) {
    if (typeof bidRequest.params.custom != 'undefined' && typeof bidRequest.params.custom.clientID != 'undefined') {
      return true;
    } else {
      return false;
    }
  },
  /**
   * Make a server request from the list of BidRequests.
   *
   * @param {validBidRequests[]} - an array of bids
   * @return ServerRequest Info describing the request to the server.
   */
  buildRequests: function (validBidRequests) {
    var optimeraHost = window.location.host;
    var optimeraPathName = window.location.pathname;
    var timestamp = Math.round(new Date().getTime() / 1000);
    var oDv = [];
    if (typeof validBidRequests[0].params.custom.clientID != 'undefined') {
      var clientID = validBidRequests[0].params.custom.clientID;
      oDv.push(clientID);
      for (var i = 0; i < validBidRequests.length; i++) {
        oDv.push(validBidRequests[i].adUnitCode);
      }
      window.oDv = oDv;
      var scoresURL = SCORES_BASE_URL + clientID + '/' + optimeraHost + optimeraPathName + '.js';
      return {
        method: 'GET',
        url: scoresURL,
        payload: validBidRequests,
        data: {'t': timestamp}
      };
    }
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
  interpretResponse: function (serverResponse, bidRequest) {
    var scores = serverResponse.body.replace('window.oVa = ', '');
    scores = scores.replace(';', '');
    scores = JSON.parse(scores);
    var validBids = bidRequest.payload;
    var bidResponses = [];
    var dealId = '';
    for (var i = 0; i < validBids.length; i++) {
      if (typeof validBids[i].params.custom.clientID != 'undefined') {
        if (validBids[i].adUnitCode in scores) {
          dealId = scores[validBids[i].adUnitCode];
        }
        var bidResponse = {
          bidderCode: spec.code,
          requestId: validBids[i].bidId,
          ad: '<div></div>',
          cpm: 0.01,
          width: 0,
          height: 0,
          dealId: dealId,
          ttl: 300,
          creativeId: '1',
          netRevenue: '0',
          currency: 'USD'
        };
        bidResponses.push(bidResponse);
      }
    }
    return bidResponses;
  }
}

registerBidder(spec);
