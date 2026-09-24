/**
 * Prebid Adapter for Advergic
 * This adapter connects Prebid.js to the Advergic DSP server
 * Supports the Banner ad format only.
 *
 * @module advergicBidAdapter
 */

import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER } from '../src/mediaTypes.js';
import { ajax } from '../src/ajax.js';
import { deepAccess, isArray, logError, logWarn, isFn, getWinDimensions, generateUUID, triggerPixel } from '../src/utils.js';
import { config } from '../src/config.js';
import { getStorageManager } from '../src/storageManager.js';

const BIDDER_CODE = 'advergic';
const ENDPOINT_URL = 'https://pbs.avads.live/rtb/bid';
const WIN_URL = 'https://pbs.avads.live/rtb/win';
const LOSS_URL = 'https://pbs.avads.live/rtb/loss';
const TIMEOUT_URL = 'https://pbs.avads.live/rtb/timeout';
const ERROR_URL = 'https://pbs.avads.live/rtb/error';
const SYNC_URL = 'https://pbs.avads.live/id/setuid?bidder=advergic';
const ADAPTER_VERSION = '1.0.0';
const GVLID = undefined; // TODO: Register with IAB Global Vendor List
const storage = getStorageManager({ bidderCode: BIDDER_CODE });

/**
 * Helper function to extract site metadata for fraud prevention and targeting
 * @returns {Object} Site metadata object
 */
function getSiteMetadata() {
  const metadata = {
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
function getDeviceInfo() {
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
function getDeviceType() {
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
function getFirstPartyData(bidderRequest) {
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
 * win/loss/timeout/error analytics requests.
 * @returns {boolean} True when event tracking is disabled.
 */
function isEventTrackingDisabled() {
  return config.getConfig('advergic.disableEventTracking') === true;
}

export const spec = {
  code: BIDDER_CODE,
  gvlid: GVLID,
  supportedMediaTypes: [BANNER],

  /**
   * Determines whether or not the given bid request is valid
   * @param {BidRequest} bid The bid params to validate
   * @return {boolean} True if this is a valid bid, and false otherwise
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
   * @param {BidRequest[]} validBidRequests - an array of bids
   * @param {BidderRequest} bidderRequest - master bidRequest object
   * @return {ServerRequest|ServerRequest[]} Info describing the request to the server
   */
  buildRequests: function(validBidRequests, bidderRequest) {
    const siteMetadata = getSiteMetadata();
    const deviceInfo = getDeviceInfo();
    const fpd = getFirstPartyData(bidderRequest);

    // Build impression objects per OpenRTB 2.5 spec
    const imps = validBidRequests.map((bidRequest, index) => {
      const ortb2Imp = bidRequest.ortb2Imp || {};
      const imp = {
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
        const formats = (banner.sizes || bidRequest.sizes || []).map(size => ({
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
    const refererInfo = bidderRequest.refererInfo || {};
    const page = refererInfo.page || fpd.site.page || window.location.href;
    const ref = refererInfo.ref || fpd.site.ref || document.referrer;
    const domain = refererInfo.domain || fpd.site.domain || window.location.hostname;
    const ortbRegs = fpd.regs || {};
    const ortbSource = fpd.source || {};

    const ortbRequest = {
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
          id: validBidRequests[0]?.params?.publisherId || fpd.site?.publisher?.id || ''
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
    };
  },

  /**
   * Unpack the response from the server into a list of bids
   * @param {ServerResponse} serverResponse A successful response from the server
   * @param {BidRequest} bidRequest The corresponding bid request
   * @return {Bid[]} An array of bids which were nested inside the server
   */
  interpretResponse: function(serverResponse, bidRequest) {
    const bidResponses = [];

    if (!serverResponse || !serverResponse.body) {
      logWarn('Advergic: Empty server response');
      return bidResponses;
    }

    const response = serverResponse.body;

    // Handle OpenRTB 2.5 response format
    if (!response.seatbid || !isArray(response.seatbid)) {
      logWarn('Advergic: Invalid response format - missing seatbid');
      return bidResponses;
    }

    response.seatbid.forEach(seatbid => {
      if (!seatbid.bid || !isArray(seatbid.bid)) {
        return;
      }

      seatbid.bid.forEach(bid => {
        // Validate required fields
        if (!bid.impid || !bid.price || bid.price <= 0) {
          logWarn('Advergic: Invalid bid object', bid);
          return;
        }

        const bidResponse = {
          requestId: bid.impid,
          cpm: bid.price,
          currency: response.cur || 'USD',
          width: bid.w,
          height: bid.h,
          creativeId: bid.crid || bid.id,
          bidId: bid.id,           // Backend's BidID for win/loss tracking
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

    return bidResponses;
  },

  /**
   * Register User Sync Pixels
   * @param {SyncOptions} syncOptions Configuration object
   * @param {ServerResponse[]} serverResponses List of server's responses
   * @param {Object} gdprConsent GDPR consent object
   * @param {string} uspConsent US Privacy consent string
   * @param {Object} gppConsent GPP consent object
   * @return {UserSync[]} The user syncs which should be dropped
   */
  getUserSyncs: function(syncOptions, serverResponses, gdprConsent, uspConsent, gppConsent) {
    const syncs = [];

    // Build query parameters for consent
    const queryParams = [];

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
      serverResponses.forEach(response => {
        if (response.body && response.body.ext && response.body.ext.sync) {
          const syncUrls = response.body.ext.sync;

          if (syncOptions.iframeEnabled && syncUrls.iframe && isArray(syncUrls.iframe)) {
            syncUrls.iframe.forEach(url => {
              syncs.push({
                type: 'iframe',
                url: url + queryString
              });
            });
          }

          if (syncOptions.pixelEnabled && syncUrls.image && isArray(syncUrls.image)) {
            syncUrls.image.forEach(url => {
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
   * @param {Bid} bid The bid that won the auction
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
    const winData = {
      requestId: bid.requestId,
      auctionId: bid.auctionId,
      adId: bid.adId,
      bidId: bid.bidId,           // Backend's BidID for tracking
      impId: bid.impId,           // Impression ID
      campaignId: bid.campaignId, // Campaign ID
      cpm: bid.cpm,
      currency: bid.currency,
      creativeId: bid.creativeId,
      adUnitCode: bid.adUnitCode,
      mediaType: bid.mediaType,
      size: `${bid.width}x${bid.height}`,
      timeToRespond: bid.timeToRespond,
      timestamp: Date.now()
    };

    ajax(WIN_URL, null, JSON.stringify(winData), {
      method: 'POST',
      contentType: 'application/json',
      withCredentials: true
    });
  },

  /**
   * Handle bid loss notification
   * @param {Bid} bid The bid that lost the auction
   */
  onBidLost: function(bid) {
    if (isEventTrackingDisabled()) return;

    // Send loss notification to Advergic for analytics
    const lossData = {
      requestId: bid.requestId,
      auctionId: bid.auctionId,
      adId: bid.adId,
      bidId: bid.bidId,           // Backend's BidID for tracking
      impId: bid.impId,           // Impression ID
      campaignId: bid.campaignId, // Campaign ID
      cpm: bid.cpm,
      currency: bid.currency,
      creativeId: bid.creativeId,
      adUnitCode: bid.adUnitCode,
      mediaType: bid.mediaType,
      size: `${bid.width}x${bid.height}`,
      timeToRespond: bid.timeToRespond,
      timestamp: Date.now()
    };

    ajax(LOSS_URL, null, JSON.stringify(lossData), {
      method: 'POST',
      contentType: 'application/json',
      withCredentials: true
    });
  },

  /**
   * Handle timeout
   * @param {BidRequest[]} timeoutData List of bids that timed out
   */
  onTimeout: function(timeoutData) {
    if (isEventTrackingDisabled() || !timeoutData || timeoutData.length === 0) return;

    const timeoutPayload = timeoutData.map(bid => ({
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
   * @param {Object} error The error that occurred
   * @param {BidderRequest} bidderRequest The request that caused the error
   */
  onBidderError: function({ error, bidderRequest } = {}) {
    logError('Advergic: Bidder error', error);

    if (isEventTrackingDisabled()) return;

    // Send error notification for monitoring
    const errorData = {
      error: error?.message || 'Unknown error',
      auctionId: bidderRequest?.auctionId,
      bidderRequestId: bidderRequest?.bidderRequestId,
      timestamp: Date.now()
    };

    ajax(ERROR_URL, null, JSON.stringify(errorData), {
      method: 'POST',
      contentType: 'application/json',
      withCredentials: true
    });
  },

  /**
   * Handle set targeting
   * Called when targeting data is set
   * @param {Bid} bid The bid that is setting targeting
   */
  onSetTargeting: function(bid) {
    // Optional: Track when targeting is set for analytics
    logWarn('Advergic: Setting targeting for bid', bid.adId);
  }
};

/**
 * Get or generate user ID for tracking.
 * @returns {string} User ID
 */
function getUserId() {
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
function replaceBidMacros(url, bid) {
  return url
    .replace(/\${AUCTION_PRICE}/g, bid.cpm)
    .replace(/\${AUCTION_CURRENCY}/g, bid.currency || 'USD')
    .replace(/\${AUCTION_ID}/g, bid.auctionId)
    .replace(/\${AUCTION_BID_ID}/g, bid.requestId)
    .replace(/\${AUCTION_IMP_ID}/g, bid.adId)
    .replace(/\${AUCTION_AD_ID}/g, bid.creativeId);
}

registerBidder(spec);
