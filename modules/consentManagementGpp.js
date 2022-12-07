/**
 * This module adds GPP consentManagement support to prebid.js.  It interacts with
 * supported CMPs (Consent Management Platforms) to grab the user's consent information
 * and make it available for any GPP supported adapters to read/pass this information to
 * their system and for various other features/modules in Prebid.js.
 */
import {deepSetValue, isNumber, isPlainObject, isStr, logError, logInfo, logWarn} from '../src/utils.js';
import {config} from '../src/config.js';
import {gppDataHandler} from '../src/adapterManager.js';
import {includes} from '../src/polyfill.js';
import {timedAuctionHook} from '../src/utils/perfMetrics.js';
import {registerOrtbProcessor, REQUEST} from '../src/pbjsORTB.js';

const DEFAULT_CMP = 'iab';
const DEFAULT_CONSENT_TIMEOUT = 10000;
const CMP_VERSION = 1;

export let userCMP;
export let consentTimeout;
export let staticConsentData;

let consentData;
let addedConsentHook = false;
let provisionalConsent;

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
  processCmpData(staticConsentData, {onSuccess, onError});
}

/**
 * This function handles interacting with an IAB compliant CMP to obtain the consent information of the user.
 * Given the async nature of the CMP's API, we pass in acting success/error callback functions to exit this function
 * based on the appropriate result.
 * @param {function({})} onSuccess acts as a success callback when CMP returns a value; pass along consentObjectfrom CMP
 * @param {function(string, ...{}?)} cmpError acts as an error callback while interacting with CMP; pass along an error message (string) and any extra error arguments (purely for logging)
 */
function lookupIabConsent({onSuccess, onError}) {
  const cmpApiName = '__gpp';
  let registeredPostMessageResponseListener = false;

  function findCMP() {
    let f = window;
    let cmpFrame;
    let cmpDirectAccess = false;
    while (true) {
      try {
        if (typeof f[cmpApiName] === 'function') {
          cmpFrame = f;
          cmpDirectAccess = true;
          break;
        }
      } catch (e) {}

      // need separate try/catch blocks due to the exception errors thrown when trying to check for a frame that doesn't exist in 3rd party env
      try {
        if (f.frames['__gppLocator']) {
          cmpFrame = f;
          break;
        }
      } catch (e) {}

      if (f === window.top) break;
      f = f.parent;
    }

    return {
      cmpFrame,
      cmpDirectAccess
    };
  }

  // remove me later when revised v1 is fully adapted by all GPP CMPs
  function checkApplicableSectionIsReady(gppData) {
    return gppData && Array.isArray(gppData.applicableSection) && gppData.applicableSection.length > 0 && gppData.applicableSection[0] !== 0;
  }

  function checkApplicableSectionsIsReady(gppData) {
    return gppData && Array.isArray(gppData.applicableSections) && gppData.applicableSections.length > 0 && gppData.applicableSections[0] !== 0;
  }

  const cmpCallbacks = {};

  const {cmpFrame, cmpDirectAccess} = findCMP();

  if (!cmpFrame) {
    return onError('GPP CMP not found.');
  }

  // use cmpDirectAccess to avoid an error checking on a cross-frame window to see if CMP function exists
  if (cmpDirectAccess && typeof cmpFrame[cmpApiName] === 'function') {
    logInfo('Detected GPP CMP API is directly accessible, calling it now...');
    cmpFrame[cmpApiName]('addEventListener', cmpDirectResponseCallback);
  } else {
    logInfo('Detected GPP CMP is outside the current iframe where Prebid.js is located, calling it now...');
    callCmpWhileInIframe('addEventListener', cmpFrame, cmpPostResponseEventCallback);
  }

  function cmpDirectResponseCallback(evt) {
    if (evt) {
      logInfo('Received a response from GPP CMP for event', evt);
      if (
        evt.eventName === 'sectionChange' || // should be new consent data
        (
          // cmp is loaded and not/no longer visible, a gpp string should be available
          evt.pingData.cmpStatus === 'loaded' &&
          evt.pingData.cmpDisplayStatus !== 'visible'
        )
      ) {
        let gppData = cmpFrame[cmpApiName]('getGPPData');

        logInfo('Received a response from GPP CMP for getGPPData', gppData);
        processCmpData(gppData, {onSuccess, onError});
      } else if (evt.pingData.cmpStatus === 'error') {
        onError('CMP returned with a cmpStatus:error response.  Please check CMP setup.');
      } else if (!provisionalConsent) {
        const provGppData = cmpFrame[cmpApiName]('getGPPData');
        logInfo('Called GPP CMP early to determine the value of applicableSections; value returned from CMP: ', provGppData);
        if (checkApplicableSectionsIsReady(provGppData)) {
          provisionalConsent = provGppData;
        } else if (checkApplicableSectionIsReady(provGppData)) {
          provisionalConsent = provGppData;
          // conform naming convention from old version of the spec to new version
          provisionalConsent.applicableSections = provGppData.applicableSection;
          delete provisionalConsent.applicableSection;
        }
      }
    }
  }

  function callCmpWhileInIframe(commandName, cmpFrame, moduleCallback, cmpCallParam) {
    // changing the name away from the standard, to properly handle multiple calls to CMP,
    // otherwise follow-up calls made to fetch getGPPData routed here will complain later that there's no callback
    const cmpApiPMName = '__gpp-pm';
    const callName = `${cmpApiName}Call`;

    /* Setup up a __cmp function to do the postMessage and stash the callback.
    This function behaves (from the caller's perspective identically to the in-frame __gpp call */
    window[cmpApiPMName] = function (cmd, callback, param) {
      const callId = Math.random().toString();
      const msg = {
        [callName]: {
          command: cmd,
          parameter: param,
          version: 1,
          callId: callId
        }
      };

      // TODO? - add logic to check if random was already used in the same session, and roll another if so?
      cmpCallbacks[callId] = callback;
      cmpFrame.postMessage(msg, '*');
    }

    // when we get the return message, call the stashed callback;
    // register the listener only once per session
    if (!registeredPostMessageResponseListener) {
      window.addEventListener('message', readPostMessageResponse, false);
      registeredPostMessageResponseListener = true;
    }

    // call CMP
    window[cmpApiPMName](commandName, moduleCallback, cmpCallParam);

    function readPostMessageResponse(event) {
      const cmpDataPkgName = `${cmpApiName}Return`;
      const json = (typeof event.data === 'string' && event.data.includes(cmpDataPkgName)) ? JSON.parse(event.data) : event.data;
      if (json[cmpDataPkgName] && json[cmpDataPkgName].callId) {
        const payload = json[cmpDataPkgName];

        if (cmpCallbacks.hasOwnProperty(payload.callId)) {
          cmpCallbacks[payload.callId](payload.returnValue);
        }
      }
    }
  }

  function cmpPostResponseEventCallback(evt) {
    if (evt) {
      logInfo('Received a postmsg response from GPP CMP for event', evt);
      if (
        evt.eventName === 'sectionChange' || // should be new consent data
        (
          // cmp is loaded and not/no longer visible, a gpp string should be available
          evt.pingData.cmpStatus === 'loaded' &&
          evt.pingData.cmpDisplayStatus !== 'visible'
        )
      ) {
        callCmpWhileInIframe('getGPPData', cmpFrame, cmpPostResponseGetGPPCallback);
      } else if (evt.pingData.cmpStatus === 'error') {
        onError('CMP returned with a cmpStatus:error response.  Please check CMP setup.');
      } else if (!provisionalConsent) {
        callCmpWhileInIframe('getGPPData', cmpFrame, cmpPostResponseProvGetGPPCallback);
      }
    }
  }

  function cmpPostResponseGetGPPCallback(gppData) {
    logInfo('Received a postmsg response from GPP CMP for getGPPData', gppData);
    processCmpData(gppData, {onSuccess, onError});
  }

  function cmpPostResponseProvGetGPPCallback(provGppData) {
    logInfo('Called GPP CMP early to determine the value of applicableSections; postmsg response returned from CMP: ', provGppData);
    if (checkApplicableSectionsIsReady(provGppData)) {
      provisionalConsent = provGppData;
    } else if (checkApplicableSectionIsReady(provGppData)) {
      provisionalConsent = provGppData;
      // conform naming convention from old version of the spec to new version
      provisionalConsent.applicableSections = provGppData.applicableSection;
      delete provisionalConsent.applicableSection;
    }
  }
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

  function done(consentData, shouldCancelAuction, errMsg, ...extraArgs) {
    if (timer != null) {
      clearTimeout(timer);
    }
    isDone = true;
    gppDataHandler.setConsentData(consentData);
    if (typeof cb === 'function') {
      cb(shouldCancelAuction, errMsg, ...extraArgs);
    }
  }

  if (!includes(Object.keys(cmpCallMap), userCMP)) {
    done(null, false, `GPP CMP framework (${userCMP}) is not a supported framework.  Aborting consentManagement module and resuming auction.`);
    return;
  }

  const callbacks = {
    onSuccess: (data) => done(data, false),
    onError: function (msg, ...extraArgs) {
      done(null, true, msg, ...extraArgs);
    }
  }
  cmpCallMap[userCMP](callbacks);

  if (!isDone) {
    const onTimeout = () => {
      const continueToAuction = (data) => {
        done(data, false, 'GPP CMP did not load, continuing auction...');
      }
      processCmpData(provisionalConsent, {
        onSuccess: continueToAuction,
        onError: () => continueToAuction(storeConsentData(undefined))
      })
    }
    if (consentTimeout === 0) {
      onTimeout();
    } else {
      timer = setTimeout(onTimeout, consentTimeout);
    }
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
 * data as part of a gppConsent object which gets transferred to adapterManager's gppDataHandler object.
 * This information is later added into the bidRequest object for any supported adapters to read/pass along to their system.
 * @param {object} reqBidsConfigObj required; This is the same param that's used in pbjs.requestBids.
 * @param {function} fn required; The next function in the chain, used by hook.js
 */
export const requestBidsHook = timedAuctionHook('gpp', function requestBidsHook(fn, reqBidsConfigObj) {
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
    const gppString = consentObject && consentObject.gppString;
    const gppSection = (consentObject && consentObject.applicableSections) ? consentObject.applicableSections
      : (consentObject && consentObject.applicableSection) ? consentObject.applicableSection
        : (provisionalConsent && provisionalConsent.applicableSections) ? provisionalConsent.applicableSections : [];

    return !!(
      (!Array.isArray(gppSection)) ||
      (Array.isArray(gppSection) && (!gppString || !isStr(gppString)))
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
    gppString: (cmpConsentObject) ? cmpConsentObject.gppString : undefined,
    fullGppData: (cmpConsentObject) || undefined,
  };
  consentData.applicableSections = (cmpConsentObject && cmpConsentObject.applicableSections) ? cmpConsentObject.applicableSections
    : (cmpConsentObject && cmpConsentObject.applicableSection) ? cmpConsentObject.applicableSection
      : (provisionalConsent && provisionalConsent.applicableSections) ? provisionalConsent.applicableSections : [];
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
  gppDataHandler.reset();
}

/**
 * A configuration function that initializes some module variables, as well as add a hook into the requestBids function
 * @param {{cmp:string, timeout:number, allowAuctionWithoutConsent:boolean, defaultGdprScope:boolean}} config required; consentManagement module config settings; cmp (string), timeout (int), allowAuctionWithoutConsent (boolean)
 */
export function setConsentConfig(config) {
  config = config && config.gpp;
  if (!config || typeof config !== 'object') {
    logWarn('consentManagement.gpp config not defined, exiting consent manager module');
    return;
  }

  if (isStr(config.cmpApi)) {
    userCMP = config.cmpApi;
  } else {
    userCMP = DEFAULT_CMP;
    logInfo(`consentManagement.gpp config did not specify cmp.  Using system default setting (${DEFAULT_CMP}).`);
  }

  if (isNumber(config.timeout)) {
    consentTimeout = config.timeout;
  } else {
    consentTimeout = DEFAULT_CONSENT_TIMEOUT;
    logInfo(`consentManagement.gpp config did not specify timeout.  Using system default setting (${DEFAULT_CONSENT_TIMEOUT}).`);
  }

  if (userCMP === 'static') {
    if (isPlainObject(config.consentData)) {
      staticConsentData = config.consentData;
      consentTimeout = 0;
    } else {
      logError(`consentManagement.gpp config with cmpApi: 'static' did not specify consentData. No consents will be available to adapters.`);
    }
  }

  logInfo('consentManagement.gpp module has been activated...');

  if (!addedConsentHook) {
    $$PREBID_GLOBAL$$.requestBids.before(requestBidsHook, 50);
  }
  addedConsentHook = true;
  gppDataHandler.enable();
  loadConsentData(); // immediately look up consent data to make it available without requiring an auction
}
config.getConfig('consentManagement', config => setConsentConfig(config.consentManagement));

// TODO this function will likely change a bit once PR #9205 is merged to master
export function setOrtbGpp(ortbRequest, bidderRequest) {
  const consent = bidderRequest.gppConsent;
  if (consent) {
    if (Array.isArray(consent.applicableSections)) {
      deepSetValue(ortbRequest, 'regs.gpp_sid', consent.applicableSections);
    }
    deepSetValue(ortbRequest, 'regs.gpp', consent.gppString);
  }
}

registerOrtbProcessor({type: REQUEST, name: 'gpp', fn: setOrtbGpp});
