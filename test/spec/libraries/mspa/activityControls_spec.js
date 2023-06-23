import {mspaRule, setupRules, isTransmitUfpdConsentDenied} from '../../../../libraries/mspa/activityControls.js';
import {ruleRegistry} from '../../../../src/activities/rules.js';

describe('isTransmitUfpdConsentDenied', () => {
  const cd = {
    // not covered, opt out of geo
    KnownChildSensitiveDataConsents: [0, 0],
    MspaCoveredTransaction: 2,
    MspaOptOutOptionMode: 0,
    MspaServiceProviderMode: 0,
    PersonalDataConsents: 1,
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
    KnownChildSensitiveDataConsents: [0, 0],
    MspaCoveredTransaction: 2,
    MspaOptOutOptionMode: 0,
    MspaServiceProviderMode: 0,
    PersonalDataConsents: 1,
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
