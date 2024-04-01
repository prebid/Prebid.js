import { parseSizesInput } from '../src/utils.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';

const BIDDER_CODE = 'revbid';
const ENDPOINT_URL = 'https://revbidder.de';

export const spec = {
  code: BIDDER_CODE,

  isBidRequestValid: function (bid) {
    return !!(bid.params.placementId);
  },

  buildRequests: function (validBidRequests, bidderRequest) {
    if (validBidRequests.length === 0) {
      return [];
    }
    return validBidRequests.map(bidRequest => {
      const sizes = parseSizesInput(bidRequest.params.size || bidRequest.sizes)[0];
      const width = sizes.split('x')[0];
      const height = sizes.split('x')[1];
      const payload = {
        placementId: bidRequest.params.placementId,
        width: width,
        height: height,
        bidId: bidRequest.bidId,
        referer: bidderRequest.refererInfo.page,
      };
      return {
        method: 'POST',
        url: ENDPOINT_URL,
        data: payload
      };
    });
  },

  interpretResponse: function (serverResponse, bidRequest) {
    const bidResponses = [];
    const response = serverResponse.body;
    const creativeId = response.creativeId || 0;
    const width = response.width || 0;
    const height = response.height || 0;
    const cpm = response.cpm || 0;
    if (width !== 0 && height !== 0 && cpm !== 0 && creativeId !== 0) {
      const dealId = response.dealid || '';
      const currency = response.currency || 'USD';
      const netRevenue = (response.netRevenue === undefined) ? true : response.netRevenue;
      const referrer = bidRequest.data.referer;
      const bidResponse = {
        requestId: response.requestId,
        cpm: cpm,
        width: response.width,
        height: response.height,
        creativeId: creativeId,
        dealId: dealId,
        currency: currency,
        netRevenue: netRevenue,
        ttl: response.timeout,
        referrer: referrer,
        ad: response.ad,
        mediaType: response.mediaType,
        meta: {
          advertiserDomains: response.advertiserDomain || []
        }
      };
      bidResponses.push(bidResponse);
    }
    return bidResponses;
  },
};
registerBidder(spec);
