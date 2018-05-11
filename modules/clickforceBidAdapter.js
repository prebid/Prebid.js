import * as utils from 'src/utils';
import {registerBidder} from 'src/adapters/bidderFactory';

const BIDDER_CODE = 'clickforce';
const ENDPOINT_URL = '//ad.doublemax.net/adserver/prebid.json?cb=' + new Date().getTime() + '&hb=1&ver=1.21';

export const spec = {
  code: BIDDER_CODE,

  /**
   * Determines whether or not the given bid request is valid.
   *
   * @param {BidRequest} bid The bid params to validate.
   * @return boolean True if this is a valid bid, and false otherwise.
   */
  isBidRequestValid: function(bid) {
    return bid && bid.params && !!bid.params.zone;
  },

  /**
   * Make a server request from the list of BidRequests.
   *
   * @param {BidRequest[]} validBidRequests - an array of bids
   * @return ServerRequest Info describing the request to the server.
   */
  buildRequests: function(validBidRequests) {
    const bidParams = [];
    utils._each(validBidRequests, function(bid) {
      bidParams.push({
        z: bid.params.zone,
        bidId: bid.bidId
      });
    });
    return {
      method: 'POST',
      url: ENDPOINT_URL,
      data: bidParams
    };
  },

  /**
   * Unpack the response from the server into a list of bids.
   *
   * @param {*} serverResponse A successful response from the server.
   * @param {*} bidRequest
   * @return {Bid[]} An array of bids which were nested inside the server.
   */
  interpretResponse: function(serverResponse, bidRequest) {
    const cfResponses = [];
    utils._each(serverResponse.body, function(response) {
      cfResponses.push({
        requestId: response.requestId,
        cpm: response.cpm,
        width: response.width,
        height: response.height,
        creativeId: response.creativeId,
        currency: response.currency,
        netRevenue: response.netRevenue,
        ttl: response.ttl,
        ad: response.tag
      });
    });
    return cfResponses;
  },
  getUserSyncs: function(syncOptions, serverResponses) {
    if (syncOptions.iframeEnabled) {
      return [{
        type: 'iframe',
        url: 'https://cdn.doublemax.net/js/capmapping.htm'
      }]
    } else if (syncOptions.pixelEnabled) {
      return [{
        type: 'image',
        url: 'https://c.doublemax.net/cm'
      }]
    }
  }
};
registerBidder(spec);
