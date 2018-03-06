import * as utils from 'src/utils';
import { config } from 'src/config';
import { setTimeout } from 'core-js/library/web/timers';

// add new CMPs here
const availCMPs = ['iab'];

export let userCMP;
export let consentId = '';
export let consentTimeout;
export let lookUpFailureChoice;

export function requestBidsHook(config, fn) {
  let adUnits = config.adUnits || $$PREBID_GLOBAL$$.adUnits;
  let context = this;
  let args = arguments;
  let nextFn = fn;
  let cmpActive = true;
  let _timer;

  // in case we already have consent (eg during bid refresh)
  if (consentId) {
    adUnits = applyConsent(consentId);
    return fn.apply(context, args);
  }

  // ensure user requested supported cmp, otherwise abort and return to hooked function
  if (!availCMPs.includes(userCMP)) {
    utils.logWarn(`CMP framework ${userCMP} is not a supported framework.  Aborting consentManagement module and resuming auction.`);
    return fn.apply(context, args);
  }

  // start of CMP specific logic
  if (userCMP === 'iab') {
    if (!window.__cmp) {
      utils.logWarn('IAB CMP framework is not detected.  Aborting consentManagement module and resuming auction.');
      return fn.apply(context, args);
    }

    lookupIabId();
  }

  function lookupIabId () {
    // lookup times and user interaction with CMP prompts can greatly vary, so enforcing a timeout on the CMP process
    _timer = setTimeout(cmpTimedOut, consentTimeout);

    // first lookup - to determine if new or existing user
    // if new user, then wait for user to make a choice and then run postLookup method
    // if existing user, then skip to postLookup method
    window.__cmp('getConsentData', 'vendorConsents', function(consentString) {
      if (cmpActive) {
        if (consentString === null || !consentString) {
          window.__cmp('addEventListener', 'onSubmit', function() {
            if (cmpActive) {
              // redo lookup to find new string based on user's choices
              window.__cmp('getConsentData', 'vendorConsents', postLookup);
            }
          });
        } else {
          postLookup(consentString);
        }
      }
    });
  }

  // after we have grabbed ideal ID from CMP, apply the data to adUnits object and finish up the module
  function postLookup(consentString) {
    if (cmpActive) {
      if (typeof consentString != 'string' || consentString === '') {
        exitFailedCMP(`CMP returned unexpected value during lookup process; returned value was (${consentString}).`);
      } else {
        clearTimeout(_timer);
        consentId = consentString;
        adUnits = applyConsent(consentString);
        fn.apply(context, args);
      }
    }
  }

  // assuming we have valid consent ID, apply to adUnits object
  function applyConsent(consentString) {
    adUnits.forEach(adUnit => {
      adUnit['gdprConsent'] = {
        consentString: consentString,
        consentRequired: true
      };
    });
    return adUnits;
  }

  function cmpTimedOut () {
    if (cmpActive) {
      exitFailedCMP('CMP workflow exceeded timeout threshold.');
    }
  }

  function exitFailedCMP(message) {
    cmpActive = false;
    if (lookUpFailureChoice === 'proceed') {
      utils.logWarn(message + ' Resuming auction without consent data as per consentManagement config.');
      adUnits = applyConsent(undefined);
      nextFn.apply(context, args);
    } else {
      utils.logError(message + ' Canceling auction as per consentManagement config.');
    }
  }
}

export function resetConsentId() {
  consentId = '';
}

export function setConfig(config) {
  if (typeof config.cmp === 'string') {
    userCMP = config.cmp;
  } else {
    userCMP = 'iab';
    utils.logInfo(`consentManagement config did not specify cmp.  Using system default setting (${userCMP}).`);
  }

  if (typeof config.waitForConsentTimeout === 'number') {
    consentTimeout = config.waitForConsentTimeout;
  } else {
    consentTimeout = 5000;
    utils.logInfo(`consentManagement config did not specify waitForConsentTimeout.  Using system default setting (${consentTimeout}).`);
  }

  if (typeof config.lookUpFailureResolution === 'string') {
    if (config.lookUpFailureResolution === 'proceed' || config.lookUpFailureResolution === 'cancel') {
      lookUpFailureChoice = config.lookUpFailureResolution;
    } else {
      lookUpFailureChoice = 'proceed';
      utils.logWarn(`Invalid choice was set for consentManagement lookUpFailureResolution property. Using system default (${lookUpFailureChoice}).`);
    }
  } else {
    lookUpFailureChoice = 'proceed';
    utils.logInfo(`consentManagement config did not specify lookUpFailureResolution.  Using system default setting (${lookUpFailureChoice}).`);
  }

  $$PREBID_GLOBAL$$.requestBids.addHook(requestBidsHook, 50);
}
config.getConfig('consentManagement', config => setConfig(config.consentManagement));
