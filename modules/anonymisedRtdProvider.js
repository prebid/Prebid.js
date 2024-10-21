/**
 * This module adds the Anonymised RTD provider to the real time data module
 * The {@link module:modules/realTimeData} module is required
 * The module will populate real-time data from Anonymised
 * @module modules/anonymisedRtdProvider
 * @requires module:modules/realTimeData
 */
import {getStorageManager} from '../src/storageManager.js';
import {submodule} from '../src/hook.js';
import {isPlainObject, mergeDeep, logMessage, logError} from '../src/utils.js';
import {MODULE_TYPE_RTD} from '../src/activities/modules.js';

export function createRtdProvider(moduleName) {
  const MODULE_NAME = 'realTimeData';
  const SUBMODULE_NAME = moduleName;

  const storage = getStorageManager({ moduleType: MODULE_TYPE_RTD, moduleName: SUBMODULE_NAME });
  /**
   * Add real-time data & merge segments.
   * @param ortb2 object to merge into
   * @param {Object} rtd
   */
  function addRealTimeData(ortb2, rtd) {
    if (isPlainObject(rtd.ortb2)) {
      logMessage(`${SUBMODULE_NAME}RtdProvider: merging original: `, ortb2);
      logMessage(`${SUBMODULE_NAME}RtdProvider: merging in: `, rtd.ortb2);
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
      logError(`${SUBMODULE_NAME}RtdProvider: failed to parse json:`, data);
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
  function getRealTimeData(reqBidsConfigObj, onDone, rtdConfig, userConsent) {
    if (rtdConfig && isPlainObject(rtdConfig.params)) {
      const cohortStorageKey = rtdConfig.params.cohortStorageKey;
      const bidders = rtdConfig.params.bidders;

      if (cohortStorageKey !== 'cohort_ids') {
        logError(`${SUBMODULE_NAME}RtdProvider: 'cohortStorageKey' should be 'cohort_ids'`)
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

        logMessage(`${SUBMODULE_NAME}RtdProvider: user.data.segment: `, udSegment);
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

        if (bidders?.includes('appnexus')) {
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
  const rtdSubmodule = {
    name: SUBMODULE_NAME,
    getBidRequestData: getRealTimeData,
    init: init
  };

  submodule(MODULE_NAME, rtdSubmodule);

  return {
    getRealTimeData,
    rtdSubmodule,
    storage
  };
}

export const { getRealTimeData, rtdSubmodule: anonymisedRtdSubmodule, storage } = createRtdProvider('anonymised');
