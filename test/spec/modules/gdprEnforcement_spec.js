import {
  accessDeviceRule,
  deviceAccessHook,
  enforcementRules,
  enrichEidsRule,
  fetchBidsRule,
  getGvlid,
  getGvlidFromAnalyticsAdapter,
  purpose1Rule,
  purpose2Rule,
  reportAnalyticsRule,
  setEnforcementConfig,
  STRICT_STORAGE_ENFORCEMENT,
  syncUserRule, ufpdRule,
  validateRules
} from 'modules/gdprEnforcement.js';
import {config} from 'src/config.js';
import adapterManager, {gdprDataHandler} from 'src/adapterManager.js';
import * as utils from 'src/utils.js';
import {
  MODULE_TYPE_ANALYTICS,
  MODULE_TYPE_BIDDER,
  MODULE_TYPE_PREBID,
  MODULE_TYPE_UID
} from '../../../src/activities/modules.js';
import * as events from 'src/events.js';
import 'modules/appnexusBidAdapter.js'; // some tests expect this to be in the adapter registry
import 'src/prebid.js';
import {hook} from '../../../src/hook.js';
import {GDPR_GVLIDS, VENDORLESS_GVLID} from '../../../src/consentHandler.js';
import {validateStorageEnforcement} from '../../../src/storageManager.js';
import {activityParams} from '../../../src/activities/activityParams.js';

describe('gdpr enforcement', function () {
  let nextFnSpy;
  let logWarnSpy;
  let gdprDataHandlerStub;
  let staticConfig = {
    cmpApi: 'static',
    timeout: 7500,
    allowAuctionWithoutConsent: false,
    consentData: {
      getTCData: {
        'tcString': 'COuqj-POu90rDBcBkBENAZCgAPzAAAPAACiQFwwBAABAA1ADEAbQC4YAYAAgAxAG0A',
        'cmpId': 92,
        'cmpVersion': 100,
        'tcfPolicyVersion': 2,
        'gdprApplies': true,
        'isServiceSpecific': true,
        'useNonStandardStacks': false,
        'purposeOneTreatment': false,
        'publisherCC': 'US',
        'cmpStatus': 'loaded',
        'eventStatus': 'tcloaded',
        'outOfBand': {
          'allowedVendors': {},
          'discloseVendors': {}
        },
        'purpose': {
          'consents': {
            '1': true,
            '2': true,
            '3': true,
            '7': true
          },
          'legitimateInterests': {
            '1': false,
            '2': true,
            '3': false
          }
        },
        'vendor': {
          'consents': {
            '1': true,
            '2': true,
            '3': false,
            '4': true,
            '5': false
          },
          'legitimateInterests': {
            '1': false,
            '2': true,
            '3': false,
            '4': false,
            '5': false
          }
        },
        'specialFeatureOptins': {
          '1': false,
          '2': false
        },
        'restrictions': {},
        'publisher': {
          'consents': {
            '1': false,
            '2': false,
            '3': false
          },
          'legitimateInterests': {
            '1': false,
            '2': false,
            '3': false
          },
          'customPurpose': {
            'consents': {},
            'legitimateInterests': {}
          }
        }
      }
    }
  };
  let gvlids, sandbox;

  function setupConsentData({gdprApplies = true, apiVersion = 2} = {}) {
    const cd = utils.deepClone(staticConfig);
    const consent = {
      vendorData: cd.consentData.getTCData,
      gdprApplies,
      apiVersion
    };
    sandbox.stub(gdprDataHandler, 'getConsentData').callsFake(() => consent)
    return consent;
  }

  before(() => {
    hook.ready();
  });

  after(function () {
    $$PREBID_GLOBAL$$.requestBids.getHooks().remove();
  })

  function expectAllow(allow, ruleResult) {
    allow ? expect(ruleResult).to.not.exist : sinon.assert.match(ruleResult, {allow: false});
  }

  beforeEach(() => {
    sandbox = sinon.sandbox.create();
    gvlids = {};
    sandbox.stub(GDPR_GVLIDS, 'get').callsFake((name) => ({gvlid: gvlids[name], modules: {}}));
  });

  afterEach(() => {
    sandbox.restore();
  })

  describe('deviceAccessRule', () => {
    afterEach(() => {
      config.resetConfig();
    });

    it('should not check for consent when enforcePurpose and enforceVendor are false', function () {
      Object.assign(gvlids, {
        appnexus: 1,
        rubicon: 5
      });
      setEnforcementConfig({
        gdpr: {
          rules: [{
            purpose: 'storage',
            enforcePurpose: false,
            enforceVendor: false,
            vendorExceptions: ['appnexus']
          }]
        }
      });
      setupConsentData();
      ['appnexus', 'rubicon'].forEach(bidder => expectAllow(true, accessDeviceRule(activityParams(MODULE_TYPE_BIDDER, bidder))));
    });

    it('should check consent for all vendors when enforcePurpose and enforceVendor are true', function () {
      Object.assign(gvlids, {
        appnexus: 1,
        rubicon: 3
      });
      setEnforcementConfig({
        gdpr: {
          rules: [{
            purpose: 'storage',
            enforcePurpose: true,
            enforceVendor: true,
          }]
        }
      });
      setupConsentData();
      Object.entries({
        appnexus: true,
        rubicon: false
      }).forEach(([bidder, isAllowed]) => {
        expectAllow(isAllowed, accessDeviceRule(activityParams(MODULE_TYPE_BIDDER, bidder)));
      })
    });

    it('should allow device access when gdprApplies is false and hasDeviceAccess flag is true', function () {
      gvlids.appnexus = 1;
      setEnforcementConfig({
        gdpr: {
          rules: [{
            purpose: 'storage',
            enforcePurpose: true,
            enforceVendor: true,
            vendorExceptions: []
          }]
        }
      });
      setupConsentData();
      expectAllow(true, accessDeviceRule(activityParams(MODULE_TYPE_BIDDER, 'appnexus')));
    });

    it('should use gvlMapping set by publisher', function() {
      config.setConfig({
        'gvlMapping': {
          'appnexus': 4
        }
      });
      setEnforcementConfig({
        gdpr: {
          rules: [{
            purpose: 'storage',
            enforcePurpose: true,
            enforceVendor: true,
            vendorExceptions: []
          }]
        }
      });
      setupConsentData();
      expectAllow(true, accessDeviceRule(activityParams(MODULE_TYPE_BIDDER, 'appnexus')));
    });

    it(`should not enforce consent for vendorless modules if ${STRICT_STORAGE_ENFORCEMENT} is not set`, () => {
      setEnforcementConfig({});
      setupConsentData();
      expectAllow(true, accessDeviceRule(activityParams(MODULE_TYPE_PREBID, 'mockCoreModule')));
    })
  });

  describe('syncUserRule', () => {
    it('should allow bidder to do user sync if consent is true', function () {
      setEnforcementConfig({
        gdpr: {
          rules: [{
            purpose: 'storage',
            enforcePurpose: false,
            enforceVendor: true,
            vendorExceptions: ['sampleBidder2']
          }]
        }
      });
      setupConsentData();
      Object.assign(gvlids, {
        sampleBidder1: 1,
        sampleBidder2: 2
      })
      Object.keys(gvlids).forEach(bidder => expect(syncUserRule(activityParams(MODULE_TYPE_BIDDER, bidder))).to.not.exist);
    });

    it('should not allow bidder to do user sync if user has denied consent', function () {
      setEnforcementConfig({
        gdpr: {
          rules: [{
            purpose: 'storage',
            enforcePurpose: false,
            enforceVendor: true,
            vendorExceptions: []
          }]
        }
      });
      setupConsentData();
      Object.assign(gvlids, {
        sampleBidder1: 1,
        sampleBidder2: 3
      })

      Object.entries({
        sampleBidder1: true,
        sampleBidder2: false
      }).forEach(([bidder, isAllowed]) => {
        expectAllow(isAllowed, syncUserRule(activityParams(MODULE_TYPE_BIDDER, bidder)));
      })
    });

    it('should not check vendor consent when enforceVendor is false', function () {
      setEnforcementConfig({
        gdpr: {
          rules: [{
            purpose: 'storage',
            enforcePurpose: true,
            enforceVendor: false,
            vendorExceptions: ['sampleBidder1']
          }]
        }
      });
      setupConsentData();
      Object.assign(gvlids, {
        sampleBidder1: 1,
        sampleBidder2: 3
      })
      Object.keys(gvlids).forEach(bidder => expect(syncUserRule(activityParams(MODULE_TYPE_BIDDER, bidder))).to.not.exist);
    });
  });
  describe('enrichEidsRule', () => {
    it('should allow user id module if consent is given', function () {
      setEnforcementConfig({
        gdpr: {
          rules: [{
            purpose: 'storage',
            enforcePurpose: false,
            enforceVendor: true,
            vendorExceptions: []
          }]
        }
      });
      setupConsentData();
      gvlids.sampleUserId = 1;
      expect(enrichEidsRule(activityParams(MODULE_TYPE_UID, 'sampleUserId'))).to.not.exist;
    });

    it('should allow userId module if gdpr not in scope', function () {
      gvlids.sampleUserId = 1;
      const consent = setupConsentData({gdprApplies: false});
      consent.vendorData.purpose.consents['1'] = false;
      expect(enrichEidsRule(activityParams(MODULE_TYPE_UID, 'sampleUserId'))).to.not.exist;
    });

    it('should not allow user id module if user denied consent', function () {
      setEnforcementConfig({
        gdpr: {
          rules: [{
            purpose: 'storage',
            enforcePurpose: false,
            enforceVendor: true,
            vendorExceptions: []
          }]
        }
      });
      setupConsentData();
      Object.assign(gvlids, {
        sampleUserId: 1,
        sampleUserId1: 3
      });
      Object.entries({
        sampleUserId: true,
        sampleUserId1: false
      }).forEach(([name, allow]) => {
        expectAllow(allow, enrichEidsRule(activityParams(MODULE_TYPE_UID, name)))
      });
    });
  });

  describe('fetchBidsRule', () => {
    afterEach(function () {
      config.resetConfig();
    });

    it('should block bidder which does not have consent and allow bidder which has consent (liTransparency is established)', function () {
      setEnforcementConfig({
        gdpr: {
          rules: [{
            purpose: 'basicAds',
            enforcePurpose: true,
            enforceVendor: true,
            vendorExceptions: []
          }]
        }
      });
      setupConsentData()
      Object.assign(gvlids, {
        bidder_1: 4,
        bidder_2: 5,
      });
      ['bidder_1', 'bidder_2', 'bidder_3'].forEach(bidder => expect(fetchBidsRule(activityParams(MODULE_TYPE_BIDDER, bidder))).to.not.exist);
    });

    it('should block bidder which does not have consent and allow bidder which has consent (liTransparency is NOT established)', function() {
      setEnforcementConfig({
        gdpr: {
          rules: [{
            purpose: 'basicAds',
            enforcePurpose: true,
            enforceVendor: true,
            vendorExceptions: ['bidder_3']
          }]
        }
      });
      const consent = setupConsentData();
      consent.vendorData.purpose.legitimateInterests['2'] = false;
      Object.assign(gvlids, {
        bidder_1: 4,
        bidder_2: 5,
      })
      Object.entries({
        bidder_1: true,
        bidder_2: false,
        bidder_3: true
      }).forEach(([bidder, allowed]) => {
        expectAllow(allowed, fetchBidsRule(activityParams(MODULE_TYPE_BIDDER, bidder)));
      })
    });

    it('should skip validation checks if GDPR version is not equal to "2"', function () {
      setEnforcementConfig({
        gdpr: {
          rules: [{
            purpose: 'storage',
            enforcePurpose: true,
            enforceVendor: true,
            vendorExceptions: []
          }]
        }
      });
      const consent = setupConsentData();
      consent.vendorData.purpose.consents['2'] = false;
      consent.apiVersion = 1;
      ['bidder_1', 'bidder_2', 'bidder_3'].forEach(bidder => expect(fetchBidsRule(activityParams(MODULE_TYPE_BIDDER, bidder))).to.not.exist);
    });

    it('should skip validation if enforcePurpose is false', () => {
      setEnforcementConfig({
        gdpr: {
          rules: [{
            purpose: 'storage',
            enforcePurpose: false,
            enforceVendor: true,
            vendorExceptions: []
          }]
        }
      });
      const consent = setupConsentData();
      consent.vendorData.purpose.consents['2'] = false;
      ['bidder_1', 'bidder_2', 'bidder_3'].forEach(bidder => expect(fetchBidsRule(activityParams(MODULE_TYPE_BIDDER, bidder))).to.not.exist);
    })
  });

  describe('reportAnalyticsRule', () => {
    it('should block analytics adapter which does not have consent and allow the one(s) which have consent', function() {
      setEnforcementConfig({
        gdpr: {
          rules: [{
            purpose: 'measurement',
            enforcePurpose: true,
            enforceVendor: true,
            vendorExceptions: ['analyticsAdapter_B']
          }]
        }
      });

      Object.assign(gvlids, {
        analyticsAdapter_A: 3,
        analyticsAdapter_B: 5,
        analyticsAdapter_C: 1
      });

      setupConsentData()

      Object.entries({
        analyticsAdapter_A: false,
        analyticsAdapter_B: true,
        analyticsAdapter_C: true
      }).forEach(([adapter, allow]) => {
        expectAllow(allow, reportAnalyticsRule(activityParams(MODULE_TYPE_ANALYTICS, adapter)))
      })
    });
  });

  describe('transmitUfpdRule', () => {
    it('should allow when purpose 3 consent is given', () => {
      setEnforcementConfig({
        gdpr: {
          rules: [{
            purpose: 'personalizedAds',
            enforcePurpose: true,
            enforceVendor: true,
          }]
        }
      });
      Object.assign(gvlids, {
        mockBidder: 123
      });
      const consent = setupConsentData();
      consent.vendorData.purpose.consents[4] = true;
      consent.vendorData.vendor.consents[123] = true;
      expectAllow(true, ufpdRule(activityParams(MODULE_TYPE_BIDDER, 'mockBidder')));
    });

    it('should return deny when purpose 4 consent is withheld', () => {
      setEnforcementConfig({
        gdpr: {
          rules: [{
            purpose: 'personalizedAds',
            enforcePurpose: true,
            enforceVendor: true,
          }]
        }
      });
      Object.assign(gvlids, {
        mockBidder: 123
      });
      const consent = setupConsentData();
      consent.vendorData.purpose.consents[4] = true;
      consent.vendorData.vendor.consents[123] = false;
      expectAllow(false, ufpdRule(activityParams(MODULE_TYPE_BIDDER, 'mockBidder')))
    });
  });

  describe('validateRules', function () {
    const createGdprRule = (purposeName = 'storage', enforcePurpose = true, enforceVendor = true, vendorExceptions = [], softVendorExceptions = []) => ({
      purpose: purposeName,
      enforcePurpose,
      enforceVendor,
      vendorExceptions,
      softVendorExceptions,
    });

    const consentData = {
      vendorData: staticConfig.consentData.getTCData,
      apiVersion: 2,
      gdprApplies: true
    };

    // Bidder - 'bidderA' has vendorConsent
    const vendorAllowedModule = 'bidderA';
    const vendorAllowedGvlId = 1;

    // Bidder = 'bidderB' doesn't have vendorConsent
    const vendorBlockedModule = 'bidderB';
    const vendorBlockedGvlId = 3;

    const consentDataWithPurposeConsentFalse = utils.deepClone(consentData);
    consentDataWithPurposeConsentFalse.vendorData.purpose.consents['1'] = false;

    it('should return true when enforcePurpose=true AND purposeConsent[p]==true AND enforceVendor[p,v]==true AND vendorConsent[v]==true', function () {
      // 'enforcePurpose' and 'enforceVendor' both are 'true'
      const gdprRule = createGdprRule('storage', true, true, []);

      // case 1 - Both purpose consent and vendor consent is 'true'. validateRules must return 'true'
      let isAllowed = validateRules(gdprRule, consentData, vendorAllowedModule, vendorAllowedGvlId);
      expect(isAllowed).to.equal(true);

      // case 2 - Purpose consent is 'true' but vendor consent is 'false'. validateRules must return 'false'
      isAllowed = validateRules(gdprRule, consentData, vendorBlockedModule, vendorBlockedGvlId);
      expect(isAllowed).to.equal(false);

      // case 3 - Purpose consent is 'false' but vendor consent is 'true'. validateRules must return 'false'
      isAllowed = validateRules(gdprRule, consentDataWithPurposeConsentFalse, vendorAllowedModule, vendorAllowedGvlId);
      expect(isAllowed).to.equal(false);

      // case 4 - Both purpose consent and vendor consent is 'false'. validateRules must return 'false'
      isAllowed = validateRules(gdprRule, consentDataWithPurposeConsentFalse, vendorBlockedModule, vendorBlockedGvlId);
      expect(isAllowed).to.equal(false);
    });

    it('should return true when enforcePurpose=true AND purposeConsent[p]==true AND enforceVendor[p,v]==false', function () {
      // 'enforcePurpose' is 'true' and 'enforceVendor' is 'false'
      const gdprRule = createGdprRule('storage', true, false, []);

      // case 1 - Both purpose consent and vendor consent is 'true'. validateRules must return 'true'
      let isAllowed = validateRules(gdprRule, consentData, vendorAllowedModule, vendorAllowedGvlId);
      expect(isAllowed).to.equal(true);

      // case 2 - Purpose consent is 'true' but vendor consent is 'false'. validateRules must return 'true' because vendorConsent doens't matter
      isAllowed = validateRules(gdprRule, consentData, vendorBlockedModule, vendorBlockedGvlId);
      expect(isAllowed).to.equal(true);

      // case 3 - Purpose consent is 'false' but vendor consent is 'true'. validateRules must return 'false' because vendorConsent doesn't matter
      isAllowed = validateRules(gdprRule, consentDataWithPurposeConsentFalse, vendorAllowedModule, vendorAllowedGvlId);
      expect(isAllowed).to.equal(false);

      // case 4 - Both purpose consent and vendor consent is 'false'. validateRules must return 'false' and vendorConsent doesn't matter
      isAllowed = validateRules(gdprRule, consentDataWithPurposeConsentFalse, vendorBlockedModule, vendorAllowedGvlId);
      expect(isAllowed).to.equal(false);
    });

    it('should return true when enforcePurpose=false AND enforceVendor[p,v]==true AND vendorConsent[v]==true', function () {
      // 'enforcePurpose' is 'false' and 'enforceVendor' is 'true'
      const gdprRule = createGdprRule('storage', false, true, []);

      // case 1 - Both purpose consent and vendor consent is 'true'. validateRules must return 'true'
      let isAllowed = validateRules(gdprRule, consentData, vendorAllowedModule, vendorAllowedGvlId);
      expect(isAllowed).to.equal(true);

      // case 2 - Purpose consent is 'true' but vendor consent is 'false'. validateRules must return 'false' because purposeConsent doesn't matter
      isAllowed = validateRules(gdprRule, consentData, vendorBlockedModule, vendorBlockedGvlId);
      expect(isAllowed).to.equal(false);

      // case 3 - urpose consent is 'false' but vendor consent is 'true'. validateRules must return 'true' because purposeConsent doesn't matter
      isAllowed = validateRules(gdprRule, consentDataWithPurposeConsentFalse, vendorAllowedModule, vendorAllowedGvlId);
      expect(isAllowed).to.equal(true);

      // case 4 - Both purpose consent and vendor consent is 'false'. validateRules must return 'false' and purposeConsent doesn't matter
      isAllowed = validateRules(gdprRule, consentDataWithPurposeConsentFalse, vendorBlockedModule, vendorBlockedGvlId);
      expect(isAllowed).to.equal(false);
    });

    it('should return true when enforcePurpose=false AND enforceVendor[p,v]==false', function () {
      // 'enforcePurpose' is 'false' and 'enforceVendor' is 'false'
      const gdprRule = createGdprRule('storage', false, false, []);

      // case 1 - Both purpose consent and vendor consent is 'true'. validateRules must return 'true', both the consents do not matter.
      let isAllowed = validateRules(gdprRule, consentData, vendorAllowedModule, vendorAllowedGvlId);
      expect(isAllowed).to.equal(true);

      // case 2 - Purpose consent is 'true' but vendor consent is 'false'. validateRules must return 'true', both the consents do not matter.
      isAllowed = validateRules(gdprRule, consentData, vendorBlockedModule, vendorBlockedGvlId);
      expect(isAllowed).to.equal(true);

      // case 3 - urpose consent is 'false' but vendor consent is 'true'. validateRules must return 'true', both the consents do not matter.
      isAllowed = validateRules(gdprRule, consentDataWithPurposeConsentFalse, vendorAllowedModule, vendorAllowedGvlId);
      expect(isAllowed).to.equal(true);

      // case 4 - Both purpose consent and vendor consent is 'false'. validateRules must return 'true', both the consents do not matter.
      isAllowed = validateRules(gdprRule, consentDataWithPurposeConsentFalse, vendorBlockedModule, vendorBlockedGvlId);
      expect(isAllowed).to.equal(true);
    });

    it('should return true when "vendorExceptions" contains the name of the vendor under test', function () {
      // 'vendorExceptions' contains 'bidderB' which doesn't have vendor consent.
      const gdprRule = createGdprRule('storage', false, true, [vendorBlockedModule]);

      /* 'bidderB' gets a free pass since it's included in the 'vendorExceptions' array. validateRules must disregard
      user's choice for purpose and vendor consent and return 'true' for this bidder(s) */
      const isAllowed = validateRules(gdprRule, consentData, vendorBlockedModule, vendorBlockedGvlId);
      expect(isAllowed).to.equal(true);
    });

    describe('when the vendor has a softVendorException', () => {
      const gdprRule = createGdprRule('storage', true, true, [], [vendorBlockedModule]);

      it('should return false if general consent was not given', () => {
        const isAllowed = validateRules(gdprRule, consentDataWithPurposeConsentFalse, vendorBlockedModule, vendorBlockedGvlId);
        expect(isAllowed).to.be.false;
      })
      it('should return true if general consent was given', () => {
        const isAllowed = validateRules(gdprRule, consentData, vendorBlockedModule, vendorBlockedGvlId);
        expect(isAllowed).to.be.true;
      })
    })

    describe('when module does not need vendor consent', () => {
      Object.entries({
        'storage': 1,
        'basicAds': 2,
        'measurement': 7,
        'personalizedAds': 4,
      }).forEach(([purpose, purposeNo]) => {
        describe(`for purpose ${purpose}`, () => {
          const rule = createGdprRule(purpose);
          Object.entries({
            'allowed': true,
            'not allowed': false
          }).forEach(([t, consentGiven]) => {
            it(`should be ${t} when purpose is ${t}`, () => {
              const consent = utils.deepClone(consentData);
              consent.vendorData.purpose.consents[purposeNo] = consentGiven;
              // take legitimate interest out of the picture for this test
              consent.vendorData.purpose.legitimateInterests = {};
              const actual = validateRules(rule, consent, 'mockModule', VENDORLESS_GVLID);
              expect(actual).to.equal(consentGiven);
            })
          })
        })
      })
    })

    describe('Purpose 2 special case', function () {
      const consentDataWithLIFalse = utils.deepClone(consentData);
      consentDataWithLIFalse.vendorData.purpose.legitimateInterests['2'] = false;

      const consentDataWithPurposeConsentFalse = utils.deepClone(consentData);
      consentDataWithPurposeConsentFalse.vendorData.purpose.consents['2'] = false;

      const consentDataWithPurposeConsentFalseAndLIFalse = utils.deepClone(consentData);
      consentDataWithPurposeConsentFalseAndLIFalse.vendorData.purpose.legitimateInterests['2'] = false;
      consentDataWithPurposeConsentFalseAndLIFalse.vendorData.purpose.consents['2'] = false;

      it('should return true when (enforcePurpose=true AND purposeConsent[p]===true AND enforceVendor[p.v]===true AND vendorConsent[v]===true) OR (purposesLITransparency[p]===true)', function () {
        // both 'enforcePurpose' and 'enforceVendor' is 'true'
        const gdprRule = createGdprRule('basicAds', true, true, []);

        // case 1 - Both purpose consent and vendor consent is 'true', but legitimateInterests for purpose 2 is 'false'. validateRules must return 'true'.
        let isAllowed = validateRules(gdprRule, consentDataWithLIFalse, vendorAllowedModule, vendorAllowedGvlId);
        expect(isAllowed).to.equal(true);

        // case 2 - Purpose consent is 'true' but vendor consent is 'false', but legitimateInterests for purpose 2 is 'true'. validateRules must return 'true'.
        isAllowed = validateRules(gdprRule, consentData, vendorBlockedModule, vendorBlockedGvlId);
        expect(isAllowed).to.equal(true);

        // case 3 - Purpose consent is 'true' and vendor consent is 'true', as well as legitimateInterests for purpose 2 is 'true'. validateRules must return 'true'.
        isAllowed = validateRules(gdprRule, consentData, vendorAllowedModule, vendorAllowedGvlId);
        expect(isAllowed).to.equal(true);

        // case 4 - Purpose consent is 'true' and vendor consent is 'false', and legitimateInterests for purpose 2 is 'false'. validateRules must return 'false'.
        isAllowed = validateRules(gdprRule, consentDataWithLIFalse, vendorBlockedModule, vendorBlockedGvlId);
        expect(isAllowed).to.equal(false);
      });

      it('should return true when (enforcePurpose=true AND purposeConsent[p]===true AND enforceVendor[p.v]===false) OR (purposesLITransparency[p]===true)', function () {
        // 'enforcePurpose' is 'true' and 'enforceVendor' is 'false'
        const gdprRule = createGdprRule('basicAds', true, false, []);

        // case 1 - Purpose consent is 'true', vendor consent doesn't matter and legitimateInterests for purpose 2 is 'true'. validateRules must return 'true'.
        let isAllowed = validateRules(gdprRule, consentData, vendorBlockedModule, vendorBlockedGvlId);
        expect(isAllowed).to.equal(true);

        // case 2 - Purpose consent is 'false', vendor consent doesn't matter and legitimateInterests for purpose 2 is 'true'. validateRules must return 'true'.
        isAllowed = validateRules(gdprRule, consentDataWithPurposeConsentFalse, vendorAllowedModule, vendorAllowedGvlId);
        expect(isAllowed).to.equal(true);

        // case 3 - Purpose consent is 'false', vendor consent doesn't matter and legitimateInterests for purpose 2 is 'false'. validateRules must return 'false'.
        isAllowed = validateRules(gdprRule, consentDataWithPurposeConsentFalseAndLIFalse, vendorAllowedModule, vendorAllowedGvlId);
        expect(isAllowed).to.equal(false);
      });

      it('should return true when (enforcePurpose=false AND enforceVendor[p,v]===true AND vendorConsent[v]===true) OR (purposesLITransparency[p]===true)', function () {
        // 'enforcePurpose' is 'false' and 'enforceVendor' is 'true'
        const gdprRule = createGdprRule('basicAds', false, true, []);

        // case - 1 Vendor consent is 'true', purpose consent doesn't matter and legitimateInterests for purpose 2 is 'true'. validateRules must return 'true'.
        let isAllowed = validateRules(gdprRule, consentData, vendorAllowedModule, vendorAllowedGvlId);
        expect(isAllowed).to.equal(true);

        // case 2 - Vendor consent is 'false', purpose consent doesn't matter and legitimateInterests for purpose 2 is 'true'. validateRules must return 'true'.
        isAllowed = validateRules(gdprRule, consentData, vendorBlockedModule, vendorBlockedGvlId);
        expect(isAllowed).to.equal(true);

        // case 3 - Vendor consent is 'false', purpose consent doesn't matter and legitimateInterests for purpose 2 is 'false'. validateRules must return 'false'.
        isAllowed = validateRules(gdprRule, consentDataWithLIFalse, vendorBlockedModule, vendorBlockedGvlId);
        expect(isAllowed).to.equal(false);
      });
    });
  })

  describe('setEnforcementConfig', function () {
    let sandbox;
    const DEFAULT_RULES = [{
      purpose: 'storage',
      enforcePurpose: true,
      enforceVendor: true,
      vendorExceptions: []
    }, {
      purpose: 'basicAds',
      enforcePurpose: true,
      enforceVendor: true,
      vendorExceptions: []
    }];
    beforeEach(function () {
      sandbox = sinon.createSandbox();
      logWarnSpy = sandbox.spy(utils, 'logWarn');
    });
    afterEach(function () {
      config.resetConfig();
      sandbox.restore();
    });

    it('should enforce TCF2 Purpose1 and Purpose 2 if no "rules" found in the config', function () {
      setEnforcementConfig({
        gdpr: {
          cmpApi: 'iab',
          allowAuctionWithoutConsent: true,
          timeout: 5000
        }
      });

      expect(logWarnSpy.calledOnce).to.equal(true);
      expect(enforcementRules).to.deep.equal(DEFAULT_RULES);
    });

    it('should enforce TCF2 Purpose 2 also if only Purpose 1 is defined in "rules"', function () {
      const purpose1RuleDefinedInConfig = {
        purpose: 'storage',
        enforcePurpose: false,
        enforceVendor: true,
        vendorExceptions: ['bidderA']
      }
      setEnforcementConfig({
        gdpr: {
          rules: [purpose1RuleDefinedInConfig]
        }
      });

      expect(purpose1Rule).to.deep.equal(purpose1RuleDefinedInConfig);
      expect(purpose2Rule).to.deep.equal(DEFAULT_RULES[1]);
    });

    it('should enforce TCF2 Purpose 1 also if only Purpose 2 is defined in "rules"', function () {
      const purpose2RuleDefinedInConfig = {
        purpose: 'basicAds',
        enforcePurpose: false,
        enforceVendor: true,
        vendorExceptions: ['bidderA']
      }
      setEnforcementConfig({
        gdpr: {
          rules: [purpose2RuleDefinedInConfig]
        }
      });

      expect(purpose1Rule).to.deep.equal(DEFAULT_RULES[0]);
      expect(purpose2Rule).to.deep.equal(purpose2RuleDefinedInConfig);
    });

    it('should use the "rules" defined in config if a definition found', function() {
      const rules = [{
        purpose: 'storage',
        enforcePurpose: false,
        enforceVendor: false
      }, {
        purpose: 'basicAds',
        enforcePurpose: false,
        enforceVendor: false
      }]
      setEnforcementConfig({gdpr: { rules }});

      expect(enforcementRules).to.deep.equal(rules);
    });
  });

  describe('TCF2FinalResults', function() {
    let sandbox;
    beforeEach(function() {
      sandbox = sinon.createSandbox();
      sandbox.spy(events, 'emit');
    });
    afterEach(function() {
      config.resetConfig();
      sandbox.restore();
    });
    it('should emit TCF2 enforcement data on auction end', function() {
      const rules = [{
        purpose: 'storage',
        enforcePurpose: false,
        enforceVendor: false
      }, {
        purpose: 'basicAds',
        enforcePurpose: false,
        enforceVendor: false
      }]
      setEnforcementConfig({gdpr: { rules }});

      events.emit('auctionEnd', {})

      // Assertions
      sinon.assert.calledWith(events.emit.getCall(1), 'tcf2Enforcement', sinon.match.object);
    })
  });

  describe('gvlid resolution', () => {
    let sandbox;
    beforeEach(function() {
      sandbox = sinon.createSandbox();
    });

    afterEach(function() {
      sandbox.restore();
      config.resetConfig();
    });

    describe('getGvlid', function() {
      const MOCK_MODULE = 'moduleA';
      let entry;

      beforeEach(function() {
        entry = {modules: {}};
        GDPR_GVLIDS.get.reset();
        GDPR_GVLIDS.get.callsFake((mod) => mod === MOCK_MODULE ? entry : {modules: {}});
      });

      it('should return "null" if called without passing any argument', function() {
        const gvlid = getGvlid();
        expect(gvlid).to.equal(null);
      });

      it('should return "null" if no GVL ID was registered', function() {
        const gvlid = getGvlid('type', MOCK_MODULE);
        expect(gvlid).to.equal(null);
      });

      it('should return null if the wrong GVL ID was registered', () => {
        entry = {gvlid: 123};
        expect(getGvlid('type', 'someOtherModule')).to.equal(null);
      })

      Object.entries({
        'without fallback': null,
        'with fallback': () => 'shouldBeIgnored'
      }).forEach(([t, fallbackFn]) => {
        describe(t, () => {
          it('should return the GVL ID from gvlMapping if it is defined in setConfig', function() {
            config.setConfig({
              gvlMapping: {
                [MOCK_MODULE]: 1
              }
            });

            entry = {gvlid: 2};

            const gvlid = getGvlid('type', MOCK_MODULE, fallbackFn);
            expect(gvlid).to.equal(1);
          });

          it('should return the GVL ID that was registered', function() {
            entry = {gvlid: 7};
            expect(getGvlid('type', MOCK_MODULE, fallbackFn)).to.equal(7);
          });

          it('should return VENDORLESS_GVLID for core modules', () => {
            entry = {gvlid: 123};
            expect(getGvlid(MODULE_TYPE_PREBID, MOCK_MODULE, fallbackFn)).to.equal(VENDORLESS_GVLID);
          });

          describe('multiple GVL IDs are found', () => {
            it('should use bidder over others', () => {
              entry = {modules: {[MODULE_TYPE_BIDDER]: 123, [MODULE_TYPE_UID]: 321}};
              expect(getGvlid(MODULE_TYPE_UID, MOCK_MODULE, fallbackFn)).to.equal(123);
            });
            it('should use uid over analytics', () => {
              entry = {modules: {[MODULE_TYPE_UID]: 123, [MODULE_TYPE_ANALYTICS]: 321}};
              expect(getGvlid(MODULE_TYPE_ANALYTICS, MOCK_MODULE, fallbackFn)).to.equal(123);
            })
          })
        })
      })

      it('should use fallbackFn if no other lookup produces a gvl id', () => {
        expect(getGvlid('type', MOCK_MODULE, () => 321)).to.equal(321);
      });
    });

    describe('getGvlidFromAnalyticsConfig', () => {
      let getAnalyticsAdapter, adapter, adapterEntry;

      beforeEach(() => {
        adapter = {};
        adapterEntry = {
          adapter
        };
        getAnalyticsAdapter = sandbox.stub(adapterManager, 'getAnalyticsAdapter');
        getAnalyticsAdapter.withArgs('analytics').returns(adapterEntry);
      });

      it('should return gvlid from adapter if defined', () => {
        adapter.gvlid = 321;
        expect(getGvlidFromAnalyticsAdapter('analytics')).to.equal(321);
      });

      it('should invoke adapter.gvlid if it\'s a function', () => {
        adapter.gvlid = (cfg) => cfg.k
        const cfg = {k: 231};
        expect(getGvlidFromAnalyticsAdapter('analytics', cfg)).to.eql(231);
      });

      it('should not choke if adapter gvlid fn throws', () => {
        adapter.gvlid = () => { throw new Error(); };
        expect(getGvlidFromAnalyticsAdapter('analytics')).to.not.be.ok;
      });
    });
  })
});
