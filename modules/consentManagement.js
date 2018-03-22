/**
 * This module adds GDPR consentManagement support to prebid.js.  It interacts with
 * supported CMPs (Consent Management Platforms) to grab the user's consent information
 * and make it available for any GDPR supported adapters to read/pass this information to
 * their system.
 */
import * as utils from 'src/utils';
import { config } from 'src/config';
import { gdprDataHandler } from 'src/adaptermanager';

const DEFAULT_CMP = 'appnexus';
const DEFAULT_CONSENT_TIMEOUT = 10000;
const DEFAULT_ALLOW_AUCTION_WO_CONSENT = true;

export let userCMP;
export let consentTimeout;
export let allowAuction;

let consentData;

let context;
let args;
let nextFn;

let timer;
let haveExited;

// add new CMPs here, with their dedicated lookup function that passes the consentString to postLookup()
const cmpCallMap = {
  'appnexus': lookupAppNexusConsent
};

/**
 * This function handles interacting with the AppNexus CMP to obtain the consentString value of the user.
 * Given the asynch nature of the CMP's API, we pass in acting success/error callback functions to exit this function
 * based on the appropriate result.
 * @param {function(string)} cmpSuccess acts as a success callback when CMP returns a value; pass along consentString (string) from CMP
 * @param {function(string)} cmpError acts as an error callback while interacting with CMP; pass along an error message (string)
 */
function lookupAppNexusConsent(cmpSuccess, cmpError) {
  if (!window.__cmp) {
    return cmpError('AppNexus CMP not detected.');
  }

  // first lookup - to determine if new or existing user
  // if new user, then wait for user to make a choice and then run postLookup method
  // if existing user, then skip to postLookup method
  window.__cmp('getConsentData', 'vendorConsents', function(consentString) {
    if (consentString == null) {
      window.__cmp('addEventListener', 'onSubmit', function() {
        // redo lookup to find new string based on user's choices
        window.__cmp('getConsentData', 'vendorConsents', cmpSuccess);
      });
    } else {
      cmpSuccess(consentString);
    }
  });
}

/**
 * If consentManagement module is enabled (ie included in setConfig), this hook function will attempt to fetch the
 * user's encoded consent string from the supported CMP.  Once obtained, the module will store this
 * data as part of a gdprConsent object and transferred to adaptermanager's gdprDataHandler object.
 * This information is later added into the bidRequest object for any supported adapters to read/pass along to their system.
 * @param {object} config This is the same param that's used in pbjs.requestBids.  The config.adunits will be updated.
 * @param {function} fn The next function in the chain, used by hook.js
 */
export function requestBidsHook(config, fn) {
  context = this;
  args = arguments;
  nextFn = fn;
  haveExited = false;

  // in case we already have consent (eg during bid refresh)
  if (consentData) {
    return nextFn.apply(context, args);
  }

  if (!Object.keys(cmpCallMap).includes(userCMP)) {
    utils.logWarn(`CMP framework (${userCMP}) is not a supported framework.  Aborting consentManagement module and resuming auction.`);
    return nextFn.apply(context, args);
  }

  cmpCallMap[userCMP].call(this, processCmpData, exitFailedCmp);

  if (!haveExited) {
    if (consentTimeout === 0) {
      processCmpData(undefined);
    } else {
      timer = setTimeout(cmpTimedOut, consentTimeout);
    }
  }
}

// after we have grabbed ideal ID from CMP, apply the data to adUnits object and finish up the module
function processCmpData(consentString) {
  if (typeof consentString !== 'string' || consentString === '') {
    exitFailedCmp(`CMP returned unexpected value during lookup process; returned value was (${consentString}).`);
  } else {
    clearTimeout(timer);
    storeConsentData(consentString);

    // to stop the auction from running if we chose to cancel and timeout was reached
    if (haveExited === false) {
      haveExited = true;
      nextFn.apply(context, args);
    }
  }
}

// store CMP string in module and invoke gdprDataHandler.setConsentData() to make information available in adaptermanger.js
function storeConsentData(cmpConsentString) {
  consentData = {
    consentString: cmpConsentString,
    consentRequired: true
  };
  gdprDataHandler.setConsentData(consentData);
}

function cmpTimedOut() {
  exitFailedCmp('CMP workflow exceeded timeout threshold.');
}

// controls the exit of the module based on consentManagement config; either we'll resume the auction or cancel the auction
function exitFailedCmp(errorMsg) {
  clearTimeout(timer);
  haveExited = true;
  if (allowAuction) {
    utils.logWarn(errorMsg + ' Resuming auction without consent data as per consentManagement config.');
    storeConsentData(undefined);

    nextFn.apply(context, args);
  } else {
    utils.logError(errorMsg + ' Canceling auction as per consentManagement config.');
  }
}

/** Simply resets the module's consentData variable back to undefined */
export function resetConsentData() {
  consentData = undefined;
}

/**
 * A configuration function that initializes some module variables, as well as add a hook into the requestBids function
 * @param {object} config consentManagement module config settings; cmp (string), timeout (int), allowAuctionWithoutConsent (boolean)
 */
export function setConfig(config) {
  if (typeof config.cmp === 'string') {
    userCMP = config.cmp;
  } else {
    userCMP = DEFAULT_CMP;
    utils.logInfo(`consentManagement config did not specify cmp.  Using system default setting (${userCMP}).`);
  }

  if (typeof config.timeout === 'number') {
    consentTimeout = config.timeout;
  } else {
    consentTimeout = DEFAULT_CONSENT_TIMEOUT;
    utils.logInfo(`consentManagement config did not specify timeout.  Using system default setting (${consentTimeout}).`);
  }

  if (typeof config.allowAuctionWithoutConsent !== 'undefined') {
    allowAuction = config.allowAuctionWithoutConsent;
  } else {
    allowAuction = DEFAULT_ALLOW_AUCTION_WO_CONSENT;
    utils.logInfo(`consentManagement config did not specify allowAuctionWithoutConsent.  Using system default setting (${allowAuction}).`);
  }

  $$PREBID_GLOBAL$$.requestBids.addHook(requestBidsHook, 50);
}
config.getConfig('consentManagement', config => setConfig(config.consentManagement));
