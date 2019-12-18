import { registerBidder } from '../src/adapters/bidderFactory';
import { BANNER } from '../src/mediaTypes';
import * as utils from '../src/utils';

const WHO = 'BKSHBID-005';
const BIDDER_CODE = 'bucksense';
const URL = 'https://prebid.bksn.se:445/prebidjs/';

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER],

  /**
   * Determines whether or not the given bid request is valid.
   *
   * @param {object} bid The bid to validate.
   * @return boolean True if this is a valid bid, and false otherwise.
  */
  isBidRequestValid: function (bid) {
    utils.logInfo(WHO + ' isBidRequestValid() - INPUT bid:', bid);
    if (bid.bidder !== BIDDER_CODE || typeof bid.params === 'undefined') {
      return false;
    }
    if (typeof bid.params.placementId === 'undefined') {
      return false;
    }
    return true;
  },

  /**
    * Make a server request from the list of BidRequests.
    *
    * @param {BidRequest[]} validBidRequests A non-empty list of valid bid requests that should be sent to the Server.
    * @return ServerRequest Info describing the request to the server.
   */
  buildRequests: function (validBidRequests, bidderRequest) {
    utils.logInfo(WHO + ' buildRequests() - INPUT validBidRequests:', validBidRequests, 'INPUT bidderRequest:', bidderRequest);
    let requests = [];
    const len = validBidRequests.length;
    for (let i = 0; i < len; i++) {
      var bid = validBidRequests[i];
      var params = {};
      for (var key in bid.params) {
        if (bid.params.hasOwnProperty(key)) {
          params[key] = encodeURI(bid.params[key]);
        }
      }
      delete bid.params;
      var sizes = bid.sizes;
      delete bid.sizes;
      var sendData = {
        'pub_id': location.host,
        'pl_id': '' + params.placementId,
        'secure': (location.protocol === 'https:') ? 1 : 0,
        'href': encodeURI(location.href),
        'bid_id': bid.bidId,
        'params': params,
        'sizes': sizes,
        '_bid': bidderRequest
      };
      requests.push({
        method: 'POST',
        url: URL,
        data: sendData
      });
    }
    utils.logInfo(WHO + ' buildRequests() - requests:', requests);
    return requests;
  },

  /**
   * Unpack the response from the server into a list of bids.
   *
   * @param {*} serverResponse A successful response from the server.
   * @return {Bid[]} An array of bids which were nested inside the server.
  */
  interpretResponse: function (serverResponse, request) {
    utils.logInfo(WHO + ' interpretResponse() - INPUT serverResponse:', serverResponse, 'INPUT request:', request);

    const bidResponses = [];
    if (serverResponse.body) {
      var oResponse = serverResponse.body;

      var sRequestID = oResponse.requestId || '';
      var nCPM = oResponse.cpm || 0;
      var nWidth = oResponse.width || 0;
      var nHeight = oResponse.height || 0;
      var nTTL = oResponse.ttl || 0;
      var sCreativeID = oResponse.creativeId || 0;
      var sCurrency = oResponse.currency || 'USD';
      var bNetRevenue = oResponse.netRevenue || true;
      var sAd = oResponse.ad || '';

      if (request && sRequestID.length == 0) {
        utils.logInfo(WHO + ' interpretResponse() - use RequestID from Placments');
        sRequestID = request.data.bid_id || '';
      }

      if (request && request.data.params.hasOwnProperty('testcpm')) {
        utils.logInfo(WHO + ' interpretResponse() - use Test CPM ');
        nCPM = request.data.params.testcpm;
      }

      let bidResponse = {
        requestId: sRequestID,
        cpm: nCPM,
        width: nWidth,
        height: nHeight,
        ttl: nTTL,
        creativeId: sCreativeID,
        currency: sCurrency,
        netRevenue: bNetRevenue,
        ad: sAd
      };
      bidResponses.push(bidResponse);
    } else {
      utils.logInfo(WHO + ' interpretResponse() - serverResponse not valid');
    }
    utils.logInfo(WHO + ' interpretResponse() - return', bidResponses);
    return bidResponses;
  },

};
registerBidder(spec);
