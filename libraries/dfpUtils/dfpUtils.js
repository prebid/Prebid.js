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

export const setGdprConsent = (gdprConsent, queryParams) => {
  if (!gdprConsent) { return; }
  if (typeof gdprConsent.gdprApplies === 'boolean') { queryParams.gdpr = Number(gdprConsent.gdprApplies); }
  if (gdprConsent.consentString) { queryParams.gdpr_consent = gdprConsent.consentString; }
  if (gdprConsent.addtlConsent) { queryParams.addtl_consent = gdprConsent.addtlConsent; }
}
