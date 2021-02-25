/**
 * This module adds MASS support to Prebid.js.
 */

import { config } from '../src/config.js';
import { getHook } from '../src/hook.js';
import find from 'core-js-pure/features/array/find.js';

let listenerAdded = false;
let massEnabled = false;
let bootloaderUrl = 'https://cdn.massplatform.net/bootloader.js';

const massBids = {};

init();
config.getConfig('mass', config => init(config.mass));

/**
 * Module init.
 */
function init(cfg = {}) {
  if (cfg.enabled === false) {
    if (massEnabled) {
      massEnabled = false;
      getHook('addBidResponse').getHooks({hook: addBidResponseHook}).remove();
    }
  } else {
    if (!massEnabled) {
      getHook('addBidResponse').before(addBidResponseHook);
      massEnabled = true;
    }
  }

  if (cfg.bootloaderUrl) {
    bootloaderUrl = cfg.bootloaderUrl;
  }
}

/**
 * Before hook for 'addBidResponse'.
 */
export function addBidResponseHook(next, adUnitCode, bid) {
  if (!isMassBid(bid)) {
    return next(adUnitCode, bid);
  }

  const bidRequest = find(this.bidderRequest.bids, bidRequest =>
    bidRequest.bidId === bid.requestId
  );

  massBids[bid.requestId] = {
    bidRequest,
    bid,
    adm: bid.ad
  };

  bid.ad = '<script>window.top.postMessage({massBidId: "' + bid.requestId + '"}, "*");\x3c/script>';

  addListenerOnce();

  next(adUnitCode, bid);
}

/**
 * Check if a bid is MASS.
 */
function isMassBid(bid) {
  // the deal ID must start with MASS:
  if (!(/^META_MASS/i.test(bid.dealId))) {
    return false;
  }

  // there must be a 'mass://' or 'pcreative?' in the ad markup:
  return /mass:\/\/|\/pcreative\?/i.test(bid.ad);
}

/**
 * Add listener to detect requests to render MASS ads.
 */
function addListenerOnce() {
  if (!listenerAdded) {
    window.addEventListener('message', e => {
      if (e && e.data && e.data.massBidId) {
        render(getRenderPayload(e));
      }
    });

    listenerAdded = true;
  }
}

/**
 * Prepare payload for render.
 */
function getRenderPayload(e) {
  const payload = {
    type: 'prebid',
    e
  };

  Object.assign(payload, massBids[e.data.massBidId]);
  delete payload.bid.ad;

  return payload;
}

/**
 * Render a MASS ad.
 */
function render(payload) {
  const ns = window.mass = window.mass || {};

  ns.bootloader = ns.bootloader || {queue: []};
  ns.bootloader.queue.push(payload);

  if (!ns.bootloader.loaded) {
    const s = document.createElement('script');
    s.type = 'text/javascript';
    s.async = true;
    s.src = bootloaderUrl;

    const x = document.getElementsByTagName('script')[0];
    x.parentNode.insertBefore(s, x);

    ns.bootloader.loaded = true;
  }
}
