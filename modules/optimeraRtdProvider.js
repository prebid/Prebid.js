/**
 * This module adds Optimera as a Real-Time Data provider to Prebid.
 * It fetches targeting scores from Optimera’s service and injects them into:
 * - ORTB2 impression-level objects (`ortb2Imp.ext.data.optimera`)
 * - Legacy key-value targeting returned via `getTargetingData`
 *
 * @module modules/optimeraRtdProvider
 * @requires module:modules/realTimeData
 */

/**
 * @typedef {import('./optimeraRtdProvider.d.ts').OptimeraRtdParams} ModuleParams
 */

import { logInfo, logError, logWarn, mergeDeep } from '../src/utils.js';
import { submodule } from '../src/hook.js';
import { ajaxBuilder } from '../src/ajax.js';
import { loadExternalScript } from '../src/adloader.js';
import { MODULE_TYPE_RTD } from '../src/activities/modules.js';

/**
 * @typedef {import('../modules/rtdModule/index.js').RtdSubmodule} RtdSubmodule
 */

// Exposed so tests can stub the ajax dependency.
export const dep = {
  ajaxBuilder,
};

/** @type {ModuleParams} */
let _moduleParams = {};

// Default key name used in legacy targeting
/** @type {string} */
export let optimeraKeyName = 'hb_deal_optimera';

/** @type {Object<string, string>} */
export const scoresBaseURL = {
  v0: 'https://dyv1bugovvq1g.cloudfront.net/',
};

/** @type {string} */
export let scoresURL;

/** @type {string} */
export let clientID;

/** @type {string} */
export let device = 'default';

/** @type {string} */
export let apiVersion = 'v0';

/** @type {string} */
export let transmitWithBidRequests = 'allow';

/** Base URL for the optional Optimera oPS script. @type {string} */
export const opsBaseURL = 'https://d15kdpgjg3unno.cloudfront.net/oPS.js';

/** Whether the oPS script should be requested. @type {boolean} */
export let callOPS = false;

/** @type {Object<string, any>} */
export let optimeraTargeting = {};

// --- In-memory scorefile cache / in-flight request tracking -----------------
// `_scoresPromise` resolves once the fetch for `_scoresPromiseURL` has settled
// (successfully or not). Concurrent auctions that share the same `scoresURL`
// reuse this single promise instead of issuing duplicate network requests.
// `_fetchToken` guards against an older, slower response overwriting data
// from a newer request (e.g. after a SPA navigation changes `scoresURL`
// while a previous fetch for the old URL is still in flight).
/** @type {Promise<boolean>|null} */
let _scoresPromise = null;
/** @type {string|undefined} */
let _scoresPromiseURL;
let _fetchToken = 0;

/** @type {RtdSubmodule} */
export const optimeraSubmodule = {
  name: 'optimeraRTD',
  init: init,
  getBidRequestData: fetchScores,
  getTargetingData: returnTargetingData,
};

/**
 * Initializes the module with publisher-provided params.
 * @param {{params: ModuleParams}} moduleConfig
 * @returns {boolean}
 */
export function init(moduleConfig) {
  _moduleParams = moduleConfig.params;
  if (_moduleParams && _moduleParams.clientID) {
    clientID = _moduleParams.clientID;
    if (_moduleParams.optimeraKeyName) optimeraKeyName = _moduleParams.optimeraKeyName;
    if (_moduleParams.device) device = _moduleParams.device;
    if (_moduleParams.apiVersion) {
      if (_moduleParams.apiVersion === 'v1') {
        logWarn('Optimera RTD apiVersion "v1" is no longer supported and has been removed. Falling back to "v0".');
        apiVersion = 'v0';
      } else {
        apiVersion = (_moduleParams.apiVersion === 'v0') ? _moduleParams.apiVersion : 'v0';
      }
    }
    if (_moduleParams.transmitWithBidRequests) {
      transmitWithBidRequests = _moduleParams.transmitWithBidRequests;
    }
    callOPS = _moduleParams.callOPS === true || _moduleParams.callOPS === 'true';
    if (callOPS) {
      loadOPS();
    }
    // Kick off the scorefile request as early as possible (at config time,
    // rather than waiting for the first auction's getBidRequestData call) so
    // that by the time an auction runs - even with a very short or zero
    // auctionDelay - the fetch is already in flight or complete, and the
    // browser's HTTP cache (and our in-memory cache) can be used immediately
    // by any eligible auction.
    ensureScoresFetched();
    return true;
  }
  logError('Optimera clientID is missing in the Optimera RTD configuration.');
  return false;
}

/**
 * Requests the optional Optimera oPS script and appends it to the document body.
 * Only called when the `callOPS` param is set to true.
 * @returns {HTMLScriptElement|undefined}
 */
export function loadOPS() {
  if (!clientID) {
    logError('Client ID is not set for the Optimera RTDM. Please set the client id properly or contact Optimera for assistance.');
    return;
  }
  const opsURL = `${opsBaseURL}?cid=${encodeURIComponent(clientID)}`;
  const script = loadExternalScript(opsURL, MODULE_TYPE_RTD, 'optimeraRTD', undefined, undefined, {
    id: 'optimera-ops',
    'data-cid': clientID,
  });
  // loadExternalScript inserts the tag into the head; the oPS script is meant to
  // live on the body, so move it there once the body is available.
  if (script) {
    if (document.body) {
      document.body.appendChild(script);
    } else {
      document.addEventListener('DOMContentLoaded', () => document.body?.appendChild(script), { once: true });
    }
  }
  return script;
}

/**
 * Builds the URL for the score file based on config and location.
 */
export function setScoresURL() {
  const optimeraHost = window.location.host;
  const optimeraPathName = window.location.pathname;
  const baseUrl = scoresBaseURL[apiVersion] || scoresBaseURL.v0;

  const encoded = encodeURIComponent(`${optimeraHost}${optimeraPathName}`)
    .replaceAll('%2F', '/')
    .replaceAll('%20', '+');
  const newScoresURL = `${baseUrl}${clientID}/${encoded}.js`;

  if (scoresURL !== newScoresURL) {
    scoresURL = newScoresURL;
    return true;
  } else {
    return false;
  }
}

/**
 * Ensures a fetch of the current scorefile URL is in flight or has already
 * completed, returning a promise all callers can share.
 *
 * - If `scoresURL` hasn't changed since the last call, and a fetch for it
 *   was already started (in flight or settled), the existing promise is
 *   reused: no duplicate network request is issued, and concurrent auctions
 *   effectively share one in-flight request.
 * - If `scoresURL` hasn't changed and no fetch was ever tracked for it (e.g.
 *   a previous page load already populated the cache in a prior session, or
 *   tests reset module state), nothing to do - resolve immediately.
 * - If `scoresURL` has changed (first call, or e.g. a SPA navigation), a new
 *   fetch is started and a fetch token is bumped so a slow, superseded
 *   response can't clobber newer data.
 *
 * The browser's own HTTP cache (driven by the scorefile endpoint's
 * Cache-Control/ETag headers) is left to do its job: the URL is stable and
 * no cache-busting parameters are added, so a request for an unchanged URL
 * can be served from HTTP cache without another full download. This
 * function adds the in-memory layer on top: once resolved, repeat callers
 * don't even need to hit `fetch`/XHR at all.
 *
 * @returns {Promise<boolean>} resolves true if `optimeraTargeting` reflects
 *   a freshly validated scorefile for the current `scoresURL`, false if the
 *   fetch failed, was invalid, or was superseded.
 */
export function ensureScoresFetched() {
  const changed = setScoresURL();
  if (!changed) {
    if (_scoresPromise && _scoresPromiseURL === scoresURL) {
      return _scoresPromise;
    }
    return Promise.resolve(false);
  }

  const token = ++_fetchToken;
  _scoresPromiseURL = scoresURL;
  const requestedURL = scoresURL;
  const ajax = dep.ajaxBuilder();
  _scoresPromise = new Promise((resolve) => {
    ajax(requestedURL, {
      success: (res, req) => {
        if (token !== _fetchToken) {
          // A newer fetch has since started (e.g. the page navigated); drop
          // this now-stale response rather than overwrite fresher data.
          resolve(false);
          return;
        }
        if (req.status === 200) {
          try {
            setScores(res);
            resolve(true);
          } catch (err) {
            logError('Unable to parse Optimera Score File.', err);
            resolve(false);
          }
        } else {
          logError(`Unable to fetch the Optimera Score File - ${req.status}`);
          resolve(false);
        }
      },
      error: () => {
        if (token !== _fetchToken) {
          resolve(false);
          return;
        }
        logError('Unable to fetch the Optimera Score File.');
        resolve(false);
      }
    });
  });
  return _scoresPromise;
}

/**
 * Resets the module-level scorefile fetch/cache tracking state. Exposed for
 * unit tests so each test can exercise `ensureScoresFetched`/`fetchScores`
 * in isolation, without depending on `scoresURL` left over from a previous
 * test or a previous page's `init()` call.
 */
export function resetScoresCache() {
  _scoresPromise = null;
  _scoresPromiseURL = undefined;
  scoresURL = undefined;
  optimeraTargeting = {};
}

/**
 * Called by Prebid before auction. Waits for the (possibly already
 * in-flight, possibly already cached) scorefile and injects it into ORTB2.
 * @param {object} reqBidsConfigObj
 * @param {function} callback
 * @param {object} config
 * @param {object} userConsent
 */
export function fetchScores(reqBidsConfigObj, callback, config, userConsent) {
  return ensureScoresFetched().then((success) => {
    try {
      // Only inject when the fetch this call actually awaited resolved with
      // valid, current data. If it failed (or was superseded - e.g. after a
      // SPA navigation to a new page whose scorefile request subsequently
      // fails), `optimeraTargeting` may still hold a previous page's scores;
      // injecting those into the current page's ad units would apply
      // incorrect cross-page targeting whenever slot codes happen to match.
      if (success && transmitWithBidRequests === 'allow') {
        injectOrtbScores(reqBidsConfigObj);
      }
    } catch (err) {
      logError('Unable to apply Optimera targeting to bid requests.', err);
    }
    callback();
  });
}

/**
 * Parses Optimera score file and updates global and window-scoped values.
 * @param {string} result
 */
export function setScores(result) {
  let scores = {};
  try {
    scores = JSON.parse(result);
    let pagelevel;
    if (scores.pagelevel) {
      pagelevel = scores.pagelevel;
    }
    if (device !== 'default' && scores.device && scores.device[device]) {
      scores = scores.device[device];
    }
    logInfo(scores);
    // Store globally for debug/legacy/measurement script access
    window.optimera = window.optimera || {};
    window.optimera.data = window.optimera.data || {};
    window.optimera.insights = window.optimera.insights || {};
    window.optimera.pagelevel = window.optimera.pagelevel || [];
    Object.keys(scores).forEach((key) => {
      if (key !== 'insights') {
        window.optimera.data[key] = scores[key];
      }
    });
    if (scores.insights) {
      window.optimera.insights = scores.insights;
    }
    if (pagelevel !== undefined) {
      window.optimera.pagelevel = pagelevel;
    }
  } catch (e) {
    logError('Optimera score file could not be parsed.');
  }

  optimeraTargeting = scores;
}

/**
 * Injects ORTB2 slot-level targeting into adUnits[].ortb2Imp.ext.data.optimera
 * @param {object} reqBidsConfigObj
 */
export function injectOrtbScores(reqBidsConfigObj) {
  reqBidsConfigObj.adUnits.forEach((adUnit) => {
    const auCode = adUnit.code;
    adUnit.ortb2Imp = adUnit.ortb2Imp || {};
    adUnit.ortb2Imp.ext = adUnit.ortb2Imp.ext || {};
    adUnit.ortb2Imp.ext.data = adUnit.ortb2Imp.ext.data || {};
    // Example structure of optimeraTargeting[auCode] and assorted comma separated scoring data:
    // optimeraTargeting['some-div']:
    // {
    //   Z,
    //   A1,
    //   L_123,
    //   0.10,
    // }
    if (auCode && optimeraTargeting[auCode]) {
      mergeDeep(adUnit.ortb2Imp.ext.data, {
        optimera: optimeraTargeting[auCode]
      });
    }
  });
}

/**
 * Provides legacy KVP-based targeting using hb_deal_optimera or a custom key
 * @param {Array<string>} adUnits
 * @returns {Object<string, Object<string, Array<string>>>}
 */
export function returnTargetingData(adUnits) {
  const targeting = {};
  try {
    adUnits.forEach((adUnit) => {
      if (optimeraTargeting[adUnit]) {
        targeting[adUnit] = {};
        targeting[adUnit][optimeraKeyName] = [optimeraTargeting[adUnit]];
      }
    });
  } catch (err) {
    logError('Optimera RTD targeting error', err);
  }
  return targeting;
}

// Register the RTD module with Prebid core
submodule('realTimeData', optimeraSubmodule);
