import { registerBidder } from '../../src/adapters/bidderFactory.js';
import { BANNER } from '../../src/mediaTypes.js';
import { config } from '../../src/config.js';
const BIDDER_CODE = 'rakuten';
const ENDPOINT = 'https://s-bid.rmp.rakuten.com/h';
export const spec = {
  code: BIDDER_CODE,
  isBidRequestValid: bid => !!bid.params.adSpotId,
  buildRequests: (validBidRequests, bidderRequest) => {
    const bidRequests = [];
    validBidRequests.forEach(bid => {
      var _a, _b;
      const params = bid.params;
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
          // TODO: what are 'tp' and 'pp'?
          tp: bidderRequest.refererInfo.stack[0] || window.location.href,
          pp: bidderRequest.refererInfo.topmostLocation,
          gdpr: ((_a = bidderRequest.gdprConsent) === null || _a === void 0 ? void 0 : _a.gdprApplies) ? 1 : 0,
          ...((_b = bidderRequest.gdprConsent) === null || _b === void 0 ? void 0 : _b.consentString) && {
            cd: bidderRequest.gdprConsent.consentString
          },
          ...bidderRequest.uspConsent && {
            ccpa: bidderRequest.uspConsent
          }
        }
      });
    });
    return bidRequests;
  },
  interpretResponse: (response, request) => {
    const sb = response.body;
    const bidResponses = [];
    if (sb.cpm && sb.ad) {
      bidResponses.push({
        requestId: sb.bid_id,
        cpm: sb.cpm,
        width: sb.width || 0,
        height: sb.height || 0,
        creativeId: sb.creative_id || 0,
        dealId: sb.deal_id || '',
        currency: sb.currency || 'USD',
        netRevenue: (typeof sb.net_revenue === 'undefined') ? true : !!sb.net_revenue,
        mediaType: BANNER,
        ttl: sb.ttl,
        ad: sb.ad
      });
    }
    return bidResponses;
  },
  getUserSyncs: function (syncOptions, serverResponses) {
    const syncs = [];
    if (syncOptions.pixelEnabled && serverResponses[0].body !== undefined) {
      const bidResponseObj = serverResponses[0].body;
      if (!bidResponseObj) {
        return [];
      }
      if (bidResponseObj.sync_urls && bidResponseObj.sync_urls.length > 0) {
        bidResponseObj.sync_urls.forEach(syncUrl => {
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
