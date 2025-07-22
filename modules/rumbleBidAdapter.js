import { registerBidder } from "../src/adapters/bidderFactory.js";
import { BANNER, VIDEO } from "../src/mediaTypes.js";
import { config } from "../src/config.js";
import { ortbConverter } from "../libraries/ortbConverter/converter.js";
import {
  deepSetValue,
  deepAccess,
  getBidIdParameter,
  logError,
  logWarn,
  triggerPixel,
  replaceAuctionPrice
} from "../src/utils.js";

const BIDDER_CODE = 'rumble';
const ENDPOINT = 'https://a.ads.rmbl.ws/v1/sites/:id/ortb';
const VERSION = '1.0.0';

function fillParameters(bid) {
  const global = config.getConfig('rumble') || {};

  bid.params = bid.params || {};

  [
    'publisherId',
    'siteId',
    'test',
  ].forEach(function(k) {
    if (bid.params[k]) {
      return;
    }

    if (global[k]) {
      bid.params[k] = global[k];
    }
  })

  return bid.params;
}

export const converter = ortbConverter({
  context: {
    netRevenue: true,
    ttl: 60,
    currency: "USD"
  },
  request(buildRequest, imps, bidderRequest, context) {
    const request = buildRequest(imps, bidderRequest, context);
    const params = fillParameters(bidderRequest?.bids[0])

    if (params?.test) {
      deepSetValue(request, 'test', 1)
    }

    deepSetValue(request, 'ext.adapter', {
      version: VERSION,
      name: 'prebidjs'
    })

    return request;
  }
})

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER, VIDEO],

  isBidRequestValid: function (bid) {
    fillParameters(bid)

    if (bid && typeof bid.params !== 'object') {
      logError(BIDDER_CODE + ': params is not defined or is incorrect in the bidder settings.');
      return false;
    }

    const required = ['publisherId', 'siteId'];

    for (let i = 0; i < required.length; i++) {
      if (!getBidIdParameter(required[i], bid.params)) {
        logError(BIDDER_CODE + `: ${required[i]} must be set as a bidder parameter`);
        return false;
      }
    }

    const banner = deepAccess(bid, `mediaTypes.banner`);
    const video = deepAccess(bid, `mediaTypes.video`);

    if (!banner && !video) {
      logWarn(BIDDER_CODE + ': either banner or video mediaType must be provided')
      return false;
    }

    return true;
  },
  buildRequests: function(bidRequests, bidderRequest) {
    const publisherId = bidRequests[0].params.publisherId;
    const siteId = bidRequests[0].params.siteId;
    const zoneId = bidRequests[0].params.zoneId;
    let endpoint = ENDPOINT.replace(':id', siteId) + "?pid=" + publisherId;

    if (zoneId) {
      endpoint += "&a=" + zoneId;
    }

    return bidRequests.map(bid => {
      return {
        url: endpoint,
        method: 'POST',
        data: converter.toORTB({bidRequests: [bid], bidderRequest}),
        bidRequest: bid,
      };
    })
  },
  interpretResponse(response, request) {
    return converter.fromORTB({response: response.body, request: request.data}).bids;
  },
  onBidWon: function(bid) {
    if (bid.burl) {
      triggerPixel(replaceAuctionPrice(bid.burl, bid.originalCpm || bid.cpm));
    }

    if (bid.nurl) {
      triggerPixel(replaceAuctionPrice(bid.nurl, bid.originalCpm || bid.cpm));
    }
  },
};

registerBidder(spec);
