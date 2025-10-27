/**
 * This module adds browsi provider to the real time data module
 * The {@link module:modules/realTimeData} module is required
 * The module will fetch predictions from browsi server
 * The module will place browsi bootstrap script on page
 * @module modules/browsiProvider
 * @requires module:modules/realTimeData
 */

/**
 * @typedef {Object} ModuleParams
 * @property {string} siteKey
 * @property {string} pubKey
 * @property {string} url
 * @property {?string} keyName
 * @property {?string} splitKey
 */

import { deepClone, deepSetValue, isFn, isNumber, logError, logInfo, generateUUID, timestamp } from '../src/utils.js';
import { submodule } from '../src/hook.js';
import { ajaxBuilder } from '../src/ajax.js';
import { loadExternalScript } from '../src/adloader.js';
import { getStorageManager } from '../src/storageManager.js';

import { getGlobal } from '../src/prebidGlobal.js';
import * as events from '../src/events.js';
import { EVENTS } from '../src/constants.js';
import { MODULE_TYPE_RTD } from '../src/activities/modules.js';
import {
  getUUID,
  toUrlParams,
  getTargetingKeys,
  getTargetingValues,
  getPredictorData,
  generateRandomString,
  setKeyValue,
  getMacroId,
  getSlotByCode
} from '../libraries/browsiUtils/browsiUtils.js';

/**
 * @typedef {import('../modules/rtdModule/index.js').RtdSubmodule} RtdSubmodule
 */

const MODULE_NAME = 'browsi';

const storage = getStorageManager({ moduleType: MODULE_TYPE_RTD, moduleName: MODULE_NAME });
const RANDOM = Math.floor(Math.random() * 10) + 1;
const API_KEY = generateRandomString();
let PVID = getUUID();

/** @type {ModuleParams} */
let _moduleParams = {};
/** @type {null|Object} */
let _browsiData = null;
/** @type {null | function} */
let _dataReadyCallback = null;
/** @type {null|Object} */
const _ic = {};
/** @type {null|number} */
let TIMESTAMP = null;

export function setTimestamp() {
  TIMESTAMP = timestamp();
}

export function sendPageviewEvent(eventType) {
  if (eventType === 'PAGEVIEW') {
    window.addEventListener('browsi_pageview', () => {
      events.emit(EVENTS.BILLABLE_EVENT, {
        vendor: 'browsi',
        type: 'pageview',
        billingId: generateUUID()
      })
    })
  }
}

function sendModuleInitEvent(rsn) {
  events.emit(EVENTS.BROWSI_INIT, {
    moduleName: MODULE_NAME,
    sk: _moduleParams.siteKey,
    pk: _moduleParams.pubKey,
    t: TIMESTAMP,
    pvid: PVID,
    ...(rsn || {})
  });
}

function sendBrowsiDataEvent(data) {
  events.emit(EVENTS.BROWSI_DATA, {
    moduleName: MODULE_NAME,
    pvid: PVID || data.pvid,
    d: data.d,
    g: data.g,
    aid: data.aid,
    es: data.es,
    sk: _moduleParams.siteKey,
    pk: _moduleParams.pubKey,
    t: TIMESTAMP
  });
}

/**
 * collect required data from page
 * send data to browsi server to get predictions
 */
export function collectData() {
  const predictorData = getPredictorData(storage, _moduleParams, TIMESTAMP, PVID);
  getPredictionsFromServer(`//${_moduleParams.url}/prebid/v2?${toUrlParams(predictorData)}`);
}

export function setBrowsiData(data) {
  _browsiData = data;
  if (!PVID) { PVID = data.pvid; }
  if (isFn(_dataReadyCallback)) {
    _dataReadyCallback();
    _dataReadyCallback = null;
  }
}

/**
 * wait for data from server
 * call callback when data is ready
 * @param {function} callback
 */
function waitForData(callback) {
  if (_browsiData) {
    _dataReadyCallback = null;
    callback();
  } else {
    _dataReadyCallback = callback;
  }
}

/**
 * add browsi script to page
 * @param {Object} data
 */
export function addBrowsiTag(data) {
  const script = loadExternalScript(data.u, MODULE_TYPE_RTD, 'browsi');
  script.async = true;
  script.setAttribute('data-sitekey', _moduleParams.siteKey);
  script.setAttribute('data-pubkey', _moduleParams.pubKey);
  script.setAttribute('prebidbpt', 'true');
  script.setAttribute('id', 'browsi-tag');
  script.setAttribute('src', data.u);
  script.prebidData = deepClone(typeof data === 'string' ? Object(data) : data)
  script.brwRandom = RANDOM;
  Object.assign(script.prebidData, { pvid: PVID || data.pvid, t: TIMESTAMP, apik: API_KEY });
  if (_moduleParams.keyName) {
    script.prebidData.kn = _moduleParams.keyName;
  }
  return script;
}

/**
 * add browsitag to window object
 * @param {Object} data
 */
function setWindowBrowsiTag(data) {
  if (data.eap) {
    window.browsitag = window.browsitag || {};
    window.browsitag.cmd = window.browsitag.cmd || [];
    window.browsitag.data = window.browsitag.data || {};
    window.browsitag.data.get = getBrowsiTagServerData;
    window.dispatchEvent(new CustomEvent('browsiData', { detail: { isPartialData: true } }));
  }
}

function getBrowsiTagServerData(identifier) {
  const uc = identifier || 'placeholder';
  const rtd = getServerData([uc]);
  return Object.assign(rtd[uc], { isPartialData: true });
}

function getOnPageData(auc) {
  try {
    const dataMap = {};
    auc.forEach(uc => {
      dataMap[uc] = window[API_KEY]?.get(uc);
    });
    return dataMap;
  } catch (e) {
    return {};
  }
}

function getServerData(auc) {
  logInfo(`Browsi RTD provider is fetching data for ${auc}`);
  try {
    const _pg = (_browsiData && _browsiData.pg) || {};
    const _plc = (_browsiData && _browsiData.plc) || {};
    return auc.reduce((rp, uc) => {
      _ic[uc] = _ic[uc] || 0;
      const _c = _ic[uc];
      if (!uc) {
        return rp
      }
      rp[uc] = {};
      Object.assign(rp[uc], _pg);
      const adSlot = getSlotByCode(uc);
      const identifier = adSlot ? getMacroId(_browsiData['pmd'], adSlot) : uc;
      const _pd = _plc[identifier];
      if (!_pd) {
        return rp
      }
      Object.entries(_pd).forEach(([key, value]) => {
        const kv = getKVObject(key, getCurrentData(value, _c));
        Object.assign(rp[uc], kv);
      });
      return rp;
    }, {});
  } catch (e) {
    return {};
  }
}

/**
 * get prediction
 * return -1 if prediction not found
 * @param {object} prediction
 * @param {number} _c
 * @return {number}
 */
export function getCurrentData(prediction, _c) {
  if (!prediction || !isNumber(_c)) {
    return -1;
  }
  if (isNumber(prediction)) {
    return prediction;
  }
  if (isNumber(prediction[_c])) {
    return prediction[_c];
  }
  if (Object.keys(prediction).length > 1) {
    while (_c > 0) {
      _c--;
      if (isNumber(prediction[_c])) {
        return prediction[_c];
      }
    }
  }
  return -1;
}

/**
 * get prediction and return valid object for key value set
 * @param {string} k
 * @param {number} p
 * @return {Object} key:value
 */
function getKVObject(k, p) {
  if (p < 0) return {};
  return { [k]: p };
}

/**
 * XMLHttpRequest to get data form browsi server
 * @param {string} url server url with query params
 */
function getPredictionsFromServer(url) {
  const ajax = ajaxBuilder();

  ajax(url,
    {
      success: function (response, req) {
        if (req.status === 200) {
          try {
            const data = JSON.parse(response);
            if (data) {
              setBrowsiData(data);
              setWindowBrowsiTag(data);
              sendBrowsiDataEvent(data);
            } else {
              setBrowsiData({});
            }
            sendPageviewEvent(data.bet);
            addBrowsiTag(data);
          } catch (err) {
            logError('unable to parse data');
            setBrowsiData({})
          }
        } else if (req.status === 204) {
          // unrecognized site key
          setBrowsiData({});
        }
      },
      error: function () {
        setBrowsiData({});
        logError('unable to get prediction data');
      }
    }
  );
}

function mergeAdUnitData(rtdData = {}, onPageData = {}) {
  const mergedData = {};
  Object.keys({ ...rtdData, ...onPageData }).forEach((key) => {
    mergedData[key] = { ...onPageData[key], ...rtdData[key] };
  });
  return mergedData;
}

function getAdUnitCodes(bidObj) {
  let adUnitCodes = bidObj.adUnitCodes;
  let adUnits = bidObj.adUnits || getGlobal().adUnits || [];
  if (adUnitCodes) {
    adUnits = adUnits.filter(au => adUnitCodes.includes(au.code));
  } else {
    adUnitCodes = adUnits.map(au => au.code);
  }
  return { adUnitCodes, adUnits };
}

function isOnPageDataApiReady() {
  return !!(window[API_KEY]?.get);
}

function onDataReady() {
  return new Promise((resolve) => {
    waitForData(() => {
      if (isOnPageDataApiReady()) {
        return resolve();
      }
      const interval = setInterval(() => {
        if (isOnPageDataApiReady()) {
          clearInterval(interval);
          return resolve();
        }
      }, 250);
    });
  });
}

function onTimeout(config, timeout) {
  return new Promise((resolve) => {
    if (!config.waitForIt || !timeout) {
      return resolve();
    }
    setTimeout(() => {
      return resolve();
    }, timeout * 0.7);
  });
}

function setBidRequestsData(bidObj, callback, config, userConsent, timeout) {
  Promise.race([onDataReady(), onTimeout(config, timeout)])
    .then(() => {
      const pr = _browsiData && _browsiData.pr;
      if (!pr || !pr.length) return;
      const { adUnitCodes, adUnits } = getAdUnitCodes(bidObj);
      const onPageData = getOnPageData(adUnitCodes);
      const rtdData = getServerData(adUnitCodes);
      const data = mergeAdUnitData(rtdData, onPageData);
      adUnits.forEach(adUnit => {
        const validBidders = adUnit.bids.filter(bid => pr.includes(bid.bidder));
        if (validBidders.length) {
          const adUnitData = data[adUnit.code];
          if (adUnitData) {
            validBidders.forEach(bid => {
              deepSetValue(bid, 'ortb2Imp.ext.data.browsi', adUnitData);
            });
          }
        }
      });
      callback();
    });
}

function getGptTargeting(uc) {
  try {
    const sg = !!(_browsiData && _browsiData.sg);
    if (!sg) return {};

    const rtd = getServerData(uc);
    const { viewabilityKey, scrollKey, revenueKey } = getTargetingKeys(_moduleParams['keyName']);

    return Object.fromEntries(
      Object.entries(rtd).map(([key, value]) => {
        const { viewabilityValue, scrollValue, revenueValue } = getTargetingValues(value);
        const result = {
          ...(viewabilityValue ? { [viewabilityKey]: viewabilityValue } : {}),
          ...(scrollValue ? { [scrollKey]: scrollValue } : {}),
          ...(revenueValue ? { [revenueKey]: revenueValue } : {}),
        }
        return [key, result];
      })
    );
  } catch (e) {
    return {};
  }
}

function getTargetingData(uc, c, us, a) {
  const targetingData = getGptTargeting(uc);
  const auctionId = a.auctionId;
  const sendAdRequestEvent = (_browsiData && _browsiData['bet'] === 'AD_REQUEST');
  uc.forEach(auc => {
    if (isNumber(_ic[auc])) {
      _ic[auc] = _ic[auc] + 1;
    }
    if (sendAdRequestEvent) {
      const transactionId = a.adUnits.find(adUnit => adUnit.code === auc).transactionId;
      events.emit(EVENTS.BILLABLE_EVENT, {
        vendor: 'browsi',
        type: 'adRequest',
        billingId: generateUUID(),
        transactionId: transactionId,
        auctionId: auctionId
      })
    }
  });
  logInfo('Browsi RTD provider returned targeting data', targetingData, 'for', uc)
  return targetingData;
}

function init(moduleConfig) {
  _moduleParams = moduleConfig.params;
  _moduleParams.siteKey = moduleConfig.params.siteKey || moduleConfig.params.sitekey;
  _moduleParams.pubKey = moduleConfig.params.pubKey || moduleConfig.params.pubkey;
  setTimestamp();
  if (_moduleParams && _moduleParams.siteKey && _moduleParams.pubKey && _moduleParams.url) {
    sendModuleInitEvent();
    collectData();
    setKeyValue(_moduleParams.splitKey, RANDOM);
  } else {
    logError('missing params for Browsi provider');
    sendModuleInitEvent('missing params');
  }
  return true;
}

/** @type {RtdSubmodule} */
export const browsiSubmodule = {
  /**
   * used to link submodule with realTimeData
   * @type {string}
   */
  name: MODULE_NAME,
  /**
   * get data and send back to realTimeData module
   * @function
   * @param {string[]} adUnitsCodes
   */
  getTargetingData: getTargetingData,
  init: init,
  getBidRequestData: setBidRequestsData
};

function registerSubModule() {
  submodule('realTimeData', browsiSubmodule);
}
registerSubModule();
