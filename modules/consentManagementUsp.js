/**
 * This module adds USPAPI (CCPA) consentManagement support to prebid.js. It
 * interacts with supported USP Consent APIs to grab the user's consent
 * information and make it available for any USP (CCPA) supported adapters to
 * read/pass this information to their system.
 */
import * as utils from '../src/utils';
import { config } from '../src/config';
import { uspDataHandler } from '../src/adapterManager';
import includes from 'core-js/library/fn/array/includes';

const DEFAULT_CONSENT_API = 'uspapi';
const DEFAULT_CONSENT_TIMEOUT = 50;
const DEFAULT_ALLOW_AUCTION_WO_CONSENT = true;

export let userUSP;
export let consentTimeout;
export let allowAuction;

let consentData;
let addedConsentHook = false;

// consent APIs
const uspCallMap = {
  'uspapi': lookupUpsConsent
};

/**
 * This function handles interacting with an USP compliant consent manager to obtain the consent information of the user.
 * Given the async nature of the USP's API, we pass in acting success/error callback functions to exit this function
 * based on the appropriate result.
 * @param {function(string)} uspSuccess acts as a success callback when USPAPI returns a value; pass along consentObject (string) from UPSAPI
 * @param {function(string)} uspError acts as an error callback while interacting with USPAPI; pass along an error message (string)
 * @param {object} hookConfig contains module related variables (see comment in requestBidsHook function)
 */
function lookupUpsConsent(uspSuccess, uspError, hookConfig) {
  function handleUspApiResponseCallbacks() {
    const uspResponse = {};

    function afterEach() {
      if (uspResponse.usPrivacy) {
        uspSuccess(uspResponse, hookConfig);
      }
    }

    return {
      consentDataCallback: consentResponse => {
        uspResponse.usPrivacy = consentResponse.usPrivacy;
        afterEach();
      }
    };
  }

  let callbackHandler = handleUspApiResponseCallbacks();
  let uspapiCallbacks = {};
  let uspapiFunction;

  // to collect the consent information from the user, we perform a call to USPAPI
  // to collect the user's consent choices represented as a string (via getUSPData)

  // the following code also determines where the USPAPI is located and uses the proper workflow to communicate with it:
  // - check to see if USPAPI is found on the same window level as prebid and call it directly if so
  // - else assume prebid may be inside an iframe and use the USPAPI locator code to see if USP's located in a higher parent window. This works in cross domain iframes
  // - if USPAPI is not found, the iframe function will call the uspError exit callback to abort the rest of the USPAPI workflow
  try {
    uspapiFunction = window.__uspapi || utils.getWindowTop().__uspapi;
  } catch (e) { }

  if (utils.isFn(uspapiFunction)) {
    uspapiFunction('getUSPData', 1, callbackHandler.consentDataCallback);
  } else {
    // find the CMP frame
    let f = window;
    let uspapiFrame;
    while (!uspapiFrame) {
      try {
        if (f.frames['__uspapiLocator']) uspapiFrame = f;
      } catch (e) { }
      if (f === window.top) break;
      f = f.parent;
    }

    if (!uspapiFrame) {
      return uspError('CMP not found.', hookConfig);
    }

    callUspApiWhileInIframe('getUSPData', uspapiFrame, callbackHandler.consentDataCallback);
  }

  function callUspApiWhileInIframe(commandName, uspapiFrame, moduleCallback) {
    /* Setup up a __uspapi function to do the postMessage and stash the callback.
      This function behaves (from the caller's perspective identicially to the in-frame __uspapi call */
    window.__uspapi = function (cmd, ver, callback) {
      let callId = Math.random() + '';
      let msg = {
        __uspapiCall: {
          command: cmd,
          version: ver,
          callId: callId
        }
      };

      uspapiCallbacks[callId] = callback;
      uspapiFrame.postMessage(msg, '*');
    }

    /** when we get the return message, call the stashed callback */
    window.addEventListener('message', readPostMessageResponse, false);

    // call uspapi
    window.__uspapi(commandName, 1, uspapiCallback);

    function readPostMessageResponse(event) {
      let res = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
      if (res.__uspapiReturn && res.__uspapiReturn.callId) {
        let i = res.__uspapiReturn;
        if (typeof uspapiCallbacks[i.callId] !== 'undefined') {
          uspapiCallbacks[i.callId](i.returnValue, i.success);
          delete uspapiCallbacks[i.callId];
        }
      }
    }

    function uspapiCallback(consentObject) {
      window.removeEventListener('message', readPostMessageResponse, false);
      moduleCallback(consentObject);
    }
  }
}

/**
 * If consentManagementUSP module is enabled (ie included in setConfig), this hook function will attempt to fetch the
 * user's encoded consent string from the supported USPAPI. Once obtained, the module will store this
 * data as part of a uspConsent object which gets transferred to adapterManager's uspDataHandler object.
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
    return exitModule(null, hookConfig);
  }

  if (!includes(Object.keys(uspCallMap), userUSP)) {
    utils.logWarn(`USP framework (${userUSP}) is not a supported framework. Aborting consentManagement module and resuming auction.`);
    return hookConfig.nextFn.apply(hookConfig.context, hookConfig.args);
  }

  uspCallMap[userUSP].call(this, processUspData, uspapiFailed, hookConfig);

  // only let this code run if module is still active (ie if the callbacks used by USPs haven't already finished)
  if (!hookConfig.haveExited) {
    if (consentTimeout === 0) {
      processUspData(undefined, hookConfig);
    } else {
      hookConfig.timer = setTimeout(uspapiTimeout.bind(null, hookConfig), consentTimeout);
    }
  }
}

/**
 * This function checks the consent data provided by USPAPI to ensure it's in an expected state.
 * If it's bad, we exit the module depending on config settings.
 * If it's good, then we store the value and exits the module.
 * @param {object} consentObject required; object returned by USPAPI that contains user's consent choices
 * @param {object} hookConfig contains module related variables (see comment in requestBidsHook function)
 */
function processUspData(consentObject, hookConfig) {
  const valid = !!(consentObject && consentObject.usPrivacy);
  if (!valid) {
    uspapiFailed(`UPSAPI returned unexpected value during lookup process.`, hookConfig, consentObject);
    return;
  }

  clearTimeout(hookConfig.timer);
  storeUspConsentData(consentObject);
  exitModule(null, hookConfig);
}

/**
 * General timeout callback when interacting with USPAPI takes too long.
 */
function uspapiTimeout(hookConfig) {
  cmpFailed('USPAPI workflow exceeded timeout threshold.', hookConfig);
}

/**
 * This function contains the controlled steps to perform when there's a problem with USPAPI.
 * @param {string} errMsg required; should be a short descriptive message for why the failure/issue happened.
 * @param {object} hookConfig contains module related variables (see comment in requestBidsHook function)
 * @param {object} extraArgs contains additional data that's passed along in the error/warning messages for easier debugging
*/
function uspapiFailed(errMsg, hookConfig, extraArgs) {
  clearTimeout(hookConfig.timer);

  // still set the consentData to undefined when there is a problem as per config options
  if (allowAuction) {
    storeUspConsentData(undefined);
  }

  exitModule(errMsg, hookConfig, extraArgs);
}

/**
 * Stores USP data locally in module and then invokes uspDataHandler.setConsentData() to make information available in adaptermanger.js for later in the auction
 * @param {object} cmpConsentObject required; an object representing user's consent choices (can be undefined in certain use-cases for this function only)
 */
function storeUspConsentData(consentObject) {
  consentData = { usPrivacy: consentObject ? consentObject.usPrivacy : undefined };
  uspDataHandler.setConsentData(consentData);
}

/**
 * This function handles the exit logic for the module.
 * There are several paths in the module's logic to call this function and we only allow 1 of the 3 potential exits to happen before suppressing others.
 *
 * We prevent multiple exits to avoid conflicting messages in the console depending on certain scenarios.
 * One scenario could be auction was canceled due to timeout with USPAPI being reached.
 * While the timeout is the accepted exit and runs first, the USP's callback still tries to process the user's data (which normally leads to a good exit).
 * In this case, the good exit will be suppressed since we already decided to cancel the auction.
 *
 * Three exit paths are:
 * 1. good exit where auction runs (USPAPI data is processed normally).
 * 2. bad exit but auction still continues (warning message is logged, USPAPI data is undefined and still passed along).
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
  uspDataHandler.setConsentData(null);
}

/**
 * A configuration function that initializes some module variables, as well as add a hook into the requestBids function
 * @param {object} config required; consentManagementUSP module config settings; usp (string), timeout (int), allowAuctionWithoutConsent (boolean)
 */
export function setConsentConfig(config) {
  if (utils.isStr(config.cmpApi)) {
    userUSP = config.cmpApi;
  } else {
    userUSP = DEFAULT_CONSENT_API;
    utils.logInfo(`consentManagementUSP config did not specify USP. Using system default setting (${DEFAULT_CONSENT_API}).`);
  }

  if (utils.isNumber(config.timeout)) {
    consentTimeout = config.timeout;
  } else {
    consentTimeout = DEFAULT_CONSENT_TIMEOUT;
    utils.logInfo(`consentManagementUSP config did not specify timeout. Using system default setting (${DEFAULT_CONSENT_TIMEOUT}).`);
  }

  if (typeof config.allowAuctionWithoutConsent === 'boolean') {
    allowAuction = config.allowAuctionWithoutConsent;
  } else {
    allowAuction = DEFAULT_ALLOW_AUCTION_WO_CONSENT;
    utils.logInfo(`consentManagementUSP config did not specify allowAuctionWithoutConsent. Using system default setting (${DEFAULT_ALLOW_AUCTION_WO_CONSENT}).`);
  }

  utils.logInfo('USPAPI consentManagement module has been activated...');

  if (!addedConsentHook) {
    $$PREBID_GLOBAL$$.requestBids.before(requestBidsHook, 50);
  }
  addedConsentHook = true;
}
config.getConfig('consentManagement', config => setConsentConfig(config.consentManagement));
