/**
 * This module adds GDPR consentManagement support to prebid.js.  It interacts with
 * supported CMPs (Consent Management Platforms) to grab the user's consent information
 * and make it available for any GDPR supported adapters to read/pass this information to
 * their system.
 */
import {deepSetValue, isNumber, isPlainObject, isStr, logError, logInfo, logWarn} from '../src/utils.js';
import {config} from '../src/config.js';
import {gdprDataHandler} from '../src/adapterManager.js';
import {includes} from '../src/polyfill.js';
import {timedAuctionHook} from '../src/utils/perfMetrics.js';
import {registerOrtbProcessor, REQUEST} from '../src/pbjsORTB.js';
import {enrichFPD} from '../src/fpd/enrichment.js';
import {getGlobal} from '../src/prebidGlobal.js';
import {cmpClient} from '../libraries/cmp/cmpClient.js';

const DEFAULT_CMP = 'iab';
const DEFAULT_CONSENT_TIMEOUT = 10000;
const CMP_VERSION = 2;

export let userCMP;
export let consentTimeout;
export let gdprScope;
export let staticConsentData;
let actionTimeout;

let consentData;
let addedConsentHook = false;

// add new CMPs here, with their dedicated lookup function
const cmpCallMap = {
  'iab': lookupIabConsent,
  'static': lookupStaticConsentData
};

/**
 * This function reads the consent string from the config to obtain the consent information of the user.
 * @param {function({})} onSuccess acts as a success callback when the value is read from config; pass along consentObject from CMP
 */
function lookupStaticConsentData({onSuccess, onError}) {
  processCmpData(staticConsentData, {onSuccess, onError})
}

/**
 * This function handles interacting with an IAB compliant CMP to obtain the consent information of the user.
 * Given the async nature of the CMP's API, we pass in acting success/error callback functions to exit this function
 * based on the appropriate result.
 * @param {function({})} onSuccess acts as a success callback when CMP returns a value; pass along consentObjectfrom CMP
 * @param {function(string, ...{}?)} cmpError acts as an error callback while interacting with CMP; pass along an error message (string) and any extra error arguments (purely for logging)
 */
function lookupIabConsent({onSuccess, onError, onEvent}) {
  function cmpResponseCallback(tcfData, success) {
    logInfo('Received a response from CMP', tcfData);
    if (success) {
      onEvent(tcfData);
      if (tcfData.gdprApplies === false || tcfData.eventStatus === 'tcloaded' || tcfData.eventStatus === 'useractioncomplete') {
        processCmpData(tcfData, {onSuccess, onError});
      }
    } else {
      onError('CMP unable to register callback function.  Please check CMP setup.');
    }
  }

  const cmp = cmpClient({
    apiName: '__tcfapi',
    apiVersion: CMP_VERSION,
    apiArgs: ['command', 'version', 'callback', 'parameter'],
  });

  if (!cmp) {
    return onError('TCF2 CMP not found.');
  }
  if (cmp.isDirect) {
    logInfo('Detected CMP API is directly accessible, calling it now...');
  } else {
    logInfo('Detected CMP is outside the current iframe where Prebid.js is located, calling it now...');
  }

  cmp({
    command: 'addEventListener',
    callback: cmpResponseCallback
  })
}

/**
 * Look up consent data and store it in the `consentData` global as well as `adapterManager.js`' gdprDataHandler.
 *
 * @param cb A callback that takes: a boolean that is true if the auction should be canceled; an error message and extra
 * error arguments that will be undefined if there's no error.
 */
function loadConsentData(cb) {
  let isDone = false;
  let timer = null;
  let onTimeout, provisionalConsent;
  let cmpLoaded = false;

  function resetTimeout(timeout) {
    if (timer != null) {
      clearTimeout(timer);
    }
    if (!isDone && timeout != null) {
      if (timeout === 0) {
        onTimeout()
      } else {
        timer = setTimeout(onTimeout, timeout);
      }
    }
  }

  function done(consentData, shouldCancelAuction, errMsg, ...extraArgs) {
    resetTimeout(null);
    isDone = true;
    gdprDataHandler.setConsentData(consentData);
    if (typeof cb === 'function') {
      cb(shouldCancelAuction, errMsg, ...extraArgs);
    }
  }

  if (!includes(Object.keys(cmpCallMap), userCMP)) {
    done(null, false, `CMP framework (${userCMP}) is not a supported framework.  Aborting consentManagement module and resuming auction.`);
    return;
  }

  const callbacks = {
    onSuccess: (data) => done(data, false),
    onError: function (msg, ...extraArgs) {
      done(null, true, msg, ...extraArgs);
    },
    onEvent: function (consentData) {
      provisionalConsent = consentData;
      if (cmpLoaded) return;
      cmpLoaded = true;
      if (actionTimeout != null) {
        resetTimeout(actionTimeout);
      }
    }
  }

  onTimeout = () => {
    const continueToAuction = (data) => {
      done(data, false, `${cmpLoaded ? 'Timeout waiting for user action on CMP' : 'CMP did not load'}, continuing auction...`);
    }
    processCmpData(provisionalConsent, {
      onSuccess: continueToAuction,
      onError: () => continueToAuction(storeConsentData(undefined)),
    })
  }

  cmpCallMap[userCMP](callbacks);
  if (!(actionTimeout != null && cmpLoaded)) {
    resetTimeout(consentTimeout);
  }
}

/**
 * Like `loadConsentData`, but cache and re-use previously loaded data.
 * @param cb
 */
function loadIfMissing(cb) {
  if (consentData) {
    logInfo('User consent information already known.  Pulling internally stored information...');
    // eslint-disable-next-line standard/no-callback-literal
    cb(false);
  } else {
    loadConsentData(cb);
  }
}

/**
 * If consentManagement module is enabled (ie included in setConfig), this hook function will attempt to fetch the
 * user's encoded consent string from the supported CMP.  Once obtained, the module will store this
 * data as part of a gdprConsent object which gets transferred to adapterManager's gdprDataHandler object.
 * This information is later added into the bidRequest object for any supported adapters to read/pass along to their system.
 * @param {object} reqBidsConfigObj required; This is the same param that's used in pbjs.requestBids.
 * @param {function} fn required; The next function in the chain, used by hook.js
 */
export const requestBidsHook = timedAuctionHook('gdpr', function requestBidsHook(fn, reqBidsConfigObj) {
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

/**
 * This function checks the consent data provided by CMP to ensure it's in an expected state.
 * If it's bad, we call `onError`
 * If it's good, then we store the value and call `onSuccess`
 */
function processCmpData(consentObject, {onSuccess, onError}) {
  function checkData() {
    // if CMP does not respond with a gdprApplies boolean, use defaultGdprScope (gdprScope)
    const gdprApplies = consentObject && typeof consentObject.gdprApplies === 'boolean' ? consentObject.gdprApplies : gdprScope;
    const tcString = consentObject && consentObject.tcString;
    return !!(
      (typeof gdprApplies !== 'boolean') ||
      (gdprApplies === true && (!tcString || !isStr(tcString)))
    );
  }

  if (checkData()) {
    onError(`CMP returned unexpected value during lookup process.`, consentObject);
  } else {
    onSuccess(storeConsentData(consentObject));
  }
}

/**
 * Stores CMP data locally in module to make information available in adaptermanager.js for later in the auction
 * @param {object} cmpConsentObject required; an object representing user's consent choices (can be undefined in certain use-cases for this function only)
 */
function storeConsentData(cmpConsentObject) {
  consentData = {
    consentString: (cmpConsentObject) ? cmpConsentObject.tcString : undefined,
    vendorData: (cmpConsentObject) || undefined,
    gdprApplies: cmpConsentObject && typeof cmpConsentObject.gdprApplies === 'boolean' ? cmpConsentObject.gdprApplies : gdprScope
  };
  if (cmpConsentObject && cmpConsentObject.addtlConsent && isStr(cmpConsentObject.addtlConsent)) {
    consentData.addtlConsent = cmpConsentObject.addtlConsent;
  }
  consentData.apiVersion = CMP_VERSION;
  return consentData;
}

/**
 * Simply resets the module's consentData variable back to undefined, mainly for testing purposes
 */
export function resetConsentData() {
  consentData = undefined;
  userCMP = undefined;
  consentTimeout = undefined;
  gdprDataHandler.reset();
}

/**
 * A configuration function that initializes some module variables, as well as add a hook into the requestBids function
 * @param {{cmp:string, timeout:number, defaultGdprScope:boolean}} config required; consentManagement module config settings; cmp (string), timeout (int))
 */
export function setConsentConfig(config) {
  // if `config.gdpr`, `config.usp` or `config.gpp` exist, assume new config format.
  // else for backward compatability, just use `config`
  config = config && (config.gdpr || config.usp || config.gpp ? config.gdpr : config);
  if (!config || typeof config !== 'object') {
    logWarn('consentManagement (gdpr) config not defined, exiting consent manager');
    return;
  }
  if (isStr(config.cmpApi)) {
    userCMP = config.cmpApi;
  } else {
    userCMP = DEFAULT_CMP;
    logInfo(`consentManagement config did not specify cmp.  Using system default setting (${DEFAULT_CMP}).`);
  }

  if (isNumber(config.timeout)) {
    consentTimeout = config.timeout;
  } else {
    consentTimeout = DEFAULT_CONSENT_TIMEOUT;
    logInfo(`consentManagement config did not specify timeout.  Using system default setting (${DEFAULT_CONSENT_TIMEOUT}).`);
  }

  actionTimeout = isNumber(config.actionTimeout) ? config.actionTimeout : null;

  // if true, then gdprApplies should be set to true
  gdprScope = config.defaultGdprScope === true;

  logInfo('consentManagement module has been activated...');

  if (userCMP === 'static') {
    if (isPlainObject(config.consentData)) {
      staticConsentData = config.consentData;
      if (staticConsentData?.getTCData != null) {
        // accept static config with or without `getTCData` - see https://github.com/prebid/Prebid.js/issues/9581
        staticConsentData = staticConsentData.getTCData;
      }
      consentTimeout = 0;
    } else {
      logError(`consentManagement config with cmpApi: 'static' did not specify consentData. No consents will be available to adapters.`);
    }
  }
  if (!addedConsentHook) {
    getGlobal().requestBids.before(requestBidsHook, 50);
  }
  addedConsentHook = true;
  gdprDataHandler.enable();
  loadConsentData(); // immediately look up consent data to make it available without requiring an auction
}
config.getConfig('consentManagement', config => setConsentConfig(config.consentManagement));

export function enrichFPDHook(next, fpd) {
  return next(fpd.then(ortb2 => {
    const consent = gdprDataHandler.getConsentData();
    if (consent) {
      if (typeof consent.gdprApplies === 'boolean') {
        deepSetValue(ortb2, 'regs.ext.gdpr', consent.gdprApplies ? 1 : 0);
      }
      deepSetValue(ortb2, 'user.ext.consent', consent.consentString);
    }
    return ortb2;
  }));
}

enrichFPD.before(enrichFPDHook);

export function setOrtbAdditionalConsent(ortbRequest, bidderRequest) {
  // this is not a standardized name for addtlConsent, so keep this as an ORTB library processor rather than an FPD enrichment
  const addtl = bidderRequest.gdprConsent?.addtlConsent;
  if (addtl && typeof addtl === 'string') {
    deepSetValue(ortbRequest, 'user.ext.ConsentedProvidersSettings.consented_providers', addtl);
  }
}

registerOrtbProcessor({type: REQUEST, name: 'gdprAddtlConsent', fn: setOrtbAdditionalConsent})
