/**
 * This module adds the Audigent Halo provider to the real time data module
 * The {@link module:modules/realTimeData} module is required
 * The module will fetch real-time data from Audigent
 * @module modules/haloRtdProvider
 * @requires module:modules/realTimeData
 */
import {ajax} from '../src/ajax.js';
import {config} from '../src/config.js';
import {getGlobal} from '../src/prebidGlobal.js';
import {getStorageManager} from '../src/storageManager.js';
import {submodule} from '../src/hook.js';
import {isFn, isStr, isArray, deepEqual, isPlainObject, logError} from '../src/utils.js';

const MODULE_NAME = 'realTimeData';
const SUBMODULE_NAME = 'halo';
const AU_GVLID = 561;

export const HALOID_LOCAL_NAME = 'auHaloId';
export const RTD_LOCAL_NAME = 'auHaloRtd';
export const storage = getStorageManager({gvlid: AU_GVLID, moduleName: SUBMODULE_NAME});

/**
 * Deep set an object unless value present.
 * @param {Object} obj
 * @param {String} path
 * @param {Object} val
 */
function set(obj, path, val) {
  const keys = path.split('.');
  const lastKey = keys.pop();
  const lastObj = keys.reduce((obj, key) => obj[key] = obj[key] || {}, obj);
  lastObj[lastKey] = lastObj[lastKey] || val;
}

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
        if (!target[key]) Object.assign(target, { [key]: {} });
        mergeDeep(target[key], source[key]);
      } else if (isArray(source[key])) {
        if (!target[key]) {
          Object.assign(target, { [key]: source[key] });
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
        Object.assign(target, { [key]: source[key] });
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
 * @param {String} param
 * @param {String} defaultVal
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
      let ortb2 = config.getConfig('ortb2') || {};
      config.setConfig({ortb2: mergeLazy(ortb2, rtd.ortb2)});
    }

    if (isPlainObject(rtd.ortb2b)) {
      let bidderConfig = config.getBidderConfig();

      Object.keys(rtd.ortb2b).forEach(bidder => {
        let rtdOptions = rtd.ortb2b[bidder] || {};

        let bidderOptions = {};
        if (isPlainObject(bidderConfig[bidder])) {
          bidderOptions = bidderConfig[bidder];
        }

        config.setBidderConfig({
          bidders: [bidder],
          config: mergeLazy(bidderOptions, rtdOptions)
        });
      });
    }
  }
}

/**
 * Real-time data retrieval from Audigent
 * @param {Object} reqBidsConfigObj
 * @param {function} onDone
 * @param {Object} rtdConfig
 * @param {Object} userConsent
 */
export function getRealTimeData(bidConfig, onDone, rtdConfig, userConsent) {
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

  const userIds = (getGlobal()).getUserIds();

  let haloId = storage.getDataFromLocalStorage(HALOID_LOCAL_NAME);
  if (isStr(haloId)) {
    (getGlobal()).refreshUserIds({submoduleNames: 'haloId'});
    userIds.haloId = haloId;
    getRealTimeDataAsync(bidConfig, onDone, rtdConfig, userConsent, userIds);
  } else {
    var script = document.createElement('script');
    script.type = 'text/javascript';

    window.pubHaloCb = (haloId) => {
      userIds.haloId = haloId;
      getRealTimeDataAsync(bidConfig, onDone, rtdConfig, userConsent, userIds);
    }

    const haloIdUrl = rtdConfig.params && rtdConfig.params.haloIdUrl;
    script.src = paramOrDefault(haloIdUrl, 'https://id.halo.ad.gt/api/v1/haloid', userIds);
    document.getElementsByTagName('head')[0].appendChild(script);
  }
}

/**
 * Async rtd retrieval from Audigent
 * @param {function} onDone
 * @param {Object} rtdConfig
 * @param {Object} userConsent
 * @param {Object} userIds
 */
export function getRealTimeDataAsync(bidConfig, onDone, rtdConfig, userConsent, userIds) {
  let reqParams = {};

  if (isPlainObject(rtdConfig)) {
    set(rtdConfig, 'params.requestParams.ortb2', config.getConfig('ortb2'));
    reqParams = rtdConfig.params.requestParams;
  }

  if (isPlainObject(window.pubHaloPm)) {
    reqParams.pubHaloPm = window.pubHaloPm;
  }

  const url = `https://seg.halo.ad.gt/api/v1/rtd`;
  ajax(url, {
    success: function (response, req) {
      if (req.status === 200) {
        try {
          const data = JSON.parse(response);
          if (data && data.rtd) {
            addRealTimeData(bidConfig, data.rtd, rtdConfig);
            onDone();
            storage.setDataInLocalStorage(RTD_LOCAL_NAME, JSON.stringify(data));
          } else {
            onDone();
          }
        } catch (err) {
          logError('unable to parse audigent segment data');
          onDone();
        }
      } else if (req.status === 204) {
        // unrecognized partner config
        onDone();
      }
    },
    error: function () {
      onDone();
      logError('unable to get audigent segment data');
    }
  },
  JSON.stringify({'userIds': userIds, 'config': reqParams}),
  {contentType: 'application/json'}
  );
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
export const haloSubmodule = {
  name: SUBMODULE_NAME,
  getBidRequestData: getRealTimeData,
  init: init
};

submodule(MODULE_NAME, haloSubmodule);
