/**
 * Microsoft Clarity RTD Module
 *
 * This RTD submodule collects behavioral signals from the user's session and
 * writes them into per-bidder ORTB2 fragments.  Signals are only distributed
 * to commercially approved bidders.
 *
 * Signal collection uses a lightweight self-contained DOM tracker that starts
 * on init().  The Clarity JS tag is still injected for its own analytics /
 * session-recording functionality, but signals for bid-enrichment are computed
 * independently from DOM events (scroll, clicks, focus, etc.).
 *
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

// ─── Self-Contained Behavioral Tracker ────────────────────────────────────────
// Computes scroll-depth, active-time, rage-clicks, dead-clicks, scroll-velocity,
// and a composite engagement-score from DOM events.  Does NOT depend on any
// external SDK or `clarity("get", ...)` API.

const _tracker = {
  scrollDepth: 0,          // 0-1, high-water-mark
  activeTimeMs: 0,         // ms of active engagement
  rageClickCount: 0,       // 3+ clicks within 500ms in ≤30 px radius
  deadClickCount: 0,       // clicks on non-interactive elements
  totalClicks: 0,
  scrollVelocity: 'none',  // 'slow' | 'medium' | 'fast' | 'none'
  interactionDensity: 0,   // interactions per second of active time
  _totalInteractions: 0,
  _lastActivity: 0,
  _clickHistory: [],       // { time, x, y, target }
  _scrollSamples: [],      // { time, y } — last 2 s for velocity
  _activeTimer: null,
  _initialized: false,
};

/** Idle threshold — if no activity for this long, stop counting active time. */
const IDLE_MS = 30_000;

/** Tags considered interactive for dead-click detection. */
const INTERACTIVE_TAGS = new Set(['a', 'button', 'input', 'select', 'textarea', 'label', 'summary', 'video', 'audio']);

/**
 * Start the behavioral tracker.  Safe to call multiple times — only the
 * first invocation attaches event listeners.
 */
function initTracker() {
  if (_tracker._initialized) return;
  _tracker._initialized = true;
  _tracker._lastActivity = Date.now();

  // ── Scroll depth (high-water-mark) + velocity samples ──────────────────
  const onScroll = () => {
    const now = Date.now();
    markActive(now);

    const scrollTop = window.scrollY || window.pageYOffset || 0;
    const docHeight = Math.max(
      document.body.scrollHeight || 0,
      document.documentElement.scrollHeight || 0
    ) - window.innerHeight;

    if (docHeight > 0) {
      _tracker.scrollDepth = Math.max(_tracker.scrollDepth, Math.min(1, scrollTop / docHeight));
    }

    // Keep last 2 s of scroll samples for velocity
    _tracker._scrollSamples.push({ time: now, y: scrollTop });
    _tracker._scrollSamples = _tracker._scrollSamples.filter(s => now - s.time < 2000);

    if (_tracker._scrollSamples.length >= 2) {
      const first = _tracker._scrollSamples[0];
      const last = _tracker._scrollSamples[_tracker._scrollSamples.length - 1];
      const dt = (last.time - first.time) / 1000; // seconds
      if (dt > 0) {
        const pxPerSec = Math.abs(last.y - first.y) / dt;
        if (pxPerSec < 200) _tracker.scrollVelocity = 'slow';
        else if (pxPerSec < 800) _tracker.scrollVelocity = 'medium';
        else _tracker.scrollVelocity = 'fast';
      }
    }
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll(); // seed initial depth

  // ── Active time — 1 s tick, only while user is active ──────────────────
  function markActive(now) {
    _tracker._lastActivity = now || Date.now();
    _tracker._totalInteractions++;
  }

  ['mousemove', 'keydown', 'touchstart', 'pointerdown'].forEach(evt => {
    window.addEventListener(evt, () => markActive(), { passive: true });
  });

  _tracker._activeTimer = setInterval(() => {
    if (Date.now() - _tracker._lastActivity < IDLE_MS) {
      _tracker.activeTimeMs += 1000;
    }
    // Update interaction density
    if (_tracker.activeTimeMs > 0) {
      _tracker.interactionDensity = _tracker._totalInteractions / (_tracker.activeTimeMs / 1000);
    }
  }, 1000);

  // ── Click tracking — rage-clicks & dead-clicks ─────────────────────────
  window.addEventListener('click', (e) => {
    const now = Date.now();
    markActive(now);
    _tracker.totalClicks++;

    const x = e.clientX;
    const y = e.clientY;
    _tracker._clickHistory.push({ time: now, x, y });

    // Keep only last 2 s
    _tracker._clickHistory = _tracker._clickHistory.filter(c => now - c.time < 2000);

    // Rage click: ≥ 3 clicks within 500 ms in a ≤ 30 px radius
    const recent = _tracker._clickHistory.filter(c =>
      now - c.time < 500 &&
      Math.abs(c.x - x) < 30 &&
      Math.abs(c.y - y) < 30
    );
    if (recent.length >= 3) {
      _tracker.rageClickCount++;
    }

    // Dead click: non-interactive element
    const tag = (e.target.tagName || '').toLowerCase();
    const isInteractive = INTERACTIVE_TAGS.has(tag) ||
      e.target.getAttribute('role') === 'button' ||
      e.target.getAttribute('role') === 'link' ||
      e.target.hasAttribute('onclick') ||
      e.target.closest('a, button, [role="button"], [role="link"]');

    if (!isInteractive) {
      _tracker.deadClickCount++;
    }
  });

  logInfo(`${LOG_PREFIX} Behavioral signal tracker started.`);
}

/**
 * Read the current tracker state into a signals object matching the module's
 * signal schema.  This replaces the old `collectSignals` / `clarityGet` path.
 *
 * @param {string[]} requestedSignals
 * @returns {Object} signals
 */
function collectSignals(requestedSignals) {
  const signals = {};
  const req = new Set(requestedSignals);

  if (req.has('scroll_depth')) {
    signals.scroll_depth = Math.round(_tracker.scrollDepth * 1000) / 1000; // 3 dp
  }

  if (req.has('active_time')) {
    signals.active_time_ms = _tracker.activeTimeMs;
  }

  if (req.has('frustration')) {
    signals.rage_click_count = _tracker.rageClickCount;
    signals.dead_click_count = _tracker.deadClickCount;
  }

  if (req.has('interaction_density')) {
    signals.interaction_density = Math.round(_tracker.interactionDensity * 100) / 100;
  }

  if (req.has('scroll_velocity') && _tracker.scrollVelocity !== 'none') {
    signals.scroll_velocity = _tracker.scrollVelocity;
  }

  if (req.has('engagement_score')) {
    // Composite: weighted blend of scroll, time, interaction, and frustration
    const scrollW = _tracker.scrollDepth * 0.30;
    const timeW = Math.min(1, _tracker.activeTimeMs / 60000) * 0.35;
    const interW = Math.min(1, _tracker.totalClicks / 20) * 0.20;
    const frustW = _tracker.rageClickCount === 0 ? 0.15 : 0;
    signals.engagement_score = Math.round(Math.min(1, scrollW + timeW + interW + frustW) * 1000) / 1000;
  }

  return signals;
}

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
 * Inject the Microsoft Clarity bootstrap snippet into the page.
 * Clarity is injected for its own analytics / session-recording; signal
 * collection for bid-enrichment is handled by the self-contained tracker.
 *
 * @param {string} projectId - Clarity project identifier
 */
function injectClarityScript(projectId) {
  try {
    (function (c, l, a, r, i, t, y) {
      c[a] = c[a] || function () { (c[a].q = c[a].q || []).push(arguments); };
      t = l.createElement(r); t.async = 1;
      t.src = 'https://www.clarity.ms/tag/' + i;
      y = l.getElementsByTagName(r)[0]; y.parentNode.insertBefore(t, y);
    })(window, document, 'clarity', 'script', projectId);
    logInfo(`${LOG_PREFIX} Injected Clarity tag for project ${projectId}.`);
  } catch (e) {
    logError(`${LOG_PREFIX} Failed to inject Clarity tag:`, e);
  }
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

  // Inject Clarity for its own analytics / session-recording.
  if (!isClarityPresent()) {
    logInfo(`${LOG_PREFIX} Clarity JS tag not found — injecting automatically for project ${projectId}.`);
    injectClarityScript(projectId);
  }

  const bidders = getEffectiveBidders(config);
  if (bidders.length === 0) {
    logWarn(`${LOG_PREFIX} No approved bidders configured. Module disabled.`);
    return false;
  }

  // Start the self-contained behavioral tracker.
  initTracker();

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
