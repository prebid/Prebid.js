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
    return !!(bidRequest.params.custom.clientID);
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
    var clientID = validBidRequests[0].params.custom.clientID;
    var oDv = [];
    if (clientID != undefined) {
      oDv.push(clientID);
      for (var i = 0; i < validBidRequests.length; i++) {
        oDv.push(validBidRequests[i].placementCode);
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
   * @param {*} serverResponse A successful response from the server.
   * @return {Bid[]} An array of bids which were nested inside the server.
   */
  interpretResponse: function (serverResponse, bidRequest) {
    var scores = serverResponse.replace('window.oVa = ', '');
    scores = scores.replace(';', '');
    scores = JSON.parse(scores);
    var validBids = bidRequest.payload;
    var bidResponses = [];
    var dealId = '';
    for (var i = 0; i < validBids.length; i++) {
      if (validBids[i].placementCode in scores && validBids[i].params.custom.clientID != undefined) {
        dealId = scores[validBids[i].placementCode];
      }
      var bidResponse = {
        bidderCode: spec.code,
        requestId: validBids[i].bidId,
        ad: '<div></div>',
        cpm: 0.01,
        width: 0,
        height: 0,
        dealId: dealId
      };
      bidResponses.push(bidResponse);
    }
    return bidResponses;
  }
}

registerBidder(spec);
