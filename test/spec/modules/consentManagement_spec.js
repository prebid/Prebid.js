import {setConfig, requestBidsHook, resetConsentId, userCMP, consentId, consentTimeout, lookUpFailureChoice} from 'modules/consentManagement';
import * as utils from 'src/utils';
import { config } from 'src/config';

let assert = require('chai').assert;
let expect = require('chai').expect;

describe('consentManagement', function () {
  // check config gets ingested properly (note check for warning)
  describe('setConfig tests:', () => {
    describe('empty setConfig value', () => {
      beforeEach(() => {
        sinon.stub(utils, 'logInfo');
      });

      afterEach(() => {
        utils.logInfo.restore();
        config.resetConfig();
      });

      it('should use system default values', () => {
        setConfig({});
        expect(userCMP).to.be.equal('iab');
        expect(consentTimeout).to.be.equal(5000);
        expect(lookUpFailureChoice).to.be.equal('proceed');
        sinon.assert.calledThrice(utils.logInfo);
      });
    });

    describe('invalid lookUpFailureResolution value in setConfig', () => {
      beforeEach(() => {
        sinon.stub(utils, 'logWarn');
      });

      afterEach(() => {
        utils.logWarn.restore();
        config.resetConfig();
      });

      it('should throw Warning message when invalid lookUpFaliureResolution value was used', () => {
        let badConfig = {
          lookUpFailureResolution: 'bad'
        };

        setConfig(badConfig);
        sinon.assert.calledOnce(utils.logWarn);
        expect(lookUpFailureChoice).to.be.equal('proceed');
      });
    });

    describe('valid setConfig value', () => {
      afterEach(() => {
        config.resetConfig();
        $$PREBID_GLOBAL$$.requestBids.removeHook(requestBidsHook);
      });
      it('results in all user settings overriding system defaults', () => {
        let allConfig = {
          cmp: 'iab',
          waitForConsentTimeout: 750,
          lookUpFailureResolution: 'cancel'
        };

        setConfig(allConfig);
        expect(userCMP).to.be.equal('iab');
        expect(consentTimeout).to.be.equal(750);
        expect(lookUpFailureChoice).to.be.equal('cancel');
      });
    });
  });

  // requestBidsHook method
  describe('requestBidsHook tests:', () => {
    let adUnits = [{
      code: 'div-gpt-ad-1460505748561-0',
      sizes: [[300, 250], [300, 600]],
      bids: [{
        bidder: 'appnexusAst',
        params: {
          placementId: '10433394'
        }
      }]
    }];

    let goodConfigWithCancel = {
      cmp: 'iab',
      waitForConsentTimeout: 100,
      lookUpFailureResolution: 'cancel'
    };

    let goodConfigWithProceed = {
      cmp: 'iab',
      waitForConsentTimeout: 750,
      lookUpFailureResolution: 'proceed'
    };

    let didHookReturn;
    let retAdUnits = [];

    describe('error checks:', () => {
      // unknown framework id provided - check for warning and returns extra call
      describe('unknown CMP framework ID', () => {
        beforeEach(() => {
          sinon.stub(utils, 'logWarn');
        });

        afterEach(() => {
          utils.logWarn.restore();
          config.resetConfig();
          $$PREBID_GLOBAL$$.requestBids.removeHook(requestBidsHook);
        });

        it('should return Warning message and return to hooked function', () => {
          let badCMPConfig = {
            cmp: 'bad'
          };
          setConfig(badCMPConfig);
          expect(userCMP).to.be.equal(badCMPConfig.cmp);

          didHookReturn = false;
          let adUnits1 = utils.deepClone(adUnits);

          requestBidsHook({adUnits: adUnits1}, (config) => {
            didHookReturn = true;
            retAdUnits = config.adUnits;
          });

          sinon.assert.calledOnce(utils.logWarn);
          expect(didHookReturn).to.be.true;
          assert.deepEqual(retAdUnits, adUnits);
        });
      });

      // CMP framework not present - check for warning and returns extra call
      describe('IAB CMP framework not present', () => {
        beforeEach(() => {
          sinon.stub(utils, 'logWarn');
        });

        afterEach(() => {
          utils.logWarn.restore();
          config.resetConfig();
          $$PREBID_GLOBAL$$.requestBids.removeHook(requestBidsHook);
        });

        it('should return a Warning message and return to hooked function', () => {
          setConfig(goodConfigWithProceed);

          didHookReturn = false;
          let adUnits1 = utils.deepClone(adUnits);

          requestBidsHook({adUnits: adUnits1}, (config) => {
            didHookReturn = true;
            retAdUnits = config.adUnits;
          });

          sinon.assert.calledOnce(utils.logWarn);
          expect(didHookReturn).to.be.true;
          assert.deepEqual(retAdUnits, adUnits);
        });
      });
    });

    describe('already known consentId', () => {
      let cmpStub = sinon.stub();

      beforeEach(() => {
        didHookReturn = false;
        window.__cmp = function() {};
      });

      afterEach(() => {
        config.resetConfig();
        $$PREBID_GLOBAL$$.requestBids.removeHook(requestBidsHook);
        cmpStub.restore();
      });

      it('should bypass CMP and simply apply adUnit changes', () => {
        let testCMP = 'xyz';

        cmpStub = sinon.stub(window, '__cmp').callsFake((...args) => {
          args[2](testCMP);
        });
        setConfig(goodConfigWithProceed);

        let adUnits1 = utils.deepClone(adUnits);
        requestBidsHook({adUnits: adUnits1}, (config) => {});
        cmpStub.restore();

        // reset the stub to ensure it wasn't called during the second round of calls
        cmpStub = sinon.stub(window, '__cmp').callsFake((...args) => {
          args[2](testCMP);
        });
        let adUnits2 = utils.deepClone(adUnits);
        requestBidsHook({adUnits: adUnits2}, (config) => {
          didHookReturn = true;
          retAdUnits = config.adUnits;
        });

        expect(didHookReturn).to.be.true;
        expect(retAdUnits[0].gdprConsent.consentString).to.equal(testCMP);
        expect(retAdUnits[0].gdprConsent.consentRequired).to.be.true;
        sinon.assert.notCalled(cmpStub);
      });
    });

    describe('CMP workflow', () => {
      let firstpass;
      let cmpStub = sinon.stub();
      let clock = sinon.useFakeTimers();

      beforeEach(() => {
        firstpass = true;
        didHookReturn = false;
        retAdUnits = [];
        resetConsentId();
        sinon.stub(utils, 'logError');
        sinon.stub(utils, 'logWarn');
        window.__cmp = function() {};
      });

      afterEach(() => {
        config.resetConfig();
        $$PREBID_GLOBAL$$.requestBids.removeHook(requestBidsHook);
        cmpStub.restore();
        utils.logError.restore();
        utils.logWarn.restore();
        clock.restore();
        delete window.__cmp;
      });

      it('performs extra lookup checks and updates adUnits for a valid new user', () => {
        let testCMP = null;

        cmpStub = sinon.stub(window, '__cmp').callsFake((...args) => {
          // simulates user generating a valid consentId string in between second/third callbacks
          if (firstpass) {
            firstpass = false;
          } else {
            testCMP = 'abc';
          }
          args[2](testCMP);
        });

        setConfig(goodConfigWithProceed);

        let adUnits1 = utils.deepClone(adUnits);
        requestBidsHook({adUnits: adUnits1}, (config) => {
          didHookReturn = true;
          retAdUnits = config.adUnits;
        });

        sinon.assert.notCalled(utils.logError);
        sinon.assert.notCalled(utils.logWarn);
        expect(didHookReturn).to.be.true;
        expect(retAdUnits[0].gdprConsent.consentString).to.equal(testCMP);
        expect(retAdUnits[0].gdprConsent.consentRequired).to.be.true;
      });

      it('performs lookup check and updates adUnits for a valid existing user', () => {
        let testCMP = 'BOJy+UqOJy+UqABAB+AAAAAZ+A==';
        cmpStub = sinon.stub(window, '__cmp').callsFake((...args) => {
          args[2](testCMP);
        });

        setConfig(goodConfigWithProceed);

        let adUnits1 = utils.deepClone(adUnits);
        requestBidsHook({adUnits: adUnits1}, (config) => {
          didHookReturn = true;
          retAdUnits = config.adUnits;
        });

        sinon.assert.notCalled(utils.logWarn);
        sinon.assert.notCalled(utils.logError);
        expect(didHookReturn).to.be.true;
        expect(retAdUnits[0].gdprConsent.consentString).to.equal('BOJy+UqOJy+UqABAB+AAAAAZ+A==');
        expect(retAdUnits[0].gdprConsent.consentRequired).to.be.true;
      });

      it('throws an error when postLookup check failed while config used cancel setting', () => {
        let testCMP = null;

        cmpStub = sinon.stub(window, '__cmp').callsFake((...args) => {
          args[2](testCMP);
        });

        setConfig(goodConfigWithCancel);
        let adUnits1 = utils.deepClone(adUnits);
        requestBidsHook({adUnits: adUnits1}, (config) => {
          didHookReturn = true;
          retAdUnits = config.adUnits;
        });
        sinon.assert.calledOnce(utils.logError);
        expect(didHookReturn).to.be.false;
        expect(retAdUnits).to.be.an('array').that.is.empty;
        assert.deepEqual(adUnits1, adUnits);
      });

      it('throws a warning + modifies adunits + calls callback when postLookup check failed while config used proceed setting', () => {
        let testCMP = null;

        cmpStub = sinon.stub(window, '__cmp').callsFake((...args) => {
          args[2](testCMP);
        });

        setConfig(goodConfigWithProceed);
        let adUnits1 = utils.deepClone(adUnits);
        requestBidsHook({adUnits: adUnits1}, (config) => {
          didHookReturn = true;
          retAdUnits = config.adUnits;
        });
        sinon.assert.calledOnce(utils.logWarn);
        expect(didHookReturn).to.be.true;
        expect(retAdUnits[0].gdprConsent.consentString).to.be.undefined;
        expect(retAdUnits[0].gdprConsent.consentRequired).to.be.true;
      });
    });
  });
});
