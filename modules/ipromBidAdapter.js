import { logError } from '../src/utils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';

const BIDDER_CODE = 'iprom';
const ENDPOINT_URL = 'https://core.iprom.net/programmatic';
const VERSION = 'v1.0.2';
const DEFAULT_CURRENCY = 'EUR';
const DEFAULT_NETREVENUE = true;
const DEFAULT_TTL = 360;

export const spec = {
  code: BIDDER_CODE,
  isBidRequestValid: function ({ bidder, params = {} } = {}) {
    // id parameter checks
    if (!params.id) {
      logError(`${bidder}: Parameter 'id' missing`);
      return false;
    } else if (typeof params.id !== 'string') {
      logError(`${bidder}: Parameter 'id' needs to be a string`);
      return false;
    }
    // dimension parameter checks
    if (!params.dimension) {
      logError(`${bidder}: Required parameter 'dimension' missing`);
      return false;
    } else if (typeof params.dimension !== 'string') {
      logError(`${bidder}: Parameter 'dimension' needs to be a string`);
      return false;
    }

    return true;
  },

  buildRequests: function (validBidRequests, bidderRequest) {
    const payload = {
      bids: validBidRequests,
      // TODO: please do not send internal data structures over the network
      referer: bidderRequest.refererInfo.legacy,
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
      const b = {
        ad: bid.ad,
        requestId: bid.requestId,
        cpm: bid.cpm,
        width: bid.width,
        height: bid.height,
        creativeId: bid.creativeId,
        currency: bid.currency || DEFAULT_CURRENCY,
        netRevenue: bid.netRevenue || DEFAULT_NETREVENUE,
        ttl: bid.ttl || DEFAULT_TTL,
        meta: {},
      };

      if (bid.aDomains && bid.aDomains.length) {
        b.meta.advertiserDomains = bid.aDomains;
      }

      bidResponses.push(b);
    });

    return bidResponses;
  },
}

registerBidder(spec);
