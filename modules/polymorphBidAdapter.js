import * as utils from 'src/utils';
import { registerBidder } from 'src/adapters/bidderFactory';
import { BANNER } from 'src/mediaTypes';

const BIDDER_CODE = 'polymorph';
const URL = '//api.adsnative.com/v1/ad-template.json';

export const polymorphAdapterSpec = {
  code: BIDDER_CODE,
  aliases: ['adsnative'],
  supportedMediaTypes: [BANNER],

  /**
   * Determines whether or not the given bid request is valid.
   *
   * @param {object} bid The bid to validate.
   * @return boolean True if this is a valid bid, and false otherwise.
   */
  isBidRequestValid: function(bid) {
    return !!(bid.params.placementId);
  },

  /**
   * Make a server request from the list of BidRequests.
   *
   * @param {BidRequest[]} bidRequests A non-empty list of bid requests which should be sent to the Server.
   * @return ServerRequest Info describing the request to the server.
   */
  buildRequests: function(bidRequests, bidderRequest) {
    return bidRequests.map(bid => {
      var payload = {
        url: utils.getTopWindowUrl(),
        ref: utils.getTopFrameReferrer(),
        zid: bid.params.placementId,
        sizes: bid.sizes,
        hb: 1,
        hb_source: 'prebid'
      };
      Object.keys(bid.params).forEach(function(key) {
        if (key != 'defaultWidth' && key != 'defaultHeight') {
          payload[key] = bid.params[key];
        }
      });
      const payloadString = utils.parseQueryStringParameters(payload);
      return {
        method: 'GET',
        url: URL,
        data: payloadString,
        bidderRequest: bid
      };
    });
  },

  /**
   * Unpack the response from the server into a list of bids.
   *
   * @param {*} serverResponse A successful response from the server.
   * @return {Bid[]} An array of bids which were nested inside the server.
   */
  interpretResponse: function(serverResponse, { bidderRequest }) {
    const bidResponses = [];
    try {
      serverResponse = serverResponse.body;
      if (!serverResponse || typeof serverResponse.status === 'undefined') {
        utils.logError('HTTP Connection Error');
        return bidResponses
      }
      if (serverResponse.status != 'OK' || (typeof serverResponse.ad === 'undefined' && typeof serverResponse.ads === 'undefined')) {
        utils.logError('API No Response: ' + serverResponse.message);
        return bidResponses
      }
      let width = bidderRequest.params.defaultWidth || bidderRequest.sizes[0][0];
      let height = bidderRequest.params.defaultHeight || bidderRequest.sizes[0][1];
      let theHTML = '';
      let crid = '';
      if (typeof serverResponse.ad !== 'undefined') {
        crid = serverResponse.crid;
        theHTML = serverResponse.ad.html;
        width = serverResponse.ad.width || width
        height = serverResponse.ad.height || height
      } else {
        crid = serverResponse.ads[0].crid;
        theHTML = serverResponse.html;
      }

      const bidResp = {
        requestId: bidderRequest.bidId,
        cpm: serverResponse.ecpm,
        width: width,
        height: height,
        ad: theHTML,
        ttl: 3600,
        creativeId: crid,
        netRevenue: false,
        currency: 'USD',
        mediaType: 'banner'
      };
      bidResponses.push(bidResp);
    } catch (e) {
      utils.logError(e);
    }
    return bidResponses;
  }
}

registerBidder(polymorphAdapterSpec);
