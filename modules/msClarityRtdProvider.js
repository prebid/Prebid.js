/**
 * Microsoft Clarity RTD Module
 *
 * Collects behavioral signals from a self-contained DOM tracker and writes
 * bucketed features into global ORTB2 fragments, making them available to
 * all bidders.  Signals are also published as ORTB2 user.data segments for
 * native consumption by ORTB-compatible adapters and DSP platforms like
 * Microsoft Curate.
 *
 * Features are organized into three tiers:
 *   1. Cumulative (durable) — scroll, dwell, interaction, frustration,
 *      engagement, reading mode, view quality.
 *   2. Recency / momentum — activity recency, recent engagement.
 *   3. Auction-time snapshots — attention and page-momentum at the moment
 *      the bid request is built.
 *
 * The Clarity JS tag is injected by default for analytics /
 * session-recording functionality (set params.injectClarity = false to
 * opt out).  Bid-enrichment signals are computed independently from DOM
 * events (scroll, click, keydown, visibility changes).
 *
 * Warm-start: the module persists the latest durable signal snapshot to
 * localStorage so the first auction of a new page load can use stale
 * (≤ 30 min) signals instead of sending empty defaults.  Transient
 * auction-time snapshots are always computed fresh.
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
  '[role="button"], [role="link"], [role="tab"], [role="menuitem"], ' +
  '[tabindex], [data-click], [data-action], [onclick], ' +
  '[class*="btn"], [class*="click"], [class*="card"]';

/** Regex to detect framework event binding attributes (Angular, Vue, etc.). */
const FRAMEWORK_CLICK_RE = /^(ng-|v-|@|data-ng-)click/;

/** Debounce window for mousemove interaction counting. */
const MOUSEMOVE_DEBOUNCE_MS = 5000;

/** Timestamp of last mousemove-triggered interaction increment. */
let _lastMouseMoveInteraction = 0;

/** Duration of the recent-window for recency/momentum signals. */
const RECENT_WINDOW_MS = 10000;

/** Scroll must be still for this long to count as "reading" vs "scanning". */
const SCROLL_STABLE_MS = 2000;

/**
 * Default values for all durable features.
 * Used for warm-start baseline detection and backward-compat cache loading.
 */
const DURABLE_DEFAULTS = Object.freeze({
  engagement: 'low',
  dwell: 'bounce',
  scroll: 'none',
  frustration: 'none',
  interaction: 'passive',
  readingMode: 'skim',
  viewQuality: 'low',
});

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
 * Bucket frustration signals (rage + exploratory clicks + scroll reversals)
 * into a categorical label.  Exploratory clicks (on non-interactive elements)
 * are weighted at 0.5× — they indicate exploration, not necessarily frustration.
 *
 * @param {number} rageClicks
 * @param {number} exploratoryClicks - clicks on non-interactive elements
 * @param {number} [scrollReversals=0] - every 5 reversals counts as 1 frustration point
 * @returns {string}
 */
export function frustrationBucket(rageClicks, exploratoryClicks, scrollReversals = 0) {
  const total = rageClicks + Math.floor(exploratoryClicks * 0.5) + Math.floor(scrollReversals / 5);
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
 * @param {number} exploratoryClicks
 * @returns {string}
 */
export function engagementBucket(scrollDepth, activeMs, interactions, rageClicks, exploratoryClicks) {
  const scrollW = Math.min(1, scrollDepth) * 0.30;
  const timeW = Math.min(1, activeMs / 60000) * 0.35;
  const interW = Math.min(1, interactions / 20) * 0.20;
  // frustPenalty is capped at 0.15 — rage clicks count fully, exploratory at half.
  const frustPenalty = Math.min(0.15, rageClicks * 0.03 + exploratoryClicks * 0.015);
  // The + 0.15 is an intentional baseline warmth term: even a completely idle
  // page starts with a small positive score, acknowledging that the user has
  // at least loaded the page.  This keeps 'low' from being the *only* outcome
  // when all weighted signals are zero.
  const score = Math.max(0, Math.min(1, scrollW + timeW + interW + 0.15 - frustPenalty));

  if (score < 0.25) return 'low';
  if (score < 0.50) return 'medium';
  if (score < 0.75) return 'high';
  return 'very_high';
}

// ─── Recency / Momentum Buckets ──────────────────────────────────────────────

/**
 * Bucket seconds since last activity into a recency label.
 * Reflects how "present" the user currently is.
 *
 * @param {number} ms - milliseconds since last activity
 * @returns {string}
 */
export function activityRecencyBucket(ms) {
  if (ms < 2000) return 'live';
  if (ms < 10000) return 'recent';
  return 'stale';
}

/**
 * Bucket the count of deliberate interactions in the recent window (10 s).
 * Captures short-term engagement momentum.
 *
 * @param {number} count - deliberate interactions in the last 10 s
 * @returns {string}
 */
export function recentEngagementBucket(count) {
  if (count === 0) return 'cold';
  if (count <= 3) return 'warming';
  return 'hot';
}

// ─── Visibility / Read-Quality Buckets ───────────────────────────────────────

/**
 * Bucket the read-vs-scan ratio.  "Reading" is when the tab is visible,
 * the user is active, and scroll position has been stable for ≥ SCROLL_STABLE_MS.
 * "Scanning" is active time spent while scroll is in motion.
 *
 * @param {number} readTimeMs  - cumulative "reading" time (stable scroll)
 * @param {number} scanTimeMs  - cumulative "scanning" time (active scroll)
 * @returns {string}
 */
export function readingModeBucket(readTimeMs, scanTimeMs) {
  const total = readTimeMs + scanTimeMs;
  if (total < 2000) return 'skim';
  const readRatio = readTimeMs / total;
  if (readRatio >= 0.6) return 'read';
  if (readRatio >= 0.3) return 'scan';
  return 'skim';
}

/**
 * Composite view-quality signal.  Combines reading time, active time,
 * and scroll depth to judge the overall quality of the page view.
 *
 * @param {number} readTimeMs
 * @param {number} activeTimeMs
 * @param {number} scrollDepth - 0 to 1
 * @returns {string}
 */
export function viewQualityBucket(readTimeMs, activeTimeMs, scrollDepth) {
  if (readTimeMs >= 5000 && activeTimeMs >= 10000 && scrollDepth >= 0.25) return 'high';
  if (readTimeMs >= 2000 && activeTimeMs >= 5000) return 'medium';
  return 'low';
}

// ─── Auction-Time Snapshot Buckets ───────────────────────────────────────────

/**
 * Auction-time attention snapshot.  Computed fresh at bid-request time to
 * reflect the user's current attentiveness.
 *
 * @param {boolean} tabHidden
 * @param {number}  msSinceLastActivity
 * @param {number}  readTimeMs
 * @param {number}  scanTimeMs
 * @returns {string}
 */
export function auctionAttentionBucket(tabHidden, msSinceLastActivity, readTimeMs, scanTimeMs) {
  if (tabHidden || msSinceLastActivity >= 10000) return 'low';
  const isReading = readTimeMs > scanTimeMs && readTimeMs >= 2000;
  if (msSinceLastActivity < 2000 && isReading) return 'high';
  return 'medium';
}

/**
 * Page-momentum snapshot — what phase of the page visit the user is in
 * at auction time.
 *
 * @param {number} activeTimeMs
 * @param {number} readTimeMs
 * @param {number} scrollDepth  - 0 to 1
 * @param {number} msSinceLastActivity
 * @param {number} recentInteractionCount
 * @param {number} msSinceLastScroll
 * @returns {string}
 */
export function pageMomentumBucket(activeTimeMs, readTimeMs, scrollDepth, msSinceLastActivity, recentInteractionCount, msSinceLastScroll) {
  // Just arrived — not enough time for meaningful signals
  if (activeTimeMs < 5000) return 'arrival';
  // Fatigued — long session with declining engagement
  if (activeTimeMs > 30000 && (msSinceLastActivity >= 10000 || recentInteractionCount === 0)) return 'fatigued';
  // In reading flow — actively reading content (stable scroll, recent activity)
  if (readTimeMs >= 2000 && msSinceLastActivity < 10000 && msSinceLastScroll >= SCROLL_STABLE_MS) return 'in_reading_flow';
  // Post scroll — scrolled deep, now settled
  if (scrollDepth > 0.5 && msSinceLastScroll >= 5000) return 'post_scroll';
  // Default: active mid-session
  return 'in_reading_flow';
}

// ─── Self-Contained Behavioral Tracker ───────────────────────────────────────

const _tracker = {
  scrollDepth: 0,
  activeTimeMs: 0,
  rageClickCount: 0,
  exploratoryClickCount: 0,
  totalClicks: 0,
  activityCount: 0,
  interactionCount: 0,
  scrollReversals: 0,
  readTimeMs: 0,
  scanTimeMs: 0,
  _lastActivity: 0,
  _lastScrollY: 0,
  _lastScrollDirection: 0,
  _lastScrollChangeTime: 0,
  _lastRageBurstTime: 0,
  _recentInteractions: [],
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
  _tracker.exploratoryClickCount = 0;
  _tracker.totalClicks = 0;
  _tracker.activityCount = 0;
  _tracker.interactionCount = 0;
  _tracker.scrollReversals = 0;
  _tracker.readTimeMs = 0;
  _tracker.scanTimeMs = 0;
  _tracker._lastActivity = 0;
  _tracker._lastScrollY = 0;
  _tracker._lastScrollDirection = 0;
  _tracker._lastScrollChangeTime = 0;
  _tracker._lastRageBurstTime = 0;
  _tracker._recentInteractions = [];
  _tracker._clickHistory = [];
  _tracker._activeTimer = null;
  _tracker._tabHidden = false;
  _tracker._listeners = [];
  _tracker._initialized = false;
  _lastMouseMoveInteraction = 0;
}

/**
 * Bootstrap active time from Navigation Timing API heuristics.
 * Called once during tracker initialization to pre-seed reasonable
 * active-time values for returning users and same-site navigations.
 *
 * - back_forward: returning visitor heuristic → 5 000 ms
 * - same-origin referrer: session continuity   → 3 000 ms
 *
 * Gracefully no-ops if the Performance API is unavailable.
 */
function bootstrapFromNavTiming() {
  try {
    if (typeof performance === 'undefined' || typeof performance.getEntriesByType !== 'function') return;
    const entries = performance.getEntriesByType('navigation');
    if (!entries || entries.length === 0) return;

    const nav = entries[0];

    if (nav.type === 'back_forward') {
      _tracker.activeTimeMs = Math.max(_tracker.activeTimeMs, 5000);
      logInfo(`${LOG_PREFIX} Nav Timing: back_forward detected — seeded activeTimeMs to ${_tracker.activeTimeMs}.`);
      return;
    }

    const referrer = getDocumentReferrer();
    if (referrer) {
      try {
        const referrerHost = new URL(referrer).hostname;
        if (referrerHost === location.hostname) {
          _tracker.activeTimeMs = Math.max(_tracker.activeTimeMs, 3000);
          logInfo(`${LOG_PREFIX} Nav Timing: same-origin referrer — seeded activeTimeMs to ${_tracker.activeTimeMs}.`);
        }
      } catch (e) { /* malformed referrer — ignore */ }
    }
  } catch (e) { /* Performance API error — ignore */ }
}

/**
 * Thin getter for document.referrer — extracted for testability in
 * environments where the native property cannot be overridden.
 * @returns {string}
 */
export function getDocumentReferrer() {
  return document.referrer;
}

/**
 * Check whether an element is likely interactive — accounts for standard
 * HTML interactive elements, ARIA roles, tabindex, and framework-specific
 * event binding attributes (Angular ng-click, Vue v-click / @click, etc.).
 *
 * @param {Element} el
 * @returns {boolean}
 */
export function isLikelyInteractive(el) {
  if (!el || typeof el.closest !== 'function') return false;

  // Standard selector check
  if (el.closest(INTERACTIVE_SELECTOR)) return true;

  // Framework event-binding attribute check (walk up from target)
  let node = el;
  while (node && node !== document.body) {
    if (node.attributes) {
      for (let i = 0; i < node.attributes.length; i++) {
        if (FRAMEWORK_CLICK_RE.test(node.attributes[i].name)) return true;
      }
    }
    node = node.parentElement;
  }

  return false;
}

/**
 * Start the behavioral tracker.  Attaches scroll, click, keydown,
 * touchstart, pointerdown, mousemove, and visibilitychange listeners.
 * Safe to call after resetTracker() to re-initialise.
 */
function initTracker() {
  if (_tracker._initialized) return;
  _tracker._initialized = true;
  _tracker._lastActivity = Date.now();
  _tracker._lastScrollY = window.scrollY || 0;
  _tracker._lastScrollChangeTime = Date.now();

  // Bootstrap active time from Navigation Timing API heuristics
  bootstrapFromNavTiming();

  /** Increment activity counter (all DOM events). */
  function markActivity(now) {
    _tracker._lastActivity = now || Date.now();
    _tracker.activityCount++;
  }

  /** Increment deliberate interaction counter (click, keydown, touch + recent tracking). */
  function markInteraction(now) {
    now = now || Date.now();
    markActivity(now);
    _tracker.interactionCount++;
    _tracker._recentInteractions.push(now);
  }

  // ── Visibility tracking ─────────────────────────────────────────────────
  _addListener(document, 'visibilitychange', () => {
    _tracker._tabHidden = document.hidden;
  });

  // ── Scroll tracking (depth + reversal detection) ───────────────────────
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

    // Scroll reversal detection
    const delta = scrollTop - _tracker._lastScrollY;
    if (delta !== 0) {
      const direction = delta > 0 ? 1 : -1;
      if (_tracker._lastScrollDirection !== 0 && direction !== _tracker._lastScrollDirection) {
        _tracker.scrollReversals++;
      }
      _tracker._lastScrollDirection = direction;
    }

    _tracker._lastScrollChangeTime = now;
    _tracker._lastScrollY = scrollTop;
  };
  _addListener(window, 'scroll', onScroll, { passive: true });

  // ── Active time — 1 s tick, visibility-aware, idle-gated ───────────────
  // Deliberate interactions: keydown, touchstart, pointerdown.
  ['keydown', 'touchstart', 'pointerdown'].forEach(evt => {
    _addListener(window, evt, () => markInteraction(), { passive: true });
  });

  // Debounced mousemove: prevents read-heavy pages from showing 'passive'
  // interaction.  Only increments interactionCount once per 5-second window,
  // but keeps the idle timer alive on every move.
  _addListener(window, 'mousemove', () => {
    const now = Date.now();
    _tracker._lastActivity = now;
    if (now - _lastMouseMoveInteraction > MOUSEMOVE_DEBOUNCE_MS) {
      _tracker.interactionCount++;
      _lastMouseMoveInteraction = now;
    }
  }, { passive: true });

  _tracker._activeTimer = setInterval(() => {
    const now = Date.now();
    if (!_tracker._tabHidden && now - _tracker._lastActivity < IDLE_MS) {
      _tracker.activeTimeMs += 1000;
      // Read vs scan: stable scroll = reading, recent scroll = scanning
      if (now - _tracker._lastScrollChangeTime >= SCROLL_STABLE_MS) {
        _tracker.readTimeMs += 1000;
      } else {
        _tracker.scanTimeMs += 1000;
      }
    }
  }, 1000);

  // ── Click tracking — rage-clicks (deduplicated) & exploratory clicks ───
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

    // Exploratory click: target not inside any interactive element
    if (e.target && !isLikelyInteractive(e.target)) {
      _tracker.exploratoryClickCount++;
    }
  });

  logInfo(`${LOG_PREFIX} Behavioral tracker started.`);
}

// ─── Feature Builders ─────────────────────────────────────────────────────────

/**
 * Count recent deliberate interactions within the RECENT_WINDOW_MS window,
 * pruning stale entries.  Used by snapshot features.
 *
 * @param {number} now - current timestamp
 * @returns {number}
 */
function getRecentInteractionCount(now) {
  const cutoff = now - RECENT_WINDOW_MS;
  while (_tracker._recentInteractions.length > 0 && _tracker._recentInteractions[0] < cutoff) {
    _tracker._recentInteractions.shift();
  }
  return _tracker._recentInteractions.length;
}

/**
 * Build the 7 durable bucketed features from current tracker state.
 * These features are persisted to localStorage for warm-start.
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
      _tracker.exploratoryClickCount
    ),
    dwell: dwellBucket(_tracker.activeTimeMs),
    scroll: scrollBucket(_tracker.scrollDepth),
    frustration: frustrationBucket(_tracker.rageClickCount, _tracker.exploratoryClickCount, _tracker.scrollReversals),
    interaction: interactionBucket(_tracker.interactionCount, _tracker.activeTimeMs),
    readingMode: readingModeBucket(_tracker.readTimeMs, _tracker.scanTimeMs),
    viewQuality: viewQualityBucket(_tracker.readTimeMs, _tracker.activeTimeMs, _tracker.scrollDepth),
  };
}

/**
 * Build 4 transient auction-time snapshot features.
 * These reflect the user's current state at the moment of bid request
 * and are NOT persisted to localStorage.
 * Exported for testability.
 *
 * @returns {Object} snapshot features
 */
export function buildSnapshotFeatures() {
  const now = Date.now();
  const msSinceLastActivity = _tracker._lastActivity > 0
    ? (now - _tracker._lastActivity) : IDLE_MS + 1;
  const recentCount = getRecentInteractionCount(now);
  const msSinceLastScroll = _tracker._lastScrollChangeTime > 0
    ? (now - _tracker._lastScrollChangeTime) : IDLE_MS + 1;

  return {
    activityRecency: activityRecencyBucket(msSinceLastActivity),
    recentEngagement: recentEngagementBucket(recentCount),
    auctionAttention: auctionAttentionBucket(
      _tracker._tabHidden,
      msSinceLastActivity,
      _tracker.readTimeMs,
      _tracker.scanTimeMs
    ),
    pageMomentum: pageMomentumBucket(
      _tracker.activeTimeMs,
      _tracker.readTimeMs,
      _tracker.scrollDepth,
      msSinceLastActivity,
      recentCount,
      msSinceLastScroll
    ),
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
 * Build keyword string from features for site.keywords.
 * Iterates over all features dynamically.  Omits frustration='none'
 * to reduce noise.
 *
 * @param {Object} features - all features (durable + snapshot)
 * @param {string} prefix
 * @returns {string} comma-separated keywords
 */
function buildKeywords(features, prefix) {
  return Object.entries(features)
    .filter(([key, value]) => !(key === 'frustration' && value === 'none'))
    .map(([key, value]) => `${prefix}_${key}=${value}`)
    .join(',');
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
    // Merge with defaults for backward compatibility with older cached data
    return { ...DURABLE_DEFAULTS, ...features };
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

  // Clarity script injection — on by default, opt out with injectClarity: false
  const injectClarity = deepAccess(config, 'params.injectClarity') !== false;
  if (injectClarity && !isClarityPresent()) {
    logInfo(`${LOG_PREFIX} Injecting Clarity tag for project ${projectId}.`);
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
    let durableFeatures = buildFeatures();
    const snapshotFeatures = buildSnapshotFeatures();

    // Warm-start: if all durable features are at baseline defaults, try localStorage
    const isBaseline = Object.entries(DURABLE_DEFAULTS).every(
      ([key, defaultVal]) => durableFeatures[key] === defaultVal
    );

    if (isBaseline) {
      const cached = loadFromStorage();
      if (cached) {
        durableFeatures = cached;
        logInfo(`${LOG_PREFIX} Using warm-start signals from localStorage.`);
      }
    }

    // Merge durable + transient snapshot for output
    const features = { ...durableFeatures, ...snapshotFeatures };

    const keywords = buildKeywords(features, prefix);
    const segmentData = buildSegments(features);

    reqBidsConfigObj.ortb2Fragments = reqBidsConfigObj.ortb2Fragments || {};
    reqBidsConfigObj.ortb2Fragments.global = reqBidsConfigObj.ortb2Fragments.global || {};

    // Site-level: all bucketed features (durable + snapshot)
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

    // Persist only durable features for warm-start on next page load
    saveToStorage(durableFeatures);

    logInfo(`${LOG_PREFIX} Enriched global ORTB2 with ${Object.keys(features).length} features + segments.`);
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
