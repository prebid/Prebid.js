import { expect } from 'chai';
import { hasAddtlConsent, hasVendorPurposeConsent, parseAddtlConsent } from '../../../../libraries/consentManagement/consentUtils.js';

describe('consentUtils', function () {
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

  describe('parseAddtlConsent', () => {
    Object.entries({
      'v2 string': ['2~1.35.41~dv.9.21', [1, 35, 41]],
      'v2 string with no disclosed providers': ['2~1.35~dv.', [1, 35]],
      'v2 string with no consent': ['2~~dv.9.21', []],
      'v1 string': ['1~1.35.41', [1, 35, 41]],
      'empty v1 string': ['1~', []],
      'v2 string without disclosed section': ['2~2343', []],
      'v2 string with truncated disclosed section': ['2~1.35~', []],
      'v2 string with malformed disclosed section': ['2~2343~garbage', []],
      'v2 string with non-decimal disclosed IDs': ['2~1.35~dv.9.x', []],
      'v1 string with non-decimal IDs': ['1~1e3', []],
      'v1 string with a disclosed section': ['1~1.2~dv.3', []],
      'empty IDs': ['2~1..2~dv.', []],
      'negative IDs': ['2~1.-3~dv.', []],
      'surrounding whitespace': [' 2~1~dv.', []],
      'unknown version': ['3~1.35', []],
      'empty string': ['', []],
      'undefined': [undefined, []],
      'non-string': [123, []],
    }).forEach(([t, [input, expected]]) => {
      it(`parses ${t}`, () => {
        expect(Array.from(parseAddtlConsent(input))).to.eql(expected);
      });
    });

    it('re-parses when the string changes', () => {
      expect(parseAddtlConsent('2~1~dv.').has(1)).to.be.true;
      expect(parseAddtlConsent('2~2~dv.').has(1)).to.be.false;
    });
  });

  describe('hasAddtlConsent', () => {
    it('returns true for consented providers', () => {
      expect(hasAddtlConsent({ addtlConsent: '2~1.35~dv.9' }, 35)).to.be.true;
    });

    it('returns false for disclosed-only providers', () => {
      expect(hasAddtlConsent({ addtlConsent: '2~1.35~dv.9' }, 9)).to.be.false;
    });

    it('returns false without consent data', () => {
      expect(hasAddtlConsent(null, 35)).to.be.false;
    });
  });
});
