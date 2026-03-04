/**
 * This module adds the Paywalls VAI (Validated Actor Inventory) provider
 * to the real time data module.
 *
 * VAI classifies page impressions by actor type (vat) and confidence tier
 * (act), producing a cryptographically signed assertion. The RTD submodule
 * automates VAI loading, timing, and ORTB2 injection.
 *
 * ORTB2 placement (canonical split):
 *   site.ext.vai — { iss, dom }
 *   user.ext.vai — { iss, mstk, vat, act, jws }
 *   imp[].ext.vai — { pvtk }
 *
 * @module modules/paywallsRtdProvider
 * @requires module:modules/realTimeData
 * @see https://paywalls.net/docs/publishers/vai
 */

import {submodule} from '../src/hook.js';
import {mergeDeep, logInfo, logWarn} from '../src/utils.js';
import {loadExternalScript} from '../src/adloader.js';
import {MODULE_TYPE_RTD} from '../src/activities/modules.js';
import {getStorageManager} from '../src/storageManager.js';

/**
 * @typedef {import('../modules/rtdModule/index.js').RtdSubmodule} RtdSubmodule
 */

const LOG_PREFIX = '[PaywallsRtd] ';
const MODULE_NAME = 'realTimeData';

export const SUBMODULE_NAME = 'paywalls';
export const DEFAULT_SCRIPT_URL = '/pw/vai.js';
export const VAI_WINDOW_KEY = '__PW_VAI__';
export const VAI_HOOK_KEY = '__PW_VAI_HOOK__';
export const VAI_LS_KEY = '__pw_vai__';

const DEFAULT_WAIT_FOR_IT = 100;

// Cached VAI payload from init (for early detection)
let cachedVai = null;

export const storage = getStorageManager({moduleType: MODULE_TYPE_RTD, moduleName: SUBMODULE_NAME});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Check whether a VAI payload is present and unexpired.
 * @param {object|null} vai
 * @returns {boolean}
 */
function isValid(vai) {
  if (!vai || typeof vai !== 'object') return false;
  if (!vai.vat || !vai.act) return false;
  if (vai.exp && vai.exp < Math.floor(Date.now() / 1000)) return false;
  return true;
}

/**
 * Attempt to read a VAI payload from window or localStorage.
 * @returns {object|null}
 */
export function getVaiPayload() {
  // 1. Check window global (set by vai.js <script> tag)
  const winPayload = window[VAI_WINDOW_KEY];
  if (isValid(winPayload)) {
    return winPayload;
  }

  // 2. Check localStorage cache
  try {
    const raw = storage.getDataFromLocalStorage(VAI_LS_KEY);
    if (raw) {
      const cached = JSON.parse(raw);
      if (isValid(cached)) {
        return cached;
      }
    }
  } catch (e) {
    logWarn(LOG_PREFIX + 'localStorage read failed:', e);
  }

  return null;
}

/**
 * Build the canonical ORTB2 split placement from a VAI payload.
 *
 * site.ext.vai — domain provenance (iss, dom)
 * user.ext.vai — actor classification + signed assertion (iss, vat, act, mstk, jws)
 *
 * imp-level pvtk enrichment is handled separately in mergeOrtb2Fragments.
 *
 * @param {object} vai
 * @returns {{site: object, user: object}}
 */
export function buildOrtb2(vai) {
  return {
    site: {
      ext: {
        vai: {
          iss: vai.iss,
          dom: vai.dom,
        }
      }
    },
    user: {
      ext: {
        vai: {
          iss: vai.iss,
          vat: vai.vat,
          act: vai.act,
          mstk: vai.mstk,
          jws: vai.jws,
        }
      }
    }
  };
}

/**
 * Merge VAI signals into the global ORTB2 config via Prebid's config system.
 * Used during init for early injection.
 * @param {object} vai
 */
function mergeOrtb2Config(vai) {
  // In modern Prebid, direct config.getConfig('ortb2') is restricted.
  // During init, we cache the VAI payload so getBidRequestData can use it
  // immediately without script injection.
  cachedVai = vai;
  logInfo(LOG_PREFIX + 'cached VAI for early injection. vat=' + vai.vat + ' act=' + vai.act);
}

/**
 * Merge VAI signals into the request-level ORTB2 fragments.
 * Used during getBidRequestData.
 *
 * - site.ext.vai and user.ext.vai are merged into ortb2Fragments.global
 * - imp[].ext.vai.pvtk is merged into each ad unit's ortb2Imp (if pvtk is available)
 *
 * @param {object} reqBidsConfigObj
 * @param {object} vai
 */
function mergeOrtb2Fragments(reqBidsConfigObj, vai) {
  const ortb2 = buildOrtb2(vai);
  const global = reqBidsConfigObj.ortb2Fragments.global;
  mergeDeep(global, ortb2);

  // Enrich imp-level ortb2 with pvtk when available
  if (vai.pvtk && reqBidsConfigObj.adUnits) {
    reqBidsConfigObj.adUnits.forEach(function (adUnit) {
      adUnit.ortb2Imp = adUnit.ortb2Imp || {};
      mergeDeep(adUnit.ortb2Imp, {
        ext: { vai: { pvtk: vai.pvtk } }
      });
    });
  }

  logInfo(LOG_PREFIX + 'merged ORTB2 fragments. vat=' + vai.vat + ' act=' + vai.act + (vai.pvtk ? ' pvtk=' + vai.pvtk : ''));
}

// ---------------------------------------------------------------------------
// RTD Submodule interface
// ---------------------------------------------------------------------------

/**
 * init — called once when the submodule is registered.
 *
 * Checks for an existing VAI payload (window global or localStorage).
 * If valid+unexpired, caches it so getBidRequestData can inject ORTB2
 * immediately on the first call without script injection.
 *
 * @param {object} rtdConfig  Provider configuration from realTimeData.dataProviders
 * @param {object} userConsent  Consent data
 * @returns {boolean}  true to signal success; false would disable the module
 */
function init(rtdConfig, userConsent) {
  cachedVai = null;
  const vai = getVaiPayload();
  if (vai) {
    mergeOrtb2Config(vai);
  }
  return true;
}

/**
 * getBidRequestData — called before each auction.
 *
 * If VAI is already available, merges ORTB2 and calls callback immediately.
 * Otherwise, injects vai.js via loadExternalScript and waits (up to waitForIt ms)
 * for window.__PW_VAI__ to be populated (via script execution or __PW_VAI_HOOK__).
 *
 * CRITICAL: callback() MUST be called to unblock the auction. On timeout or
 * error, callback fires without enrichment (graceful degradation).
 *
 * @param {object} reqBidsConfigObj  The bid request config with ortb2Fragments
 * @param {function} callback  Must be called when done
 * @param {object} rtdConfig  Provider configuration
 * @param {object} userConsent  Consent data
 */
function getBidRequestData(reqBidsConfigObj, callback, rtdConfig, userConsent) {
  // Fast path: VAI already available (from window, localStorage, or cached from init)
  const existing = getVaiPayload() || (isValid(cachedVai) ? cachedVai : null);
  if (existing) {
    mergeOrtb2Fragments(reqBidsConfigObj, existing);
    callback();
    return;
  }

  // Slow path: need to inject vai.js and wait
  const params = (rtdConfig && rtdConfig.params) || {};
  const scriptUrl = params.scriptUrl || DEFAULT_SCRIPT_URL;
  const rawWaitForIt = params.waitForIt;
  const waitForIt = (typeof rawWaitForIt === 'number' && rawWaitForIt >= 0)
    ? rawWaitForIt
    : DEFAULT_WAIT_FOR_IT;
  if (rawWaitForIt != null && (typeof rawWaitForIt !== 'number' || rawWaitForIt < 0)) {
    logWarn(LOG_PREFIX + 'Invalid waitForIt value (' + rawWaitForIt + '); using default ' + DEFAULT_WAIT_FOR_IT);
  }

  let resolved = false;
  let enriched = false;
  let pollId = null;
  let timeoutId = null;

  const previousHook = (typeof window[VAI_HOOK_KEY] === 'function') ? window[VAI_HOOK_KEY] : null;

  function restoreHook() {
    if (window[VAI_HOOK_KEY] === hookHandler) {
      if (previousHook) {
        window[VAI_HOOK_KEY] = previousHook;
      } else {
        delete window[VAI_HOOK_KEY];
      }
    }
  }

  function cleanup() {
    if (pollId != null) { clearInterval(pollId); pollId = null; }
    if (timeoutId != null) { clearTimeout(timeoutId); timeoutId = null; }
  }

  function resolve(vai) {
    const validVai = !!(vai && isValid(vai));
    if (resolved) {
      // Even after timeout, store late payloads so subsequent auctions can use them
      if (!enriched && validVai) {
        window[VAI_WINDOW_KEY] = vai;
        enriched = true;
        restoreHook();
        logInfo(LOG_PREFIX + 'late VAI payload stored for subsequent auctions. vat=' + vai.vat);
      }
      return;
    }
    resolved = true;
    enriched = validVai;
    cleanup();
    if (validVai) {
      window[VAI_WINDOW_KEY] = vai;
      restoreHook();
      mergeOrtb2Fragments(reqBidsConfigObj, vai);
    } else {
      // Hook stays installed — no timer-based removal.
      // It will self-clean when vai.js eventually delivers a valid payload
      // (captured in the post-resolve branch above), ensuring subsequent
      // auctions can use the data regardless of how late it arrives.
      logWarn(LOG_PREFIX + 'VAI unavailable — proceeding without enrichment');
    }
    callback();
  }

  // Set up the hook that vai.js may call
  // Preserve any existing hook set by the page
  function hookHandler(vaiData) {
    resolve(vaiData);
    if (previousHook) {
      try { previousHook(vaiData); } catch (e) { logWarn(LOG_PREFIX + 'Error in existing VAI hook:', e); }
    }
  }
  window[VAI_HOOK_KEY] = hookHandler;

  // Set up a poll interval to check for window.__PW_VAI__
  const pollInterval = 10; // ms
  pollId = setInterval(function () {
    const vai = window[VAI_WINDOW_KEY];
    if (vai && isValid(vai)) {
      resolve(vai);
    }
  }, pollInterval);

  // Set up timeout (graceful degradation — never block the auction)
  timeoutId = setTimeout(function () {
    resolve(null);
  }, waitForIt);

  // Inject the script
  try {
    loadExternalScript(scriptUrl, MODULE_TYPE_RTD, SUBMODULE_NAME, function () {
      logInfo(LOG_PREFIX + 'vai.js loaded from ' + scriptUrl);
      // After script loads, check once more if __PW_VAI__ is set
      // (script may have set it synchronously)
      const vai = window[VAI_WINDOW_KEY];
      if (vai && isValid(vai)) {
        resolve(vai);
      }
    });
  } catch (e) {
    logWarn(LOG_PREFIX + 'loadExternalScript failed:', e);
    resolve(null);
  }
}

/**
 * getTargetingData — return GAM key-value pairs per ad unit.
 *
 * Returns { vai_vat, vai_act } for each ad unit code, enabling
 * publishers to target GAM line items by actor classification.
 *
 * @param {string[]} adUnitArray  Array of ad unit codes
 * @param {object} rtdConfig  Provider configuration
 * @param {object} userConsent  Consent data
 * @returns {object}  Object keyed by ad unit code
 */
function getTargetingData(adUnitArray, rtdConfig, userConsent) {
  const vai = getVaiPayload();
  if (!vai) return {};

  const targeting = {};
  adUnitArray.forEach(function (adUnitCode) {
    targeting[adUnitCode] = {
      vai_vat: vai.vat,
      vai_act: vai.act,
    };
  });
  return targeting;
}

// ---------------------------------------------------------------------------
// Export & register
// ---------------------------------------------------------------------------

/** @type {RtdSubmodule} */
export const paywallsSubmodule = {
  name: SUBMODULE_NAME,
  init: init,
  getBidRequestData: getBidRequestData,
  getTargetingData: getTargetingData,
};

submodule(MODULE_NAME, paywallsSubmodule);
