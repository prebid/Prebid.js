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
        ajax(endpoint, undefined, body, {
          method: 'POST',
          withCredentials: false,
          contentType: 'text/plain',
        });
      } catch (err) {
        logError('[pgamdirectAnalytics] track failed', err);
      }
    },
  },
);

// Minimal event shape we extract from each Prebid event.
interface NormalisedEvent {
  t: string;
  ts: number;
  auction_id?: string;
  bidder?: string;
  cpm?: number;
  currency?: string;
  ad_unit_code?: string;
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

    case EVENTS.AD_RENDER_SUCCEEDED:
      return {
        ...base,
        bidder:
          typeof a.bid === 'object' && a.bid
            ? ((a.bid as Record<string, unknown>).bidderCode as string | undefined)
            : undefined,
        ad_unit_code: typeof a.adId === 'string' ? a.adId : undefined,
      };

    case EVENTS.AD_RENDER_FAILED:
      return {
        ...base,
        render_fail_reason: typeof a.reason === 'string' ? a.reason : 'unknown',
        ad_unit_code: typeof a.adId === 'string' ? a.adId : undefined,
      };

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
