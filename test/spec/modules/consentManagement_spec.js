import { setConsentConfig, requestBidsHook, resetConsentData, userCMP, consentTimeout, allowAuction, staticConsentData, gdprScope } from 'modules/consentManagement.js';
import { gdprDataHandler } from 'src/adapterManager.js';
import * as utils from 'src/utils.js';
import { config } from 'src/config.js';

let expect = require('chai').expect;

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

      it('should use system default values', function () {
        setConsentConfig({});
        expect(userCMP).to.be.equal('iab');
        expect(consentTimeout).to.be.equal(10000);
        expect(allowAuction).to.be.true;
        expect(gdprScope).to.be.equal(false);
        sinon.assert.callCount(utils.logInfo, 4);
      });

      it('should exit consent manager if config is not an object', function () {
        setConsentConfig('');
        expect(userCMP).to.be.undefined;
        sinon.assert.calledOnce(utils.logWarn);
      });

      it('should exit consent manager if gdpr not set with new config structure', function () {
        setConsentConfig({ usp: { cmpApi: 'iab', timeout: 50 } });
        expect(userCMP).to.be.undefined;
        sinon.assert.calledOnce(utils.logWarn);
      });
    });

    describe('valid setConsentConfig value', function () {
      afterEach(function () {
        config.resetConfig();
      });

      it('results in all user settings overriding system defaults', function () {
        let allConfig = {
          cmpApi: 'iab',
          timeout: 7500,
          allowAuctionWithoutConsent: false,
          defaultGdprScope: true
        };

        setConsentConfig(allConfig);
        expect(userCMP).to.be.equal('iab');
        expect(consentTimeout).to.be.equal(7500);
        expect(allowAuction).to.be.false;
        expect(gdprScope).to.be.true;
      });

      it('should use new consent manager config structure for gdpr', function () {
        setConsentConfig({
          gdpr: { cmpApi: 'daa', timeout: 8700 }
        });

        expect(userCMP).to.be.equal('daa');
        expect(consentTimeout).to.be.equal(8700);
      });

      it('should ignore config.usp and use config.gdpr, with default cmpApi', function () {
        setConsentConfig({
          gdpr: { timeout: 5000 },
          usp: { cmpApi: 'daa', timeout: 50 }
        });

        expect(userCMP).to.be.equal('iab');
        expect(consentTimeout).to.be.equal(5000);
      });

      it('should ignore config.usp and use config.gdpr, with default cmpAip and timeout', function () {
        setConsentConfig({
          gdpr: {},
          usp: { cmpApi: 'daa', timeout: 50 }
        });

        expect(userCMP).to.be.equal('iab');
        expect(consentTimeout).to.be.equal(10000);
      });

      it('should recognize config.gdpr, with default cmpAip and timeout', function () {
        setConsentConfig({
          gdpr: {}
        });

        expect(userCMP).to.be.equal('iab');
        expect(consentTimeout).to.be.equal(10000);
      });

      it('should fallback to old consent manager config object if no config.gdpr', function () {
        setConsentConfig({
          cmpApi: 'iab',
          timeout: 3333,
          allowAuctionWithoutConsent: false,
          gdpr: false
        });

        expect(userCMP).to.be.equal('iab');
        expect(consentTimeout).to.be.equal(3333);
        expect(allowAuction).to.be.equal(false);
        expect(gdprScope).to.be.equal(false);
      });
    });

    describe('static consent string setConsentConfig value', () => {
      afterEach(() => {
        config.resetConfig();
      });
      it('results in user settings overriding system defaults for v1 spec', () => {
        let staticConfig = {
          cmpApi: 'static',
          timeout: 7500,
          allowAuctionWithoutConsent: false,
          consentData: {
            getConsentData: {
              'gdprApplies': true,
              'hasGlobalScope': false,
              'consentData': 'BOOgjO9OOgjO9APABAENAi-AAAAWd7_______9____7_9uz_Gv_r_ff_3nW0739P1A_r_Oz_rm_-zzV44_lpQQRCEA'
            },
            getVendorConsents: {
              'metadata': 'BOOgjO9OOgjO9APABAENAi-AAAAWd7_______9____7_9uz_Gv_r_ff_3nW0739P1A_r_Oz_rm_-zzV44_lpQQRCEA',
              'gdprApplies': true,
              'hasGlobalScope': false,
              'isEU': true,
              'cookieVersion': 1,
              'created': '2018-05-29T07:45:48.522Z',
              'lastUpdated': '2018-05-29T07:45:48.522Z',
              'cmpId': 15,
              'cmpVersion': 1,
              'consentLanguage': 'EN',
              'vendorListVersion': 34,
              'maxVendorId': 359,
              'purposeConsents': {
                '1': true,
                '2': true,
                '3': true,
                '4': true,
                '5': true
              },
              'vendorConsents': {
                '1': true,
                '2': true,
                '3': true,
                '4': true,
                '5': false
              }
            }
          }
        };

        setConsentConfig(staticConfig);
        expect(userCMP).to.be.equal('static');
        expect(consentTimeout).to.be.equal(0); // should always return without a timeout when config is used
        expect(allowAuction).to.be.false;
        expect(staticConsentData).to.be.equal(staticConfig.consentData);
      });

      it('results in user settings overriding system defaults for v2 spec', () => {
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
                  '1': false,
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

        setConsentConfig(staticConfig);
        expect(userCMP).to.be.equal('static');
        expect(consentTimeout).to.be.equal(0); // should always return without a timeout when config is used
        expect(allowAuction).to.be.false;
        expect(gdprScope).to.be.equal(false);
        expect(staticConsentData).to.be.equal(staticConfig.consentData);
      });
    });
  });

  describe('requestBidsHook tests:', function () {
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

    afterEach(function () {
      gdprDataHandler.consentData = null;
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
        resetConsentData();
      });

      it('should throw a warning and return to hooked function when an unknown CMP framework ID is used', function () {
        let badCMPConfig = {
          cmpApi: 'bad'
        };
        setConsentConfig(badCMPConfig);
        expect(userCMP).to.be.equal(badCMPConfig.cmpApi);

        requestBidsHook(() => {
          didHookReturn = true;
        }, {});
        let consent = gdprDataHandler.getConsentData();
        sinon.assert.calledOnce(utils.logWarn);
        expect(didHookReturn).to.be.true;
        expect(consent).to.be.null;
      });

      it('should throw proper errors when CMP is not found', function () {
        setConsentConfig(goodConfigWithCancelAuction);

        requestBidsHook(() => {
          didHookReturn = true;
        }, {});
        let consent = gdprDataHandler.getConsentData();
        // throw 2 errors; one for no bidsBackHandler and for CMP not being found (this is an error due to gdpr config)
        sinon.assert.calledTwice(utils.logError);
        expect(didHookReturn).to.be.false;
        expect(consent).to.be.null;
      });
    });

    describe('already known consentData:', function () {
      let cmpStub = sinon.stub();

      beforeEach(function () {
        didHookReturn = false;
        window.__cmp = function () { };
      });

      afterEach(function () {
        config.resetConfig();
        cmpStub.restore();
        delete window.__cmp;
        resetConsentData();
      });

      it('should bypass CMP and simply use previously stored consentData', function () {
        let testConsentData = {
          gdprApplies: true,
          consentData: 'xyz'
        };

        cmpStub = sinon.stub(window, '__cmp').callsFake((...args) => {
          args[2](testConsentData);
        });
        setConsentConfig(goodConfigWithAllowAuction);
        requestBidsHook(() => { }, {});
        cmpStub.restore();

        // reset the stub to ensure it wasn't called during the second round of calls
        cmpStub = sinon.stub(window, '__cmp').callsFake((...args) => {
          args[2](testConsentData);
        });

        requestBidsHook(() => {
          didHookReturn = true;
        }, {});
        let consent = gdprDataHandler.getConsentData();

        expect(didHookReturn).to.be.true;
        expect(consent.consentString).to.equal(testConsentData.consentData);
        expect(consent.gdprApplies).to.be.true;
        sinon.assert.notCalled(cmpStub);
      });

      it('should not set consent.gdprApplies to true if defaultGdprScope is true', function () {
        let testConsentData = {
          gdprApplies: false,
          consentData: 'xyz'
        };

        cmpStub = sinon.stub(window, '__cmp').callsFake((...args) => {
          args[2](testConsentData);
        });

        setConsentConfig({
          cmpApi: 'iab',
          timeout: 7500,
          defaultGdprScope: true
        });

        requestBidsHook(() => {
          didHookReturn = true;
        }, {});

        let consent = gdprDataHandler.getConsentData();

        expect(consent.gdprApplies).to.be.false;
      });
    });

    describe('iframe tests', function () {
      let cmpPostMessageCb = () => { };
      let stringifyResponse;

      function createIFrameMarker(frameName) {
        let ifr = document.createElement('iframe');
        ifr.width = 0;
        ifr.height = 0;
        ifr.name = frameName;
        document.body.appendChild(ifr);
        return ifr;
      }

      function creatCmpMessageHandler(prefix, returnValue) {
        return function (event) {
          if (event && event.data) {
            let data = event.data;
            if (data[`${prefix}Call`]) {
              let callId = data[`${prefix}Call`].callId;
              let response = {
                [`${prefix}Return`]: {
                  callId,
                  returnValue,
                  success: true
                }
              };
              event.source.postMessage(stringifyResponse ? JSON.stringify(response) : response, '*');
            }
          }
        }
      }

      function testIFramedPage(testName, messageFormatString, tarConsentString, ver) {
        it(`should return the consent string from a postmessage + addEventListener response - ${testName}`, (done) => {
          stringifyResponse = messageFormatString;
          setConsentConfig(goodConfigWithAllowAuction);
          requestBidsHook(() => {
            let consent = gdprDataHandler.getConsentData();
            sinon.assert.notCalled(utils.logWarn);
            sinon.assert.notCalled(utils.logError);
            expect(consent.consentString).to.equal(tarConsentString);
            expect(consent.gdprApplies).to.be.true;
            expect(consent.apiVersion).to.equal(ver);
            done();
          }, {});
        });
      }

      beforeEach(function () {
        sinon.stub(utils, 'logError');
        sinon.stub(utils, 'logWarn');
      });

      afterEach(function () {
        utils.logError.restore();
        utils.logWarn.restore();
        config.resetConfig();
        resetConsentData();
      });

      describe('v1 CMP workflow for safeframe page', function () {
        let registerStub = sinon.stub();
        let ifrSf = null;
        beforeEach(function () {
          didHookReturn = false;
          window.$sf = {
            ext: {
              register: function () { },
              cmp: function () { }
            }
          };
          ifrSf = createIFrameMarker('__cmpLocator');
        });

        afterEach(function () {
          delete window.$sf;
          registerStub.restore();
          document.body.removeChild(ifrSf);
        });

        it('should return the consent data from a safeframe callback', function () {
          let testConsentData = {
            data: {
              msgName: 'cmpReturn',
              vendorConsents: {
                metadata: 'abc123def',
                gdprApplies: true
              },
              vendorConsentData: {
                consentData: 'abc123def',
                gdprApplies: true
              }
            }
          };
          registerStub = sinon.stub(window.$sf.ext, 'register').callsFake((...args) => {
            args[2](testConsentData.data.msgName, testConsentData.data);
          });

          setConsentConfig(goodConfigWithAllowAuction);
          requestBidsHook(() => {
            didHookReturn = true;
          }, { adUnits: [{ sizes: [[300, 250]] }] });
          let consent = gdprDataHandler.getConsentData();

          sinon.assert.notCalled(utils.logWarn);
          sinon.assert.notCalled(utils.logError);
          expect(didHookReturn).to.be.true;
          expect(consent.consentString).to.equal('abc123def');
          expect(consent.gdprApplies).to.be.true;
          expect(consent.apiVersion).to.equal(1);
        });
      });

      describe('v1 CMP workflow for iframe pages', function () {
        stringifyResponse = false;
        let ifr1 = null;

        beforeEach(function () {
          ifr1 = createIFrameMarker('__cmpLocator');
          cmpPostMessageCb = creatCmpMessageHandler('__cmp', {
            consentData: 'encoded_consent_data_via_post_message',
            gdprApplies: true,
          });
          window.addEventListener('message', cmpPostMessageCb, false);
        });

        afterEach(function () {
          delete window.__cmp; // deletes the local copy made by the postMessage CMP call function
          document.body.removeChild(ifr1);
          window.removeEventListener('message', cmpPostMessageCb);
        });

        // Run tests with JSON response and String response
        // from CMP window postMessage listener.
        testIFramedPage('with/JSON response', false, 'encoded_consent_data_via_post_message', 1);
        testIFramedPage('with/String response', true, 'encoded_consent_data_via_post_message', 1);
      });

      describe('v2 CMP workflow for iframe pages:', function () {
        stringifyResponse = false;
        let ifr2 = null;

        beforeEach(function () {
          ifr2 = createIFrameMarker('__tcfapiLocator');
          cmpPostMessageCb = creatCmpMessageHandler('__tcfapi', {
            tcString: 'abc12345234',
            gdprApplies: true,
            purposeOneTreatment: false,
            eventStatus: 'tcloaded'
          });
          window.addEventListener('message', cmpPostMessageCb, false);
        });

        afterEach(function () {
          delete window.__tcfapi; // deletes the local copy made by the postMessage CMP call function
          document.body.removeChild(ifr2);
          window.removeEventListener('message', cmpPostMessageCb);
        });

        testIFramedPage('with/JSON response', false, 'abc12345234', 2);
        testIFramedPage('with/String response', true, 'abc12345234', 2);
      });
    });

    describe('direct calls to CMP API tests', function () {
      let cmpStub = sinon.stub();

      beforeEach(function () {
        didHookReturn = false;
        sinon.stub(utils, 'logError');
        sinon.stub(utils, 'logWarn');
      });

      afterEach(function () {
        config.resetConfig();
        cmpStub.restore();
        utils.logError.restore();
        utils.logWarn.restore();
        resetConsentData();
      });

      describe('v1 CMP workflow for normal pages:', function () {
        beforeEach(function () {
          window.__cmp = function () { };
        });

        afterEach(function () {
          delete window.__cmp;
        });

        it('performs lookup check and stores consentData for a valid existing user', function () {
          let testConsentData = {
            gdprApplies: true,
            consentData: 'BOJy+UqOJy+UqABAB+AAAAAZ+A=='
          };
          cmpStub = sinon.stub(window, '__cmp').callsFake((...args) => {
            args[2](testConsentData);
          });

          setConsentConfig(goodConfigWithAllowAuction);

          requestBidsHook(() => {
            didHookReturn = true;
          }, {});
          let consent = gdprDataHandler.getConsentData();

          sinon.assert.notCalled(utils.logWarn);
          sinon.assert.notCalled(utils.logError);
          expect(didHookReturn).to.be.true;
          expect(consent.consentString).to.equal(testConsentData.consentData);
          expect(consent.gdprApplies).to.be.true;
          expect(consent.apiVersion).to.equal(1);
        });
      });

      describe('v2 CMP workflow for normal pages:', function () {
        beforeEach(function() {
          window.__tcfapi = function () { };
        });

        afterEach(function () {
          delete window.__tcfapi;
        });

        it('performs lookup check and stores consentData for a valid existing user', function () {
          let testConsentData = {
            tcString: 'abc12345234',
            gdprApplies: true,
            purposeOneTreatment: false,
            eventStatus: 'tcloaded'
          };
          cmpStub = sinon.stub(window, '__tcfapi').callsFake((...args) => {
            args[2](testConsentData, true);
          });

          setConsentConfig(goodConfigWithAllowAuction);

          requestBidsHook(() => {
            didHookReturn = true;
          }, {});
          let consent = gdprDataHandler.getConsentData();
          sinon.assert.notCalled(utils.logWarn);
          sinon.assert.notCalled(utils.logError);
          expect(didHookReturn).to.be.true;
          expect(consent.consentString).to.equal(testConsentData.tcString);
          expect(consent.gdprApplies).to.be.true;
          expect(consent.apiVersion).to.equal(2);
        });

        it('throws an error when processCmpData check failed while config had allowAuction set to false', function () {
          let testConsentData = {};
          let bidsBackHandlerReturn = false;

          cmpStub = sinon.stub(window, '__tcfapi').callsFake((...args) => {
            args[2](testConsentData);
          });

          setConsentConfig(goodConfigWithCancelAuction);

          requestBidsHook(() => {
            didHookReturn = true;
          }, { bidsBackHandler: () => bidsBackHandlerReturn = true });
          let consent = gdprDataHandler.getConsentData();

          sinon.assert.calledOnce(utils.logError);
          expect(didHookReturn).to.be.false;
          expect(bidsBackHandlerReturn).to.be.true;
          expect(consent).to.be.null;
        });

        it('It still considers it a valid cmp response if gdprApplies is not a boolean', function () {
          // gdprApplies is undefined, should just still store consent response but use whatever defaultGdprScope was
          let testConsentData = {
            tcString: 'abc12345234',
            purposeOneTreatment: false,
            eventStatus: 'tcloaded'
          };
          cmpStub = sinon.stub(window, '__tcfapi').callsFake((...args) => {
            args[2](testConsentData, true);
          });

          setConsentConfig({
            cmpApi: 'iab',
            timeout: 7500,
            defaultGdprScope: true
          });

          requestBidsHook(() => {
            didHookReturn = true;
          }, {});
          let consent = gdprDataHandler.getConsentData();
          sinon.assert.notCalled(utils.logWarn);
          sinon.assert.notCalled(utils.logError);
          expect(didHookReturn).to.be.true;
          expect(consent.consentString).to.equal(testConsentData.tcString);
          expect(consent.gdprApplies).to.be.true;
          expect(consent.apiVersion).to.equal(2);
        });

        it('throws a warning + stores consentData + calls callback when processCmpData check failed while config had allowAuction set to true', function () {
          let testConsentData = {};

          cmpStub = sinon.stub(window, '__tcfapi').callsFake((...args) => {
            args[2](testConsentData);
          });

          setConsentConfig(goodConfigWithAllowAuction);

          requestBidsHook(() => {
            didHookReturn = true;
          }, {});
          let consent = gdprDataHandler.getConsentData();

          sinon.assert.calledOnce(utils.logWarn);
          expect(didHookReturn).to.be.true;
          expect(consent.consentString).to.be.undefined;
          expect(consent.gdprApplies).to.be.false;
          expect(consent.apiVersion).to.equal(2);
        });
      });
    });
  });
});
