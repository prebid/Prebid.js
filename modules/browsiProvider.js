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
 * @property {string} keyName
 */

import {config} from '../src/config.js';
import * as utils from '../src/utils';
import {submodule} from '../src/hook';

/** @type {string} */
const MODULE_NAME = 'realTimeData';
/** @type {ModuleParams} */
let _moduleParams = {};

export let _resolvePromise = null;
const _waitForData = new Promise(resolve => _resolvePromise = resolve);

/**
 * add browsi script to page
 * @param {string} bptUrl
 */
export function addBrowsiTag(bptUrl) {
  let script = document.createElement('script');
  script.async = true;
  script.setAttribute('data-sitekey', _moduleParams.siteKey);
  script.setAttribute('data-pubkey', _moduleParams.pubKey);
  script.setAttribute('src', bptUrl);
  document.head.appendChild(script);
  return script;
}

/**
 * collect required data from page
 * send data to browsi server to get predictions
 */
function collectData() {
  const win = window.top;
  let historicalData = null;
  try {
    historicalData = JSON.parse(utils.getDataFromLocalStorage('__brtd'))
  } catch (e) {
    utils.logError('unable to parse __brtd');
  }

  let predictorData = {
    ...{
      sk: _moduleParams.siteKey,
      sw: (win.screen && win.screen.width) || -1,
      sh: (win.screen && win.screen.height) || -1,
    },
    ...(historicalData && historicalData.pi ? {pi: historicalData.pi} : {}),
    ...(historicalData && historicalData.pv ? {pv: historicalData.pv} : {}),
    ...(document.referrer ? {r: document.referrer} : {}),
    ...(document.title ? {at: document.title} : {})
  };
  getPredictionsFromServer(`//${_moduleParams.url}/bpt?${serialize(predictorData)}`);
}

/**
 * filter server data according to adUnits received
 * @param {adUnit[]} adUnits
 * @return {Object} filtered data
 * @type {(function(adUnit[]): Promise<(adUnit | {}) | never | {}>)}}
 */
function sendDataToModule(adUnits) {
  return _waitForData
    .then((_predictions) => {
      if (!_predictions) {
        resolve({})
      }
      const slots = getAllSlots();
      if (!slots) {
        resolve({})
      }
      let dataToResolve = adUnits.reduce((rp, cau) => {
        const adUnitCode = cau && cau.code;
        if (!adUnitCode) { return rp }
        const predictionData = _predictions[adUnitCode];
        if (!predictionData) { return rp }

        if (predictionData.p) {
          if (!isIdMatchingAdUnit(adUnitCode, slots, predictionData.w)) {
            return rp;
          }
          rp[adUnitCode] = getKVObject(predictionData.p);
        }
        return rp;
      }, {});
      return (dataToResolve);
    })
    .catch(() => {
      return ({});
    });
}

/**
 * get all slots on page
 * @return {Object[]} slot GoogleTag slots
 */
function getAllSlots() {
  return utils.isGptPubadsDefined && window.googletag.pubads().getSlots();
}
/**
 * get prediction and return valid object for key value set
 * @param {number} p
 * @return {Object} key:value
 */
function getKVObject(p) {
  const prValue = p < 0 ? 'NA' : (Math.floor(p * 10) / 10).toFixed(2);
  let prObject = {};
  prObject[(_moduleParams['keyName'].toString())] = prValue.toString();
  return prObject;
}
/**
 * check if placement id matches one of given ad units
 * @param {number} id placement id
 * @param {Object[]} allSlots google slots on page
 * @param {string[]} whitelist ad units
 * @return {boolean}
 */
export function isIdMatchingAdUnit(id, allSlots, whitelist) {
  if (!whitelist || !whitelist.length) {
    return true;
  }
  const slot = allSlots.filter(s => s.getSlotElementId() === id);
  const slotAdUnits = slot.map(s => s.getAdUnitPath());
  return slotAdUnits.some(a => whitelist.indexOf(a) !== -1);
}

/**
 * XMLHttpRequest to get data form browsi server
 * @param {string} url server url with query params
 */
function getPredictionsFromServer(url) {
  const xmlhttp = new XMLHttpRequest();
  xmlhttp.onreadystatechange = function() {
    if (xmlhttp.readyState === 4 && xmlhttp.status === 200) {
      try {
        var data = JSON.parse(xmlhttp.responseText);
        _resolvePromise(data.p);
        addBrowsiTag(data.u);
      } catch (err) {
        utils.logError('unable to parse data');
      }
    }
  };
  xmlhttp.onloadend = function() {
    if (xmlhttp.status === 404) {
      _resolvePromise(false);
      utils.logError('unable to get prediction data');
    }
  };
  xmlhttp.open('GET', url, true);
  xmlhttp.onerror = function() { _resolvePromise(false) };
  xmlhttp.send();
}

/**
 * serialize object and return query params string
 * @param {Object} obj
 * @return {string}
 */
function serialize(obj) {
  var str = [];
  for (var p in obj) {
    if (obj.hasOwnProperty(p)) {
      str.push(encodeURIComponent(p) + '=' + encodeURIComponent(obj[p]));
    }
  }
  return str.join('&');
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
   * @param {adUnit[]} adUnits
   * @returns {Promise}
   */
  getData: sendDataToModule
};

export function init(config) {
  const confListener = config.getConfig(MODULE_NAME, ({realTimeData}) => {
    _moduleParams = realTimeData.params || {};
    if (_moduleParams.siteKey && _moduleParams.pubKey && _moduleParams.url && _moduleParams.keyName &&
      realTimeData.name && realTimeData.name.toLowerCase() === 'browsi') {
      confListener();
      collectData();
    } else {
      utils.logError('missing params for Browsi provider');
    }
  });
}

submodule('realTimeData', browsiSubmodule);
init(config);
