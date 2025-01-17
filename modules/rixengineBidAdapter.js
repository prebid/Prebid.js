import { BANNER } from '../src/mediaTypes.js';
import { ortbConverter } from '../libraries/ortbConverter/converter.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';

const BIDDER_CODE = 'rixengine';

let ENDPOINT = null;
let SID = null;
let TOKEN = null;

const DEFAULT_BID_TTL = 30;
const DEFAULT_CURRENCY = 'USD';
const DEFAULT_NET_REVENUE = true;

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
  supportedMediaTypes: [BANNER],

  isBidRequestValid: function (bid) {
    if (
      Boolean(bid.params.endpoint) &&
      Boolean(bid.params.sid) &&
      Boolean(bid.params.token)
    ) {
      SID = bid.params.sid;
      TOKEN = bid.params.token;
      ENDPOINT = bid.params.endpoint + '?sid=' + SID + '&token=' + TOKEN;
      return true;
    }
    return false;
  },

  buildRequests(bidRequests, bidderRequest) {
    let data = converter.toORTB({ bidRequests, bidderRequest });

    return [
      {
        method: 'POST',
        url: ENDPOINT,
        data,
        options: { contentType: 'application/json;charset=utf-8' },
      },
    ];
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
