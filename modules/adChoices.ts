/**
 * This module reads the DAA (Digital Advertising Alliance) AdChoices Signal and
 * conveys it in the OpenRTB bid stream as the community extension `regs.ext.adchoices`,
 * as described in Appendix 5 of the DAA's AdChoices Signal Specification.
 *
 * The signal is a base64url-encoded string describing a user's interest-based
 * advertising preferences. In a browser environment it can be read from the DAA's
 * "Protect My Choices" (PMC) extension via the window `postMessage` protocol:
 * the extension emits an `ExtensionLoaded` message when ready, responds to a
 * `GetAdPreferences` request, and delivers the signal in an `AdPreferences` message.
 *
 * Publishers that obtain the signal by other means (for example, reading the
 * `X-AdChoices` request header server-side) can instead supply it directly through
 * the module's `signal` config option.
 *
 * @see https://github.com/Digital-Advertising-Alliance/DAA-Choice-Tools/blob/main/AdChoices%20Signal/AdChoices%20Signal%20Specification.md
 */
import { deepSetValue, isNumber, isStr, logInfo, logWarn } from '../src/utils.js';
import { config } from '../src/config.js';
import { getHook } from '../src/hook.js';
import { enrichFPD } from '../src/fpd/enrichment.js';

const MODULE_NAME = 'adChoices';

// postMessage protocol message types used by the Protect My Choices extension.
export const PMC_EXTENSION_LOADED = 'ExtensionLoaded';
export const PMC_GET_AD_PREFERENCES = 'GetAdPreferences';
export const PMC_AD_PREFERENCES = 'AdPreferences';

export interface AdChoicesConfig {
  /**
   * A statically supplied AdChoices Signal. When set, it is used as-is and takes
   * precedence over any value read from the Protect My Choices browser extension.
   * Useful for publishers who read the signal server-side (e.g. from the
   * `X-AdChoices` header) and pass it into Prebid.
   */
  signal?: string;
  /**
   * Length of time (in milliseconds) to delay auctions while waiting for the
   * AdChoices Signal to arrive from the browser extension. Defaults to 0
   * (non-blocking): auctions are not delayed and whatever signal is available at
   * auction time is used. Set a positive value to opt into delaying the first
   * auction until the signal is read or the timeout elapses.
   */
  timeout?: number;
}

declare module '../src/config' {
  interface Config {
    adChoices?: AdChoicesConfig;
  }
}

// Module state.
let enabled = false;
let listenerAttached = false;
let staticSignal: string | undefined;
let extensionSignal: string | undefined;
let auctionTimeout = 0;

// Promise (and its resolver) used by the optional auction-delay hook to wait for
// the signal from the extension. It is resolved once, when either the signal
// arrives or the configured timeout elapses; `signalSettled` records that so that
// subsequent auctions proceed immediately rather than waiting again.
let signalReady: Promise<void> | undefined;
let resolveSignalReady: (() => void) | undefined;
let signalSettled = false;
let timeoutTimer: ReturnType<typeof setTimeout> | undefined;

/**
 * Returns the AdChoices Signal that should be written to the bid stream, preferring
 * an explicitly configured static value over one read from the extension.
 */
export function getAdChoicesSignal(): string | undefined {
  return staticSignal != null ? staticSignal : extensionSignal;
}

function isValidSignal(value: unknown): value is string {
  // Keep validation lenient (non-empty string) to remain forward-compatible with
  // future versions of the signal; do not attempt to parse the base64url payload.
  return isStr(value) && (value as string).length > 0;
}

function markSignalReady() {
  signalSettled = true;
  if (timeoutTimer != null) {
    clearTimeout(timeoutTimer);
    timeoutTimer = undefined;
  }
  if (resolveSignalReady != null) {
    resolveSignalReady();
    resolveSignalReady = undefined;
  }
}

function handleMessage(event: MessageEvent) {
  // Only trust messages posted to this same window (the PMC extension injects into
  // the page context and posts to `window`).
  if (event.source !== window || event.data == null || typeof event.data !== 'object') {
    return;
  }
  const { type, data } = event.data as { type?: string; data?: unknown };
  if (type === PMC_EXTENSION_LOADED) {
    logInfo('adChoices: Protect My Choices extension detected, requesting ad preferences');
    requestAdPreferences();
  } else if (type === PMC_AD_PREFERENCES) {
    if (isValidSignal(data)) {
      extensionSignal = data;
      logInfo('adChoices: received AdChoices Signal from Protect My Choices extension');
      markSignalReady();
    } else {
      logWarn('adChoices: ignoring malformed AdPreferences message', data);
    }
  }
}

function requestAdPreferences() {
  window.postMessage({ type: PMC_GET_AD_PREFERENCES }, '*');
}

function attachListener() {
  if (listenerAttached) return;
  window.addEventListener('message', handleMessage);
  listenerAttached = true;
  // Proactively request preferences in case `ExtensionLoaded` fired before this
  // listener was attached; if the extension isn't installed this is a no-op.
  requestAdPreferences();
}

/**
 * Enrich the global ortb2 object with the AdChoices Signal at `regs.ext.adchoices`.
 * Runs before every auction via the FPD enrichment hook.
 */
export function enrichFPDHook(next, fpd) {
  return next(fpd.then(ortb2 => {
    const signal = getAdChoicesSignal();
    if (isValidSignal(signal)) {
      deepSetValue(ortb2, 'regs.ext.adchoices', signal);
    }
    return ortb2;
  }));
}

/**
 * Optional auction-delay hook. Only delays the first auction(s) while waiting for
 * the signal, and only when a positive `timeout` is configured and the signal has
 * not yet settled. Once the signal arrives or the timeout elapses, readiness is
 * settled once and every later auction proceeds immediately, so users without the
 * extension are not repeatedly penalized with added latency.
 */
export function requestBidsHook(next, reqBidsConfigObj) {
  if (auctionTimeout > 0 && !signalSettled && getAdChoicesSignal() == null && signalReady != null) {
    // Start the timeout window now, when an auction is actually waiting, so the
    // first auction gets the full configured delay regardless of how long ago the
    // module was configured.
    startTimeoutTimer();
    signalReady.then(() => next(reqBidsConfigObj));
  } else {
    next(reqBidsConfigObj);
  }
}

let requestBidsHookInstalled = false;
function ensureRequestBidsHook() {
  if (!requestBidsHookInstalled) {
    getHook('requestBids').before(requestBidsHook, 49);
    requestBidsHookInstalled = true;
  }
}

/**
 * Start a single timer that settles readiness when the configured timeout elapses,
 * so the auction-delay hook never waits longer than `timeout` and only waits once.
 */
function startTimeoutTimer() {
  if (signalSettled || timeoutTimer != null || auctionTimeout <= 0) return;
  timeoutTimer = setTimeout(() => {
    timeoutTimer = undefined;
    logWarn(`adChoices: timed out after ${auctionTimeout}ms waiting for the AdChoices Signal`);
    markSignalReady();
  }, auctionTimeout);
}

/**
 * Activate the module: begin listening for the AdChoices Signal from the browser
 * extension. Runs automatically when the module is included, so the signal is read
 * without requiring any configuration; calling it again is a no-op.
 */
export function activate() {
  if (signalReady == null) {
    signalReady = new Promise<void>((resolve) => { resolveSignalReady = resolve; });
  }
  if (!enabled) {
    enabled = true;
    logInfo('adChoices: module enabled');
  }
  attachListener();
}

export function setAdChoicesConfig(cfg?: AdChoicesConfig) {
  activate();
  staticSignal = cfg != null && isValidSignal(cfg.signal) ? cfg.signal : undefined;
  auctionTimeout = cfg != null && isNumber(cfg.timeout) && cfg.timeout > 0 ? cfg.timeout : 0;

  if (getAdChoicesSignal() != null) markSignalReady();
  if (auctionTimeout > 0) {
    // Install the hook now, but defer starting the timeout window until an auction
    // is actually waiting (see requestBidsHook).
    ensureRequestBidsHook();
  }
}

/**
 * Reset module state. Intended for tests.
 */
export function resetAdChoicesData() {
  staticSignal = undefined;
  extensionSignal = undefined;
  auctionTimeout = 0;
  enabled = false;
  signalReady = undefined;
  resolveSignalReady = undefined;
  signalSettled = false;
  if (timeoutTimer != null) {
    clearTimeout(timeoutTimer);
    timeoutTimer = undefined;
  }
  if (listenerAttached) {
    window.removeEventListener('message', handleMessage);
    listenerAttached = false;
  }
  if (requestBidsHookInstalled) {
    getHook('requestBids').getHooks({ hook: requestBidsHook }).remove();
    requestBidsHookInstalled = false;
  }
}

config.getConfig(MODULE_NAME, (cfg) => setAdChoicesConfig(cfg?.[MODULE_NAME]));

enrichFPD.before(enrichFPDHook);

// Start reading the signal as soon as the module is included, without requiring
// any configuration.
activate();
