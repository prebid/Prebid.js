import { BANNER } from '../src/mediaTypes.js';
import { ortbConverter } from '../libraries/ortbConverter/converter.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';

// Bidder code
const BIDDER_CODE = 'oprx';

let EP = 'https://pb.optimizerx.com';
let PLACEMENT_ID = null;
let NPI = null;

// Converts to ortb
const converter = ortbConverter({
  context: {
    netRevenue: true,
    ttl: 50,
    currency: 'USD',
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
  // Checks if the request is valid or not
  isBidRequestValid: function (bid) {
    if (
      Boolean(bid.params.placement_id) &&
      Boolean(bid.params.npi)
    ) {
      PLACEMENT_ID = bid.params.placement_id;
      NPI = bid.params.npi;
      EP = EP + '?placement_id=' + PLACEMENT_ID + '&npi=' + NPI;
      return true;
    }
    return false;
  },
  // To make a request from the list of BidRequests and BidderRequests
  buildRequests(bRequests, brRequest) {
    let data = converter.toORTB({ bRequests, brRequest });
    return [
      {
        method: 'POST',
        url: EP,
        data,
        options: { contentType: 'application/json;charset=utf-8' },
      },
    ];
  },
  // Unpack the response from the server into a list of bids
  interpretResponse(response, request) {
    const bids = converter.fromORTB({
      response: response.body,
      request: request.data,
    }).bids;
    return bids;
  },
};

registerBidder(spec);
