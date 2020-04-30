import { deviceAccessHook, setEnforcementConfig, userSyncHook, userIdHook, makeBidRequestsHook } from 'modules/gdprEnforcement.js';
import { config } from 'src/config.js';
import adapterManager, { gdprDataHandler } from 'src/adapterManager.js';
import * as utils from 'src/utils.js';
import { validateStorageEnforcement } from 'src/storageManager.js';
import { executeStorageCallbacks } from 'src/prebid.js';
import events from 'src/events.js';

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
            '2': false,
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
      // expect(nextFnSpy.calledWith(undefined, result));
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
      // expect(nextFnSpy.calledWith(undefined, result));
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
      expect(nextFnSpy.calledOnce).to.equal(true);
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
      expect(nextFnSpy.calledOnce).to.equal(true);
      sinon.assert.calledWith(nextFnSpy, submodules, consentData);
      // expect(nextFnSpy.calledWith(undefined, submodules, consentData));
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
      sinon.assert.calledWith(nextFnSpy, expectedSubmodules, consentData);
      // expect(nextFnSpy.calledWith(undefined, expectedSubmodules, consentData));
    });
  });

  describe('makeBidRequestsHook', function () {
    let sandbox;
    let adapterManagerStub;
    let emitEventSpy;
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
      }]
    }];
    beforeEach(function () {
      sandbox = sinon.createSandbox();
      gdprDataHandlerStub = sandbox.stub(gdprDataHandler, 'getConsentData');
      adapterManagerStub = sandbox.stub(adapterManager, 'getBidAdapter');
      logWarnSpy = sandbox.spy(utils, 'logWarn');
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
      expect(emitEventSpy.calledOnce).to.equal(true);
      expect(logWarnSpy.calledOnce).to.equal(true);
    });

    it('should skip TCF v2.0 validation checks if "Purpose 2" enforcment not present in gdpr config rules', function () {
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
      makeBidRequestsHook(nextFnSpy, MOCK_AD_UNITS, []);

      // Assertions
      expect(nextFnSpy.calledOnce).to.equal(true);
      sinon.assert.calledWith(nextFnSpy, sinon.match.array.deepEquals(MOCK_AD_UNITS), []);
      expect(emitEventSpy.notCalled).to.equal(true);
      expect(logWarnSpy.notCalled).to.equal(true);
    });
  });
});
