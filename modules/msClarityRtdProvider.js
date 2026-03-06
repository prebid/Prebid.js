/**
 * Microsoft Clarity RTD Module
 *
 * Collects behavioral signals from a self-contained DOM tracker and writes
 * bucketed features into per-bidder ORTB2 fragments.  Signals are only
 * distributed to commercially approved bidders (currently AppNexus / Xandr
 * and the Microsoft Bid Adapter).
 *
 * The Clarity JS tag is auto-injected for its own analytics / session-recording
 * functionality, but bid-enrichment signals are computed independently from
 * DOM events (scroll, click, keydown, visibility changes).
 *
 * See: https://clarity.microsoft.com
 *
 * @module modules/msClarityRtdProvider
 * @requires module:modules/realTimeData
 */

import { submodule } from '../src/hook.js';
import { logInfo, logWarn, logError, deepSetValue, deepAccess, getWinDimensions } from '../src/utils.js';
import { getGlobal } from '../src/prebidGlobal.js';

/**
 * @typedef {import('../modules/rtdModule/index.js').RtdSubmodule} RtdSubmodule
 */

const MODULE_NAME = 'msClarity';
const LOG_PREFIX = '[MsClarity RTD]';

/**
 * Commercially approved bidders.  Only these bidders receive Clarity signals
 * in their ORTB2 fragments.  Adding a bidder here represents a commercial
 * agreement with Microsoft Clarity.
 */
const APPROVED_BIDDERS = Object.freeze(['appnexus', 'msft']);

/**
 * Default configuration values.
 */
const DEFAULTS = Object.freeze({
  targetingPrefix: 'msc',
});

/** Idle threshold — stop counting active time after this gap. */
const IDLE_MS = 10000;

/** CSS selector for interactive elements (dead-click detection). */
const INTERACTIVE_SELECTOR =
  'a, button, input, select, textarea, label, summary, video, audio, ' +
  '[role="button"], [role="link"], [onclick]';

// ─── Bucket Functions (exported for testability) ─────────────────────────────

/**
 * Bucket raw scroll depth (0–1) into a categorical label.
 *
 * @param {number} depth - 0 to 1
 * @returns {string}
 */
export function scrollBucket(depth) {
  if (depth <= 0) return 'none';
  if (depth < 0.25) return 'shallow';
  if (depth < 0.50) return 'mid';
  if (depth < 0.75) return 'deep';
  return 'complete';
}

/**
 * Bucket active dwell time into a categorical label.
 *
 * @param {number} ms - active time in milliseconds
 * @returns {string}
 */
export function dwellBucket(ms) {
  if (ms < 5000) return 'bounce';
  if (ms < 15000) return 'brief';
  if (ms < 30000) return 'moderate';
  if (ms < 60000) return 'long';
  return 'extended';
}

/**
 * Bucket frustration signals (rage + dead clicks) into a categorical label.
 *
 * @param {number} rageClicks
 * @param {number} deadClicks
 * @returns {string}
 */
export function frustrationBucket(rageClicks, deadClicks) {
  const total = rageClicks + deadClicks;
  if (total === 0) return 'none';
  if (total <= 2) return 'mild';
  if (total <= 5) return 'moderate';
  return 'severe';
}

/**
 * Bucket interaction rate (events per second of active time).
 *
 * @param {number} count  - interaction events
 * @param {number} activeMs - active time in ms
 * @returns {string}
 */
export function interactionBucket(count, activeMs) {
  if (activeMs <= 0 || count <= 0) return 'passive';
  const perSec = count / (activeMs / 1000);
  if (perSec < 0.2) return 'light';
  if (perSec < 0.5) return 'moderate';
  if (perSec < 1.0) return 'active';
  return 'intense';
}

/**
 * Bucket scroll behaviour pattern based on direction changes and distance.
 *
 * @param {number} directionChanges
 * @param {number} totalDistance - total pixels scrolled
 * @returns {string}
 */
export function scrollPatternBucket(directionChanges, totalDistance) {
  if (totalDistance <= 0) return 'none';
  const ratio = directionChanges / (totalDistance / 1000);
  if (ratio < 0.5) return 'scanning';
  if (ratio < 2.0) return 'reading';
  return 'searching';
}

/**
 * Bucket user journey stage based on time, scroll depth, and interactions.
 *
 * @param {number} activeMs
 * @param {number} scrollDepth - 0 to 1
 * @param {number} interactions
 * @returns {string}
 */
export function stageBucket(activeMs, scrollDepth, interactions) {
  if (activeMs < 5000 && scrollDepth < 0.1) return 'landing';
  if (activeMs < 15000 || scrollDepth < 0.3) return 'exploring';
  if (interactions < 10) return 'engaged';
  return 'converting';
}

/**
 * Composite engagement bucket.  Weighted blend of scroll, time, interaction,
 * minus a frustration penalty.
 *
 * @param {number} scrollDepth  - 0 to 1
 * @param {number} activeMs
 * @param {number} interactions
 * @param {number} rageClicks
 * @param {number} deadClicks
 * @returns {string}
 */
export function engagementBucket(scrollDepth, activeMs, interactions, rageClicks, deadClicks) {
  const scrollW = Math.min(1, scrollDepth) * 0.30;
  const timeW = Math.min(1, activeMs / 60000) * 0.35;
  const interW = Math.min(1, interactions / 20) * 0.20;
  const frustPenalty = Math.min(0.15, (rageClicks + deadClicks) * 0.03);
  const score = Math.max(0, Math.min(1, scrollW + timeW + interW + 0.15 - frustPenalty));

  if (score < 0.25) return 'low';
  if (score < 0.50) return 'medium';
  if (score < 0.75) return 'high';
  return 'very_high';
}

// ─── Self-Contained Behavioral Tracker ───────────────────────────────────────

const _tracker = {
  scrollDepth: 0,
  activeTimeMs: 0,
  rageClickCount: 0,
  deadClickCount: 0,
  totalClicks: 0,
  totalInteractions: 0,
  directionChanges: 0,
  totalScrollDistance: 0,
  _lastActivity: 0,
  _lastScrollY: 0,
  _lastScrollDir: 0,
  _lastRageBurstTime: 0,
  _clickHistory: [],
  _activeTimer: null,
  _tabHidden: false,
  _listeners: [],
  _initialized: false,
};

/**
 * Helper — register a listener and remember it for cleanup.
 */
function _addListener(target, event, handler, options) {
  target.addEventListener(event, handler, options);
  _tracker._listeners.push({ target, event, handler });
}

/**
 * Reset tracker to initial state, remove event listeners and intervals.
 * Exported for test isolation (called automatically by init()).
 */
export function resetTracker() {
  if (_tracker._activeTimer) {
    clearInterval(_tracker._activeTimer);
  }
  _tracker._listeners.forEach(({ target, event, handler }) => {
    target.removeEventListener(event, handler);
  });
  _tracker.scrollDepth = 0;
  _tracker.activeTimeMs = 0;
  _tracker.rageClickCount = 0;
  _tracker.deadClickCount = 0;
  _tracker.totalClicks = 0;
  _tracker.totalInteractions = 0;
  _tracker.directionChanges = 0;
  _tracker.totalScrollDistance = 0;
  _tracker._lastActivity = 0;
  _tracker._lastScrollY = 0;
  _tracker._lastScrollDir = 0;
  _tracker._lastRageBurstTime = 0;
  _tracker._clickHistory = [];
  _tracker._activeTimer = null;
  _tracker._tabHidden = false;
  _tracker._listeners = [];
  _tracker._initialized = false;
}

/**
 * Start the behavioral tracker.  Attaches scroll, click, keydown,
 * touchstart, pointerdown, and visibilitychange listeners.
 * Safe to call after resetTracker() to re-initialise.
 */
function initTracker() {
  if (_tracker._initialized) return;
  _tracker._initialized = true;
  _tracker._lastActivity = Date.now();
  _tracker._lastScrollY = window.scrollY || 0;

  function markActive(now) {
    _tracker._lastActivity = now || Date.now();
    _tracker.totalInteractions++;
  }

  // ── Visibility tracking ─────────────────────────────────────────────────
  _addListener(document, 'visibilitychange', () => {
    _tracker._tabHidden = document.hidden;
  });

  // ── Scroll tracking (depth + direction changes + distance) ──────────────
  const onScroll = () => {
    const now = Date.now();
    markActive(now);

    const scrollTop = window.scrollY || window.pageYOffset || 0;
    const winDim = getWinDimensions();
    const docHeight = Math.max(
      document.body.scrollHeight || 0,
      document.documentElement.scrollHeight || 0
    ) - (winDim.innerHeight || 0);

    if (docHeight > 0) {
      _tracker.scrollDepth = Math.max(
        _tracker.scrollDepth,
        Math.min(1, scrollTop / docHeight)
      );
    }

    // Direction changes + total distance
    const delta = scrollTop - _tracker._lastScrollY;
    _tracker.totalScrollDistance += Math.abs(delta);

    const dir = delta > 0 ? 1 : (delta < 0 ? -1 : 0);
    if (dir !== 0 && _tracker._lastScrollDir !== 0 && dir !== _tracker._lastScrollDir) {
      _tracker.directionChanges++;
    }
    if (dir !== 0) _tracker._lastScrollDir = dir;
    _tracker._lastScrollY = scrollTop;
  };
  _addListener(window, 'scroll', onScroll, { passive: true });

  // ── Active time — 1 s tick, visibility-aware, idle-gated ───────────────
  // No mousemove — it fires too frequently and inflates interaction count.
  ['keydown', 'touchstart', 'pointerdown'].forEach(evt => {
    _addListener(window, evt, () => markActive(), { passive: true });
  });

  _tracker._activeTimer = setInterval(() => {
    if (!_tracker._tabHidden && Date.now() - _tracker._lastActivity < IDLE_MS) {
      _tracker.activeTimeMs += 1000;
    }
  }, 1000);

  // ── Click tracking — rage-clicks (deduplicated) & dead-clicks ──────────
  _addListener(window, 'click', (e) => {
    const now = Date.now();
    markActive(now);
    _tracker.totalClicks++;

    const x = e.clientX;
    const y = e.clientY;
    _tracker._clickHistory.push({ time: now, x, y });

    // Prune to last 2 seconds
    _tracker._clickHistory = _tracker._clickHistory.filter(c => now - c.time < 2000);

    // Rage click: ≥ 3 clicks in 500 ms within 30 px — deduplicated per burst
    const recent = _tracker._clickHistory.filter(c =>
      now - c.time < 500 &&
      Math.abs(c.x - x) < 30 &&
      Math.abs(c.y - y) < 30
    );
    if (recent.length >= 3 && (now - _tracker._lastRageBurstTime > 500)) {
      _tracker.rageClickCount++;
      _tracker._lastRageBurstTime = now;
    }

    // Dead click: target not inside any interactive element
    if (e.target && !e.target.closest(INTERACTIVE_SELECTOR)) {
      _tracker.deadClickCount++;
    }
  });

  logInfo(`${LOG_PREFIX} Behavioral tracker started.`);
}

// ─── Feature Builder ─────────────────────────────────────────────────────────

/**
 * Build the 7 bucketed features from current tracker state.
 * Exported for testability.
 *
 * @returns {Object} features
 */
export function buildFeatures() {
  return {
    scroll: scrollBucket(_tracker.scrollDepth),
    dwell: dwellBucket(_tracker.activeTimeMs),
    engagement: engagementBucket(
      _tracker.scrollDepth,
      _tracker.activeTimeMs,
      _tracker.totalInteractions,
      _tracker.rageClickCount,
      _tracker.deadClickCount
    ),
    frustration: frustrationBucket(_tracker.rageClickCount, _tracker.deadClickCount),
    interaction: interactionBucket(_tracker.totalInteractions, _tracker.activeTimeMs),
    scroll_pattern: scrollPatternBucket(_tracker.directionChanges, _tracker.totalScrollDistance),
    stage: stageBucket(_tracker.activeTimeMs, _tracker.scrollDepth, _tracker.totalInteractions),
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Resolve the effective bidder list as the intersection of APPROVED_BIDDERS
 * and the publisher-configured bidders.
 *
 * @param {Object} config
 * @returns {string[]}
 */
function getEffectiveBidders(config) {
  const requested = deepAccess(config, 'params.bidders') || [...APPROVED_BIDDERS];
  const effective = requested.filter(b => APPROVED_BIDDERS.includes(b));
  const rejected = requested.filter(b => !APPROVED_BIDDERS.includes(b));

  if (rejected.length > 0) {
    logWarn(
      `${LOG_PREFIX} Bidders not approved for Clarity signals (ignored): ${rejected.join(', ')}. ` +
      'Contact Microsoft Clarity for commercial access.'
    );
  }

  return effective;
}

/**
 * Check whether the Clarity JS tag is present on the page.
 * @returns {boolean}
 */
function isClarityPresent() {
  return typeof window.clarity === 'function';
}

/**
 * Inject the Microsoft Clarity bootstrap snippet.
 *
 * @param {string} projectId
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
 * Build keyword string from bucketed features for site.keywords.
 *
 * @param {Object} features
 * @param {string} prefix
 * @returns {string} comma-separated keywords
 */
function buildKeywords(features, prefix) {
  const kws = [];

  kws.push(`${prefix}_scroll=${features.scroll}`);
  kws.push(`${prefix}_dwell=${features.dwell}`);
  kws.push(`${prefix}_engagement=${features.engagement}`);
  kws.push(`${prefix}_interaction=${features.interaction}`);
  kws.push(`${prefix}_stage=${features.stage}`);

  // Only include non-default values to reduce noise
  if (features.frustration !== 'none') {
    kws.push(`${prefix}_frustration=${features.frustration}`);
  }
  if (features.scroll_pattern !== 'none') {
    kws.push(`${prefix}_scroll_pattern=${features.scroll_pattern}`);
  }

  return kws.join(',');
}

// ─── RTD Submodule Interface ─────────────────────────────────────────────────

/**
 * Module init — validates config, injects Clarity, starts tracker.
 *
 * @param {Object} config
 * @param {Object} userConsent
 * @returns {boolean}
 */
function init(config, userConsent) {
  resetTracker();

  const projectId = deepAccess(config, 'params.projectId');
  if (!projectId) {
    logWarn(`${LOG_PREFIX} params.projectId is required. Get your project ID from https://clarity.microsoft.com`);
    return false;
  }

  if (!isClarityPresent()) {
    logInfo(`${LOG_PREFIX} Clarity not found — injecting for project ${projectId}.`);
    injectClarityScript(projectId);
  }

  const bidders = getEffectiveBidders(config);
  if (bidders.length === 0) {
    logWarn(`${LOG_PREFIX} No approved bidders configured. Module disabled.`);
    return false;
  }

  initTracker();

  logInfo(`${LOG_PREFIX} Initialized for project ${projectId}, bidders: ${bidders.join(', ')}`);
  return true;
}

/**
 * Pre-auction enrichment — builds bucketed features and writes them into
 * per-bidder ORTB2 fragments only for approved bidders.
 *
 * @param {Object}   reqBidsConfigObj
 * @param {function} callback
 * @param {Object}   config
 * @param {Object}   userConsent
 */
function getBidRequestData(reqBidsConfigObj, callback, config, userConsent) {
  try {
    const prefix = deepAccess(config, 'params.targetingPrefix') || DEFAULTS.targetingPrefix;
    const bidders = getEffectiveBidders(config);
    const features = buildFeatures();
    const keywords = buildKeywords(features, prefix);

    reqBidsConfigObj.ortb2Fragments = reqBidsConfigObj.ortb2Fragments || {};
    reqBidsConfigObj.ortb2Fragments.bidder = reqBidsConfigObj.ortb2Fragments.bidder || {};

    bidders.forEach(bidder => {
      // Site-level: all bucketed features
      deepSetValue(
        reqBidsConfigObj,
        `ortb2Fragments.bidder.${bidder}.site.ext.data.msclarity`,
        { ...features }
      );

      // User-level: engagement summary
      deepSetValue(
        reqBidsConfigObj,
        `ortb2Fragments.bidder.${bidder}.user.ext.data.msclarity`,
        { engagement: features.engagement }
      );

      // Keywords for adapters that consume site.keywords (e.g., AppNexus)
      if (keywords) {
        const existing = deepAccess(
          reqBidsConfigObj,
          `ortb2Fragments.bidder.${bidder}.site.keywords`
        ) || '';
        const merged = existing ? `${existing},${keywords}` : keywords;
        deepSetValue(
          reqBidsConfigObj,
          `ortb2Fragments.bidder.${bidder}.site.keywords`,
          merged
        );
      }
    });

    // Impression-level: enrich ad units that have approved bidder bids
    const adUnits = reqBidsConfigObj.adUnits || getGlobal().adUnits || [];
    const bidderSet = new Set(bidders);

    adUnits.forEach(adUnit => {
      const hasBid = (adUnit.bids || []).some(bid => bidderSet.has(bid.bidder));
      if (!hasBid) return;

      adUnit.ortb2Imp = adUnit.ortb2Imp || {};
      deepSetValue(adUnit, 'ortb2Imp.ext.data.msclarity', {
        scroll: features.scroll,
        engagement: features.engagement,
      });
    });

    logInfo(`${LOG_PREFIX} Enriched ${bidders.length} bidder(s) with 7 features.`);
  } catch (e) {
    logError(`${LOG_PREFIX} Error enriching bid requests:`, e);
  }

  callback();
}

/** @type {RtdSubmodule} */
export const msClaritySubmodule = {
  name: MODULE_NAME,
  init,
  getBidRequestData,
};

submodule('realTimeData', msClaritySubmodule);
