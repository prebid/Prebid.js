export function getUserSyncParams(gdprConsent, uspConsent, gppConsent) {
  let params = {};

  if (gdprConsent) {
    if (typeof gdprConsent.gdprApplies === 'boolean') {
      params['gdpr'] = Number(gdprConsent.gdprApplies);
    }

    if (typeof gdprConsent.consentString === 'string') {
      params['gdpr_consent'] = gdprConsent.consentString;
    }
  }

  if (uspConsent) {
    params['us_privacy'] = encodeURIComponent(uspConsent);
  }

  if (gppConsent?.gppString) {
    params['gpp'] = gppConsent.gppString;
    params['gpp_sid'] = gppConsent.applicableSections?.toString();
  }

  return params;
}
