// DO NOT EDIT: generated from ../rakuten/index.ts
import { registerBidder } from '../../src/adapters/bidderFactory.js';
import { BANNER } from '../../src/mediaTypes.js';
import { config } from '../../src/config.js';
var BIDDER_CODE = 'rakuten';
var ENDPOINT = 'https://s-bid.rmp.rakuten.com/h';
export var spec = {
  code: BIDDER_CODE,
  isBidRequestValid: function (bid) { return !!bid.params.adSpotId; },
  buildRequests: function (validBidRequests, bidderRequest) {
    var bidRequests = [];
    validBidRequests.forEach(function (bid) {
      var params = bid.params;
      bidRequests.push({
        method: 'GET',
        url: config.getConfig('rakuten.endpoint') || ENDPOINT,
        data: {
          bi: bid.bidId,
          t: params.adSpotId,
          s: document.location.protocol,
          ua: navigator.userAgent,
          l: navigator.browserLanguage ||
                        navigator.language,
          d: document.domain,
          tp: bidderRequest.refererInfo.stack[0] || window.location.href,
          pp: bidderRequest.refererInfo.referer
        }
      });
    });
    return bidRequests;
  },
  interpretResponse: function (response, request) {
    var sb = response.body;
    var bidResponses = [];
    if (sb.cpm && sb.ad) {
      bidResponses.push({
        requestId: sb.bid_id,
        cpm: sb.cpm,
        width: sb.width || 0,
        height: sb.height || 0,
        creativeId: sb.creative_id || 0,
        dealId: sb.deal_id || '',
        currency: sb.currency || 'JPY',
        netRevenue: (typeof sb.net_revenue === 'undefined') ? true : !!sb.net_revenue,
        mediaType: BANNER,
        ttl: sb.ttl,
        ad: sb.ad
      });
    }
    return bidResponses;
  },
  getUserSyncs: function (syncOptions, serverResponses) {
    var syncs = [];
    if (syncOptions.pixelEnabled && serverResponses[0].body !== undefined) {
      var bidResponseObj = serverResponses[0].body;
      if (!bidResponseObj) {
        return [];
      }
      if (bidResponseObj.sync_urls && bidResponseObj.sync_urls.length > 0) {
        bidResponseObj.sync_urls.forEach(function (syncUrl) {
          if (syncUrl && syncUrl !== 'null' && syncUrl.length > 0) {
            syncs.push({
              type: 'image',
              url: syncUrl
            });
          }
        });
      }
    }
    return syncs;
  }
};
registerBidder(spec);
