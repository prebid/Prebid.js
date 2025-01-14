import { BANNER } from '../src/mediaTypes.js';
import { ortbConverter } from '../libraries/ortbConverter/converter.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';

const BIDDER_CODE = 'algorix';
const ADAGIO_GVLID = 1176;

let ENDPOINT = null;
let SID = null;
let TOKEN = null;
let region = '';

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
    if (
      Boolean(bid.params.sid) &&
      Boolean(bid.params.token)
    ) {
      SID = bid.params.sid;
      TOKEN = bid.params.token;
      region = bid.params.region ? bid.params.region.toLowerCase() : null;
      ENDPOINT =
        REGION.includes(region)
          ? 'https://' + region + '.xyz.svr-algorix.com/rtb/sa?sid=' + SID + '&token=' + TOKEN
          : 'https://xyz.svr-algorix.com/rtb/sa?sid=' + SID + '&token=' + TOKEN;
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
