/**
 * Pragma Adx — Prebid.js Bid Adapter (video + banner)
 *
 * Bidder code: pragmaadx (all-lowercase, per Prebid naming convention)
 *
 * 2026-09-20, "kannst du in earn noch prebid integrieren?" — scoped to
 * "Earn als Prebid-Bidder für fremde Publisher": this file lets a
 * THIRD-PARTY publisher who already runs Prebid.js add Pragma Adx as one
 * more configured bidder, competing client-side against their existing
 * demand. It changes nothing about Pragma's own auction or Earn's
 * rewarded-video tab.
 *
 * 2026-09-26 — Display/Banner: supportedMediaTypes now includes BANNER;
 * POST /api/adx/prebid returns bid.ad (markup) for banner ad units, same
 * DSP-only price discipline as video (see the server-side handler).
 *
 * 2026-10-15 — Renamed pragmaAdx → pragmaadx (Prebid naming convention:
 * bidder codes must be all-lowercase alphanumeric). Converted to TypeScript.
 *
 * Interface verified 2026-09-20 against the real Prebid.js Bid Adapter
 * development guide (https://docs.prebid.org/dev-docs/bidder-adaptor.html)
 * — the `spec` object's required members (code, supportedMediaTypes,
 * isBidRequestValid, buildRequests, interpretResponse), the ServerRequest
 * shape {method, url, data, options}, the bid response fields
 * (requestId, cpm, currency, width, height, creativeId, netRevenue, ttl,
 * mediaType, meta.advertiserDomains) and the video-specific `vastXml`.
 * Not written from memory.
 *
 * ── How to actually use this file ──────────────────────────────────────
 * Two honest, different things:
 *
 * 1. WHAT WORKS TODAY — a custom Prebid.js build. Prebid.js is compiled;
 *    a publisher (or we, on their behalf) drops this file into the
 *    Prebid.js source tree as `modules/pragmaadxBidAdapter.ts`, then
 *    builds with it included:
 *
 *        git clone https://github.com/prebid/Prebid.js && cd Prebid.js
 *        npm ci
 *        cp pragmaadxBidAdapter.ts modules/
 *        gulp build --modules=pragmaadxBidAdapter,<their other modules>
 *
 *    This is a standard, fully supported Prebid workflow — most
 *    publishers already run a custom build, because Prebid.js only ever
 *    ships the modules you select. The file is downloadable from
 *    https://apps.pragma-crm.com/static/prebid/pragmaadxBidAdapter.js
 *
 * 2. WHAT IS *NOT* TRUE YET — Pragma is **not** a bidder listed in the
 *    official Prebid.js repository. Two real pull requests were opened
 *    2026-09-21 (prebid/Prebid.js#15639, prebid/prebid.github.io#6751)
 *    but neither is merged — that review is a real external process
 *    outside this codebase's control, with no guaranteed timeline. Until
 *    a Prebid maintainer actually merges both, `pragmaadx` will NOT
 *    appear in Prebid's hosted "download" builder or bidder list —
 *    option 1 is the real integration path. Don't let anyone read this
 *    file, or the mere existence of those PRs, as a claim of official
 *    Prebid listing.
 *
 * ── Consent ────────────────────────────────────────────────────────────
 * GDPR/US-Privacy/GPP strings are forwarded exactly as Prebid hands them
 * to us and never invented. Pragma has no consent pipeline of its own for
 * a third-party publisher's end users; server-side these land in the
 * outbound OpenRTB request's regs.us_privacy / regs.gdpr +
 * user.ext.consent / regs.gpp (see app/adx/bidding.py).
 *
 * ── No bid when there is no real price ─────────────────────────────────
 * The Pragma endpoint answers with a bid ONLY when a real external DSP
 * actually cleared a price. Pragma house creatives and self-serve
 * customer campaigns — which do serve on Pragma's other integration
 * paths — deliberately return no bid here, because neither has a genuine
 * market price, and entering a nominal internal number into a real header
 * auction could take an impression away from a bidder who truly paid
 * more. See POST /api/adx/prebid in app/main.py for the full reasoning.
 */

import { type BidderSpec, registerBidder } from '../src/adapters/bidderFactory.js';
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

  /**
   * Pragma needs an api_key + ad_unit_id (both issued when a publisher
   * registers — see https://apps.pragma-crm.com/adx/quickstart) and
   * serves video or banner depending on the ad unit's own format, so a
   * request with neither mediaType is rejected here rather than wasting
   * a network call on a guaranteed no-bid.
   */
  isBidRequestValid(bid: any): boolean {
    if (!bid) {
      return false;
    }
    const params: Partial<PragmaAdxParams> = bid.params || {};
    const hasVideo = !!(bid.mediaTypes && bid.mediaTypes.video);
    const hasBanner = !!(bid.mediaTypes && bid.mediaTypes.banner);
    return (hasVideo || hasBanner) && !!params.apiKey && !!params.adUnitId;
  },

  /**
   * One ServerRequest per bid: the Pragma endpoint decides a single
   * impression per call (it maps onto one OpenRTB imp), so there is
   * nothing honest to gain from batching them into one request.
   */
  buildRequests(validBidRequests: any[], bidderRequest: any): any[] {
    return (validBidRequests || []).map((bid: any) => {
      const params: PragmaAdxParams = bid.params || {};
      const hasBanner = !!(bid.mediaTypes && bid.mediaTypes.banner);
      const size = hasBanner ? resolveBannerSize(bid) : resolvePlayerSize(bid);
      const payload: PragmaAdxPayload = {
        api_key: params.apiKey,
        ad_unit_id: params.adUnitId,
        // Prebid ties a response back to its request by this exact value.
        bid_id: bid.bidId,
        w: size[0],
        h: size[1]
      };

      // Optional, purely reporting-side — forwarded only if the publisher
      // configured them on the ad unit's bidder params.
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

        // GDPR: Prebid gives {consentString, gdprApplies}. We send the
        // consent string only when GDPR actually applies — the Pragma
        // backend treats a supplied string as "regs.gdpr = 1", so sending
        // one when gdprApplies is false would misstate the regime.
        const gdpr = bidderRequest.gdprConsent;
        if (gdpr && gdpr.gdprApplies !== false && gdpr.consentString) {
          payload.gdpr_consent = gdpr.consentString;
        }

        // CCPA / US Privacy string, passed through verbatim.
        if (bidderRequest.uspConsent) {
          payload.us_privacy = bidderRequest.uspConsent;
        }

        // Global Privacy Platform string + applicable section IDs.
        const gpp = bidderRequest.gppConsent;
        if (gpp && gpp.gppString) {
          payload.gpp = gpp.gppString;
          if (Array.isArray(gpp.applicableSections)) {
            payload.gpp_sid = gpp.applicableSections;
          }
        }

        // Supply Chain: forward the publisher's upstream schain so Pragma
        // can append its own seller node before the outbound DSP call.
        // Prebid exposes it on bidderRequest; we prefer that over bid-level.
        const schain = bidderRequest.schain;
        if (schain && typeof schain === 'object') {
          payload.schain = schain;
        }
      }

      return {
        method: 'POST',
        url: ENDPOINT_URL,
        data: payload,
        // 'text/plain' keeps this a CORS-simple request (no OPTIONS
        // preflight) -- the server parses the body as JSON regardless of
        // Content-Type, so nothing on the wire actually changes.
        options: {
          contentType: 'text/plain',
          withCredentials: false
        }
      };
    });
  },

  /**
   * Maps Pragma's JSON answer onto Prebid bid objects. The server already
   * answers in Prebid's own field names, so this stays a thin, explicit
   * mapping rather than a passthrough — an unexpected/extra server field
   * must never silently become part of a Prebid bid.
   */
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
        return !!(bid.vastXml && String(bid.vastXml).trim());
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
          // Gross price: Pragma's revenue share is settled per partner
          // agreement after the fact, not deducted at bid time. Prebid's
          // own rule is that gross-price bids set this to false.
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
        } else {
          out.vastXml = bid.vastXml;
        }
        return out;
      });
  }

  /**
   * Cookie-sync pixel (image only; no iframe sync endpoint exists yet).
   * Pragma does not operate its own user-ID graph, so this pixel does
   * nothing except let DSP partners see that this browser visited a
   * Pragma-monetised page. Consent strings are forwarded as query params
   * so a future downstream sync redirect can honour them.
   */
  getUserSyncs(
    syncOptions: { pixelEnabled?: boolean },
    _serverResponses: any[],
    gdprConsent: any,
    uspConsent: string,
    gppConsent: any
  ): Array<{ type: string; url: string }> {
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

  // Deliberately NOT implemented, rather than stubbed:
  //
  // onBidWon / onTimeout — Pragma's win/impression accounting already
  //   happens server-side off the VAST tracking beacons baked into the
  //   returned document (GET /api/adx/track/{bid_log_id}/...), which fire
  //   from the actual player on actual playback. A client-side onBidWon
  //   ping would double-count renders that never happened.
};

registerBidder(spec);
