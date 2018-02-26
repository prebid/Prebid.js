import * as utils from 'src/utils';
import { config } from 'src/config';
import { setTimeout } from 'core-js/library/web/timers';

// add new CMPs here
const availCMPs = ['iab'];

export let userCMP = 'iab';
export let consentId = '';
export let lookUpTimeout = 600;
export let lookUpFailureChoice = 'proceed';

export function requestBidsHook(config, fn) {
  let adUnits = config.adUnits || $$PREBID_GLOBAL$$.adUnits;
  let context = this;
  let args = arguments;
  let _timer;
  let timedOut = false;

  // in case we already have consent (eg during bid refresh)
  if (consentId) {
    applyConsent(consentId);
    return fn.apply(context, args);
  }

  if (!availCMPs.includes(userCMP)) {
    utils.logWarn(`CMP framework ${userCMP} is not a supported framework.  Aborting consentManagement module and resuming auction.`);
    return fn.apply(context, args);
  }

  if (userCMP === 'iab') {
    if (!window.__cmp) {
      utils.logWarn('IAB CMP framework is not implemented.  Aborting consentManagement module and resuming auction.');
      return fn.apply(context, args);
    }

    // if 'euconsent' cookie does not exist - we assume it's a first time visitor who needs to make a choice of consent and
    // we will pause the auction process until the user makes their choice via the framework's eventlistener, then do lookup
    // otherwise we can skip right to the lookup process to find their consent ID
    if (getCookie('euconsent') === null) {
      // see if there's a way to verify the consent tool UI is actually showing before initiating the wait process
      window.__cmp('addEventListener', 'onSubmit', lookupIabId);
    } else {
      lookupIabId();
    }
  }

  function lookupIabId () {
    // lookup times can greatly vary, so enforcing a timeout on this lookup process
    _timer = setTimeout(lookupTimedOut, lookUpTimeout);

    // remove timers later
    let lookUpStart = performance.now();
    window.__cmp('getConsentData', 'vendorConsents', function(consentString) {
      if (!timedOut) {
        let lookUpEnd = performance.now();
        myTimer('lookup process from CMP', lookUpStart, lookUpEnd);

        clearTimeout(_timer);

        // remove log statement later
        console.log('getConsentData result is ' + consentString);

        if (consentString === null || consentString === '') {
          let msg = `CMP returned unexpected value during lookup process; returned value was (${consentString}).`;
          if (lookUpFailureChoice === 'proceed') {
            utils.logError(msg + ' Resuming auction without consent data as per consentManagement config.');
            fn.apply(context, args);
          } else {
            utils.logError(msg + ' Aborting auction as per consentManagement config.');
          }
        }
        consentId = consentString;

        applyConsent(consentString);

        // note this has to stay in callback to ensure the consent info is retrieved before the auction proceeds
        fn.apply(context, args);
      }
    });
  }

  function lookupTimedOut () {
    // may pass specific flag instead of normal lookup value in adUnits
    timedOut = true;
    let msg = 'CMP lookup time exceeded timeout threshold.';

    if (lookUpFailureChoice === 'proceed') {
      utils.logWarn(msg + ' Resuming auction without consent data as per consentManagement config.');

      fn.apply(context, args);
    } else {
      utils.logError(msg + ' Aborting auction as per consentManagement config.');
    }
  }

  // assuming we have valid consent ID, apply to adUnits object
  function applyConsent(consent) {
    adUnits.forEach(adUnit => {
      adUnit['consentId'] = consent;
    });
  }

  function getCookie(name) {
    let m = window.document.cookie.match('(^|;)\\s*' + name + '\\s*=\\s*([^;]*)\\s*(;|$)');
    return m ? decodeURIComponent(m[2]) : null;
  }

  // remove later
  function myTimer(eventName, start, end) {
    console.log(eventName + ' took ' + (end - start) + ' milliseconds');
  }
}

export function setConfig(config) {
  if (typeof config.cmp === 'string') {
    userCMP = config.cmp;
  } else {
    utils.logInfo(`consentManagement config did not specify cmp.  Using system default setting (${userCMP}).`);
  }

  if (typeof config.lookUpConsentTimeout === 'number') {
    lookUpTimeout = config.lookUpConsentTimeout;
  } else {
    utils.logInfo(`consentManagement config did not specify lookUpFailureResolution.  Using system default setting (${lookUpTimeout}).`);
  }

  if (typeof config.lookUpFailureResolution === 'string') {
    if (config.lookUpFailureResolution === 'proceed' || config.lookUpFailureResolution === 'cancel') {
      lookUpFailureChoice = config.lookUpFailureResolution;
    } else {
      utils.logWarn(`Invalid choice was set for consentManagement lookUpFailureResolution property. Using system default (${lookUpFailureChoice}).`);
    }
  } else {
    utils.logInfo(`consentManagement config did not specify lookUpFailureResolution.  Using system default setting (${lookUpFailureChoice}).`);
  }

  $$PREBID_GLOBAL$$.requestBids.addHook(requestBidsHook, 50);
}
config.getConfig('consentManagement', config => setConfig(config.consentManagement));
