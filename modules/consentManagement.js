/**
 * This module adds GDPR consentManagement support to prebid.js.  It interacts with
 * supported CMPs (Consent Management Platforms) to grab the user's consent information
 * and make it available for any GDPR supported adapters to read/pass this information to
 * their system.
 */
import * as utils from 'src/utils';
import { config } from 'src/config';
import { setTimeout } from 'core-js/library/web/timers';

const DEFAULT_CMP = 'appnexus';
const DEFAULT_CONSENT_TIMEOUT = 5000;
const DEFAULT_FAILURE_CHOICE = 'proceed';

export let userCMP;
export let consentTimeout;
export let lookupFailureChoice;

let consentId = '';
let adUnits;
let context;
let args;
let nextFn;

let cmpActive;
let timer;

// add new CMPs here, with their dedicated lookup function that passes the consentString to postLookup()
const cmpCallMap = {
  'appnexus': lookupAppNexusConsent
};

// AppNexus CMP lookup process
function lookupAppNexusConsent() {
  if (!window.__cmp) {
    utils.logWarn('AppNexus CMP framework is not detected on page.  Aborting consentManagement module and resuming auction.');
    return nextFn.apply(context, args);
  }

  // lookup times and user interaction with CMP prompts can greatly vary, so enforcing a timeout on the CMP process
  timer = setTimeout(cmpTimedOut, consentTimeout);

  // first lookup - to determine if new or existing user
  // if new user, then wait for user to make a choice and then run postLookup method
  // if existing user, then skip to postLookup method
  window.__cmp('getConsentData', 'vendorConsents', function(consentString) {
    if (cmpActive) {
      if (consentString == null) {
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

/**
 * If consentManagement module is enabled (ie included in setConfig), this hook function will attempt to fetch the
 * user's encoded consent string from the supported CMP.  Once obtained, the module will store this
 * data as part of a gdprConsent object in the adUnits var.  This information is later stored in the
 * bidRequest object for any supported adapters to read/pass along to their system.
 * @param {object} config This is the same param that's used in pbjs.requestBids.  The config.adunits will be updated.
 * @param {function} fn The next function in the chain, used by hook.js
 */
export function requestBidsHook(config, fn) {
  adUnits = config.adUnits || $$PREBID_GLOBAL$$.adUnits;
  context = this;
  args = arguments;
  nextFn = fn;
  cmpActive = true;

  // in case we already have consent (eg during bid refresh)
  if (consentId) {
    applyConsent(adUnits, consentId);
    return nextFn.apply(context, args);
  }

  if (!Object.keys(cmpCallMap).includes(userCMP)) {
    utils.logWarn(`CMP framework (${userCMP}) is not a supported framework.  Aborting consentManagement module and resuming auction.`);
    return nextFn.apply(context, args);
  }
  cmpCallMap[userCMP].call();
}

// after we have grabbed ideal ID from CMP, apply the data to adUnits object and finish up the module
function postLookup(consentString) {
  if (cmpActive) {
    if (typeof consentString !== 'string' || consentString === '') {
      exitFailedCMP(`CMP returned unexpected value during lookup process; returned value was (${consentString}).`);
    } else {
      clearTimeout(timer);
      consentId = consentString;
      applyConsent(adUnits, consentString);
      nextFn.apply(context, args);
    }
  }
}

function cmpTimedOut() {
  if (cmpActive) {
    exitFailedCMP('CMP workflow exceeded timeout threshold.');
  }
}

function exitFailedCMP(message) {
  cmpActive = false;
  if (lookupFailureChoice === 'proceed') {
    utils.logWarn(message + ' Resuming auction without consent data as per consentManagement config.');
    applyConsent(adUnits, undefined);
    nextFn.apply(context, args);
  } else {
    utils.logError(message + ' Canceling auction as per consentManagement config.');
  }
}

// assuming we have valid consent ID, apply to adUnits object
function applyConsent(adUnits, consentString) {
  adUnits.forEach(adUnit => {
    adUnit['gdprConsent'] = {
      consentString: consentString,
      consentRequired: true
    };
  });
}

/**
 * Simply resets the module's consentId variable back to its default value.
*/
export function resetConsentId() {
  consentId = '';
}

/**
 * A configuration function that initializes some module variables, as well as add a hook into the requestBids function
 * @param {object} config consentManagement module config settings; cmp (string), waitForConsentTimeout (int), lookUpFailureResolution (string)
 */
export function setConfig(config) {
  if (typeof config.cmp === 'string') {
    userCMP = config.cmp;
  } else {
    userCMP = DEFAULT_CMP;
    utils.logInfo(`consentManagement config did not specify cmp.  Using system default setting (${userCMP}).`);
  }

  if (typeof config.waitForConsentTimeout === 'number') {
    consentTimeout = config.waitForConsentTimeout;
  } else {
    consentTimeout = DEFAULT_CONSENT_TIMEOUT;
    utils.logInfo(`consentManagement config did not specify waitForConsentTimeout.  Using system default setting (${consentTimeout}).`);
  }

  if (typeof config.lookUpFailureResolution === 'string') {
    if (config.lookUpFailureResolution === 'proceed' || config.lookUpFailureResolution === 'cancel') {
      lookupFailureChoice = config.lookUpFailureResolution;
    } else {
      lookupFailureChoice = DEFAULT_FAILURE_CHOICE;
      utils.logWarn(`Invalid choice was set for consentManagement lookUpFailureResolution property. Using system default (${lookupFailureChoice}).`);
    }
  } else {
    lookupFailureChoice = DEFAULT_FAILURE_CHOICE;
    utils.logInfo(`consentManagement config did not specify lookUpFailureResolution.  Using system default setting (${lookupFailureChoice}).`);
  }

  $$PREBID_GLOBAL$$.requestBids.addHook(requestBidsHook, 50);
}
config.getConfig('consentManagement', config => setConfig(config.consentManagement));
