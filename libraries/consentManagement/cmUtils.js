import {timedAuctionHook} from '../../src/utils/perfMetrics.js';
import {isNumber, isPlainObject, isStr, logError, logInfo, logWarn} from '../../src/utils.js';
import {ConsentHandler} from '../../src/consentHandler.js';
import {getGlobal} from '../../src/prebidGlobal.js';
import {PbPromise} from '../../src/utils/promise.js';
import {buildActivityParams} from '../../src/activities/params.js';

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
 * @param {CmpLookupFn} options.setupCmp
 * @param {Number?} options.cmpTimeout timeout (in ms) after which the auction should continue without consent data.
 * @param {Number?} options.actionTimeout timeout (in ms) from when provisional consent is available to when the auction should continue with it
 * @param {() => {}} options.getNullConsent consent data to use on timeout
 * @returns {Promise<{error: Error, consentData: {}}>}
 */
export function lookupConsentData(
  {
    name,
    consentDataHandler,
    setupCmp,
    cmpTimeout,
    actionTimeout,
    getNullConsent
  }
) {
  consentDataHandler.enable();
  let timeoutHandle;

  return new Promise((resolve, reject) => {
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
      if (timeoutHandle != null) clearTimeout(timeoutHandle);
      if (timeout != null) {
        timeoutHandle = setTimeout(() => {
          const consentData = consentDataHandler.getConsentData() ?? (cmpLoaded ? provisionalConsent : getNullConsent());
          const message = `timeout waiting for ${cmpLoaded ? 'user action on CMP' : 'CMP to load'}`;
          consentDataHandler.setConsentData(consentData);
          resolve({consentData, error: new Error(`${name} ${message}`)});
        }, timeout);
      } else {
        timeoutHandle = null;
      }
    }
    setupCmp(setProvisionalConsent)
      .then(() => resolve({consentData: consentDataHandler.getConsentData()}), reject);
    cmpTimeout != null && resetTimeout(cmpTimeout);
  }).finally(() => {
    timeoutHandle && clearTimeout(timeoutHandle);
  }).catch((e) => {
    consentDataHandler.setConsentData(null);
    throw e;
  });
}

export function configParser(
  {
    namespace,
    displayName,
    consentDataHandler,
    parseConsentData,
    getNullConsent,
    cmpHandlers,
    DEFAULT_CMP = 'iab',
    DEFAULT_CONSENT_TIMEOUT = 10000
  } = {}
) {
  function msg(message) {
    return `consentManagement.${namespace} ${message}`;
  }
  let requestBidsHook, consentDataLoaded, staticConsentData;

  return function getConsentConfig(config) {
    config = config?.[namespace];
    if (!config || typeof config !== 'object') {
      logWarn(msg(`config not defined, exiting consent manager module`));
      return {};
    }
    let cmpHandler;
    if (isStr(config.cmpApi)) {
      cmpHandler = config.cmpApi;
    } else {
      cmpHandler = DEFAULT_CMP;
      logInfo(msg(`config did not specify cmp.  Using system default setting (${DEFAULT_CMP}).`));
    }
    let cmpTimeout;
    if (isNumber(config.timeout)) {
      cmpTimeout = config.timeout;
    } else {
      cmpTimeout = DEFAULT_CONSENT_TIMEOUT;
      logInfo(msg(`config did not specify timeout.  Using system default setting (${DEFAULT_CONSENT_TIMEOUT}).`));
    }
    const actionTimeout = isNumber(config.actionTimeout) ? config.actionTimeout : null;
    let setupCmp;
    if (cmpHandler === 'static') {
      if (isPlainObject(config.consentData)) {
        staticConsentData = config.consentData;
        cmpTimeout = null;
        setupCmp = () => new PbPromise(resolve => resolve(consentDataHandler.setConsentData(parseConsentData(staticConsentData))))
      } else {
        logError(msg(`config with cmpApi: 'static' did not specify consentData. No consents will be available to adapters.`));
      }
    } else if (!cmpHandlers.hasOwnProperty(cmpHandler)) {
      consentDataHandler.setConsentData(null);
      logWarn(`${displayName} CMP framework (${cmpHandler}) is not a supported framework.  Aborting consentManagement module and resuming auction.`);
      setupCmp = () => PbPromise.resolve();
    } else {
      setupCmp = cmpHandlers[cmpHandler];
    }
    consentDataLoaded = lookupConsentData({
      name: displayName,
      consentDataHandler,
      setupCmp,
      cmpTimeout,
      actionTimeout,
      getNullConsent,
    })
    const loadConsentData = () => consentDataLoaded.then(({error}) => ({error, consentData: consentDataHandler.getConsentData()}))
    if (requestBidsHook == null) {
      requestBidsHook = consentManagementHook(namespace, () => consentDataLoaded);
      getGlobal().requestBids.before(requestBidsHook, 50);
      buildActivityParams.before((next, params) => {
        return next(Object.assign({[`${namespace}Consent`]: consentDataHandler.getConsentData()}, params));
      });
    }
    logInfo(`${displayName} consentManagement module has been activated...`)
    return {
      cmpHandler,
      cmpTimeout,
      actionTimeout,
      staticConsentData,
      loadConsentData,
      requestBidsHook
    }
  }
}
