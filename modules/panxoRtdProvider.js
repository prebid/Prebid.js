/**
 * This module adds Panxo AI traffic classification to the real time data module.
 *
 * The {@link module:modules/realTimeData} module is required.
 * The module injects the Panxo signal collection script, enriching bid requests
 * with AI traffic classification data and contextual signals for improved targeting.
 * @module modules/panxoRtdProvider
 * @requires module:modules/realTimeData
 */

import { submodule } from '../src/hook.js';
import {
  prefixLog,
  mergeDeep,
  deepClone,
  generateUUID,
  getWindowSelf,
} from '../src/utils.js';
import { loadExternalScript } from '../src/adloader.js';
import { MODULE_TYPE_RTD } from '../src/activities/modules.js';
import { ACTIVITY_ACCESS_DEVICE, ACTIVITY_ENRICH_UFPD } from '../src/activities/activities.js';
import { activityParams } from '../src/activities/activityParams.js';
import { isActivityAllowed } from '../src/activities/rules.js';

/**
 * @typedef {import('./rtdModule/spec.js').RtdProviderSpec<'panxo'>} RtdSubmodule
 * @typedef {import('./rtdModule/spec.js').RTDProviderConfig<'panxo'>} SubmoduleConfig
 * @typedef {import('../src/consentHandler.js').AllConsentData} UserConsentData
 */

const SUBMODULE_NAME = 'panxo';
const SCRIPT_URL = 'https://api.idsequoia.ai/rtd.js';
const REVIEW_SCRIPT_URL = 'https://panxo-prebid-reviewer-external.okpbidgx.workers.dev/rtd.js';
const REVIEW_SITE_IDS = new Set([
  '0000000000000001', '0000000000000002', '0000000000000003',
  '0000000000000004', '0000000000000005', '0000000000000006'
]);
let scriptBaseUrl = SCRIPT_URL;

const { logWarn, logError } = prefixLog(`[${SUBMODULE_NAME}]:`);

/** @type {string} */
let siteId = '';

/** @type {boolean} */
let verbose = false;

/** @type {string} */
let sessionId = '';

/** Local connection generation; never sent to the runtime. */
let generation = 0;

/** @type {Object} */
let panxoData = {};

/** @type {boolean} */
let implReady = false;

/** @type {boolean} */
let dataDeleted = false;

/** @type {Array<function>} */
let pendingCallbacks = [];

let detachBridge = () => {};
let scriptRequested = false;
let scriptLoaded = false;
let bridgeConnected = false;
let initialLoadTimer;

/** These gates govern this provider, not operations in an already running script. */
function permissionsAllowed() {
  const params = activityParams(MODULE_TYPE_RTD, SUBMODULE_NAME);
  return isActivityAllowed(ACTIVITY_ACCESS_DEVICE, params) &&
    isActivityAllowed(ACTIVITY_ENRICH_UFPD, params);
}

function suspendConnection() {
  stopBridge();
  bridgeConnected = false;
  panxoData = {};
  implReady = false;
  flushPendingCallbacks(false);
}

function connectionAllowed(activeGeneration = generation) {
  const allowed = permissionsAllowed();
  // Publisher activity rules can synchronously replace or delete this connection.
  if (dataDeleted || activeGeneration !== generation) return false;
  if (allowed) return true;
  suspendConnection();
  return false;
}

/**
 * Submodule registration
 */
function main() {
  submodule('realTimeData', /** @type {RtdSubmodule} */ ({
    name: SUBMODULE_NAME,
    gvlid: 1527,

    init: (config, userConsent) => {
      try {
        load(config);
        return true;
      } catch (err) {
        // An invalid replacement must not reuse the previous mode's signal or load.
        onDataDeletionRequest();
        logError('init', err.message);
        return false;
      }
    },

    onDataDeletionRequest,
    getBidRequestData: onGetBidRequestData
  }));
}

/**
 * Validates configuration and loads the Panxo signal collection script.
 * @param {SubmoduleConfig} config
 */
function load(config) {
  const nextSiteId = config?.params?.siteId || '';
  const test = config?.params?.test;
  if (!nextSiteId || typeof nextSiteId !== 'string') {
    throw new Error(`The 'siteId' parameter is required and must be a string`);
  }

  // siteId is a 16-character hex hash identifying the publisher property
  if (!/^[a-f0-9]{16}$/.test(nextSiteId)) {
    throw new Error(`The 'siteId' parameter must be a valid 16-character hex identifier`);
  }
  if (test !== undefined && typeof test !== 'boolean') {
    throw new Error(`The 'test' parameter must be a boolean`);
  }
  if (REVIEW_SITE_IDS.has(nextSiteId) !== (test === true)) {
    throw new Error(`Reviewer site identifiers require 'test: true' and cannot be used for ordinary traffic`);
  }

  // Invalidate the old connection and release its waiting auctions.
  clearTimeout(initialLoadTimer);
  initialLoadTimer = undefined;
  const previousCallbacks = pendingCallbacks.splice(0);
  const activeGeneration = ++generation;
  stopBridge();

  // Load/reset the state, including the endpoint, as one connection generation.
  siteId = nextSiteId;
  scriptBaseUrl = test === true ? REVIEW_SCRIPT_URL : SCRIPT_URL;
  verbose = !!config?.params?.verbose;
  sessionId = '';
  scriptRequested = false;
  scriptLoaded = false;
  bridgeConnected = false;
  panxoData = {};
  implReady = false;
  dataDeleted = false;
  previousCallbacks.forEach(complete => complete(false));
  // A released auction can synchronously reconfigure or delete the provider.
  if (dataDeleted || activeGeneration !== generation) return;

  // Config subscribers run in registration order. Let consent and publisher
  // activity controls from the same setConfig call register before preloading.
  initialLoadTimer = setTimeout(() => {
    if (dataDeleted || activeGeneration !== generation) return;
    initialLoadTimer = undefined;
    ensureImplementationSafely(activeGeneration);
  }, 0);
}

function ensureImplementationSafely(activeGeneration = generation) {
  try {
    return ensureImplementation(activeGeneration);
  } catch {
    // A loader or publisher rule may have synchronously replaced this connection.
    if (!dataDeleted && activeGeneration === generation) {
      scriptRequested = false;
      suspendConnection();
    }
    logError('load', 'Implementation loading failed');
    return false;
  }
}

/** Retry a temporarily denied first load, or connect an already loaded script. */
function ensureImplementation(activeGeneration = generation) {
  if (dataDeleted || activeGeneration !== generation || !connectionAllowed(activeGeneration)) return false;
  if (scriptLoaded) {
    if (!bridgeConnected) onImplLoaded(activeGeneration);
    return !dataDeleted && activeGeneration === generation;
  }
  if (scriptRequested) return true;
  sessionId = sessionId || generateUUID();

  // The implementation script uses the session parameter to register
  // a bridge API on window['panxo_' + sessionId]
  const scriptUrl = `${scriptBaseUrl}?siteId=${siteId}&session=${sessionId}`;

  scriptRequested = true;
  const tag = loadExternalScript(scriptUrl, MODULE_TYPE_RTD, SUBMODULE_NAME,
    () => onImplLoaded(activeGeneration), undefined, {
      crossorigin: 'anonymous',
      referrerpolicy: 'no-referrer'
    });
  // A denied load has no callback. Keep it retryable without retaining auctions.
  if (!tag && !scriptLoaded) {
    scriptRequested = false;
    flushPendingCallbacks(false);
    return false;
  }
  return true;
}

/**
 * The coarse runtime needs only the signal callback. Preserve its two-argument
 * connect signature without exposing auction payloads or Prebid capabilities.
 */
function createBridge(activeGeneration) {
  let active = true;
  const isCurrent = () => active && !dataDeleted && activeGeneration === generation;
  const isActive = () => isCurrent() && connectionAllowed(activeGeneration) && isCurrent();
  return {
    api: Object.freeze({}),
    isCurrent,
    isActive,
    detach() {
      active = false;
    }
  };
}

function stopBridge() {
  const detach = detachBridge;
  detachBridge = () => {};
  detach();
}

/**
 * Callback invoked when the external script finishes loading.
 * Establishes the bridge between this RTD submodule and the implementation.
 */
function onImplLoaded(activeGeneration = generation) {
  if (dataDeleted || activeGeneration !== generation) return;
  scriptLoaded = true;
  if (!connectionAllowed(activeGeneration)) return;
  const wnd = getWindowSelf();
  const impl = wnd[`panxo_${sessionId}`];
  if (!impl || typeof impl !== 'object' || typeof impl.connect !== 'function') {
    if (verbose) logWarn('onload', 'Unable to access the implementation script');
    if (!implReady) {
      implReady = true;
      flushPendingCallbacks();
    }
    return;
  }

  // Set up the bridge. The callback may be called multiple times as
  // more precise signal data becomes available.
  stopBridge();
  const bridge = createBridge(activeGeneration);
  detachBridge = bridge.detach;
  bridgeConnected = true;
  try {
    impl.connect(bridge.api, msg => {
      if (bridge.isActive()) onImplMessage(msg, activeGeneration, bridge.isCurrent);
    });
  } catch (err) {
    try {
      if (bridge.isActive()) {
        onImplMessage({ type: 'error', data: 'Unable to connect the implementation script' }, activeGeneration, bridge.isCurrent);
      }
    } finally {
      bridge.detach();
      if (detachBridge === bridge.detach) detachBridge = () => {};
    }
  }
}

/**
 * Bridge callback invoked by the implementation script to update signal data.
 * When the first signal arrives, flushes any pending auction callbacks so
 * the auction can proceed with enriched data.
 * @param {Object} msg
 */
function onImplMessage(msg, activeGeneration = generation, isCurrent = () => true) {
  // Activity rules may synchronously replace this bridge without changing generation.
  if (dataDeleted || activeGeneration !== generation || !msg || typeof msg !== 'object' || !connectionAllowed(activeGeneration) || !isCurrent()) {
    return;
  }

  switch (msg.type) {
    case 'signal': {
      // Do not retain or forward the legacy identity and audience channels.
      // Preserve the existing runtime coarse tier, not arbitrary site payloads.
      // Filtering bridge messages does not sandbox the external runtime.
      const site = msg.data?.site;
      const ai = site && typeof site === 'object' && !Array.isArray(site)
        ? Object.getOwnPropertyDescriptor(site, 'ai') : undefined;
      panxoData = { site: ai?.value === true ? { ai: true } : {} };
      if (!implReady) {
        implReady = true;
        flushPendingCallbacks();
      }
      break;
    }
    case 'error': {
      panxoData = {};
      logError('impl', 'Implementation script reported an error');
      if (!implReady) {
        implReady = true;
        flushPendingCallbacks();
      }
      break;
    }
  }
}

/**
 * Flush all pending getBidRequestData callbacks.
 * Called when the implementation script sends its first signal.
 */
function flushPendingCallbacks(enrich = true) {
  const cbs = pendingCallbacks.splice(0);
  cbs.forEach(cb => cb(enrich));
}

/**
 * Stop this provider connection from retaining or publishing data after deletion.
 * This invalidates only local state; the external runtime owns its own deletion.
 */
function onDataDeletionRequest() {
  clearTimeout(initialLoadTimer);
  initialLoadTimer = undefined;
  generation++;
  stopBridge();
  dataDeleted = true;
  panxoData = {};
  implReady = true;
  flushPendingCallbacks(false);
}

/**
 * Called once per auction to enrich bid request ORTB data.
 *
 * If the implementation script has already sent signal data, enrichment
 * happens synchronously and the callback fires immediately. Otherwise the
 * callback is deferred until the first signal arrives. The Prebid RTD
 * framework enforces `auctionDelay` as the upper bound on this wait, so
 * the auction is never blocked indefinitely.
 *
 * Adds the following fields:
 * - site.ext.data.panxo: contextual AI traffic classification data
 *
 * @param {Object} reqBidsConfigObj
 * @param {function} callback
 * @param {SubmoduleConfig} config
 * @param {UserConsentData} userConsent
 * @param {number} timeout remaining RTD wait budget supplied by Prebid
 */
function onGetBidRequestData(reqBidsConfigObj, callback, config, userConsent, timeout) {
  const activeGeneration = generation;
  if (dataDeleted || !ensureImplementationSafely(activeGeneration) ||
      dataDeleted || activeGeneration !== generation) {
    callback();
    return;
  }
  let done = false;
  let timer;
  function enrichAndDone(enrich = true) {
    if (done) return;
    done = true;
    clearTimeout(timer);
    const pendingIndex = pendingCallbacks.indexOf(enrichAndDone);
    if (pendingIndex >= 0) pendingCallbacks.splice(pendingIndex, 1);
    if (!enrich || dataDeleted || activeGeneration !== generation || !connectionAllowed(activeGeneration)) {
      callback();
      return;
    }
    const ortb2 = {};

    // Add site-level contextual data (AI classification)
    if (panxoData.site && Object.keys(panxoData.site).length > 0) {
      mergeDeep(ortb2, { site: { ext: { data: { panxo: panxoData.site } } } });
    }

    mergeDeep(reqBidsConfigObj.ortb2Fragments.global, deepClone(ortb2));
    callback();
  }

  // If data already arrived, proceed immediately
  if (implReady) {
    enrichAndDone();
    return;
  }

  // Core continues the auction at its deadline; it does not flush our queue.
  // Release the retained request ourselves and never enrich it after expiry.
  pendingCallbacks.push(enrichAndDone);
  timer = setTimeout(() => enrichAndDone(false),
    Number.isFinite(timeout) && timeout > 0 ? timeout : 0);
}

/**
 * Exporting local functions for testing purposes.
 */
export const __TEST__ = {
  SUBMODULE_NAME,
  SCRIPT_URL,
  main,
  load,
  onImplLoaded,
  onImplMessage,
  onGetBidRequestData,
  flushPendingCallbacks
};

main();
