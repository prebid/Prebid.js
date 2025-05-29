/**
 * This module adds the Audigent Hadron provider to the real time data module
 * The {@link module:modules/realTimeData} module is required
 * The module will fetch real-time data from Audigent
 * @module modules/hadronRtdProvider
 * @requires module:modules/realTimeData
 */
import {config} from '../src/config.js';
import {getGlobal} from '../src/prebidGlobal.js';
import {getStorageManager} from '../src/storageManager.js';
import {submodule} from '../src/hook.js';
import {isFn, isStr, isArray, deepEqual, isPlainObject, logInfo} from '../src/utils.js';
import {loadExternalScript} from '../src/adloader.js';
import {MODULE_TYPE_RTD} from '../src/activities/modules.js';

/**
 * @typedef {import('../modules/rtdModule/index.js').RtdSubmodule} RtdSubmodule
 */

const LOG_PREFIX = '[HadronRtdProvider] ';
const MODULE_NAME = 'realTimeData';
const SUBMODULE_NAME = 'hadron';
const AU_GVLID = 561;
const HADRON_JS_URL = 'https://cdn.hadronid.net/hadron.js';
const LS_TAM_KEY = 'auHadronId';
const RTD_LOCAL_NAME = 'auHadronRtd';
export const storage = getStorageManager({moduleType: MODULE_TYPE_RTD, moduleName: SUBMODULE_NAME});

/**
 * @param {string} url
 * @param {string} params
 * @returns {string}
 */
const urlAddParams = (url, params) => {
  return url + (url.indexOf('?') > -1 ? '&' : '?') + params
};

/**
 * Deep object merging with array deduplication.
 * @param {Object} target
 * @param {Object} sources
 */
function mergeDeep(target, ...sources) {
  if (!sources.length) return target;
  const source = sources.shift();

  if (isPlainObject(target) && isPlainObject(source)) {
    for (const key in source) {
      if (isPlainObject(source[key])) {
        if (!target[key]) Object.assign(target, {[key]: {}});
        mergeDeep(target[key], source[key]);
      } else if (isArray(source[key])) {
        if (!target[key]) {
          Object.assign(target, {[key]: source[key]});
        } else if (isArray(target[key])) {
          source[key].forEach(obj => {
            let e = 1;
            for (let i = 0; i < target[key].length; i++) {
              if (deepEqual(target[key][i], obj)) {
                e = 0;
                break;
              }
            }
            if (e) {
              target[key].push(obj);
            }
          });
        }
      } else {
        Object.assign(target, {[key]: source[key]});
      }
    }
  }

  return mergeDeep(target, ...sources);
}

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
 * Param or default.
 * @param {String|Function} param
 * @param {String} defaultVal
 * @param {Object} arg
 */
function paramOrDefault(param, defaultVal, arg) {
  if (isFn(param)) {
    return param(arg);
  } else if (isStr(param)) {
    return param;
  }
  return defaultVal;
}

/**
 * Add real-time data & merge segments.
 * @param {Object} bidConfig
 * @param {Object} rtd
 * @param {Object} rtdConfig
 */
export function addRealTimeData(bidConfig, rtd, rtdConfig) {
  if (rtdConfig.params && rtdConfig.params.handleRtd) {
    rtdConfig.params.handleRtd(bidConfig, rtd, rtdConfig, config);
  } else {
    if (isPlainObject(rtd.ortb2)) {
      mergeLazy(bidConfig.ortb2Fragments?.global, rtd.ortb2);
    }

    if (isPlainObject(rtd.ortb2b)) {
      mergeLazy(bidConfig.ortb2Fragments?.bidder, Object.fromEntries(Object.entries(rtd.ortb2b).map(([_, cfg]) => [_, cfg.ortb2])));
    }
  }
}

/**
 * Real-time data retrieval from Audigent
 * @param {Object} bidConfig
 * @param {function} onDone
 * @param {Object} rtdConfig
 * @param {Object} userConsent
 */
export function getRealTimeData(bidConfig, onDone, rtdConfig, userConsent) {
  if (!storage.getDataFromLocalStorage(LS_TAM_KEY)) {
    const partnerId = rtdConfig.params.partnerId | 0;
    const hadronIdUrl = rtdConfig.params && rtdConfig.params.hadronIdUrl;
    const scriptUrl = urlAddParams(
      paramOrDefault(hadronIdUrl, HADRON_JS_URL, {}),
      `partner_id=${partnerId}&_it=prebid`
    );
    loadExternalScript(scriptUrl, MODULE_TYPE_RTD, SUBMODULE_NAME, () => {
      logInfo(LOG_PREFIX, 'hadronId JS snippet loaded', scriptUrl);
    })
  }
  if (rtdConfig && isPlainObject(rtdConfig.params) && rtdConfig.params.segmentCache) {
    let jsonData = storage.getDataFromLocalStorage(RTD_LOCAL_NAME);

    if (jsonData) {
      let data = JSON.parse(jsonData);

      if (data.rtd) {
        addRealTimeData(bidConfig, data.rtd, rtdConfig);
        onDone();
        return;
      }
    }
  }

  const userIds = {};

  const allUserIds = getGlobal().getUserIds();
  if (allUserIds.hasOwnProperty('hadronId')) {
    userIds['hadronId'] = allUserIds.hadronId;
    logInfo(LOG_PREFIX, 'hadronId user module found', allUserIds.hadronId);
  } else {
    let hadronId = storage.getDataFromLocalStorage(LS_TAM_KEY);
    if (isStr(hadronId) && hadronId.length > 0) {
      userIds['hadronId'] = hadronId;
      logInfo(LOG_PREFIX, 'hadronId TAM found', hadronId);
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
export const hadronSubmodule = {
  name: SUBMODULE_NAME,
  getBidRequestData: getRealTimeData,
  init: init,
  gvlid: AU_GVLID,
};

submodule(MODULE_NAME, hadronSubmodule);
