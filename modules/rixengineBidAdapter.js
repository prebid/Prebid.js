import { BANNER } from '../src/mediaTypes.js';
import { ortbConverter } from '../libraries/ortbConverter/converter.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';

const BIDDER_CODE = 'rixengine';

// We will also allow an alias named 'algorix'
const ALGORIX_REGIONS = ['apac', 'use', 'euc'];
const DEFAULT_BID_TTL = 30;
const DEFAULT_CURRENCY = 'USD';
const DEFAULT_NET_REVENUE = true;

// We'll store the endpoint in a global for simplicity.
// If your use case requires multiple endpoints per auction, store these in a request-level object.
let ENDPOINT = null;

const converter = ortbConverter({
  context: {
    netRevenue: DEFAULT_NET_REVENUE,
    ttl: DEFAULT_BID_TTL,
    currency: DEFAULT_CURRENCY,
    mediaType: BANNER,
  },
  imp(buildImp, bidRequest, context) {
    const imp = buildImp(bidRequest, context);
    return imp;
  },
});

export const spec = {
  code: BIDDER_CODE,

  // Include your GVL ID
  gvlid: 1176,

  // Register "algorix" as an alias, also with gvlid if needed
  aliases: [{
    code: 'algorix',
    gvlid: 1176
  }],

  supportedMediaTypes: [BANNER],

  isBidRequestValid: function (bid) {
    if (bid.bidder === 'algorix') {
      // Algorix-specific logic for building endpoint
      if (Boolean(bid.params.sid) && Boolean(bid.params.token)) {
        let region = bid.params.region ? bid.params.region.toLowerCase() : '';
        // Base URL for Algorix
        let url = `xyz.svr-algorix.com/rtb/sa?sid=${bid.params.sid}&token=${bid.params.token}`;
        // If region is in ALGORIX_REGIONS, prepend it, else just use url
        ENDPOINT = 'https://' + (ALGORIX_REGIONS.includes(region) ? (region + '.' + url) : url);
        return true;
      }
      return false;
    } else {
      // rixengine logic
      if (
        Boolean(bid.params.endpoint) &&
        Boolean(bid.params.sid) &&
        Boolean(bid.params.token)
      ) {
        ENDPOINT = `${bid.params.endpoint}?sid=${bid.params.sid}&token=${bid.params.token}`;
        return true;
      }
      return false;
    }
  },

  buildRequests(bidRequests, bidderRequest) {
    // All valid bids for this adapter (rixengine or algorix alias) share the same ENDPOINT in this simplified approach
    const data = converter.toORTB({ bidRequests, bidderRequest });

    return [{
      method: 'POST',
      url: ENDPOINT,
      data,
      options: { contentType: 'application/json;charset=utf-8' },
    }];
  },

  interpretResponse(response, request) {
    const bids = converter.fromORTB({
      response: response.body,
      request: request.data,
    }).bids;
    return bids;
  },
};

registerBidder(spec);
