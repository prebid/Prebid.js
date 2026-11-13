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
  generateUUID,
  getWindowSelf,
} from '../src/utils.js';
import { getRefererInfo } from '../src/refererDetection.js';
import { getGlobal } from '../src/prebidGlobal.js';
import { loadExternalScript } from '../src/adloader.js';
import { MODULE_TYPE_RTD } from '../src/activities/modules.js';

/**
 * @typedef {import('../modules/rtdModule/index.js').RtdSubmodule} RtdSubmodule
 * @typedef {import('../modules/rtdModule/index.js').SubmoduleConfig} SubmoduleConfig
 * @typedef {import('../modules/rtdModule/index.js').UserConsentData} UserConsentData
 */

const SUBMODULE_NAME = 'panxo';
const SCRIPT_URL = 'https://api.idsequoia.ai/rtd.js';

const { logWarn, logError } = prefixLog(`[${SUBMODULE_NAME}]:`);

/** @type {string} */
let siteId = '';

/** @type {boolean} */
let verbose = false;

/** @type {string} */
let sessionId = '';

/** @type {Object} */
let panxoData = {};

/** @type {boolean} */
let implReady = false;

/** @type {Array<function>} */
let pendingCallbacks = [];

/**
 * Submodule registration
 */
function main() {
  submodule('realTimeData', /** @type {RtdSubmodule} */ ({
    name: SUBMODULE_NAME,

    init: (config, userConsent) => {
      try {
        load(config);
        return true;
      } catch (err) {
        logError('init', err.message);
        return false;
      }
    },

    getBidRequestData: onGetBidRequestData
  }));
}

/**
 * Validates configuration and loads the Panxo signal collection script.
 * @param {SubmoduleConfig} config
 */
function load(config) {
  siteId = config?.params?.siteId || '';
  if (!siteId || typeof siteId !== 'string') {
    throw new Error(`The 'siteId' parameter is required and must be a string`);
  }

  // siteId is a 16-character hex hash identifying the publisher property
  if (!/^[a-f0-9]{16}$/.test(siteId)) {
    throw new Error(`The 'siteId' parameter must be a valid 16-character hex identifier`);
  }

  // Load/reset the state
  verbose = !!config?.params?.verbose;
  sessionId = generateUUID();
  panxoData = {};
  implReady = false;
  pendingCallbacks = [];

  const refDomain = getRefererInfo().domain || '';

  // The implementation script uses the session parameter to register
  // a bridge API on window['panxo_' + sessionId]
  const scriptUrl = `${SCRIPT_URL}?siteId=${siteId}&session=${sessionId}&r=${refDomain}`;

  loadExternalScript(scriptUrl, MODULE_TYPE_RTD, SUBMODULE_NAME, onImplLoaded);
}

/**
 * Callback invoked when the external script finishes loading.
 * Establishes the bridge between this RTD submodule and the implementation.
 */
function onImplLoaded() {
  const wnd = getWindowSelf();
  const impl = wnd[`panxo_${sessionId}`];
  if (typeof impl !== 'object' || typeof impl.connect !== 'function') {
    if (verbose) logWarn('onload', 'Unable to access the implementation script');
    if (!implReady) {
      implReady = true;
      flushPendingCallbacks();
    }
    return;
  }

  // Set up the bridge. The callback may be called multiple times as
  // more precise signal data becomes available.
  impl.connect(getGlobal(), onImplMessage);
}

/**
 * Bridge callback invoked by the implementation script to update signal data.
 * When the first signal arrives, flushes any pending auction callbacks so
 * the auction can proceed with enriched data.
 * @param {Object} msg
 */
function onImplMessage(msg) {
  if (!msg || typeof msg !== 'object') {
    return;
  }

  switch (msg.type) {
    case 'signal': {
      panxoData = mergeDeep({}, msg.data || {});
      if (!implReady) {
        implReady = true;
        flushPendingCallbacks();
      }
      break;
    }
    case 'error': {
      logError('impl', msg.data || '');
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
function flushPendingCallbacks() {
  const cbs = pendingCallbacks.splice(0);
  cbs.forEach(cb => cb());
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
 * - device.ext.panxo: session signal token for traffic verification
 * - site.ext.data.panxo: contextual AI traffic classification data
 *
 * @param {Object} reqBidsConfigObj
 * @param {function} callback
 * @param {SubmoduleConfig} config
 * @param {UserConsentData} userConsent
 */
function onGetBidRequestData(reqBidsConfigObj, callback, config, userConsent) {
  function enrichAndDone() {
    const ortb2 = {};

    // Add device-level signal (opaque session token)
    if (panxoData.device) {
      mergeDeep(ortb2, { device: { ext: { panxo: panxoData.device } } });
    }

    // Add site-level contextual data (AI classification)
    if (panxoData.site && Object.keys(panxoData.site).length > 0) {
      mergeDeep(ortb2, { site: { ext: { data: { panxo: panxoData.site } } } });
    }

    mergeDeep(reqBidsConfigObj.ortb2Fragments.global, ortb2);
    callback();
  }

  // If data already arrived, proceed immediately
  if (implReady) {
    enrichAndDone();
    return;
  }

  // Otherwise, wait for the implementation script to send its first signal.
  // The auctionDelay configured by the publisher (e.g. 1500ms) acts as the
  // maximum wait time -- Prebid will call our callback when it expires.
  pendingCallbacks.push(enrichAndDone);
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
