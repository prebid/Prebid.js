import { deepAccess } from '../../src/utils.js'

export const PERMUTIVE_VENDOR_ID = 361

/**
 * Determine if required GDPR purposes are allowed, optionally requiring vendor consent.
 * @param {Object} userConsent
 * @param {number[]} requiredPurposes
 * @param {boolean} enforceVendorConsent
 * @returns {boolean}
 */
export function hasPurposeConsent(userConsent, requiredPurposes, enforceVendorConsent) {
  const gdprApplies = deepAccess(userConsent, 'gdpr.gdprApplies')
  if (!gdprApplies) return true

  if (enforceVendorConsent) {
    const vendorConsents = deepAccess(userConsent, 'gdpr.vendorData.vendor.consents') || {}
    const vendorLegitimateInterests = deepAccess(userConsent, 'gdpr.vendorData.vendor.legitimateInterests') || {}
    const purposeConsents = deepAccess(userConsent, 'gdpr.vendorData.purpose.consents') || {}
    const purposeLegitimateInterests = deepAccess(userConsent, 'gdpr.vendorData.purpose.legitimateInterests') || {}
    const hasVendorConsent = vendorConsents[PERMUTIVE_VENDOR_ID] === true || vendorLegitimateInterests[PERMUTIVE_VENDOR_ID] === true

    return hasVendorConsent && requiredPurposes.every((purposeId) =>
      purposeConsents[purposeId] === true || purposeLegitimateInterests[purposeId] === true
    )
  }

  const purposeConsents = deepAccess(userConsent, 'gdpr.vendorData.publisher.consents') || {}
  const purposeLegitimateInterests = deepAccess(userConsent, 'gdpr.vendorData.publisher.legitimateInterests') || {}

  return requiredPurposes.every((purposeId) =>
    purposeConsents[purposeId] === true || purposeLegitimateInterests[purposeId] === true
  )
}
