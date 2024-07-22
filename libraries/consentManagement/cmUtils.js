import {timedAuctionHook} from '../../src/utils/perfMetrics.js';
import {logError, logInfo, logWarn} from '../../src/utils.js';
import {ConsentHandler} from '../../src/consentHandler.js';

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

/**
 *
 * @typedef {Function} CmpLookupFn CMP lookup function. Should set up communication and keep consent data updated
 *   through consent data handlers' `setConsentData`.
 * @param {SetProvisionalConsent} setProvisionalConsent optionally, the function can call this with provisional consent
 *   data, which will be used if the lookup times out before "proper" consent data can be retrieved.
 * @returns {Promise<{void}>} a promise that resolves when the auction should be continued, or rejects if it should be canceled.
 *
 * @typedef {Function} SetProvisionalConsent
 * @param {*} provisionalConsent
 * @returns {void}
 */

/**
 * Look up consent data from CMP or config.
 *
 * @param {Object} options
 * @param {String} options.name e.g. 'GPP'. Used only for log messages.
 * @param {ConsentHandler} options.consentDataHandler consent data handler object (from src/consentHandler)
 * @param {String} options.cmpHandler name of the CMP handler to use, which in turn should be present in `cmpHandlerMap`.
 * @param {{[cmpHandler: String]: CmpLookupFn}} options.cmpHandlerMap Map from name to CMP lookup function.
 * @param {Number?} options.cmpTimeout timeout (in ms) after which the auction should continue without consent data.
 * @param {Number?} options.actionTimeout timeout (in ms) from when provisional consent is available to when the auction should continue with it
 * @param {() => {}} options.getNullConsent consent data to use on timeout
 * @returns {Promise<{error: Error, consentData: {}}>}
 */
export function lookupConsentData(
  {
    name,
    consentDataHandler,
    cmpHandler,
    cmpHandlerMap,
    cmpTimeout,
    actionTimeout,
    getNullConsent
  }
) {
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
          const message = `timeout waiting for ${cmpLoaded ? 'user action on CMP' : 'CMP to load'}`;
          consentDataHandler.setConsentData(consentData);
          resolve({consentData, error: new Error(`${name} ${message}`)});
        }, timeout);
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
        .then(() => resolve({consentData: consentDataHandler.getConsentData()}), reject);
      cmpTimeout != null && resetTimeout(cmpTimeout);
    }
  }).catch((e) => {
    consentDataHandler.setConsentData(null);
    throw e;
  });
}
