/**
 * This module adds Real time data support to prebid.js
 * @module modules/realTimeData
 */

/**
 * @interface RtdSubmodule
 */

/**
 * @function
 * @summary return teal time data
 * @name RtdSubmodule#getData
 * @param {adUnit[]} adUnits
 * @return {Promise}
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

import {getGlobal} from '../../src/prebidGlobal';
import {config} from '../../src/config.js';
import {targeting} from '../../src/targeting';
import {getHook, module} from '../../src/hook';
import * as utils from '../../src/utils';

/** @type {string} */
const MODULE_NAME = 'realTimeData';
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
    if (!realTimeData.dataProviders || typeof (realTimeData.auctionDelay) == 'undefined') {
      utils.logError('missing parameters for real time module');
      return;
    }
    confListener(); // unsubscribe config listener
    _moduleConfig = realTimeData;
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
 * @returns {Promise} promise race  - will return submodule config or false if time out
 */
function getProviderData(adUnits) {
  const promises = subModules.map(sm => sm.getData(adUnits));

  // promise for timeout
  const timeOutPromise = new Promise((resolve) => {
    setTimeout(() => {
      resolve({});
    }, _moduleConfig.auctionDelay)
  });

  return Promise.all(promises.map(p => {
    return Promise.race([p, timeOutPromise]);
  }));
}

/**
 * run hook after bids request and before callback
 * get data from provider and set key values to primary ad server
 * @param {function} next - next hook function
 * @param {AdUnit[]} adUnits received from auction
 */
export function setTargetsAfterRequestBids(next, adUnits) {
  getProviderData(adUnits).then(data => {
    if (data && Object.keys(data).length) {
      const _mergedData = deepMerge(data);
      if (Object.keys(_mergedData).length) {
        setDataForPrimaryAdServer(_mergedData);
      }
    }
    next(adUnits);
  }
  );
}

/**
 * deep merge array of objects
 * @param {array} arr - objects array
 * @return {Object} merged object
 */
export function deepMerge(arr) {
  if (!arr.length) {
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
  getProviderData(reqBidsConfigObj.adUnits || getGlobal().adUnits).then(data => {
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
  if (!utils.isGptPubadsDefined()) {
    utils.logError('window.googletag is not defined on the page');
    return;
  }
  targeting.setTargetingForGPT(data, null);
}

/**
 * @param {AdUnit[]} adUnits
 *  @param {Object} data - key values to set
 */
function addIdDataToAdUnitBids(adUnits, data) {
  adUnits.forEach(adUnit => {
    adUnit.bids = adUnit.bids.map(bid => {
      const rd = data[adUnit.code] || {};
      return Object.assign(bid, rd);
    })
  });
}

init(config);
module('realTimeData', attachRealTimeDataProvider);
