import { registerBidder } from '../src/adapters/bidderFactory'
import * as utils from '../src/utils'
import { BANNER } from '../src/mediaTypes'
import { config } from '../src/config'

const BIDDER_CODE = 'rdn';
const ENDPOINT = 'https://s-bid.rmp.rakuten.co.jp/h';

export const spec = {
  code: BIDDER_CODE,
  isBidRequestValid: bid => !!bid.params.adSpotId,
  buildRequests: validBidRequests => {
    const bidRequests = [];
    validBidRequests.forEach(bid => {
      const params = bid.params;
      bidRequests.push({
        method: 'GET',
        url: config.getConfig('rdn.endpoint') || ENDPOINT,
        data: {
          bi: bid.bidId,
          t: params.adSpotId,
          s: document.location.protocol,
          ua: navigator.userAgent,
          l:
            navigator.browserLanguage ||
            navigator.language,
          d: document.domain,
          tp: encodeURIComponent(utils.getTopWindowUrl()),
          pp: encodeURIComponent(utils.getTopWindowReferrer())
        }
      })
    });
    return bidRequests
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
        currency: sb.currency || 'JPY',
        netRevenue: (typeof sb.net_revenue === 'undefined') ? true : !!sb.net_revenue,
        mediaType: BANNER,
        ttl: sb.ttl,
        referrer: utils.getTopWindowUrl(),
        ad: sb.ad
      });
    }

    return bidResponses
  },

  getUserSyncs: function(syncOptions, serverResponses) {
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
}

registerBidder(spec);
