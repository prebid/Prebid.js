import { expect } from 'chai';
import {
  hasVendorPurposeConsent,
  isPublisherConsentAllowed
} from '../../../../libraries/consentManagement/tcfConsentUtils.js';

describe('tcfConsentUtils', function () {
  const HOST_GVLID = '52';

  function mockConsent({ purposeConsent = true, vendorConsent = true, restriction, gdprApplies = true } = {}) {
    const consent = {
      gdprApplies,
      vendorData: {
        purpose: {
          consents: { 1: purposeConsent }
        },
        vendor: {
          consents: { [HOST_GVLID]: vendorConsent }
        }
      }
    };
    if (restriction != null) {
      consent.vendorData.publisher = {
        restrictions: {
          1: { [HOST_GVLID]: restriction }
        }
      };
    }
    return consent;
  }

  describe('isPublisherConsentAllowed', function () {
    it('allows consent when no publisher restriction is set', function () {
      expect(isPublisherConsentAllowed(mockConsent(), 1, HOST_GVLID)).to.be.true;
    });

    it('denies consent when publisher restriction is 0 (not allowed)', function () {
      expect(isPublisherConsentAllowed(mockConsent({ restriction: 0 }), 1, HOST_GVLID)).to.be.false;
    });

    it('allows consent when publisher restriction is 1 (require consent)', function () {
      expect(isPublisherConsentAllowed(mockConsent({ restriction: 1 }), 1, HOST_GVLID)).to.be.true;
    });

    it('denies consent when publisher restriction is 2 (require LI)', function () {
      expect(isPublisherConsentAllowed(mockConsent({ restriction: 2 }), 1, HOST_GVLID)).to.be.false;
    });
  });

  describe('hasVendorPurposeConsent', function () {
    it('returns true when purpose and vendor consent are granted', function () {
      expect(hasVendorPurposeConsent(mockConsent(), 1, HOST_GVLID)).to.be.true;
    });

    it('returns false when publisher restriction blocks consent for the host vendor', function () {
      expect(hasVendorPurposeConsent(mockConsent({ restriction: 0 }), 1, HOST_GVLID)).to.be.false;
      expect(hasVendorPurposeConsent(mockConsent({ restriction: 2 }), 1, HOST_GVLID)).to.be.false;
    });

    it('returns true when gdpr does not apply', function () {
      expect(hasVendorPurposeConsent(mockConsent({ gdprApplies: false, vendorConsent: false }), 1, HOST_GVLID)).to.be.true;
    });
  });
});
