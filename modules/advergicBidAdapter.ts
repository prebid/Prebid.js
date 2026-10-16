/**
 * Prebid Adapter for Advergic
 * This adapter connects Prebid.js to the Advergic DSP server
 * Supports the Banner ad format only.
 *
 * @module advergicBidAdapter
 */
import { registerBidder } from '../src/adapters/bidderFactory.js';
import type { BidderSpec } from '../src/adapters/bidderFactory.js';
import { BANNER } from '../src/mediaTypes.js';
import { ajax } from '../src/ajax.js';
import { deepAccess, isArray, logError, logWarn, isFn } from '../src/utils.js';
import { config } from '../src/config.js';

const BIDDER_CODE = 'advergic';
const ENDPOINT_URL = 'https://pbs.avads.live/rtb/bid';
const WIN_URL = 'https://pbs.avads.live/rtb/win';
const TIMEOUT_URL = 'https://pbs.avads.live/rtb/timeout';
const ERROR_URL = 'https://pbs.avads.live/rtb/error';
const SYNC_URL = 'https://pbs.avads.live/id/setuid?bidder=advergic';
const ADAPTER_VERSION = '1.0.0';
const GVLID: number | undefined = undefined; // TODO: Register with IAB Global Vendor List
/* -------------------------------------------------------------------------- */
/*                         Public API type declarations                       */
/* -------------------------------------------------------------------------- */
/**
 * Bid params accepted by the Advergic adapter (`bids[].params`).
 */
export type AdvergicBidParams = {
  /**
   * Advergic account identifier (required).
   */
  accountId: string;
  /**
   * Optional endpoint identifier; used as `imp.tagid`, falls back to the ad unit code.
   */
  endpointId?: string;
  /**
   * Optional publisher identifier; overrides `publisher.id` in the active site, app, or DOOH context.
   */
  publisherId?: string;
  /**
   * Banner position (OpenRTB `banner.pos`). Defaults to 0.
   */
  position?: number;
  /**
   * Arbitrary custom data forwarded in `imp.ext.advergic.custom`.
   */
  custom?: Record<string, unknown>;
};
declare module '../src/adapters/bidderFactory.js' {
  interface BidderParams {
    [BIDDER_CODE]: AdvergicBidParams;
  }
}
/**
 * Publisher-level configuration read via `pbjs.setConfig({ advergic: {...} })`.
 */
export type AdvergicConfig = {
  /**
   * When true, disables optional win/timeout/error analytics requests.
   */
  disableEventTracking?: boolean;
};
declare module '../src/config.js' {
  interface Config {
    advergic?: AdvergicConfig;
  }
}
/* -------------------------------------------------------------------------- */
/*                             Internal type helpers                          */
/* -------------------------------------------------------------------------- */
type FirstPartyData = {
  /** Preserve every publisher/core-provided root-level ORTB2 field. */
  [key: string]: any;
  site: Record<string, any>;
  user: Record<string, any>;
  device: Record<string, any>;
  regs: Record<string, any>;
  source: Record<string, any>;
};
type AdvergicSeatBid = {
  seat?: string;
  bid?: AdvergicServerBid[];
  [key: string]: any;
};
type AdvergicServerBid = {
  id?: string;
  impid?: string;
  price?: number;
  w?: number;
  h?: number;
  crid?: string;
  adid?: string;
  cid?: string;
  dealid?: string;
  adm?: string;
  adomain?: string[];
  cat?: string[];
  burl?: string;
  nurl?: string;
  lurl?: string;
  exp?: number;
  ext?: {
    dsa?: unknown;
    advertiser_name?: string;
    brand?: string;
    [key: string]: any;
  };
  [key: string]: any;
};
type AdvergicServerResponseBody = {
  cur?: string;
  seatbid?: AdvergicSeatBid[];
  ext?: {
    sync?: {
      iframe?: string[];
      image?: string[];
    };
    [key: string]: any;
  };
  [key: string]: any;
};
/**
 * Bid response object built by `interpretResponse`. Extends the standard Prebid
 * bid fields with Advergic-specific ones used for win tracking.
 */
type AdvergicBidResponse = {
  requestId: string;
  cpm: number;
  currency: string;
  width?: number;
  height?: number;
  creativeId?: string;
  bidId?: string;
  campaignId?: string;
  impId?: string;
  dealId?: string | undefined;
  ttl: number;
  netRevenue: boolean;
  meta: Record<string, any>;
  ad?: string;
  mediaType?: string;
  burl?: string;
  originalBid?: AdvergicServerBid;
  advergicAuctionId?: string;
  advergicOriginalCpm?: number;
  advergicOriginalCurrency?: string;
  advergicAdId?: string;
};
/* -------------------------------------------------------------------------- */
/*                                   Helpers                                  */
/* -------------------------------------------------------------------------- */
/**
 * Normalize unknown ORTB2 values to objects before spreading them.
 * This also avoids TypeScript spread errors on DeepPartial<ORTBRequest> fields.
 */
function asRecord(value: unknown): Record<string, any> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, any>
    : {};
}

/**
 * Convert Prebid size tuples to OpenRTB banner format entries.
 */
function toBannerFormats(sizes: unknown): Array<{ w: number; h: number }> {
  if (!Array.isArray(sizes)) {
    return [];
  }

  // Accept either a single [width, height] tuple or [[width, height], ...].
  const sizeTuples = sizes.length === 2 && sizes.every((value) => typeof value === 'number')
    ? [sizes]
    : sizes;

  return sizeTuples
    .filter((size) => Array.isArray(size) && size.length >= 2 &&
      Number.isFinite(size[0]) && Number.isFinite(size[1]))
    .map((size) => ({ w: size[0], h: size[1] }));
}

/**
 * Resolve the COPPA flag for the request. Prefers the enriched ORTB2 signal
 * (bidderRequest.ortb2.regs.coppa) and only falls back to the legacy `coppa`
 * config for compatibility when the ORTB2 value is absent.
 * @param bidderRequest The bidder request object
 * @returns COPPA flag (0 or 1)
 */
function getCoppa(bidderRequest: any): number {
  const ortbCoppa = bidderRequest?.ortb2?.regs?.coppa;
  if (typeof ortbCoppa === 'number') {
    return ortbCoppa;
  }
  return config.getConfig('coppa') === true ? 1 : 0;
}
/**
 * Read normalized ORTB2 data provided by Prebid core.
 * @param bidderRequest Prebid's bidder request
 * @returns All ORTB2 fields, with commonly used nested sections normalized
 */
function getFirstPartyData(bidderRequest: any): FirstPartyData {
  const ortb2 = asRecord(bidderRequest?.ortb2);
  return {
    // Keep the complete ORTB2 object, including root-level fields such as
    // bcat, badv, bapp, wlang, and any future publisher/core extensions.
    ...ortb2,
    // Normalize the commonly consumed nested sections for safe adapter access.
    site: asRecord(ortb2.site),
    user: asRecord(ortb2.user),
    device: asRecord(ortb2.device),
    regs: asRecord(ortb2.regs),
    source: asRecord(ortb2.source)
  };
}
/**
 * Check whether optional bidder event tracking has been disabled by the publisher.
 * This provides the required publisher control for the adapter's non-auction
 * win/timeout/error analytics requests.
 * @returns {boolean} True when event tracking is disabled.
 */
function isEventTrackingDisabled(): boolean {
  return config.getConfig('advergic.disableEventTracking') === true;
}
/**
 * Replace OpenRTB billing macros using the original request/response values.
 * @param url Billing notification URL with macros
 * @param bid Prebid bid response plus retained Advergic source values
 * @returns URL with supported macros resolved
 */
function replaceBidMacros(url: string, bid: any): string {
  const originalBid = asRecord(bid.originalBid);
  const price = originalBid.price ?? bid.advergicOriginalCpm ?? bid.originalCpm ?? bid.cpm;
  const currency = bid.advergicOriginalCurrency ?? bid.originalCurrency ?? bid.currency ?? 'USD';
  const auctionId = bid.advergicAuctionId ?? '';

  return url
    .replace(/\$\{AUCTION_PRICE\}/g, String(price ?? ''))
    .replace(/\$\{AUCTION_CURRENCY\}/g, String(currency))
    .replace(/\$\{AUCTION_ID\}/g, String(auctionId))
    .replace(/\$\{AUCTION_BID_ID\}/g, String(originalBid.id ?? bid.bidId ?? ''))
    .replace(/\$\{AUCTION_IMP_ID\}/g, String(originalBid.impid ?? bid.impId ?? bid.requestId ?? ''))
    .replace(/\$\{AUCTION_AD_ID\}/g, String(originalBid.adid ?? bid.advergicAdId ?? ''));
}
/* -------------------------------------------------------------------------- */
/*                                Bidder spec                                 */
/* -------------------------------------------------------------------------- */
export const spec: BidderSpec<typeof BIDDER_CODE> = {
  code: BIDDER_CODE,
  gvlid: GVLID,
  supportedMediaTypes: [BANNER],
  /**
   * Determines whether or not the given bid request is valid
   * @param bid The bid params to validate
   * @return True if this is a valid bid, and false otherwise
   */
  isBidRequestValid: function (bid) {
    // Validate required parameters
    if (!bid.params) {
      logWarn('Advergic: bid.params is required');
      return false;
    }
    // Require accountId
    if (!bid.params.accountId) {
      logWarn('Advergic: accountId is required');
      return false;
    }
    // Validate accountId type
    if (typeof bid.params.accountId !== 'string') {
      logWarn('Advergic: accountId must be a string');
      return false;
    }
    // Banner-only: require a banner mediaType
    if (!bid.mediaTypes || !bid.mediaTypes.banner) {
      logWarn('Advergic: bid.mediaTypes.banner is required');
      return false;
    }
    return true;
  },
  /**
   * Make a server request from the list of BidRequests
   * @param validBidRequests an array of bids
   * @param bidderRequest master bidRequest object
   * @return Info describing the request to the server
   */
  buildRequests: function (validBidRequests, bidderRequest) {
    const ortb2 = asRecord(bidderRequest?.ortb2);
    const ortb2Ext = asRecord(ortb2.ext);
    const ortb2AdvergicExt = asRecord(ortb2Ext.advergic);
    const fpd = getFirstPartyData(bidderRequest);

    // Build impression objects while preserving publisher-provided ORTB2 fields.
    const imps = validBidRequests.map((bidRequest: any) => {
      const ortb2Imp = asRecord(bidRequest.ortb2Imp);
      const ortb2ImpExt = asRecord(ortb2Imp.ext);
      const ortb2ImpAdvergicExt = asRecord(ortb2ImpExt.advergic);
      const imp: Record<string, any> = {
        ...ortb2Imp,
        id: bidRequest.bidId,
        tagid: bidRequest.params.endpointId || bidRequest.adUnitCode,
        secure: 1,
        ext: {
          ...ortb2ImpExt,
          accountId: bidRequest.params.accountId,
          advergic: {
            ...ortb2ImpAdvergicExt,
            adUnitCode: bidRequest.adUnitCode,
            transactionId: bidRequest.transactionId,
            ...(bidRequest.params.publisherId && { publisherId: bidRequest.params.publisherId }),
            ...(bidRequest.params.custom && { custom: bidRequest.params.custom })
          }
        }
      };

      // Add floor price if available, including a valid zero floor.
      if (isFn(bidRequest.getFloor)) {
        const floorInfo = bidRequest.getFloor({
          currency: 'USD',
          mediaType: '*',
          size: '*'
        });
        if (floorInfo && typeof floorInfo.floor === 'number' && Number.isFinite(floorInfo.floor)) {
          imp.bidfloor = floorInfo.floor;
          imp.bidfloorcur = floorInfo.currency || 'USD';
        }
      }

      if (bidRequest.mediaTypes?.banner) {
        const banner = asRecord(bidRequest.mediaTypes.banner);
        const ortbBanner = asRecord(ortb2Imp.banner);
        const formats = toBannerFormats(banner.sizes ?? bidRequest.sizes);
        const normalizedBanner: Record<string, any> = { ...ortbBanner };
        const bannerFieldsToPreserve = [
          'battr', 'btype', 'mimes', 'api', 'topframe', 'expdir', 'rwdd', 'id', 'alt', 'vcm', 'priv'
        ];

        // Prefer normalized ortb2Imp.banner values; fill missing restrictions
        // from mediaTypes.banner so publisher exclusions are not lost.
        bannerFieldsToPreserve.forEach((field) => {
          if (normalizedBanner[field] == null && banner[field] != null) {
            normalizedBanner[field] = banner[field];
          }
        });

        imp.banner = {
          ...normalizedBanner,
          format: formats.length ? formats : (Array.isArray(ortbBanner.format) ? ortbBanner.format : []),
          pos: banner.pos ?? ortbBanner.pos ?? bidRequest.params.position ?? 0
        };

        if (formats.length > 0) {
          imp.banner.w = ortbBanner.w ?? formats[0].w;
          imp.banner.h = ortbBanner.h ?? formats[0].h;
        }
      }

      return imp;
    });

    const ortbRegs = fpd.regs;
    const ortbRegsExt = asRecord(ortbRegs.ext);
    const ortbSource = fpd.source;
    const ortbSourceExt = asRecord(ortbSource.ext);
    const publisherId = (validBidRequests[0]?.params as AdvergicBidParams | undefined)?.publisherId;

    const ortbRequest: Record<string, any> = {
      // Start with all request-level ORTB2 fields so bcat, badv, bapp, wlang,
      // and other publisher exclusions/settings are preserved.
      ...ortb2,
      id: bidderRequest.bidderRequestId || bidderRequest.auctionId,
      at: 1,
      tmax: bidderRequest.timeout,
      cur: ['USD'],
      // Device signals are taken from Prebid's normalized ORTB2 object only.
      device: { ...fpd.device },
      // Do not create a separate adapter-specific user identifier.
      user: { ...fpd.user },
      imp: imps,
      source: {
        ...ortbSource,
        fd: 1,
        ext: {
          ...ortbSourceExt,
          stype: 'prebid_unconfigured',
          bidder: BIDDER_CODE,
          prebid_version: '$prebid.version$'
        }
      },
      regs: {
        ...ortbRegs,
        coppa: getCoppa(bidderRequest),
        ext: { ...ortbRegsExt }
      },
      ext: {
        ...ortb2Ext,
        advergic: {
          ...ortb2AdvergicExt,
          adapter_version: ADAPTER_VERSION,
          integration_type: 'prebid'
        }
      }
    };

    // OpenRTB allows only one client context. Mirror Prebid core's priority:
    // DOOH, then app, then site. Do not synthesize a site for app/DOOH traffic.
    const activeClientSection = ['dooh', 'app', 'site'].find((section) =>
      Object.keys(asRecord(ortb2[section])).length > 0
    );
    (['site', 'app', 'dooh'] as const).forEach((section) => {
      if (section !== activeClientSection) {
        delete ortbRequest[section];
      }
    });

    // Apply the adapter's optional publisher ID only within the active client
    // context, without adding a conflicting Site object to app/DOOH requests.
    if (activeClientSection && publisherId) {
      const activeClient = asRecord(ortbRequest[activeClientSection]);
      ortbRequest[activeClientSection] = {
        ...activeClient,
        publisher: {
          ...asRecord(activeClient.publisher),
          id: publisherId
        }
      };
    }

    // Add GDPR consent without discarding other publisher-provided user.ext fields.
    if (bidderRequest.gdprConsent) {
      ortbRequest.regs.ext.gdpr = bidderRequest.gdprConsent.gdprApplies ? 1 : 0;
      if (bidderRequest.gdprConsent.consentString) {
        ortbRequest.user.ext = {
          ...asRecord(ortbRequest.user.ext),
          consent: bidderRequest.gdprConsent.consentString
        };
      }
      if (bidderRequest.gdprConsent.addtlConsent) {
        ortbRequest.user.ext = {
          ...asRecord(ortbRequest.user.ext),
          ConsentedProvidersSettings: {
            ...asRecord(asRecord(ortbRequest.user.ext).ConsentedProvidersSettings),
            consented_providers: bidderRequest.gdprConsent.addtlConsent
          }
        };
      }
    }

    if (bidderRequest.uspConsent) {
      ortbRequest.regs.ext.us_privacy = bidderRequest.uspConsent;
    }

    if (bidderRequest.gppConsent) {
      ortbRequest.regs.ext.gpp = bidderRequest.gppConsent.gppString;
      ortbRequest.regs.ext.gpp_sid = bidderRequest.gppConsent.applicableSections;
    }

    const schain = deepAccess(validBidRequests[0], 'schain');
    if (schain) {
      ortbRequest.source.ext.schain = schain;
    }

    const eids = deepAccess(validBidRequests[0], 'userIdAsEids');
    if (eids && eids.length) {
      ortbRequest.user.ext = {
        ...asRecord(ortbRequest.user.ext),
        eids
      };
    }

    return {
      method: 'POST',
      url: ENDPOINT_URL,
      data: ortbRequest,
      options: {
        contentType: 'text/plain;charset=UTF-8',
        withCredentials: true
      }
    } as any;
  },

  /**
   * Unpack the response from the server into a list of bids
   * @param serverResponse A successful response from the server
   * @param bidRequest The corresponding bid request
   * @return An array of bids which were nested inside the server response
   */
  interpretResponse: function (serverResponse, bidRequest) {
    const bidResponses: AdvergicBidResponse[] = [];
    if (!serverResponse || !serverResponse.body) {
      logWarn('Advergic: Empty server response');
      return bidResponses as any;
    }
    const response = serverResponse.body as AdvergicServerResponseBody;
    const requestData = asRecord(bidRequest?.data);
    // Prefer the exact outbound OpenRTB request ID for AUCTION_ID macros.
    const outboundAuctionId = requestData.id || response.id || '';
    // Handle OpenRTB 2.5 response format
    if (!response.seatbid || !isArray(response.seatbid)) {
      logWarn('Advergic: Invalid response format - missing seatbid');
      return bidResponses as any;
    }
    response.seatbid.forEach((seatbid: AdvergicSeatBid) => {
      if (!seatbid.bid || !isArray(seatbid.bid)) {
        return;
      }
      seatbid.bid.forEach((bid: AdvergicServerBid) => {
        // Validate required fields
        if (!bid.impid || !bid.price || bid.price <= 0) {
          logWarn('Advergic: Invalid bid object', bid);
          return;
        }
        const bidResponse: AdvergicBidResponse = {
          requestId: bid.impid,
          cpm: bid.price,
          currency: response.cur || 'USD',
          advergicAuctionId: outboundAuctionId,
          advergicOriginalCpm: bid.price,
          advergicOriginalCurrency: response.cur || 'USD',
          // Keep the server creative ID separate from Prebid's core-generated adId.
          advergicAdId: bid.adid || '',
          width: bid.w,
          height: bid.h,
          creativeId: bid.crid || bid.id,
          bidId: bid.id, // Backend's BidID for win tracking
          campaignId: bid.cid, // Campaign ID for analytics
          impId: bid.impid, // Explicit impression ID
          dealId: bid.dealid || undefined,
          ttl: typeof bid.exp === 'number' && Number.isFinite(bid.exp) && bid.exp > 0 ? bid.exp : 300,
          netRevenue: true,
          meta: {
            advertiserDomains: bid.adomain || [],
            networkName: seatbid.seat,
            mediaType: BANNER
          }
        };
        // Add DSA (Digital Services Act) transparency info if present
        if (bid.ext && bid.ext.dsa) {
          bidResponse.meta.dsa = bid.ext.dsa;
        }
        // Banner ad (only supported creative type)
        if (bid.adm) {
          bidResponse.ad = bid.adm;
          bidResponse.mediaType = BANNER;
          // IAB category
          if (bid.cat && bid.cat.length > 0) {
            bidResponse.meta.primaryCatId = bid.cat[0];
            bidResponse.meta.secondaryCatIds = bid.cat.slice(1);
          }
        } else {
          logWarn('Advergic: Bid missing adm, skipping', bid);
          return;
        }
        // Add tracking pixels
        if (bid.burl) {
          bidResponse.burl = bid.burl;
        }
        // Add advertiser name if available
        if (bid.ext && bid.ext.advertiser_name) {
          bidResponse.meta.advertiserName = bid.ext.advertiser_name;
        }
        // Add brand name
        if (bid.ext && bid.ext.brand) {
          bidResponse.meta.brandName = bid.ext.brand;
        }
        // Store original bid for win notification
        bidResponse.originalBid = bid;
        bidResponses.push(bidResponse);
      });
    });
    return bidResponses as any;
  },
  /**
   * Register User Sync Pixels
   * @param syncOptions Configuration object
   * @param serverResponses List of server's responses
   * @param gdprConsent GDPR consent object
   * @param uspConsent US Privacy consent string
   * @param gppConsent GPP consent object
   * @return The user syncs which should be dropped
   */
  getUserSyncs: function (syncOptions, serverResponses, gdprConsent, uspConsent, gppConsent, coppa) {
    const syncs: Array<{
      type: 'iframe' | 'image';
      url: string;
    }> = [];
    // Do not establish or refresh identifiers for child-directed traffic.
    if (coppa || config.getConfig('coppa') === true) {
      return syncs;
    }
    // Build query parameters for consent
    const queryParams: string[] = [];
    if (gdprConsent) {
      queryParams.push(`gdpr=${gdprConsent.gdprApplies ? 1 : 0}`);
      if (gdprConsent.consentString) {
        queryParams.push(`gdpr_consent=${encodeURIComponent(gdprConsent.consentString)}`);
      }
    }
    if (uspConsent) {
      queryParams.push(`us_privacy=${encodeURIComponent(uspConsent)}`);
    }
    if (gppConsent) {
      queryParams.push(`gpp=${encodeURIComponent(gppConsent.gppString)}`);
      queryParams.push(`gpp_sid=${encodeURIComponent(gppConsent.applicableSections?.join(',') || '')}`);
    }
    const queryString = queryParams.join('&');
    const appendQueryParams = (url: string): string => {
      if (!queryString) {
        return url;
      }
      return url + (url.includes('?') ? '&' : '?') + queryString;
    };
    // Check if server returned user sync URLs
    if (serverResponses && serverResponses.length > 0) {
      serverResponses.forEach((response: any) => {
        if (response.body && response.body.ext && response.body.ext.sync) {
          const syncUrls = response.body.ext.sync;
          if (syncOptions.iframeEnabled && syncUrls.iframe && isArray(syncUrls.iframe)) {
            syncUrls.iframe.forEach((url: string) => {
              syncs.push({
                type: 'iframe',
                url: appendQueryParams(url)
              });
            });
          }
          if (syncOptions.pixelEnabled && syncUrls.image && isArray(syncUrls.image)) {
            syncUrls.image.forEach((url: string) => {
              syncs.push({
                type: 'image',
                url: appendQueryParams(url)
              });
            });
          }
        }
      });
    }
    // If no server-provided sync URL was accepted, use the documented Advergic
    // setuid fallback to establish or refresh the _advid identifier.
    if (syncs.length === 0) {
      if (syncOptions.iframeEnabled) {
        syncs.push({
          type: 'iframe',
          url: appendQueryParams(`${SYNC_URL}&f=i`)
        });
      } else if (syncOptions.pixelEnabled) {
        syncs.push({
          type: 'image',
          url: appendQueryParams(`${SYNC_URL}&f=b`)
        });
      }
    }

    return syncs;
  },
  onBidBillable(bid) {
    // Fire OpenRTB billing notification URL (burl). This is part of the
    // standard bid response and is intentionally not disabled by the optional
    // analytics tracking switch.
    if (bid.burl) {
      const burlWithMacros = replaceBidMacros(bid.burl, bid);
      ajax(burlWithMacros, null, null, {
        method: 'GET',
        withCredentials: true,
        keepalive: true
      });
    }
  },
  /**
   * Handle win notification
   * @param bid The bid that won the auction
   */
  onBidWon: function (bid) {
    if (isEventTrackingDisabled()) return;
    // Send win notification to Advergic for analytics
    const b = bid as any;
    const winData = {
      requestId: b.requestId,
      auctionId: b.auctionId,
      adId: b.advergicAdId,
      bidId: b.bidId, // Backend's BidID for tracking
      impId: b.impId, // Impression ID
      campaignId: b.campaignId, // Campaign ID
      cpm: b.cpm,
      currency: b.currency,
      creativeId: b.creativeId,
      adUnitCode: b.adUnitCode,
      mediaType: b.mediaType,
      size: `${b.width}x${b.height}`,
      timeToRespond: b.timeToRespond,
      timestamp: Date.now()
    };
    ajax(WIN_URL, null, JSON.stringify(winData), {
      method: 'POST',
      contentType: 'text/plain;charset=UTF-8',
      withCredentials: true,
      keepalive: true
    });
  },
  /**
   * Handle timeout
   * @param timeoutData List of bids that timed out
   */
  onTimeout: function (timeoutData) {
    if (isEventTrackingDisabled() || !timeoutData || timeoutData.length === 0) { return; }
    const timeoutPayload = (timeoutData as any[]).map((bid: any) => ({
      bidId: bid.bidId,
      auctionId: bid.auctionId,
      adUnitCode: bid.adUnitCode,
      timeout: bid.timeout,
      params: bid.params
    }));
    ajax(TIMEOUT_URL, null, JSON.stringify(timeoutPayload), {
      method: 'POST',
      contentType: 'text/plain;charset=UTF-8',
      withCredentials: true,
      keepalive: true
    });
  },
  /**
   * Handle bid error
   * @param params Error details
   * @param params.error The error that occurred
   * @param params.bidderRequest The request that caused the error
   */
  onBidderError: function ({ error, bidderRequest } = {} as any) {
    logError('Advergic: Bidder error', error);
    if (isEventTrackingDisabled()) { return; }
    // Send error notification for monitoring
    const errorData = {
      error: (error as any)?.message || 'Unknown error',
      auctionId: bidderRequest?.auctionId,
      bidderRequestId: bidderRequest?.bidderRequestId,
      timestamp: Date.now()
    };
    ajax(ERROR_URL, null, JSON.stringify(errorData), {
      method: 'POST',
      contentType: 'text/plain;charset=UTF-8',
      withCredentials: true,
      keepalive: true
    });
  }
};
registerBidder(spec);
