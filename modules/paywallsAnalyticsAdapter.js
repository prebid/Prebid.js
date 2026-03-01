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
 * @module modules/paywallsAnalyticsAdapter
 * @see https://paywalls.net/docs/publishers/vai
 */

import adapter from '../libraries/analyticsAdapter/AnalyticsAdapter.js';
import adapterManager from '../src/adapterManager.js';
import {EVENTS} from '../src/constants.js';
import {logInfo, logWarn} from '../src/utils.js';
import {loadExternalScript} from '../src/adloader.js';
import {MODULE_TYPE_ANALYTICS} from '../src/activities/modules.js';

const ADAPTER_CODE = 'paywalls';
const LOG_PREFIX = '[PaywallsAnalytics] ';

export const DEFAULT_SCRIPT_URL = '/pw/vai.js';
export const VAI_WINDOW_KEY = '__PW_VAI__';

const {AUCTION_END} = EVENTS;

// Track which auctions we've already emitted for (de-dup)
let emittedAuctions = {};

// ---------------------------------------------------------------------------
// Config (set during enableAnalytics)
// ---------------------------------------------------------------------------

export let adapterConfig = {
  output: 'callback',   // 'gtag' | 'dataLayer' | 'callback'
  scriptUrl: DEFAULT_SCRIPT_URL,
  samplingRate: 1.0,
  callback: null,
};

// Whether this page session is sampled in
let sampledIn = true;

// Whether VAI script injection has been attempted
let vaiInjected = false;

// ---------------------------------------------------------------------------
// VAI loading
// ---------------------------------------------------------------------------

/**
 * Read VAI classification from the window global.
 * @returns {{ vat: string, act: string } | null}
 */
export function getVaiClassification() {
  const vai = window[VAI_WINDOW_KEY];
  if (vai && typeof vai === 'object' && vai.vat && vai.act) {
    return {vat: vai.vat, act: vai.act};
  }
  return null;
}

/**
 * Ensure VAI is available on the page.
 * If window.__PW_VAI__ is not yet present, inject the script.
 * @param {string} scriptUrl
 */
export function ensureVai(scriptUrl) {
  if (window[VAI_WINDOW_KEY]) {
    logInfo(LOG_PREFIX + 'VAI already present. vat=' + window[VAI_WINDOW_KEY].vat);
    return;
  }
  if (vaiInjected) {
    return;
  }
  vaiInjected = true;
  logInfo(LOG_PREFIX + 'injecting vai.js from ' + scriptUrl);
  try {
    loadExternalScript(scriptUrl, MODULE_TYPE_ANALYTICS, ADAPTER_CODE);
  } catch (e) {
    logWarn(LOG_PREFIX + 'failed to load vai.js:', e);
  }
}

// ---------------------------------------------------------------------------
// Metrics computation
// ---------------------------------------------------------------------------

/**
 * Build the KVP object emitted per auction.
 * Only contains VAI classification — vat and act.
 * UNKNOWN values signal that VAI was not available (script failed to
 * load, timed out, or returned an invalid response).
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
      window.dataLayer.push(Object.assign({event: 'vai_auction'}, kvps));
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
function handleEvent({eventType, args}) {
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
  adapter({analyticsType: 'bundle'}),
  {
    track: handleEvent,
  }
);

// Save original enableAnalytics
paywallsAnalytics.originEnableAnalytics = paywallsAnalytics.enableAnalytics;

/**
 * Override enableAnalytics to parse config and inject VAI.
 * @param {object} config
 */
paywallsAnalytics.enableAnalytics = function (config) {
  const options = (config && config.options) || {};

  // Parse config
  adapterConfig.output = options.output || 'callback';
  adapterConfig.scriptUrl = options.scriptUrl || DEFAULT_SCRIPT_URL;
  adapterConfig.samplingRate = typeof options.samplingRate === 'number' ? options.samplingRate : 1.0;
  adapterConfig.callback = typeof options.callback === 'function' ? options.callback : null;

  // Sampling decision
  sampledIn = Math.random() < adapterConfig.samplingRate;
  if (!sampledIn) {
    logInfo(LOG_PREFIX + 'page excluded by sampling (rate=' + adapterConfig.samplingRate + ')');
  }

  // Reset state
  emittedAuctions = {};
  vaiInjected = false;

  // Ensure VAI is on the page
  ensureVai(adapterConfig.scriptUrl);

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
  emittedAuctions = {};
  vaiInjected = false;
  sampledIn = true;
  adapterConfig.output = 'callback';
  adapterConfig.scriptUrl = DEFAULT_SCRIPT_URL;
  adapterConfig.samplingRate = 1.0;
  adapterConfig.callback = null;
  if (overrides) {
    if (typeof overrides.sampledIn === 'boolean') {
      sampledIn = overrides.sampledIn;
    }
  }
}

export default paywallsAnalytics;
