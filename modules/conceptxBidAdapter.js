import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER } from '../src/mediaTypes.js';

const BIDDER_CODE = 'conceptx';
const ENDPOINT_URL = 'https://cxba-s2s.cncpt.dk/openrtb2/auction';
const GVLID = 1340;

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER],
  gvlid: GVLID,

  isBidRequestValid: function (bid) {
    return !!(bid.bidId && bid.params && bid.params.adunit);
  },

  buildRequests: function (validBidRequests, bidderRequest) {
    const requests = [];

    for (let i = 0; i < validBidRequests.length; i++) {
      const bid = validBidRequests[i];
      const {
        adUnitCode,
        auctionId,
        bidId,
        bidder,
        bidderRequestId,
        ortb2 = {},
      } = bid;
      const params = bid.params || {};

      // PBS URL + GDPR query params
      let url = ENDPOINT_URL;
      const query = [];

      // Only add GDPR params when gdprApplies is explicitly 0 or 1
      if (bidderRequest && bidderRequest.gdprConsent) {
        let gdprApplies = bidderRequest.gdprConsent.gdprApplies;
        if (typeof gdprApplies === 'boolean') {
          gdprApplies = gdprApplies ? 1 : 0;
        }
        if (gdprApplies === 0 || gdprApplies === 1) {
          query.push('gdpr_applies=' + gdprApplies);
          if (bidderRequest.gdprConsent.consentString) {
            query.push(
              'gdpr_consent=' +
                encodeURIComponent(bidderRequest.gdprConsent.consentString)
            );
          }
        }
      }

      if (query.length) {
        url += '?' + query.join('&');
      }

      // site
      const page =
        params.site || (ortb2.site && ortb2.site.page) || '';
      const domain =
        params.domain || (ortb2.site && ortb2.site.domain) || page;

      const site = {
        id: domain || page || adUnitCode,
        domain: domain || '',
        page: page || '',
      };

      // banner sizes from mediaTypes.banner.sizes
      const formats = [];
      if (
        bid.mediaTypes &&
        bid.mediaTypes.banner &&
        bid.mediaTypes.banner.sizes
      ) {
        let sizes = bid.mediaTypes.banner.sizes;
        if (sizes.length && typeof sizes[0] === 'number') {
          sizes = [sizes];
        }
        for (let j = 0; j < sizes.length; j++) {
          const size = sizes[j];
          if (size && size.length === 2) {
            formats.push({ w: size[0], h: size[1] });
          }
        }
      }

      const banner = formats.length ? { format: formats } : {};

      // currency & timeout
      let currency = 'DKK';
      if (
        bidderRequest &&
        bidderRequest.currency &&
        bidderRequest.currency.adServerCurrency
      ) {
        currency = bidderRequest.currency.adServerCurrency;
      }

      const tmax = (bidderRequest && bidderRequest.timeout) || 500;

      // device
      const ua =
        typeof navigator !== 'undefined' && navigator.userAgent
          ? navigator.userAgent
          : 'Mozilla/5.0';
      const device = { ua };

      // build OpenRTB request for PBS with stored requests
      const ortbRequest = {
        id: auctionId || bidId,
        site,
        device,
        cur: [currency],
        tmax,
        imp: [
          {
            id: bidId,
            banner,
            ext: {
              prebid: {
                storedrequest: {
                  id: params.adunit,
                },
              },
            },
          },
        ],
        ext: {
          prebid: {
            storedrequest: {
              id: 'cx_global',
            },
            custommeta: {
              adUnitCode,
              auctionId,
              bidId,
              bidder,
              bidderRequestId,
            },
          },
        },
      };

      // GDPR in body
      if (bidderRequest && bidderRequest.gdprConsent) {
        let gdprAppliesBody = bidderRequest.gdprConsent.gdprApplies;
        if (typeof gdprAppliesBody === 'boolean') {
          gdprAppliesBody = gdprAppliesBody ? 1 : 0;
        }

        if (!ortbRequest.user) ortbRequest.user = {};
        if (!ortbRequest.user.ext) ortbRequest.user.ext = {};

        if (bidderRequest.gdprConsent.consentString) {
          ortbRequest.user.ext.consent =
            bidderRequest.gdprConsent.consentString;
        }

        if (!ortbRequest.regs) ortbRequest.regs = {};
        if (!ortbRequest.regs.ext) ortbRequest.regs.ext = {};

        if (gdprAppliesBody === 0 || gdprAppliesBody === 1) {
          ortbRequest.regs.ext.gdpr = gdprAppliesBody;
        }
      }

      // user IDs -> user.ext.eids
      if (bid.userIdAsEids && bid.userIdAsEids.length) {
        if (!ortbRequest.user) ortbRequest.user = {};
        if (!ortbRequest.user.ext) ortbRequest.user.ext = {};
        ortbRequest.user.ext.eids = bid.userIdAsEids;
      }

      requests.push({
        method: 'POST',
        url,
        options: {
          withCredentials: true,
        },
        data: JSON.stringify(ortbRequest),
      });
    }

    return requests;
  },

  interpretResponse: function (serverResponse, request) {
    const body =
      serverResponse && serverResponse.body ? serverResponse.body : {};

    // PBS OpenRTB: seatbid[].bid[]
    if (
      !body.seatbid ||
      !Array.isArray(body.seatbid) ||
      body.seatbid.length === 0
    ) {
      return [];
    }

    const currency = body.cur || 'DKK';
    const bids = [];

    // recover referrer (site.page) from original request
    let referrer = '';
    try {
      if (request && request.data) {
        const originalReq =
          typeof request.data === 'string'
            ? JSON.parse(request.data)
            : request.data;
        if (originalReq && originalReq.site && originalReq.site.page) {
          referrer = originalReq.site.page;
        }
      }
    } catch (_) {}

    for (let i = 0; i < body.seatbid.length; i++) {
      const seatbid = body.seatbid[i];
      if (!seatbid.bid || !Array.isArray(seatbid.bid)) continue;

      for (let j = 0; j < seatbid.bid.length; j++) {
        const b = seatbid.bid[j];

        if (!b || typeof b.price !== 'number' || !b.adm) continue;

        bids.push({
          requestId: b.impid || b.id,
          cpm: b.price,
          width: b.w,
          height: b.h,
          creativeId: b.crid || b.id || '',
          dealId: b.dealid || b.dealId || undefined,
          currency,
          netRevenue: true,
          ttl: 300,
          referrer,
          ad: b.adm,
        });
      }
    }

    return bids;
  },

  /**
   * Cookie sync for conceptx is handled by the enrichment script's runPbsCookieSync,
   * which calls https://cxba-s2s.cncpt.dk/cookie_sync with bidders. The PBS returns
   * bidder_status with usersync URLs, and the script runs iframe/image syncs.
   * The adapter does not return sync URLs here since those come from the cookie_sync
   * endpoint, not the auction response.
   */
  getUserSyncs: function () {
    return [];
  },
};

registerBidder(spec);
