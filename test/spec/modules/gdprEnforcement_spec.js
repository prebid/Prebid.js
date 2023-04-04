import {
  deviceAccessHook,
  enableAnalyticsHook,
  enforcementRules,
  getGvlid,
  getGvlidFromAnalyticsAdapter,
  makeBidRequestsHook,
  purpose1Rule,
  purpose2Rule,
  setEnforcementConfig,
  STRICT_STORAGE_ENFORCEMENT,
  userIdHook,
  userSyncHook,
  validateRules
} from 'modules/gdprEnforcement.js';
import {config} from 'src/config.js';
import adapterManager, {gdprDataHandler} from 'src/adapterManager.js';
import * as utils from 'src/utils.js';
import {
  MODULE_TYPE_ANALYTICS,
  MODULE_TYPE_BIDDER,
  MODULE_TYPE_CORE,
  MODULE_TYPE_UID
} from '../../../src/activities/modules.js';
import * as events from 'src/events.js';
import 'modules/appnexusBidAdapter.js'; // some tests expect this to be in the adapter registry
import 'src/prebid.js';
import {hook} from '../../../src/hook.js';
import {GDPR_GVLIDS, VENDORLESS_GVLID} from '../../../src/consentHandler.js';
import {validateStorageEnforcement} from '../../../src/storageManager.js';

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
  let gvlids;

  before(() => {
    hook.ready();
  });

  after(function () {
    validateStorageEnforcement.getHooks({ hook: deviceAccessHook }).remove();
    $$PREBID_GLOBAL$$.requestBids.getHooks().remove();
    adapterManager.makeBidRequests.getHooks({ hook: makeBidRequestsHook }).remove();
  })

  beforeEach(() => {
    gvlids = {};
    sinon.stub(GDPR_GVLIDS, 'get').callsFake((name) => ({gvlid: gvlids[name], modules: {}}));
  });

  afterEach(() => {
    GDPR_GVLIDS.get.restore();
  });

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
      let consentData = {}
      consentData.vendorData = staticConfig.consentData.getTCData;
      consentData.gdprApplies = true;
      consentData.apiVersion = 2;
      gdprDataHandlerStub.returns(consentData);

      deviceAccessHook(nextFnSpy, MODULE_TYPE_BIDDER, 'appnexus');
      deviceAccessHook(nextFnSpy, MODULE_TYPE_BIDDER, 'rubicon');
      expect(logWarnSpy.callCount).to.equal(0);
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
      let consentData = {}
      consentData.vendorData = staticConfig.consentData.getTCData;
      consentData.gdprApplies = true;
      consentData.apiVersion = 2;
      gdprDataHandlerStub.returns(consentData);

      deviceAccessHook(nextFnSpy, MODULE_TYPE_BIDDER, 'appnexus');
      deviceAccessHook(nextFnSpy, MODULE_TYPE_BIDDER, 'rubicon');
      expect(logWarnSpy.callCount).to.equal(1);
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
      let consentData = {}
      consentData.vendorData = staticConfig.consentData.getTCData;
      consentData.gdprApplies = false;
      consentData.apiVersion = 2;
      gdprDataHandlerStub.returns(consentData);

      deviceAccessHook(nextFnSpy, MODULE_TYPE_BIDDER, 'appnexus');
      expect(nextFnSpy.calledOnce).to.equal(true);
      let result = {
        hasEnforcementHook: true,
        valid: true
      }
      sinon.assert.calledWith(nextFnSpy, MODULE_TYPE_BIDDER, 'appnexus', result);
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
      let consentData = {}
      consentData.vendorData = staticConfig.consentData.getTCData;
      consentData.gdprApplies = true;
      consentData.apiVersion = 2;
      gdprDataHandlerStub.returns(consentData);

      deviceAccessHook(nextFnSpy, MODULE_TYPE_BIDDER, 'appnexus');
      expect(nextFnSpy.calledOnce).to.equal(true);
      let result = {
        hasEnforcementHook: true,
        valid: true
      }
      sinon.assert.calledWith(nextFnSpy, MODULE_TYPE_BIDDER, 'appnexus', result);
      config.resetConfig();
    });

    it('should use gvl id of alias and not of parent', function() {
      let curBidderStub = sinon.stub(config, 'getCurrentBidder');
      curBidderStub.returns('appnexus-alias');
      adapterManager.aliasBidAdapter('appnexus', 'appnexus-alias');
      config.setConfig({
        'gvlMapping': {
          'appnexus-alias': 4
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
      let consentData = {}
      consentData.vendorData = staticConfig.consentData.getTCData;
      consentData.gdprApplies = true;
      consentData.apiVersion = 2;
      gdprDataHandlerStub.returns(consentData);

      deviceAccessHook(nextFnSpy, MODULE_TYPE_BIDDER, 'appnexus');
      expect(nextFnSpy.calledOnce).to.equal(true);
      let result = {
        hasEnforcementHook: true,
        valid: true
      }
      sinon.assert.calledWith(nextFnSpy, MODULE_TYPE_BIDDER, 'appnexus', result);
      config.resetConfig();
      curBidderStub.restore();
    });

    it(`should not enforce consent for vendorless modules if ${STRICT_STORAGE_ENFORCEMENT} is not set`, () => {
      setEnforcementConfig({});
      let consentData = {
        vendorData: staticConfig.consentData.getTCData,
        gdprApplies: true
      }
      gdprDataHandlerStub.returns(consentData);
      const validate = sinon.stub().callsFake(() => false);
      deviceAccessHook(nextFnSpy, MODULE_TYPE_CORE, 'mockModule', undefined, {validate});
      sinon.assert.callCount(validate, 0);
      sinon.assert.calledWith(nextFnSpy, MODULE_TYPE_CORE, 'mockModule', {hasEnforcementHook: true, valid: true});
    })
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
      gvlids.sampleBidder1 = 1;
      userSyncHook(nextFnSpy);

      curBidderStub.returns('sampleBidder2');
      gvlids.sampleBidder2 = 3;
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
      gvlids.sampleBidder1 = 1;
      userSyncHook(nextFnSpy);

      curBidderStub.returns('sampleBidder2');
      gvlids.sampleBidder2 = 3;
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
      gvlids.sampleBidder1 = 1;
      userSyncHook(nextFnSpy);

      curBidderStub.returns('sampleBidder2');
      gvlids.sampleBidder2 = 3;
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
      gvlids.sampleUserId = 1;
      userIdHook(nextFnSpy, submodules, consentData);
      // Should pass back hasValidated flag since version 2
      const args = nextFnSpy.getCalls()[0].args;
      expect(args[1].hasValidated).to.be.true;
      expect(nextFnSpy.calledOnce).to.equal(true);
      sinon.assert.calledWith(nextFnSpy, submodules, { ...consentData, hasValidated: true });
    });

    it('should allow userId module if gdpr not in scope', function () {
      let submodules = [{
        submodule: {
          gvlid: 1,
          name: 'sampleUserId'
        }
      }];
      gvlids.sampleUserId = 1;
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
      Object.assign(gvlids, {
        sampleUserId: 1,
        sampleUserId1: 3
      });
      userIdHook(nextFnSpy, submodules, consentData);
      expect(logWarnSpy.callCount).to.equal(1);
      let expectedSubmodules = [{
        submodule: {
          gvlid: 1,
          name: 'sampleUserId'
        }
      }]
      sinon.assert.calledWith(nextFnSpy, expectedSubmodules, { ...consentData, hasValidated: true });
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
        bidder: 'bidder_2' // doesn't have consent, but liTransparency is true. Bidder remains active.
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
      nextFnSpy = sandbox.spy();
      emitEventSpy = sandbox.spy(events, 'emit');
    });
    afterEach(function () {
      config.resetConfig();
      sandbox.restore();
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
      const consentData = {};
      consentData.vendorData = staticConfig.consentData.getTCData;
      consentData.apiVersion = 2;
      consentData.gdprApplies = true;

      gdprDataHandlerStub.returns(consentData);
      Object.assign(gvlids, {
        bidder_1: 4,
        bidder_2: 5,
      });
      makeBidRequestsHook(nextFnSpy, MOCK_AD_UNITS, []);

      // Assertions
      expect(nextFnSpy.calledOnce).to.equal(true);
      sinon.assert.calledWith(nextFnSpy, [{
        code: 'ad-unit-1',
        mediaTypes: {},
        bids: [
          sinon.match({ bidder: 'bidder_1' }),
          sinon.match({ bidder: 'bidder_2' })
        ]
      }, {
        code: 'ad-unit-2',
        mediaTypes: {},
        bids: [
          sinon.match({ bidder: 'bidder_2' }),
          sinon.match({ bidder: 'bidder_3' }) // should be allowed even though it's doesn't have a gvlId because liTransparency is established.
        ]
      }], []);
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
      const consentData = {};

      // set li for purpose 2 to false
      const newConsentData = utils.deepClone(staticConfig);
      newConsentData.consentData.getTCData.purpose.legitimateInterests['2'] = false;

      consentData.vendorData = newConsentData.consentData.getTCData;
      consentData.apiVersion = 2;
      consentData.gdprApplies = true;

      gdprDataHandlerStub.returns(consentData);
      Object.assign(gvlids, {
        bidder_1: 4,
        bidder_2: 5,
      })

      makeBidRequestsHook(nextFnSpy, MOCK_AD_UNITS, []);

      // Assertions
      expect(nextFnSpy.calledOnce).to.equal(true);
      sinon.assert.calledWith(nextFnSpy, [{
        code: 'ad-unit-1',
        mediaTypes: {},
        bids: [
          sinon.match({ bidder: 'bidder_1' }), // 'bidder_2' is not present because it doesn't have vendorConsent
        ]
      }, {
        code: 'ad-unit-2',
        mediaTypes: {},
        bids: [
          sinon.match({ bidder: 'bidder_3' }), // 'bidder_3' is allowed despite gvlId being undefined because it's part of vendorExceptions
        ]
      }], []);

      expect(logWarnSpy.calledOnce).to.equal(true);
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
    });
  });

  describe('enableAnalyticsHook', function () {
    let sandbox;
    let adapterManagerStub;

    const MOCK_ANALYTICS_ADAPTER_CONFIG = [{
      provider: 'analyticsAdapter_A',
      options: {}
    }, {
      provider: 'analyticsAdapter_B',
      options: {}
    }, {
      provider: 'analyticsAdapter_C',
      options: {}
    }];

    beforeEach(function () {
      sandbox = sinon.createSandbox();
      gdprDataHandlerStub = sandbox.stub(gdprDataHandler, 'getConsentData');
      adapterManagerStub = sandbox.stub(adapterManager, 'getAnalyticsAdapter');
      logWarnSpy = sandbox.spy(utils, 'logWarn');
      nextFnSpy = sandbox.spy();
    });

    afterEach(function() {
      config.resetConfig();
      sandbox.restore();
    });

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

      const consentData = {};
      consentData.vendorData = staticConfig.consentData.getTCData;
      consentData.apiVersion = 2;
      consentData.gdprApplies = true;

      gdprDataHandlerStub.returns(consentData);
      Object.assign(gvlids, {
        analyticsAdapter_A: 3,
        analyticsAdapter_B: 5,
        analyticsAdapter_C: 1
      });

      enableAnalyticsHook(nextFnSpy, MOCK_ANALYTICS_ADAPTER_CONFIG);

      // Assertions
      expect(nextFnSpy.calledOnce).to.equal(true);
      sinon.assert.calledWith(nextFnSpy, [{
        provider: 'analyticsAdapter_B',
        options: {}
      }, {
        provider: 'analyticsAdapter_C',
        options: {}
      }]);
      expect(logWarnSpy.calledOnce).to.equal(true);
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
        'measurement': 7
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
            expect(getGvlid(MODULE_TYPE_CORE, MOCK_MODULE, fallbackFn)).to.equal(VENDORLESS_GVLID);
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
