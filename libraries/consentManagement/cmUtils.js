import {timedAuctionHook} from '../../src/utils/perfMetrics.js';
import {logError, logInfo, logWarn} from '../../src/utils.js';

export function consentManagementHook(name, loadConsentData) {
  const SEEN = new WeakSet();
  return timedAuctionHook(name, function requestBidsHook(fn, reqBidsConfigObj) {
    return loadConsentData().then(({consentData, error}) => {
      if (error && (!consentData || !SEEN.has(error))) {
        SEEN.add(error);
        logWarn(error.message, ...(error.args || []));
      } else if (consentData) {
        logInfo(`${name.toUpperCase()}: User consent information already known.  Pulling internally stored information...`);
      }
      fn.call(this, reqBidsConfigObj);
    }).catch((error) => {
      logError(`${error?.message} Canceling auction as per consentManagement config.`, ...(error?.args || []));
      fn.stopTiming();
      if (typeof reqBidsConfigObj.bidsBackHandler === 'function') {
        reqBidsConfigObj.bidsBackHandler();
      } else {
        logError('Error executing bidsBackHandler');
      }
    });
  });
}

export function lookupConsentData({name, consentDataHandler, cmpHandler, cmpHandlerMap, cmpTimeout, actionTimeout, getNullConsent}) {
  consentDataHandler.enable();
  return new Promise((resolve, reject) => {
    let timer;
    let provisionalConsent;
    let cmpLoaded = false;
    function setProvisionalConsent(consentData) {
      provisionalConsent = consentData;
      if (!cmpLoaded) {
        cmpLoaded = true;
        actionTimeout != null && resetTimeout(actionTimeout);
      }
    }
    function resetTimeout(timeout) {
      if (timer != null) clearTimeout(timer);
      if (timeout != null) {
        timer = setTimeout(() => {
          const consentData = consentDataHandler.getConsentData() ?? (cmpLoaded ? provisionalConsent : getNullConsent());
          const message = `timeout waiting for ${cmpLoaded ? 'user action on CMP' : 'CMP to load'}`
          consentDataHandler.setConsentData(consentData);
          resolve({consentData, error: new Error(`${name} ${message}`)})
        }, timeout)
      } else {
        timer = null;
      }
    }
    if (!cmpHandlerMap.hasOwnProperty(cmpHandler)) {
      consentDataHandler.setConsentData(null);
      resolve({
        error: new Error(`${name} CMP framework (${cmpHandler}) is not a supported framework.  Aborting consentManagement module and resuming auction.`)
      });
    } else {
      cmpHandlerMap[cmpHandler](setProvisionalConsent)
        .then(() => resolve({consentData: consentDataHandler.getConsentData()}), reject)
      cmpTimeout != null && resetTimeout(cmpTimeout);
    }
  }).catch((e) => {
    consentDataHandler.setConsentData(null);
    throw e;
  })
}
