/**
 * This module adds USPAPI (CCPA) consentManagement support to prebid.js. It
 * interacts with supported USP Consent APIs to grab the user's consent
 * information and make it available for any USP (CCPA) supported adapters to
 * read/pass this information to their system.
 */
import { isFn, logInfo, logWarn, isStr, isNumber, isPlainObject, logError } from '../src/utils.js';
import { config } from '../src/config.js';
import { uspDataHandler } from '../src/adapterManager.js';
import {getGlobal} from '../src/prebidGlobal.js';

const DEFAULT_CONSENT_API = 'iab';
const DEFAULT_CONSENT_TIMEOUT = 50;
const USPAPI_VERSION = 1;

export let consentAPI = DEFAULT_CONSENT_API;
export let consentTimeout = DEFAULT_CONSENT_TIMEOUT;
export let staticConsentData;

let consentData;
let addedConsentHook = false;

// consent APIs
const uspCallMap = {
  'iab': lookupUspConsent,
  'static': lookupStaticConsentData
};

/**
 * This function reads the consent string from the config to obtain the consent information of the user.
 */
function lookupStaticConsentData({onSuccess, onError}) {
  processUspData(staticConsentData, {onSuccess, onError});
}

/**
 * This function handles interacting with an USP compliant consent manager to obtain the consent information of the user.
 * Given the async nature of the USP's API, we pass in acting success/error callback functions to exit this function
 * based on the appropriate result.
 */
function lookupUspConsent({onSuccess, onError}) {
  function findUsp() {
    let f = window;
    let uspapiFrame;
    let uspapiFunction;

    while (!uspapiFrame) {
      try {
        if (typeof f.__uspapi === 'function') {
          uspapiFunction = f.__uspapi;
          uspapiFrame = f;
          break;
        }
      } catch (e) {}

      try {
        if (f.frames['__uspapiLocator']) {
          uspapiFrame = f;
          break;
        }
      } catch (e) {}
      if (f === window.top) break;
      f = f.parent;
    }
    return {
      uspapiFrame,
      uspapiFunction,
    };
  }

  function handleUspApiResponseCallbacks() {
    const uspResponse = {};

    function afterEach() {
      if (uspResponse.usPrivacy) {
        processUspData(uspResponse, {onSuccess, onError})
      } else {
        onError('Unable to get USP consent string.');
      }
    }

    return {
      consentDataCallback: (consentResponse, success) => {
        if (success && consentResponse.uspString) {
          uspResponse.usPrivacy = consentResponse.uspString;
        }
        afterEach();
      },
    };
  }

  let callbackHandler = handleUspApiResponseCallbacks();
  let uspapiCallbacks = {};

  let { uspapiFrame, uspapiFunction } = findUsp();

  if (!uspapiFrame) {
    return onError('USP CMP not found.');
  }

  // to collect the consent information from the user, we perform a call to USPAPI
  // to collect the user's consent choices represented as a string (via getUSPData)

  // the following code also determines where the USPAPI is located and uses the proper workflow to communicate with it:
  // - use the USPAPI locator code to see if USP's located in the current window or an ancestor window.
  // - else assume prebid is in an iframe, and use the locator to see if the CMP is located in a higher parent window. This works in cross domain iframes.
  // - if USPAPI is not found, the iframe function will call the uspError exit callback to abort the rest of the USPAPI workflow

  if (isFn(uspapiFunction)) {
    logInfo('Detected USP CMP is directly accessible, calling it now...');
    uspapiFunction(
      'getUSPData',
      USPAPI_VERSION,
      callbackHandler.consentDataCallback
    );
  } else {
    logInfo(
      'Detected USP CMP is outside the current iframe where Prebid.js is located, calling it now...'
    );
    callUspApiWhileInIframe(
      'getUSPData',
      uspapiFrame,
      callbackHandler.consentDataCallback
    );
  }

  function callUspApiWhileInIframe(commandName, uspapiFrame, moduleCallback) {
    /* Setup up a __uspapi function to do the postMessage and stash the callback.
      This function behaves, from the caller's perspective, identicially to the in-frame __uspapi call (although it is not synchronous) */
    window.__uspapi = function (cmd, ver, callback) {
      let callId = Math.random() + '';
      let msg = {
        __uspapiCall: {
          command: cmd,
          version: ver,
          callId: callId,
        },
      };

      uspapiCallbacks[callId] = callback;
      uspapiFrame.postMessage(msg, '*');
    };

    /** when we get the return message, call the stashed callback */
    window.addEventListener('message', readPostMessageResponse, false);

    // call uspapi
    window.__uspapi(commandName, USPAPI_VERSION, moduleCallback);

    function readPostMessageResponse(event) {
      const res = event && event.data && event.data.__uspapiReturn;
      if (res && res.callId) {
        if (typeof uspapiCallbacks[res.callId] !== 'undefined') {
          uspapiCallbacks[res.callId](res.returnValue, res.success);
          delete uspapiCallbacks[res.callId];
        }
      }
    }
  }
}

/**
 * Lookup consent data and store it in the `consentData` global as well as `adapterManager.js`' uspDataHanlder.
 *
 * @param cb a callback that takes an error message and extra error arguments; all args will be undefined if consent
 * data was retrieved successfully.
 */
function loadConsentData(cb) {
  let timer = null;
  let isDone = false;

  function done(consentData, errMsg, ...extraArgs) {
    if (timer != null) {
      clearTimeout(timer);
    }
    isDone = true;
    uspDataHandler.setConsentData(consentData);
    if (cb != null) {
      cb(errMsg, ...extraArgs)
    }
  }

  if (!uspCallMap[consentAPI]) {
    done(null, `USP framework (${consentAPI}) is not a supported framework. Aborting consentManagement module and resuming auction.`);
    return;
  }

  const callbacks = {
    onSuccess: done,
    onError: function (errMsg, ...extraArgs) {
      done(null, `${errMsg} Resuming auction without consent data as per consentManagement config.`, ...extraArgs);
    }
  }

  uspCallMap[consentAPI](callbacks);

  if (!isDone) {
    if (consentTimeout === 0) {
      processUspData(undefined, callbacks);
    } else {
      timer = setTimeout(callbacks.onError.bind(null, 'USPAPI workflow exceeded timeout threshold.'), consentTimeout)
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
  loadConsentData((errMsg, ...extraArgs) => {
    if (errMsg != null) {
      logWarn(errMsg, ...extraArgs);
    }
    fn.call(this, reqBidsConfigObj);
  });
}

/**
 * This function checks the consent data provided by USPAPI to ensure it's in an expected state.
 * If it's bad, we exit the module depending on config settings.
 * If it's good, then we store the value and exits the module.
 * @param {object} consentObject required; object returned by USPAPI that contains user's consent choices
 * @param {function(string)} onSuccess callback accepting the resolved consent USP consent string
 * @param {function(string, ...{}?)} onError callback accepting error message and any extra error arguments (used purely for logging)
 */
function processUspData(consentObject, {onSuccess, onError}) {
  const valid = !!(consentObject && consentObject.usPrivacy);
  if (!valid) {
    onError(`USPAPI returned unexpected value during lookup process.`, consentObject);
    return;
  }

  storeUspConsentData(consentObject);
  onSuccess(consentData);
}

/**
 * Stores USP data locally in module and then invokes uspDataHandler.setConsentData() to make information available in adaptermanger.js for later in the auction
 * @param {object} consentObject required; an object representing user's consent choices (can be undefined in certain use-cases for this function only)
 */
function storeUspConsentData(consentObject) {
  if (consentObject && consentObject.usPrivacy) {
    consentData = consentObject.usPrivacy;
  }
}

/**
 * Simply resets the module's consentData variable back to undefined, mainly for testing purposes
 */
export function resetConsentData() {
  consentData = undefined;
  consentAPI = undefined;
  consentTimeout = undefined;
  uspDataHandler.reset();
  getGlobal().requestBids.getHooks({hook: requestBidsHook}).remove();
  addedConsentHook = false;
}

/**
 * A configuration function that initializes some module variables, as well as add a hook into the requestBids function
 * @param {object} config required; consentManagementUSP module config settings; usp (string), timeout (int), allowAuctionWithoutConsent (boolean)
 */
export function setConsentConfig(config) {
  config = config && config.usp;
  if (!config || typeof config !== 'object') {
    logWarn('consentManagement.usp config not defined, using defaults');
  }
  if (config && isStr(config.cmpApi)) {
    consentAPI = config.cmpApi;
  } else {
    consentAPI = DEFAULT_CONSENT_API;
    logInfo(`consentManagement.usp config did not specify cmpApi. Using system default setting (${DEFAULT_CONSENT_API}).`);
  }

  if (config && isNumber(config.timeout)) {
    consentTimeout = config.timeout;
  } else {
    consentTimeout = DEFAULT_CONSENT_TIMEOUT;
    logInfo(`consentManagement.usp config did not specify timeout. Using system default setting (${DEFAULT_CONSENT_TIMEOUT}).`);
  }
  if (consentAPI === 'static') {
    if (isPlainObject(config.consentData) && isPlainObject(config.consentData.getUSPData)) {
      if (config.consentData.getUSPData.uspString) staticConsentData = { usPrivacy: config.consentData.getUSPData.uspString };
      consentTimeout = 0;
    } else {
      logError(`consentManagement config with cmpApi: 'static' did not specify consentData. No consents will be available to adapters.`);
    }
  }
  enableConsentManagement(true);
}

function enableConsentManagement(configFromUser = false) {
  if (!addedConsentHook) {
    logInfo(`USPAPI consentManagement module has been activated${configFromUser ? '' : ` using default values (api: '${consentAPI}', timeout: ${consentTimeout}ms)`}`);
    getGlobal().requestBids.before(requestBidsHook, 50);
  }
  addedConsentHook = true;
  uspDataHandler.enable();
  loadConsentData(); // immediately look up consent data to make it available without requiring an auction
}
config.getConfig('consentManagement', config => setConsentConfig(config.consentManagement));
setTimeout(() => !addedConsentHook && enableConsentManagement())
