import {logError, _each} from '../src/utils.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';

const BIDDER_CODE = 'clicktripz';
const ENDPOINT_URL = 'https://www.clicktripz.com/x/prebid/v1';

export const spec = {
  code: BIDDER_CODE,
  aliases: ['ctz'], // short code

  isBidRequestValid: function (bid) {
    if (bid && bid.params && bid.params.placementId && bid.params.siteId) {
      return true;
    }

    return false;
  },

  buildRequests: function (validBidRequests) {
    let bidRequests = [];

    _each(validBidRequests, function (bid) {
      bidRequests.push({
        bidId: bid.bidId,
        placementId: bid.params.placementId,
        siteId: bid.params.siteId,
        sizes: bid.sizes.map(function (size) {
          return size.join('x')
        })
      });
    });
    return {
      method: 'POST',
      url: ENDPOINT_URL,
      data: bidRequests
    };
  },

  interpretResponse: function (serverResponse) {
    let bidResponses = [];

    if (serverResponse && serverResponse.body) {
      _each(serverResponse.body, function (bid) {
        if (bid.errors) {
          logError(bid.errors);
          return;
        }

        const size = bid.size.split('x');
        bidResponses.push({
          requestId: bid.bidId,
          cpm: bid.cpm,
          width: size[0],
          height: size[1],
          creativeId: bid.creativeId,
          currency: bid.currency,
          netRevenue: bid.netRevenue,
          ttl: bid.ttl,
          adUrl: bid.adUrl
        });
      });
    }
    return bidResponses;
  }
};

registerBidder(spec);
