/**
 * Microsoft Clarity RTD Module
 *
 * This RTD submodule reads behavioral signals from an active Microsoft Clarity
 * session on the page and writes them into per-bidder ORTB2 fragments.
 * Signals are only distributed to commercially approved bidders.
 *
 * Requires: an active Clarity JS tag on the page (window.clarity).
 * See: https://clarity.microsoft.com
 *
 * @module modules/msClarityRtdProvider
 * @requires module:modules/realTimeData
 */

import { submodule } from '../src/hook.js';
import { logInfo, logWarn, logError, deepSetValue, mergeDeep, deepAccess } from '../src/utils.js';
import { getGlobal } from '../src/prebidGlobal.js';

/**
 * @typedef {import('../modules/rtdModule/index.js').RtdSubmodule} RtdSubmodule
 */

const MODULE_NAME = 'msClarity';
const LOG_PREFIX = '[MsClarity RTD]';

/**
 * Commercially approved bidders. Only these bidders will receive Clarity signals
 * in their ORTB2 fragments. Adding a new bidder here represents a commercial
 * agreement with Microsoft Clarity.
 */
const APPROVED_BIDDERS = Object.freeze(['appnexus']);

/**
 * Default configuration values.
 */
const DEFAULTS = {
  signals: [
    'scroll_depth',
    'active_time',
    'frustration',
    'interaction_density',
    'scroll_velocity',
    'exit_probability',
    'engagement_score'
  ],
  engagementScoreThresholds: { low: 0.3, medium: 0.6, high: 0.8 },
  targetingPrefix: 'msc',
  waitForSignalsMs: 50,
};

/**
 * Internal state snapshot — refreshed once per auction cycle.
 */
let _lastSignals = null;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Resolves the effective bidder list as the intersection of APPROVED_BIDDERS
 * and the publisher-configured bidders. If the publisher lists a bidder that
 * is not approved, a warning is logged and it is silently removed.
 *
 * @param {Object} config - module config
 * @returns {string[]} effective bidder list
 */
function getEffectiveBidders(config) {
  const requested = deepAccess(config, 'params.bidders') || [...APPROVED_BIDDERS];
  const effective = requested.filter(b => APPROVED_BIDDERS.includes(b));
  const rejected = requested.filter(b => !APPROVED_BIDDERS.includes(b));

  if (rejected.length > 0) {
    logWarn(`${LOG_PREFIX} Bidders not approved for Clarity signals (ignored): ${rejected.join(', ')}. ` +
      `Contact Microsoft Clarity for commercial access.`);
  }

  return effective;
}

/**
 * Check whether the Clarity JS tag is present on the page (stub or full SDK).
 * @returns {boolean}
 */
function isClarityPresent() {
  return typeof window.clarity === 'function';
}

/**
 * Check whether the full Clarity SDK has loaded and replaced the queue stub.
 * The stub sets `window.clarity.q` as the command queue; once the real SDK
 * initialises it removes `.q` and takes over.  Only the live SDK can handle
 * the "get" command — calling it on the stub would queue the request and
 * crash when the SDK later tries to replay it.
 *
 * @returns {boolean}
 */
function isClarityReady() {
  return isClarityPresent() && !window.clarity.q;
}

/**
 * Inject the Microsoft Clarity bootstrap snippet into the page.
 * This creates the queue stub (`window.clarity`) immediately so that
 * `isClarityPresent()` returns `true` right away. The real Clarity JS
 * loads asynchronously; signals become available once it initialises.
 *
 * @param {string} projectId - Clarity project identifier
 */
function injectClarityScript(projectId) {
  try {
    (function (c, l, a, r, i, t, y) {
      c[a] = c[a] || function () {
        // "get" requires the live SDK — call the callback with undefined
        // and do NOT push to the queue (replaying "get" crashes the SDK).
        if (arguments[0] === 'get') {
          if (typeof arguments[2] === 'function') { arguments[2](undefined); }
          return;
        }
        (c[a].q = c[a].q || []).push(arguments);
      };
      t = l.createElement(r); t.async = 1;
      t.src = 'https://www.clarity.ms/tag/' + i;
      y = l.getElementsByTagName(r)[0]; y.parentNode.insertBefore(t, y);
    })(window, document, 'clarity', 'script', projectId);
    logInfo(`${LOG_PREFIX} Injected Clarity tag for project ${projectId}.`);
  } catch (e) {
    logError(`${LOG_PREFIX} Failed to inject Clarity tag:`, e);
  }
}

// ─── Signal Collection ────────────────────────────────────────────────────────

/**
 * Reads a Clarity API value via the "get" command.
 * Returns undefined if the API is unavailable or the key is missing.
 *
 * @param {string} key
 * @returns {*} value or undefined
 */
function clarityGet(key) {
  try {
    // Clarity's public JS API supports: clarity("get", key)
    // Returns synchronously for locally cached metrics.
    let result;
    window.clarity('get', key, (val) => { result = val; });
    return result;
  } catch (e) {
    return undefined;
  }
}

/**
 * Collect all available behavioral signals from the Clarity session.
 * Signals that are unavailable are omitted from the returned object.
 *
 * @param {string[]} requestedSignals - signal names the publisher opted into
 * @returns {Object} signals
 */
function collectSignals(requestedSignals) {
  const signals = {};
  const requestedSet = new Set(requestedSignals);

  // ── Tier 1: Extremely Valuable ───────────────────────────────────────────

  if (requestedSet.has('scroll_depth')) {
    const sd = clarityGet('scroll-depth');
    if (sd != null) {
      signals.scroll_depth = Math.min(1, Math.max(0, Number(sd)));
    }
  }

  if (requestedSet.has('active_time')) {
    const at = clarityGet('active-time');
    if (at != null) {
      signals.active_time_ms = Math.round(Number(at));
    }
  }

  if (requestedSet.has('frustration')) {
    const rc = clarityGet('rage-click-count');
    const dc = clarityGet('dead-click-count');
    if (rc != null) signals.rage_click_count = Number(rc);
    if (dc != null) signals.dead_click_count = Number(dc);
  }

  if (requestedSet.has('interaction_density')) {
    const id = clarityGet('interaction-density');
    if (id != null) {
      signals.interaction_density = Number(id);
    }
  }

  // ── Tier 2: Very Valuable ────────────────────────────────────────────────

  if (requestedSet.has('scroll_velocity')) {
    const sv = clarityGet('scroll-velocity');
    if (sv != null) {
      signals.scroll_velocity = String(sv); // 'slow' | 'medium' | 'fast'
    }
  }

  if (requestedSet.has('exit_probability')) {
    const ep = clarityGet('exit-probability');
    if (ep != null) {
      signals.exit_probability = Math.min(1, Math.max(0, Number(ep)));
    }
  }

  // ── Tier 3: Composite ───────────────────────────────────────────────────

  if (requestedSet.has('engagement_score')) {
    const es = clarityGet('engagement-score');
    if (es != null) {
      signals.engagement_score = Math.min(1, Math.max(0, Number(es)));
    }
  }

  return signals;
}

/**
 * Compute bucketed engagement label from raw engagement score.
 *
 * @param {number} score - 0 to 1
 * @param {Object} thresholds - { low, medium, high }
 * @returns {string} 'low' | 'medium' | 'high' | 'very_high'
 */
function engagementBucket(score, thresholds) {
  if (score == null) return undefined;
  if (score < thresholds.low) return 'low';
  if (score < thresholds.medium) return 'medium';
  if (score < thresholds.high) return 'high';
  return 'very_high';
}

/**
 * Build keyword string for adapters that consume site.keywords.
 *
 * @param {Object} signals
 * @param {string} prefix
 * @param {Object} thresholds
 * @returns {string} comma-separated keywords
 */
function buildKeywords(signals, prefix, thresholds) {
  const kws = [];

  if (signals.scroll_depth != null) {
    const depth = signals.scroll_depth >= 0.5 ? 'deep' : 'shallow';
    kws.push(`${prefix}_scroll=${depth}`);
  }

  if (signals.active_time_ms != null) {
    const engaged = signals.active_time_ms >= 10000;
    kws.push(`${prefix}_engaged=${engaged}`);
  }

  if (signals.rage_click_count != null && signals.rage_click_count > 0) {
    kws.push(`${prefix}_frustrated=true`);
  }

  if (signals.engagement_score != null) {
    const bucket = engagementBucket(signals.engagement_score, thresholds);
    if (bucket) kws.push(`${prefix}_engagement=${bucket}`);
  }

  if (signals.scroll_velocity != null) {
    kws.push(`${prefix}_velocity=${signals.scroll_velocity}`);
  }

  return kws.join(',');
}

// ─── RTD Submodule Interface ──────────────────────────────────────────────────

/**
 * Module init — called once when the publisher config is loaded.
 * Returns true if Clarity is detected and config is valid.
 *
 * @param {Object} config
 * @param {Object} userConsent
 * @returns {boolean}
 */
function init(config, userConsent) {
  _lastSignals = null;

  const projectId = deepAccess(config, 'params.projectId');
  if (!projectId) {
    logWarn(`${LOG_PREFIX} params.projectId is required. Get your project ID from https://clarity.microsoft.com`);
    return false;
  }

  if (!isClarityPresent()) {
    logInfo(`${LOG_PREFIX} Clarity JS tag not found — injecting automatically for project ${projectId}.`);
    injectClarityScript(projectId);
  }

  if (!isClarityPresent()) {
    logWarn(`${LOG_PREFIX} Failed to bootstrap Clarity. Module disabled.`);
    return false;
  }

  const bidders = getEffectiveBidders(config);
  if (bidders.length === 0) {
    logWarn(`${LOG_PREFIX} No approved bidders configured. Module disabled.`);
    return false;
  }

  logInfo(`${LOG_PREFIX} Initialized for project ${projectId}, bidders: ${bidders.join(', ')}`);
  return true;
}

/**
 * Pre-auction enrichment — collects Clarity signals and writes them into
 * per-bidder ORTB2 fragments only for approved bidders.
 *
 * @param {Object} reqBidsConfigObj
 * @param {function} callback
 * @param {Object} config
 * @param {Object} userConsent
 */
function getBidRequestData(reqBidsConfigObj, callback, config, userConsent) {
  try {
    if (!isClarityReady()) {
      if (isClarityPresent()) {
        logInfo(`${LOG_PREFIX} Clarity stub present but SDK still loading — skipping signal collection for this auction.`);
      }
      callback();
      return;
    }

    const params = mergeDeep({}, DEFAULTS, config.params || {});
    // mergeDeep concatenates arrays — if publisher explicitly set signals, honour their list
    if (config.params && Array.isArray(config.params.signals)) {
      params.signals = [...config.params.signals];
    }
    const bidders = getEffectiveBidders(config);
    const signals = collectSignals(params.signals);

    if (Object.keys(signals).length === 0) {
      logInfo(`${LOG_PREFIX} No Clarity signals available yet.`);
      callback();
      return;
    }

    _lastSignals = signals;

    const thresholds = params.engagementScoreThresholds;
    const prefix = params.targetingPrefix;
    const keywords = buildKeywords(signals, prefix, thresholds);

    // ── Per-bidder ORTB2 fragments (gated access) ─────────────────────────
    reqBidsConfigObj.ortb2Fragments = reqBidsConfigObj.ortb2Fragments || {};
    reqBidsConfigObj.ortb2Fragments.bidder = reqBidsConfigObj.ortb2Fragments.bidder || {};

    bidders.forEach(bidder => {
      // Site-level: page behavioral context
      deepSetValue(
        reqBidsConfigObj,
        `ortb2Fragments.bidder.${bidder}.site.ext.data.msclarity`,
        { ...signals }
      );

      // User-level: engagement summary
      if (signals.engagement_score != null) {
        deepSetValue(
          reqBidsConfigObj,
          `ortb2Fragments.bidder.${bidder}.user.ext.data.msclarity`,
          {
            engagement_score: signals.engagement_score,
            engagement_bucket: engagementBucket(signals.engagement_score, thresholds)
          }
        );
      }

      // Keywords for adapters that consume site.keywords (e.g., AppNexus)
      if (keywords) {
        const existing = deepAccess(reqBidsConfigObj, `ortb2Fragments.bidder.${bidder}.site.keywords`) || '';
        const merged = existing ? `${existing},${keywords}` : keywords;
        deepSetValue(reqBidsConfigObj, `ortb2Fragments.bidder.${bidder}.site.keywords`, merged);
      }
    });

    // ── Impression-level: enrich only ad units with approved bidder bids ──
    const adUnits = reqBidsConfigObj.adUnits || getGlobal().adUnits || [];
    const bidderSet = new Set(bidders);

    adUnits.forEach(adUnit => {
      const hasBid = (adUnit.bids || []).some(bid => bidderSet.has(bid.bidder));
      if (!hasBid) return;

      adUnit.ortb2Imp = adUnit.ortb2Imp || {};
      deepSetValue(adUnit, 'ortb2Imp.ext.data.msclarity', {
        scroll_depth: signals.scroll_depth,
        engagement_score: signals.engagement_score,
      });
    });

    logInfo(`${LOG_PREFIX} Enriched ${bidders.length} bidder(s) with ${Object.keys(signals).length} signals.`);
  } catch (e) {
    logError(`${LOG_PREFIX} Error collecting Clarity signals:`, e);
  }

  callback();
}

/**
 * Ad server targeting — returns GAM key-values per ad unit.
 * Targeting is not bidder-gated (goes to the publisher's own ad server).
 *
 * @param {string[]} adUnitCodes
 * @param {Object} config
 * @param {Object} userConsent
 * @returns {Object<string, Object<string, string>>}
 */
function getTargetingData(adUnitCodes, config, userConsent) {
  if (!_lastSignals || Object.keys(_lastSignals).length === 0) {
    return {};
  }

  const params = mergeDeep({}, DEFAULTS, (config && config.params) || {});
  const prefix = params.targetingPrefix;
  const thresholds = params.engagementScoreThresholds;

  const targeting = {};

  if (_lastSignals.scroll_depth != null) {
    targeting[`${prefix}_scroll`] = _lastSignals.scroll_depth >= 0.5 ? 'deep' : 'shallow';
  }
  if (_lastSignals.active_time_ms != null) {
    targeting[`${prefix}_engaged`] = String(_lastSignals.active_time_ms >= 10000);
  }
  if (_lastSignals.engagement_score != null) {
    const bucket = engagementBucket(_lastSignals.engagement_score, thresholds);
    if (bucket) targeting[`${prefix}_engagement`] = bucket;
  }
  if (_lastSignals.rage_click_count > 0) {
    targeting[`${prefix}_frustrated`] = 'true';
  }
  if (_lastSignals.scroll_velocity) {
    targeting[`${prefix}_velocity`] = _lastSignals.scroll_velocity;
  }

  const result = {};
  adUnitCodes.forEach(code => {
    result[code] = targeting;
  });

  return result;
}

/** @type {RtdSubmodule} */
export const msClaritySubmodule = {
  name: MODULE_NAME,
  init,
  getBidRequestData,
  getTargetingData,
};

submodule('realTimeData', msClaritySubmodule);
