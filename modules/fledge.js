import { Fledge } from '@magnite/fledge.polyfill/dist/api/cjs/index.js';
import { auctionManager } from '../src/auctionManager.js';
import { config } from '../src/config.js';
import CONSTANTS from '../src/constants.json';
import { getGlobal } from '../src/prebidGlobal.js';
import * as utils from '../src/utils.js';

/**
 * @summary This Module is intended to provide users with the ability to run a Fledge-based auction against a PreBid winning bid
 */
const MODULE_NAME = 'Fledge';

/**
 * @summary The config to be used. Can be updated via: setConfig
 */
let _fledgeConfig = {};

/**
 *
 * @param {Object} reqBidsConfigObj required; This is the same param that's used in pbjs.requestBids.
 * @param {function} fn required; The next function in the chain, used by hook.js
 */
export function renderAdHook(fn, doc, id, options) {
  const bid = auctionManager.findBidByAdId(id);

  if (_fledgeConfig.auctionConfig) {
    const fledge = new Fledge('https://magniteengineering.github.io/fledge.polyfill/iframe.html');
    const auctionConfig = _fledgeConfig.auctionConfig;
    auctionConfig.auctionSignals.winningContextualBid = bid;
    fledge
      .runAdAuction(auctionConfig)
      .then(results => {
        if (results) {
          // create an iframe within the Fledge auction iframe, render the winning ad
          const ad = document.createElement('iframe');
          ad.src = results;
          document.getElementById(bid.adUnitCode).appendChild(ad);
        } else {
          return fn.call(this, doc, id, options);
        }
      });
  } else {
    return fn.call(this, doc, id, options);
  }
}

/**
 * @summary This is the function which controls what happens during a pbjs.setConfig({...floors: {}}) is called
 */
export function handleSetFledgeConfig(config) {
  _fledgeConfig = utils.pick(config, [
    'enabled', enabled => enabled !== false, // defaults to true
    'auctionConfig',
  ]);

  // if enabled then do some stuff
  if (_fledgeConfig.enabled) {
    getGlobal()
      .renderAd
      .before(renderAdHook, CONSTANTS.HOOK_PRIORITY.RENDER_AD);
  } else {
    utils.logInfo(`${MODULE_NAME}: Turning off module`);

    _fledgeConfig = {};

    getGlobal()
      .renderAd
      .getHooks({
        hook: renderAdHook
      })
      .remove();
  }
}

config.getConfig('fledge', config => handleSetFledgeConfig(config.fledge));
