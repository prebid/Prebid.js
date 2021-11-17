import { auctionManager } from '../../src/auctionManager.js';
import { config } from '../../src/config.js';
import CONSTANTS from '../../src/constants.json';
import { getGlobal } from '../../src/prebidGlobal.js';
import * as utils from '../../src/utils.js';

/**
 * @summary This Module is intended to provide users with the ability to run a private client auction such as Fledge or Parakeet against a PreBid winning bid
 */
const MODULE_NAME = 'Private Client Auction';

/**
 * @summary The config to be used. Can be updated via: setConfig
 */
let _privateClientAuctionConfig = {};

/**
 *
 * @param {Object} reqBidsConfigObj required; This is the same param that's used in pbjs.requestBids.
 * @param {function} fn required; The next function in the chain, used by hook.js
 */
export function renderAdHook(fn, doc, id, options) {
  const bid = auctionManager.findBidByAdId(id);

  if (_privateClientAuctionConfig.auctionConfig) {
    const auctionConfig = _privateClientAuctionConfig.auctionConfig;
    auctionConfig.auctionSignals.winningContextualBid = bid;
    navigator
      .runAdAuction(auctionConfig)
      .then(results => {
        if (results) {
          // render winning ad in fenced frame
          var adFrame = document.createElement('fencedframe');
          adFrame.setAttribute('src', results);
          document.getElementById(bid.adUnitCode).appendChild(adFrame);
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
  _privateClientAuctionConfig = utils.pick(config, [
    'enabled', enabled => enabled !== false, // defaults to true
    'supportedAuctionTypes',
    'auctionConfig',
  ]);

  // check if fledge is enabled and available
  if (_privateClientAuctionConfig.enabled &&
    _privateClientAuctionConfig.supportedAuctionTypes.includes('fledge') &&
    navigator.runAdAuction) {
    getGlobal()
      .renderAd
      .before(renderAdHook, CONSTANTS.HOOK_PRIORITY.RENDER_AD);
  } else {
    utils.logInfo(`${MODULE_NAME}: Turning off module`);

    _privateClientAuctionConfig = {};

    getGlobal()
      .renderAd
      .getHooks({
        hook: renderAdHook
      })
      .remove();
  }
}

config.getConfig('privateClientAuction', config => handleSetFledgeConfig(config.privateClientAuction));
