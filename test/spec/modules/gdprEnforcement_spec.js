/* eslint no-console: 0 */

import { deviceAccessHook, setEnforcementConfig, userSyncHook, userIdHook, makeBidRequestsHook, validateRules } from 'modules/gdprEnforcement.js';
import { config } from 'src/config.js';
import adapterManager, { gdprDataHandler } from 'src/adapterManager.js';
import * as utils from 'src/utils.js';
import { validateStorageEnforcement } from 'src/storageManager.js';
import { executeStorageCallbacks } from 'src/prebid.js';
import events from 'src/events.js';
import { EVENTS } from 'src/constants.json';

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
            '3': true
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

  after(function () {
    validateStorageEnforcement.getHooks({ hook: deviceAccessHook }).remove();
    $$PREBID_GLOBAL$$.requestBids.getHooks({ hook: executeStorageCallbacks }).remove();
    adapterManager.makeBidRequests.getHooks({ hook: makeBidRequestsHook }).remove();
  })

  describe('deviceAccessHook', function () {
    beforeEach(function () {
      nextFnSpy = sinon.spy();
      gdprDataHandlerStub = sinon.stub(gdprDataHandler, 'getConsentData');
      logWarnSpy = sinon.spy(utils, 'logWarn');
    });
    afterEach(function () {
      config.resetConfig();
      gdprDataHandler.getConsentData.restore();
      logWarnSpy.restore();
    });
    it('should not allow device access when device access flag is set to false', function () {
      config.setConfig({
        deviceAccess: false,
        consentManagement: {
          gdpr: {
            rules: [{
              purpose: 'storage',
              enforcePurpose: false,
              enforceVendor: false,
              vendorExceptions: ['appnexus', 'rubicon']
            }]
          }
        }
      });

      deviceAccessHook(nextFnSpy);
      expect(nextFnSpy.calledOnce).to.equal(true);
      let result = {
        hasEnforcementHook: true,
        valid: false
      }
      sinon.assert.calledWith(nextFnSpy, undefined, undefined, result);
    });

    it('should only check for consent for vendor exceptions when enforcePurpose and enforceVendor are false', function () {
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
      let consentData = {}
      consentData.vendorData = staticConfig.consentData.getTCData;
      consentData.gdprApplies = true;
      consentData.apiVersion = 2;
      gdprDataHandlerStub.returns(consentData);

      deviceAccessHook(nextFnSpy, 1, 'appnexus');
      deviceAccessHook(nextFnSpy, 5, 'rubicon');
      expect(logWarnSpy.callCount).to.equal(0);
    });

    it('should check consent for all vendors when enforcePurpose and enforceVendor are true', function () {
      setEnforcementConfig({
        gdpr: {
          rules: [{
            purpose: 'storage',
            enforcePurpose: true,
            enforceVendor: true,
          }]
        }
      });
      let consentData = {}
      consentData.vendorData = staticConfig.consentData.getTCData;
      consentData.gdprApplies = true;
      consentData.apiVersion = 2;
      gdprDataHandlerStub.returns(consentData);

      deviceAccessHook(nextFnSpy, 1, 'appnexus');
      deviceAccessHook(nextFnSpy, 3, 'rubicon');
      expect(logWarnSpy.callCount).to.equal(1);
    });

    it('should allow device access when gdprApplies is false and hasDeviceAccess flag is true', function () {
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
      let consentData = {}
      consentData.vendorData = staticConfig.consentData.getTCData;
      consentData.gdprApplies = false;
      consentData.apiVersion = 2;
      gdprDataHandlerStub.returns(consentData);

      deviceAccessHook(nextFnSpy, 1, 'appnexus');
      expect(nextFnSpy.calledOnce).to.equal(true);
      let result = {
        hasEnforcementHook: true,
        valid: true
      }
      sinon.assert.calledWith(nextFnSpy, 1, 'appnexus', result);
    });
  });

  describe('userSyncHook', function () {
    let curBidderStub;
    let adapterManagerStub;

    beforeEach(function () {
      gdprDataHandlerStub = sinon.stub(gdprDataHandler, 'getConsentData');
      logWarnSpy = sinon.spy(utils, 'logWarn');
      curBidderStub = sinon.stub(config, 'getCurrentBidder');
      adapterManagerStub = sinon.stub(adapterManager, 'getBidAdapter');
      nextFnSpy = sinon.spy();
    });

    afterEach(function () {
      config.getCurrentBidder.restore();
      config.resetConfig();
      gdprDataHandler.getConsentData.restore();
      adapterManager.getBidAdapter.restore();
      logWarnSpy.restore();
    });

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
      let consentData = {}
      consentData.vendorData = staticConfig.consentData.getTCData;
      consentData.gdprApplies = true;
      consentData.apiVersion = 2;
      gdprDataHandlerStub.returns(consentData);

      curBidderStub.returns('sampleBidder1');
      adapterManagerStub.withArgs('sampleBidder1').returns({
        getSpec: function () {
          return {
            'gvlid': 1
          }
        }
      });
      userSyncHook(nextFnSpy);

      curBidderStub.returns('sampleBidder2');
      adapterManagerStub.withArgs('sampleBidder2').returns({
        getSpec: function () {
          return {
            'gvlid': 3
          }
        }
      });
      userSyncHook(nextFnSpy);
      expect(nextFnSpy.calledTwice).to.equal(true);
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
      let consentData = {}
      consentData.vendorData = staticConfig.consentData.getTCData;
      consentData.apiVersion = 2;
      consentData.gdprApplies = true;
      gdprDataHandlerStub.returns(consentData);

      curBidderStub.returns('sampleBidder1');
      adapterManagerStub.withArgs('sampleBidder1').returns({
        getSpec: function () {
          return {
            'gvlid': 1
          }
        }
      });
      userSyncHook(nextFnSpy);

      curBidderStub.returns('sampleBidder2');
      adapterManagerStub.withArgs('sampleBidder2').returns({
        getSpec: function () {
          return {
            'gvlid': 3
          }
        }
      });
      userSyncHook(nextFnSpy);
      expect(nextFnSpy.calledOnce).to.equal(true);
      expect(logWarnSpy.callCount).to.equal(1);
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
      let consentData = {}
      consentData.vendorData = staticConfig.consentData.getTCData;
      consentData.apiVersion = 2;
      consentData.gdprApplies = true;
      gdprDataHandlerStub.returns(consentData);

      curBidderStub.returns('sampleBidder1');
      adapterManagerStub.withArgs('sampleBidder1').returns({
        getSpec: function () {
          return {
            'gvlid': 1
          }
        }
      });
      userSyncHook(nextFnSpy);

      curBidderStub.returns('sampleBidder2');
      adapterManagerStub.withArgs('sampleBidder2').returns({
        getSpec: function () {
          return {
            'gvlid': 3
          }
        }
      });
      userSyncHook(nextFnSpy);
      expect(nextFnSpy.calledTwice).to.equal(true);
      expect(logWarnSpy.callCount).to.equal(0);
    });
  });

  describe('userIdHook', function () {
    beforeEach(function () {
      logWarnSpy = sinon.spy(utils, 'logWarn');
      nextFnSpy = sinon.spy();
    });
    afterEach(function () {
      config.resetConfig();
      logWarnSpy.restore();
    });
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
      let consentData = {}
      consentData.vendorData = staticConfig.consentData.getTCData;
      consentData.apiVersion = 2;
      consentData.gdprApplies = true;
      let submodules = [{
        submodule: {
          gvlid: 1,
          name: 'sampleUserId'
        }
      }]
      userIdHook(nextFnSpy, submodules, consentData);
      // Should pass back hasValidated flag since version 2
      const args = nextFnSpy.getCalls()[0].args;
      expect(args[1].hasValidated).to.be.true;
      expect(nextFnSpy.calledOnce).to.equal(true);
      sinon.assert.calledWith(nextFnSpy, submodules, {...consentData, hasValidated: true});
    });

    it('should allow userId module if gdpr not in scope', function () {
      let submodules = [{
        submodule: {
          gvlid: 1,
          name: 'sampleUserId'
        }
      }];
      let consentData = null;
      userIdHook(nextFnSpy, submodules, consentData);
      // Should not pass back hasValidated flag since version 2
      const args = nextFnSpy.getCalls()[0].args;
      expect(args[1]).to.be.null;
      expect(nextFnSpy.calledOnce).to.equal(true);
      sinon.assert.calledWith(nextFnSpy, submodules, consentData);
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
      let consentData = {}
      consentData.vendorData = staticConfig.consentData.getTCData;
      consentData.apiVersion = 2;
      consentData.gdprApplies = true;

      let submodules = [{
        submodule: {
          gvlid: 1,
          name: 'sampleUserId'
        }
      }, {
        submodule: {
          gvlid: 3,
          name: 'sampleUserId1'
        }
      }]
      userIdHook(nextFnSpy, submodules, consentData);
      expect(logWarnSpy.callCount).to.equal(1);
      let expectedSubmodules = [{
        submodule: {
          gvlid: 1,
          name: 'sampleUserId'
        }
      }]
      sinon.assert.calledWith(nextFnSpy, expectedSubmodules, {...consentData, hasValidated: true});
    });
  });

  describe.skip('makeBidRequestsHook', function () {
    let sandbox;
    let adapterManagerStub;
    let emitEventSpy;
    let logInfoSpy;
    const MOCK_AD_UNITS = [{
      code: 'ad-unit-1',
      mediaTypes: {},
      bids: [{
        bidder: 'bidder_1' // has consent
      }, {
        bidder: 'bidder_2' // doesn't have consent
      }]
    }, {
      code: 'ad-unit-2',
      mediaTypes: {},
      bids: [{
        bidder: 'bidder_2'
      }, {
        bidder: 'bidder_3'
      }]
    }];
    beforeEach(function () {
      sandbox = sinon.createSandbox();
      gdprDataHandlerStub = sandbox.stub(gdprDataHandler, 'getConsentData');
      adapterManagerStub = sandbox.stub(adapterManager, 'getBidAdapter');
      logWarnSpy = sandbox.spy(utils, 'logWarn');
      logInfoSpy = sandbox.spy(utils, 'logInfo');
      nextFnSpy = sandbox.spy();
      emitEventSpy = sandbox.spy(events, 'emit');
    });
    afterEach(function () {
      config.resetConfig();
      sandbox.restore();
    });
    it('should block bidder which does not have consent and allow bidder which has consent', function () {
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
      const consentData = {};
      consentData.vendorData = staticConfig.consentData.getTCData;
      consentData.apiVersion = 2;
      consentData.gdprApplies = true;

      gdprDataHandlerStub.returns(consentData);
      adapterManagerStub.withArgs('bidder_1').returns({
        getSpec: function () {
          return { 'gvlid': 4 }
        }
      });
      adapterManagerStub.withArgs('bidder_2').returns({
        getSpec: function () {
          return { 'gvlid': 5 }
        }
      });
      adapterManagerStub.withArgs('bidder_3').returns({
        getSpec: function () {
          return { 'gvlid': undefined }
        }
      });
      makeBidRequestsHook(nextFnSpy, MOCK_AD_UNITS, []);

      // Assertions
      expect(nextFnSpy.calledOnce).to.equal(true);
      sinon.assert.calledWith(nextFnSpy, [{
        code: 'ad-unit-1',
        mediaTypes: {},
        bids: [
          sinon.match({ bidder: 'bidder_1' })
        ]
      }, {
        code: 'ad-unit-2',
        mediaTypes: {},
        bids: []
      }], []);
      expect(emitEventSpy.calledTwice).to.equal(true);
      expect(logWarnSpy.calledTwice).to.equal(true);
      sinon.assert.calledWith(emitEventSpy.firstCall, EVENTS.BIDDER_BLOCKED, 'bidder_2');
      sinon.assert.calledWith(emitEventSpy.secondCall, EVENTS.BIDDER_BLOCKED, 'bidder_3');
    });

    it('should skip validation checks if GDPR version is not equal to "2"', function () {
      setEnforcementConfig({
        gdpr: {
          rules: [{
            purpose: 'storage',
            enforePurpose: false,
            enforceVendor: false,
            vendorExceptions: []
          }]
        }
      });

      const consentData = {};
      consentData.vendorData = staticConfig.consentData.getTCData;
      consentData.apiVersion = 1;
      consentData.gdprApplies = true;
      gdprDataHandlerStub.returns(consentData);

      makeBidRequestsHook(nextFnSpy, MOCK_AD_UNITS, []);

      // Assertions
      expect(nextFnSpy.calledOnce).to.equal(true);
      sinon.assert.calledWith(nextFnSpy, sinon.match.array.deepEquals(MOCK_AD_UNITS), []);
      expect(emitEventSpy.notCalled).to.equal(true);
      expect(logWarnSpy.notCalled).to.equal(true);
      expect(logInfoSpy.calledOnce).to.equal(true);
    });
  });

  describe('validateRules(rule, consentData, currentModule, gvlId)', function () {
    const createGdprRule = (purposeName = 'storage', enforcePurpose = true, enforceVendor = true, vendorExceptions = []) => ({
      purpose: purposeName,
      enforcePurpose: enforcePurpose,
      enforceVendor: enforceVendor,
      vendorExceptions: vendorExceptions
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
});
