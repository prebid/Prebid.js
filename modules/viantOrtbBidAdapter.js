import {registerBidder} from '../src/adapters/bidderFactory.js';
import {BANNER, VIDEO} from '../src/mediaTypes.js';
import * as utils from '../src/utils.js';
import {ortbConverter} from '../libraries/ortbConverter/converter.js'
import {deepAccess, getBidIdParameter, logError} from '../src/utils.js';

const BIDDER_CODE = 'viant';
const ENDPOINT = 'https://bidders-us-east-1.adelphic.net/d/rtb/v25/prebid/bidder_test'

const DEFAULT_BID_TTL = 300;
const DEFAULT_CURRENCY = 'USD';
const DEFAULT_NET_REVENUE = true;
// const GVLID = TBD; // Global Vendor List ID for GDPR. Check if Viant is registered in the IAB GVL

export const spec = {
  code: BIDDER_CODE,
  // gvlid: GVLID,
  supportedMediaTypes: [BANNER],

  isBidRequestValid: function (bid) {
    if (bid && typeof bid.params !== 'object') {
      logError(BIDDER_CODE + ': params is not defined or is incorrect in the bidder settings.');
      return false;
    }
    if (!getBidIdParameter('publisherId', bid.params)) {
      logError(BIDDER_CODE + ': publisherId is not present in bidder params.');
      return false;
    }
    if (!deepAccess(bid, 'mediaTypes.banner')) {
      logError(BIDDER_CODE + ': mediaTypes.banner is not present in the bidder settings.');
      return false;
    }
    return true;
  },

  buildRequests,

  interpretResponse(response, request) {
    if (!response.body) {
      response.body = {nbr: 0};
    }
    const bids = converter.fromORTB({request: request.data, response: response.body}).bids;
    return bids;
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

function buildRequests(bids, bidderRequest) {
  let videoBids = bids.filter(bid => isVideoBid(bid));
  let bannerBids = bids.filter(bid => isBannerBid(bid));
  let requests = bannerBids.length ? [createRequest(bannerBids, bidderRequest, BANNER)] : [];
  videoBids.forEach(bid => {
    requests.push(createRequest([bid], bidderRequest, VIDEO));
  });
  return requests;
}

function createRequest(bidRequests, bidderRequest, mediaType) {
  return {
    method: 'POST',
    url: ENDPOINT,
    data: converter.toORTB({bidRequests, bidderRequest, context: {mediaType}})
  }
}

function isVideoBid(bid) {
  return utils.deepAccess(bid, 'mediaTypes.video');
}

function isBannerBid(bid) {
  return utils.deepAccess(bid, 'mediaTypes.banner') || !isVideoBid(bid);
}

const converter = ortbConverter({
  context: {
    netRevenue: DEFAULT_NET_REVENUE,
    ttl: DEFAULT_BID_TTL,
    currency: DEFAULT_CURRENCY
  }
});

registerBidder(spec);
