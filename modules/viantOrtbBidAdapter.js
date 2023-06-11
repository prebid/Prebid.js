import {registerBidder} from '../src/adapters/bidderFactory.js';
import {BANNER, VIDEO} from '../src/mediaTypes.js';
import * as utils from '../src/utils.js';
import {ortbConverter} from '../libraries/ortbConverter/converter.js'
import {logError} from '../src/utils.js';

const BIDDER_CODE = 'viant';
const ENDPOINT = 'https://bidders-us-east-1.adelphic.net/d/rtbv2/rubicon/bidder'

const DEFAULT_BID_TTL = 300;
const DEFAULT_CURRENCY = 'USD';
const DEFAULT_NET_REVENUE = true;
// const GVLID = TBD; // Global Vendor List ID for GDPR. Check if Viant is registered in the IAB GVL

export const spec = {
  code: BIDDER_CODE,
  // gvlid: GVLID,
  supportedMediaTypes: [BANNER, VIDEO],

  isBidRequestValid: function (bid) {
    if (bid && typeof bid.params !== 'object') {
      logError(BIDDER_CODE + ': params is not defined or is incorrect in the bidder settings.');
      return false;
    }
    return true;
  },

  buildRequests(bidRequests, bidderRequest) {
    const data = converter.toORTB({bidRequests, bidderRequest})

    return [{
      method: 'POST',
      url: ENDPOINT,
      data,
      options: {contentType: 'application/json;charset=UTF-8', withCredentials: false}
    }]
  },

  interpretResponse(response, request) {
    return converter.fromORTB({response: response.body, request: request.data}).bids;
  },

  /**
   * Register bidder specific code, which will execute if a bid from this bidder won the auction
   * @param {Bid} bid The bid that won the auction
   */
  onBidWon: function (bid) {
    if (bid.burl) {
      utils.triggerPixel(bid.burl);
    } else if (bid.nurl) {
      utils.triggerPixel(bid.nurl);
    }
  }
}

const converter = ortbConverter({
  context: {
    netRevenue: DEFAULT_NET_REVENUE,
    ttl: DEFAULT_BID_TTL,
    currency: DEFAULT_CURRENCY
  }
});

registerBidder(spec);
