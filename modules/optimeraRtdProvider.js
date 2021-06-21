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

import * as utils from '../src/utils.js';
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
 * Make the request for the Score File.
 */
export function scoreFileRequest() {
  utils.logInfo('Fetch Optimera score file.');
  const ajax = ajaxBuilder();
  ajax(scoresURL,
    {
      success: (res, req) => {
        if (req.status === 200) {
          try {
            setScores(res);
          } catch (err) {
            utils.logError('Unable to parse Optimera Score File.', err);
          }
        } else if (req.status === 403) {
          utils.logError('Unable to fetch the Optimera Score File - 403');
        }
      },
      error: () => {
        utils.logError('Unable to fetch the Optimera Score File.');
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
        targeting[adUnit][optimeraKeyName] = optimeraTargeting[adUnit];
      }
    });
  } catch (err) {
    utils.logError('error', err);
  }
  utils.logInfo('Apply Optimera targeting');
  return targeting;
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
      utils.logError('Optimera clientID is missing in the Optimera RTD configuration.');
    }
    return false;
  }
}

/**
 * Set the score file url.
 * This fully-formed URL for the data endpoint request to fetch
 * the targeting values. This is not a js library, rather JSON
 * which has the targeting values for the page.
 */
export function setScoresURL() {
  const optimeraHost = window.location.host;
  const optimeraPathName = window.location.pathname;
  scoresURL = `${scoresBaseURL}${clientID}/${optimeraHost}${optimeraPathName}.js`;
}

/**
 * Set the scores for the divice if given.
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
  } catch (e) {
    utils.logError('Optimera score file could not be parsed.');
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
   * get data and send back to realTimeData module
   * @function
   * @param {string[]} adUnitsCodes
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
