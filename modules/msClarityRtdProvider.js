/**
 * Microsoft Clarity RTD Module
 *
 * Collects behavioral signals from a self-contained DOM tracker and writes
 * bucketed features into global ORTB2 fragments, making them available to
 * all bidders.  Signals are also published as ORTB2 user.data segments for
 * native consumption by ORTB-compatible adapters and DSP platforms like
 * Microsoft Curate.
 *
 * The Clarity JS tag can optionally be injected for its own analytics /
 * session-recording functionality (set params.injectClarity = true), but
 * bid-enrichment signals are computed independently from DOM events
 * (scroll, click, keydown, visibility changes).
 *
 * Warm-start: the module persists the latest signal snapshot to
 * localStorage so the first auction of a new page load can use stale
 * (≤ 30 min) signals instead of sending empty defaults.
 *
 * See: https://clarity.microsoft.com
 *
 * @module modules/msClarityRtdProvider
 * @requires module:modules/realTimeData
 */

import { submodule } from '../src/hook.js';
import { logInfo, logWarn, logError, deepSetValue, deepAccess, getWinDimensions } from '../src/utils.js';
import { getStorageManager } from '../src/storageManager.js';
import { MODULE_TYPE_RTD } from '../src/activities/modules.js';

/**
 * @typedef {import('../modules/rtdModule/index.js').RtdSubmodule} RtdSubmodule
 */

const MODULE_NAME = 'msClarity';
const LOG_PREFIX = '[MsClarity RTD]';

/**
 * Default configuration values.
 */
const DEFAULTS = Object.freeze({
  targetingPrefix: 'msc',
});

/** Idle threshold — stop counting active time after this gap. */
const IDLE_MS = 10000;

/** localStorage key for warm-start signal persistence. */
const STORAGE_KEY = 'msc_rtd_signals';

/** Warm-start TTL — signals older than 30 minutes are discarded. */
const STORAGE_TTL_MS = 30 * 60 * 1000;

/** Storage manager — consent-aware localStorage access. */
export const storage = getStorageManager({ moduleType: MODULE_TYPE_RTD, moduleName: MODULE_NAME });

/** CSS selector for interactive elements (unresponsive-click detection). */
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
 * Bucket frustration signals (rage + unresponsive clicks) into a categorical label.
 *
 * @param {number} rageClicks
 * @param {number} unresponsiveClicks
 * @returns {string}
 */
export function frustrationBucket(rageClicks, unresponsiveClicks) {
  const total = rageClicks + unresponsiveClicks;
  if (total === 0) return 'none';
  if (total <= 2) return 'mild';
  if (total <= 5) return 'moderate';
  return 'severe';
}

/**
 * Bucket interaction rate (deliberate events per second of active time).
 *
 * @param {number} count  - deliberate interaction events (click, keydown, touch)
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
 * Composite engagement bucket.  Weighted blend of scroll, time, interaction,
 * minus a frustration penalty.
 *
 * @param {number} scrollDepth  - 0 to 1
 * @param {number} activeMs
 * @param {number} interactions
 * @param {number} rageClicks
 * @param {number} unresponsiveClicks
 * @returns {string}
 */
export function engagementBucket(scrollDepth, activeMs, interactions, rageClicks, unresponsiveClicks) {
  const scrollW = Math.min(1, scrollDepth) * 0.30;
  const timeW = Math.min(1, activeMs / 60000) * 0.35;
  const interW = Math.min(1, interactions / 20) * 0.20;
  const frustPenalty = Math.min(0.15, (rageClicks + unresponsiveClicks) * 0.03);
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
  unresponsiveClickCount: 0,
  totalClicks: 0,
  activityCount: 0,
  interactionCount: 0,
  _lastActivity: 0,
  _lastScrollY: 0,
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
  _tracker.unresponsiveClickCount = 0;
  _tracker.totalClicks = 0;
  _tracker.activityCount = 0;
  _tracker.interactionCount = 0;
  _tracker._lastActivity = 0;
  _tracker._lastScrollY = 0;
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

  /** Increment activity counter (all DOM events). */
  function markActivity(now) {
    _tracker._lastActivity = now || Date.now();
    _tracker.activityCount++;
  }

  /** Increment deliberate interaction counter (click, keydown, touch). */
  function markInteraction(now) {
    markActivity(now);
    _tracker.interactionCount++;
  }

  // ── Visibility tracking ─────────────────────────────────────────────────
  _addListener(document, 'visibilitychange', () => {
    _tracker._tabHidden = document.hidden;
  });

  // ── Scroll tracking (depth only — no direction tracking) ────────────────
  const onScroll = () => {
    const now = Date.now();
    markActivity(now);

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

    _tracker._lastScrollY = scrollTop;
  };
  _addListener(window, 'scroll', onScroll, { passive: true });

  // ── Active time — 1 s tick, visibility-aware, idle-gated ───────────────
  // Deliberate interactions: keydown, touchstart, pointerdown.
  // No mousemove — it fires too frequently and inflates counts.
  ['keydown', 'touchstart', 'pointerdown'].forEach(evt => {
    _addListener(window, evt, () => markInteraction(), { passive: true });
  });

  _tracker._activeTimer = setInterval(() => {
    if (!_tracker._tabHidden && Date.now() - _tracker._lastActivity < IDLE_MS) {
      _tracker.activeTimeMs += 1000;
    }
  }, 1000);

  // ── Click tracking — rage-clicks (deduplicated) & unresponsive-clicks ──
  _addListener(window, 'click', (e) => {
    const now = Date.now();
    markInteraction(now);
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

    // Unresponsive click: target not inside any interactive element
    if (e.target && !e.target.closest(INTERACTIVE_SELECTOR)) {
      _tracker.unresponsiveClickCount++;
    }
  });

  logInfo(`${LOG_PREFIX} Behavioral tracker started.`);
}

// ─── Feature Builder ─────────────────────────────────────────────────────────

/**
 * Build the 5 bucketed features from current tracker state.
 * Exported for testability.
 *
 * @returns {Object} features
 */
export function buildFeatures() {
  return {
    engagement: engagementBucket(
      _tracker.scrollDepth,
      _tracker.activeTimeMs,
      _tracker.interactionCount,
      _tracker.rageClickCount,
      _tracker.unresponsiveClickCount
    ),
    dwell: dwellBucket(_tracker.activeTimeMs),
    scroll: scrollBucket(_tracker.scrollDepth),
    frustration: frustrationBucket(_tracker.rageClickCount, _tracker.unresponsiveClickCount),
    interaction: interactionBucket(_tracker.interactionCount, _tracker.activeTimeMs),
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

  kws.push(`${prefix}_engagement=${features.engagement}`);
  kws.push(`${prefix}_dwell=${features.dwell}`);
  kws.push(`${prefix}_scroll=${features.scroll}`);
  kws.push(`${prefix}_interaction=${features.interaction}`);

  // Only include non-default values to reduce noise
  if (features.frustration !== 'none') {
    kws.push(`${prefix}_frustration=${features.frustration}`);
  }

  return kws.join(',');
}

/**
 * Build ORTB2 user.data segment array from bucketed features.
 * Each feature becomes a segment with id = "feature_value".
 *
 * @param {Object} features
 * @returns {Object} user.data entry
 */
export function buildSegments(features) {
  const segments = Object.entries(features).map(([key, value]) => ({
    id: `${key}_${value}`
  }));

  return {
    name: 'msclarity',
    segment: segments
  };
}

/**
 * Save features to localStorage with a timestamp for warm-start.
 *
 * @param {Object} features
 */
function saveToStorage(features) {
  try {
    const payload = JSON.stringify({
      ts: Date.now(),
      features
    });
    storage.setDataInLocalStorage(STORAGE_KEY, payload);
  } catch (e) {
    logWarn(`${LOG_PREFIX} Could not persist signals to localStorage.`);
  }
}

/**
 * Load features from localStorage if they are within the TTL window.
 *
 * @returns {Object|null} features or null if expired/missing
 */
export function loadFromStorage() {
  try {
    const raw = storage.getDataFromLocalStorage(STORAGE_KEY);
    if (!raw) return null;

    const { ts, features } = JSON.parse(raw);
    if (Date.now() - ts > STORAGE_TTL_MS) return null;
    return features;
  } catch (e) {
    return null;
  }
}

// ─── RTD Submodule Interface ─────────────────────────────────────────────────

/**
 * Module init — validates config, optionally injects Clarity, starts tracker.
 *
 * @param {Object} config
 * @returns {boolean}
 */
function init(config) {
  resetTracker();

  const projectId = deepAccess(config, 'params.projectId');
  if (!projectId) {
    logWarn(`${LOG_PREFIX} params.projectId is required. Get your project ID from https://clarity.microsoft.com`);
    return false;
  }

  // Opt-in Clarity script injection (default: false)
  const injectClarity = deepAccess(config, 'params.injectClarity') === true;
  if (injectClarity && !isClarityPresent()) {
    logInfo(`${LOG_PREFIX} Injecting Clarity tag for project ${projectId} (injectClarity=true).`);
    injectClarityScript(projectId);
  }

  initTracker();

  logInfo(`${LOG_PREFIX} Initialized for project ${projectId}.`);
  return true;
}

/**
 * Pre-auction enrichment — builds bucketed features and writes them into
 * global ORTB2 fragments (available to all bidders).  Also publishes
 * user.data segments and persists to localStorage for warm-start.
 *
 * @param {Object}   reqBidsConfigObj
 * @param {function} callback
 * @param {Object}   config
 */
function getBidRequestData(reqBidsConfigObj, callback, config) {
  try {
    const prefix = deepAccess(config, 'params.targetingPrefix') || DEFAULTS.targetingPrefix;
    let features = buildFeatures();

    // Warm-start: if all features are at baseline defaults, try localStorage
    const isBaseline = features.engagement === 'low' &&
      features.dwell === 'bounce' &&
      features.scroll === 'none' &&
      features.frustration === 'none' &&
      features.interaction === 'passive';

    if (isBaseline) {
      const cached = loadFromStorage();
      if (cached) {
        features = cached;
        logInfo(`${LOG_PREFIX} Using warm-start signals from localStorage.`);
      }
    }

    const keywords = buildKeywords(features, prefix);
    const segmentData = buildSegments(features);

    reqBidsConfigObj.ortb2Fragments = reqBidsConfigObj.ortb2Fragments || {};
    reqBidsConfigObj.ortb2Fragments.global = reqBidsConfigObj.ortb2Fragments.global || {};

    // Site-level: all bucketed features
    deepSetValue(
      reqBidsConfigObj,
      'ortb2Fragments.global.site.ext.data.msclarity',
      { ...features }
    );

    // User-level: segments for ORTB2-native consumption (Curate, DSPs)
    const existingUserData = deepAccess(reqBidsConfigObj, 'ortb2Fragments.global.user.data') || [];
    deepSetValue(
      reqBidsConfigObj,
      'ortb2Fragments.global.user.data',
      [...existingUserData, segmentData]
    );

    // Keywords for adapters that consume site.keywords (e.g., AppNexus)
    if (keywords) {
      const existing = deepAccess(
        reqBidsConfigObj,
        'ortb2Fragments.global.site.keywords'
      ) || '';
      const merged = existing ? `${existing},${keywords}` : keywords;
      deepSetValue(
        reqBidsConfigObj,
        'ortb2Fragments.global.site.keywords',
        merged
      );
    }

    // Persist for warm-start on next page load
    saveToStorage(features);

    logInfo(`${LOG_PREFIX} Enriched global ORTB2 with 5 features + segments.`);
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
