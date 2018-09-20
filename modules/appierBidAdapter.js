import { registerBidder } from 'src/adapters/bidderFactory';
import { BANNER } from 'src/mediaTypes';

const SUPPORTED_AD_TYPES = [BANNER];
const BIDDER_API_URL = '//pmp-stg-server.tw.appier.biz/v1/prebid/bid';
const SHOW_CALLBACK_URL = '//pmp-stg-server.tw.appier.biz/v1/prebid/show_cb';

export const spec = {
  code: 'appier',
  supportedMediaTypes: SUPPORTED_AD_TYPES,

  /**
   * Determines whether or not the given bid request is valid.
   *
   * @param {BidRequest} bid The bid params to validate.
   * @return boolean True if this is a valid bid, and false otherwise.
   */
  isBidRequestValid: function (bid) {
    return typeof bid.params.hzid === 'string';
  },

  /**
   * Make a server request from the list of BidRequests.
   *
   * @param {bidRequests[]} - an array of bids
   * @return ServerRequest Info describing the request to the server.
   */
  buildRequests: function (bidRequests, bidderRequest) {
    if (bidRequests.length === 0) {
      return [];
    }

    return [{
      method: 'POST',
      url: BIDDER_API_URL,
      data: bidRequests,
      // keep the bidder request object for later use
      bidderRequest: bidderRequest
    }];
  },

  /**
   * Unpack the response from the server into a list of bids.
   *
   * @param {serverResponse} serverResponse A successful response from the server.
   * @return {Bid[]} An array of bids which were nested inside the server.
   */
  interpretResponse: function (serverResponse, serverRequest) {
    if (!serverResponse.body || !Array.isArray(serverResponse.body)) {
      return [];
    }
    // server response body is an array of bid results
    let bidResults = serverResponse.body;
    // our server directly returns the format needed by prebid.js so no more
    // transformation is needed here.
    return bidResults;
  },

  /**
   * Register bidder specific code, which will execute if a bid from this bidder won the auction
   * @param {Bid} The bid that won the auction
   */
  onBidWon: function(bid) {
    let hzid = bid.appierParams.hzid;
    let cpm = bid.adserverTargeting.hb_pb;
    let currency = bid.currency;
    let showCallbackUrl = this.generateShowCallbackUrl(hzid, cpm, currency);
    // add the image beacon to creative html
    bid.ad += '<img src="' + showCallbackUrl + '">';
  },

  generateShowCallbackUrl(hzid, cpm, currency) {
    return SHOW_CALLBACK_URL + '?hzid=' + hzid + '&cpm=' + cpm + '&currency=' + currency;
  }
};

registerBidder(spec);
