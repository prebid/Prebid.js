/**
 * Pragma Adx — Prebid.js Bid Adapter (video + banner)
 *
 * Bidder code : pragmaadx
 * Endpoint    : POST https://apps.pragma-crm.com/api/adx/prebid
 * Maintainer  : mike@pragma-crm.com
 *
 * Pragma Adx responds with a bid only when a real external DSP has
 * cleared a genuine market price through Pragma's own auction pipeline.
 * House fills and self-serve campaigns deliberately return no bid
 * ({bids:[]}) because neither carries a real market price to enter into
 * a publisher's header auction against honestly-priced demand.
 *
 * GDPR / USP / GPP consent strings are forwarded verbatim from Prebid
 * and never invented client-side. Supply-chain (schain) is forwarded so
 * Pragma can append its own seller node before the upstream DSP call.
 *
 * win/impression accounting is handled server-side via VAST tracking
 * beacons in the returned creative, so onBidWon is intentionally omitted
 * to avoid double-counting renders that never reached playback.
 */

import { type BidderSpec, type ServerResponse, registerBidder } from '../src/adapters/bidderFactory.js';
import { type UserSync } from '../src/userSync.js';
import { BANNER, VIDEO } from '../src/mediaTypes.js';

const BIDDER_CODE = 'pragmaadx' as const;
const ENDPOINT_URL = 'https://apps.pragma-crm.com/api/adx/prebid';
const SYNC_URL = 'https://apps.pragma-crm.com/api/adx/sync';
const DEFAULT_PLAYER_SIZE: [number, number] = [640, 360];
const DEFAULT_BANNER_SIZE: [number, number] = [300, 250];
const SUPPORTED_MEDIA_TYPES = [VIDEO, BANNER] as const;

/** Bid params as configured by the publisher on each ad unit. */
interface PragmaAdxParams {
  apiKey: string;
  adUnitId: number;
  placement?: string;
  userId?: string;
  ifa?: string;
}

/** Request body sent to POST /api/adx/prebid. */
interface PragmaAdxPayload {
  api_key: string;
  ad_unit_id: number;
  bid_id: string;
  w: number;
  h: number;
  placement?: string;
  user_id?: string;
  ifa?: string;
  page_url?: string;
  gdpr_consent?: string;
  us_privacy?: string;
  gpp?: string;
  gpp_sid?: number[];
  schain?: object;
}

/** Shape of one bid inside the server's response body. */
interface PragmaAdxServerBid {
  requestId: string;
  cpm: number | string;
  currency?: string;
  width?: number;
  height?: number;
  creativeId?: string;
  netRevenue?: boolean;
  ttl?: number;
  mediaType?: string;
  ad?: string;
  vastXml?: string;
  vastUrl?: string;
  meta?: { advertiserDomains?: string[] };
}

/**
 * Prebid allows playerSize as either [w, h] or [[w, h], ...].
 * Returns [width, height], falling back to our documented server default.
 */
function resolvePlayerSize(bidRequest: any): [number, number] {
  const video = (bidRequest.mediaTypes && bidRequest.mediaTypes.video) || {};
  let size = video.playerSize;
  if (Array.isArray(size) && Array.isArray(size[0])) {
    size = size[0];
  }
  if (Array.isArray(size) && size.length === 2) {
    const width = parseInt(size[0], 10);
    const height = parseInt(size[1], 10);
    if (width > 0 && height > 0) {
      return [width, height];
    }
  }
  return DEFAULT_PLAYER_SIZE;
}

function resolveBannerSize(bidRequest: any): [number, number] {
  const banner = (bidRequest.mediaTypes && bidRequest.mediaTypes.banner) || {};
  let size = banner.sizes;
  if (Array.isArray(size) && Array.isArray(size[0])) {
    size = size[0];
  }
  if (Array.isArray(size) && size.length === 2) {
    const width = parseInt(size[0], 10);
    const height = parseInt(size[1], 10);
    if (width > 0 && height > 0) {
      return [width, height];
    }
  }
  return DEFAULT_BANNER_SIZE;
}

export const spec: BidderSpec<typeof BIDDER_CODE> = {
  code: BIDDER_CODE,
  supportedMediaTypes: SUPPORTED_MEDIA_TYPES,

  isBidRequestValid(bid: any): boolean {
    if (!bid) {
      return false;
    }
    const params: Partial<PragmaAdxParams> = bid.params || {};
    const hasVideo = !!(bid.mediaTypes && bid.mediaTypes.video);
    const hasBanner = !!(bid.mediaTypes && bid.mediaTypes.banner);
    return (hasVideo || hasBanner) && !!params.apiKey && !!params.adUnitId;
  },

  buildRequests(validBidRequests: any[], bidderRequest: any): any[] {
    return (validBidRequests || []).map((bid: any) => {
      const params: PragmaAdxParams = bid.params || {};
      const hasBanner = !!(bid.mediaTypes && bid.mediaTypes.banner);
      const size = hasBanner ? resolveBannerSize(bid) : resolvePlayerSize(bid);
      const payload: PragmaAdxPayload = {
        api_key: params.apiKey,
        ad_unit_id: params.adUnitId,
        bid_id: bid.bidId,
        w: size[0],
        h: size[1]
      };

      if (params.placement) {
        payload.placement = String(params.placement);
      }
      if (params.userId) {
        payload.user_id = String(params.userId);
      }
      if (params.ifa) {
        payload.ifa = String(params.ifa);
      }

      if (bidderRequest) {
        if (bidderRequest.refererInfo && bidderRequest.refererInfo.page) {
          payload.page_url = bidderRequest.refererInfo.page;
        }

        const gdpr = bidderRequest.gdprConsent;
        if (gdpr && gdpr.gdprApplies !== false && gdpr.consentString) {
          payload.gdpr_consent = gdpr.consentString;
        }

        if (bidderRequest.uspConsent) {
          payload.us_privacy = bidderRequest.uspConsent;
        }

        const gpp = bidderRequest.gppConsent;
        if (gpp && gpp.gppString) {
          payload.gpp = gpp.gppString;
          if (Array.isArray(gpp.applicableSections)) {
            payload.gpp_sid = gpp.applicableSections;
          }
        }

        const schain = bidderRequest.schain;
        if (schain && typeof schain === 'object') {
          payload.schain = schain;
        }
      }

      return {
        method: 'POST',
        url: ENDPOINT_URL,
        data: payload,
        options: {
          contentType: 'text/plain',
          withCredentials: false
        }
      };
    });
  },

  interpretResponse(serverResponse: any): any[] {
    const body = (serverResponse && serverResponse.body) || {};
    const bids: PragmaAdxServerBid[] = Array.isArray(body.bids) ? body.bids : [];
    return bids
      .filter((bid: PragmaAdxServerBid) => {
        // A bid without a real positive price is not a bid; the creative
        // itself (VAST document for video, markup for banner) must also
        // actually be present.
        if (!bid || parseFloat(String(bid.cpm)) <= 0) {
          return false;
        }
        if (bid.mediaType === 'banner') {
          return !!(bid.ad && String(bid.ad).trim());
        }
        return !!(
          (bid.vastUrl && String(bid.vastUrl).trim()) ||
          (bid.vastXml && String(bid.vastXml).trim())
        );
      })
      .map((bid: PragmaAdxServerBid) => {
        const isBanner = bid.mediaType === 'banner';
        const out: Record<string, any> = {
          requestId: bid.requestId,
          cpm: parseFloat(String(bid.cpm)),
          currency: bid.currency || 'USD',
          width: bid.width,
          height: bid.height,
          creativeId: bid.creativeId,
          netRevenue: bid.netRevenue === true,
          ttl: bid.ttl,
          mediaType: isBanner ? BANNER : VIDEO,
          meta: {
            advertiserDomains:
              (bid.meta && bid.meta.advertiserDomains) || []
          }
        };
        if (isBanner) {
          out.ad = bid.ad;
        } else if (bid.vastUrl) {
          out.vastUrl = bid.vastUrl;
        } else {
          out.vastXml = bid.vastXml;
        }
        return out;
      });
  },

  getUserSyncs(
    syncOptions: { iframeEnabled: boolean; pixelEnabled: boolean },
    _serverResponses: ServerResponse[],
    gdprConsent: any,
    uspConsent: any,
    gppConsent: any,
    _coppa: boolean
  ): UserSync[] {
    if (!syncOptions.pixelEnabled) {
      return [];
    }
    const params = new URLSearchParams();
    if (gdprConsent?.gdprApplies !== false && gdprConsent?.consentString) {
      params.set('gdpr', '1');
      params.set('gdpr_consent', gdprConsent.consentString);
    }
    if (uspConsent) {
      params.set('us_privacy', String(uspConsent));
    }
    if (gppConsent?.gppString) {
      params.set('gpp', gppConsent.gppString);
    }
    const qs = params.toString();
    return [{ type: 'image', url: SYNC_URL + (qs ? '?' + qs : '') }];
  },

  onTimeout(timeoutData: any[]): void {
    // Forward timeout events to the Pragma endpoint for diagnostics;
    // these are fire-and-forget and never affect the auction outcome.
    if (!Array.isArray(timeoutData) || !timeoutData.length) {
      return;
    }
    navigator.sendBeacon(
      ENDPOINT_URL + '/timeout',
      JSON.stringify(timeoutData.map((t: any) => ({
        bid_id: t.bidId,
        ad_unit_id: t.params && t.params.adUnitId,
        timeout: t.timeout
      })))
    );
  }

  // onBidWon is intentionally omitted: win/impression accounting is
  // handled server-side via VAST tracking beacons in the returned
  // creative, which fire from the actual player on actual playback.
  // A client-side ping here would double-count impressions.
};

registerBidder(spec);
