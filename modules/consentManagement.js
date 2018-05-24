/**
 * This module adds GDPR consentManagement support to prebid.js.  It interacts with
 * supported CMPs (Consent Management Platforms) to grab the user's consent information
 * and make it available for any GDPR supported adapters to read/pass this information to
 * their system.
 */
import * as utils from 'src/utils';
import { config } from 'src/config';
import { gdprDataHandler } from 'src/adaptermanager';
import includes from 'core-js/library/fn/array/includes';
import strIncludes from 'core-js/library/fn/string/includes';

const DEFAULT_CMP = 'iab';
const DEFAULT_CONSENT_TIMEOUT = 10000;
const DEFAULT_ALLOW_AUCTION_WO_CONSENT = true;

export let userCMP;
export let consentTimeout;
export let allowAuction;

let consentData;

let context;
let args;
let nextFn;
let bidsBackHandler;

let timer;
let haveExited;

// add new CMPs here, with their dedicated lookup function
const cmpCallMap = {
  'iab': lookupIabConsent
};

/**
 * This function handles interacting with an IAB compliant CMP to obtain the consentObject value of the user.
 * Given the async nature of the CMP's API, we pass in acting success/error callback functions to exit this function
 * based on the appropriate result.
 * @param {function(string)} cmpSuccess acts as a success callback when CMP returns a value; pass along consentObject (string) from CMP
 * @param {function(string)} cmpError acts as an error callback while interacting with CMP; pass along an error message (string)
 * @param {[objects]} adUnits used in the safeframe workflow to know what sizes to include in the $sf.ext.register call
 */
function lookupIabConsent(cmpSuccess, cmpError, adUnits) {
  let cmpCallbacks;

  // check if the CMP is located on the same window level as the prebid code.
  // if it's found, directly call the CMP via it's API and call the cmpSuccess callback.
  // if it's not found, assume the prebid code may be inside an iframe and the CMP code is located in a higher parent window.
  // in this case, use the IAB's iframe locator sample code (which is slightly cutomized) to try to find the CMP and use postMessage() to communicate with the CMP.
  if (utils.isFn(window.__cmp)) {
    window.__cmp('getVendorConsents', null, cmpSuccess);
  } else if (inASafeFrame() && typeof window.$sf.ext.cmp === 'function') {
    callCmpWhileInSafeFrame();
  } else {
    callCmpWhileInIframe();
  }

  function inASafeFrame() {
    return !!(window.$sf && window.$sf.ext);
  }

  function callCmpWhileInSafeFrame() {
    function sfCallback(msgName, data) {
      if (msgName === 'cmpReturn') {
        cmpSuccess(data.vendorConsents);
      }
    }

    // find sizes from adUnits object
    let width = 1;
    let height = 1;

    if (Array.isArray(adUnits) && adUnits.length > 0) {
      let sizes = utils.getAdUnitSizes(adUnits[0]);
      width = sizes[0][0];
      height = sizes[0][1];
    }

    window.$sf.ext.register(width, height, sfCallback);
    window.$sf.ext.cmp('getVendorConsents');
  }

  function callCmpWhileInIframe() {
    /**
     * START OF STOCK CODE FROM IAB 1.1 CMP SPEC
    */

    // find the CMP frame
    let f = window;
    let cmpFrame;
    while (!cmpFrame) {
      try {
        if (f.frames['__cmpLocator']) cmpFrame = f;
      } catch (e) {}
      if (f === window.top) break;
      f = f.parent;
    }

    cmpCallbacks = {};

    /* Setup up a __cmp function to do the postMessage and stash the callback.
      This function behaves (from the caller's perspective identicially to the in-frame __cmp call */
    window.__cmp = function(cmd, arg, callback) {
      if (!cmpFrame) {
        removePostMessageListener();

        let errmsg = 'CMP not found';
        // small customization to properly return error
        return cmpError(errmsg);
      }
      let callId = Math.random() + '';
      let msg = {__cmpCall: {
        command: cmd,
        parameter: arg,
        callId: callId
      }};
      cmpCallbacks[callId] = callback;
      cmpFrame.postMessage(msg, '*');
    }

    /** when we get the return message, call the stashed callback */
    // small customization to remove this eventListener later in module
    window.addEventListener('message', readPostMessageResponse, false);

    /**
     * END OF STOCK CODE FROM IAB 1.1 CMP SPEC
     */

    // call CMP
    window.__cmp('getVendorConsents', null, cmpIframeCallback);
  }

  function readPostMessageResponse(event) {
    // small customization to prevent reading strings from other sources that aren't JSON.stringified
    let json = (typeof event.data === 'string' && strIncludes(event.data, 'cmpReturn')) ? JSON.parse(event.data) : event.data;
    if (json.__cmpReturn) {
      let i = json.__cmpReturn;
      cmpCallbacks[i.callId](i.returnValue, i.success);
      delete cmpCallbacks[i.callId];
    }
  }

  function removePostMessageListener() {
    window.removeEventListener('message', readPostMessageResponse, false);
  }

  function cmpIframeCallback(consentObject) {
    removePostMessageListener();
    cmpSuccess(consentObject);
  }
}

/**
 * If consentManagement module is enabled (ie included in setConfig), this hook function will attempt to fetch the
 * user's encoded consent string from the supported CMP.  Once obtained, the module will store this
 * data as part of a gdprConsent object which gets transferred to adaptermanager's gdprDataHandler object.
 * This information is later added into the bidRequest object for any supported adapters to read/pass along to their system.
 * @param {object} reqBidsConfigObj required; This is the same param that's used in pbjs.requestBids.
 * @param {function} fn required; The next function in the chain, used by hook.js
 */
export function requestBidsHook(reqBidsConfigObj, fn) {
  context = this;
  args = arguments;
  nextFn = fn;
  haveExited = false;
  let adUnits = reqBidsConfigObj.adUnits || $$PREBID_GLOBAL$$.adUnits;
  bidsBackHandler = reqBidsConfigObj.bidsBackHandler;

  // in case we already have consent (eg during bid refresh)
  if (consentData) {
    return exitModule();
  }

  if (!includes(Object.keys(cmpCallMap), userCMP)) {
    utils.logWarn(`CMP framework (${userCMP}) is not a supported framework.  Aborting consentManagement module and resuming auction.`);
    return nextFn.apply(context, args);
  }

  cmpCallMap[userCMP].call(this, processCmpData, cmpFailed, adUnits);

  // only let this code run if module is still active (ie if the callbacks used by CMPs haven't already finished)
  if (!haveExited) {
    if (consentTimeout === 0) {
      processCmpData(undefined);
    } else {
      timer = setTimeout(cmpTimedOut, consentTimeout);
    }
  }
}

/**
 * This function checks the consent data provided by CMP to ensure it's in an expected state.
 * If it's bad, we exit the module depending on config settings.
 * If it's good, then we store the value and exits the module.
 * @param {object} consentObject required; object returned by CMP that contains user's consent choices
 */
function processCmpData(consentObject) {
  if (!utils.isPlainObject(consentObject) || !utils.isStr(consentObject.metadata) || consentObject.metadata === '') {
    cmpFailed(`CMP returned unexpected value during lookup process; returned value was (${consentObject}).`);
  } else {
    clearTimeout(timer);
    storeConsentData(consentObject);

    exitModule();
  }
}

/**
 * General timeout callback when interacting with CMP takes too long.
 */
function cmpTimedOut() {
  cmpFailed('CMP workflow exceeded timeout threshold.');
}

/**
 * This function contains the controlled steps to perform when there's a problem with CMP.
 * @param {string} errMsg required; should be a short descriptive message for why the failure/issue happened.
*/
function cmpFailed(errMsg) {
  clearTimeout(timer);

  // still set the consentData to undefined when there is a problem as per config options
  if (allowAuction) {
    storeConsentData(undefined);
  }
  exitModule(errMsg);
}

/**
 * Stores CMP data locally in module and then invokes gdprDataHandler.setConsentData() to make information available in adaptermanger.js for later in the auction
 * @param {object} cmpConsentObject required; an object representing user's consent choices (can be undefined in certain use-cases for this function only)
 */
function storeConsentData(cmpConsentObject) {
  consentData = {
    consentString: (cmpConsentObject) ? cmpConsentObject.metadata : undefined,
    vendorData: cmpConsentObject,
    gdprApplies: (cmpConsentObject) ? cmpConsentObject.gdprApplies : undefined
  };
  gdprDataHandler.setConsentData(consentData);
}

/**
 * This function handles the exit logic for the module.
 * There are several paths in the module's logic to call this function and we only allow 1 of the 3 potential exits to happen before suppressing others.
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
 */
function exitModule(errMsg) {
  if (haveExited === false) {
    haveExited = true;

    if (errMsg) {
      if (allowAuction) {
        utils.logWarn(errMsg + ' Resuming auction without consent data as per consentManagement config.');
        nextFn.apply(context, args);
      } else {
        utils.logError(errMsg + ' Canceling auction as per consentManagement config.');
        if (typeof bidsBackHandler === 'function') {
          bidsBackHandler();
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
  gdprDataHandler.setConsentData(null);
}

/**
 * A configuration function that initializes some module variables, as well as add a hook into the requestBids function
 * @param {object} config required; consentManagement module config settings; cmp (string), timeout (int), allowAuctionWithoutConsent (boolean)
 */
export function setConfig(config) {
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

  $$PREBID_GLOBAL$$.requestBids.addHook(requestBidsHook, 50);
}
config.getConfig('consentManagement', config => setConfig(config.consentManagement));
