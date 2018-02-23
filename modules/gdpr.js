import * as utils from 'src/utils';
import { config } from 'src/config';
import { setTimeout } from 'core-js/library/web/timers';

const availCMPs = ['iab'];
let userCMP = 'iab';
let gdprId = '';
let lookUpTimeout = 600;

export function requestBidsHook(config, fn) {
  let adUnits = config.adUnits || $$PREBID_GLOBAL$$.adUnits;
  let context = this;
  let args = arguments;
  let _timer;

  // in case we already have consent (eg during bid refresh)
  if (gdprId) {
    applyConsent(gdprId);
    return fn.apply(context, args);
  }

  if (!availCMPs.includes(userCMP)) {
    utils.logWarn(`CMP framework ${userCMP} is not a supported framework.  Aborting GDPR module and resuming auction.`);
    return fn.apply(context, args);
  }

  if (userCMP === 'iab') {
    if (!window.__cmp) {
      utils.logWarn('IAB CMP framework is not implemented.  Aborting GDPR module and resuming auction.');
      return fn.apply(context, args);
    }

    // if 'euconsent' cookie does not exist - we assume it's a first time visitor who needs to make a choice of consent and
    // we will pause the auction process until the user makes their choice
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
      let lookUpEnd = performance.now();
      myTimer('lookup process from CMP', lookUpStart, lookUpEnd);

      clearTimeout(_timer);

      // remove log statement later
      console.log('getConsentData result is ' + consentString);
      gdprId = consentString;

      applyConsent(consentString);

      fn.apply(context, args);
    });
  }

  function lookupTimedOut () {
    utils.logWarn('CMP lookup time exceeded timeout threshold.  Aborting GDPR module and resuming auction.');

    // may pass specific flag instead of normal lookup value in adUnits

    fn.apply(context, args);
  }

  // assuming we have valid consent ID, apply to adUnits object
  function applyConsent(consent) {
    adUnits.forEach(adUnit => {
      adUnit['gdprConsent'] = consent;
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
  }

  if (typeof config.lookUpConsentTimeout === 'number') {
    lookUpTimeout = config.lookUpConsentTimeout;
  }

  $$PREBID_GLOBAL$$.requestBids.addHook(requestBidsHook, 50);
}
config.getConfig('gdpr', config => setConfig(config.gdpr));
