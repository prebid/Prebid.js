import * as utils from '../src/utils.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import {config} from '../src/config.js'

const BIDDER_CODE = 'adtrue';
const ADTRUE_CURRENCY = 'USD';
const ADTRUE_TTL = 120;
const ENDPOINT_URL = 'https://hb.adtrue.com/prebid/auction';

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: ['banner', 'video'],

  isBidRequestValid: function (bid) {
    return !!(bid.params.zoneId);
  },

  buildRequests: function (validBidRequests, bidderRequest) {
    let bids = JSON.parse(JSON.stringify(validBidRequests))

    const payload = {};
    payload.prebid = true;
    payload.zoneId = bids[0].params.zoneId;

    if (bidderRequest && bidderRequest.refererInfo) {
      payload.site = {};
      payload.site.ref = encodeURIComponent(bidderRequest.refererInfo.referer);
      payload.site.lang = navigator.language;
      payload.site.top = bidderRequest.refererInfo.reachedTop;
      payload.site.ifs = bidderRequest.refererInfo.numIframes;
      payload.site.stk = bidderRequest.refererInfo.stack.map((url) => encodeURIComponent(url)).join(',')
    }
    payload.bids = bids;

    return {
      method: 'POST',
      url: ENDPOINT_URL,
      data: payload,
      bidderRequests: bids
    };
  },
  interpretResponse: function (serverResponses, bidderRequest) {
    const bidResponses = [];
    utils._each(serverResponses.body, function (response) {
      if (response.cpm > 0) {
        const bidResponse = {
          requestId: response.id,
          creativeId: response.id,
          adId: response.id,
          cpm: response.cpm,
          width: response.width,
          height: response.height,
          currency: ADTRUE_CURRENCY,
          netRevenue: true,
          ttl: ADTRUE_TTL,
          ad: response.ad
        };
        bidResponses.push(bidResponse);
      }
    });
    return bidResponses;
  },
  getUserSyncs: function (syncOptions, serverResponses) {
    const syncs = [];
    if (syncOptions.iframeEnabled) {
      syncs.push({
        type: 'iframe',
        url: 'https://hb.adtrue.com/prebid/usersync_async'
      });
    }

    if (syncOptions.pixelEnabled && serverResponses.length > 0) {
      syncs.push({
        type: 'image',
        url: 'https://hb.adtrue.com/prebid/usersync_pixel'
      });
    }
    return syncs;
  }
};
registerBidder(spec);
