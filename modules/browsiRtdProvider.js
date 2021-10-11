/**
 * This module adds browsi provider to the eal time data module
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
 */

import { deepClone, logError, isGptPubadsDefined, isNumber, isFn, deepSetValue } from '../src/utils.js';
import {submodule} from '../src/hook.js';
import {ajaxBuilder} from '../src/ajax.js';
import {loadExternalScript} from '../src/adloader.js';
import {getStorageManager} from '../src/storageManager.js';
import find from 'core-js-pure/features/array/find.js';
import {getGlobal} from '../src/prebidGlobal.js';
import includes from 'core-js-pure/features/array/includes.js';

const storage = getStorageManager();

/** @type {ModuleParams} */
let _moduleParams = {};
/** @type {null|Object} */
let _predictionsData = null;
/** @type {string} */
const DEF_KEYNAME = 'browsiViewability';
/** @type {null | function} */
let _dataReadyCallback = null;
/** @type {null|Object} */
let _refreshCounter = {};

/**
 * add browsi script to page
 * @param {Object} data
 */
export function addBrowsiTag(data) {
  let script = loadExternalScript(data.u, 'browsi');
  script.async = true;
  script.setAttribute('data-sitekey', _moduleParams.siteKey);
  script.setAttribute('data-pubkey', _moduleParams.pubKey);
  script.setAttribute('prebidbpt', 'true');
  script.setAttribute('id', 'browsi-tag');
  script.setAttribute('src', data.u);
  script.prebidData = deepClone(data);
  if (_moduleParams.keyName) {
    script.prebidData.kn = _moduleParams.keyName;
  }
  return script;
}

/**
 * collect required data from page
 * send data to browsi server to get predictions
 */
export function collectData() {
  const win = window.top;
  const doc = win.document;
  let browsiData = null;
  try {
    browsiData = storage.getDataFromLocalStorage('__brtd');
  } catch (e) {
    logError('unable to parse __brtd');
  }

  let predictorData = {
    ...{
      sk: _moduleParams.siteKey,
      sw: (win.screen && win.screen.width) || -1,
      sh: (win.screen && win.screen.height) || -1,
      url: `${doc.location.protocol}//${doc.location.host}${doc.location.pathname}`,
    },
    ...(browsiData ? {us: browsiData} : {us: '{}'}),
    ...(document.referrer ? {r: document.referrer} : {}),
    ...(document.title ? {at: document.title} : {})
  };
  getPredictionsFromServer(`//${_moduleParams.url}/prebid?${toUrlParams(predictorData)}`);
}

/**
 * wait for data from server
 * call callback when data is ready
 * @param {function} callback
 */
function waitForData(callback) {
  if (_predictionsData) {
    _dataReadyCallback = null;
    callback(_predictionsData);
  } else {
    _dataReadyCallback = callback;
  }
}

export function setData(data) {
  _predictionsData = data;
  if (isFn(_dataReadyCallback)) {
    _dataReadyCallback(_predictionsData);
    _dataReadyCallback = null;
  }
}

function getViewabilityByAdUnitCodes(adUnitsCodes) {
  try {
    const _predictions = (_predictionsData && _predictionsData.p) || {};
    return adUnitsCodes.reduce((rp, adUnitCode) => {
      _refreshCounter[adUnitCode] = _refreshCounter[adUnitCode] || 0;
      const refreshCount = _refreshCounter[adUnitCode];
      if (!adUnitCode) {
        return rp
      }
      const adSlot = getSlotByCode(adUnitCode);
      const identifier = adSlot ? getMacroId(_predictionsData['pmd'], adSlot) : adUnitCode;
      const predictionData = _predictions[identifier];
      rp[adUnitCode] = getKVObject(-1);
      if (!predictionData) {
        return rp
      }
      if (predictionData.ps) {
        if (!isIdMatchingAdUnit(adSlot, predictionData.w)) {
          return rp;
        }
        rp[adUnitCode] = getKVObject(getPredictionByRefreshCount(predictionData.ps, refreshCount));
      }
      return rp;
    }, {});
  } catch (e) {
    return {};
  }
}

/**
 * get prediction according to refresh count
 * return -1 if prediction not found
 * @param {object} predictionObject
 * @param {number} refreshCount
 * @return {number}
 */
export function getPredictionByRefreshCount(predictionObject, refreshCount) {
  if (!predictionObject || !isNumber(refreshCount)) {
    return -1;
  }
  if (isNumber(predictionObject[refreshCount])) {
    return predictionObject[refreshCount];
  }
  if (Object.keys(predictionObject).length > 1) {
    while (refreshCount > 0) {
      refreshCount--;
      if (isNumber(predictionObject[refreshCount])) {
        return predictionObject[refreshCount];
      }
    }
  }
  return -1;
}

/**
 * get all slots on page
 * @return {Object[]} slot GoogleTag slots
 */
function getAllSlots() {
  return isGptPubadsDefined() && window.googletag.pubads().getSlots();
}
/**
 * get prediction and return valid object for key value set
 * @param {number} p
 * @param {string?} keyName
 * @return {Object} key:value
 */
function getKVObject(p) {
  const prValue = p < 0 ? 'NA' : (Math.floor(p * 10) / 10).toFixed(2);
  let prObject = {};
  prObject[getViewabilityKey()] = prValue.toString();
  return prObject;
}

function getViewabilityKey() {
  return ((_moduleParams['keyName'] || (_predictionsData && _predictionsData['kn']) || DEF_KEYNAME).toString())
}
/**
 * check if placement id matches one of given ad units
 * @param {Object} slot google slot
 * @param {string[]} whitelist ad units
 * @return {boolean}
 */
export function isIdMatchingAdUnit(slot, whitelist) {
  if (!whitelist || !whitelist.length || !slot) {
    return true;
  }
  const slotAdUnits = slot.getAdUnitPath();
  return whitelist.indexOf(slotAdUnits) !== -1;
}

/**
 * get GPT slot by placement id
 * @param {string} code placement id
 * @return {?Object}
 */
function getSlotByCode(code) {
  const slots = getAllSlots();
  if (!slots || !slots.length) {
    return null;
  }
  return find(slots, s => s.getSlotElementId() === code || s.getAdUnitPath() === code) || null;
}

/**
 * generate id according to macro script
 * @param {Object} macro replacement macro
 * @param {Object} slot google slot
 * @return {?Object}
 */
export function getMacroId(macro, slot) {
  if (macro) {
    try {
      const macroResult = evaluate(macro, slot.getSlotElementId(), slot.getAdUnitPath(), (match, p1) => {
        return (p1 && slot.getTargeting(p1).join('_')) || 'NA';
      });
      return macroResult;
    } catch (e) {
      logError(`failed to evaluate: ${macro}`);
    }
  }
  return slot.getSlotElementId();
}

function evaluate(macro, divId, adUnit, replacer) {
  let macroResult = macro.p
    .replace(/['"]+/g, '')
    .replace(/<DIV_ID>/g, divId);

  if (adUnit) {
    macroResult = macroResult.replace(/<AD_UNIT>/g, adUnit);
  }
  if (replacer) {
    macroResult = macroResult.replace(/<KEY_(\w+)>/g, replacer);
  }
  if (macro.s) {
    macroResult = macroResult.substring(macro.s.s, macro.s.e);
  }
  return macroResult;
}
/**
 * XMLHttpRequest to get data form browsi server
 * @param {string} url server url with query params
 */
function getPredictionsFromServer(url) {
  let ajax = ajaxBuilder();

  ajax(url,
    {
      success: function (response, req) {
        if (req.status === 200) {
          try {
            const data = JSON.parse(response);
            if (data && data.p && data.kn) {
              setData({p: data.p, kn: data.kn, pmd: data.pmd});
            } else {
              setData({});
            }
            addBrowsiTag(data);
          } catch (err) {
            logError('unable to parse data');
            setData({})
          }
        } else if (req.status === 204) {
          // unrecognized site key
          setData({});
        }
      },
      error: function () {
        setData({});
        logError('unable to get prediction data');
      }
    }
  );
}

/**
 * serialize object and return query params string
 * @param {Object} data
 * @return {string}
 */
function toUrlParams(data) {
  return Object.keys(data)
    .map(key => key + '=' + encodeURIComponent(data[key]))
    .join('&');
}

function setBidRequestsData(bidObj, callback) {
  let adUnitCodes = bidObj.adUnitCodes;
  let adUnits = bidObj.adUnits || getGlobal().adUnits || [];
  if (adUnitCodes) {
    adUnits = adUnits.filter(au => includes(adUnitCodes, au.code));
  } else {
    adUnitCodes = adUnits.map(au => au.code);
  }
  waitForData(() => {
    const data = getViewabilityByAdUnitCodes(adUnitCodes);
    if (data) {
      adUnits.forEach(adUnit => {
        const adUnitCode = adUnit.code;
        if (data[adUnitCode]) {
          deepSetValue(adUnit, 'ortb2Imp.ext.data.browsi', {[DEF_KEYNAME]: data[adUnitCode][getViewabilityKey()]});
        }
      });
    }
    callback();
  })
}

/** @type {RtdSubmodule} */
export const browsiSubmodule = {
  /**
   * used to link submodule with realTimeData
   * @type {string}
   */
  name: 'browsi',
  /**
   * get data and send back to realTimeData module
   * @function
   * @param {string[]} adUnitsCodes
   */
  getTargetingData: getTargetingData,
  init: init,
  getBidRequestData: setBidRequestsData
};

function getTargetingData(adUnitCodes) {
  const viewabilityByAdUnitCodes = getViewabilityByAdUnitCodes(adUnitCodes);
  adUnitCodes.forEach(auc => {
    if (isNumber(_refreshCounter[auc])) {
      _refreshCounter[auc] = _refreshCounter[auc] + 1;
    }
  });
  return viewabilityByAdUnitCodes;
}

function init(moduleConfig) {
  _moduleParams = moduleConfig.params;
  if (_moduleParams && _moduleParams.siteKey && _moduleParams.pubKey && _moduleParams.url) {
    collectData();
  } else {
    logError('missing params for Browsi provider');
  }
  return true;
}

function registerSubModule() {
  submodule('realTimeData', browsiSubmodule);
}
registerSubModule();
