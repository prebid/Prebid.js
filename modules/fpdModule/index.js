/**
 * This module sets default values and validates ortb2 first part data
 * @module modules/firstPartyData
 */
import { config } from '../../src/config.js';
import { module, getHook } from '../../src/hook.js';

let submodules = [];

export function registerSubmodules(submodule) {
  submodules.push(submodule);
}

export function reset() {
  submodules.length = 0;
}

export function processFpd({global = {}, bidder = {}} = {}) {
  let modConf = config.getConfig('firstPartyData') || {};

  submodules.sort((a, b) => {
    return ((a.queue || 1) - (b.queue || 1));
  }).forEach(submodule => {
    ({global = global, bidder = bidder} = submodule.processFpd(modConf, {global, bidder}));
  });

  return {global, bidder};
}

export function startAuctionHook(fn, req) {
  Object.assign(req.ortb2Fragments, processFpd(req.ortb2Fragments));
  fn.call(this, req);
}

function setupHook() {
  getHook('startAuction').before(startAuctionHook, 10);
}

module('firstPartyData', registerSubmodules);

// Runs setupHook on initial load
setupHook();
