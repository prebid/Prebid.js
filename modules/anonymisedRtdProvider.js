/**
 * This module adds the Anonymised RTD provider to the real time data module
 * The {@link module:modules/realTimeData} module is required
 * The module will poulate real-time data from Anonymised
 * @module modules/anonymisedRtdProvider
 * @requires module:modules/realTimeData
 */
import {getStorageManager} from '../src/storageManager.js';
import {submodule} from '../src/hook.js';
import {isPlainObject, mergeDeep, logMessage, logError, logWarn} from '../src/utils.js';
import {MODULE_TYPE_RTD} from '../src/activities/modules.js';

const MODULE_NAME = 'realTimeData';
const SUBMODULE_NAME = 'anonymised';

export const storage = getStorageManager({moduleType: MODULE_TYPE_RTD, moduleName: SUBMODULE_NAME});
/**
 * Add real-time data & merge segments.
 * @param ortb2 object to merge into
 * @param {Object} rtd
 */
function addRealTimeData(ortb2, rtd) {
  if (isPlainObject(rtd.ortb2)) {
    logMessage('anonymisedRtdProvider: merging original: ', ortb2);
    logMessage('anonymisedRtdProvider: merging in: ', rtd.ortb2);
    mergeDeep(ortb2, rtd.ortb2);
  }
}

/**
  * Try parsing stringified array of segment IDs.
  * @param {String} data
  */
function tryParse(data) {
  try {
    return JSON.parse(data);
  } catch (err) {
    logError(`anonymisedRtdProvider: failed to parse json:`, data);
    return null;
  }
}

/**
  * Real-time data retrieval from Anonymised
  * @param {Object} reqBidsConfigObj
  * @param {function} onDone
  * @param {Object} rtdConfig
  * @param {Object} userConsent
  */
export function getRealTimeData(reqBidsConfigObj, onDone, rtdConfig, userConsent) {
  if (rtdConfig && isPlainObject(rtdConfig.params)) {
    const cohortStorageKey = rtdConfig.params.cohortStorageKey;
    const bidders = rtdConfig.params.bidders;

    if (!bidders || bidders.length === 0 || !cohortStorageKey || cohortStorageKey.length === 0) {
      logWarn('anonymisedRtdProvider: missing required params')
      return;
    }

    const jsonData = storage.getDataFromLocalStorage(cohortStorageKey);
    if (!jsonData) {
      return;
    }

    const segments = tryParse(jsonData);

    if (segments) {
      const udSegment = {
        name: 'anonymised.io',
        ext: {
          segtax: rtdConfig.params.segtax
        },
        segment: segments.map(x => ({id: x}))
      }

      logMessage('anonymisedRtdProvider: user.data.segment: ', udSegment);
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

      if (bidders.includes('appnexus')) {
        data.rtd.ortb2.user.keywords = segments.map(x => `perid=${x}`).join(',');
      }

      addRealTimeData(reqBidsConfigObj.ortb2Fragments?.global, data.rtd);
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
export const anonymisedRtdSubmodule = {
  name: SUBMODULE_NAME,
  getBidRequestData: getRealTimeData,
  init: init
};

submodule(MODULE_NAME, anonymisedRtdSubmodule);
