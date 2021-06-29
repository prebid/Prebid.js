import * as utils from '../src/utils.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';

const BIDDER_CODE = 'admedia';
const ENDPOINT_URL = 'https://prebid.admedia.com/bidder/';

export const spec = {
  code: BIDDER_CODE,

  isBidRequestValid: function (bid) {
    return bid.params && !!bid.params.aid;
  },

  buildRequests: function (validBidRequests, bidderRequest) {
    let payload = {};

    if (bidderRequest && bidderRequest.refererInfo) {
      payload.referer = encodeURIComponent(bidderRequest.refererInfo.referer);
    }

    payload.tags = [];

    utils._each(validBidRequests, function (bid) {
      const tag = {
        id: bid.bidId,
        sizes: bid.sizes,
        aid: bid.params.aid
      };
      payload.tags.push(tag);
    });

    const payloadString = JSON.stringify(payload);
    return {
      method: 'POST',
      url: ENDPOINT_URL,
      data: payloadString,
    };
  },

  interpretResponse: function (serverResponse, bidRequest) {
    const bidResponses = [];

    if (!serverResponse.body.tags) {
      return bidResponses;
    }

    utils._each(serverResponse.body.tags, function (response) {
      if (!response.error && response.cpm > 0) {
        const bidResponse = {
          requestId: response.id,
          cpm: response.cpm,
          width: response.width,
          height: response.height,
          creativeId: response.id,
          dealId: response.id,
          currency: 'USD',
          netRevenue: true,
          ttl: 120,
          // referrer: REFERER,
          ad: response.ad
        };

        bidResponses.push(bidResponse);
      }
    });

    return bidResponses;
  }
};

registerBidder(spec);
