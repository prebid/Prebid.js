import {registerBidder} from '../src/adapters/bidderFactory.js';
import {BANNER} from '../src/mediaTypes.js';
import * as utils from '../src/utils.js';
import {ortbConverter} from '../libraries/ortbConverter/converter.js'

const BIDDER_CODE = 'eskimi';
// const ENDPOINT = 'https://hb.eskimi.com/bids'
const ENDPOINT = 'https://sspback.eskimi.com/bid-request'

const DEFAULT_BID_TTL = 30;
const DEFAULT_CURRENCY = 'USD';
const DEFAULT_NET_REVENUE = true;
const GVLID = 814;

export const spec = {
  code: BIDDER_CODE,
  gvlid: GVLID,
  supportedMediaTypes: [BANNER],

  isBidRequestValid: function (bid) {
    return !!bid.params.placementId;
  },

  buildRequests(bidRequests, bidderRequest) {
    const data = converter.toORTB({bidRequests, bidderRequest})

    let bid = bidRequests.find((b) => b.params.placementId)
    if (!data.site) data.site = {}
    data.site.ext = {placementId: bid.params.placementId}

    if (bidderRequest.gdprConsent) {
      if (!data.user) data.user = {};
      if (!data.user.ext) data.user.ext = {};
      if (!data.regs) data.regs = {};
      if (!data.regs.ext) data.regs.ext = {};
      data.user.ext.consent = bidderRequest.gdprConsent.consentString;
      data.regs.ext.gdpr = bidderRequest.gdprConsent.gdprApplies ? 1 : 0;
    }

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
    }
  }
}

const converter = ortbConverter({
  context: {
    netRevenue: DEFAULT_NET_REVENUE,
    ttl: DEFAULT_BID_TTL,
    currency: DEFAULT_CURRENCY,
    mediaType: BANNER // TODO: support more types, we should set mtype on the winning bid
  }
});

registerBidder(spec);
