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

import { deepClone, deepSetValue, isFn, isGptPubadsDefined, isNumber, logError, logInfo, generateUUID, timestamp } from '../src/utils.js';
import { submodule } from '../src/hook.js';
import { ajaxBuilder } from '../src/ajax.js';
import { loadExternalScript } from '../src/adloader.js';
import { getStorageManager } from '../src/storageManager.js';
import { find, includes } from '../src/polyfill.js';
import { getGlobal } from '../src/prebidGlobal.js';
import * as events from '../src/events.js';
import { EVENTS } from '../src/constants.js';
import { MODULE_TYPE_RTD } from '../src/activities/modules.js';
import { setKeyValue as setGptKeyValue } from '../libraries/gptUtils/gptUtils.js';
import { getUUID, getDaysDifference, isEngagingUser, toUrlParams } from '../libraries/browsiUtils/browsiUtils.js';

/**
 * @typedef {import('../modules/rtdModule/index.js').RtdSubmodule} RtdSubmodule
 */

const MODULE_NAME = 'browsi';

const storage = getStorageManager({ moduleType: MODULE_TYPE_RTD, moduleName: MODULE_NAME });
const RANDOM = Math.floor(Math.random() * 10) + 1;
let PVID = getUUID();

/** @type {ModuleParams} */
let _moduleParams = {};
/** @type {null|Object} */
let _browsiData = null;
/** @type {null | function} */
let _dataReadyCallback = null;
/** @type {null|Object} */
let _ic = {};
/** @type {null|number} */
let TIMESTAMP = null;
/** @type {string} */
const VIEWABILITY_KEYNAME = 'browsiViewability';
/** @type {string} */
const SCROLL_KEYNAME = 'browsiScroll';
/** @type {string} */
const REVENUE_KEYNAME = 'browsiRevenue';

/**
 * add browsi script to page
 * @param {Object} data
 */
export function addBrowsiTag(data) {
  let script = loadExternalScript(data.u, MODULE_TYPE_RTD, 'browsi');
  script.async = true;
  script.setAttribute('data-sitekey', _moduleParams.siteKey);
  script.setAttribute('data-pubkey', _moduleParams.pubKey);
  script.setAttribute('prebidbpt', 'true');
  script.setAttribute('id', 'browsi-tag');
  script.setAttribute('src', data.u);
  script.prebidData = deepClone(typeof data === 'string' ? Object(data) : data)
  script.brwRandom = RANDOM;
  Object.assign(script.prebidData, { pvid: PVID || data.pvid, t: TIMESTAMP });
  if (_moduleParams.keyName) {
    script.prebidData.kn = _moduleParams.keyName;
  }
  return script;
}

export const setKeyValue = (key) => setGptKeyValue(key, RANDOM.toString());

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

function sendModuleInitEvent(status) {
  events.emit(EVENTS.BROWSI_INIT, {
    moduleName: MODULE_NAME,
    sk: _moduleParams.siteKey,
    pk: _moduleParams.pubKey,
    t: TIMESTAMP,
    pvid: PVID,
    ...(status ? { s: status } : {})
  });
}

export function setTimestamp() {
  TIMESTAMP = timestamp();
}

function getLocalStorageData() {
  let brtd = null;
  let bus = null;

  try {
    brtd = storage.getDataFromLocalStorage('__brtd');
  } catch (e) {
    logError('unable to parse __brtd');
  }
  try {
    bus = storage.getDataFromLocalStorage('__bus');
  } catch (e) {
    logError('unable to parse __bus');
  }

  return { brtd, bus };
}

/**
 * collect required data from page
 * send data to browsi server to get predictions
 */
export function collectData() {
  const win = window.top;
  const doc = win.document;
  const { brtd, bus } = getLocalStorageData();

  const convertedBus = convertBusData(bus);
  const hbm = convertedBus ? getHbm(convertedBus) : undefined;

  let predictorData = {
    ...{
      sk: _moduleParams.siteKey,
      pk: _moduleParams.pubKey,
      sw: (win.screen && win.screen.width) || -1,
      sh: (win.screen && win.screen.height) || -1,
      url: `${doc.location.protocol}//${doc.location.host}${doc.location.pathname}`,
      eu: isEngagingUser(),
      t: TIMESTAMP,
      pvid: PVID
    },
    ...(brtd ? { us: brtd } : { us: '{}' }),
    ...(document.referrer ? { r: document.referrer } : {}),
    ...(document.title ? { at: document.title } : {}),
    ...(hbm?.rahb ? { rahb: hbm.rahb.avg.toFixed(3) } : {}),
    ...(hbm?.uahb ? { uahb: hbm.uahb.avg.toFixed(3) } : {}),
    ...(hbm?.lahb ? { lahb: hbm.lahb.avg.toFixed(3), lbsa: hbm.lahb.age.toFixed(3) } : {}),
  };
  getPredictionsFromServer(`//${_moduleParams.url}/prebid?${toUrlParams(predictorData)}`); // TODO change route
}

function convertBusData(bus) {
  try {
    if (!bus) return undefined;
    const busObj = JSON.parse(bus);
    return busObj && Object.keys(busObj).length ? busObj : undefined;
  } catch (e) {
    return undefined;
  }
}

export function getHbm(bus) {
  try {
    const rahbByTs = getRahbByTs(bus.rahb);
    return {
      uahb: (bus.uahb && Object.keys(bus.uahb).length) ? bus.uahb : undefined,
      lahb: (bus.lahb && Object.keys(bus.lahb).length) ? getLahb(bus.lahb) : undefined,
      rahb: (rahbByTs && Object.keys(rahbByTs).length) ? getRahb(rahbByTs) : undefined,
    }
  } catch (e) {
    return undefined;
  }
}

export function getLahb(lahb) {
  try {
    return {
      avg: lahb.avg,
      age: getDaysDifference(TIMESTAMP, lahb.time)
    }
  } catch (error) {
    return undefined;
  }
}

export function getRahb(rahb) {
  try {
    let rs = { sum: 0, smp: 0 };
    rs = Object.keys(rahb).reduce((sum, curTimestamp) => {
      sum.sum += rahb[curTimestamp].sum;
      sum.smp += rahb[curTimestamp].smp;
      return sum;
    }, rs);

    return {
      avg: rs.sum / rs.smp
    }
  } catch (e) {
    return undefined;
  }
}

export function getRahbByTs(rahb) {
  try {
    const weekAgoTimestamp = TIMESTAMP - (7 * 24 * 60 * 60 * 1000);
    rahb && Object.keys(rahb)?.forEach((timestamp) => {
      if (parseInt(timestamp) < weekAgoTimestamp) {
        delete rahb[timestamp];
      }
    });
    return rahb;
  } catch (e) {
    return undefined;
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

function setBrowsiTag(data) {
  window.browsitag = window.browsitag || {};
  window.browsitag.rtd = {
    pvid: PVID || data.pvid,
    d: data.d,
    g: data.g,
    aid: data.aid,
    es: data.es,
    sk: _moduleParams.siteKey,
    pk: _moduleParams.pubKey,
    t: TIMESTAMP
  };
  if (data.eap) {
    window.browsitag.data = window.browsitag.data || {};
    window.browsitag.data.get = getBrowsiTagRTD;
    window.browsitag.apiReady = true;
  }
}

function getBrowsiTagRTD(identifier) {
  const uc = identifier || 'placeholder';
  const rtd = getRTD([uc]);
  return rtd[uc];
}

export function setData(data) {
  _browsiData = data;
  if (!PVID) { PVID = data.pvid; }
  if (isFn(_dataReadyCallback)) {
    _dataReadyCallback();
    _dataReadyCallback = null;
  }
}

function getOnPageData(auc) {
  try {
    const dataMap = {};
    auc.forEach(uc => {
      dataMap[uc] = window.browsitag.data.get(uc)
    });
    return dataMap;
  } catch (e) {
    return {};
  }
}

function getRTD(auc) {
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
      if (Object.keys(_pd).length) {
        Object.entries(_pd).forEach(([key, value]) => {
          const kv = getKVObject(key, getCurrentData(value, _c));
          Object.assign(rp[uc], kv);
        });
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
 * get all slots on page
 * @return {Object[]} slot GoogleTag slots
 */
function getAllSlots() {
  return isGptPubadsDefined() && window.googletag.pubads().getSlots();
}
/**
 * get prediction and return valid object for key value set
 * @param {string} k
 * @param {number} p
 * @return {Object} key:value
 */
function getKVObject(k, p) {
  if (p < 0) return {};
  return {[k]: p};
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
              setData(data);
              setBrowsiTag(data);
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

function mergeAdUnitData(rtdData = {}, onPageData = {}) {
  const mergedData = {};
  Object.keys({ ...rtdData, ...onPageData }).forEach((key) => {
    mergedData[key] = { ...onPageData[key], ...rtdData[key] };
  });
  return mergedData;
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
    const pr = (_browsiData && _browsiData.pr);
    if (!pr || !pr.length) { return; }

    const onPageData = getOnPageData(adUnitCodes);
    const rtdData = getRTD(adUnitCodes);
    if (!Object.keys(rtdData).length && !Object.keys(onPageData).length) { return; }

    const data = mergeAdUnitData(rtdData, onPageData);
    if (Object.keys(data).length) {
      adUnits.forEach(adUnit => {
        const adUnitCode = adUnit.code;
        if (data[adUnitCode]) {
          const validBidders = adUnit.bids.filter(bid => pr.includes(bid.bidder));
          validBidders.forEach(bid => {
            deepSetValue(bid, 'ortb2Imp.ext.data.browsi', data[adUnitCode]);
          });
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

function getRevenueTargetingValue(p) {
  if (!p) {
    return undefined;
  } else if (p <= 0) {
    return 'no fill';
  } else if (p <= 0.3) {
    return 'low';
  } else if (p <= 0.7) {
    return 'medium';
  }
  return 'high';
}

function getTargetingValue(p) {
  return (!p || p < 0) ? undefined : (Math.floor(p * 10) / 10).toFixed(2);
}

function getTargetingKeys() {
  return {
    viewabilityKey: (_moduleParams['keyName'] || VIEWABILITY_KEYNAME).toString(),
    scrollKey: SCROLL_KEYNAME,
    revenueKey: REVENUE_KEYNAME,
  }
}

function getTargetingValues(v) {
  return {
    viewabilityValue: getTargetingValue(v['viewability']),
    scrollValue: getTargetingValue(v['scrollDepth']),
    revenueValue: getRevenueTargetingValue(v['revenue'])
  }
}

function getTargeting(uc) {
  try {
    const pr = (_browsiData && _browsiData.pr);
    if (!pr?.includes('GAM')) return {};

    const rtd = getRTD(uc);
    const { viewabilityKey, scrollKey, revenueKey } = getTargetingKeys();

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
  const targetingData = getTargeting(uc);
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
    setKeyValue(_moduleParams.splitKey);
  } else {
    logError('missing params for Browsi provider');
    sendModuleInitEvent('missing params');
  }
  return true;
}

function registerSubModule() {
  submodule('realTimeData', browsiSubmodule);
}
registerSubModule();
