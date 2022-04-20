/**
 * This module adds GDPR consentManagement support to prebid.js.  It interacts with
 * supported CMPs (Consent Management Platforms) to grab the user's consent information
 * and make it available for any GDPR supported adapters to read/pass this information to
 * their system.
 */
import {getAdUnitSizes, isFn, isNumber, isPlainObject, isStr, logError, logInfo, logWarn} from '../src/utils.js';
import {config} from '../src/config.js';
import {gdprDataHandler} from '../src/adapterManager.js';
import {includes} from '../src/polyfill.js';

const DEFAULT_CMP = 'iab';
const DEFAULT_CONSENT_TIMEOUT = 10000;
const DEFAULT_ALLOW_AUCTION_WO_CONSENT = true;

export const allowAuction = {
  value: DEFAULT_ALLOW_AUCTION_WO_CONSENT,
  definedInConfig: false
}
export let userCMP;
export let consentTimeout;
export let gdprScope;
export let staticConsentData;

let cmpVersion = 0;
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
 * @param width
 * @param height size info passed to the SafeFrame API (used only for TCFv1 when Prebid is running within a safeframe)
 */
function lookupIabConsent({onSuccess, onError, width, height}) {
  function findCMP() {
    let f = window;
    let cmpFrame;
    let cmpFunction;
    while (!cmpFrame) {
      try {
        if (typeof f.__tcfapi === 'function' || typeof f.__cmp === 'function') {
          if (typeof f.__tcfapi === 'function') {
            cmpVersion = 2;
            cmpFunction = f.__tcfapi;
          } else {
            cmpVersion = 1;
            cmpFunction = f.__cmp;
          }
          cmpFrame = f;
          break;
        }
      } catch (e) { }

      // need separate try/catch blocks due to the exception errors thrown when trying to check for a frame that doesn't exist in 3rd party env
      try {
        if (f.frames['__tcfapiLocator']) {
          cmpVersion = 2;
          cmpFrame = f;
          break;
        }
      } catch (e) { }

      try {
        if (f.frames['__cmpLocator']) {
          cmpVersion = 1;
          cmpFrame = f;
          break;
        }
      } catch (e) { }

      if (f === window.top) break;
      f = f.parent;
    }
    return {
      cmpFrame,
      cmpFunction
    };
  }

  function v2CmpResponseCallback(tcfData, success) {
    logInfo('Received a response from CMP', tcfData);
    if (success) {
      if (tcfData.gdprApplies === false || tcfData.eventStatus === 'tcloaded' || tcfData.eventStatus === 'useractioncomplete') {
        processCmpData(tcfData, {onSuccess, onError});
      }
    } else {
      onError('CMP unable to register callback function.  Please check CMP setup.');
    }
  }

  function handleV1CmpResponseCallbacks() {
    const cmpResponse = {};

    function afterEach() {
      if (cmpResponse.getConsentData && cmpResponse.getVendorConsents) {
        logInfo('Received all requested responses from CMP', cmpResponse);
        processCmpData(cmpResponse, {onSuccess, onError});
      }
    }

    return {
      consentDataCallback: function (consentResponse) {
        cmpResponse.getConsentData = consentResponse;
        afterEach();
      },
      vendorConsentsCallback: function (consentResponse) {
        cmpResponse.getVendorConsents = consentResponse;
        afterEach();
      }
    }
  }

  let v1CallbackHandler = handleV1CmpResponseCallbacks();
  let cmpCallbacks = {};
  let { cmpFrame, cmpFunction } = findCMP();

  if (!cmpFrame) {
    return onError('CMP not found.');
  }
  // to collect the consent information from the user, we perform two calls to the CMP in parallel:
  // first to collect the user's consent choices represented in an encoded string (via getConsentData)
  // second to collect the user's full unparsed consent information (via getVendorConsents)

  // the following code also determines where the CMP is located and uses the proper workflow to communicate with it:
  // check to see if CMP is found on the same window level as prebid and call it directly if so
  // check to see if prebid is in a safeframe (with CMP support)
  // else assume prebid may be inside an iframe and use the IAB CMP locator code to see if CMP's located in a higher parent window. this works in cross domain iframes
  // if the CMP is not found, the iframe function will call the cmpError exit callback to abort the rest of the CMP workflow

  if (isFn(cmpFunction)) {
    logInfo('Detected CMP API is directly accessible, calling it now...');
    if (cmpVersion === 1) {
      cmpFunction('getConsentData', null, v1CallbackHandler.consentDataCallback);
      cmpFunction('getVendorConsents', null, v1CallbackHandler.vendorConsentsCallback);
    } else if (cmpVersion === 2) {
      cmpFunction('addEventListener', cmpVersion, v2CmpResponseCallback);
    }
  } else if (cmpVersion === 1 && inASafeFrame() && typeof window.$sf.ext.cmp === 'function') {
    // this safeframe workflow is only supported with TCF v1 spec; the v2 recommends to use the iframe postMessage route instead (even if you are in a safeframe).
    logInfo('Detected Prebid.js is encased in a SafeFrame and CMP is registered, calling it now...');
    callCmpWhileInSafeFrame('getConsentData', v1CallbackHandler.consentDataCallback);
    callCmpWhileInSafeFrame('getVendorConsents', v1CallbackHandler.vendorConsentsCallback);
  } else {
    logInfo('Detected CMP is outside the current iframe where Prebid.js is located, calling it now...');
    if (cmpVersion === 1) {
      callCmpWhileInIframe('getConsentData', cmpFrame, v1CallbackHandler.consentDataCallback);
      callCmpWhileInIframe('getVendorConsents', cmpFrame, v1CallbackHandler.vendorConsentsCallback);
    } else if (cmpVersion === 2) {
      callCmpWhileInIframe('addEventListener', cmpFrame, v2CmpResponseCallback);
    }
  }

  function inASafeFrame() {
    return !!(window.$sf && window.$sf.ext);
  }

  function callCmpWhileInSafeFrame(commandName, callback) {
    function sfCallback(msgName, data) {
      if (msgName === 'cmpReturn') {
        let responseObj = (commandName === 'getConsentData') ? data.vendorConsentData : data.vendorConsents;
        callback(responseObj);
      }
    }

    window.$sf.ext.register(width, height, sfCallback);
    window.$sf.ext.cmp(commandName);
  }

  function callCmpWhileInIframe(commandName, cmpFrame, moduleCallback) {
    let apiName = (cmpVersion === 2) ? '__tcfapi' : '__cmp';

    let callName = `${apiName}Call`;

    /* Setup up a __cmp function to do the postMessage and stash the callback.
    This function behaves (from the caller's perspective identicially to the in-frame __cmp call */
    if (cmpVersion === 2) {
      window[apiName] = function (cmd, cmpVersion, callback, arg) {
        let callId = Math.random() + '';
        let msg = {
          [callName]: {
            command: cmd,
            version: cmpVersion,
            parameter: arg,
            callId: callId
          }
        };

        cmpCallbacks[callId] = callback;
        cmpFrame.postMessage(msg, '*');
      }

      /** when we get the return message, call the stashed callback */
      window.addEventListener('message', readPostMessageResponse, false);

      // call CMP
      window[apiName](commandName, cmpVersion, moduleCallback);
    } else {
      window[apiName] = function (cmd, arg, callback) {
        let callId = Math.random() + '';
        let msg = {
          [callName]: {
            command: cmd,
            parameter: arg,
            callId: callId
          }
        };

        cmpCallbacks[callId] = callback;
        cmpFrame.postMessage(msg, '*');
      }

      /** when we get the return message, call the stashed callback */
      window.addEventListener('message', readPostMessageResponse, false);

      // call CMP
      window[apiName](commandName, undefined, moduleCallback);
    }

    function readPostMessageResponse(event) {
      let cmpDataPkgName = `${apiName}Return`;
      let json = (typeof event.data === 'string' && includes(event.data, cmpDataPkgName)) ? JSON.parse(event.data) : event.data;
      if (json[cmpDataPkgName] && json[cmpDataPkgName].callId) {
        let payload = json[cmpDataPkgName];
        // TODO - clean up this logic (move listeners?); we have duplicate messages responses because 2 eventlisteners are active from the 2 cmp requests running in parallel
        if (typeof cmpCallbacks[payload.callId] !== 'undefined') {
          cmpCallbacks[payload.callId](payload.returnValue, payload.success);
        }
      }
    }
  }
}

/**
 * Look up consent data and store it in the `consentData` global as well as `adapterManager.js`' gdprDataHandler.
 *
 * @param cb A callback that takes: a boolean that is true if the auction should be canceled; an error message and extra
 * error arguments that will be undefined if there's no error.
 * @param width if we are running in an iframe, the TCFv1 spec requires us to use the SafeFrame API to find the CMP - which
 * in turn requires width and height.
 * @param height see width above
 */
function loadConsentData(cb, width = 1, height = 1) {
  let isDone = false;
  let timer = null;

  function done(consentData, shouldCancelAuction, errMsg, ...extraArgs) {
    if (timer != null) {
      clearTimeout(timer);
    }
    isDone = true;
    gdprDataHandler.setConsentData(consentData);
    if (cb != null) {
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
      let consentData = null;
      let shouldCancelAuction = true;
      if (allowAuction.value && cmpVersion === 1) {
        // still set the consentData to undefined when there is a problem as per config options
        consentData = storeConsentData(undefined);
        shouldCancelAuction = false;
      }
      done(consentData, shouldCancelAuction, msg, ...extraArgs);
    }
  }
  cmpCallMap[userCMP]({
    width,
    height,
    ...callbacks
  });

  if (!isDone) {
    if (consentTimeout === 0) {
      processCmpData(undefined, callbacks);
    } else {
      timer = setTimeout(function () {
        if (cmpVersion === 2) {
          // for TCFv2, we allow the auction to continue on timeout
          done(storeConsentData(undefined), false, `No response from CMP, continuing auction...`)
        } else {
          callbacks.onError('CMP workflow exceeded timeout threshold.');
        }
      }, consentTimeout);
    }
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
export function requestBidsHook(fn, reqBidsConfigObj) {
  const load = (() => {
    if (consentData) {
      logInfo('User consent information already known.  Pulling internally stored information...');
      return function (cb) {
        // eslint-disable-next-line standard/no-callback-literal
        cb(false);
      }
    } else {
      // find sizes from adUnits object
      let adUnits = reqBidsConfigObj.adUnits || $$PREBID_GLOBAL$$.adUnits;
      let width = 1;
      let height = 1;
      if (Array.isArray(adUnits) && adUnits.length > 0) {
        let sizes = getAdUnitSizes(adUnits[0]);
        width = sizes?.[0]?.[0] || 1;
        height = sizes?.[0]?.[1] || 1;
      }

      return function (cb) {
        loadConsentData(cb, width, height);
      }
    }
  })();

  load(function (shouldCancelAuction, errMsg, ...extraArgs) {
    if (errMsg) {
      let log = logWarn;
      if (cmpVersion === 1 && !shouldCancelAuction) {
        errMsg = `${errMsg} 'allowAuctionWithoutConsent' activated.`;
      } else if (shouldCancelAuction) {
        log = logError;
        errMsg = `${errMsg} Canceling auction as per consentManagement config.`;
      }
      log(errMsg, ...extraArgs);
    }

    if (shouldCancelAuction) {
      if (typeof reqBidsConfigObj.bidsBackHandler === 'function') {
        reqBidsConfigObj.bidsBackHandler();
      } else {
        logError('Error executing bidsBackHandler');
      }
    } else {
      fn.call(this, reqBidsConfigObj);
    }
  });
}

/**
 * This function checks the consent data provided by CMP to ensure it's in an expected state.
 * If it's bad, we call `onError`
 * If it's good, then we store the value and call `onSuccess`
 */
function processCmpData(consentObject, {onSuccess, onError}) {
  function checkV1Data(consentObject) {
    let gdprApplies = consentObject && consentObject.getConsentData && consentObject.getConsentData.gdprApplies;
    return !!(
      (typeof gdprApplies !== 'boolean') ||
      (gdprApplies === true &&
        !(isStr(consentObject.getConsentData.consentData) &&
          isPlainObject(consentObject.getVendorConsents) &&
          Object.keys(consentObject.getVendorConsents).length > 1
        )
      )
    );
  }

  function checkV2Data() {
    // if CMP does not respond with a gdprApplies boolean, use defaultGdprScope (gdprScope)
    let gdprApplies = consentObject && typeof consentObject.gdprApplies === 'boolean' ? consentObject.gdprApplies : gdprScope;
    let tcString = consentObject && consentObject.tcString;
    return !!(
      (typeof gdprApplies !== 'boolean') ||
      (gdprApplies === true && !isStr(tcString))
    );
  }

  // do extra things for static config
  if (userCMP === 'static') {
    cmpVersion = (consentObject.getConsentData) ? 1 : (consentObject.getTCData) ? 2 : 0;
    // remove extra layer in static v2 data object so it matches normal v2 CMP object for processing step
    if (cmpVersion === 2) {
      consentObject = consentObject.getTCData;
    }
  }

  // determine which set of checks to run based on cmpVersion
  let checkFn = (cmpVersion === 1) ? checkV1Data : (cmpVersion === 2) ? checkV2Data : null;

  if (isFn(checkFn)) {
    if (checkFn(consentObject)) {
      onError(`CMP returned unexpected value during lookup process.`, consentObject);
    } else {
      onSuccess(storeConsentData(consentObject));
    }
  } else {
    onError('Unable to derive CMP version to process data.  Consent object does not conform to TCF v1 or v2 specs.', consentObject);
  }
}

/**
 * Stores CMP data locally in module to make information available in adaptermanager.js for later in the auction
 * @param {object} cmpConsentObject required; an object representing user's consent choices (can be undefined in certain use-cases for this function only)
 */
function storeConsentData(cmpConsentObject) {
  if (cmpVersion === 1) {
    consentData = {
      consentString: (cmpConsentObject) ? cmpConsentObject.getConsentData.consentData : undefined,
      vendorData: (cmpConsentObject) ? cmpConsentObject.getVendorConsents : undefined,
      gdprApplies: (cmpConsentObject) ? cmpConsentObject.getConsentData.gdprApplies : gdprScope
    };
  } else {
    consentData = {
      consentString: (cmpConsentObject) ? cmpConsentObject.tcString : undefined,
      vendorData: (cmpConsentObject) || undefined,
      gdprApplies: cmpConsentObject && typeof cmpConsentObject.gdprApplies === 'boolean' ? cmpConsentObject.gdprApplies : gdprScope
    };
    if (cmpConsentObject && cmpConsentObject.addtlConsent && isStr(cmpConsentObject.addtlConsent)) {
      consentData.addtlConsent = cmpConsentObject.addtlConsent;
    };
  }
  consentData.apiVersion = cmpVersion;
  return consentData;
}

/**
 * Simply resets the module's consentData variable back to undefined, mainly for testing purposes
 */
export function resetConsentData() {
  consentData = undefined;
  userCMP = undefined;
  cmpVersion = 0;
  gdprDataHandler.reset();
}

/**
 * A configuration function that initializes some module variables, as well as add a hook into the requestBids function
 * @param {{cmp:string, timeout:number, allowAuctionWithoutConsent:boolean, defaultGdprScope:boolean}} config required; consentManagement module config settings; cmp (string), timeout (int), allowAuctionWithoutConsent (boolean)
 */
export function setConsentConfig(config) {
  // if `config.gdpr` or `config.usp` exist, assume new config format.
  // else for backward compatability, just use `config`
  config = config && (config.gdpr || config.usp ? config.gdpr : config);
  if (!config || typeof config !== 'object') {
    logWarn('consentManagement config not defined, exiting consent manager');
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

  if (typeof config.allowAuctionWithoutConsent === 'boolean') {
    allowAuction.value = config.allowAuctionWithoutConsent;
    allowAuction.definedInConfig = true;
  }

  // if true, then gdprApplies should be set to true
  gdprScope = config.defaultGdprScope === true;

  logInfo('consentManagement module has been activated...');

  if (userCMP === 'static') {
    if (isPlainObject(config.consentData)) {
      staticConsentData = config.consentData;
      consentTimeout = 0;
    } else {
      logError(`consentManagement config with cmpApi: 'static' did not specify consentData. No consents will be available to adapters.`);
    }
  }
  if (!addedConsentHook) {
    $$PREBID_GLOBAL$$.requestBids.before(requestBidsHook, 50);
  }
  addedConsentHook = true;
  gdprDataHandler.enable();
  loadConsentData(); // immediately look up consent data to make it available without requiring an auction

  // Raise deprecation warning if 'allowAuctionWithoutConsent' is used with TCF 2.
  if (allowAuction.definedInConfig && cmpVersion === 2) {
    logWarn(`'allowAuctionWithoutConsent' ignored for TCF 2`);
  } else if (!allowAuction.definedInConfig && cmpVersion === 1) {
    logInfo(`'allowAuctionWithoutConsent' using system default: (${DEFAULT_ALLOW_AUCTION_WO_CONSENT}).`);
  }
}
config.getConfig('consentManagement', config => setConsentConfig(config.consentManagement));
