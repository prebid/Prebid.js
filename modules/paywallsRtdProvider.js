/**
 * This module adds the Paywalls VAI (Validated Actor Inventory) provider
 * to the real time data module.
 *
 * VAI classifies page impressions by actor type (vat) and confidence tier
 * (act), producing a cryptographically signed assertion. The RTD submodule
 * reads the VAI payload from window.__PW_VAI__ (populated by the
 * publisher's vai.js script tag) and injects it into ORTB2.
 *
 * Publishers must load vai.js before Prebid.js initializes:
 *   <script src="/pw/vai.js"></script>
 *
 * ORTB2 placement (canonical split):
 *   site.ext.data.vai — { iss, dom }
 *   user.ext.data.vai — { iss, mstk, vat, act, jws }
 *   imp[].ext.vai — { pvtk }
 *
 * @module modules/paywallsRtdProvider
 * @requires module:modules/realTimeData
 * @see https://paywalls.net/docs/publishers/vai
 */

import { submodule } from '../src/hook.js';
import { mergeDeep, logInfo, logWarn } from '../src/utils.js';

/**
 * @typedef {import('../modules/rtdModule/index.js').RtdSubmodule} RtdSubmodule
 */

const LOG_PREFIX = '[PaywallsRtd] ';
const MODULE_NAME = 'realTimeData';

export const SUBMODULE_NAME = 'paywalls';
export const VAI_WINDOW_KEY = '__PW_VAI__';

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
 * Read the VAI payload from the window global.
 * Returns the payload if valid and unexpired, null otherwise.
 * @returns {object|null}
 */
export function getVaiPayload() {
  const vai = window[VAI_WINDOW_KEY];
  if (isValid(vai)) {
    return vai;
  }
  return null;
}

/**
 * Build the canonical ORTB2 split placement from a VAI payload.
 *
 * site.ext.data.vai — domain provenance (iss, dom)
 * user.ext.data.vai — actor classification + signed assertion (iss, vat, act, mstk, jws)
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
        data: {
          vai: {
            iss: vai.iss,
            dom: vai.dom,
          }
        }
      }
    },
    user: {
      ext: {
        data: {
          vai: {
            iss: vai.iss,
            vat: vai.vat,
            act: vai.act,
            mstk: vai.mstk,
            jws: vai.jws,
          }
        }
      }
    }
  };
}

/**
 * Merge VAI signals into the request-level ORTB2 fragments.
 *
 * - site.ext.data.vai and user.ext.data.vai are merged into ortb2Fragments.global
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
 * @param {object} rtdConfig  Provider configuration from realTimeData.dataProviders
 * @param {object} userConsent  Consent data
 * @returns {boolean}  true to signal success; false would disable the module
 */
function init(rtdConfig, userConsent) {
  return true;
}

/**
 * getBidRequestData — called before each auction.
 *
 * Reads window.__PW_VAI__ — if valid and unexpired, merges ORTB2.
 * If absent or expired, calls callback immediately (graceful degradation).
 *
 * Fully synchronous — the publisher is responsible for loading vai.js
 * before Prebid runs.
 *
 * @param {object} reqBidsConfigObj  The bid request config with ortb2Fragments
 * @param {function} callback  Must be called when done
 * @param {object} rtdConfig  Provider configuration
 * @param {object} userConsent  Consent data
 */
function getBidRequestData(reqBidsConfigObj, callback, rtdConfig, userConsent) {
  const vai = getVaiPayload();
  if (vai) {
    mergeOrtb2Fragments(reqBidsConfigObj, vai);
  } else {
    logWarn(LOG_PREFIX + 'VAI unavailable — proceeding without enrichment');
  }
  callback();
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
