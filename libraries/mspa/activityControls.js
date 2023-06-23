import {registerActivityControl} from '../../src/activities/rules.js';
import {
  ACTIVITY_ENRICH_EIDS,
  ACTIVITY_ENRICH_UFPD,
  ACTIVITY_SYNC_USER,
  ACTIVITY_TRANSMIT_PRECISE_GEO
} from '../../src/activities/activities.js';
import {gppDataHandler} from '../../src/adapterManager.js';

// default interpretation for MSPA consent(s):
// https://docs.google.com/document/d/1yPEVx3bBdSkIw-QNkQR5qi1ztmn9zoXk-LaGQB6iw7Q

function isBasicConsentDenied(cd) {
  // service provider mode is always consent denied
  return ['MspaServiceProviderMode', 'Gpc'].some(prop => cd[prop] === 1) ||
    // you cannot consent to what you were not notified of
    cd.PersonalDataConsents === 2 ||
    // minors 13+ who have not given consent
    cd.KnownChildSensitiveDataConsents[0] === 1 ||
    // minors under 13 cannot consent
    cd.KnownChildSensitiveDataConsents[1] !== 0 ||
    // sensitive category consent impossible without notice
    (cd.SensitiveDataProcessing.some(element => element === 2) && (cd.SensitiveDataLimitUseNotice !== 1 || cd.SensitiveDataProcessingOptOutNotice !== 1));
}

function isSensitiveNoticeMissing(cd) {
  return ['SensitiveDataProcessingOptOutNotice', 'SensitiveDataLimitUseNotice'].some(prop => cd[prop] === 2)
}

function isConsentDenied(cd) {
  // TODO: invalidate any consent that does not include notice, eg, if TargetedAdvertisingOptOutNotice is 0, TargetedAdvertisingOptOut must all be 0
  return isBasicConsentDenied(cd) ||
    ['SaleOptOut', 'SharingOptOut', 'TargetedAdvertisingOptOut'].some(prop => cd[prop] === 1) ||
    ['SaleOptOutNotice', 'SharingNotice', 'SharingOptOutNotice', 'TargetedAdvertisingOptOutNotice'].some(prop => cd[prop] === 2);
}

export function isTransmitUfpdConsentDenied(cd) {
  // SensitiveDataProcessing[1-5,11]=1 OR SensitiveDataProcessing[6,7,9,10,12]<>0 OR
  const mustBeZero = [6, 7, 9, 10, 12];
  const mustBeZeroSubtractedVector = mustBeZero.map((number) => number - 1);
  const cannotBeOne = [1, 2, 3, 4, 5, 11];
  const cannotBeOneSubtractedVector = cannotBeOne.map((number) => number - 1);
  return isConsentDenied(cd) ||
    isSensitiveNoticeMissing(cd) ||
    cd.SensitiveDataProcessing.some((val, i) => cannotBeOneSubtractedVector.indexOf(i) && val === 1) ||
    cd.SensitiveDataProcessing.some((val, i) => mustBeZeroSubtractedVector.indexOf(i) && val !== 0);
}

export function isTransmitGeoConsentDenied(cd) {
  return isBasicConsentDenied(cd) ||
    isSensitiveNoticeMissing(cd) ||
    cd.SensitiveDataProcessing[7] === 1
}

const CONSENT_RULES = {
  [ACTIVITY_SYNC_USER]: isConsentDenied,
  [ACTIVITY_ENRICH_EIDS]: isConsentDenied,
  [ACTIVITY_ENRICH_UFPD]: isTransmitUfpdConsentDenied,
  [ACTIVITY_TRANSMIT_PRECISE_GEO]: isTransmitGeoConsentDenied
}

export function mspaRule(sids, getConsent, denies, applicableSids = () => gppDataHandler.getConsentData()?.applicableSections) {
  return function() {
    if (applicableSids().some(sid => sids.includes(sid))) {
      const consent = getConsent();
      if (consent == null) {
        return {allow: false, reason: 'consent data not available'};
      }
      if (denies(consent)) {
        return {allow: false}
      }
    }
  }
}

export function setupRules(api, sids, normalizeConsent = (c) => c, rules = CONSENT_RULES, registerRule = registerActivityControl, getConsentData = () => gppDataHandler.getConsentData()) {
  const unreg = [];
  Object.entries(rules).forEach(([activity, denies]) => {
    unreg.push(registerRule(activity, `MSPA (${api})`, mspaRule(sids, () => normalizeConsent(getConsentData()?.sectionData?.[api]), denies, () => getConsentData()?.applicableSections || [])))
  })
  return () => unreg.forEach(ur => ur())
}
