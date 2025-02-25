import {registerBidder} from '../src/adapters/bidderFactory.js';
import { BANNER } from '../src/mediaTypes.js';
import { ortbConverter } from '../libraries/ortbConverter/converter.js'
import {
  logMessage,
  isSafeFrameWindow,
  mergeDeep,
  canAccessWindowTop,
} from '../src/utils.js';

const BIDDER_VERSION = '1.0';
const BIDDER_CODE = 'responsiveads';
const ENDPOINT_URL = 'https://ve60c4xzl9.execute-api.us-east-1.amazonaws.com/prod/prebidjs';
const DEFAULT_CURRENCY = 'USD';
const GVLID = 1189;

const converter = ortbConverter({
  context: {
    mediaType: BANNER,
    netRevenue: true,
    ttl: 300,
    currency: DEFAULT_CURRENCY,
  },
  request(buildRequest, imps, bidderRequest, context) {
    const req = buildRequest(imps, bidderRequest, context);
    // add additional information we might need on the backend
    mergeDeep(req, {
      ext: {
        prebid: {
          adapterVersion: `${BIDDER_VERSION}`,
        },
      },
    });
    return req;
  },
});

export const spec = {
  code: BIDDER_CODE,
  gvlid: GVLID,
  supportedMediaTypes: [BANNER],
  isBidRequestValid: function(bid) {
    // validate the bid request
    return !!(bid.params);
  },
  buildRequests: function(bidRequests, bidderRequest) {
    // we only want to bid if we are not in a safeframe
    if (isSafeFrameWindow()) {
      return null;
    }

    // if we can't access top we don't want to bid
    if (!canAccessWindowTop()) {
      return null;
    }
    const data = converter.toORTB({ bidRequests, bidderRequest });
    return {
      method: 'POST',
      url: ENDPOINT_URL,
      data: data,
      options: {
        contentType: 'application/json',
        withCredentials: false
      },
      bidderRequest
    };
  },
  interpretResponse: function(response, request) {
    const res = converter.fromORTB({ response: response.body, request: request.data });
    const bids = res.bids;
    return bids;
  },

  onBidWon: (bid) => {
    logMessage('onBidWon', bid);
  }

};

registerBidder(spec);
