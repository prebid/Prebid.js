import { type BidderSpec, registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER } from '../src/mediaTypes.js';
import { deepAccess, deepSetValue, generateUUID, logInfo, logError } from '../src/utils.js';
import { getDNT } from '../libraries/dnt/index.js';
import { ajax } from '../src/ajax.js';

/**
 * Mile Bid Adapter
 *
 * This adapter handles:
 * 1. User syncs by sending requests to the prebid server cookie sync endpoint
 * 2. Bid requests by parsing necessary parameters from the prebid auction
 */

const BIDDER_CODE = 'mile';

const MILE_BIDDER_HOST = 'https://pbs.atmtd.com';
const ENDPOINT_URL = `${MILE_BIDDER_HOST}/mile/v1/request`;
const USER_SYNC_ENDPOINT = `https://scripts.atmtd.com/user-sync/load-cookie.html`;

const MILE_ANALYTICS_ENDPOINT = `https://e01.atmtd.com/bidanalytics-event/json`;

type MileBidParams = {
  placementId: string;
  siteId: string;
  publisherId: string;
};

declare module '../src/adUnits' {
  interface BidderParams {
    [BIDDER_CODE]: MileBidParams;
  }
}

export let siteIdTracker : string | undefined;
export let publisherIdTracker : string | undefined;

export function getLowestFloorPrice(bid) {
  let floorPrice: number;

  if (typeof bid.getFloor === 'function') {
    let sizes = []
    // Get floor prices for each banner size in the bid request
    if (deepAccess(bid, 'mediaTypes.banner.sizes')) {
      sizes = deepAccess(bid, 'mediaTypes.banner.sizes')
    } else if (bid.sizes) {
      sizes = bid.sizes
    }

    sizes.forEach((size: string | number[]) => {
      const [w, h] = typeof size === 'string' ? size.split('x') : size as number[];
      const floor = bid.getFloor({ currency: 'USD', mediaType: '*', size: [Number(w), Number(h)] });
      if (floor && floor.floor) {
        if (floorPrice === undefined) {
          floorPrice = floor.floor;
        } else {
          floorPrice = Math.min(floorPrice, floor.floor);
        }
      }
    });
  } else {
    floorPrice = 0
  }

  return floorPrice
}

export const spec: BidderSpec<typeof BIDDER_CODE> = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER],
  isBidRequestValid: function (bid) {
    const params = bid.params;

    if (!params?.placementId) {
      logError(`${BIDDER_CODE}: Missing required param: placementId`);
      return false;
    }

    if (!params?.siteId) {
      logError(`${BIDDER_CODE}: Missing required param: siteId`);
      return false;
    }

    if (!params?.publisherId) {
      logError(`${BIDDER_CODE}: Missing required param: publisherId`);
      return false;
    }

    if (siteIdTracker === undefined) {
      siteIdTracker = params.siteId;
    } else if (siteIdTracker !== params.siteId) {
      logError(`${BIDDER_CODE}: Site ID mismatch: ${siteIdTracker} !== ${params.siteId}`);
      return false;
    }

    if (publisherIdTracker === undefined) {
      publisherIdTracker = params.publisherId;
    } else if (publisherIdTracker !== params.publisherId) {
      logError(`${BIDDER_CODE}: Publisher ID mismatch: ${publisherIdTracker} !== ${params.publisherId}`);
      return false;
    }

    return true;
  },

  /**
   * Make a server request from the list of BidRequests.
   * Builds an OpenRTB 2.5 compliant bid request.
   *
   * @param validBidRequests - An array of valid bids
   * @param bidderRequest - The master bidder request object
   * @returns ServerRequest info describing the request to the server
   */
  buildRequests: function (validBidRequests, bidderRequest) {
    logInfo(`${BIDDER_CODE}: Building batched request for ${validBidRequests.length} bids`);

    // Build imp[] array - one impression object per bid request
    const imps = validBidRequests.map((bid) => {
      const sizes = deepAccess(bid, 'mediaTypes.banner.sizes') || [];
      const floorPrice = getLowestFloorPrice(bid);

      const imp: any = {
        id: bid.bidId,
        tagid: bid.params.placementId,
        secure: 1,
        banner: {
          format: sizes.map((size: number[]) => ({
            w: size[0],
            h: size[1],
          }))
        },
        ext: {
          adUnitCode: bid.adUnitCode,
          placementId: bid.params.placementId,
          gpid: deepAccess(bid, 'ortb2Imp.ext.gpid') || deepAccess(bid, 'ortb2Imp.ext.data.pbadslot'),
        },
      };

      // Add bidfloor if available
      if (floorPrice > 0) {
        imp.bidfloor = floorPrice;
        imp.bidfloorcur = 'USD';
      }

      return imp;
    });

    // Build the OpenRTB 2.5 BidRequest object
    const openRtbRequest: any = {
      id: bidderRequest.bidderRequestId || generateUUID(),
      imp: imps,
      tmax: bidderRequest.timeout,
      cur: ['USD'],
      site: {
        id: siteIdTracker,
        page: deepAccess(bidderRequest, 'refererInfo.page') || '',
        domain: deepAccess(bidderRequest, 'refererInfo.domain') || '',
        ref: deepAccess(bidderRequest, 'refererInfo.ref') || '',
        publisher: {
          id: publisherIdTracker,
        },
      },
      user: {},
      // Device object
      device: {
        ua: navigator.userAgent,
        language: navigator.language?.split('-')[0] || 'en',
        dnt: getDNT() ? 1 : 0,
        w: window.screen?.width,
        h: window.screen?.height,
      },

      // Source object with supply chain
      source: {
        tid: deepAccess(bidderRequest, 'ortb2.source.tid')
      },
    };

    // Add schain if available
    const schain = deepAccess(validBidRequests, '0.ortb2.source.ext.schain');
    if (schain) {
      deepSetValue(openRtbRequest, 'source.ext.schain', schain);
    }

    // User object
    const eids = deepAccess(validBidRequests, '0.userIdAsEids');
    if (eids && eids.length) {
      deepSetValue(openRtbRequest, 'user.ext.eids', eids);
    }

    // Regs object for privacy/consent
    const regs: any = { ext: {} };

    // GDPR
    if (bidderRequest.gdprConsent) {
      regs.ext.gdpr = bidderRequest.gdprConsent.gdprApplies ? 1 : 0;
      deepSetValue(openRtbRequest, 'user.ext.consent', bidderRequest.gdprConsent.consentString || '');
    }

    // US Privacy (CCPA)
    if (bidderRequest.uspConsent) {
      regs.ext.us_privacy = bidderRequest.uspConsent;
    }

    // GPP
    if (bidderRequest.gppConsent) {
      regs.gpp = bidderRequest.gppConsent.gppString || '';
      regs.gpp_sid = bidderRequest.gppConsent.applicableSections || [];
    }

    if (Object.keys(regs.ext).length > 0 || regs.gpp) {
      openRtbRequest.regs = regs;
    }

    // Merge any first-party data from ortb2
    if (bidderRequest.ortb2) {
      if (bidderRequest.ortb2.site) {
        openRtbRequest.site = { ...openRtbRequest.site, ...bidderRequest.ortb2.site };
        // Preserve publisher ID
        openRtbRequest.site.publisher = { id: publisherIdTracker, ...bidderRequest.ortb2.site.publisher };
      }
      if (bidderRequest.ortb2.user) {
        openRtbRequest.user = { ...openRtbRequest.user, ...bidderRequest.ortb2.user };
      }
      if (bidderRequest.ortb2.device) {
        openRtbRequest.device = { ...openRtbRequest.device, ...bidderRequest.ortb2.device };
      }
    }

    // Add prebid adapter version info
    deepSetValue(openRtbRequest, 'ext.prebid.channel', {
      name: 'pbjs',
      version: '$prebid.version$',
    });

    return {
      method: 'POST',
      url: ENDPOINT_URL,
      data: openRtbRequest
    };
  },

  /**
   * Unpack the OpenRTB 2.5 response from the server into a list of bids.
   *
   * @param serverResponse - A successful response from the server.
   * @param request - The request that was sent to the server.
   * @returns An array of bids which were nested inside the server.
   */
  interpretResponse: function (serverResponse, request) {
    const bidResponses: any[] = [];

    if (!serverResponse?.body) {
      logInfo(`${BIDDER_CODE}: Empty server response`);
      return bidResponses;
    }

    const response = serverResponse.body;
    const currency = response.cur || 'USD';

    // OpenRTB 2.5 response format: seatbid[] contains bid[]
    const seatbids = response.bids || [];

    seatbids.forEach((bid: any) => {
      if (!bid || !bid.cpm) {
        return;
      }

      const bidResponse = {
        requestId: bid.requestId,
        cpm: parseFloat(bid.cpm),
        width: parseInt(bid.width || bid.w, 10),
        height: parseInt(bid.height || bid.h, 10),
        creativeId: bid.creativeId || bid.crid || bid.id,
        currency: currency,
        netRevenue: true,
        bidder: BIDDER_CODE,
        ttl: bid.ttl || 300,
        ad: bid.ad,
        mediaType: BANNER,
        upstreamBidder: bid.upstreamBidder || '',
        meta: {
          advertiserDomains: bid.adomain || [],
        }
      };

      // Handle nurl (win notice URL) if present
      if (bid.nurl) {
        (bidResponse as any).nurl = bid.nurl;
      }

      // Handle burl (billing URL) if present
      if (bid.burl) {
        (bidResponse as any).burl = bid.burl;
      }

      bidResponses.push(bidResponse);
    });

    return bidResponses;
  },

  /**
   * Register user sync pixels or iframes to be dropped after the auction.
   *
   * @param syncOptions - Which sync types are allowed (iframe, image/pixel)
   * @param serverResponses - Array of server responses from the auction
   * @param gdprConsent - GDPR consent data
   * @param uspConsent - US Privacy consent string
   * @param gppConsent - GPP consent data
   * @returns Array of user sync objects to be executed
   */
  getUserSyncs: function (
    syncOptions,
    serverResponses,
    gdprConsent,
    uspConsent,
    gppConsent
  ) {
    logInfo(`${BIDDER_CODE}: getUserSyncs called`, {
      iframeEnabled: syncOptions.iframeEnabled
    });

    const syncs = [];

    // Build query parameters for consent
    const queryParams: string[] = [];

    // GDPR consent
    if (gdprConsent) {
      queryParams.push(`gdpr=${gdprConsent.gdprApplies ? 1 : 0}`);
      queryParams.push(`gdpr_consent=${encodeURIComponent(gdprConsent.consentString || '')}`);
    }

    // US Privacy / CCPA
    if (uspConsent) {
      queryParams.push(`us_privacy=${encodeURIComponent(uspConsent)}`);
    }

    // GPP consent
    if (gppConsent?.gppString) {
      queryParams.push(`gpp=${encodeURIComponent(gppConsent.gppString)}`);
      if (gppConsent.applicableSections?.length) {
        queryParams.push(`gpp_sid=${encodeURIComponent(gppConsent.applicableSections.join(','))}`);
      }
    }

    const queryString = queryParams.length > 0 ? `?${queryParams.join('&')}` : '';

    if (syncOptions.iframeEnabled) {
      syncs.push({
        type: 'iframe' as const,
        url: `${USER_SYNC_ENDPOINT}${queryString}`,
      });
    }

    return syncs;
  },

  /**
   * Called when a bid from this adapter wins the auction.
   * Sends an XHR POST request to the bid's nurl (win notification URL).
   *
   * @param bid - The winning bid object
   */
  onBidWon: function (bid) {
    logInfo(`${BIDDER_CODE}: Bid won`, bid);

    const winNotificationData = {
      adUnitCode: bid.adUnitCode,
      metaData: {
        impressionID: [bid.requestId],
        // @ts-expect-error - bid.upstreamBidder is not defined
        upstreamBidder: [bid.upstreamBidder || ''],
      },
      ua: navigator.userAgent,
      timestamp: Date.now(),
      winningSize: `${bid.width}x${bid.height}`,
      cpm: bid.cpm,
      eventType: 'mile-bidder-win-notify'
    }

    ajax(MILE_ANALYTICS_ENDPOINT, null, JSON.stringify([winNotificationData]), { method: 'POST'});

    // @ts-expect-error - bid.nurl is not defined
    if (bid.nurl) ajax(bid.nurl, null, null, { method: 'GET' });
  },

  /**
   * Called when bid requests timeout.
   * Sends analytics notification for timed out bids.
   *
   * @param timeoutData - Array of bid requests that timed out
   */
  onTimeout: function (timeoutData) {
    logInfo(`${BIDDER_CODE}: Timeout for ${timeoutData.length} bid(s)`, timeoutData);

    if (timeoutData.length === 0) return;

    const timedOutBids = [];

    timeoutData.forEach((bid) => {
      const timeoutNotificationData = {
        adUnitCode: bid.adUnitCode,
        metaData: {
          impressionID: [bid.bidId],
          configuredTimeout: [bid.timeout.toString()],
        },
        ua: navigator.userAgent,
        timestamp: Date.now(),
        eventType: 'mile-bidder-timeout'
      };

      timedOutBids.push(timeoutNotificationData);
    });

    ajax(MILE_ANALYTICS_ENDPOINT, null, JSON.stringify(timedOutBids), { method: 'POST'});
  },
};

registerBidder(spec);
