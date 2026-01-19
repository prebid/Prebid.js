import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, VIDEO } from '../src/mediaTypes.js';
import { deepSetValue, replaceAuctionPrice, deepClone, deepAccess } from '../src/utils.js';
import { ortbConverter } from '../libraries/ortbConverter/converter.js';
import { getUserSyncs } from '../libraries/vizionikUtils/vizionikUtils.js';

const BIDDER_CODE = 'vistars';
const DEFAULT_ENDPOINT = 'ex-asr.vistarsagency.com';
const SYNC_ENDPOINT = 'sync.vistarsagency.com';
const ADOMAIN = 'vistarsagency.com';
const TIME_TO_LIVE = 360;

const converter = ortbConverter({
  context: {
    netRevenue: true,
    ttl: 30
  },
  request(buildRequest, imps, bidderRequest, context) {
    const request = buildRequest(imps, bidderRequest, context);
    deepSetValue(request, 'ext.prebid', true);

    return request;
  },
  bidResponse(buildBidResponse, bid, context) {
    const bidResponse = buildBidResponse(bid, context);
    bidResponse.adm = replaceAuctionPrice(bidResponse.adm, bidResponse.price);
    bidResponse.burl = replaceAuctionPrice(bidResponse.burl, bidResponse.price);
    bidResponse.nurl = replaceAuctionPrice(bidResponse.nurl, bidResponse.price);

    return bidResponse;
  }
});

export const spec = {
  code: BIDDER_CODE,

  isBidRequestValid: function(bid) {
    const valid = bid.params.source;

    return !!valid;
  },

  buildRequests: function(bids, bidderRequest) {
    return bids.map((bid) => {
      const endpoint = bid.params.endpoint || DEFAULT_ENDPOINT;
      return {
        method: 'POST',
        url: `https://${endpoint}/bid?source=${bid.params.source}`,
        data: converter.toORTB({
          bidRequests: [bid],
          bidderRequest: deepClone(bidderRequest),
          context: {
            mediaType: deepAccess(bid, 'mediaTypes.video') ? VIDEO : BANNER
          },
        }),
      };
    });
  },

  interpretResponse: function(response, request) {
    if (!response?.body) {
      return [];
    }

    const bids = converter.fromORTB({response: response.body, request: request.data}).bids;
    bids.forEach((bid) => {
      bid.meta = bid.meta || {};
      bid.meta.advertiserDomains = bid.meta.advertiserDomains || [];
      if (bid.meta.advertiserDomains.length === 0) {
        bid.meta.advertiserDomains.push(ADOMAIN);
      }

      bid.ttl = bid.ttl || TIME_TO_LIVE;
    });

    return bids;
  },

  getUserSyncs: getUserSyncs(SYNC_ENDPOINT),

  supportedMediaTypes: [ BANNER, VIDEO ]
}

registerBidder(spec);
