/**
 * Paywalls VAI Analytics Adapter
 *
 * Emits VAI (Validated Actor Inventory) classification — vat and act —
 * on each auction to the publisher's analytics pipeline (GA4, GTM
 * dataLayer, or custom callback).  Publishers use their existing
 * reporting stack (GAM, GA4, warehouse) to slice any metric by traffic
 * classification.  No bid-level aggregation is done here; the RTD
 * module already injects VAI into ORTB2 so SSPs and GAM can report
 * on it natively.
 *
 * Publishers must load vai.js before Prebid.js initializes:
 *   <script src="/pw/vai.js"></script>
 *
 * @module modules/paywallsAnalyticsAdapter
 * @see https://paywalls.net/docs/publishers/vai
 */

import adapter from '../libraries/analyticsAdapter/AnalyticsAdapter.js';
import adapterManager from '../src/adapterManager.js';
import { EVENTS } from '../src/constants.js';
import { logInfo, logWarn } from '../src/utils.js';

const ADAPTER_CODE = 'paywalls';
const LOG_PREFIX = '[PaywallsAnalytics] ';

export const VAI_WINDOW_KEY = '__PW_VAI__';

const { AUCTION_END } = EVENTS;

// Track which auctions we've already emitted for (de-dup)
let emittedAuctions = Object.create(null);

// ---------------------------------------------------------------------------
// Config (set during enableAnalytics)
// ---------------------------------------------------------------------------

export let adapterConfig = {
  output: 'callback',   // 'gtag' | 'dataLayer' | 'callback'
  samplingRate: 1.0,
  callback: null,
};

// Whether this page session is sampled in
let sampledIn = true;

// ---------------------------------------------------------------------------
// VAI reading
// ---------------------------------------------------------------------------

/**
 * Read VAI classification from the window global.
 * @returns {{ vat: string, act: string } | null}
 */
export function getVaiClassification() {
  const vai = window[VAI_WINDOW_KEY];
  if (vai && typeof vai === 'object' && vai.vat && vai.act) {
    if (typeof vai.exp === 'number' && vai.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    return { vat: vai.vat, act: vai.act };
  }
  return null;
}

// ---------------------------------------------------------------------------
// Metrics computation
// ---------------------------------------------------------------------------

/**
 * Build the KVP object emitted per auction.
 * Only contains VAI classification — vat and act.
 * UNKNOWN values signal that VAI was not available (publisher did not
 * load vai.js, or it returned an invalid/expired response).
 * @returns {object}  The KVP metrics object
 */
export function computeMetrics() {
  const vai = getVaiClassification();
  return {
    vai_vat: vai ? vai.vat : 'UNKNOWN',
    vai_act: vai ? vai.act : 'UNKNOWN',
  };
}

// ---------------------------------------------------------------------------
// Output emission
// ---------------------------------------------------------------------------

/**
 * Emit metrics via the configured output mode.
 * @param {object} kvps  The metrics key-value pairs
 */
export function emitMetrics(kvps) {
  const output = adapterConfig.output;

  logInfo(LOG_PREFIX + 'emitting metrics via ' + output + ':', kvps);

  switch (output) {
    case 'gtag':
      if (typeof window.gtag === 'function') {
        window.gtag('event', 'vai_auction', kvps);
      } else {
        logWarn(LOG_PREFIX + 'gtag not found on window — metrics not sent');
      }
      break;

    case 'dataLayer':
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push(Object.assign({ event: 'vai_auction' }, kvps));
      break;

    case 'callback':
      if (typeof adapterConfig.callback === 'function') {
        try {
          adapterConfig.callback(kvps);
        } catch (e) {
          logWarn(LOG_PREFIX + 'callback error:', e);
        }
      } else {
        logWarn(LOG_PREFIX + 'output is "callback" but no callback function provided');
      }
      break;

    default:
      logWarn(LOG_PREFIX + 'unknown output mode: ' + output);
  }
}

// ---------------------------------------------------------------------------
// Event tracking
// ---------------------------------------------------------------------------

/**
 * Handle a tracked Prebid event.
 * We only care about AUCTION_END — emit classification once per auction.
 * @param {{ eventType: string, args: object }} param
 */
function handleEvent({ eventType, args }) {
  if (!sampledIn) return;
  if (eventType !== AUCTION_END) return;

  const auctionId = args && args.auctionId;
  if (!auctionId) return;

  // De-dup: only emit once per auction
  if (emittedAuctions[auctionId]) return;
  emittedAuctions[auctionId] = true;

  const kvps = computeMetrics();
  emitMetrics(kvps);
}

// ---------------------------------------------------------------------------
// Adapter setup
// ---------------------------------------------------------------------------

const paywallsAnalytics = Object.assign(
  adapter({ analyticsType: 'bundle' }),
  {
    track: handleEvent,
  }
);

// Save original enableAnalytics
paywallsAnalytics.originEnableAnalytics = paywallsAnalytics.enableAnalytics;

/**
 * Override enableAnalytics to parse config.
 * @param {object} config
 */
paywallsAnalytics.enableAnalytics = function (config) {
  const options = (config && config.options) || {};

  // Parse config
  adapterConfig.output = options.output || 'callback';
  const rawRate = typeof options.samplingRate === 'number' ? options.samplingRate : 1.0;
  adapterConfig.samplingRate = Math.max(0, Math.min(1, rawRate));
  if (rawRate !== adapterConfig.samplingRate) {
    logWarn(LOG_PREFIX + 'samplingRate clamped to [0, 1]: ' + rawRate + ' → ' + adapterConfig.samplingRate);
  }
  adapterConfig.callback = typeof options.callback === 'function' ? options.callback : null;

  // Sampling decision
  sampledIn = Math.random() < adapterConfig.samplingRate;
  if (!sampledIn) {
    logInfo(LOG_PREFIX + 'page excluded by sampling (rate=' + adapterConfig.samplingRate + ')');
  }

  // Reset state
  emittedAuctions = Object.create(null);

  // Call original enable (wires up event listeners)
  paywallsAnalytics.originEnableAnalytics(config);
};

adapterManager.registerAnalyticsAdapter({
  adapter: paywallsAnalytics,
  code: ADAPTER_CODE,
});

/**
 * Reset internal state — used by unit tests.
 * @param {object} [overrides]
 * @param {boolean} [overrides.sampledIn]
 */
export function resetForTesting(overrides) {
  emittedAuctions = Object.create(null);
  sampledIn = true;
  adapterConfig.output = 'callback';
  adapterConfig.samplingRate = 1.0;
  adapterConfig.callback = null;
  if (overrides) {
    if (typeof overrides.sampledIn === 'boolean') {
      sampledIn = overrides.sampledIn;
    }
  }
}

export default paywallsAnalytics;
