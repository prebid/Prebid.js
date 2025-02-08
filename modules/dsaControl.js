import {config} from '../src/config.js';
import {auctionManager} from '../src/auctionManager.js';
import {timedBidResponseHook} from '../src/utils/perfMetrics.js';
import { REJECTION_REASON } from '../src/constants.js';
import {getHook} from '../src/hook.js';
import {logInfo, logWarn} from '../src/utils.js';

let expiryHandle;
let dsaAuctions = {};

export const addBidResponseHook = timedBidResponseHook('dsa', function (fn, adUnitCode, bid, reject) {
  if (!dsaAuctions.hasOwnProperty(bid.auctionId)) {
    dsaAuctions[bid.auctionId] = auctionManager.index.getAuction(bid)?.getFPD?.()?.global?.regs?.ext?.dsa;
  }
  const dsaRequest = dsaAuctions[bid.auctionId];
  let rejectReason;
  if (dsaRequest) {
    if (!bid.meta?.dsa) {
      if (dsaRequest.dsarequired === 1) {
        // request says dsa is supported; response does not have dsa info; warn about it
        logWarn(`dsaControl: ${REJECTION_REASON.DSA_REQUIRED}; will still be accepted as regs.ext.dsa.dsarequired = 1`, bid);
      } else if ([2, 3].includes(dsaRequest.dsarequired)) {
        // request says dsa is required; response does not have dsa info; reject it
        rejectReason = REJECTION_REASON.DSA_REQUIRED;
      }
    } else {
      if (dsaRequest.pubrender === 0 && bid.meta.dsa.adrender === 0) {
        // request says publisher can't render; response says advertiser won't; reject it
        rejectReason = REJECTION_REASON.DSA_MISMATCH;
      } else if (dsaRequest.pubrender === 2 && bid.meta.dsa.adrender === 1) {
        // request says publisher will render; response says advertiser will; reject it
        rejectReason = REJECTION_REASON.DSA_MISMATCH;
      }
    }
  }
  if (rejectReason) {
    reject(rejectReason);
  } else {
    return fn.call(this, adUnitCode, bid, reject);
  }
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
