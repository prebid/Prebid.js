/**
 * This module adds MASS support to Prebid.js.
 */

import {config} from '../src/config.js';
import {getHook} from '../src/hook.js';
import {auctionManager} from '../src/auctionManager.js';

const defaultCfg = {
  dealIdPattern: /^MASS/i
};
let cfg;

export let listenerAdded = false;
export let isEnabled = false;

const matchedBids = {};
let renderers;

init();
config.getConfig('mass', config => init(config.mass));

/**
 * Module init.
 */
export function init(userCfg) {
  cfg = Object.assign({}, defaultCfg, window.massConfig && window.massConfig.mass, userCfg);

  if (cfg.enabled === false) {
    if (isEnabled) {
      getHook('addBidResponse').getHooks({hook: addBidResponseHook}).remove();
      isEnabled = false;
    }
  } else {
    if (!isEnabled) {
      getHook('addBidResponse').before(addBidResponseHook);
      isEnabled = true;
    }
  }

  if (isEnabled) {
    updateRenderers();
  }
}

/**
 * Update the list of renderers based on current config.
 */
export function updateRenderers() {
  renderers = [];

  // official MASS renderer:
  if (cfg.dealIdPattern && cfg.renderUrl) {
    renderers.push({
      match: isMassBid,
      render: useDefaultRender(cfg.renderUrl, 'mass')
    });
  }

  // add any custom renderer defined in the config:
  (cfg.custom || []).forEach(renderer => {
    if (!renderer.match && renderer.dealIdPattern) {
      renderer.match = useDefaultMatch(renderer.dealIdPattern);
    }

    if (!renderer.render && renderer.renderUrl && renderer.namespace) {
      renderer.render = useDefaultRender(renderer.renderUrl, renderer.namespace);
    }

    if (renderer.match && renderer.render) {
      renderers.push(renderer);
    }
  });

  return renderers;
}

/**
 * Before hook for 'addBidResponse'.
 */
export function addBidResponseHook(next, adUnitCode, bid, {index = auctionManager.index} = {}) {
  let renderer;
  for (let i = 0; i < renderers.length; i++) {
    if (renderers[i].match(bid)) {
      renderer = renderers[i];
      break;
    }
  }

  if (renderer) {
    const bidRequest = index.getBidRequest(bid);

    matchedBids[bid.requestId] = {
      renderer,
      payload: {
        bidRequest,
        bid,
        adm: bid.ad
      }
    };

    bid.ad = '<script>window.parent.postMessage({massBidId: "' + bid.requestId + '"}, "*");\x3c/script>';

    addListenerOnce();
  }

  next(adUnitCode, bid);
}

/**
 * Add listener for the "message" event sent by the winning bid
 */
export function addListenerOnce() {
  if (!listenerAdded) {
    window.addEventListener('message', e => {
      if (!e || !e.data || !e.data.massBidId) {
        return;
      }

      const matchedBid = matchedBids[e.data.massBidId];
      if (matchedBid) {
        const payload = {
          type: 'prebid',
          event: e,
          ...matchedBid.payload
        };

        delete payload.bid.ad;

        matchedBid.renderer.render(payload);
      }
    });

    listenerAdded = true;
  }
}

/**
 * Check if a bid is MASS.
 */
export function isMassBid(bid) {
  // either bid.meta.mass is set or deal ID matches a publisher specified pattern:
  if (!((bid.meta && bid.meta.mass) || (cfg.dealIdPattern && cfg.dealIdPattern.test(bid.dealId)))) {
    return false;
  }

  // there must be a 'mass://' or 'pcreative?' in the ad markup:
  return /mass:\/\/|\/pcreative\?/i.test(bid.ad);
}

/**
 * Default match (factory).
 */
export function useDefaultMatch(dealIdPattern) {
  return function(bid) {
    return dealIdPattern.test(bid.dealId);
  };
}

/**
 * Default render (factory).
 */
export function useDefaultRender(renderUrl, namespace) {
  return function render(payload) {
    const ns = window[namespace] = window[namespace] || {};
    ns.queue = ns.queue || [];

    ns.queue.push(payload);

    if (!ns.loaded) {
      const s = document.createElement('script');
      s.type = 'text/javascript';
      s.async = true;
      s.src = renderUrl;

      const x = document.getElementsByTagName('script')[0];
      x.parentNode.insertBefore(s, x);

      ns.loaded = true;
    }
  };
}
