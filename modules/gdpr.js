import * as utils from 'src/utils';
import { config } from 'src/config';
import { hooks } from 'src/hook';

let cmp = 'iab';
let gdprId = '';

export function setConfig(config) {
  if (typeof config.cmp === 'string') {
    cmp = config.cmp;
  }
  // read other values from config here

  utils.logInfo('adding makeBidRequest hook for gdpr module', arguments);
  hooks['makeBidRequests'].addHook(makeBidRequestsHook, 100);
  // hooks['callBids'].addHook(callBidsHook, 100);
}
config.getConfig('gdpr', config => setConfig(config.gdpr));

function makeBidRequestsHook(adUnits, auctionStart, auctionId, cbTimeout, labels, callback, fn) {
// function callBidsHook(adUnits, bidRequests, addBidResponse, doneCb, fn) {

  let context = this;
  let args = arguments;
  // in case we already have consent
  if (gdprId) {
    applyConsent(gdprId);
    fn.apply(context, args);
    return;
  }

  if (cmp === 'iab') {
    window.__cmp('getConsentData', 'vendorConsents', function(consentString) {
      console.log('getConsentData result is ' + consentString);
      gdprId = consentString;
      // this applys the change
      applyConsent(consentString);

      // this finishes the hook process, keep this in some form
      fn.apply(context, args);
    });
  }

  function applyConsent(consent) {
    adUnits.forEach(adUnit => {
      adUnit['gdpr'] = consent;
    });
  }
}
