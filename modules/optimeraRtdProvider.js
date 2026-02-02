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
 * @typedef {Object} ModuleParams
 * @property {string} clientID
 * @property {string} optimeraKeyName
 * @property {string} device
 * @property {string} apiVersion
 * @property {string} transmitWithBidRequests
 */

import { logInfo, logError, mergeDeep } from '../src/utils.js';
import { submodule } from '../src/hook.js';
import { ajaxBuilder } from '../src/ajax.js';

/**
 * @typedef {import('../modules/rtdModule/index.js').RtdSubmodule} RtdSubmodule
 */

/** @type {ModuleParams} */
let _moduleParams = {};

// Default key name used in legacy targeting
/** @type {string} */
export let optimeraKeyName = 'hb_deal_optimera';

/** @type {Object<string, string>} */
export const scoresBaseURL = {
  v0: 'https://dyv1bugovvq1g.cloudfront.net/',
  v1: 'https://v1.oapi26b.com/',
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

/** @type {Object<string, any>} */
export let optimeraTargeting = {};

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
      apiVersion = (_moduleParams.apiVersion.includes('v1', 'v0')) ? _moduleParams.apiVersion : 'v0';
    }
    if (_moduleParams.transmitWithBidRequests) {
      transmitWithBidRequests = _moduleParams.transmitWithBidRequests;
    }
    return true;
  }
  logError('Optimera clientID is missing in the Optimera RTD configuration.');
  return false;
}

/**
 * Builds the URL for the score file based on config and location.
 */
export function setScoresURL() {
  const optimeraHost = window.location.host;
  const optimeraPathName = window.location.pathname;
  const baseUrl = scoresBaseURL[apiVersion] || scoresBaseURL.v0;

  let newScoresURL;
  if (apiVersion === 'v1') {
    newScoresURL = `${baseUrl}api/products/scores?c=${clientID}&h=${optimeraHost}&p=${optimeraPathName}&s=${device}`;
  } else {
    const encoded = encodeURIComponent(`${optimeraHost}${optimeraPathName}`)
      .replaceAll('%2F', '/')
      .replaceAll('%20', '+');
    newScoresURL = `${baseUrl}${clientID}/${encoded}.js`;
  }

  if (scoresURL !== newScoresURL) {
    scoresURL = newScoresURL;
    return true;
  } else {
    return false;
  }
}

/**
 * Called by Prebid before auction. Fetches Optimera scores and injects into ORTB2.
 * @param {object} reqBidsConfigObj
 * @param {function} callback
 * @param {object} config
 * @param {object} userConsent
 */
export function fetchScores(reqBidsConfigObj, callback, config, userConsent) {
  // If setScoresURL returns false, no need to re-fetch the score file
  if (!setScoresURL()) {
    callback();
    return;
  }
  // Else, fetch the score file
  const ajax = ajaxBuilder();
  ajax(scoresURL, {
    success: (res, req) => {
      if (req.status === 200) {
        try {
          setScores(res);
          if (transmitWithBidRequests === 'allow') {
            injectOrtbScores(reqBidsConfigObj);
          }
          callback();
        } catch (err) {
          logError('Unable to parse Optimera Score File.', err);
          callback();
        }
      } else if (req.status === 403) {
        logError('Unable to fetch the Optimera Score File - 403');
        callback();
      }
    },
    error: () => {
      logError('Unable to fetch the Optimera Score File.');
      callback();
    }
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
    if (device !== 'default' && scores.device && scores.device[device]) {
      scores = scores.device[device];
    }
    logInfo(scores);
    // Store globally for debug/legacy/measurement script access
    window.optimera = window.optimera || {};
    window.optimera.data = window.optimera.data || {};
    window.optimera.insights = window.optimera.insights || {};
    Object.keys(scores).forEach((key) => {
      if (key !== 'insights') {
        window.optimera.data[key] = scores[key];
      }
    });
    if (scores.insights) {
      window.optimera.insights = scores.insights;
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
