/**
 * pgamdirect Analytics Adapter.
 *
 * Publishers include this module alongside `pgamdirectBidAdapter` to
 * forward Prebid auction telemetry to the PGAM Direct SSP backend.
 * Companion to the server-side bid-outcomes ledger we maintain from
 * the bidder — this module gives us CLIENT-confirmed signals that
 * the RTB path can't see:
 *
 *   AUCTION_END   — final state of every auction (who we competed
 *                    against, at what prices). Lets us see
 *                    competitor CPMs without needing their
 *                    reports.
 *   BID_WON       — which bidder won in the Prebid layer and what
 *                    they paid. Critical for our reconciliation
 *                    because a server-side win notice doesn't tell
 *                    us if the publisher actually rendered the ad.
 *   AD_RENDER_SUCCEEDED / AD_RENDER_FAILED — client-confirmed
 *                    impression. Feeds the discrepancy reconciler
 *                    so we can distinguish "bidder said we won" from
 *                    "user actually saw the ad."
 *
 * Configuration (publisher-side):
 *
 *   pbjs.enableAnalytics({
 *     provider: 'pgamdirect',
 *     options: {
 *       orgId: '<your pgam org id>'          // REQUIRED
 *       // endpoint: 'https://...custom...'   // optional override
 *     }
 *   });
 *
 * GVL ID: 1353 (same as the bid adapter, PGAM Media LLC).
 */

import adapter from '../libraries/analyticsAdapter/AnalyticsAdapter.js';
import { EVENTS } from '../src/constants.js';
import adapterManager from '../src/adapterManager.js';
import { ajax } from '../src/ajax.js';
import { logError, logMessage } from '../src/utils.js';

const ANALYTICS_CODE = 'pgamdirect';
const GVLID = 1353;
const DEFAULT_ENDPOINT =
  'https://app.pgammedia.com/api/analytics-events';
// Shading ingestion endpoint on the bidder-edge. Distinct from the
// main analytics POST because it carries auction-specific competitive
// intelligence (runner-up price per cell) that the bidder-edge uses
// directly, rather than the web-side analytics sink. Fire-and-forget
// with keepalive; a failed POST just means that auction's sample is
// skipped — the next one carries the same cell tuple.
const SHADING_ENDPOINT = 'https://rtb.pgammedia.com/rtb/v1/shading/record';

// Which events we forward. Deliberately narrow: the four that carry
// reconciliation-grade signal. Adding more here increases the
// per-auction payload size without materially improving our models.
const FORWARDED_EVENTS: readonly string[] = [
  EVENTS.AUCTION_END,
  EVENTS.BID_WON,
  EVENTS.AD_RENDER_SUCCEEDED,
  EVENTS.AD_RENDER_FAILED,
];

interface PgamAnalyticsOptions {
  orgId?: string;
  endpoint?: string;
}

let orgId: string | null = null;
let endpoint = DEFAULT_ENDPOINT;

const pgamdirectAnalytics = Object.assign(
  adapter({ url: DEFAULT_ENDPOINT, analyticsType: 'endpoint' }),
  {
    /**
     * Called by the AnalyticsAdapter base class on every tracked
     * event (via enqueue → track). We filter to our forwarded set,
     * normalise to a compact shape, and POST event-by-event.
     *
     * We deliberately do NOT forward the raw Prebid event args —
     * they carry a lot of site-private data (full FPD blobs,
     * user.eids, custom bidder params) that we don't need and
     * shouldn't exfiltrate.
     */
    track({ eventType, args }: { eventType: string; args?: unknown }) {
      if (!orgId) return;
      if (!FORWARDED_EVENTS.includes(eventType)) return;
      try {
        const normalised = normalise(eventType, args);
        const body = JSON.stringify({ org_id: orgId, event: normalised });
        // Content-type 'text/plain' keeps the POST CORS-simple (no
        // preflight). Our analytics sink parses text/plain as JSON
        // deliberately.
        //
        // keepalive=true per Prebid AGENTS.md guidance for low-
        // priority telemetry: without it, events emitted near page
        // navigation / unload get dropped before the XHR lands. The
        // most valuable events (BID_WON, AD_RENDER_*) fire exactly
        // in the unload window, so this directly improves delivery.
        ajax(endpoint, undefined, body, {
          method: 'POST',
          withCredentials: false,
          contentType: 'text/plain',
          keepalive: true,
        });
        // Phase 4.2 side-effect: on AUCTION_END where we won, POST
        // the runner-up CPM to the bidder-edge's shading ingestion
        // endpoint. Parallel fire-and-forget; the main analytics
        // POST above is unaffected if this throws.
        if (eventType === EVENTS.AUCTION_END) {
          maybePostShading(args);
        }
      } catch (err) {
        logError('[pgamdirectAnalytics] track failed', err);
      }
    },
  },
);

/**
 * maybePostShading — scan an AUCTION_END payload for a winning
 * pgamdirect bid; if found, compute the runner-up CPM across all
 * other bidders in the auction and POST it to the bidder-edge's
 * /rtb/v1/shading/record alongside the cell signature we emitted
 * in bid.ext.pgam.shade.
 *
 * "Runner-up" here is the highest non-pgam CPM in bidsReceived for
 * the same adUnitCode as our win. If there are no other bidders,
 * nothing is posted (one-bidder auctions have no runner-up signal
 * for us to learn from).
 *
 * Best-effort: swallow any error. The shading Store is observational
 * for now (Part A) and a few dropped samples don't affect live
 * auctions; they just slow the warm-up of that cell.
 */
export function maybePostShading(args: unknown): void {
  try {
    const a = (args ?? {}) as {
      bidsReceived?: Array<Record<string, unknown>>;
    };
    const bids = Array.isArray(a.bidsReceived) ? a.bidsReceived : [];
    if (bids.length < 2) return;

    // Find OUR winning bid. We only care about auctions we actually
    // won — the shading Store is about "what did competitors bid
    // when WE won" — losses contain no signal for outbound shading.
    // Prebid attaches status='rendered' or 'winning-bid' on the
    // winner; the simplest robust check is to trust the bidderCode
    // and pick the highest pgam cpm. If multiple pgam bids appear
    // in the same auction (multi-imp), group by adUnitCode so we
    // match per-imp winners.
    const byAdUnit = new Map<string, { ours?: Record<string, unknown>; others: Array<Record<string, unknown>> }>();
    for (const b of bids) {
      const adUnit = typeof b.adUnitCode === 'string' ? b.adUnitCode : '';
      if (!adUnit) continue;
      let row = byAdUnit.get(adUnit);
      if (!row) {
        row = { others: [] };
        byAdUnit.set(adUnit, row);
      }
      if (b.bidderCode === 'pgamdirect') {
        // Keep the highest-cpm pgam bid as "ours" — multi-imp auctions
        // can have several pgam seatbids per adUnit.
        const cpm = typeof b.cpm === 'number' ? b.cpm : 0;
        const bestCpm = row.ours && typeof row.ours.cpm === 'number' ? row.ours.cpm : -1;
        if (cpm > bestCpm) row.ours = b;
      } else {
        row.others.push(b);
      }
    }

    for (const [, row] of byAdUnit) {
      if (!row.ours) continue;
      // Shade cell signature comes from the winning bid's ext.pgam.shade.
      // The bidder-edge populates this on every winning pgam bid.
      const ours = row.ours as { ext?: { pgam?: { shade?: ShadeCell } } };
      const shade = ours.ext?.pgam?.shade;
      if (!shade || !shade.publisher_id) continue;
      // Runner-up = highest CPM among non-pgam bidders on this adUnit.
      let runnerUp = 0;
      for (const o of row.others) {
        const cpm = typeof o.cpm === 'number' ? o.cpm : 0;
        if (cpm > runnerUp) runnerUp = cpm;
      }
      if (runnerUp <= 0) continue; // no competitor bid = no signal

      const shadingBody = JSON.stringify({
        publisher_id: shade.publisher_id,
        placement_ref: shade.placement_ref,
        geo_country: shade.geo_country,
        device_type: shade.device_type,
        attention_bucket: shade.attention_bucket,
        runner_up_cpm_usd: runnerUp,
      });
      // text/plain keeps the POST CORS-simple (no preflight). Server
      // handler decodes body as JSON regardless of content-type.
      ajax(SHADING_ENDPOINT, undefined, shadingBody, {
        method: 'POST',
        withCredentials: false,
        contentType: 'text/plain',
        keepalive: true,
      });
    }
  } catch (err) {
    // Intentionally silent — shading is observational, any error
    // here just skips one sample.
    logMessage('[pgamdirectAnalytics] shading post skipped', err);
  }
}

/**
 * ShadeCell — mirror of the bidder-side outbound.ShadeCell struct.
 * Fields match the JSON tags the bidder emits in bid.ext.pgam.shade.
 * Changes here must track changes on the bidder (both sides land in
 * the same PR to avoid drift).
 */
interface ShadeCell {
  publisher_id: number;
  placement_ref: string;
  geo_country: string;
  device_type: number;
  attention_bucket: string;
}

// Minimal event shape we extract from each Prebid event.
//
// Note on ad_unit_code vs ad_id: they identify different things and
// must be kept separate so downstream reconciliation can join a
// BID_WON to its AD_RENDER_* event reliably.
//
//   ad_unit_code — the publisher's slot identifier (same on BID_WON
//                  and on the subsequent AD_RENDER_SUCCEEDED for that
//                  slot). Stable per-adunit; reused across auctions
//                  when the same slot refreshes.
//   ad_id        — Prebid's per-bid adId (unique per bid response,
//                  changes every auction). Emitted on BID_WON and on
//                  the AD_RENDER_* events so discrepancy analysis can
//                  join render outcomes to the exact winning bid by a
//                  single per-bid key. ad_unit_code alone is ambiguous
//                  on refresh-heavy pages where several wins share the
//                  same slot over time.
//
// Prior revisions fixed by Codex reviews on #14778 and the follow-up
// that added ad_id to BID_WON.
interface NormalisedEvent {
  t: string;
  ts: number;
  auction_id?: string;
  bidder?: string;
  cpm?: number;
  currency?: string;
  ad_unit_code?: string;
  ad_id?: string;
  creative_id?: string;
  media_type?: string;
  size?: string;
  bidders_seen?: Array<{
    bidder: string;
    cpm?: number;
    media_type?: string;
    size?: string;
  }>;
  render_fail_reason?: string;
}

// Exported for unit testing — keeps the pure transform verifiable
// without needing the full Prebid events harness.
export function normalise(eventType: string, rawArgs: unknown): NormalisedEvent {
  const a = (rawArgs ?? {}) as Record<string, unknown>;
  const base: NormalisedEvent = {
    t: eventType,
    ts: Date.now(),
    auction_id: typeof a.auctionId === 'string' ? a.auctionId : undefined,
  };

  switch (eventType) {
    case EVENTS.BID_WON:
      return {
        ...base,
        bidder: typeof a.bidderCode === 'string' ? a.bidderCode : undefined,
        cpm: typeof a.cpm === 'number' ? a.cpm : undefined,
        currency: typeof a.currency === 'string' ? a.currency : undefined,
        ad_unit_code: typeof a.adUnitCode === 'string' ? a.adUnitCode : undefined,
        creative_id: typeof a.creativeId === 'string' ? a.creativeId : undefined,
        media_type: typeof a.mediaType === 'string' ? a.mediaType : undefined,
        size: typeof a.size === 'string' ? a.size : undefined,
        // ad_id (Prebid's per-bid adId) is the ONLY reliable join key
        // between BID_WON and the subsequent AD_RENDER_SUCCEEDED /
        // AD_RENDER_FAILED. On refresh-heavy pages multiple wins share
        // the same ad_unit_code within a single adUnitCode lifecycle,
        // so joining on ad_unit_code alone yields ambiguous matches
        // and skews win-vs-render reconciliation. Emit it on BID_WON
        // too so backend discrepancy analysis can key on a single
        // per-bid identifier.
        ad_id: typeof a.adId === 'string' ? a.adId : undefined,
      };

    case EVENTS.AUCTION_END: {
      const bids = Array.isArray(a.bidsReceived)
        ? (a.bidsReceived as Array<Record<string, unknown>>)
        : [];
      return {
        ...base,
        bidders_seen: bids
          .slice(0, 20) // hard cap
          .map((b) => ({
            bidder: typeof b.bidderCode === 'string' ? b.bidderCode : '',
            cpm: typeof b.cpm === 'number' ? b.cpm : undefined,
            media_type: typeof b.mediaType === 'string' ? b.mediaType : undefined,
            size: typeof b.size === 'string' ? b.size : undefined,
          }))
          .filter((b) => b.bidder),
      };
    }

    case EVENTS.AD_RENDER_SUCCEEDED: {
      // Render events carry the winning bid nested under args.bid;
      // extract adUnitCode from THERE (stable across BID_WON ↔
      // AD_RENDER_* joins). adId goes into its own field for
      // per-bid traceability.
      const bid =
        typeof a.bid === 'object' && a.bid
          ? (a.bid as Record<string, unknown>)
          : null;
      return {
        ...base,
        bidder: bid && typeof bid.bidderCode === 'string' ? bid.bidderCode : undefined,
        ad_unit_code: bid && typeof bid.adUnitCode === 'string' ? bid.adUnitCode : undefined,
        ad_id: typeof a.adId === 'string' ? a.adId : undefined,
      };
    }

    case EVENTS.AD_RENDER_FAILED: {
      const bid =
        typeof a.bid === 'object' && a.bid
          ? (a.bid as Record<string, unknown>)
          : null;
      return {
        ...base,
        render_fail_reason: typeof a.reason === 'string' ? a.reason : 'unknown',
        ad_unit_code: bid && typeof bid.adUnitCode === 'string' ? bid.adUnitCode : undefined,
        ad_id: typeof a.adId === 'string' ? a.adId : undefined,
      };
    }

    default:
      return base;
  }
}

// Intercept enableAnalytics to capture orgId + endpoint out of the
// provider config. Pattern copied from
// modules/AsteriobidPbmAnalyticsAdapter.js and other TS adapters.
(pgamdirectAnalytics as unknown as Record<string, unknown>)
  .originEnableAnalytics = pgamdirectAnalytics.enableAnalytics;
pgamdirectAnalytics.enableAnalytics = function (config: {
  options?: PgamAnalyticsOptions;
}) {
  const opts = config?.options ?? {};
  if (!opts.orgId || typeof opts.orgId !== 'string') {
    logError('[pgamdirectAnalytics] options.orgId is required');
    return;
  }
  orgId = opts.orgId;
  if (typeof opts.endpoint === 'string' && opts.endpoint) {
    endpoint = opts.endpoint;
  }
  logMessage(`[pgamdirectAnalytics] enabled for orgId=${orgId}`);
  (
    (pgamdirectAnalytics as unknown as Record<string, unknown>)
      .originEnableAnalytics as (c: unknown) => void
  ).call(pgamdirectAnalytics, config);
};

adapterManager.registerAnalyticsAdapter({
  adapter: pgamdirectAnalytics,
  code: ANALYTICS_CODE,
  gvlid: GVLID,
});

export default pgamdirectAnalytics;
