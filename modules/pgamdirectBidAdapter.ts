/**
 * PGAM Direct — Prebid.js bid adapter.
 *
 * Speaks canonical OpenRTB 2.6 directly to our bidder at
 *   https://rtb.pgammedia.com/rtb/v1/auction
 *
 * Intentionally NOT a fork of pgamsspBidAdapter — that adapter uses a
 * custom TeqBlaze envelope shape, while our bidder speaks real OpenRTB.
 * Sharing code would mean adding compat paths on both sides; cleaner to
 * have a purpose-built adapter that's 1:1 with our server contract.
 *
 * Publisher-facing params shape:
 *
 *   pbjs.addAdUnits([{
 *     code: 'ad-slot-1',
 *     mediaTypes: { banner: { sizes: [[300, 250], [728, 90]] } },
 *     bids: [{
 *       bidder: 'pgamdirect',
 *       params: {
 *         orgId: 'pgam-acme-publisher',       // REQUIRED — we issue this to the publisher
 *         placementId: 'leaderboard-728x90',  // optional — maps to imp.tagid
 *       }
 *     }]
 *   }]);
 *
 * Built on top of libraries/ortbConverter so we inherit Prebid's
 * standard handling of media types, floors (priceFloors module),
 * schain (FPD normalisation → source.ext.schain), user.eids, GDPR/
 * USP/GPP/COPPA, site/device enrichment, and bidResponse mapping.
 * All we layer in is our distinctive shape:
 *
 *   - imp.ext.pgam.orgId      (publisher tenant, required)
 *   - imp.tagid from params.placementId
 *   - imp.displaymanager / displaymanagerver (ORTB spec compliance)
 *   - bidResponse.meta enrichment (advertiserDomains, brandId,
 *     primaryCatId, secondaryCatIds, dsa, networkName)
 *   - getUserSyncs with GDPR/USP/GPP/COPPA passthrough
 *   - interpretResponse surfaces response.ext.paapi when present so
 *     the Chrome Privacy Sandbox / Protected Audience API flow lights
 *     up when the publisher enables PAAPI in their wrapper config
 *   - onBidWon / onTimeout adapter-side telemetry
 *   - onBidBillable / onAdRenderSucceeded — fill-rate + viewability
 *     reconciliation pixels, keyed on bid.adId so the backend can
 *     disambiguate refresh-heavy pages that share ad_unit_code
 *
 * GVL ID 1353 = PGAM Media LLC (registered with IAB Europe).
 */
import { BidderSpec, registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, NATIVE, VIDEO } from '../src/mediaTypes.js';
import { ortbConverter } from '../libraries/ortbConverter/converter.js';
import { deepSetValue, triggerPixel } from '../src/utils.js';

import type { BidRequest } from '../src/adapterManager.js';
import type { ORTBImp, ORTBRequest } from '../src/prebid.public.js';
import type { BidResponse } from '../src/bidfactory.js';

const BIDDER_CODE = 'pgamdirect';
const ENDPOINT_URL = 'https://rtb.pgammedia.com/rtb/v1/auction';
const USERSYNC_URL = 'https://rtb.pgammedia.com/rtb/v1/usersync';
const TIMEOUT_METRIC_URL = 'https://rtb.pgammedia.com/rtb/v1/metrics/timeout';
// Billable impression + render pixel endpoints. Separate from
// the generic onBidWon path so the bidder-edge can keep distinct
// counters (wins ≠ billable imps ≠ rendered imps); conflating them
// breaks fill-rate / viewability reconciliation.
const BILLABLE_METRIC_URL = 'https://rtb.pgammedia.com/rtb/v1/metrics/billable';
const RENDER_METRIC_URL = 'https://rtb.pgammedia.com/rtb/v1/metrics/render';
const GVLID = 1353;
const DEFAULT_TTL = 300;

// Prebid.js build-time version token — replaced at bundle time by
// the build. Surfaced as imp.displaymanagerver so DSPs can
// distinguish client wrapping versions. Some DSPs filter bids
// without displaymanager/ver set, so this is spec-compliance.
// We use the same '$prebid.version$' token as PubMatic / Conversant /
// OMS / Showheroes / Yandex / GumGum — it's the idiomatic build-time
// replacement across the codebase.
const PREBID_VERSION = '$prebid.version$';

/**
 * Public params interface — contracted with publishers.
 * Only orgId is required; placementId and bidfloor are optional
 * conveniences. Floors module is the preferred path for dynamic
 * bidfloor; params.bidfloor remains as a fallback for publishers on
 * the legacy per-bidder floor shape.
 */
type PgamDirectBidParams = {
  orgId: string;
  placementId?: string;
  bidfloor?: number;
};

declare module '../src/adUnits' {
  interface BidderParams {
    [BIDDER_CODE]: PgamDirectBidParams;
  }
}

const converter = ortbConverter({
  context: {
    netRevenue: true,
    ttl: DEFAULT_TTL,
  },
  /**
   * Imp hook — layer our pgam-specific fields on top of the stock imp.
   * The stock converter already populates id, secure, banner/video/
   * native, bidfloor (via priceFloors when enabled), and the ortb2Imp
   * FPD merge (gpid, etc.).
   */
  imp(buildImp, bidRequest: BidRequest<typeof BIDDER_CODE>, context) {
    const imp: ORTBImp = buildImp(bidRequest, context);
    // imp.ext.pgam.orgId routes the request to the publisher tenant on
    // our side. Without it, the bidder returns publisher_not_found.
    deepSetValue(imp, 'ext.pgam.orgId', bidRequest.params.orgId);
    if (bidRequest.params.placementId) {
      imp.tagid = String(bidRequest.params.placementId);
    }
    // Legacy params.bidfloor fallback — only applied when the
    // priceFloors module DIDN'T populate imp.bidfloor. Keeps
    // publishers who haven't adopted the floors module working.
    if (
      (imp.bidfloor === undefined || imp.bidfloor === 0) &&
      typeof bidRequest.params.bidfloor === 'number' &&
      bidRequest.params.bidfloor >= 0
    ) {
      imp.bidfloor = bidRequest.params.bidfloor;
      imp.bidfloorcur = imp.bidfloorcur || 'USD';
    }
    // ORTB spec compliance. Some DSPs filter bids where
    // imp.displaymanager is missing (the field distinguishes
    // server-side integrations from header bidding, so DSPs use it
    // for shaping). PubMatic + IX both set these; we match.
    if (!imp.displaymanager) imp.displaymanager = 'Prebid.js';
    if (!imp.displaymanagerver) imp.displaymanagerver = PREBID_VERSION;
    return imp;
  },
  /**
   * Request hook — first-price auction (at: 1) and USD currency
   * passthrough. Everything else (tmax, source.tid, schain,
   * user.eids, site, device, regs) is handled by the stock
   * converter + FPD/ortb2 pipeline.
   */
  request(buildRequest, imps, bidderRequest, context) {
    const request: ORTBRequest = buildRequest(imps, bidderRequest, context);
    request.at = 1;
    if (!request.cur || request.cur.length === 0) {
      request.cur = ['USD'];
    }
    return request;
  },
  /**
   * bidResponse hook — enrich bidResponse.meta with every field the
   * bidder returned. Rich meta is what keeps us from getting rejected
   * by downstream ad servers (AdX, Amazon Publisher Services) that
   * require advertiserDomains for brand-safety gating.
   *
   * Fields populated:
   *   - advertiserDomains  from bid.adomain (ORTB 2.x standard)
   *   - primaryCatId       from bid.cat[0]
   *   - secondaryCatIds    from bid.cat[1..]
   *   - networkName        from seatbid.seat
   *   - networkId          from seatbid.seat (numeric form)
   *   - brandId / brandName / agencyId / buyerId / demandSource
   *                        from bid.ext.meta.*
   *   - dsa                from bid.ext.dsa (ORTB 2.6 DSA transparency)
   *   - dchain             from bid.ext.dchain
   *
   * Stock converter already sets mediaType + cpm + size + creativeId;
   * we augment rather than replace.
   */
  bidResponse(buildBidResponse, bid, context) {
    const bidResponse: BidResponse = buildBidResponse(bid, context);
    bidResponse.meta = bidResponse.meta || {};

    // networkName / networkId from seatbid.seat. Numeric seats
    // populate both; slug-style seats populate only networkName.
    if (context.seatbid?.seat) {
      const seat = String(context.seatbid.seat);
      bidResponse.meta.networkName = seat;
      if (/^\d+$/.test(seat)) {
        bidResponse.meta.networkId = Number(seat);
      }
    }

    // Rich meta from bid.ext — defensive reads; the DSP may not
    // populate every field.
    const ext = (bid.ext || {}) as Record<string, unknown>;
    const extMeta = (ext.meta || {}) as Record<string, unknown>;

    if (Array.isArray(bid.adomain) && bid.adomain.length > 0) {
      bidResponse.meta.advertiserDomains = bid.adomain;
    }
    if (Array.isArray(bid.cat) && bid.cat.length > 0) {
      bidResponse.meta.primaryCatId = bid.cat[0];
      if (bid.cat.length > 1) {
        bidResponse.meta.secondaryCatIds = bid.cat.slice(1);
      }
    }
    const pick = (...keys: string[]): unknown => {
      for (const k of keys) {
        const v = extMeta[k];
        if (v != null) return v;
      }
      return undefined;
    };
    const brandId = pick('brand_id', 'brandId');
    if (brandId != null) bidResponse.meta.brandId = brandId as string | number;
    const brandName = pick('brand_name', 'brandName');
    if (brandName != null) bidResponse.meta.brandName = brandName as string;
    const agencyId = pick('agency_id', 'agencyId');
    if (agencyId != null) bidResponse.meta.agencyId = agencyId as string | number;
    const buyerId = pick('buyer_id', 'buyerId');
    if (buyerId != null) bidResponse.meta.buyerId = buyerId as string | number;
    const demandSource = pick('demand_source', 'demandSource');
    if (demandSource != null) bidResponse.meta.demandSource = demandSource as string;

    // DSA transparency (ORTB 2.6). If the DSP returned a dsa object,
    // surface it so the publisher's ad-server can use it for EU
    // behavioral-ads disclosure. See IAB Tech Lab DSA spec.
    if (ext.dsa != null) {
      (bidResponse.meta as Record<string, unknown>).dsa = ext.dsa;
    }
    // DemandChain Object (dchain) — ad-supply-chain disclosure.
    if (ext.dchain != null) {
      (bidResponse.meta as Record<string, unknown>).dchain = ext.dchain;
    }

    return bidResponse;
  },
});

export const spec: BidderSpec<typeof BIDDER_CODE> = {
  code: BIDDER_CODE,
  gvlid: GVLID,
  supportedMediaTypes: [BANNER, VIDEO, NATIVE],

  /**
   * Minimum validation: orgId must be a non-empty string. That's the
   * identifier we use to route the request to a publisher/tenant on
   * our side; without it the bidder returns publisher_not_found.
   */
  isBidRequestValid(bid) {
    const orgId = bid?.params?.orgId;
    return typeof orgId === 'string' && orgId.length > 0;
  },

  buildRequests(bidRequests, bidderRequest) {
    if (!bidRequests || bidRequests.length === 0) return [];
    const data = converter.toORTB({ bidRequests, bidderRequest });
    return {
      method: 'POST',
      url: ENDPOINT_URL,
      data,
      options: {
        // Deliberately omit `contentType`. A content-type of
        // `application/json` is NOT a CORS-simple header (only
        // text/plain, application/x-www-form-urlencoded, and
        // multipart/form-data qualify), so setting it would force a
        // browser preflight on every auction. Leaving it unset keeps
        // the POST CORS-simple, which saves one RTT per request —
        // meaningful at auction timeouts of 300ms.
        withCredentials: false,
      },
    };
  },

  interpretResponse(serverResponse, request) {
    if (!serverResponse?.body) return [];
    // `fromORTB` returns an ExtendedResponse wrapper (`{ bids: [...] }`)
    // in practice; unwrap to the flat BidResponse[] that publishers
    // expect from interpretResponse. `AdapterResponse` is a union
    // type so TS can't statically prove `.bids` is there — assert.
    const result = converter.fromORTB({
      response: serverResponse.body,
      request: request.data,
    }) as { bids?: BidResponse[] };
    const bids = result.bids || [];

    // PAAPI / Protected Audience API passthrough. If the bidder
    // returned `ext.igi` (Interest Group Info) or `ext.paapi` auction
    // configs, surface them to Prebid. When PAAPI is enabled in the
    // wrapper config, Prebid kicks off a parallel Chrome Privacy
    // Sandbox auction using those configs; when disabled, Prebid
    // silently ignores the `paapi` key (see bidderFactory.ts
    // RESPONSE_PROPS). Either way we don't break.
    //
    // Format the bidder returns:
    //   response.ext.paapi = [{ impid, config: AuctionConfig }, ...]
    // We map impid → bidRequest.bidId so Prebid can associate the
    // Privacy Sandbox auction with the right ad unit.
    const body = serverResponse.body as {
      ext?: { paapi?: Array<{ impid?: string; config?: unknown; bidId?: string }> };
    };
    const paapiRaw = body?.ext?.paapi;
    if (Array.isArray(paapiRaw) && paapiRaw.length > 0) {
      const paapi = paapiRaw
        .filter((e) => e && e.config)
        .map((e) => ({
          // Prebid expects `bidId` as the correlation key. Bidder may
          // send either `bidId` (already-resolved) or `impid` (ORTB
          // convention); accept both.
          bidId: e.bidId ?? e.impid,
          config: e.config,
        }));
      if (paapi.length > 0) {
        return { bids, paapi } as unknown as BidResponse[];
      }
    }
    return bids;
  },

  /**
   * getUserSyncs — plant a first-party cookie on .pgammedia.com so
   * cross-DSP cookie-match paths work. Without this, buyers can't
   * match users to their identity graphs and our CPMs are
   * systematically lower than bidders who sync.
   *
   * Consent passthrough (server-side /rtb/v1/usersync applies them):
   *   - GDPR:   gdpr + gdpr_consent
   *   - USP:    us_privacy
   *   - GPP:    gpp + gpp_sid
   *   - COPPA:  coppa — honored server-side (we NEVER plant a cookie
   *             on child-directed traffic regardless of other signals)
   *
   * The bidder's /rtb/v1/usersync endpoint reads these params and
   * skips the Set-Cookie response when any of them say "don't
   * store". The GIF/HTML response is still served so Prebid's retry
   * logic doesn't misclassify this as a network failure.
   */
  getUserSyncs(syncOptions, _serverResponses, gdprConsent, uspConsent, gppConsent) {
    const syncs: Array<{ type: 'iframe' | 'image'; url: string }> = [];
    // If the publisher disabled BOTH iframe and image in config, we
    // can't do anything useful.
    if (!syncOptions.iframeEnabled && !syncOptions.pixelEnabled) {
      return syncs;
    }

    const params: string[] = [];
    if (gdprConsent?.gdprApplies != null) {
      params.push(`gdpr=${gdprConsent.gdprApplies ? 1 : 0}`);
    }
    if (gdprConsent?.consentString) {
      params.push(`gdpr_consent=${encodeURIComponent(gdprConsent.consentString)}`);
    }
    if (uspConsent) {
      params.push(`us_privacy=${encodeURIComponent(String(uspConsent))}`);
    }
    if (gppConsent?.gppString) {
      params.push(`gpp=${encodeURIComponent(gppConsent.gppString)}`);
    }
    if (gppConsent?.applicableSections?.length) {
      params.push(`gpp_sid=${encodeURIComponent(gppConsent.applicableSections.join(','))}`);
    }
    const qs = params.length > 0 ? `&${params.join('&')}` : '';

    // iframe is preferred — better UX for publishers (no visible
    // pixel, ad-server-friendly). Fall back to pixel if the publisher
    // config disabled iframes.
    if (syncOptions.iframeEnabled) {
      syncs.push({ type: 'iframe', url: `${USERSYNC_URL}?t=i${qs}` });
    } else if (syncOptions.pixelEnabled) {
      syncs.push({ type: 'image', url: `${USERSYNC_URL}?t=p${qs}` });
    }
    return syncs;
  },

  /**
   * Win notice. Our bidder fires burl + nurl server-side on every
   * winning auction, so strictly speaking Prebid doesn't need to do
   * anything here. We ALSO fire an adapter-side win pixel as defense-
   * in-depth:
   *
   *   - Some ad-server setups block nurl (CSP, ad blockers on
   *     publisher pages) but can still load our win pixel from the
   *     post-Prebid renderer context.
   *   - Adapter-side fire gives us a cross-check — if the server-side
   *     count diverges from adapter wins, that signals an ad-server
   *     integration issue.
   *
   * Pixel URL is opportunistically pulled from bid.ext.pgam.winurl if
   * the bidder provided one; falls back to bid.nurl. Best-effort;
   * never throws.
   */
  onBidWon(bid) {
    try {
      const extPgam = (bid as { ext?: { pgam?: { winurl?: string } } })?.ext?.pgam;
      const winUrl = extPgam?.winurl ?? (bid as { nurl?: string })?.nurl;
      if (winUrl && typeof winUrl === 'string') {
        const resolved = winUrl
          .replace(/\$\{AUCTION_PRICE\}/g, String(bid.cpm ?? ''))
          .replace(/\$\{AUCTION_ID\}/g, String((bid as { auctionId?: string }).auctionId ?? ''));
        triggerPixel(resolved);
      }
    } catch {
      // Swallow — win telemetry must never break rendering.
    }
  },

  /**
   * Timeout notice. If Prebid's tmax fires before we responded, post
   * timing details to a server-side metric sink so ops can correlate
   * publisher-side timeouts with our p95 latency per region.
   * Fire-and-forget; no retry, no user-visible effect.
   */
  onTimeout(timeoutData) {
    try {
      if (!Array.isArray(timeoutData) || timeoutData.length === 0) return;
      const first = timeoutData[0];
      const url = `${TIMEOUT_METRIC_URL}` +
        `?tmax=${encodeURIComponent(String(first.timeout ?? ''))}` +
        `&auction=${encodeURIComponent(String(first.auctionId ?? ''))}`;
      triggerPixel(url);
    } catch {
      // Ditto — telemetry never blocks.
    }
  },

  /**
   * onBidBillable — Prebid fires this when the bid crosses the
   * "counted as billable impression" threshold (after targeting is
   * set and the ad-server confirms delivery, not just BID_WON). This
   * is the number we reconcile on for revenue; keeping it separate
   * from onBidWon is important because:
   *
   *   - BID_WON fires whenever Prebid *thinks* we won the auction,
   *     even if the ad-server ultimately picks a house ad.
   *   - onBidBillable fires only when we actually bill.
   *
   * Few adapters wire this today (Yandex, APS, Michao, Vidazoo,
   * ProgrammaticX, OpaMarketplace). Adding it puts us in that top
   * tier for billing accuracy.
   */
  onBidBillable(bid) {
    try {
      const cpm = (bid as { cpm?: number }).cpm;
      const auctionId = (bid as { auctionId?: string }).auctionId;
      const adId = (bid as { adId?: string }).adId;
      const url = `${BILLABLE_METRIC_URL}` +
        `?cpm=${encodeURIComponent(String(cpm ?? ''))}` +
        `&auction=${encodeURIComponent(String(auctionId ?? ''))}` +
        `&adid=${encodeURIComponent(String(adId ?? ''))}`;
      triggerPixel(url);
    } catch {
      // Billing telemetry must never break rendering.
    }
  },

  /**
   * onAdRenderSucceeded — fired after the creative successfully
   * renders in the page. Sits between onBidBillable (Prebid thinks
   * we won) and the user actually viewing the ad; without this we
   * conflate "billed" with "rendered" and can't subtract render
   * failures from inventory KPIs.
   *
   * Render failures are captured on the analytics-adapter side via
   * EVENTS.AD_RENDER_FAILED (which is NOT part of BidderSpec), so
   * the bidder-edge sees both halves: a render-success pixel here
   * and a render-fail record from the analytics stream. The two
   * streams are keyed on `bid.adId`, matching the Codex-flagged
   * reconciliation pattern.
   */
  onAdRenderSucceeded(bid) {
    try {
      const adId = (bid as { adId?: string }).adId;
      const auctionId = (bid as { auctionId?: string }).auctionId;
      const url = `${RENDER_METRIC_URL}` +
        `?ok=1` +
        `&adid=${encodeURIComponent(String(adId ?? ''))}` +
        `&auction=${encodeURIComponent(String(auctionId ?? ''))}`;
      triggerPixel(url);
    } catch {
      // Telemetry never blocks.
    }
  },
};

registerBidder(spec);
