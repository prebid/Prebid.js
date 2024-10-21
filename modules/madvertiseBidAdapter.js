import { parseSizesInput, _each } from '../src/utils.js';
import {config} from '../src/config.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';

/**
 * @typedef {import('../src/adapters/bidderFactory.js').BidRequest} BidRequest
 * @typedef {import('../src/adapters/bidderFactory.js').Bid} Bid
 */

// use protocol relative urls for http or https
const MADVERTISE_ENDPOINT = 'https://mobile.mng-ads.com/';

export const spec = {
  code: 'madvertise',
  /**
   * @param {object} bid
   * @return boolean
   */
  isBidRequestValid: function (bid) {
    if (typeof bid.params !== 'object') {
      return false;
    }
    let sizes = parseSizesInput(bid.sizes);
    if (!sizes || sizes.length === 0) {
      return false;
    }
    if (sizes.length > 0 && sizes[0] === undefined) {
      return false;
    }
    if (typeof bid.params.floor == 'undefined' || parseFloat(bid.params.floor) < 0.01) {
      bid.params.floor = 0.01;
    }

    return typeof bid.params.s != 'undefined';
  },
  /**
   * @param {BidRequest[]} bidRequests
   * @param bidderRequest
   * @return ServerRequest[]
   */
  buildRequests: function (bidRequests, bidderRequest) {
    return bidRequests.map(bidRequest => {
      bidRequest.startTime = new Date().getTime();

      // non-video request builder
      var src = '?rt=bid_request&v=1.0';

      for (var i = 0; i < bidRequest.sizes.length; i++) {
        if (Array.isArray(bidRequest.sizes[i]) && bidRequest.sizes[i].length == 2) {
          src = src + '&sizes[' + i + ']=' + bidRequest.sizes[i][0] + 'x' + bidRequest.sizes[i][1];
        }
      }

      _each(bidRequest.params, (item, key) => src = src + '&' + key + '=' + item);

      if (typeof bidRequest.params.u == 'undefined') {
        src = src + '&u=' + navigator.userAgent;
      }

      if (bidderRequest && bidderRequest.gdprConsent) {
        src = src + '&gdpr=' + (bidderRequest.gdprConsent.gdprApplies ? '1' : '0') + '&consent[0][format]=' + config.getConfig('consentManagement.cmpApi') + '&consent[0][value]=' + bidderRequest.gdprConsent.consentString;
      }

      return {
        method: 'GET',
        url: MADVERTISE_ENDPOINT + src,
        options: {withCredentials: false},
        bidId: bidRequest.bidId
      };
    });
  },
  /**
   * @param {*} responseObj
   * @param {BidRequest} bidRequest
   * @return {Bid[]} An array of bids which
   */
  interpretResponse: function (responseObj, bidRequest) {
    responseObj = responseObj.body;
    // check overall response
    if (responseObj == null || typeof responseObj !== 'object' || !responseObj.hasOwnProperty('ad')) {
      return [];
    }

    let bid = {
      requestId: bidRequest.bidId,
      cpm: responseObj.cpm,
      width: responseObj.Width,
      height: responseObj.height,
      ad: responseObj.ad,
      ttl: responseObj.ttl,
      creativeId: responseObj.creativeId,
      netRevenue: responseObj.netRevenue,
      currency: responseObj.currency,
      dealId: responseObj.dealId,
      meta: {
        advertiserDomains: Array.isArray(responseObj.adomain) ? responseObj.adomain : []
      }

    };
    return [bid];
  },
  getUserSyncs: function (syncOptions) {
  }
};
registerBidder(spec);
