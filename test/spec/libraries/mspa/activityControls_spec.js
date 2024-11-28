import {mspaRule, setupRules, isTransmitUfpdConsentDenied, isTransmitGeoConsentDenied, isBasicConsentDenied, sensitiveNoticeIs, isConsentDenied} from '../../../../libraries/mspa/activityControls.js';
import {ruleRegistry} from '../../../../src/activities/rules.js';

describe('Consent interpretation', () => {
  function mkConsent(flags) {
    return Object.assign({
      // not covered, opt in to targeted, sale, and share, all notices given, opt into precise geo
      Gpc: 0,
      KnownChildSensitiveDataConsents: [0, 0],
      MspaCoveredTransaction: 2,
      MspaOptOutOptionMode: 0,
      MspaServiceProviderMode: 0,
      PersonalDataConsents: 0,
      SaleOptOut: 2,
      SaleOptOutNotice: 1,
      SensitiveDataLimitUseNotice: 1,
      SensitiveDataProcessing: [0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0],
      SensitiveDataProcessingOptOutNotice: 1,
      SharingNotice: 1,
      SharingOptOut: 2,
      SharingOptOutNotice: 1,
      TargetedAdvertisingOptOut: 2,
      TargetedAdvertisingOptOutNotice: 1,
      Version: 1
    }, flags)
  }
  describe('isBasicConsentDenied', () => {
    it('should be false (basic consent conditions pass) with variety of notice and opt in', () => {
      const result = isBasicConsentDenied(mkConsent());
      expect(result).to.equal(false);
    });
    it('should be true (basic consent conditions do not pass) with personal data consent set to true (invalid state)', () => {
      const result = isBasicConsentDenied(mkConsent({
        PersonalDataConsents: 2
      }));
      expect(result).to.equal(true);
    });
    it('should be true (basic consent conditions do not pass) with covered set to zero (invalid state)', () => {
      const result = isBasicConsentDenied(mkConsent({
        MspaCoveredTransaction: 0
      }));
      expect(result).to.equal(true);
    });
    it('should not deny when consent for under-13 is null', () => {
      expect(isBasicConsentDenied(mkConsent({
        KnownChildSensitiveDataConsents: [0, null]
      }))).to.be.false;
    })
  });

  describe('isConsentDenied', () => {
    it('should be false (consent given personalized ads / sale / share) with variety of notice and opt in', () => {
      const result = isConsentDenied(mkConsent());
      expect(result).to.equal(false);
    });
    it('should be true (no consent) on opt out of targeted ads via TargetedAdvertisingOptOut', () => {
      const result = isConsentDenied(mkConsent({
        TargetedAdvertisingOptOut: 1
      }));
      expect(result).to.equal(true);
    });
    it('should be true (no consent) on opt out of targeted ads via no TargetedAdvertisingOptOutNotice', () => {
      const result = isConsentDenied(mkConsent({
        TargetedAdvertisingOptOutNotice: 2
      }));
      expect(result).to.equal(true);
    });
    it('should be true (no consent) if TargetedAdvertisingOptOutNotice is 0 and TargetedAdvertisingOptOut is 2', () => {
      const result = isConsentDenied(mkConsent({
        TargetedAdvertisingOptOutNotice: 0
      }));
      expect(result).to.equal(true);
    });
    it('requires also SharingNotice to accept opt-in for Sharing', () => {
      expect(isConsentDenied(mkConsent({
        SharingNotice: 0
      }))).to.be.true;
    })
  });

  describe('isTransmitUfpdConsentDenied', () => {
    it('should be false (consent given to add ufpd) with variety of notice and opt in', () => {
      const result = isTransmitUfpdConsentDenied(mkConsent());
      expect(result).to.equal(false);
    });
    Object.entries({
      'health information': 2,
      'biometric data': 6,
    }).forEach(([t, flagNo]) => {
      it(`'should be true (consent denied to add ufpd) if no consent to process ${t}'`, () => {
        const consent = mkConsent();
        consent.SensitiveDataProcessing[flagNo] = 1;
        expect(isTransmitUfpdConsentDenied(consent)).to.be.true;
      })
    });

    ['SharingNotice', 'SensitiveDataLimitUseNotice'].forEach(flag => {
      it(`should be true (consent denied to add ufpd) without ${flag}`, () => {
        expect(isTransmitUfpdConsentDenied(mkConsent({
          [flag]: 2
        }))).to.be.true;
      })
    });

    ['SaleOptOut', 'TargetedAdvertisingOptOut'].forEach(flag => {
      it(`should be true (consent denied to add ufpd) with ${flag}`, () => {
        expect(isTransmitUfpdConsentDenied(mkConsent({
          [flag]: 1
        }))).to.be.true;
      })
    });

    it('should be true (basic consent conditions do not pass) with sensitive opt in but no notice', () => {
      const cd = mkConsent({
        SensitiveDataLimitUseNotice: 0
      });
      cd.SensitiveDataProcessing[0] = 2;
      expect(isTransmitUfpdConsentDenied(cd)).to.be.true;
    });

    it('should deny when sensitive notice is missing', () => {
      const result = isTransmitUfpdConsentDenied(mkConsent({
        SensitiveDataLimitUseNotice: 2
      }));
      expect(result).to.equal(true);
    });

    it('should not deny when biometric data opt-out is null', () => {
      const cd = mkConsent();
      cd.SensitiveDataProcessing[6] = null;
      expect(isTransmitUfpdConsentDenied(cd)).to.be.false;
    })
  });

  describe('isTransmitGeoConsentDenied', () => {
    function geoConsent(geoOptOut, flags) {
      const consent = mkConsent(flags);
      consent.SensitiveDataProcessing[7] = geoOptOut;
      return consent;
    }
    it('should be true (consent denied to add precise geo) -- sensitive flag denied', () => {
      const result = isTransmitGeoConsentDenied(geoConsent(1));
      expect(result).to.equal(true);
    });
    it('should be true (consent denied to add precise geo) -- sensitive data limit usage not given', () => {
      const result = isTransmitGeoConsentDenied(geoConsent(1, {
        SensitiveDataLimitUseNotice: 0
      }));
      expect(result).to.equal(true);
    });
    it('should be false (consent given to add precise geo) -- sensitive position 8 (index 7) is true', () => {
      const result = isTransmitGeoConsentDenied(geoConsent(2));
      expect(result).to.equal(false);
    });
  })
});

describe('mspaRule', () => {
  it('does not apply if SID is not applicable', () => {
    const rule = mspaRule([1, 2], () => null, () => true, () => [3, 4]);
    expect(rule()).to.not.exist;
  });

  it('does not apply when no SID is applicable', () => {
    const rule = mspaRule([1], () => null, () => true, () => []);
    expect(rule()).to.not.exist;
  });

  describe('when SID is applicable', () => {
    let consent, denies;
    function mkRule() {
      return mspaRule([1, 2], () => consent, denies, () => [2])
    }

    beforeEach(() => {
      consent = null;
      denies = sinon.stub();
    });

    it('should deny when no consent is available', () => {
      expect(mkRule()().allow).to.equal(false);
    });

    it('should deny when consent is using version != 1', () => {
      consent = {Version: 2};
      expect(mkRule()().allow).to.equal(false);
    })

    Object.entries({
      'denies': true,
      'allows': false
    }).forEach(([t, denied]) => {
      it(`should check if deny fn ${t}`, () => {
        denies.returns(denied);
        consent = {mock: 'value', Version: 1};
        const result = mkRule()();
        sinon.assert.calledWith(denies, consent);
        if (denied) {
          expect(result.allow).to.equal(false);
        } else {
          expect(result).to.not.exist;
        }
      })
    })
  })
});

describe('setupRules', () => {
  let rules, registerRule, isAllowed, consent;
  beforeEach(() => {
    rules = {
      mockActivity: sinon.stub().returns(true)
    };
    ([registerRule, isAllowed] = ruleRegistry());
    consent = {
      applicableSections: [1],
      parsedSections: {
        mockApi: [
          {
            Version: 1,
            mock: 'consent'
          }
        ]
      }
    };
  });

  function runSetup(api, sids, normalize) {
    return setupRules(api, sids, normalize, rules, registerRule, () => consent)
  }

  it('should use flatten section data for the given api', () => {
    runSetup('mockApi', [1]);
    expect(isAllowed('mockActivity', {})).to.equal(false);
    sinon.assert.calledWith(rules.mockActivity, consent.parsedSections.mockApi[0])
  });

  it('should accept already flattened section data', () => {
    consent.parsedSections.mockApi = {flat: 'consent', Version: 1};
    runSetup('mockApi', [1]);
    isAllowed('mockActivity', {});
    sinon.assert.calledWith(rules.mockActivity, consent.parsedSections.mockApi)
  })

  it('should not choke when no consent data is available', () => {
    consent = null;
    runSetup('mockApi', [1]);
    expect(isAllowed('mockActivity', {})).to.equal(true);
  });

  it('should check applicableSections against given SIDs', () => {
    runSetup('mockApi', [2]);
    expect(isAllowed('mockActivity', {})).to.equal(true);
  });

  it('should pass flattened consent through normalizeConsent', () => {
    const normalize = sinon.stub().returns({normalized: 'consent', Version: 1})
    runSetup('mockApi', [1], normalize);
    expect(isAllowed('mockActivity', {})).to.equal(false);
    sinon.assert.calledWith(normalize, {mock: 'consent', Version: 1});
    sinon.assert.calledWith(rules.mockActivity, {normalized: 'consent', Version: 1});
  });

  it('should return a function that unregisters activity controls', () => {
    const dereg = runSetup('mockApi', [1]);
    dereg();
    expect(isAllowed('mockActivity', {})).to.equal(true);
  });
})
