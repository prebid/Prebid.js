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
 * @property
 * @summary used to link submodule with config
 * @name RtdSubmodule#config
 * @type {Object}
 */

/**
 * @function
 * @summary init sub module
 * @name RtdSubmodule#init
 * @param {Object} config
 * @param {Object} gdpr settings
 * @param {Object} usp settings
 * @return {boolean} false to remove sub module
 */

/**
 * @function?
 * @summary on auction init event
 * @name RtdSubmodule#auctionInit
 * @param {Object} data
 * @param {SubmoduleConfig} config
 */

/**
 * @function?
 * @summary on auction end event
 * @name RtdSubmodule#auctionEnd
 * @param {Object} data
 * @param {SubmoduleConfig} config
 */

/**
 * @function?
 * @summary on bid request event
 * @name RtdSubmodule#updateBidRequest
 * @param {Object} data
 * @param {SubmoduleConfig} config
 */

/**
 * @function?
 * @summary on bid response event
 * @name RtdSubmodule#updateBidResponse
 * @param {Object} data
 * @param {SubmoduleConfig} config
 */

/**
 * @interface ModuleConfig
 */

/**
 * @property
 * @summary auction delay
 * @name ModuleConfig#auctionDelay
 * @type {number}
 */

/**
 * @property
 * @summary timeout (if no auction dealy)
 * @name ModuleConfig#timeout
 * @type {number}
 */

/**
 * @property
 * @summary list of sub modules
 * @name ModuleConfig#dataProviders
 * @type {SubmoduleConfig[]}
 */

/**
 * @interface SubModuleConfig
 */

/**
 * @property
 * @summary params for provide (sub module)
 * @name SubModuleConfig#params
 * @type {Object}
 */

/**
 * @property
 * @summary name
 * @name ModuleConfig#name
 * @type {string}
 */

/**
 * @property
 * @summary delay auction for this sub module
 * @name ModuleConfig#waitForIt
 * @type {boolean}
 */

import {getGlobal} from '../../src/prebidGlobal.js';
import {config} from '../../src/config.js';
import {targeting} from '../../src/targeting.js';
import {getHook, module} from '../../src/hook.js';
import * as utils from '../../src/utils.js';
import events from '../../src/events.js';
import CONSTANTS from '../../src/constants.json';
import {gdprDataHandler, uspDataHandler} from '../../src/adapterManager.js';
import find from 'core-js-pure/features/array/find.js';

/** @type {string} */
const MODULE_NAME = 'realTimeData';
/** @type {number} */
const DEF_TIMEOUT = 1000;
/** @type {RtdSubmodule[]} */
export let subModules = [];
/** @type {ModuleConfig} */
let _moduleConfig;
/** @type {SubmoduleConfig[]} */
let _dataProviders = [];

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
    _dataProviders = realTimeData.dataProviders;
    getHook('makeBidRequests').before(initSubModules);
    setEventsListeners();
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
 * call each sub module init function by config order
 * if no init function / init return failure / module not configured - remove it from submodules list
 */
export function initSubModules(next, adUnits, auctionStart, auctionId, cbTimeout, labels) {
  let subModulesByOrder = [];
  _dataProviders.forEach(provider => {
    const sm = find(subModules, s => s.name === provider.name);
    const initResponse = sm && sm.init && sm.init(provider, gdprDataHandler.getConsentData(), uspDataHandler.getConsentData());
    if (initResponse) {
      subModulesByOrder.push(Object.assign(sm, {config: provider}));
    }
  });
  subModules = subModulesByOrder;
  next(adUnits, auctionStart, auctionId, cbTimeout, labels)
}

/**
 * call each sub module event function by config order
 */
function setEventsListeners() {
  events.on(CONSTANTS.EVENTS.AUCTION_INIT, (args) => {
    subModules.forEach(sm => { sm.auctionInit && sm.auctionInit(args, sm.config) })
  });
  events.on(CONSTANTS.EVENTS.AUCTION_END, (args) => {
    subModules.forEach(sm => { sm.auctionEnd && sm.auctionEnd(args, sm.config) })
  });
  events.on(CONSTANTS.EVENTS.BEFORE_REQUEST_BIDS, (args) => {
    subModules.forEach(sm => { sm.updateBidRequest && sm.updateBidRequest(args, sm.config) })
  });
  events.on(CONSTANTS.EVENTS.BID_RESPONSE, (args) => {
    subModules.forEach(sm => { sm.updateBidResponse && sm.updateBidResponse(args, sm.config) })
  });
}

/**
 * get data from sub module
 * @param {AdUnit[]} adUnits received from auction
 * @param {function} callback callback function on data received
 */
export function getProviderData(adUnits, callback) {
  /**
   * invoke callback if one of the conditions met:
   * timeout reached
   * all submodules answered
   * all sub modules configured "waitForIt:true" answered (as long as there is at least one configured)
   */

  const waitForSubModulesLength = subModules.filter(sm => sm.config && sm.config.waitForIt).length;
  let callbacksExpected = waitForSubModulesLength || subModules.length;
  const shouldWaitForAllSubModules = waitForSubModulesLength === 0;
  let dataReceived = {};
  let processDone = false;
  const dataWaitTimeout = setTimeout(done, _moduleConfig.auctionDelay || _moduleConfig.timeout || DEF_TIMEOUT);
  subModules.forEach(sm => {
    sm.getData(adUnits, onDataReceived.bind(sm));
  });

  function onDataReceived(data) {
    if (processDone) {
      return
    }
    dataReceived[this.name] = data;
    if (shouldWaitForAllSubModules || (this.config && this.config.waitForIt)) {
      callbacksExpected--
    }
    if (callbacksExpected <= 0) {
      clearTimeout(dataWaitTimeout);
      done();
    }
  }

  function done() {
    processDone = true;
    callback(dataReceived);
  }
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
      const _mergedData = deepMerge(setDataOrderByProvider(subModules, data));
      if (Object.keys(_mergedData).length) {
        setDataForPrimaryAdServer(_mergedData);
      }
    }
    next(adUnits);
  });
}

/**
 * return an array providers data in reverse order,so the data merge will be according to correct config order
 * @param {Submodule[]} modules
 * @param {Object} data - data retrieved from providers
 * @return {array} reversed order ready for merge
 */
function setDataOrderByProvider(modules, data) {
  let rd = [];
  for (let i = modules.length; i--; i > 0) {
    if (data[modules[i].name]) {
      rd.push(data[modules[i].name])
    }
  }
  return rd;
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
      const _mergedData = deepMerge(setDataOrderByProvider(subModules, data));
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

module('realTimeData', attachRealTimeDataProvider);
init(config);
