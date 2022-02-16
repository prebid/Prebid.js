/**
 * This module adds the ID Ward RTD provider to the real time data module
 * The {@link module:modules/realTimeData} module is required
 * The module will poulate real-time data from ID Ward
 * @module modules/idWardRtdProvider
 * @requires module:modules/realTimeData
 */
import {config} from '../src/config.js';
import {getStorageManager} from '../src/storageManager.js';
import {submodule} from '../src/hook.js';
import {isPlainObject, mergeDeep, logMessage, logError} from '../src/utils.js';

const MODULE_NAME = 'realTimeData';
const SUBMODULE_NAME = 'idWard';

export const storage = getStorageManager(null, SUBMODULE_NAME);

/**
  * Lazy merge objects.
  * @param {String} target
  * @param {String} source
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
  * Add real-time data & merge segments.
  * @param {Object} rtd
  */
function addRealTimeData(rtd) {
  if (isPlainObject(rtd.ortb2)) {
    const ortb2 = config.getConfig('ortb2') || {};
    logMessage('idWardRtdProvider: merging original: ', ortb2);
    logMessage('idWardRtdProvider: merging in: ', rtd.ortb2);
    config.setConfig({ortb2: mergeLazy(ortb2, rtd.ortb2)});
  }
}

function tryParse(data) {
  try {
    return JSON.parse(data);
  } catch (err) {
    logError(`idWardRtdProvider: failed to parse json:`, data);
    return null;
  }
}

/**
  * Real-time data retrieval from Audigent
  * @param {Object} reqBidsConfigObj
  * @param {function} onDone
  * @param {Object} rtdConfig
  * @param {Object} userConsent
  */
export function getRealTimeData(reqBidsConfigObj, onDone, rtdConfig, userConsent) {
  if (rtdConfig && isPlainObject(rtdConfig.params)) {
    const jsonData = storage.getDataFromLocalStorage(rtdConfig.params.cohortStorageKey)

    if (!jsonData) {
      return;
    }

    const segments = tryParse(jsonData);

    if (segments) {
      const udSegment = {
        name: 'id-ward.com',
        ext: {
          segtax: rtdConfig.params.segtax
        },
        segment: segments.map(x => ({id: x}))
      }

      logMessage('idWardRtdProvider: user.data.segment: ', udSegment);
      const data = {
        rtd: {
          ortb2: {
            user: {
              data: [
                udSegment
              ]
            }
          }
        }
      };
      addRealTimeData(data.rtd);
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
export const idWardRtdSubmodule = {
  name: SUBMODULE_NAME,
  getBidRequestData: getRealTimeData,
  init: init
};

submodule(MODULE_NAME, idWardRtdSubmodule);
