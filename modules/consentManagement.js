/**
 * This module adds GDPR consentManagement support to prebid.js.  It interacts with
 * supported CMPs (Consent Management Platforms) to grab the user's consent information
 * and make it available for any GDPR supported adapters to read/pass this information to
 * their system.
 */
import * as utils from '../src/utils.js';
import { config } from '../src/config.js';
import { gdprDataHandler } from '../src/adapterManager.js';
import includes from 'core-js/library/fn/array/includes.js';
import strIncludes from 'core-js/library/fn/string/includes.js';

const DEFAULT_CMP = 'iab';
const DEFAULT_CONSENT_TIMEOUT = 10000;
const DEFAULT_ALLOW_AUCTION_WO_CONSENT = true;

export let userCMP;
export let consentTimeout;
export let allowAuction;
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
 * @param {function(string)} cmpSuccess acts as a success callback when the value is read from config; pass along consentObject (string) from CMP
 * @param {function(string)} cmpError acts as an error callback while interacting with the config string; pass along an error message (string)
 * @param {object} hookConfig contains module related variables (see comment in requestBidsHook function)
 */
function lookupStaticConsentData(cmpSuccess, cmpError, hookConfig) {
  cmpSuccess(staticConsentData, hookConfig);
}

/**
 * This function handles interacting with an IAB compliant CMP to obtain the consent information of the user.
 * Given the async nature of the CMP's API, we pass in acting success/error callback functions to exit this function
 * based on the appropriate result.
 * @param {function(string)} cmpSuccess acts as a success callback when CMP returns a value; pass along consentObject (string) from CMP
 * @param {function(string)} cmpError acts as an error callback while interacting with CMP; pass along an error message (string)
 * @param {object} hookConfig contains module related variables (see comment in requestBidsHook function)
 */
function lookupIabConsent(cmpSuccess, cmpError, hookConfig) {
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
    utils.logInfo('Received a response from CMP', tcfData);
    if (success) {
      if (tcfData.eventStatus === 'tcloaded' || tcfData.eventStatus === 'useractioncomplete') {
        cmpSuccess(tcfData, hookConfig);
      } else if (tcfData.eventStatus === 'cmpuishown' && tcfData.tcString && tcfData.purposeOneTreatment === true) {
        cmpSuccess(tcfData, hookConfig);
      }
    } else {
      cmpError('CMP unable to register callback function.  Please check CMP setup.', hookConfig);
    }
  }

  function handleV1CmpResponseCallbacks() {
    const cmpResponse = {};

    function afterEach() {
      if (cmpResponse.getConsentData && cmpResponse.getVendorConsents) {
        utils.logInfo('Received all requested responses from CMP', cmpResponse);
        cmpSuccess(cmpResponse, hookConfig);
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
    return cmpError('CMP not found.', hookConfig);
  }
  // to collect the consent information from the user, we perform two calls to the CMP in parallel:
  // first to collect the user's consent choices represented in an encoded string (via getConsentData)
  // second to collect the user's full unparsed consent information (via getVendorConsents)

  // the following code also determines where the CMP is located and uses the proper workflow to communicate with it:
  // check to see if CMP is found on the same window level as prebid and call it directly if so
  // check to see if prebid is in a safeframe (with CMP support)
  // else assume prebid may be inside an iframe and use the IAB CMP locator code to see if CMP's located in a higher parent window. this works in cross domain iframes
  // if the CMP is not found, the iframe function will call the cmpError exit callback to abort the rest of the CMP workflow

  if (utils.isFn(cmpFunction)) {
    utils.logInfo('Detected CMP API is directly accessible, calling it now...');
    if (cmpVersion === 1) {
      cmpFunction('getConsentData', null, v1CallbackHandler.consentDataCallback);
      cmpFunction('getVendorConsents', null, v1CallbackHandler.vendorConsentsCallback);
    } else if (cmpVersion === 2) {
      cmpFunction('addEventListener', cmpVersion, v2CmpResponseCallback);
    }
  } else if (cmpVersion === 1 && inASafeFrame() && typeof window.$sf.ext.cmp === 'function') {
    // this safeframe workflow is only supported with TCF v1 spec; the v2 recommends to use the iframe postMessage route instead (even if you are in a safeframe).
    utils.logInfo('Detected Prebid.js is encased in a SafeFrame and CMP is registered, calling it now...');
    callCmpWhileInSafeFrame('getConsentData', v1CallbackHandler.consentDataCallback);
    callCmpWhileInSafeFrame('getVendorConsents', v1CallbackHandler.vendorConsentsCallback);
  } else {
    utils.logInfo('Detected CMP is outside the current iframe where Prebid.js is located, calling it now...');
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

    // find sizes from adUnits object
    let adUnits = hookConfig.adUnits;
    let width = 1;
    let height = 1;
    if (Array.isArray(adUnits) && adUnits.length > 0) {
      let sizes = utils.getAdUnitSizes(adUnits[0]);
      width = sizes[0][0];
      height = sizes[0][1];
    }

    window.$sf.ext.register(width, height, sfCallback);
    window.$sf.ext.cmp(commandName);
  }

  function callCmpWhileInIframe(commandName, cmpFrame, moduleCallback) {
    let apiName = (cmpVersion === 2) ? '__tcfapi' : '__cmp';

    /* Setup up a __cmp function to do the postMessage and stash the callback.
      This function behaves (from the caller's perspective identicially to the in-frame __cmp call */
    window[apiName] = function (cmd, arg, callback) {
      let callId = Math.random() + '';
      let callName = `${apiName}Call`;
      let msg = {
        [callName]: {
          command: cmd,
          parameter: arg,
          callId: callId
        }
      };
      if (cmpVersion !== 1) msg[callName].version = cmpVersion;

      cmpCallbacks[callId] = callback;
      cmpFrame.postMessage(msg, '*');
    }

    /** when we get the return message, call the stashed callback */
    window.addEventListener('message', readPostMessageResponse, false);

    // call CMP
    window[apiName](commandName, null, moduleCallback);

    function readPostMessageResponse(event) {
      let cmpDataPkgName = `${apiName}Return`;
      let json = (typeof event.data === 'string' && strIncludes(event.data, cmpDataPkgName)) ? JSON.parse(event.data) : event.data;
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
 * If consentManagement module is enabled (ie included in setConfig), this hook function will attempt to fetch the
 * user's encoded consent string from the supported CMP.  Once obtained, the module will store this
 * data as part of a gdprConsent object which gets transferred to adapterManager's gdprDataHandler object.
 * This information is later added into the bidRequest object for any supported adapters to read/pass along to their system.
 * @param {object} reqBidsConfigObj required; This is the same param that's used in pbjs.requestBids.
 * @param {function} fn required; The next function in the chain, used by hook.js
 */
export function requestBidsHook(fn, reqBidsConfigObj) {
  // preserves all module related variables for the current auction instance (used primiarily for concurrent auctions)
  const hookConfig = {
    context: this,
    args: [reqBidsConfigObj],
    nextFn: fn,
    adUnits: reqBidsConfigObj.adUnits || $$PREBID_GLOBAL$$.adUnits,
    bidsBackHandler: reqBidsConfigObj.bidsBackHandler,
    haveExited: false,
    timer: null
  };

  // in case we already have consent (eg during bid refresh)
  if (consentData) {
    utils.logInfo('User consent information already known.  Pulling internally stored information...');
    return exitModule(null, hookConfig);
  }

  if (!includes(Object.keys(cmpCallMap), userCMP)) {
    utils.logWarn(`CMP framework (${userCMP}) is not a supported framework.  Aborting consentManagement module and resuming auction.`);
    return hookConfig.nextFn.apply(hookConfig.context, hookConfig.args);
  }

  cmpCallMap[userCMP].call(this, processCmpData, cmpFailed, hookConfig);

  // only let this code run if module is still active (ie if the callbacks used by CMPs haven't already finished)
  if (!hookConfig.haveExited) {
    if (consentTimeout === 0) {
      processCmpData(undefined, hookConfig);
    } else {
      hookConfig.timer = setTimeout(cmpTimedOut.bind(null, hookConfig), consentTimeout);
    }
  }
}

/**
 * This function checks the consent data provided by CMP to ensure it's in an expected state.
 * If it's bad, we exit the module depending on config settings.
 * If it's good, then we store the value and exits the module.
 * @param {object} consentObject required; object returned by CMP that contains user's consent choices
 * @param {object} hookConfig contains module related variables (see comment in requestBidsHook function)
 */
function processCmpData(consentObject, hookConfig) {
  function checkV1Data(consentObject) {
    let gdprApplies = consentObject && consentObject.getConsentData && consentObject.getConsentData.gdprApplies;
    return !!(
      (typeof gdprApplies !== 'boolean') ||
      (gdprApplies === true &&
        !(utils.isStr(consentObject.getConsentData.consentData) &&
          utils.isPlainObject(consentObject.getVendorConsents) &&
          Object.keys(consentObject.getVendorConsents).length > 1
        )
      )
    );
  }

  function checkV2Data() {
    let gdprApplies = consentObject && consentObject.gdprApplies;
    let tcString = consentObject && consentObject.tcString;
    return !!(
      (typeof gdprApplies !== 'boolean') ||
      (gdprApplies === true && !utils.isStr(tcString))
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

  if (utils.isFn(checkFn)) {
    if (checkFn(consentObject)) {
      cmpFailed(`CMP returned unexpected value during lookup process.`, hookConfig, consentObject);
    } else {
      clearTimeout(hookConfig.timer);
      storeConsentData(consentObject);
      exitModule(null, hookConfig);
    }
  } else {
    cmpFailed('Unable to derive CMP version to process data.  Consent object does not conform to TCF v1 or v2 specs.', hookConfig, consentObject);
  }
}

/**
 * General timeout callback when interacting with CMP takes too long.
 */
function cmpTimedOut(hookConfig) {
  cmpFailed('CMP workflow exceeded timeout threshold.', hookConfig);
}

/**
 * This function contains the controlled steps to perform when there's a problem with CMP.
 * @param {string} errMsg required; should be a short descriptive message for why the failure/issue happened.
 * @param {object} hookConfig contains module related variables (see comment in requestBidsHook function)
 * @param {object} extraArgs contains additional data that's passed along in the error/warning messages for easier debugging
*/
function cmpFailed(errMsg, hookConfig, extraArgs) {
  clearTimeout(hookConfig.timer);

  // still set the consentData to undefined when there is a problem as per config options
  if (allowAuction) {
    storeConsentData(undefined);
  }
  exitModule(errMsg, hookConfig, extraArgs);
}

/**
 * Stores CMP data locally in module and then invokes gdprDataHandler.setConsentData() to make information available in adaptermanger.js for later in the auction
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
      gdprApplies: (cmpConsentObject) ? cmpConsentObject.gdprApplies : gdprScope
    };
  }
  consentData.apiVersion = cmpVersion;
  gdprDataHandler.setConsentData(consentData);
}

/**
 * This function handles the exit logic for the module.
 * While there are several paths in the module's logic to call this function, we only allow 1 of the 3 potential exits to happen before suppressing others.
 *
 * We prevent multiple exits to avoid conflicting messages in the console depending on certain scenarios.
 * One scenario could be auction was canceled due to timeout with CMP being reached.
 * While the timeout is the accepted exit and runs first, the CMP's callback still tries to process the user's data (which normally leads to a good exit).
 * In this case, the good exit will be suppressed since we already decided to cancel the auction.
 *
 * Three exit paths are:
 * 1. good exit where auction runs (CMP data is processed normally).
 * 2. bad exit but auction still continues (warning message is logged, CMP data is undefined and still passed along).
 * 3. bad exit with auction canceled (error message is logged).
 * @param {string} errMsg optional; only to be used when there was a 'bad' exit.  String is a descriptive message for the failure/issue encountered.
 * @param {object} hookConfig contains module related variables (see comment in requestBidsHook function)
 * @param {object} extraArgs contains additional data that's passed along in the error/warning messages for easier debugging
 */
function exitModule(errMsg, hookConfig, extraArgs) {
  if (hookConfig.haveExited === false) {
    hookConfig.haveExited = true;

    let context = hookConfig.context;
    let args = hookConfig.args;
    let nextFn = hookConfig.nextFn;

    if (errMsg) {
      if (allowAuction) {
        utils.logWarn(errMsg + ' Resuming auction without consent data as per consentManagement config.', extraArgs);
        nextFn.apply(context, args);
      } else {
        utils.logError(errMsg + ' Canceling auction as per consentManagement config.', extraArgs);
        if (typeof hookConfig.bidsBackHandler === 'function') {
          hookConfig.bidsBackHandler();
        } else {
          utils.logError('Error executing bidsBackHandler');
        }
      }
    } else {
      nextFn.apply(context, args);
    }
  }
}

/**
 * Simply resets the module's consentData variable back to undefined, mainly for testing purposes
 */
export function resetConsentData() {
  consentData = undefined;
  userCMP = undefined;
  cmpVersion = 0;
  gdprDataHandler.setConsentData(null);
}

/**
 * A configuration function that initializes some module variables, as well as add a hook into the requestBids function
 * @param {{cmp:string, timeout:number, allowAuctionWithoutConsent:boolean, defaultGdprScope:boolean}} config required; consentManagement module config settings; cmp (string), timeout (int), allowAuctionWithoutConsent (boolean)
 */
export function setConsentConfig(config) {
  // if `config.gdpr` or `config.usp` exist, assume new config format.
  // else for backward compatability, just use `config`
  config = config.gdpr || config.usp ? config.gdpr : config;
  if (!config || typeof config !== 'object') {
    utils.logWarn('consentManagement config not defined, exiting consent manager');
    return;
  }
  if (utils.isStr(config.cmpApi)) {
    userCMP = config.cmpApi;
  } else {
    userCMP = DEFAULT_CMP;
    utils.logInfo(`consentManagement config did not specify cmp.  Using system default setting (${DEFAULT_CMP}).`);
  }

  if (utils.isNumber(config.timeout)) {
    consentTimeout = config.timeout;
  } else {
    consentTimeout = DEFAULT_CONSENT_TIMEOUT;
    utils.logInfo(`consentManagement config did not specify timeout.  Using system default setting (${DEFAULT_CONSENT_TIMEOUT}).`);
  }

  if (typeof config.allowAuctionWithoutConsent === 'boolean') {
    allowAuction = config.allowAuctionWithoutConsent;
  } else {
    allowAuction = DEFAULT_ALLOW_AUCTION_WO_CONSENT;
    utils.logInfo(`consentManagement config did not specify allowAuctionWithoutConsent.  Using system default setting (${DEFAULT_ALLOW_AUCTION_WO_CONSENT}).`);
  }

  // if true, then gdprApplies should be set to true
  gdprScope = config.defaultGdprScope === true;

  utils.logInfo('consentManagement module has been activated...');

  if (userCMP === 'static') {
    if (utils.isPlainObject(config.consentData)) {
      staticConsentData = config.consentData;
      consentTimeout = 0;
    } else {
      utils.logError(`consentManagement config with cmpApi: 'static' did not specify consentData. No consents will be available to adapters.`);
    }
  }
  if (!addedConsentHook) {
    $$PREBID_GLOBAL$$.requestBids.before(requestBidsHook, 50);
  }
  addedConsentHook = true;
}
config.getConfig('consentManagement', config => setConsentConfig(config.consentManagement));
