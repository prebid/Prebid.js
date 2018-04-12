import {setConfig, requestBidsHook, resetConsentData, userCMP, consentTimeout, allowAuction} from 'modules/consentManagement';
import {gdprDataHandler} from 'src/adaptermanager';
import * as utils from 'src/utils';
import { config } from 'src/config';

let assert = require('chai').assert;
let expect = require('chai').expect;

describe('consentManagement', function () {
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
        expect(consentTimeout).to.be.equal(10000);
        expect(allowAuction).to.be.true;
        sinon.assert.callCount(utils.logInfo, 3);
      });
    });

    describe('valid setConfig value', () => {
      afterEach(() => {
        config.resetConfig();
        $$PREBID_GLOBAL$$.requestBids.removeHook(requestBidsHook);
      });
      it('results in all user settings overriding system defaults', () => {
        let allConfig = {
          cmpApi: 'iab',
          consentRequired: false,
          timeout: 7500,
          allowAuctionWithoutConsent: false
        };

        setConfig(allConfig);
        expect(userCMP).to.be.equal('iab');
        expect(consentTimeout).to.be.equal(7500);
        expect(allowAuction).to.be.false;
      });
    });
  });

  describe('requestBidsHook tests:', () => {
    let goodConfigWithCancelAuction = {
      cmpApi: 'iab',
      timeout: 7500,
      allowAuctionWithoutConsent: false
    };

    let goodConfigWithAllowAuction = {
      cmpApi: 'iab',
      consentRequired: true,
      timeout: 7500,
      allowAuctionWithoutConsent: true
    };

    let didHookReturn;

    afterEach(() => {
      gdprDataHandler.consentData = null;
      resetConsentData();
    });

    describe('error checks:', () => {
      describe('unknown CMP framework ID:', () => {
        beforeEach(() => {
          sinon.stub(utils, 'logWarn');
        });

        afterEach(() => {
          utils.logWarn.restore();
          config.resetConfig();
          $$PREBID_GLOBAL$$.requestBids.removeHook(requestBidsHook);
          gdprDataHandler.consentData = null;
        });

        it('should return Warning message and return to hooked function', () => {
          let badCMPConfig = {
            cmpApi: 'bad'
          };
          setConfig(badCMPConfig);
          expect(userCMP).to.be.equal(badCMPConfig.cmpApi);

          didHookReturn = false;

          requestBidsHook({}, () => {
            didHookReturn = true;
          });
          let consent = gdprDataHandler.getConsentData();
          sinon.assert.calledOnce(utils.logWarn);
          expect(didHookReturn).to.be.true;
          expect(consent).to.be.null;
        });
      });

      describe('IAB CMP framework not present:', () => {
        beforeEach(() => {
          sinon.stub(utils, 'logWarn');
        });

        afterEach(() => {
          utils.logWarn.restore();
          config.resetConfig();
          $$PREBID_GLOBAL$$.requestBids.removeHook(requestBidsHook);
        });

        it('should return a Warning message and return to hooked function', () => {
          setConfig(goodConfigWithAllowAuction);

          didHookReturn = false;

          requestBidsHook({}, () => {
            didHookReturn = true;
          });
          let consent = gdprDataHandler.getConsentData();

          sinon.assert.calledOnce(utils.logWarn);
          expect(didHookReturn).to.be.true;
          expect(consent.consentString).to.be.undefined;
          expect(consent.consentRequired).to.be.true;
        });
      });
    });

    describe('already known consentData:', () => {
      let cmpStub = sinon.stub();

      beforeEach(() => {
        didHookReturn = false;
        window.__cmp = function() {};
      });

      afterEach(() => {
        config.resetConfig();
        $$PREBID_GLOBAL$$.requestBids.removeHook(requestBidsHook);
        cmpStub.restore();
        delete window.__cmp;
        gdprDataHandler.consentData = null;
      });

      it('should bypass CMP and simply use previously stored consentData', () => {
        let testConsentString = 'xyz';

        cmpStub = sinon.stub(window, '__cmp').callsFake((...args) => {
          args[2](testConsentString);
        });
        setConfig(goodConfigWithAllowAuction);

        requestBidsHook({}, () => {});
        cmpStub.restore();

        // reset the stub to ensure it wasn't called during the second round of calls
        cmpStub = sinon.stub(window, '__cmp').callsFake((...args) => {
          args[2](testConsentString);
        });

        requestBidsHook({}, () => {
          didHookReturn = true;
        });
        let consent = gdprDataHandler.getConsentData();

        expect(didHookReturn).to.be.true;
        expect(consent.consentString).to.equal(testConsentString);
        expect(consent.consentRequired).to.be.true;
        sinon.assert.notCalled(cmpStub);
      });
    });

    describe('CMP workflow:', () => {
      let cmpStub = sinon.stub();

      beforeEach(() => {
        didHookReturn = false;
        resetConsentData();
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
        delete window.__cmp;
        gdprDataHandler.consentData = null;
      });

      it('performs extra lookup checks and stores consentData for a valid new user', () => {
        let testConsentString = null;
        let firstpass = true;

        cmpStub = sinon.stub(window, '__cmp').callsFake((...args) => {
          // simulates user generating a valid consentId string in between second/third callbacks
          if (firstpass) {
            firstpass = false;
          } else {
            testConsentString = 'abc';
          }
          args[2](testConsentString);
        });

        setConfig(goodConfigWithAllowAuction);

        requestBidsHook({}, () => {
          didHookReturn = true;
        });
        let consent = gdprDataHandler.getConsentData();

        sinon.assert.notCalled(utils.logError);
        sinon.assert.notCalled(utils.logWarn);
        expect(didHookReturn).to.be.true;
        expect(consent.consentString).to.equal(testConsentString);
        expect(consent.consentRequired).to.be.true;
      });

      it('performs lookup check and stores consentData for a valid existing user', () => {
        let testConsentString = 'BOJy+UqOJy+UqABAB+AAAAAZ+A==';
        cmpStub = sinon.stub(window, '__cmp').callsFake((...args) => {
          args[2](testConsentString);
        });

        setConfig(goodConfigWithAllowAuction);

        requestBidsHook({}, () => {
          didHookReturn = true;
        });
        let consent = gdprDataHandler.getConsentData();

        sinon.assert.notCalled(utils.logWarn);
        sinon.assert.notCalled(utils.logError);
        expect(didHookReturn).to.be.true;
        expect(consent.consentString).to.equal(testConsentString);
        expect(consent.consentRequired).to.be.true;
      });

      it('throws an error when processCmpData check failed while config had allowAuction set to false', () => {
        let testConsentString = null;

        cmpStub = sinon.stub(window, '__cmp').callsFake((...args) => {
          args[2](testConsentString);
        });

        setConfig(goodConfigWithCancelAuction);

        requestBidsHook({}, () => {
          didHookReturn = true;
        });
        let consent = gdprDataHandler.getConsentData();

        sinon.assert.calledOnce(utils.logError);
        expect(didHookReturn).to.be.false;
        expect(consent).to.be.null;
      });

      it('throws a warning + stores consentData + calls callback when processCmpData check failed while config had allowAuction set to true', () => {
        let testConsentString = null;

        cmpStub = sinon.stub(window, '__cmp').callsFake((...args) => {
          args[2](testConsentString);
        });

        setConfig(goodConfigWithAllowAuction);

        requestBidsHook({}, () => {
          didHookReturn = true;
        });
        let consent = gdprDataHandler.getConsentData();

        sinon.assert.calledOnce(utils.logWarn);
        expect(didHookReturn).to.be.true;
        expect(consent.consentString).to.be.undefined;
        expect(consent.consentRequired).to.be.true;
      });
    });
  });
});
