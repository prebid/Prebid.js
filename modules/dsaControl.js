import {config} from '../src/config.js';
import {auctionManager} from '../src/auctionManager.js';
import {timedBidResponseHook} from '../src/utils/perfMetrics.js';
import CONSTANTS from '../src/constants.json';
import {getHook} from '../src/hook.js';
import {logInfo, logWarn} from '../src/utils.js';

let expiryHandle;
let dsaAuctions = {};

export const addBidResponseHook = timedBidResponseHook('dsa', function (fn, adUnitCode, bid, reject) {
  if (!dsaAuctions.hasOwnProperty(bid.auctionId)) {
    dsaAuctions[bid.auctionId] = auctionManager.index.getAuction(bid)?.getFPD?.()?.global?.regs?.ext?.dsa?.required
  }
  const required = dsaAuctions[bid.auctionId];
  if (!bid.meta?.dsa) {
    if (required === 1) {
      logWarn(`dsaControl: ${CONSTANTS.REJECTION_REASON.DSA_REQUIRED}; will still be accepted as regs.ext.dsa.required = 1`, bid);
    } else if ([2, 3].includes(required)) {
      reject(CONSTANTS.REJECTION_REASON.DSA_REQUIRED);
      return;
    }
  }
  return fn.call(this, adUnitCode, bid, reject);
});

function toggleHooks(enabled) {
  if (enabled && expiryHandle == null) {
    getHook('addBidResponse').before(addBidResponseHook);
    expiryHandle = auctionManager.onExpiry(auction => {
      delete dsaAuctions[auction.getAuctionId()];
    });
    logInfo('dsaControl: DSA bid validation is enabled')
  } else if (!enabled && expiryHandle != null) {
    getHook('addBidResponse').getHooks({hook: addBidResponseHook}).remove();
    expiryHandle();
    expiryHandle = null;
    logInfo('dsaControl: DSA bid validation is disabled')
  }
}

export function reset() {
  toggleHooks(false);
  dsaAuctions = {};
}

toggleHooks(true);

config.getConfig('consentManagement', (cfg) => {
  toggleHooks(cfg.consentManagement?.dsa?.validateBids ?? true);
});
