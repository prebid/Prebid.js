/**
 * This module adds the blueconic provider to the real time data module
 * The {@link module:modules/realTimeData} module is required
 * The module will fetch real-time data from Blueconic
 * @module modules/blueconicRtdProvider
 * @requires module:modules/realTimeData
 */

import {config} from '../src/config.js';
import {getStorageManager} from '../src/storageManager.js';
import {submodule} from '../src/hook.js';
import {mergeDeep, isPlainObject, logMessage, logError} from '../src/utils.js';

const MODULE_NAME = 'realTimeData';
const SUBMODULE_NAME = 'blueconic';

export const RTD_LOCAL_NAME = 'bcPrebidData';

export const storage = getStorageManager({moduleName: SUBMODULE_NAME});

/**
 * Lazy merge objects.
 * @param {Object} target
 * @param {Object} source
 */
function mergeLazy(target, source) {
  if (!isPlainObject(target)) {
    target = {};
  }

  if (!isPlainObject(source)) {
    source = {};
  }

  return mergeDeep(target, source);
}

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
 * @param {Object} bidConfig
 * @param {Object} rtd
 * @param {Object} rtdConfig
 */
export function addRealTimeData(rtd) {
  if (isPlainObject(rtd.ortb2)) {
    let ortb2 = config.getConfig('ortb2') || {};
    config.setConfig({ortb2: mergeLazy(ortb2, rtd.ortb2)});
  }
}

/**
 * Real-time data retrieval from BlueConic
 * @param {Object} reqBidsConfigObj
 * @param {function} onDone
 * @param {Object} rtdConfig
 * @param {Object} userConsent
 */
export function getRealTimeData(bidConfig, onDone, rtdConfig, userConsent) {
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
      addRealTimeData(data);
      onDone();
    }
  }
}

/**
 * Module init
 * @param {Object} provider
 * @param {Objkect} userConsent
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
