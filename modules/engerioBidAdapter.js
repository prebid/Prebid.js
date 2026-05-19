import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER } from '../src/mediaTypes.js';
import { deepAccess, generateUUID, logWarn } from '../src/utils.js';

const BIDDER_CODE = 'engerio';
const ENDPOINT_URL = 'https://api.engerio.sk/api/v1/adserver/prebid/auction/';
const TTL = 300; // seconds a cached bid is valid

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER],

  /**
   * Validates a single bid request.
   * `params.adUnitCode` must match an AdSlot configured in the Engerio admin.
   */
  isBidRequestValid(bid) {
    if (!bid.params?.adUnitCode) {
      logWarn(`${BIDDER_CODE}: bid is missing required params.adUnitCode`);
      return false;
    }
    return true;
  },

  /**
   * Builds an OpenRTB 2.5 BidRequest from Prebid.js bid requests.
   */
  buildRequests(validBidRequests, bidderRequest) {
    const imps = validBidRequests.map(bid => {
      const imp = {
        id: bid.bidId,
        ext: {
          adUnitCode: bid.params.adUnitCode,
        },
      };

      const bannerMediaType = deepAccess(bid, 'mediaTypes.banner');
      if (bannerMediaType) {
        const sizes = bannerMediaType.sizes || [];
        imp.banner = {
          format: sizes.map(([w, h]) => ({ w, h })),
        };
        if (sizes.length > 0) {
          imp.banner.w = sizes[0][0];
          imp.banner.h = sizes[0][1];
        }
      }

      return imp;
    });

    const page = deepAccess(bidderRequest, 'refererInfo.page');
    const domain = deepAccess(bidderRequest, 'refererInfo.domain');

    const bidRequest = {
      id: generateUUID(),
      imp: imps,
      site: {
        page: page || undefined,
        domain: domain || undefined,
      },
      device: {
        ua: navigator.userAgent,
      },
    };

    return {
      method: 'POST',
      url: ENDPOINT_URL,
      data: JSON.stringify(bidRequest),
      options: {
        contentType: 'application/json',
        withCredentials: false,
      },
    };
  },

  /**
   * Maps an OpenRTB 2.5 BidResponse back to Prebid.js bids.
   */
  interpretResponse(serverResponse) {
    const bids = [];
    const body = serverResponse.body;

    if (!body || !Array.isArray(body.seatbid) || body.seatbid.length === 0) {
      return bids;
    }

    const currency = body.cur || 'EUR';

    body.seatbid.forEach(seatbid => {
      (seatbid.bid || []).forEach(bid => {
        if (!bid.adm || bid.price <= 0) return;

        const prebidBid = {
          requestId: bid.impid,
          cpm: bid.price,
          currency,
          width: bid.w || 0,
          height: bid.h || 0,
          creativeId: bid.crid || bid.id,
          ad: bid.adm,
          ttl: TTL,
          netRevenue: true,
        };

        if (bid.nurl) {
          prebidBid.nurl = bid.nurl;
        }

        if (bid.adomain && bid.adomain.length > 0) {
          prebidBid.meta = { advertiserDomains: bid.adomain };
        }

        bids.push(prebidBid);
      });
    });

    return bids;
  },

  /**
   * Fires the win notice (nurl) when Prebid.js renders the winning bid.
   * Engerio uses this to mark the ImpressionLog as won and deduct budget.
   */
  onBidWon(bid) {
    if (bid.nurl) {
      fetch(bid.nurl, { method: 'GET', keepalive: true }).catch(() => {});
    }
  },
};

registerBidder(spec);
