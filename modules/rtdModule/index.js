/**
 * This module adds Real time data support to prebid.js
 * @module modules/realTimeData
 */

/**
 * @interface RtdSubmodule
 */

/**
 * @function
 * @summary return real time data
 * @name RtdSubmodule#getData
 * @param {AdUnit[]} adUnits
 * @param {function} onDone
 */

/**
 * @property
 * @summary used to link submodule with config
 * @name RtdSubmodule#name
 * @type {string}
 */

/**
 * @interface ModuleConfig
 */

/**
 * @property
 * @summary sub module name
 * @name ModuleConfig#name
 * @type {string}
 */

/**
 * @property
 * @summary auction delay
 * @name ModuleConfig#auctionDelay
 * @type {number}
 */

/**
 * @property
 * @summary params for provide (sub module)
 * @name ModuleConfig#params
 * @type {Object}
 */

/**
 * @property
 * @summary timeout (if no auction dealy)
 * @name ModuleConfig#timeout
 * @type {number}
 */

import {getGlobal} from '../../src/prebidGlobal.js';
import {config} from '../../src/config.js';
import {targeting} from '../../src/targeting.js';
import {getHook, module} from '../../src/hook.js';
import * as utils from '../../src/utils.js';

/** @type {string} */
const MODULE_NAME = 'realTimeData';
/** @type {number} */
const DEF_TIMEOUT = 1000;
/** @type {RtdSubmodule[]} */
let subModules = [];
/** @type {ModuleConfig} */
let _moduleConfig;

/**
 * enable submodule in User ID
 * @param {RtdSubmodule} submodule
 */
export function attachRealTimeDataProvider(submodule) {
  subModules.push(submodule);
}

export function init(config) {
  const confListener = config.getConfig(MODULE_NAME, ({realTimeData}) => {
    if (!realTimeData.dataProviders) {
      utils.logError('missing parameters for real time module');
      return;
    }
    confListener(); // unsubscribe config listener
    _moduleConfig = realTimeData;
    if (typeof (_moduleConfig.auctionDelay) === 'undefined') {
      _moduleConfig.auctionDelay = 0;
    }
    // delay bidding process only if auctionDelay > 0
    if (!_moduleConfig.auctionDelay > 0) {
      getHook('bidsBackCallback').before(setTargetsAfterRequestBids);
    } else {
      getGlobal().requestBids.before(requestBidsHook);
    }
  });
}

/**
 * get data from sub module
 * @param {AdUnit[]} adUnits received from auction
 * @param {function} callback callback function on data received
 */
function getProviderData(adUnits, callback) {
  const callbackExpected = subModules.length;
  let dataReceived = [];
  let processDone = false;
  const dataWaitTimeout = setTimeout(() => {
    processDone = true;
    callback(dataReceived);
  }, _moduleConfig.auctionDelay || _moduleConfig.timeout || DEF_TIMEOUT);

  subModules.forEach(sm => {
    sm.getData(adUnits, onDataReceived);
  });

  function onDataReceived(data) {
    if (processDone) {
      return
    }
    dataReceived.push(data);
    if (dataReceived.length === callbackExpected) {
      processDone = true;
      clearTimeout(dataWaitTimeout);
      callback(dataReceived);
    }
  }
}

/**
 * delete invalid data received from provider
 * this is to ensure working flow for GPT
 * @param {Object} data received from provider
 * @return {Object} valid data for GPT targeting
 */
export function validateProviderDataForGPT(data) {
  // data must be an object, contains object with string as value
  if (typeof data !== 'object') {
    return {};
  }
  for (let key in data) {
    if (data.hasOwnProperty(key)) {
      for (let innerKey in data[key]) {
        if (data[key].hasOwnProperty(innerKey)) {
          if (typeof data[key][innerKey] !== 'string') {
            utils.logWarn(`removing ${key}: {${innerKey}:${data[key][innerKey]} } from GPT targeting because of invalid type (must be string)`);
            delete data[key][innerKey];
          }
        }
      }
    }
  }
  return data;
}

/**
 * run hook after bids request and before callback
 * get data from provider and set key values to primary ad server
 * @param {function} next - next hook function
 * @param {AdUnit[]} adUnits received from auction
 */
export function setTargetsAfterRequestBids(next, adUnits) {
  getProviderData(adUnits, (data) => {
    if (data && Object.keys(data).length) {
      const _mergedData = deepMerge(data);
      if (Object.keys(_mergedData).length) {
        setDataForPrimaryAdServer(_mergedData);
      }
    }
    next(adUnits);
  });
}

/**
 * deep merge array of objects
 * @param {array} arr - objects array
 * @return {Object} merged object
 */
export function deepMerge(arr) {
  if (!Array.isArray(arr) || !arr.length) {
    return {};
  }
  return arr.reduce((merged, obj) => {
    for (let key in obj) {
      if (obj.hasOwnProperty(key)) {
        if (!merged.hasOwnProperty(key)) merged[key] = obj[key];
        else {
          // duplicate key - merge values
          const dp = obj[key];
          for (let dk in dp) {
            if (dp.hasOwnProperty(dk)) merged[key][dk] = dp[dk];
          }
        }
      }
    }
    return merged;
  }, {});
}

/**
 * run hook before bids request
 * get data from provider and set key values to primary ad server & bidders
 * @param {function} fn - hook function
 * @param {Object} reqBidsConfigObj - request bids object
 */
export function requestBidsHook(fn, reqBidsConfigObj) {
  getProviderData(reqBidsConfigObj.adUnits || getGlobal().adUnits, (data) => {
    if (data && Object.keys(data).length) {
      const _mergedData = deepMerge(data);
      if (Object.keys(_mergedData).length) {
        setDataForPrimaryAdServer(_mergedData);
        addIdDataToAdUnitBids(reqBidsConfigObj.adUnits || getGlobal().adUnits, _mergedData);
      }
    }
    return fn.call(this, reqBidsConfigObj);
  });
}

/**
 * set data to primary ad server
 * @param {Object} data - key values to set
 */
function setDataForPrimaryAdServer(data) {
  data = validateProviderDataForGPT(data);
  if (utils.isGptPubadsDefined()) {
    targeting.setTargetingForGPT(data, null)
  } else {
    window.googletag = window.googletag || {};
    window.googletag.cmd = window.googletag.cmd || [];
    window.googletag.cmd.push(() => {
      targeting.setTargetingForGPT(data, null);
    });
  }
}

/**
 * @param {AdUnit[]} adUnits
 *  @param {Object} data - key values to set
 */
function addIdDataToAdUnitBids(adUnits, data) {
  adUnits.forEach(adUnit => {
    adUnit.bids = adUnit.bids.map(bid => {
      const rd = data[adUnit.code] || {};
      return Object.assign(bid, {realTimeData: rd});
    })
  });
}

init(config);
module('realTimeData', attachRealTimeDataProvider);
