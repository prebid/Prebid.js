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
 * @summary timeout
 * @name ModuleConfig#timeout
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
 * @summary primary ad server only
 * @name ModuleConfig#primary_only
 * @type {boolean}
 */

import {getGlobal} from '../src/prebidGlobal';
import {config} from '../src/config.js';
import {targeting} from '../src/targeting';
import {getHook, module} from '../src/hook';
import * as utils from '../src/utils';

/** @type {string} */
const MODULE_NAME = 'realTimeData';
/** @type {number} */
const DEF_TIMEOUT = 1000;
/** @type {RtdSubmodule[]} */
let subModules = [];
/** @type {RtdSubmodule | null} */
let _subModule = null;
/** @type {ModuleConfig} */
let _moduleConfig;

/**
 * enable submodule in User ID
 * @param {RtdSubmodule} submodule
 */
export function attachRealTimeDataProvider(submodule) {
  subModules.push(submodule);
}
/**
 * get registered sub module
 * @returns {RtdSubmodule}
 */
function getSubModule() {
  if (!_moduleConfig.name) {
    return null;
  }
  const subModule = subModules.filter(m => m.name === _moduleConfig.name)[0] || null;
  if (!subModule) {
    throw new Error('unable to use real time data module without provider');
  }
  return subModules.filter(m => m.name === _moduleConfig.name)[0] || null;
}

export function init(config) {
  const confListener = config.getConfig(MODULE_NAME, ({realTimeData}) => {
    if (!realTimeData.name) {
      utils.logError('missing parameters for real time module');
      return;
    }
    confListener(); // unsubscribe config listener
    _moduleConfig = realTimeData;
    // get submodule
    _subModule = getSubModule();
    // delay bidding process only if primary ad server only is false
    if (_moduleConfig['primary_only']) {
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
  // promise for timeout
  const timeOutPromise = new Promise((resolve) => {
    setTimeout(() => {
      resolve(false);
    }, _moduleConfig.timeout || DEF_TIMEOUT)
  });

  return Promise.race([
    timeOutPromise,
    _subModule.getData(adUnits)
  ]);
}

/**
 * run hook after bids request and before callback
 * get data from provider and set key values to primary ad server
 * @param {function} next - next hook function
 * @param {AdUnit[]} adUnits received from auction
 */
export function setTargetsAfterRequestBids(next, adUnits) {
  getProviderData(adUnits).then(data => {
    if (data && Object.keys(data).length) { // utils.isEmpty
      setDataForPrimaryAdServer(data);
    }
    next(adUnits);
  }
  );
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
      setDataForPrimaryAdServer(data);
      addIdDataToAdUnitBids(reqBidsConfigObj.adUnits || getGlobal().adUnits, data);
    }
    return fn.call(this, reqBidsConfigObj.adUnits);
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
    adUnit.bids.forEach(bid => {
      const rd = data[adUnit.code] || {};
      bid = Object.assign(bid, rd);
    });
  });
}

init(config);
module('realTimeData', attachRealTimeDataProvider);
