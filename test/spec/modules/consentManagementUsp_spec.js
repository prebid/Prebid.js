import {
  setConsentConfig,
  requestBidsHook,
  resetConsentData,
  consentAPI,
  consentTimeout,
  staticConsentData
} from 'modules/consentManagementUsp.js';
import * as utils from 'src/utils.js';
import { config } from 'src/config.js';
import { uspDataHandler } from 'src/adapterManager.js';

let assert = require('chai').assert;
let expect = require('chai').expect;

function createIFrameMarker() {
  var ifr = document.createElement('iframe');
  ifr.width = 0;
  ifr.height = 0;
  ifr.name = '__uspapiLocator';
  document.body.appendChild(ifr);
  return ifr;
}

describe('consentManagement', function () {
  describe('setConsentConfig tests:', function () {
    describe('empty setConsentConfig value', function () {
      beforeEach(function () {
        sinon.stub(utils, 'logInfo');
        sinon.stub(utils, 'logWarn');
      });

      afterEach(function () {
        utils.logInfo.restore();
        utils.logWarn.restore();
        config.resetConfig();
        resetConsentData();
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

      it('should exit the consent manager if config.usp is not an object', function() {
        setConsentConfig({});
        expect(consentAPI).to.be.undefined;
        sinon.assert.calledOnce(utils.logWarn);
        sinon.assert.notCalled(utils.logInfo);
      });

      it('should exit the consent manager if only config.gdpr is an object', function() {
        setConsentConfig({ gdpr: { cmpApi: 'iab' } });
        expect(consentAPI).to.be.undefined;
        sinon.assert.calledOnce(utils.logWarn);
        sinon.assert.notCalled(utils.logInfo);
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

    describe('static consent string setConsentConfig value', () => {
      afterEach(() => {
        config.resetConfig();
        $$PREBID_GLOBAL$$.requestBids.removeAll();
      });
      it('results in user settings overriding system defaults', () => {
        let staticConfig = {
          usp: {
            cmpApi: 'static',
            timeout: 7500,
            consentData: {
              getUSPData: {
                uspString: '1YYY'
              }
            }
          }
        };

        setConsentConfig(staticConfig);
        expect(consentAPI).to.be.equal('static');
        expect(consentTimeout).to.be.equal(0); // should always return without a timeout when config is used
        expect(staticConsentData.usPrivacy).to.be.equal(staticConfig.usp.consentData.getUSPData.uspString);
      });
    });
  });

  describe('requestBidsHook tests:', function () {
    let goodConfig = {
      usp: {
        cmpApi: 'iab',
        timeout: 7500
      }
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
        expect(consentAPI).to.be.equal(badCMPConfig.usp.cmpApi);
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
        // throw 2 warnings; one for no bidsBackHandler and for CMP not being found (this is an error due to gdpr config)
        sinon.assert.calledTwice(utils.logWarn);
        expect(didHookReturn).to.be.true;
        expect(consent).to.be.null;
      });
    });

    describe('already known consentData:', function () {
      let uspStub = sinon.stub();
      let ifr = null;

      beforeEach(function () {
        didHookReturn = false;
        ifr = createIFrameMarker();
        window.__uspapi = function() {};
      });

      afterEach(function () {
        config.resetConfig();
        $$PREBID_GLOBAL$$.requestBids.removeAll();
        uspStub.restore();
        document.body.removeChild(ifr);
        delete window.__uspapi;
        resetConsentData();
      });

      it('should bypass CMP and simply use previously stored consentData', function () {
        let testConsentData = {
          uspString: '1YY'
        };

        uspStub = sinon.stub(window, '__uspapi').callsFake((...args) => {
          args[2](testConsentData, true);
        });

        setConsentConfig(goodConfig);
        requestBidsHook(() => {}, {});
        uspStub.restore();

        // reset the stub to ensure it wasn't called during the second round of calls
        uspStub = sinon.stub(window, '__uspapi').callsFake((...args) => {
          args[2](testConsentData, true);
        });

        requestBidsHook(() => { didHookReturn = true; }, {});

        let consent = uspDataHandler.getConsentData();
        expect(didHookReturn).to.be.true;
        expect(consent).to.equal(testConsentData.uspString);
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

      function uspapiMessageHandler(event) {
        if (event && event.data) {
          var data = event.data;
          if (data.__uspapiCall) {
            var callId = data.__uspapiCall.callId;
            var response = {
              __uspapiReturn: {
                callId,
                returnValue: { uspString: '1YY' },
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
      // testIFramedPage('with/String response', true);

      function testIFramedPage(testName, messageFormatString) {
        it(`should return the consent string from a postmessage + addEventListener response - ${testName}`, (done) => {
          stringifyResponse = messageFormatString;
          setConsentConfig(goodConfig);
          requestBidsHook(() => {
            let consent = uspDataHandler.getConsentData();
            sinon.assert.notCalled(utils.logWarn);
            sinon.assert.notCalled(utils.logError);
            expect(consent).to.equal('1YY');
            done();
          }, {});
        });
      }
    });

    describe('test without iframe locater', function() {
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

      it('Workflow for normal page withoout iframe locater', function() {
        let testConsentData = {
          uspString: '1NY'
        };

        uspapiStub = sinon.stub(window, '__uspapi').callsFake((...args) => {
          args[2](testConsentData, true);
        });

        setConsentConfig(goodConfig);
        requestBidsHook(() => { didHookReturn = true; }, {});

        let consent = uspDataHandler.getConsentData();

        sinon.assert.notCalled(utils.logWarn);
        sinon.assert.notCalled(utils.logError);

        expect(didHookReturn).to.be.true;
        expect(consent).to.equal(testConsentData.uspString);
      });
    });

    describe('USPAPI workflow for normal pages:', function () {
      let uspapiStub = sinon.stub();
      let ifr = null;

      beforeEach(function () {
        didHookReturn = false;
        ifr = createIFrameMarker();
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
        document.body.removeChild(ifr);
        delete window.__uspapi;
        resetConsentData();
      });

      it('performs lookup check and stores consentData for a valid existing user', function () {
        let testConsentData = {
          uspString: '1NY'
        };

        uspapiStub = sinon.stub(window, '__uspapi').callsFake((...args) => {
          args[2](testConsentData, true);
        });

        setConsentConfig(goodConfig);
        requestBidsHook(() => { didHookReturn = true; }, {});

        let consent = uspDataHandler.getConsentData();

        sinon.assert.notCalled(utils.logWarn);
        sinon.assert.notCalled(utils.logError);

        expect(didHookReturn).to.be.true;
        expect(consent).to.equal(testConsentData.uspString);
      });
    });
  });
});
