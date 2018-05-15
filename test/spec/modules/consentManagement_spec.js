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
        let testConsentData = {
          gdprApplies: true,
          metadata: 'xyz'
        };

        cmpStub = sinon.stub(window, '__cmp').callsFake((...args) => {
          args[2](testConsentData);
        });
        setConfig(goodConfigWithAllowAuction);
        requestBidsHook({}, () => {});
        cmpStub.restore();

        // reset the stub to ensure it wasn't called during the second round of calls
        cmpStub = sinon.stub(window, '__cmp').callsFake((...args) => {
          args[2](testConsentData);
        });

        requestBidsHook({}, () => {
          didHookReturn = true;
        });
        let consent = gdprDataHandler.getConsentData();

        expect(didHookReturn).to.be.true;
        expect(consent.consentString).to.equal(testConsentData.metadata);
        expect(consent.gdprApplies).to.be.true;
        sinon.assert.notCalled(cmpStub);
      });
    });

    describe('CMP workflow for iframed page', () => {
      let eventStub = sinon.stub();
      let cmpStub = sinon.stub();

      beforeEach(() => {
        didHookReturn = false;
        resetConsentData();
        window.__cmp = function() {};
        sinon.stub(utils, 'logError');
        sinon.stub(utils, 'logWarn');
      });

      afterEach(() => {
        config.resetConfig();
        $$PREBID_GLOBAL$$.requestBids.removeHook(requestBidsHook);
        eventStub.restore();
        cmpStub.restore();
        delete window.__cmp;
        utils.logError.restore();
        utils.logWarn.restore();
        gdprDataHandler.consentData = null;
      });

      it('should return the consent string from a postmessage + addEventListener response', () => {
        let testConsentData = {
          data: {
            __cmpReturn: {
              returnValue: {
                gdprApplies: true,
                metadata: 'BOJy+UqOJy+UqABAB+AAAAAZ+A=='
              }
            }
          }
        };
        eventStub = sinon.stub(window, 'addEventListener').callsFake((...args) => {
          args[1](testConsentData);
        });
        cmpStub = sinon.stub(window, '__cmp').callsFake((...args) => {
          args[2]({
            gdprApplies: true,
            metadata: 'BOJy+UqOJy+UqABAB+AAAAAZ+A=='
          });
        });

        setConfig(goodConfigWithAllowAuction);

        requestBidsHook({}, () => {
          didHookReturn = true;
        });
        let consent = gdprDataHandler.getConsentData();

        sinon.assert.notCalled(utils.logWarn);
        sinon.assert.notCalled(utils.logError);
        expect(didHookReturn).to.be.true;
        expect(consent.consentString).to.equal('BOJy+UqOJy+UqABAB+AAAAAZ+A==');
        expect(consent.gdprApplies).to.be.true;
      });
    });

    describe('CMP workflow for normal pages:', () => {
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

      it('performs lookup check and stores consentData for a valid existing user', () => {
        let testConsentData = {
          gdprApplies: true,
          metadata: 'BOJy+UqOJy+UqABAB+AAAAAZ+A=='
        };
        cmpStub = sinon.stub(window, '__cmp').callsFake((...args) => {
          args[2](testConsentData);
        });

        setConfig(goodConfigWithAllowAuction);

        requestBidsHook({}, () => {
          didHookReturn = true;
        });
        let consent = gdprDataHandler.getConsentData();

        sinon.assert.notCalled(utils.logWarn);
        sinon.assert.notCalled(utils.logError);
        expect(didHookReturn).to.be.true;
        expect(consent.consentString).to.equal(testConsentData.metadata);
        expect(consent.gdprApplies).to.be.true;
      });

      it('throws an error when processCmpData check failed while config had allowAuction set to false', () => {
        let testConsentData = null;

        cmpStub = sinon.stub(window, '__cmp').callsFake((...args) => {
          args[2](testConsentData);
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
        let testConsentData = null;

        cmpStub = sinon.stub(window, '__cmp').callsFake((...args) => {
          args[2](testConsentData);
        });

        setConfig(goodConfigWithAllowAuction);

        requestBidsHook({}, () => {
          didHookReturn = true;
        });
        let consent = gdprDataHandler.getConsentData();

        sinon.assert.calledOnce(utils.logWarn);
        expect(didHookReturn).to.be.true;
        expect(consent.consentString).to.be.undefined;
        expect(consent.gdprApplies).to.be.undefined;
      });
    });
  });
});
