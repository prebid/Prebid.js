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
 * @property {?string} splitKey
 */

import {deepClone, deepSetValue, isFn, isGptPubadsDefined, isNumber, logError, logInfo, generateUUID} from '../src/utils.js';
import {submodule} from '../src/hook.js';
import {ajaxBuilder} from '../src/ajax.js';
import {loadExternalScript} from '../src/adloader.js';
import {getStorageManager} from '../src/storageManager.js';
import {find, includes} from '../src/polyfill.js';
import {getGlobal} from '../src/prebidGlobal.js';
import * as events from '../src/events.js';
import {EVENTS} from '../src/constants.js';
import {MODULE_TYPE_RTD} from '../src/activities/modules.js';

/**
 * @typedef {import('../modules/rtdModule/index.js').RtdSubmodule} RtdSubmodule
 */

const MODULE_NAME = 'browsi';

const storage = getStorageManager({moduleType: MODULE_TYPE_RTD, moduleName: MODULE_NAME});
const RANDOM = Math.floor(Math.random() * 10) + 1;

/** @type {ModuleParams} */
let _moduleParams = {};
/** @type {null|Object} */
let _browsiData = null;
/** @type {string} */
const DEF_KEYNAME = 'browsiViewability';
/** @type {null | function} */
let _dataReadyCallback = null;
/** @type {null|Object} */
let _ic = {};

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
  script.prebidData = deepClone(typeof data === 'string' ? Object(data) : data)
  script.brwRandom = RANDOM;
  if (_moduleParams.keyName) {
    script.prebidData.kn = _moduleParams.keyName;
  }
  return script;
}

export function setKeyValue(key) {
  if (!key || typeof key !== 'string') return false;
  window.googletag = window.googletag || {cmd: []};
  window.googletag.cmd = window.googletag.cmd || [];
  window.googletag.cmd.push(() => {
    window.googletag.pubads().setTargeting(key, RANDOM.toString());
  });
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
      pk: _moduleParams.pubKey,
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
  if (_browsiData) {
    _dataReadyCallback = null;
    callback();
  } else {
    _dataReadyCallback = callback;
  }
}

export function setData(data) {
  _browsiData = data;
  if (isFn(_dataReadyCallback)) {
    _dataReadyCallback();
    _dataReadyCallback = null;
  }
}

function getRTD(auc) {
  logInfo(`Browsi RTD provider is fetching data for ${auc}`);
  try {
    const _bp = (_browsiData && _browsiData.p) || {};
    return auc.reduce((rp, uc) => {
      _ic[uc] = _ic[uc] || 0;
      const _c = _ic[uc];
      if (!uc) {
        return rp
      }
      const adSlot = getSlotByCode(uc);
      const identifier = adSlot ? getMacroId(_browsiData['pmd'], adSlot) : uc;
      const _pd = _bp[identifier];
      if (!_pd) {
        return rp
      }
      if (_pd.ps) {
        if (!isIdMatchingAdUnit(adSlot, _pd.w)) {
          return rp;
        }
        rp[uc] = getKVObject(getCurrentData(_pd.ps, _c));
      }
      return rp;
    }, {});
  } catch (e) {
    return {};
  }
}

/**
 * get prediction
 * return -1 if prediction not found
 * @param {object} predictionObject
 * @param {number} _c
 * @return {number}
 */
export function getCurrentData(predictionObject, _c) {
  if (!predictionObject || !isNumber(_c)) {
    return -1;
  }
  if (isNumber(predictionObject[_c])) {
    return predictionObject[_c];
  }
  if (Object.keys(predictionObject).length > 1) {
    while (_c > 0) {
      _c--;
      if (isNumber(predictionObject[_c])) {
        return predictionObject[_c];
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
 * @return {Object} key:value
 */
function getKVObject(p) {
  const prValue = p < 0 ? 'NA' : (Math.floor(p * 10) / 10).toFixed(2);
  let prObject = {};
  prObject[getKey()] = prValue.toString();
  return prObject;
}

function getKey() {
  return ((_moduleParams['keyName'] || (_browsiData && _browsiData['kn']) || DEF_KEYNAME).toString())
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
            if (data) {
              setData({p: data.p, kn: data.kn, pmd: data.pmd, bet: data.bet});
            } else {
              setData({});
            }
            sendPageviewEvent(data.bet);
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
    const data = getRTD(adUnitCodes);
    if (data) {
      adUnits.forEach(adUnit => {
        const adUnitCode = adUnit.code;
        if (data[adUnitCode]) {
          deepSetValue(adUnit, 'ortb2Imp.ext.data.browsi', {[getKey()]: data[adUnitCode][getKey()]});
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

function getTargetingData(uc, c, us, a) {
  const targetingData = getRTD(uc);
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
  if (_moduleParams && _moduleParams.siteKey && _moduleParams.pubKey && _moduleParams.url) {
    collectData();
    setKeyValue(_moduleParams.splitKey);
  } else {
    logError('missing params for Browsi provider');
  }
  return true;
}

function registerSubModule() {
  submodule('realTimeData', browsiSubmodule);
}
registerSubModule();
