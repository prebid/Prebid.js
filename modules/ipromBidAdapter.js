import * as utils from '../src/utils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';

const BIDDER_CODE = 'iprom';
const ENDPOINT_URL = 'https://core.iprom.net/programmatic';
const VERSION = 'v1.0.0';
const DEFAULT_CURRENCY = 'EUR';
const DEFAULT_NETREVENUE = true;
const DEFAULT_TTL = 360;

export const spec = {
  code: BIDDER_CODE,
  isBidRequestValid: function ({ bidder, params = {} } = {}) {
    // id parameter checks
    if (!params.id) {
      utils.logError(`${bidder}: Parameter 'id' missing`);
      return false;
    } else if (typeof params.id !== 'string') {
      utils.logError(`${bidder}: Parameter 'id' needs to be a string`);
      return false;
    }
    // dimension parameter checks
    if (!params.dimension) {
      utils.logError(`${bidder}: Required parameter 'dimension' missing`);
      return false;
    } else if (typeof params.dimension !== 'string') {
      utils.logError(`${bidder}: Parameter 'dimension' needs to be a string`);
      return false;
    }

    return true;
  },

  buildRequests: function (validBidRequests, bidderRequest) {
    const payload = {
      bids: validBidRequests,
      referer: bidderRequest.refererInfo,
      version: VERSION
    };
    const payloadString = JSON.stringify(payload);

    return {
      method: 'POST',
      url: ENDPOINT_URL,
      data: payloadString
    };
  },

  interpretResponse: function (serverResponse, request) {
    let bids = serverResponse.body;

    const bidResponses = [];

    bids.forEach(bid => {
      bidResponses.push({
        ad: bid.ad,
        requestId: bid.requestId,
        cpm: bid.cpm,
        width: bid.width,
        height: bid.height,
        creativeId: bid.creativeId,
        currency: bid.currency || DEFAULT_CURRENCY,
        netRevenue: bid.netRevenue || DEFAULT_NETREVENUE,
        ttl: bid.ttl || DEFAULT_TTL,
      });
    });

    return bidResponses;
  },
}

registerBidder(spec);
