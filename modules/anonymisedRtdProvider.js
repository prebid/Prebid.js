/**
 * This module adds the Anonymised RTD provider to the real time data module
 * The {@link module:modules/realTimeData} module is required
 * The module will populate real-time data from Anonymised
 * @module modules/anonymisedRtdProvider
 * @requires module:modules/realTimeData
 */
import {getStorageManager} from '../src/storageManager.js';
import {submodule} from '../src/hook.js';
import {isPlainObject, mergeDeep, logMessage, logWarn, logError} from '../src/utils.js';
import {MODULE_TYPE_RTD} from '../src/activities/modules.js';
import {loadExternalScript} from '../src/adloader.js';
/**
 * @typedef {import('../modules/rtdModule/index.js').RtdSubmodule} RtdSubmodule
 */
export function createRtdProvider(moduleName) {
  const MODULE_NAME = 'realTimeData';
  const SUBMODULE_NAME = moduleName;
  const GVLID = 1116;
  const MARKETING_TAG_URL = 'https://static.anonymised.io/light/loader.js';

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
   * Load the Anonymised Marketing Tag script
   * @param {Object} config
   */
  function tryLoadMarketingTag(config) {
    const clientId = config?.params?.tagConfig?.clientId;
    if (typeof clientId !== 'string' || !clientId.trim()) {
      logWarn(`${SUBMODULE_NAME}RtdProvider: clientId missing or invalid; Marketing Tag not loaded.`);
      return;
    }
    logMessage(`${SUBMODULE_NAME}RtdProvider: Loading Marketing Tag`);
    // Check if the script is already loaded
    if (document.querySelector(`script[src*="${config.params.tagUrl ?? MARKETING_TAG_URL}"]`)) {
      logMessage(`${SUBMODULE_NAME}RtdProvider: Marketing Tag already loaded`);
      return;
    }
    const tagConfig = config.params?.tagConfig ? {...config.params.tagConfig, idw_client_id: config.params.tagConfig.clientId} : {};
    delete tagConfig.clientId;

    const tagUrl = config.params.tagUrl ? config.params.tagUrl : `${MARKETING_TAG_URL}?ref=prebid`;

    loadExternalScript(tagUrl, MODULE_TYPE_RTD, SUBMODULE_NAME, () => {
      logMessage(`${SUBMODULE_NAME}RtdProvider: Marketing Tag loaded successfully`);
    }, document, tagConfig);
  }

  /**
   * Real-time data retrieval from Anonymised
   * @param {Object} reqBidsConfigObj
   * @param {function} onDone
   * @param {Object} config
   * @param {Object} userConsent
   */
  function getRealTimeData(reqBidsConfigObj, onDone, config, userConsent) {
    if (config && isPlainObject(config.params)) {
      const cohortStorageKey = config.params.cohortStorageKey;
      const bidders = config.params.bidders;

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
            segtax: config.params.segtax
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
      }
    }
  }
  /**
   * Module init
   * @param {Object} config
   * @param {Object} userConsent
   * @return {boolean}
   */
  function init(config, userConsent) {
    tryLoadMarketingTag(config);
    return true;
  }
  /** @type {RtdSubmodule} */
  const rtdSubmodule = {
    name: SUBMODULE_NAME,
    gvlid: GVLID,
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
