import { BidderSpec, registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, VIDEO } from '../src/mediaTypes.js';

const BIDDER_CODE = 'mul';
// Production endpoint
const ENDPOINT_URL = 'https://bid5up.monetiseup.com/api/bid';
const USER_SYNC_URL = 'https://bid5up.monetiseup.com/api/usersync';

export interface MulBidParams {
  placementId?: string;
  placement?: string;
  zoneId?: string;
  bidfloor?: number;
  bidfloorcur?: string;
  [key: string]: unknown;
}

declare module '../src/adUnits' {
  interface BidderParams {
    [BIDDER_CODE]: MulBidParams;
  }
}

export const spec: BidderSpec<typeof BIDDER_CODE> = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER, VIDEO],

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
      const bannerMedia = bid.mediaTypes?.banner;
      const videoMedia = bid.mediaTypes?.video;
      const sizes = bannerMedia?.sizes || bid.sizes || [];

      // Determine floor across supported media types
      let floor = 0;
      let floorCurrency = 'USD';
      if (typeof bid.getFloor === 'function') {
        const queryMediaType = videoMedia && !bannerMedia ? VIDEO : (bannerMedia ? BANNER : '*');
        const floorInfo = bid.getFloor({ currency: 'USD', mediaType: queryMediaType, size: '*' });
        floor = floorInfo?.floor || 0;
        floorCurrency = floorInfo?.currency || 'USD';
      } else if (bid.params?.bidfloor) {
        floor = bid.params.bidfloor;
        floorCurrency = bid.params.bidfloorcur || 'USD';
      }

      const bidItem: any = {
        bidId: bid.bidId,
        placementId: bid.params.placement || bid.params.placementId || bid.params.zoneId,
        sizes: sizes,
        floor: floor,
        floorCurrency: floorCurrency,
        params: bid.params
      };

      if (bannerMedia) {
        bidItem.banner = {
          sizes: sizes
        };
      }

      if (videoMedia) {
        bidItem.video = {
          playerSize: videoMedia.playerSize || sizes,
          context: videoMedia.context || 'instream',
          mimes: videoMedia.mimes || ['video/mp4'],
          protocols: videoMedia.protocols || [2, 3, 5, 6],
          minduration: videoMedia.minduration,
          maxduration: videoMedia.maxduration,
          startdelay: videoMedia.startdelay ?? 0,
          playbackmethod: videoMedia.playbackmethod || [1, 2],
          api: videoMedia.api || [1, 2],
          skip: videoMedia.skip ?? 0,
          skipafter: videoMedia.skipafter,
          placement: videoMedia.placement,
          plcmt: videoMedia.plcmt,
          linearity: videoMedia.linearity
        };
      }

      if (bid.ortb2Imp?.ext?.gpid) {
        bidItem.gpid = bid.ortb2Imp.ext.gpid;
      }

      return bidItem;
    });

    const ortb2 = bidderRequest.ortb2 || {};

    const payload: any = {
      id: ortb2.source?.tid || bidderRequest.auctionId,
      page: bidderRequest.refererInfo?.page,
      domain: bidderRequest.refererInfo?.domain,
      referer: bidderRequest.refererInfo?.ref,
      site: ortb2.site,
      device: ortb2.device,
      eids: ortb2.user?.ext?.eids || [],
      schain: ortb2.source?.ext?.schain || validBidRequests[0]?.ortb2?.source?.ext?.schain,
      bcat: ortb2.bcat,
      badv: ortb2.badv,
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
    const responses = serverResponse?.body;
    if (!responses || !Array.isArray(responses) || responses.length === 0) {
      return [];
    }

    const bidResponses = [];

    for (const bid of responses) {
      if (!bid.cpm) {
        continue;
      }

      const isVideo = !!(bid.vastUrl || bid.vastXml || bid.mediaType === VIDEO);

      if (!isVideo && !bid.adHtml) {
        continue;
      }
      if (isVideo && !bid.vastUrl && !bid.vastXml) {
        continue;
      }

      const mediaType = isVideo ? VIDEO : BANNER;

      const bidResponse: any = {
        requestId: bid.bidId,
        cpm: bid.cpm,
        currency: bid.currency || 'USD',
        width: bid.width,
        height: bid.height,
        creativeId: bid.creativeId || `crid_${bid.bidId}`,
        dealId: bid.dealId,
        netRevenue: true,
        ttl: bid.ttl || 300,
        mediaType: mediaType,
        meta: {
          advertiserDomains: bid.adomain && bid.adomain.length > 0 ? bid.adomain : ['monetiseup.com'],
          demandSource: bid.demandSource || 'MonetiseUp',
          mediaType: mediaType
        }
      };

      if (isVideo) {
        if (bid.vastUrl) {
          bidResponse.vastUrl = bid.vastUrl;
        }
        if (bid.vastXml) {
          bidResponse.vastXml = bid.vastXml;
        }
        bidResponse.playerSize = [bid.width, bid.height];
      } else {
        bidResponse.ad = bid.adHtml;
      }

      bidResponses.push(bidResponse);
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
