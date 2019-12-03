import {
  setConsentConfig,
  requestBidsHook,
  resetConsentData,
  consentAPI,
  consentTimeout,
  allowAuction
} from 'modules/consentManagementUSP';
import * as utils from 'src/utils';
import { config } from 'src/config';
import { uspDataHandler } from 'src/adapterManager';

let assert = require('chai').assert;
let expect = require('chai').expect;

describe.only('consentManagement', function () {
  describe('setConsentConfig tests:', function () {
    describe('empty setConsentConfig value', function () {
      beforeEach(function () {
        sinon.stub(utils, 'logInfo');
      });

      afterEach(function () {
        utils.logInfo.restore();
        config.resetConfig();
      });

      it('should not run if no config', function () {
        setConsentConfig({});
        expect(consentAPI).to.be.undefined;
        expect(consentTimeout).to.be.undefined;
        sinon.assert.callCount(utils.logWarn, 1);
      });

      it('should use system default values', function () {
        setConsentConfig({usp: {}});
        expect(consentAPI).to.be.equal('iab');
        expect(consentTimeout).to.be.equal(50);
        sinon.assert.callCount(utils.logInfo, 3);
      });
    });

    describe('valid setConsentConfig value', function () {
      afterEach(function () {
        config.resetConfig();
        $$PREBID_GLOBAL$$.requestBids.removeAll();
      });
      it('results in all user settings overriding system defaults', function () {
        let allConfig = {
          usp: {
            cmpApi: 'daa',
            timeout: 7500
          }
        };

        setConsentConfig(allConfig);
        expect(consentAPI).to.be.equal('daa');
        expect(consentTimeout).to.be.equal(7500);
      });
    });
  });

  describe('requestBidsHook tests:', function () {
    let goodConfig = {
      cmpApi: 'iab',
      timeout: 7500
    };
    let noConfig = {};

    let didHookReturn;

    afterEach(function () {
      uspDataHandler.consentData = null;
      resetConsentData();
    });

    describe('error checks:', function () {
      beforeEach(function () {
        didHookReturn = false;
        sinon.stub(utils, 'logWarn');
        sinon.stub(utils, 'logError');
      });

      afterEach(function () {
        utils.logWarn.restore();
        utils.logError.restore();
        config.resetConfig();
        $$PREBID_GLOBAL$$.requestBids.removeAll();
        resetConsentData();
      });

      it('should throw a warning and return to hooked function when an unknown USPAPI framework ID is used', function () {
        let badCMPConfig = { usp: { cmpApi: 'bad' } };
        setConsentConfig(badCMPConfig);
        expect(consentAPI).to.be.equal(badCMPConfig.cmpApi);
        requestBidsHook(() => { didHookReturn = true; }, {});
        let consent = uspDataHandler.getConsentData();
        sinon.assert.calledOnce(utils.logWarn);
        expect(didHookReturn).to.be.true;
        expect(consent).to.be.null;
      });

      it('should throw proper errors when USP config is not found', function () {
        setConsentConfig(noConfig);
        requestBidsHook(() => { didHookReturn = true; }, {});
        let consent = uspDataHandler.getConsentData();
        // throw 2 errors; one for no bidsBackHandler and for CMP not being found (this is an error due to gdpr config)
        sinon.assert.calledTwice(utils.logError);
        expect(didHookReturn).to.be.false;
        expect(consent).to.be.null;
      });
    });

    describe('already known consentData:', function () {
      let uspStub = sinon.stub();

      beforeEach(function () {
        didHookReturn = false;
        window.__uspapi = function() {};
      });

      afterEach(function () {
        config.resetConfig();
        $$PREBID_GLOBAL$$.requestBids.removeAll();
        uspStub.restore();
        delete window.__uspapi;
        resetConsentData();
      });

      it('should bypass CMP and simply use previously stored consentData', function () {
        let testConsentData = {
          usPrivacy: '1YY'
        };

        uspStub = sinon.stub(window, '__uspapi').callsFake((...args) => {
          args[2](testConsentData);
        });

        setConsentConfig(goodConfig);
        requestBidsHook(() => {}, {});
        uspStub.restore();

        // reset the stub to ensure it wasn't called during the second round of calls
        uspStub = sinon.stub(window, '__uspapi').callsFake((...args) => {
          args[2](testConsentData);
        });

        requestBidsHook(() => { didHookReturn = true; }, {});

        let consent = uspDataHandler.getConsentData();
        expect(didHookReturn).to.be.true;
        expect(consent.consentString).to.equal(testConsentData.consentData);
        sinon.assert.notCalled(uspStub);
      });
    });

    describe('USPAPI workflow for iframed page', function () {
      let ifr = null;
      let stringifyResponse = false;

      beforeEach(function () {
        sinon.stub(utils, 'logError');
        sinon.stub(utils, 'logWarn');
        ifr = createIFrameMarker();
        window.addEventListener('message', uspapiMessageHandler, false);
      });

      afterEach(function () {
        config.resetConfig();
        $$PREBID_GLOBAL$$.requestBids.removeAll();
        delete window.__uspapi;
        utils.logError.restore();
        utils.logWarn.restore();
        resetConsentData();
        document.body.removeChild(ifr);
        window.removeEventListener('message', uspapiMessageHandler);
      });

      function createIFrameMarker() {
        var ifr = document.createElement('iframe');
        ifr.width = 0;
        ifr.height = 0;
        ifr.name = '__uspapiLocator';
        document.body.appendChild(ifr);
        return ifr;
      }

      function uspapiMessageHandler(event) {
        if (event && event.data) {
          var data = event.data;
          if (data.__uspapiCall) {
            var callId = data.__uspapiCall.callId;
            var returnValue = null;
            var response = {
              __uspapiReturn: {
                callId,
                returnValue: { usPrivacy: '1YY' },
                success: true
              }
            };
            event.source.postMessage(stringifyResponse ? JSON.stringify(response) : response, '*');
          }
        }
      }

      // Run tests with JSON response and String response
      // from CMP window postMessage listener.
      testIFramedPage('with/JSON response', false);
      testIFramedPage('with/String response', true);

      function testIFramedPage(testName, messageFormatString) {
        it(`should return the consent string from a postmessage + addEventListener response - ${testName}`, (done) => {
          stringifyResponse = messageFormatString;
          setConsentConfig(goodConfig);
          requestBidsHook(() => {
            let consent = uspDataHandler.getConsentData();
            sinon.assert.notCalled(utils.logWarn);
            sinon.assert.notCalled(utils.logError);
            expect(consent.usPrivacy).to.equal('1YY');
            done();
          }, {});
        });
      }
    });

    describe('USPAPI workflow for normal pages:', function () {
      let uspapiStub = sinon.stub();

      beforeEach(function () {
        didHookReturn = false;
        sinon.stub(utils, 'logError');
        sinon.stub(utils, 'logWarn');
        window.__uspapi = function() {};
      });

      afterEach(function () {
        config.resetConfig();
        $$PREBID_GLOBAL$$.requestBids.removeAll();
        uspapiStub.restore();
        utils.logError.restore();
        utils.logWarn.restore();
        delete window.__uspapi;
        resetConsentData();
      });

      it('performs lookup check and stores consentData for a valid existing user', function () {
        let testConsentData = {
          usPrivacy: '1YY'
        };

        uspapiStub = sinon.stub(window, '__uspapi').callsFake((...args) => {
          args[2](testConsentData);
        });

        setConsentConfig(goodConfig);

        requestBidsHook(() => {
          didHookReturn = true;
        }, {});

        let consent = uspDataHandler.getConsentData();

        sinon.assert.notCalled(utils.logWarn);
        sinon.assert.notCalled(utils.logError);

        expect(didHookReturn).to.be.true;
        expect(consent.usPrivacy).to.equal(testConsentData.usPrivacy);
      });
    });
  });
});
