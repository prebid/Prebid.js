import { parseSizesInput, timestamp } from '../src/utils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';

const BIDDER_CODE = 'innity';
const ENDPOINT = 'https://as.innity.com/synd/';

export const spec = {
  code: BIDDER_CODE,
  isBidRequestValid: function(bid) {
    return !!(bid.params && bid.params.pub && bid.params.zone);
  },
  buildRequests: function(validBidRequests, bidderRequest) {
    return validBidRequests.map(bidRequest => {
      let parseSized = parseSizesInput(bidRequest.sizes);
      let arrSize = parseSized[0].split('x');
      return {
        method: 'GET',
        url: ENDPOINT,
        data: {
          cb: timestamp(),
          ver: 2,
          hb: 1,
          output: 'js',
          pub: bidRequest.params.pub,
          zone: bidRequest.params.zone,
          url: bidderRequest && bidderRequest.refererInfo ? encodeURIComponent(bidderRequest.refererInfo.page) : '',
          width: arrSize[0],
          height: arrSize[1],
          vpw: window.screen.width,
          vph: window.screen.height,
          callback: 'json',
          callback_uid: bidRequest.bidId,
          auction: bidRequest.auctionId,
        },
      };
    });
  },
  interpretResponse: function(serverResponse, request) {
    const res = serverResponse.body;
    const bidResponse = {
      requestId: res.callback_uid,
      cpm: parseFloat(res.cpm) / 100,
      width: res.width,
      height: res.height,
      creativeId: res.creative_id,
      currency: 'USD',
      netRevenue: true,
      ttl: 60,
      ad: '<script src="https://cdn.innity.net/frame_util.js"></script>' + res.tag,
      meta: {
        advertiserDomains: res.adomain && res.adomain.length ? res.adomain : [],
        mediaType: res.mediaType,
      }
    };
    return [bidResponse];
  }
}
registerBidder(spec);
