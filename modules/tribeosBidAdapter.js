import * as utils from '../src/utils.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import * as bidfactory from '../src/bidfactory.js';
import {BANNER} from '../src/mediaTypes.js';
var CONSTANTS = require('../src/constants.json');

const BIDDER_CODE = 'tribeos';
const ENDPOINT_URL = 'https://bidder-api-us-east.tribeos.io/prebid/';
const LOG_PREFIX = 'TRIBEOS: ';
export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER],

  /**
  * Determines whether or not the given bid request is valid.
  *
  * @param {BidRequest}
  *            bid The bid params to validate.
  * @return boolean True if this is a valid bid, and false otherwise.
  */
  isBidRequestValid: function(bid) {
    if (utils.isEmpty(bid.params.placementId)) {
      utils.logError(LOG_PREFIX, 'placementId is required, please contact tribeOS for placementId. Bid details: ', JSON.stringify(bid));
      return false;
    }
    return true;
  },
  /**
  * Make a server request from the list of BidRequests.
  *
  * @param {validBidRequests[]} -
  *            an array of bids
  * @return ServerRequest Info describing the request to the server.
  */
  buildRequests: function(validBidRequests) {
    var requests = [];
    for (var i = 0; i < validBidRequests.length; i++) {
      requests.push(this.buidRTBRequest(validBidRequests[i]));
    }
    return requests;
  },
  buidRTBRequest: function(bidReq) {
    // build bid request object

    var placementId = bidReq.params.placementId;
    var bidFloor = bidReq.params.bidfloor;
    var placementCode = bidReq.params.placementCode;

    var adWidth = bidReq.mediaTypes.banner.sizes[0][0];
    var adHeight = bidReq.mediaTypes.banner.sizes[0][1];

    // build bid request with impressions
    var bidRequest = {
      id: utils.getUniqueIdentifierStr(),
      imp: [{
        id: bidReq.bidId,
        banner: {
          w: adWidth,
          h: adHeight
        },
        tagid: placementCode,
        bidfloor: bidFloor
      }],
      site: {
        domain: window.location.host,
        page: window.location.href,
        publisher: {
          id: placementId
        }
      },
      device: {
        'language': (navigator.language || navigator.browserLanguage || navigator.userLanguage || navigator.systemLanguage),
        'w': adWidth,
        'h': adHeight,
        'js': 1,
        'ua': navigator.userAgent
      }
    };

    // apply gdpr
    if (bidReq.gdprConsent) {
      bidRequest.regs = {ext: {gdpr: bidReq.gdprConsent.gdprApplies ? 1 : 0}};
      bidRequest.user = {ext: {consent: bidReq.gdprConsent.consentString}};
    }

    bidRequest.bidId = bidReq.bidId;
    var url = ENDPOINT_URL + placementId + '/requests';
    if (!utils.isEmpty(bidReq.params.endpointUrl)) {
      url = bidReq.params.endpointUrl + placementId + '/requests';
    }

    return {
      method: 'POST',
      url: url,
      data: JSON.stringify(bidRequest),
      options: { withCredentials: true, contentType: 'application/json' },
    };
  },
  /**
  * Unpack the response from the server into a list of bids.
  *
  * @param {ServerResponse}
  *            serverResponse A successful response from the server.
  * @return {Bid[]} An array of bids which were nested inside the server.
  */
  interpretResponse: function(serverResponse, bidRequest) {
    const responseBody = serverResponse.body;

    utils.logInfo(LOG_PREFIX, 'response body: ', JSON.stringify(serverResponse));

    if ((!responseBody || !responseBody.id)) {
      return [];
    }
    const bidResponses = [];
    responseBody.seatbid[0].bid.forEach(function(bidderBid) {
      var responsePrice;
      var placementCode = '';
      if (bidRequest) {
        var bidResponse = bidfactory.createBid(1);
        placementCode = bidRequest.placementCode;
        bidRequest.status = CONSTANTS.STATUS.GOOD;
        responsePrice = parseFloat(bidderBid.price);
        if (responsePrice === 0) {
          var bid = bidfactory.createBid(2);
          bid.bidderCode = BIDDER_CODE;
          bidResponses.push(bid);

          utils.logInfo(LOG_PREFIX, 'response price is zero. Response data: ', JSON.stringify(bidRequest));

          return bidResponses;
        }
        bidResponse.placementCode = placementCode;
        bidResponse.size = bidRequest.sizes;
        bidResponse.creativeId = bidderBid.crid;
        bidResponse.bidderCode = BIDDER_CODE;
        bidResponse.cpm = responsePrice;
        bidResponse.ad = bidderBid.adm;
        bidResponse.width = parseInt(bidderBid.w);
        bidResponse.height = parseInt(bidderBid.h);
        bidResponse.currency = responseBody.cur;
        bidResponse.netRevenue = true;
        bidResponse.requestId = bidderBid.impid;
        bidResponse.ttl = 180;

        utils.logInfo(LOG_PREFIX, 'bid response data: ', JSON.stringify(bidResponse));
        utils.logInfo(LOG_PREFIX, 'bid request data: ', JSON.stringify(bidRequest));

        bidResponses.push(bidResponse);
      }
    });
    return bidResponses;
  },
  /**
  * Register bidder specific code, which will execute if a bid from this
  * bidder won the auction
  *
  * @param {Bid}
  *            The bid that won the auction
  */
//  onBidWon: function(bid) {
//    ajax(this.nurls[bid.requestId], null);
//  }

}
registerBidder(spec);
