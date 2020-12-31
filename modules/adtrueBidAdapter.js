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

    payload.device = {};
    payload.device.ua = navigator.userAgent;
    payload.device.w = screen.width;
    payload.device.h = screen.height;
    payload.device.lang = navigator.language;

    payload.site = {};
    payload.site.zoneId = bids[0].params.zoneId;
    payload.site.referrer = utils.deepAccess(bidderRequest, 'refererInfo.referer');
    payload.site.pageUrl = utils.deepAccess(bidderRequest, 'refererInfo.canonicalUrl') || config.getConfig('pageUrl') || utils.deepAccess(window, 'location.href');

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
