import {timedAuctionHook} from '../../src/utils/perfMetrics.js';
import {logError, logInfo, logWarn} from '../../src/utils.js';

export function consentManagementHook(name, getConsent, loadConsentData) {
  function loadIfMissing(cb) {
    if (getConsent()) {
      logInfo('User consent information already known.  Pulling internally stored information...');
      // eslint-disable-next-line standard/no-callback-literal
      cb(false);
    } else {
      loadConsentData(cb);
    }
  }

  return timedAuctionHook(name, function requestBidsHook(fn, reqBidsConfigObj) {
    loadIfMissing(function (shouldCancelAuction, errMsg, ...extraArgs) {
      if (errMsg) {
        let log = logWarn;
        if (shouldCancelAuction) {
          log = logError;
          errMsg = `${errMsg} Canceling auction as per consentManagement config.`;
        }
        log(errMsg, ...extraArgs);
      }

      if (shouldCancelAuction) {
        fn.stopTiming();
        if (typeof reqBidsConfigObj.bidsBackHandler === 'function') {
          reqBidsConfigObj.bidsBackHandler();
        } else {
          logError('Error executing bidsBackHandler');
        }
      } else {
        fn.call(this, reqBidsConfigObj);
      }
    });
  });
}
