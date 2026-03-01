/**
 * This module adds the Paywalls VAI (Validated Actor Inventory) provider
 * to the real time data module.
 *
 * VAI classifies page impressions by actor type (vat) and confidence tier
 * (act), producing a cryptographically signed assertion. The RTD submodule
 * automates VAI loading, timing, and ORTB2 injection.
 *
 * ORTB2 placement (canonical split):
 *   site.ext.vai — { iss, aud, dom, kid, assertion_jws }
 *   user.ext.vai — { vat, act }
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
 * site.ext.vai — domain provenance + assertion (iss, aud, dom, kid, assertion_jws)
 * user.ext.vai — actor classification (vat, act)
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
          aud: vai.aud,
          dom: vai.dom,
          kid: vai.kid,
          assertion_jws: vai.assertion_jws,
        }
      }
    },
    user: {
      ext: {
        vai: {
          vat: vai.vat,
          act: vai.act,
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
 * @param {object} reqBidsConfigObj
 * @param {object} vai
 */
function mergeOrtb2Fragments(reqBidsConfigObj, vai) {
  const ortb2 = buildOrtb2(vai);
  const global = reqBidsConfigObj.ortb2Fragments.global;
  mergeDeep(global, ortb2);
  logInfo(LOG_PREFIX + 'merged ORTB2 fragments. vat=' + vai.vat + ' act=' + vai.act);
}

// ---------------------------------------------------------------------------
// RTD Submodule interface
// ---------------------------------------------------------------------------

/**
 * init — called once when the submodule is registered.
 *
 * Checks for an existing VAI payload (window global or localStorage).
 * If valid+unexpired, injects ORTB2 immediately so bid requests that
 * fire before getBidRequestData still carry VAI signals.
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
  const waitForIt = params.waitForIt || DEFAULT_WAIT_FOR_IT;

  let resolved = false;

  function resolve(vai) {
    if (resolved) return;
    resolved = true;
    if (vai && isValid(vai)) {
      // Also set the window global so subsequent calls are fast
      window[VAI_WINDOW_KEY] = vai;
      mergeOrtb2Fragments(reqBidsConfigObj, vai);
    } else {
      logWarn(LOG_PREFIX + 'VAI unavailable — proceeding without enrichment');
    }
    callback();
  }

  // Set up the hook that vai.js may call
  window[VAI_HOOK_KEY] = function (vaiData) {
    resolve(vaiData);
  };

  // Set up a poll interval to check for window.__PW_VAI__
  const pollInterval = 10; // ms
  const pollId = setInterval(function () {
    const vai = window[VAI_WINDOW_KEY];
    if (vai && isValid(vai)) {
      clearInterval(pollId);
      resolve(vai);
    }
  }, pollInterval);

  // Set up timeout (graceful degradation — never block the auction)
  const timeoutId = setTimeout(function () {
    clearInterval(pollId);
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
        clearInterval(pollId);
        clearTimeout(timeoutId);
        resolve(vai);
      }
    });
  } catch (e) {
    logWarn(LOG_PREFIX + 'loadExternalScript failed:', e);
    clearInterval(pollId);
    clearTimeout(timeoutId);
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
