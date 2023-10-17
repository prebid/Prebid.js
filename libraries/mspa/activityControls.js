import {registerActivityControl} from '../../src/activities/rules.js';
import {
  ACTIVITY_ENRICH_EIDS,
  ACTIVITY_ENRICH_UFPD,
  ACTIVITY_SYNC_USER,
  ACTIVITY_TRANSMIT_PRECISE_GEO
} from '../../src/activities/activities.js';
import {gppDataHandler} from '../../src/adapterManager.js';
import {logInfo} from '../../src/utils.js';

// default interpretation for MSPA consent(s):
// https://docs.prebid.org/features/mspa-usnat.html

const SENSITIVE_DATA_GEO = 7;

function isApplicable(val) {
  return val != null && val !== 0
}

export function isBasicConsentDenied(cd) {
  // service provider mode is always consent denied
  return ['MspaServiceProviderMode', 'Gpc'].some(prop => cd[prop] === 1) ||
    // you cannot consent to what you were not notified of
    cd.PersonalDataConsents === 2 ||
    // minors 13+ who have not given consent
    cd.KnownChildSensitiveDataConsents[0] === 1 ||
    // minors under 13 cannot consent
    isApplicable(cd.KnownChildSensitiveDataConsents[1]) ||
    // covered cannot be zero
    cd.MspaCoveredTransaction === 0;
}

export function sensitiveNoticeIs(cd, value) {
  return ['SensitiveDataProcessingOptOutNotice', 'SensitiveDataLimitUseNotice'].some(prop => cd[prop] === value)
}

export function isConsentDenied(cd) {
  return isBasicConsentDenied(cd) ||
    ['Sale', 'Sharing', 'TargetedAdvertising'].some(scope => {
      const oo = cd[`${scope}OptOut`];
      const notice = cd[`${scope}OptOutNotice`];
      // user opted out
      return oo === 1 ||
      // opt-out notice was not given
        notice === 2 ||
      // do not trust CMP if it signals opt-in but no opt-out notice was given
        (oo === 2 && notice === 0);
    }) ||
    // no sharing notice was given ...
    cd.SharingNotice === 2 ||
    // ... or the CMP says it was not applicable, while also claiming it got consent
    (cd.SharingOptOut === 2 && cd.SharingNotice === 0);
}

export const isTransmitUfpdConsentDenied = (() => {
  // deny anything that smells like: genetic, biometric, state/national ID, financial, union membership,
  // or personal communication data
  const cannotBeInScope = [6, 7, 9, 10, 12].map(el => --el);
  // require consent for everything else (except geo, which is treated separately)
  const allExceptGeo = Array.from(Array(12).keys()).filter((el) => el !== SENSITIVE_DATA_GEO)
  const mustHaveConsent = allExceptGeo.filter(el => !cannotBeInScope.includes(el));

  return function (cd) {
    return isConsentDenied(cd) ||
      // no notice about sensitive data was given
      sensitiveNoticeIs(cd, 2) ||
      // extra-sensitive data is applicable
      cannotBeInScope.some(i => isApplicable(cd.SensitiveDataProcessing[i])) ||
      // user opted out for not-as-sensitive data
      mustHaveConsent.some(i => cd.SensitiveDataProcessing[i] === 1) ||
      // CMP says it has consent, but did not give notice about it
      (sensitiveNoticeIs(cd, 0) && allExceptGeo.some(i => cd.SensitiveDataProcessing[i] === 2))
  }
})();

export function isTransmitGeoConsentDenied(cd) {
  const geoConsent = cd.SensitiveDataProcessing[SENSITIVE_DATA_GEO];
  return geoConsent === 1 ||
    isBasicConsentDenied(cd) ||
    // no sensitive data notice was given
    sensitiveNoticeIs(cd, 2) ||
    // do not trust CMP if it says it has consent for geo but didn't show a sensitive data notice
    (sensitiveNoticeIs(cd, 0) && geoConsent === 2)
}

const CONSENT_RULES = {
  [ACTIVITY_SYNC_USER]: isConsentDenied,
  [ACTIVITY_ENRICH_EIDS]: isConsentDenied,
  [ACTIVITY_ENRICH_UFPD]: isTransmitUfpdConsentDenied,
  [ACTIVITY_TRANSMIT_PRECISE_GEO]: isTransmitGeoConsentDenied
};

export function mspaRule(sids, getConsent, denies, applicableSids = () => gppDataHandler.getConsentData()?.applicableSections) {
  return function () {
    if (applicableSids().some(sid => sids.includes(sid))) {
      const consent = getConsent();
      if (consent == null) {
        return {allow: false, reason: 'consent data not available'};
      }
      if (denies(consent)) {
        return {allow: false};
      }
    }
  };
}

function flatSection(subsections) {
  if (subsections == null) return subsections;
  return subsections.reduceRight((subsection, consent) => {
    return Object.assign(consent, subsection);
  }, {});
}

export function setupRules(api, sids, normalizeConsent = (c) => c, rules = CONSENT_RULES, registerRule = registerActivityControl, getConsentData = () => gppDataHandler.getConsentData()) {
  const unreg = [];
  const ruleName = `MSPA (GPP '${api}' for section${sids.length > 1 ? 's' : ''} ${sids.join(', ')})`;
  logInfo(`Enabling activity controls for ${ruleName}`)
  Object.entries(rules).forEach(([activity, denies]) => {
    unreg.push(registerRule(activity, ruleName, mspaRule(
      sids,
      () => normalizeConsent(flatSection(getConsentData()?.parsedSections?.[api])),
      denies,
      () => getConsentData()?.applicableSections || []
    )));
  });
  return () => unreg.forEach(ur => ur());
}
