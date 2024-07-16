/**
 * This module adds the blueconic provider to the real time data module
 * The {@link module:modules/realTimeData} module is required
 * The module will fetch real-time data from Blueconic
 * @module modules/blueconicRtdProvider
 * @requires module:modules/realTimeData
 */

import {getStorageManager} from '../src/storageManager.js';
import {submodule} from '../src/hook.js';
import {mergeDeep, isPlainObject, logMessage, logError} from '../src/utils.js';
import {MODULE_TYPE_RTD} from '../src/activities/modules.js';

/**
 * @typedef {import('../modules/rtdModule/index.js').RtdSubmodule} RtdSubmodule
 */

const MODULE_NAME = 'realTimeData';
const SUBMODULE_NAME = 'blueconic';

export const RTD_LOCAL_NAME = 'bcPrebidData';

export const storage = getStorageManager({moduleType: MODULE_TYPE_RTD, moduleName: SUBMODULE_NAME});

/**
 * Try parsing stringified array of data.
 * @param {String} data
 */
function parseJson(data) {
  try {
    return JSON.parse(data);
  } catch (err) {
    logError(`blueconicRtdProvider: failed to parse json:`, data);
    return null;
  }
}

/**
 * Add real-time data & merge segments.
 * @param {Object} ortb2
 * @param {Object} rtd
 */
export function addRealTimeData(ortb2, rtd) {
  if (isPlainObject(rtd.ortb2)) {
    mergeDeep(ortb2, rtd.ortb2);
  }
}

/**
 * Real-time data retrieval from BlueConic
 * @param {Object} reqBidsConfigObj
 * @param {function} onDone
 * @param {Object} rtdConfig
 * @param {Object} userConsent
 */
export function getRealTimeData(reqBidsConfigObj, onDone, rtdConfig, userConsent) {
  if (rtdConfig && isPlainObject(rtdConfig.params)) {
    const jsonData = storage.getDataFromLocalStorage(RTD_LOCAL_NAME);
    if (jsonData) {
      const parsedData = parseJson(jsonData);
      if (!parsedData) {
        return;
      }
      const userData = {name: 'blueconic', ...parsedData}
      logMessage('blueconicRtdProvider: userData: ', userData);
      const data = {
        ortb2: {
          user: {
            data: [
              userData
            ]
          }
        }
      }
      addRealTimeData(reqBidsConfigObj.ortb2Fragments?.global, data);
      onDone();
    }
  }
}

/**
 * Module init
 * @param {Object} provider
 * @param {Object} userConsent
 * @return {boolean}
 */
function init(provider, userConsent) {
  return true;
}

/** @type {RtdSubmodule} */
export const blueconicSubmodule = {
  name: SUBMODULE_NAME,
  getBidRequestData: getRealTimeData,
  init: init
};

submodule(MODULE_NAME, blueconicSubmodule);
