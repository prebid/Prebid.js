/**
 * This module sets filters the data(userEIDs and SDA) based on the configuration.
 * @module modules/dataController
 */

/**
 * @interface dataControllerModule
 */

/**
 * @function?
 * @summary return real time data
 * @name dataControllerModule#filterEIDs
 * @param {Object} bidRequest
 */

/**
 * @function?
 * @summary return real time data
 * @name dataControllerModule#filterSDA
 * @param {Object} bidRequest
 */

import {config} from '../../src/config.js';
import {module, getHook} from '../../src/hook.js';
import {processBidderRequests} from '../../src/adapters/bidderFactory.js';

let submodules = [];
const MODULE_NAME = 'dataController';
let dataControllerConfig;

/**
 * enable submodule in data Controller Module
 * @param {dataController} submodule
 */
export function registerSubmodules(submodule) {
  submodules.push(submodule);
}

export function init(bidderRequests) {
  submodules.forEach(submodule => {
    filterData(submodule, bidderRequests)
  });
}

export function filterData(submodule, bidRequest) {
  dataControllerConfig = config.getConfig(MODULE_NAME);

  if (!dataControllerConfig) {
    processBidderRequests.getHooks({hook: processBidderRequestHook}).remove();
    return;
  }

  if (dataControllerConfig.filterEIDwhenSDA && dataControllerConfig.filterSADwhenEID) {
    processBidderRequests.getHooks({hook: processBidderRequestHook}).remove();
    return;
  }
  if (dataControllerConfig.filterEIDwhenSDA) {
    let filterEIDs = submodule.filterEIDs(bidRequest)
    if(filterEIDs) {
      config.setConfig({'dcUsersAsEids': filterEIDs});
    }
  } else if (dataControllerConfig.filterSADwhenEID) {
    let bidderConfig = submodule.filterSDA(bidRequest);
    if (bidderConfig) {
      config.setBidderConfig(bidderConfig);
    }
  }
  processBidderRequests.getHooks({hook: processBidderRequestHook}).remove();
}

/**
 * BidderRequests hook to intiate module and reset data object.
 */
function processBidderRequestHook(fn, specDetails, bidRequest) {
  init(bidRequest);
  // Removes hook after run
  processBidderRequests.getHooks({hook: processBidderRequestHook}).remove();
}

/**
 * Sets bidderRequests hook
 */
function setupHook() {
  getHook('processBidderRequests').before(processBidderRequestHook);
}

setupHook();

module(MODULE_NAME, registerSubmodules);
