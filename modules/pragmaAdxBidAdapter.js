/**
 * Pragma Adx — Prebid.js Bid Adapter (video + banner)
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
 *    Prebid.js source tree as `modules/pragmaAdxBidAdapter.js`, then
 *    builds with it included:
 *
 *        git clone https://github.com/prebid/Prebid.js && cd Prebid.js
 *        npm ci
 *        cp pragmaAdxBidAdapter.js modules/
 *        gulp build --modules=pragmaAdxBidAdapter,<their other modules>
 *
 *    This is a standard, fully supported Prebid workflow — most
 *    publishers already run a custom build, because Prebid.js only ever
 *    ships the modules you select. The file is downloadable from
 *    https://apps.pragma-crm.com/static/prebid/pragmaAdxBidAdapter.js
 *
 * 2. WHAT IS *NOT* TRUE YET — Pragma is **not** a bidder listed in the
 *    official Prebid.js repository. Two real pull requests were opened
 *    2026-09-21 (prebid/Prebid.js#15639, prebid/prebid.github.io#6751)
 *    but neither is merged — that review is a real external process
 *    outside this codebase's control, with no guaranteed timeline. Until
 *    a Prebid maintainer actually merges both, `pragmaAdx` will NOT
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

import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, VIDEO } from '../src/mediaTypes.js';

const BIDDER_CODE = 'pragmaAdx';
const ENDPOINT_URL = 'https://apps.pragma-crm.com/api/adx/prebid';
const DEFAULT_PLAYER_SIZE = [640, 360];
const DEFAULT_BANNER_SIZE = [300, 250];

/**
 * Prebid allows playerSize as either [w, h] or [[w, h], ...].
 * Returns [width, height], falling back to our documented server default.
 */
function resolvePlayerSize(bidRequest) {
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

function resolveBannerSize(bidRequest) {
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

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [VIDEO, BANNER],

  /**
   * Pragma needs an api_key + ad_unit_id (both issued when a publisher
   * registers — see https://apps.pragma-crm.com/adx/quickstart) and
   * serves video or banner depending on the ad unit's own format, so a
   * request with neither mediaType is rejected here rather than wasting
   * a network call on a guaranteed no-bid.
   */
  isBidRequestValid: function (bid) {
    if (!bid) {
      return false;
    }
    const params = bid.params || {};
    const hasVideo = !!(bid.mediaTypes && bid.mediaTypes.video);
    const hasBanner = !!(bid.mediaTypes && bid.mediaTypes.banner);
    return (hasVideo || hasBanner) && !!params.apiKey && !!params.adUnitId;
  },

  /**
   * One ServerRequest per bid: the Pragma endpoint decides a single
   * impression per call (it maps onto one OpenRTB imp), so there is
   * nothing honest to gain from batching them into one request.
   */
  buildRequests: function (validBidRequests, bidderRequest) {
    return (validBidRequests || []).map(function (bid) {
      const params = bid.params || {};
      const hasBanner = !!(bid.mediaTypes && bid.mediaTypes.banner);
      const size = hasBanner ? resolveBannerSize(bid) : resolvePlayerSize(bid);
      const payload = {
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
  interpretResponse: function (serverResponse) {
    const body = (serverResponse && serverResponse.body) || {};
    const bids = Array.isArray(body.bids) ? body.bids : [];
    return bids
      .filter(function (bid) {
        // A bid without a real positive price is not a bid; the creative
        // itself (VAST document for video, markup for banner) must also
        // actually be present.
        if (!bid || parseFloat(bid.cpm) <= 0) {
          return false;
        }
        if (bid.mediaType === 'banner') {
          return !!(bid.ad && String(bid.ad).trim());
        }
        return !!(bid.vastXml && String(bid.vastXml).trim());
      })
      .map(function (bid) {
        const isBanner = bid.mediaType === 'banner';
        const out = {
          requestId: bid.requestId,
          cpm: parseFloat(bid.cpm),
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

  // Deliberately NOT implemented, rather than stubbed:
  //
  // getUserSyncs — Pragma runs no cookie-sync or pixel-sync endpoint, so
  //   there is no real URL to return. An adapter that returns a fake or
  //   empty-but-present sync does nothing except add a request.
  // onBidWon / onTimeout — Pragma's win/impression accounting already
  //   happens server-side off the VAST tracking beacons baked into the
  //   returned document (GET /api/adx/track/{bid_log_id}/...), which fire
  //   from the actual player on actual playback. A client-side onBidWon
  //   ping would double-count renders that never happened.
  //
  // Both become worth adding the moment there is real infrastructure
  // behind them; see docs/ADX_RUNBOOK.md's "Not yet built".
};

registerBidder(spec);
