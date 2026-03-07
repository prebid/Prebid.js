import {gdprDataHandler, gppDataHandler} from '../../src/consentHandler.js';

/** Safe defaults which work on pretty much all video calls. */
export const DEFAULT_DFP_PARAMS = {
  env: 'vp',
  gdfp_req: 1,
  output: 'vast',
  unviewed_position_start: 1,
}

export const DFP_ENDPOINT = {
  protocol: 'https',
  host: 'securepubads.g.doubleclick.net',
  pathname: '/gampad/ads'
}

export function gdprParams() {
  const gdprConsent = gdprDataHandler.getConsentData();
  const params = {};
  if (gdprConsent) {
    if (typeof gdprConsent.gdprApplies === 'boolean') { params.gdpr = Number(gdprConsent.gdprApplies); }
    if (gdprConsent.consentString) { params.gdpr_consent = gdprConsent.consentString; }
    if (gdprConsent.addtlConsent) { params.addtl_consent = gdprConsent.addtlConsent; }
  }
  return params;
}

export function gppParams() {
  const gppConsent = gppDataHandler.getConsentData();
  const params = {};
  if (gppConsent) {
    if (gppConsent.gppString) { params.gpp_string = gppConsent.gppString; }
    if (gppConsent.applicableSections) { params.gpp_sid = gppConsent.applicableSections.join(','); }
  }
  return params;
}
