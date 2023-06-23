import {mspaRule, setupRules, isTransmitUfpdConsentDenied, isTransmitGeoConsentDenied, isBasicConsentDenied, isSensitiveNoticeMissing, isConsentDenied} from '../../../../libraries/mspa/activityControls.js';
import {ruleRegistry} from '../../../../src/activities/rules.js';
describe('isBasicConsentDenied', () => {
  const cd = {
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
  };
  it('should be false (basic consent conditions pass) with variety of notice and opt in', () => {
    const result = isBasicConsentDenied(cd);
    expect(result).to.equal(false);
  });
  it('should be true (basic consent conditions do not pass) with personal data consent set to true (invalid state)', () => {
    cd.PersonalDataConsents = 2;
    const result = isBasicConsentDenied(cd);
    expect(result).to.equal(true);
    cd.PersonalDataConsents = 0;
  });
  it('should be true (basic consent conditions do not pass) with sensitive opt in but no notice', () => {
    cd.SensitiveDataLimitUseNotice = 0;
    const result = isBasicConsentDenied(cd);
    expect(result).to.equal(true);
    cd.SensitiveDataLimitUseNotice = 1;
  });
})
describe('isSensitiveNoticeMissing', () => {
  const cd = {
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
  };
  it('should be false (sensitive notice is given or not needed) with variety of notice and opt in', () => {
    const result = isSensitiveNoticeMissing(cd);
    expect(result).to.equal(false);
  });
  it('should be true (sensitive notice is missing) with variety of notice and opt in', () => {
    cd.SensitiveDataLimitUseNotice = 2;
    const result = isSensitiveNoticeMissing(cd);
    expect(result).to.equal(true);
    cd.SensitiveDataLimitUseNotice = 1;
  });
})
describe('isConsentDenied', () => {
  const cd = {
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
  };
  it('should be false (consent given personalized ads / sale / share) with variety of notice and opt in', () => {
    const result = isConsentDenied(cd);
    expect(result).to.equal(false);
  });
  it('should be true (no consent) on opt out of targeted ads via TargetedAdvertisingOptOut', () => {
    cd.TargetedAdvertisingOptOut = 1;
    const result = isConsentDenied(cd);
    expect(result).to.equal(true);
    cd.TargetedAdvertisingOptOut = 2;
  });
  it('should be true (no consent) on opt out of targeted ads via no TargetedAdvertisingOptOutNotice', () => {
    cd.TargetedAdvertisingOptOutNotice = 2;
    const result = isConsentDenied(cd);
    expect(result).to.equal(true);
    cd.TargetedAdvertisingOptOutNotice = 1;
  });
  it('should be true (no consent) if TargetedAdvertisingOptOutNotice is 0 and TargetedAdvertisingOptOut is 2', () => {
    cd.TargetedAdvertisingOptOutNotice = 0;
    const result = isConsentDenied(cd);
    expect(result).to.equal(true);
    cd.TargetedAdvertisingOptOutNotice = 1;
  });
})
describe('isTransmitUfpdConsentDenied', () => {
  const cd = {
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
  };
  it('should be false (consent given to add ufpd) with variety of notice and opt in', () => {
    const result = isTransmitUfpdConsentDenied(cd);
    expect(result).to.equal(false);
  });
  it('should be true (consent denied to add ufpd) if no consent to process health information', () => {
    cd.SensitiveDataProcessing[2] = 1;
    const result = isTransmitUfpdConsentDenied(cd);
    expect(result).to.equal(true);
    cd.SensitiveDataProcessing[2] = 0;
  });
  it('should be true (consent denied to add ufpd) with consent to process biometric data, as this should not be on openrtb', () => {
    cd.SensitiveDataProcessing[6] = 1;
    const result = isTransmitUfpdConsentDenied(cd);
    expect(result).to.equal(true);
    cd.SensitiveDataProcessing[6] = 1;
  });
  it('should be true (consent denied to add ufpd) without sharing notice', () => {
    cd.SharingNotice = 2;
    const result = isTransmitUfpdConsentDenied(cd);
    expect(result).to.equal(true);
    cd.SharingNotice = 1;
  });
  it('should be true (consent denied to add ufpd) with sale opt out', () => {
    cd.SaleOptOut = 1;
    const result = isTransmitUfpdConsentDenied(cd);
    expect(result).to.equal(true);
    cd.SaleOptOut = 2;
  });
  it('should be true (consent denied to add ufpd) without targeted ads opt out', () => {
    cd.TargetedAdvertisingOptOut = 1;
    const result = isTransmitUfpdConsentDenied(cd);
    expect(result).to.equal(true);
    cd.TargetedAdvertisingOptOut = 2;
  });
  it('should be true (consent denied to add ufpd) with missing sensitive data limit notice', () => {
    cd.SensitiveDataLimitUseNotice = 2;
    const result = isTransmitUfpdConsentDenied(cd);
    expect(result).to.equal(true);
    cd.SensitiveDataLimitUseNotice = 1;
  });
})

describe('isTransmitGeoConsentDenied', () => {
  const cd = {
    // not covered, opt out of geo
    Gpc: 0,
    KnownChildSensitiveDataConsents: [0, 0],
    MspaCoveredTransaction: 2,
    MspaOptOutOptionMode: 0,
    MspaServiceProviderMode: 0,
    PersonalDataConsents: 0,
    SaleOptOut: 2,
    SaleOptOutNotice: 1,
    SensitiveDataLimitUseNotice: 1,
    SensitiveDataProcessing: [0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0],
    SensitiveDataProcessingOptOutNotice: 1,
    SharingNotice: 1,
    SharingOptOut: 2,
    SharingOptOutNotice: 1,
    TargetedAdvertisingOptOut: 2,
    TargetedAdvertisingOptOutNotice: 1,
    Version: 1
  };
  it('should be true (consent denied to add precise geo) -- sensitive flag denied', () => {
    const result = isTransmitGeoConsentDenied(cd);
    expect(result).to.equal(true);
  });
  it('should be true (consent denied to add precise geo) -- sensitive data limit usage not given', () => {
    cd.SensitiveDataLimitUseNotice = 0;
    const result = isTransmitGeoConsentDenied(cd);
    expect(result).to.equal(true);
    cd.SensitiveDataLimitUseNotice = 1;
  });
  it('should be false (consent given to add precise geo) -- sensitive position 8 (index 7) is true', () => {
    cd.SensitiveDataProcessing[7] = 2;
    const result = isTransmitGeoConsentDenied(cd);
    expect(result).to.equal(false);
    cd.SensitiveDataProcessing[7] = 1;
  });
})

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

    Object.entries({
      'denies': true,
      'allows': false
    }).forEach(([t, denied]) => {
      it(`should check if deny fn ${t}`, () => {
        denies.returns(denied);
        consent = {mock: 'value'};
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
      sectionData: {
        mockApi: {
          mock: 'consent'
        }
      }
    };
  });

  function runSetup(api, sids, normalize) {
    return setupRules(api, sids, normalize, rules, registerRule, () => consent)
  }

  it('should use section data for the given api', () => {
    runSetup('mockApi', [1]);
    expect(isAllowed('mockActivity', {})).to.equal(false);
    sinon.assert.calledWith(rules.mockActivity, {mock: 'consent'})
  });

  it('should not choke when no consent data is available', () => {
    consent = null;
    runSetup('mockApi', [1]);
    expect(isAllowed('mockActivity', {})).to.equal(true);
  });

  it('should check applicableSections against given SIDs', () => {
    runSetup('mockApi', [2]);
    expect(isAllowed('mockActivity', {})).to.equal(true);
  });

  it('should pass consent through normalizeConsent', () => {
    const normalize = sinon.stub().returns({normalized: 'consent'})
    runSetup('mockApi', [1], normalize);
    expect(isAllowed('mockActivity', {})).to.equal(false);
    sinon.assert.calledWith(normalize, {mock: 'consent'});
    sinon.assert.calledWith(rules.mockActivity, {normalized: 'consent'});
  });

  it('should return a function that unregisters activity controls', () => {
    const dereg = runSetup('mockApi', [1]);
    dereg();
    expect(isAllowed('mockActivity', {})).to.equal(true);
  });
})
