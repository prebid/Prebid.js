import { registerBidder } from 'src/adapters/bidderFactory';
import { BANNER } from 'src/mediaTypes';

const SUPPORTED_AD_TYPES = [BANNER];
const BIDDER_API_URL = 'http://pmp-stg-server.tw.appier.biz/v1/prebid/bid';

export const spec = {
  code: 'appier',
  supportedMediaTypes: SUPPORTED_AD_TYPES,

  isBidRequestValid: function (bid) {
    return typeof bid.params.zoneId === 'string';
  },

  buildRequests: function (bidRequests, bidderRequest) {
    if (bidRequests.length === 0) {
      return [];
    }

    return [{
      method: 'POST',
      url: BIDDER_API_URL,
      data: bidRequests
    }];
  },

};

registerBidder(spec);
