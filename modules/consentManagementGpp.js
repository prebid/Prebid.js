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
import { enrichFPD } from '../src/fpd/enrichment.js';
import {getGlobal} from '../src/prebidGlobal.js';

const DEFAULT_CMP = 'iab';
const DEFAULT_CONSENT_TIMEOUT = 10000;
const CMP_VERSION = 1;

export let userCMP;
export let consentTimeout;
export let staticConsentData;

let consentData;
let addedConsentHook = false;

// add new CMPs here, with their dedicated lookup function
const cmpCallMap = {
  'iab': lookupIabConsent,
  'static': lookupStaticConsentData
};

/**
 * This function checks the state of the IAB gppData's applicableSection field (to ensure it's populated and has a valid value).
 * section === 0 represents a CMP's default value when CMP is loading, it shoud not be used a real user's section.
 *
 * TODO --- The initial version of the GPP CMP API spec used this naming convention, but it was later changed as an update to the spec.
 * CMPs should adjust their logic to use the new format (applicableSecctions), but that may not be the case with the initial release.
 * Added support just in case for this transition period, can likely be removed at a later date...
 * @param gppData represents the IAB gppData object
 * @returns true|false
 */
function checkApplicableSectionIsReady(gppData) {
  return gppData && Array.isArray(gppData.applicableSection) && gppData.applicableSection.length > 0 && gppData.applicableSection[0] !== 0;
}

/**
 * This function checks the state of the IAB gppData's applicableSections field (to ensure it's populated and has a valid value).
 * section === 0 represents a CMP's default value when CMP is loading, it shoud not be used a real user's section.
 * @param gppData represents the IAB gppData object
 * @returns true|false
 */
function checkApplicableSectionsIsReady(gppData) {
  return gppData && Array.isArray(gppData.applicableSections) && gppData.applicableSections.length > 0 && gppData.applicableSections[0] !== 0;
}

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
  const cmpCallbacks = {};
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

  const {cmpFrame, cmpDirectAccess} = findCMP();

  if (!cmpFrame) {
    return onError('GPP CMP not found.');
  }

  const invokeCMP = (cmpDirectAccess) ? invokeCMPDirect : invokeCMPFrame;

  function invokeCMPDirect({command, callback, parameter, version = CMP_VERSION}, resultCb) {
    if (typeof resultCb === 'function') {
      resultCb(cmpFrame[cmpApiName](command, callback, parameter, version));
    } else {
      cmpFrame[cmpApiName](command, callback, parameter, version);
    }
  }

  function invokeCMPFrame({command, callback, parameter, version = CMP_VERSION}, resultCb) {
    const callName = `${cmpApiName}Call`;
    if (!registeredPostMessageResponseListener) {
      // when we get the return message, call the stashed callback;
      window.addEventListener('message', readPostMessageResponse, false);
      registeredPostMessageResponseListener = true;
    }

    // call CMP via postMessage
    const callId = Math.random().toString();
    const msg = {
      [callName]: {
        command: command,
        parameter,
        version,
        callId: callId
      }
    };

    // TODO? - add logic to check if random was already used in the same session, and roll another if so?
    cmpCallbacks[callId] = (typeof callback === 'function') ? callback : resultCb;
    cmpFrame.postMessage(msg, '*');

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

  const startupMsg = (cmpDirectAccess) ? 'Detected GPP CMP API is directly accessible, calling it now...'
    : 'Detected GPP CMP is outside the current iframe where Prebid.js is located, calling it now...';
  logInfo(startupMsg);

  invokeCMP({
    command: 'addEventListener',
    callback: function (evt) {
      if (evt) {
        logInfo(`Received a ${(cmpDirectAccess ? 'direct' : 'postmsg')} response from GPP CMP for event`, evt);
        if (evt.eventName === 'sectionChange' || evt.pingData.cmpStatus === 'loaded') {
          invokeCMP({command: 'getGPPData'}, function (gppData) {
            logInfo(`Received a ${cmpDirectAccess ? 'direct' : 'postmsg'} response from GPP CMP for getGPPData`, gppData);
            processCmpData(gppData, {onSuccess, onError});
          });
        } else if (evt.pingData.cmpStatus === 'error') {
          onError('CMP returned with a cmpStatus:error response.  Please check CMP setup.');
        }
      }
    }
  });
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
      processCmpData(consentData, {
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
    const gppSection = (checkApplicableSectionsIsReady(consentObject)) ? consentObject.applicableSections
      : (checkApplicableSectionIsReady(consentObject)) ? consentObject.applicableSection : [];

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
  consentData.applicableSections = (checkApplicableSectionsIsReady(cmpConsentObject)) ? cmpConsentObject.applicableSections
    : (checkApplicableSectionIsReady(cmpConsentObject)) ? cmpConsentObject.applicableSection : [];
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
    getGlobal().requestBids.before(requestBidsHook, 50);
  }
  addedConsentHook = true;
  gppDataHandler.enable();
  loadConsentData(); // immediately look up consent data to make it available without requiring an auction
}
config.getConfig('consentManagement', config => setConsentConfig(config.consentManagement));

export function enrichFPDHook(next, fpd) {
  return next(fpd.then(ortb2 => {
    const consent = gppDataHandler.getConsentData();
    if (consent) {
      if (Array.isArray(consent.applicableSections)) {
        deepSetValue(ortb2, 'regs.gpp_sid', consent.applicableSections);
      }
      deepSetValue(ortb2, 'regs.gpp', consent.gppString);
    }
    return ortb2;
  }));
}

enrichFPD.before(enrichFPDHook);
