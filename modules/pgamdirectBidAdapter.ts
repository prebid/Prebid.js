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
 *   - bidResponse.meta.networkName from seatbid.seat
 *
 * GVL ID 1353 = PGAM Media LLC (registered with IAB Europe).
 */
import { BidderSpec, registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, NATIVE, VIDEO } from '../src/mediaTypes.js';
import { ortbConverter } from '../libraries/ortbConverter/converter.js';
import { deepSetValue } from '../src/utils.js';

import type { BidRequest } from '../src/adapterManager.js';
import type { ORTBImp, ORTBRequest } from '../src/prebid.public.js';
import type { BidResponse } from '../src/bidfactory.js';

const BIDDER_CODE = 'pgamdirect';
const ENDPOINT_URL = 'https://rtb.pgammedia.com/rtb/v1/auction';
const GVLID = 1353;
const DEFAULT_TTL = 300;

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
   * bidResponse hook — forward seatbid.seat into bidResponse.meta.networkName
   * so publishers see which of our downstream DSPs cleared the auction.
   * Everything else (cpm, currency, width/height, creativeId, ttl,
   * netRevenue, advertiserDomains, mediaType + media-type-specific
   * payload) is handled by the stock bidResponse processor.
   */
  bidResponse(buildBidResponse, bid, context) {
    const bidResponse: BidResponse = buildBidResponse(bid, context);
    if (context.seatbid?.seat) {
      bidResponse.meta = bidResponse.meta || {};
      bidResponse.meta.networkName = context.seatbid.seat;
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
    return result.bids || [];
  },

  /**
   * Win notice — our bidder fires burl + nurl server-side on every
   * winning auction, so Prebid doesn't need to do anything. Keeping
   * this hook as a no-op so older Prebid.js versions that expect the
   * method don't crash.
   */
  onBidWon(_bid) {
    // no-op — burl/nurl handled server-side by bidder-edge
  },
};

registerBidder(spec);
