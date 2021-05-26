/**
 * This module sets default values and validates ortb2 first part data
 * @module modules/firstPartyData
 */
import { config } from '../../src/config.js';
import { module, getHook } from '../../src/hook.js';
import { getGlobal } from '../../src/prebidGlobal.js';
import { addBidderRequests } from '../../src/auction.js';

let submodules = [];

/**
 * enable submodule in User ID
 * @param {RtdSubmodule} submodule
 */
export function registerSubmodules(submodule) {
  submodules.push(submodule);
}

export function init() {
  let modConf = config.getConfig('firstPartyData') || {};
  let ortb2 = config.getConfig('ortb2') || {};

  submodules.sort((a, b) => {
    return ((a.queue || 1) - (b.queue || 1));
  }).forEach(submodule => {
    ortb2 = submodule.init(modConf, ortb2);
  });

  config.setConfig({ortb2});
}

/**
 * BidderRequests hook to intiate module and reset modules ortb2 data object
 */
function addBidderRequestHook(fn, bidderRequests) {
  init();
  fn.call(this, bidderRequests);
  // Removes hook after run
  addBidderRequests.getHooks({ hook: addBidderRequestHook }).remove();
}

/**
 * Sets bidderRequests hook
 */
function setupHook() {
  getHook('addBidderRequests').before(addBidderRequestHook);
}

module('firstPartyData', registerSubmodules);

// Runs setupHook on initial load
setupHook();

/**
 * Global function to reinitiate module
 */
(getGlobal()).refreshFpd = setupHook;
