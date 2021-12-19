/**
 * This module adds optimera provider to the real time data module
 * The {@link module:modules/realTimeData} module is required
 *
 * The module will fetch targeting values from the Optimera server
 * and apply the tageting to each ad request. These values are created
 * from the Optimera Mesaurement script which is installed on the
 * Publisher's site.
 *
 * @module modules/optimeraRtdProvider
 * @requires module:modules/realTimeData
 */

/**
 * @typedef {Object} ModuleParams
 * @property {string} clientID
 * @property {string} optimeraKeyName
 * @property {string} device
 */

import { logInfo, logError } from '../src/utils.js';
import { submodule } from '../src/hook.js';
import { ajaxBuilder } from '../src/ajax.js';

/** @type {ModuleParams} */
let _moduleParams = {};

/**
 * Default Optimera Key Name
 * This can default to hb_deal_optimera for publishers
 * who used the previous Optimera Bidder Adapter.
 * @type {string} */
export let optimeraKeyName = 'hb_deal_optimera';

/**
 * Optimera Score File Base URL.
 * This is the base URL for the data endpoint request to fetch
 * the targeting values.
 * @type {string}
 */
export const scoresBaseURL = 'https://dyv1bugovvq1g.cloudfront.net/';

/**
 * Optimera Score File URL.
 * @type {string}
 */
export let scoresURL;

/**
 * Optimera Client ID.
 * @type {string}
 */
export let clientID;

/**
 * Optional device parameter.
 * @type {string}
 */
export let device = 'default';

/**
 * Targeting object for all ad positions.
 * @type {string}
 */
export let optimeraTargeting = {};

/**
 * Flag to indicateo if a new score file should be fetched.
 * @type {string}
 */
export let fetchScoreFile = true;

/**
 * Make the request for the Score File.
 */
export function scoreFileRequest() {
  logInfo('Fetch Optimera score file.');
  const ajax = ajaxBuilder();
  ajax(scoresURL,
    {
      success: (res, req) => {
        if (req.status === 200) {
          try {
            setScores(res);
          } catch (err) {
            logError('Unable to parse Optimera Score File.', err);
          }
        } else if (req.status === 403) {
          logError('Unable to fetch the Optimera Score File - 403');
        }
      },
      error: () => {
        logError('Unable to fetch the Optimera Score File.');
      }
    });
}

/**
 * Apply the Optimera targeting to the ad slots.
 */
export function returnTargetingData(adUnits, config) {
  const targeting = {};
  try {
    adUnits.forEach(function(adUnit) {
      if (optimeraTargeting[adUnit]) {
        targeting[adUnit] = {};
        targeting[adUnit][optimeraKeyName] = [optimeraTargeting[adUnit]];
      }
    });
  } catch (err) {
    logError('error', err);
  }
  logInfo('Apply Optimera targeting');
  return targeting;
}

/**
 * Fetch a new score file when an auction starts.
 * Only fetch the new file if a new score file is needed.
 */
export function onAuctionInit(auctionDetails, config, userConsent) {
  setScoresURL();
  if (fetchScoreFile) {
    scoreFileRequest();
  }
}

/**
 * Initialize the Module.
 */
export function init(moduleConfig) {
  _moduleParams = moduleConfig.params;
  if (_moduleParams && _moduleParams.clientID) {
    clientID = _moduleParams.clientID;
    if (_moduleParams.optimeraKeyName) {
      optimeraKeyName = (_moduleParams.optimeraKeyName);
    }
    if (_moduleParams.device) {
      device = _moduleParams.device;
    }
    setScoresURL();
    scoreFileRequest();
    return true;
  } else {
    if (!_moduleParams.clientID) {
      logError('Optimera clientID is missing in the Optimera RTD configuration.');
    }
    return false;
  }
}

/**
 * Set the score file url.
 *
 * This fully-formed URL is for the data endpoint request to fetch
 * the targeting values. This is not a js library, rather JSON
 * which has the targeting values for the page.
 *
 * The score file url is based on the web page url. If the new score file URL
 * has been updated, set the fetchScoreFile flag to true to is can be fetched.
 *
 */
export function setScoresURL() {
  const optimeraHost = window.location.host;
  const optimeraPathName = window.location.pathname;
  let newScoresURL = `${scoresBaseURL}${clientID}/${optimeraHost}${optimeraPathName}.js`;
  if (scoresURL !== newScoresURL) {
    scoresURL = newScoresURL;
    fetchScoreFile = true;
  } else {
    fetchScoreFile = false;
  }
}

/**
 * Set the scores for the device if given.
 * Add any any insights to the winddow.optimeraInsights object.
 *
 * @param {*} result
 * @returns {string} JSON string of Optimera Scores.
 */
export function setScores(result) {
  let scores = {};
  try {
    scores = JSON.parse(result);
    if (device !== 'default' && scores.device[device]) {
      scores = scores.device[device];
    }
    logInfo(scores);
    if (scores.insights) {
      window.optimeraInsights = window.optimeraInsights || {};
      window.optimeraInsights.data = scores.insights;
    }
  } catch (e) {
    logError('Optimera score file could not be parsed.');
  }
  optimeraTargeting = scores;
}

/** @type {RtdSubmodule} */
export const optimeraSubmodule = {
  /**
   * used to link submodule with realTimeData
   * @type {string}
   */
  name: 'optimeraRTD',
  /**
   * get data when an auction starts
   * @function
   */
  onAuctionInitEvent: onAuctionInit,
  /**
   * get data and send back to realTimeData module
   * @function
   */
  getTargetingData: returnTargetingData,
  init,
};

/**
 * Register the Sub Module.
 */
function registerSubModule() {
  submodule('realTimeData', optimeraSubmodule);
}

registerSubModule();
