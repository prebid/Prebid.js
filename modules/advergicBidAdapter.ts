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
import { deepAccess, isArray, logError, logWarn, isFn, getWinDimensions, generateUUID, triggerPixel } from '../src/utils.js';
import { config } from '../src/config.js';
import { getStorageManager } from '../src/storageManager.js';

const BIDDER_CODE = 'advergic';
const ENDPOINT_URL = 'https://pbs.avads.live/rtb/bid';
const WIN_URL = 'https://pbs.avads.live/rtb/win';
const TIMEOUT_URL = 'https://pbs.avads.live/rtb/timeout';
const ERROR_URL = 'https://pbs.avads.live/rtb/error';
const SYNC_URL = 'https://pbs.avads.live/id/setuid?bidder=advergic';
const ADAPTER_VERSION = '1.0.0';
const GVLID: number | undefined = undefined; // TODO: Register with IAB Global Vendor List
const storage = getStorageManager({ bidderCode: BIDDER_CODE });

/* -------------------------------------------------------------------------- */
/*                         Public API type declarations                       */
/* -------------------------------------------------------------------------- */

/**
 * Bid params accepted by the Advergic adapter (`bids[].params`).
 */
type AdvergicBidParams = {
  /** Advergic account identifier (required). */
  accountId: string;
  /** Optional endpoint identifier; used as `imp.tagid`, falls back to the ad unit code. */
  endpointId?: string;
  /** Optional publisher identifier; used as `site.publisher.id`. */
  publisherId?: string;
  /** Banner position (OpenRTB `banner.pos`). Defaults to 0. */
  position?: number;
  /** Arbitrary custom data forwarded in `imp.ext.advergic.custom`. */
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
type AdvergicConfig = {
  /** When true, disables optional win/timeout/error analytics requests. */
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

type SiteMetadata = {
  title: string;
  description: string;
  keywords: string;
  ogTags: Record<string, string>;
  canonical: string;
  language: string;
};

type DeviceInfo = {
  ua: string;
  language: string;
  deviceType: number;
  screen: { width: number; height: number };
  viewport: { width: number; height: number };
  pixelRatio: number;
  connectionType: string | undefined;
};

type FirstPartyData = {
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
  cid?: string;
  dealid?: string;
  adm?: string;
  adomain?: string[];
  cat?: string[];
  burl?: string;
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
};

/* -------------------------------------------------------------------------- */
/*                                   Helpers                                  */
/* -------------------------------------------------------------------------- */

/**
 * Helper function to extract site metadata for fraud prevention and targeting
 * @returns {Object} Site metadata object
 */
function getSiteMetadata(): SiteMetadata {
  const metadata: SiteMetadata = {
    title: document.title || '',
    description: '',
    keywords: '',
    ogTags: {},
    canonical: '',
    language: document.documentElement.lang || navigator.language || ''
  };

  try {
    // Extract meta tags
    const metaTags = document.getElementsByTagName('meta');
    for (let i = 0; i < metaTags.length; i++) {
      const tag = metaTags[i];
      const name = tag.getAttribute('name') || tag.getAttribute('property');
      const content = tag.getAttribute('content');

      if (name && content) {
        // Standard meta tags
        if (name === 'description') metadata.description = content;
        if (name === 'keywords') metadata.keywords = content;

        // OpenGraph tags for better context
        if (name.startsWith('og:')) {
          metadata.ogTags[name] = content;
        }
      }
    }

    // Canonical URL
    const canonicalTag = document.querySelector('link[rel="canonical"]');
    if (canonicalTag) {
      metadata.canonical = canonicalTag.getAttribute('href') || '';
    }
  } catch (e) {
    logWarn('Advergic: Error collecting site metadata', e);
  }

  return metadata;
}

/**
 * Build device information object
 * @returns {Object} Device information
 */
function getDeviceInfo(): DeviceInfo {
  const winDimensions = getWinDimensions();
  return {
    ua: navigator.userAgent,
    language: navigator.language,
    deviceType: getDeviceType(),
    screen: {
      width: screen.width,
      height: screen.height
    },
    viewport: {
      width: winDimensions.innerWidth || document.documentElement.clientWidth,
      height: winDimensions.innerHeight || document.documentElement.clientHeight
    },
    pixelRatio: window.devicePixelRatio || 1,
    connectionType: deepAccess(navigator, 'connection.effectiveType')
  };
}

/**
 * Determine device type based on screen size and user agent
 * @returns {number} Device type per OpenRTB 2.5: 1=Mobile, 2=Desktop, 3=Connected TV, 4=Phone, 5=Tablet, 6=Connected Device, 7=Set Top Box
 */
function getDeviceType(): number {
  const ua = navigator.userAgent;
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
    return 5; // Tablet (OpenRTB 2.5)
  }
  if (/Mobile|iP(hone|od)|Android|BlackBerry|IEMobile|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) {
    return 1;
  }
  return 2;
}

/**
 * Get first-party data from bidderRequest (ortb2 data)
 * @param {Object} bidderRequest - The bidder request object
 * @returns {Object} First party data
 */
function getFirstPartyData(bidderRequest: any): FirstPartyData {
  const ortb2 = bidderRequest.ortb2 || {};
  return {
    site: ortb2.site || {},
    user: ortb2.user || {},
    device: ortb2.device || {},
    regs: ortb2.regs || {},
    source: ortb2.source || {}
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
 * Get or generate user ID for tracking.
 * @returns {string} User ID
 */
function getUserId(): string {
  const USER_ID_KEY = 'advergic_uid';

  try {
    let userId = storage.getDataFromLocalStorage(USER_ID_KEY);

    if (!userId) {
      userId = generateUUID();
      storage.setDataInLocalStorage(USER_ID_KEY, userId);
    }

    return userId;
  } catch (e) {
    logWarn('Advergic: Error accessing localStorage for user ID', e);
    return generateUUID();
  }
}

/**
 * Replace macros in URL
 * @param {string} url URL with macros
 * @param {Object} bid Bid object
 * @returns {string} URL with replaced macros
 */
function replaceBidMacros(url: string, bid: any): string {
  return url
    .replace(/\${AUCTION_PRICE}/g, bid.cpm)
    .replace(/\${AUCTION_CURRENCY}/g, bid.currency || 'USD')
    .replace(/\${AUCTION_ID}/g, bid.auctionId)
    .replace(/\${AUCTION_BID_ID}/g, bid.requestId)
    .replace(/\${AUCTION_IMP_ID}/g, bid.adId)
    .replace(/\${AUCTION_AD_ID}/g, bid.creativeId);
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
  isBidRequestValid: function(bid) {
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
  buildRequests: function(validBidRequests, bidderRequest) {
    const siteMetadata = getSiteMetadata();
    const deviceInfo = getDeviceInfo();
    const fpd = getFirstPartyData(bidderRequest);

    // Build impression objects per OpenRTB 2.5 spec
    const imps = validBidRequests.map((bidRequest: any, index: number) => {
      const ortb2Imp = bidRequest.ortb2Imp || {};
      const imp: Record<string, any> = {
        ...ortb2Imp,
        id: bidRequest.bidId,
        tagid: bidRequest.params.endpointId || bidRequest.adUnitCode,
        secure: window.location.protocol === 'https:' ? 1 : 0,
        ext: {
          ...ortb2Imp.ext,
          accountId: bidRequest.params.accountId,
          advergic: {
            ...ortb2Imp.ext?.advergic,
            adUnitCode: bidRequest.adUnitCode,
            transactionId: bidRequest.transactionId,
            ...(bidRequest.params.publisherId && { publisherId: bidRequest.params.publisherId }),
            ...(bidRequest.params.custom && { custom: bidRequest.params.custom })
          }
        }
      };

      // Add floor price if available
      if (isFn(bidRequest.getFloor)) {
        const floorInfo = bidRequest.getFloor({
          currency: 'USD',
          mediaType: '*',
          size: '*'
        });
        if (floorInfo && floorInfo.floor && !isNaN(floorInfo.floor)) {
          imp.bidfloor = floorInfo.floor;
          imp.bidfloorcur = floorInfo.currency || 'USD';
        }
      }

      // Banner
      if (bidRequest.mediaTypes && bidRequest.mediaTypes.banner) {
        const banner = bidRequest.mediaTypes.banner;
        const formats = (banner.sizes || bidRequest.sizes || []).map((size: number[]) => ({
          w: size[0],
          h: size[1]
        }));

        imp.banner = {
          format: formats,
          pos: bidRequest.params.position || 0,
          ...(banner.pos && { pos: banner.pos })
        };

        // Add primary size (w/h) - use first size from format array
        if (formats.length > 0) {
          imp.banner.w = formats[0].w;
          imp.banner.h = formats[0].h;
        }
      }

      return imp;
    });

    // Build OpenRTB 2.5 request
    const refererInfo: Record<string, any> = bidderRequest.refererInfo || {};
    const page = refererInfo.page || fpd.site.page || window.location.href;
    const ref = refererInfo.ref || fpd.site.ref || document.referrer;
    const domain = refererInfo.domain || fpd.site.domain || window.location.hostname;
    const ortbRegs = fpd.regs || {};
    const ortbSource = fpd.source || {};

    const ortbRequest: Record<string, any> = {
      id: bidderRequest.bidderRequestId || bidderRequest.auctionId,
      at: 1, // First price auction
      tmax: bidderRequest.timeout,
      cur: ['USD'],

      // Site object: preserve publisher/module ORTB2 data and use Prebid's
      // standard refererInfo for page/referrer information.
      site: {
        ...fpd.site,
        domain,
        page,
        ref,
        publisher: {
          ...fpd.site?.publisher,
          id: (validBidRequests[0]?.params as AdvergicBidParams | undefined)?.publisherId || fpd.site?.publisher?.id || ''
        },
        ext: {
          ...fpd.site?.ext,
          metadata: siteMetadata
        }
      },

      // Device object: preserve ORTB2 device fields while providing browser
      // information when it is available directly to the adapter.
      device: {
        ...deviceInfo,
        ...fpd.device
      },

      // User object with privacy compliance
      // Note: _advid cookie is sent automatically via HTTP Cookie header
      // when request goes to *.advergic.com (withCredentials: true)
      // Bidder server reads it from request headers, not from JavaScript
      user: {
        id: getUserId(),
        ...fpd.user
      },

      // Impressions
      imp: imps,

      // Source object: preserve Prebid ORTB2 source/tid/ext values.
      source: {
        ...ortbSource,
        fd: 1, // Upstream source in the supply chain
        ext: {
          ...ortbSource.ext,
          stype: 'prebid_unconfigured', // Prebid supply chain type
          bidder: BIDDER_CODE,
          prebid_version: '$prebid.version$'
        }
      },

      // Regulations (GDPR, CCPA, COPPA, GPP)
      regs: {
        ...ortbRegs,
        coppa: typeof ortbRegs.coppa === 'number'
          ? ortbRegs.coppa
          : (config.getConfig('coppa') === true ? 1 : 0),
        ext: {
          ...ortbRegs.ext
        }
      },

      // Extension object
      ext: {
        advergic: {
          adapter_version: ADAPTER_VERSION,
          integration_type: 'prebid'
        }
      }
    };

    // Add GDPR consent
    if (bidderRequest.gdprConsent) {
      ortbRequest.regs.ext.gdpr = bidderRequest.gdprConsent.gdprApplies ? 1 : 0;
      if (bidderRequest.gdprConsent.consentString) {
        ortbRequest.user.ext = ortbRequest.user.ext || {};
        ortbRequest.user.ext.consent = bidderRequest.gdprConsent.consentString;
      }
      if (bidderRequest.gdprConsent.addtlConsent) {
        ortbRequest.user.ext = ortbRequest.user.ext || {};
        ortbRequest.user.ext.ConsentedProvidersSettings = {
          consented_providers: bidderRequest.gdprConsent.addtlConsent
        };
      }
    }

    // Add US Privacy (CCPA) consent
    if (bidderRequest.uspConsent) {
      ortbRequest.regs.ext.us_privacy = bidderRequest.uspConsent;
    }

    // Add GPP consent
    if (bidderRequest.gppConsent) {
      ortbRequest.regs.ext.gpp = bidderRequest.gppConsent.gppString;
      ortbRequest.regs.ext.gpp_sid = bidderRequest.gppConsent.applicableSections;
    }

    // Add schain (Supply Chain Object)
    const schain = deepAccess(validBidRequests[0], 'schain');
    if (schain) {
      ortbRequest.source.ext.schain = schain;
    }

    // Add User IDs (eids)
    const eids = deepAccess(validBidRequests[0], 'userIdAsEids');
    if (eids && eids.length) {
      ortbRequest.user.ext = ortbRequest.user.ext || {};
      ortbRequest.user.ext.eids = eids;
    }

    return {
      method: 'POST',
      url: ENDPOINT_URL,
      data: ortbRequest,
      options: {
        contentType: 'application/json',
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
  interpretResponse: function(serverResponse, bidRequest) {
    const bidResponses: AdvergicBidResponse[] = [];

    if (!serverResponse || !serverResponse.body) {
      logWarn('Advergic: Empty server response');
      return bidResponses as any;
    }

    const response = serverResponse.body as AdvergicServerResponseBody;

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
          width: bid.w,
          height: bid.h,
          creativeId: bid.crid || bid.id,
          bidId: bid.id,           // Backend's BidID for win tracking
          campaignId: bid.cid,     // Campaign ID for analytics
          impId: bid.impid,        // Explicit impression ID
          dealId: bid.dealid || undefined,
          ttl: 300,
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
  getUserSyncs: function(syncOptions, serverResponses, gdprConsent, uspConsent, gppConsent) {
    const syncs: Array<{ type: 'iframe' | 'image'; url: string }> = [];

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

    const queryString = queryParams.length > 0 ? '&' + queryParams.join('&') : '';

    // Check if server returned user sync URLs
    if (serverResponses && serverResponses.length > 0) {
      serverResponses.forEach((response: any) => {
        if (response.body && response.body.ext && response.body.ext.sync) {
          const syncUrls = response.body.ext.sync;

          if (syncOptions.iframeEnabled && syncUrls.iframe && isArray(syncUrls.iframe)) {
            syncUrls.iframe.forEach((url: string) => {
              syncs.push({
                type: 'iframe',
                url: url + queryString
              });
            });
          }

          if (syncOptions.pixelEnabled && syncUrls.image && isArray(syncUrls.image)) {
            syncUrls.image.forEach((url: string) => {
              syncs.push({
                type: 'image',
                url: url + queryString
              });
            });
          }
        }
      });
    }

    // Fallback to default sync endpoint if no URLs in response
    // This triggers PBS cookie sync to establish _advid cookie
    if (syncs.length === 0) {
      if (syncOptions.iframeEnabled) {
        syncs.push({
          type: 'iframe',
          url: SYNC_URL + queryString + '&f=i'
        });
      } else if (syncOptions.pixelEnabled) {
        syncs.push({
          type: 'image',
          url: SYNC_URL + queryString + '&f=b'
        });
      }
    }

    return syncs;
  },

  /**
   * Handle win notification
   * @param bid The bid that won the auction
   */
  onBidWon: function(bid) {
    // Fire OpenRTB billing notification URL (burl). This is part of the
    // standard bid response and is intentionally not disabled by the optional
    // analytics tracking switch.
    if (bid.burl) {
      const burlWithMacros = replaceBidMacros(bid.burl, bid);
      triggerPixel(burlWithMacros);
    }

    if (isEventTrackingDisabled()) return;

    // Send win notification to Advergic for analytics
    const b = bid as any;
    const winData = {
      requestId: b.requestId,
      auctionId: b.auctionId,
      adId: b.adId,
      bidId: b.bidId,           // Backend's BidID for tracking
      impId: b.impId,           // Impression ID
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
      contentType: 'application/json',
      withCredentials: true
    });
  },

  /**
   * Handle timeout
   * @param timeoutData List of bids that timed out
   */
  onTimeout: function(timeoutData) {
    if (isEventTrackingDisabled() || !timeoutData || timeoutData.length === 0) return;

    const timeoutPayload = (timeoutData as any[]).map((bid: any) => ({
      bidId: bid.bidId,
      auctionId: bid.auctionId,
      adUnitCode: bid.adUnitCode,
      timeout: bid.timeout,
      params: bid.params
    }));

    ajax(TIMEOUT_URL, null, JSON.stringify(timeoutPayload), {
      method: 'POST',
      contentType: 'application/json',
      withCredentials: true
    });
  },

  /**
   * Handle bid error
   * @param params Error details
   * @param params.error The error that occurred
   * @param params.bidderRequest The request that caused the error
   */
  onBidderError: function({ error, bidderRequest } = {} as any) {
    logError('Advergic: Bidder error', error);

    if (isEventTrackingDisabled()) return;

    // Send error notification for monitoring
    const errorData = {
      error: (error as any)?.message || 'Unknown error',
      auctionId: bidderRequest?.auctionId,
      bidderRequestId: bidderRequest?.bidderRequestId,
      timestamp: Date.now()
    };

    ajax(ERROR_URL, null, JSON.stringify(errorData), {
      method: 'POST',
      contentType: 'application/json',
      withCredentials: true
    });
  }
};

registerBidder(spec);