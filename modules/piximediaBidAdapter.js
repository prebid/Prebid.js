import * as utils from '../src/utils';
import { registerBidder } from '../src/adapters/bidderFactory';

const BIDDER_CODE = 'piximedia';
const ENDPOINT = 'https://ad.piximedia.com/prebid';

export const spec = {
  code: BIDDER_CODE,
  isBidRequestValid: function(bid) {
    return !!(bid.params && bid.params.siteId && bid.params.placementId);
  },
  buildRequests: function(validBidRequests) {
    return validBidRequests.map(bidRequest => {
      let parseSized = utils.parseSizesInput(bidRequest.sizes);
      let arrSize = parseSized[0].split('x');
      return {
        method: 'GET',
        url: ENDPOINT,
        data: {
          timestamp: utils.timestamp(),
          pver: '1.0',
          pbparams: JSON.stringify(bidRequest.params),
          pbsizes: JSON.stringify(parseSized),
          pbwidth: arrSize[0],
          pbheight: arrSize[1],
          pbbidid: bidRequest.bidId,
        },
      };
    });
  },
  interpretResponse: function(serverResponse, request) {
    const res = serverResponse.body;
    const bidResponse = {
      requestId: res.bidId,
      cpm: parseFloat(res.cpm),
      width: res.width,
      height: res.height,
      creativeId: res.creative_id,
      currency: res.currency,
      netRevenue: true,
      ttl: 300,
      ad: res.adm
    };
    return [bidResponse];
  }
}
registerBidder(spec);
