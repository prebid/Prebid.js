import { BANNER } from '../src/mediaTypes.js';
import { ortbConverter } from '../libraries/ortbConverter/converter.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';

const BIDDER_CODE = 'algorix';
const ADAGIO_GVLID = 1176;

let ENDPOINT = 'https://';
let region = '';
let url = null;

const DEFAULT_BID_TTL = 1000;
const DEFAULT_CURRENCY = 'USD';
const DEFAULT_NET_REVENUE = true;
const REGION = ['apac', 'use', 'euc']

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
  gvlid: ADAGIO_GVLID,
  supportedMediaTypes: [BANNER],

  isBidRequestValid: function (bid) {
    if (Boolean(bid.params.sid) && Boolean(bid.params.token)) {
      url =
        'xyz.svr-algorix.com/rtb/sa?sid=' +
        bid.params.sid +
        '&token=' +
        bid.params.token;
      region = bid.params.region ? bid.params.region.toLowerCase() : null;
      ENDPOINT = ENDPOINT + (REGION.includes(region) ? region + '.' + url : url);
      return true;
    }
    return false;
  },

  buildRequests(bidRequests, bidderRequest) {
    let data = converter.toORTB({ bidRequests, bidderRequest });

    return [
      {
        options: { contentType: 'application/json;charset=utf-8' },
        method: 'POST',
        url: ENDPOINT,
        data,
      },
    ];
  },

  interpretResponse(response, request) {
    const bids = converter.fromORTB({
      request: request.data,
      response: response.body,
    }).bids;
    return bids;
  },
};

registerBidder(spec);
