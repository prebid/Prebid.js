/**
 * PGAM Direct — Prebid.js bid adapter. Speaks OpenRTB 2.6 to
 * https://rtb.pgammedia.com/rtb/v1/auction via libraries/ortbConverter,
 * adding imp.ext.pgam.orgId routing, displaymanager fields, bidResponse
 * meta enrichment, consent-aware cookie syncs, ext.paapi passthrough,
 * and the standard lifecycle telemetry hooks.
 *
 * Publisher params: { orgId, placementId? }.
 * GVL ID 1353 = PGAM Media LLC.
 */
import { BidderSpec, registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, NATIVE, VIDEO } from '../src/mediaTypes.js';
import { ortbConverter } from '../libraries/ortbConverter/converter.js';
import { deepSetValue, triggerPixel } from '../src/utils.js';

import type { BidRequest } from '../src/adapterManager.js';
import type { ORTBImp, ORTBRequest } from '../src/prebid.public.js';
import type { BidResponse } from '../src/bidfactory.js';

/**
 * Low-priority telemetry. Uses fetch with keepalive (per Prebid
 * AGENTS.md) so events emitted near unload don't drop.
 */
function sendBeacon(url: string): void {
  try {
    fetch(url, { method: 'GET', keepalive: true }).catch(() => {});
  } catch {
    /* no-fetch environment — skip silently */
  }
}

const BIDDER_CODE = 'pgamdirect';
const ENDPOINT_URL = 'https://rtb.pgammedia.com/rtb/v1/auction';
const USERSYNC_URL = 'https://rtb.pgammedia.com/rtb/v1/usersync';
const TIMEOUT_METRIC_URL = 'https://rtb.pgammedia.com/rtb/v1/metrics/timeout';
const BILLABLE_METRIC_URL = 'https://rtb.pgammedia.com/rtb/v1/metrics/billable';
const RENDER_METRIC_URL = 'https://rtb.pgammedia.com/rtb/v1/metrics/render';
const GVLID = 1353;
const DEFAULT_TTL = 300;

// Replaced at bundle time. Surfaced as imp.displaymanagerver.
const PREBID_VERSION = '$prebid.version$';

/**
 * Public params. orgId required; placementId / bidfloor optional.
 * Prefer the Floors module for dynamic floors; params.bidfloor is a
 * fallback for publishers still on the per-bidder shape.
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
   * Layer pgam-specific fields onto the stock imp.
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
    // Some DSPs filter bids missing displaymanager / displaymanagerver.
    if (!imp.displaymanager) imp.displaymanager = 'Prebid.js';
    if (!imp.displaymanagerver) imp.displaymanagerver = PREBID_VERSION;
    return imp;
  },
  /**
   * Set first-price + USD default on the OpenRTB request.
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
   * Populate bidResponse.meta from bid.adomain, bid.cat, seatbid.seat,
   * bid.ext.meta.*, bid.ext.dsa, bid.ext.dchain.
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

    // PAAPI passthrough — surface response.ext.paapi[] when present.
    const body = serverResponse.body as {
      ext?: { paapi?: Array<{ impid?: string; config?: unknown; bidId?: string }> };
    };
    const paapiRaw = body?.ext?.paapi;
    if (Array.isArray(paapiRaw) && paapiRaw.length > 0) {
      const paapi = paapiRaw
        .filter((e) => e && e.config)
        .map((e) => ({
          // bidder may send bidId (resolved) or impid (ORTB).
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
   * Server-side cookie sync at /rtb/v1/usersync. Forwards GDPR / USP /
   * GPP / COPPA params so the server can decide whether to Set-Cookie.
   */
  getUserSyncs(syncOptions, _serverResponses, gdprConsent, uspConsent, gppConsent) {
    const syncs: Array<{ type: 'iframe' | 'image'; url: string }> = [];
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

    if (syncOptions.iframeEnabled) {
      syncs.push({ type: 'iframe', url: `${USERSYNC_URL}?t=i${qs}` });
    } else if (syncOptions.pixelEnabled) {
      syncs.push({ type: 'image', url: `${USERSYNC_URL}?t=p${qs}` });
    }
    return syncs;
  },

  /**
   * Adapter-side win pixel. Pulls from bid.ext.pgam.winurl with a
   * nurl fallback, expanding ${AUCTION_PRICE} and ${AUCTION_ID}.
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
    } catch {}
  },

  onTimeout(timeoutData) {
    try {
      if (!Array.isArray(timeoutData) || timeoutData.length === 0) return;
      const first = timeoutData[0];
      const url = `${TIMEOUT_METRIC_URL}` +
        `?tmax=${encodeURIComponent(String(first.timeout ?? ''))}` +
        `&auction=${encodeURIComponent(String(first.auctionId ?? ''))}`;
      sendBeacon(url);
    } catch {}
  },

  /**
   * Billable-impression notification. Distinct from BID_WON (which
   * fires whenever Prebid thinks we won) — this only fires after the
   * ad-server confirms delivery, so it's the number we reconcile
   * revenue against.
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
      sendBeacon(url);
    } catch {}
  },

  /**
   * Render-success notification. Pairs with EVENTS.AD_RENDER_FAILED
   * on the analytics adapter so the bidder-edge sees both halves of
   * the render outcome, keyed on bid.adId.
   */
  onAdRenderSucceeded(bid) {
    try {
      const adId = (bid as { adId?: string }).adId;
      const auctionId = (bid as { auctionId?: string }).auctionId;
      const url = `${RENDER_METRIC_URL}` +
        `?ok=1` +
        `&adid=${encodeURIComponent(String(adId ?? ''))}` +
        `&auction=${encodeURIComponent(String(auctionId ?? ''))}`;
      sendBeacon(url);
    } catch {}
  },

};

registerBidder(spec);
