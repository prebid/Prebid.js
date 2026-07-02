import { deepAccess } from '../../src/utils.js';

export type TcfConsentData = {
  gdprApplies?: boolean;
  vendorData?: Record<string, any>;
};

/**
 * Reads consent for a vendorData path (e.g. purpose, vendor, publisher).
 */
export function getPathConsent(consentData: TcfConsentData | null | undefined, path: string, id: number | string): boolean {
  return deepAccess(consentData, `vendorData.${path}.consents.${id}`) === true;
}

/**
 * Reads global purpose consent from TCF consent data.
 */
export function getPurposeConsent(consentData: TcfConsentData | null | undefined, purposeNo: number): boolean {
  return getPathConsent(consentData, 'purpose', purposeNo);
}

/**
 * Reads vendor consent from TCF consent data.
 */
export function getVendorConsent(consentData: TcfConsentData | null | undefined, gvlId: number | string): boolean {
  if (gvlId == null || gvlId === '') {
    return false;
  }
  return getPathConsent(consentData, 'vendor', gvlId);
}

/**
 * Whether publisher restrictions allow using consent (not LI) for this vendor/purpose.
 * Mirrors purpose restriction handling in tcfControl getAcceptableFlags.
 */
export function isPublisherConsentAllowed(
  consentData: TcfConsentData | null | undefined,
  purposeNo: number,
  gvlId: number | string
): boolean {
  const restriction = deepAccess(consentData, `vendorData.publisher.restrictions.${purposeNo}.${gvlId}`);
  return restriction !== 0 && restriction !== 2;
}

/**
 * Returns whether both global purpose consent and vendor consent are granted.
 * Non-GDPR requests are treated as allowed, matching hasPurpose1Consent.
 */
export function hasVendorPurposeConsent(
  consentData: TcfConsentData | null | undefined,
  purposeNo: number,
  gvlId: number | string
): boolean {
  if (!consentData?.gdprApplies) {
    return true;
  }
  if (!isPublisherConsentAllowed(consentData, purposeNo, gvlId)) {
    return false;
  }
  return getPurposeConsent(consentData, purposeNo) && getVendorConsent(consentData, gvlId);
}
