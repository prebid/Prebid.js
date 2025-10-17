import {timedAuctionHook} from '../../src/utils/perfMetrics.js';
import {isNumber, isPlainObject, isStr, logError, logInfo, logWarn} from '../../src/utils.js';
import {ConsentHandler} from '../../src/consentHandler.js';
import {PbPromise} from '../../src/utils/promise.js';
import {buildActivityParams} from '../../src/activities/params.js';
import {getHook} from '../../src/hook.js';

export function consentManagementHook(name, loadConsentData) {
  const SEEN = new WeakSet();
  return timedAuctionHook(name, function requestBidsHook(fn, reqBidsConfigObj) {
    return loadConsentData().then(({consentData, error}) => {
      if (error && (!consentData || !SEEN.has(error))) {
        SEEN.add(error);
        logWarn(error.message, ...(error.args || []));
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

export interface BaseCMConfig {
  /**
   * Length of time (in milliseconds) to delay auctions while waiting for consent data from the CMP.
   * Default is 10,000.
   */
  timeout?: number;
  /**
   * Length of time (in milliseconds) to delay auctions while waiting for the user to interact with the CMP.
   * When set, auctions will wait up to `timeout` for the CMP to load, and once loaded up to `actionTimeout`
   * for the user to interact with the CMP.
   */
  actionTimeout?: number;
  /**
   * Flag to enable or disable the consent management module.
   * When set to false, the module will be reset and disabled.
   * Defaults to true when not specified.
   */
  enabled?: boolean;
}

export interface IABCMConfig {
  cmpApi?: 'iab';
  consentData?: undefined;
}
export interface StaticCMConfig<T> {
  cmpApi: 'static';
  /**
   * Consent data as would be returned by a CMP.
   */
  consentData: T;
}

export type CMConfig<T> = BaseCMConfig & (IABCMConfig | StaticCMConfig<T>);

export function configParser(
  {
    namespace,
    displayName,
    consentDataHandler,
    parseConsentData,
    getNullConsent,
    cmpHandlers,
    cmpEventCleanup,
    DEFAULT_CMP = 'iab',
    DEFAULT_CONSENT_TIMEOUT = 10000
  } = {} as any
) {
  function msg(message) {
    return `consentManagement.${namespace} ${message}`;
  }
  let requestBidsHook, cdLoader, staticConsentData;

  function attachActivityParams(next, params) {
    return next(Object.assign({[`${namespace}Consent`]: consentDataHandler.getConsentData()}, params));
  }

  function loadConsentData() {
    return cdLoader().then(({error}) => ({error, consentData: consentDataHandler.getConsentData()}))
  }

  function activate() {
    if (requestBidsHook == null) {
      requestBidsHook = consentManagementHook(namespace, () => cdLoader());
      getHook('requestBids').before(requestBidsHook, 50);
      buildActivityParams.before(attachActivityParams);
      logInfo(`${displayName} consentManagement module has been activated...`)
    }
  }

  function reset() {
    if (requestBidsHook != null) {
      getHook('requestBids').getHooks({hook: requestBidsHook}).remove();
      buildActivityParams.getHooks({hook: attachActivityParams}).remove();
      requestBidsHook = null;
      logInfo(`${displayName} consentManagement module has been deactivated...`);
    }
  }

  function resetConsentDataHandler() {
    reset();
    // Call module-specific CMP event cleanup if provided
    if (typeof cmpEventCleanup === 'function') {
      try {
        cmpEventCleanup();
      } catch (e) {
        logError(`Error during CMP event cleanup for ${displayName}:`, e);
      }
    }
  }

  return function getConsentConfig(config: { [key: string]: CMConfig<any> }) {
    const cmConfig = config?.[namespace];
    if (!cmConfig || typeof cmConfig !== 'object') {
      logWarn(msg(`config not defined, exiting consent manager module`));
      reset();
      return {};
    }

    // Check if module is explicitly disabled
    if (cmConfig?.enabled === false) {
      logWarn(msg(`config enabled is set to false, disabling consent manager module`));
      resetConsentDataHandler();
      return {};
    }

    let cmpHandler;
    if (isStr(cmConfig.cmpApi)) {
      cmpHandler = cmConfig.cmpApi;
    } else {
      cmpHandler = DEFAULT_CMP;
      logInfo(msg(`config did not specify cmp.  Using system default setting (${DEFAULT_CMP}).`));
    }
    let cmpTimeout;
    if (isNumber(cmConfig.timeout)) {
      cmpTimeout = cmConfig.timeout;
    } else {
      cmpTimeout = DEFAULT_CONSENT_TIMEOUT;
      logInfo(msg(`config did not specify timeout.  Using system default setting (${DEFAULT_CONSENT_TIMEOUT}).`));
    }
    const actionTimeout = isNumber(cmConfig.actionTimeout) ? cmConfig.actionTimeout : null;
    let setupCmp;
    if (cmpHandler === 'static') {
      if (isPlainObject(cmConfig.consentData)) {
        staticConsentData = cmConfig.consentData;
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

    const lookup = () => lookupConsentData({
      name: displayName,
      consentDataHandler,
      setupCmp,
      cmpTimeout,
      actionTimeout,
      getNullConsent,
    });

    cdLoader = (() => {
      let cd;
      return function () {
        if (cd == null) {
          cd = lookup().catch(err => {
            cd = null;
            throw err;
          })
        }
        return cd;
      }
    })();

    activate();
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
