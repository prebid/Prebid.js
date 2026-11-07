import { BidderSpec, registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER } from '../src/mediaTypes.js';

const BIDDER_CODE = 'mul';
// Production endpoint
const ENDPOINT_URL = 'https://bid5up.monetiseup.com/api/bid';
const USER_SYNC_URL = 'https://bid5up.monetiseup.com/api/usersync';

export interface MulBidParams {
  placementId?: string;
  placement?: string;
  zoneId?: string;
  [key: string]: unknown;
}

declare module '../src/adUnits' {
  interface BidderParams {
    [BIDDER_CODE]: MulBidParams;
  }
}

export const spec: BidderSpec<typeof BIDDER_CODE> = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER],

  /**
   * Validates whether or not the bid request has required publisher params.
   */
  isBidRequestValid: function (bid: { params?: MulBidParams }): boolean {
    return !!(bid && bid.params && (bid.params.placement || bid.params.placementId || bid.params.zoneId));
  },

  /**
   * Builds outgoing HTTP requests to the MonetiseUp Bidding Server.
   */
  buildRequests: function (validBidRequests: any[], bidderRequest: any) {
    const bids = validBidRequests.map((bid) => {
      const sizes = bid.mediaTypes?.banner?.sizes || bid.sizes || [];
      const floorInfo = typeof bid.getFloor === 'function' ? bid.getFloor({ currency: 'USD', mediaType: 'banner', size: '*' }) : {};

      return {
        bidId: bid.bidId,
        placementId: bid.params.placement || bid.params.placementId || bid.params.zoneId,
        sizes: sizes,
        floor: floorInfo?.floor || 0,
        floorCurrency: floorInfo?.currency || 'USD',
        params: bid.params
      };
    });

    const payload = {
      id: bidderRequest.ortb2?.source?.tid || bidderRequest.auctionId,
      page: bidderRequest.refererInfo?.page,
      domain: bidderRequest.refererInfo?.domain,
      referer: bidderRequest.refererInfo?.ref,
      consent: {
        gdprApplies: bidderRequest.gdprConsent?.gdprApplies,
        consentString: bidderRequest.gdprConsent?.consentString,
        uspConsent: bidderRequest.uspConsent,
        gppString: bidderRequest.gppConsent?.gppString,
        gppSid: bidderRequest.gppConsent?.applicableSections?.join(',')
      },
      bids: bids
    };

    return {
      method: 'POST',
      url: ENDPOINT_URL,
      data: JSON.stringify(payload),
      options: {
        contentType: 'text/plain' // Simple request prevents CORS preflight
      }
    };
  },

  /**
   * Parses server response and returns array of valid Prebid bidResponse objects.
   */
  interpretResponse: function (serverResponse: any, request: any) {
    const responses = serverResponse.body;
    if (!responses || !Array.isArray(responses) || responses.length === 0) {
      return [];
    }

    const bidResponses = [];

    for (const bid of responses) {
      if (!bid.cpm || !bid.adHtml) {
        continue;
      }

      bidResponses.push({
        requestId: bid.bidId,
        cpm: bid.cpm,
        currency: bid.currency || 'USD',
        width: bid.width,
        height: bid.height,
        creativeId: bid.creativeId || `crid_${bid.bidId}`,
        dealId: bid.dealId,
        netRevenue: true,
        ttl: 300,
        ad: bid.adHtml,
        mediaType: BANNER,
        meta: {
          advertiserDomains: bid.adomain && bid.adomain.length > 0 ? bid.adomain : ['monetiseup.com'],
          demandSource: bid.demandSource || 'MonetiseUp',
          mediaType: BANNER
        }
      });
    }

    return bidResponses;
  },

  /**
   * Registers user sync pixels (cookies) after the auction completes.
   */
  getUserSyncs: function (syncOptions: any, serverResponses: any, gdprConsent: any, uspConsent: string, gppConsent: any, coppa: boolean) {
    if (coppa) {
      return [];
    }

    const syncs = [];
    let query = '';

    if (gdprConsent) {
      if (typeof gdprConsent.gdprApplies === 'boolean') {
        query += `?gdpr=${Number(gdprConsent.gdprApplies)}&gdpr_consent=${encodeURIComponent(gdprConsent.consentString || '')}`;
      } else if (gdprConsent.consentString) {
        query += `?gdpr_consent=${encodeURIComponent(gdprConsent.consentString)}`;
      }
    }
    if (uspConsent) {
      query += `${query ? '&' : '?'}us_privacy=${encodeURIComponent(uspConsent)}`;
    }
    if (gppConsent?.gppString) {
      query += `${query ? '&' : '?'}gpp=${encodeURIComponent(gppConsent.gppString)}&gpp_sid=${encodeURIComponent(gppConsent.applicableSections?.join(',') || '')}`;
    }

    if (syncOptions.iframeEnabled) {
      syncs.push({
        type: 'iframe',
        url: `${USER_SYNC_URL}${query}${query ? '&' : '?'}type=iframe`
      });
    } else if (syncOptions.pixelEnabled) {
      syncs.push({
        type: 'image',
        url: `${USER_SYNC_URL}${query}`
      });
    }

    return syncs;
  }
};

registerBidder(spec);
