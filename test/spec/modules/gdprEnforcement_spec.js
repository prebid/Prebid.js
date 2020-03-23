import { deviceAccessHook, setEnforcementConfig, userSyncHook, userIdHook } from 'modules/gdprEnforcement.js';
import { config } from 'src/config.js';
import adapterManager, { gdprDataHandler } from 'src/adapterManager.js';
import * as utils from 'src/utils.js';

describe('gdpr enforcement', function() {
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
            '3': false
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

  describe('deviceAccessHook', function() {
    beforeEach(function() {
      nextFnSpy = sinon.spy();
      gdprDataHandlerStub = sinon.stub(gdprDataHandler, 'getConsentData');
      logWarnSpy = sinon.spy(utils, 'logWarn');
    });
    afterEach(function() {
      config.resetConfig();
      gdprDataHandler.getConsentData.restore();
      logWarnSpy.restore();
    });
    it('should not allow device access when device access flag is set to false', function() {
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
      expect(nextFnSpy.calledWith(undefined, result));
    });

    it('should only check for consent for vendor exceptions when enforcePurpose and enforceVendor are false', function() {
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
      consentData.apiVersion = 2;
      gdprDataHandlerStub.returns(consentData);

      deviceAccessHook(nextFnSpy, 1, 'appnexus');
      deviceAccessHook(nextFnSpy, 5, 'rubicon');
      expect(logWarnSpy.callCount).to.equal(0);
    });

    it('should check consent for all vendors when enforcePurpose and enforceVendor are true', function() {
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
      consentData.apiVersion = 2;
      gdprDataHandlerStub.returns(consentData);

      deviceAccessHook(nextFnSpy, 1, 'appnexus');
      deviceAccessHook(nextFnSpy, 3, 'rubicon');
      expect(logWarnSpy.callCount).to.equal(1);
    });
  });

  describe('userSyncHook', function() {
    let curBidderStub;
    let adapterManagerStub;

    beforeEach(function() {
      gdprDataHandlerStub = sinon.stub(gdprDataHandler, 'getConsentData');
      logWarnSpy = sinon.spy(utils, 'logWarn');
      curBidderStub = sinon.stub(config, 'getCurrentBidder');
      adapterManagerStub = sinon.stub(adapterManager, 'getBidAdapter');
      nextFnSpy = sinon.spy();
    });

    afterEach(function() {
      config.getCurrentBidder.restore();
      config.resetConfig();
      gdprDataHandler.getConsentData.restore();
      adapterManager.getBidAdapter.restore();
      logWarnSpy.restore();
    });

    it('should allow bidder to do user sync if consent is true', function() {
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
      consentData.apiVersion = 2;
      gdprDataHandlerStub.returns(consentData);

      curBidderStub.returns('sampleBidder1');
      adapterManagerStub.withArgs('sampleBidder1').returns({
        getSpec: function() {
          return {
            'gvlid': 1
          }
        }
      });
      userSyncHook(nextFnSpy);

      curBidderStub.returns('sampleBidder2');
      adapterManagerStub.withArgs('sampleBidder2').returns({
        getSpec: function() {
          return {
            'gvlid': 3
          }
        }
      });
      userSyncHook(nextFnSpy);
      expect(nextFnSpy.calledTwice).to.equal(true);
    });

    it('should not allow bidder to do user sync if user has denied consent', function() {
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
      gdprDataHandlerStub.returns(consentData);

      curBidderStub.returns('sampleBidder1');
      adapterManagerStub.withArgs('sampleBidder1').returns({
        getSpec: function() {
          return {
            'gvlid': 1
          }
        }
      });
      userSyncHook(nextFnSpy);

      curBidderStub.returns('sampleBidder2');
      adapterManagerStub.withArgs('sampleBidder2').returns({
        getSpec: function() {
          return {
            'gvlid': 3
          }
        }
      });
      userSyncHook(nextFnSpy);
      expect(nextFnSpy.calledOnce).to.equal(true);
      expect(logWarnSpy.callCount).to.equal(1);
    });
  });

  describe('userIdHook', function() {
    beforeEach(function() {

    });
    afterEach(function(){

    })
    it('should', function() {

    });
  });
});
