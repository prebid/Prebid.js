import {
  actionTimeout,
  consentTimeout,
  gdprScope,
  loadConsentData,
  requestBidsHook,
  resetConsentData,
  setConsentConfig,
  staticConsentData,
  userCMP
} from 'modules/consentManagement.js';
import {gdprDataHandler} from 'src/adapterManager.js';
import * as utils from 'src/utils.js';
import {config} from 'src/config.js';
import 'src/prebid.js';

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
        expect(gdprScope).to.be.equal(false);
        sinon.assert.callCount(utils.logInfo, 3);
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

      it('should exit consentManagement module if config is "undefined"', function() {
        setConsentConfig(undefined);
        expect(userCMP).to.be.undefined;
        sinon.assert.calledOnce(utils.logWarn);
      });

      it('should not produce any consent metadata', function() {
        setConsentConfig(undefined)
        let consentMetadata = gdprDataHandler.getConsentMeta();
        expect(consentMetadata).to.be.undefined;
        sinon.assert.calledOnce(utils.logWarn);
      })

      it('should immediately look up consent data', () => {
        setConsentConfig({gdpr: {cmpApi: 'invalid'}});
        expect(gdprDataHandler.ready).to.be.true;
      })
    });

    describe('valid setConsentConfig value', function () {
      afterEach(function () {
        config.resetConfig();
      });

      it('results in all user settings overriding system defaults', function () {
        let allConfig = {
          cmpApi: 'iab',
          timeout: 7500,
          defaultGdprScope: true
        };

        setConsentConfig(allConfig);
        expect(userCMP).to.be.equal('iab');
        expect(consentTimeout).to.be.equal(7500);
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
          gdpr: false
        });

        expect(userCMP).to.be.equal('iab');
        expect(consentTimeout).to.be.equal(3333);
        expect(gdprScope).to.be.equal(false);
      });

      it('should enable gdprDataHandler', () => {
        setConsentConfig({gdpr: {}});
        expect(gdprDataHandler.enabled).to.be.true;
      });
    });

    describe('static consent string setConsentConfig value', () => {
      Object.entries({
        'getTCData': (cfg) => ({getTCData: cfg}),
        'consent data directly': (cfg) => cfg,
      }).forEach(([t, packageCfg]) => {
        describe(`using ${t}`, () => {
          afterEach(() => {
            config.resetConfig();
          });

          it('results in user settings overriding system defaults for v2 spec', () => {
            const consentData = {
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
            };

            setConsentConfig({
              cmpApi: 'static',
              timeout: 7500,
              consentData: packageCfg(consentData)
            });
            expect(userCMP).to.be.equal('static');
            expect(consentTimeout).to.be.equal(0); // should always return without a timeout when config is used
            expect(gdprScope).to.be.equal(false);
            const consent = gdprDataHandler.getConsentData();
            expect(consent.consentString).to.eql(consentData.tcString);
            expect(consent.vendorData).to.eql(consentData);
            expect(staticConsentData).to.be.equal(consentData);
          });
        });
      });
    });
  });

  describe('requestBidsHook tests:', function () {
    let goodConfig = {
      cmpApi: 'iab',
      timeout: 7500,
    };

    const staticConfig = {
      cmpApi: 'static',
      timeout: 7500,
      consentData: {}
    }

    let didHookReturn;

    beforeEach(resetConsentData);
    after(resetConsentData)

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

      it('should call gpdrDataHandler.setConsentData() when unknown CMP api is used', () => {
        setConsentConfig({gdpr: {cmpApi: 'invalid'}});
        let hookRan = false;
        requestBidsHook(() => { hookRan = true; }, {});
        expect(hookRan).to.be.true;
        expect(gdprDataHandler.ready).to.be.true;
      })

      it('should throw proper errors when CMP is not found', function () {
        setConsentConfig(goodConfig);

        requestBidsHook(() => {
          didHookReturn = true;
        }, {});
        let consent = gdprDataHandler.getConsentData();
        // throw 2 errors; one for no bidsBackHandler and for CMP not being found (this is an error due to gdpr config)
        sinon.assert.calledTwice(utils.logError);
        expect(didHookReturn).to.be.false;
        expect(consent).to.be.null;
        expect(gdprDataHandler.ready).to.be.true;
      });

      it('should not trip when adUnits have no size', () => {
        setConsentConfig(staticConfig);
        let ran = false;
        requestBidsHook(() => {
          ran = true;
        }, {adUnits: [{code: 'test', mediaTypes: {video: {}}}]});
        return gdprDataHandler.promise.then(() => {
          expect(ran).to.be.true;
        });
      });

      it('should continue the auction immediately, without consent data, if timeout is 0', (done) => {
        setConsentConfig({
          cmpApi: 'iab',
          timeout: 0,
          defaultGdprScope: true
        });
        window.__tcfapi = function () {};
        try {
          requestBidsHook(() => {
            const consent = gdprDataHandler.getConsentData();
            expect(consent.gdprApplies).to.be.true;
            expect(consent.consentString).to.be.undefined;
            done();
          }, {})
        } finally {
          delete window.__tcfapi;
        }
      })
    });

    describe('already known consentData:', function () {
      let cmpStub = sinon.stub();

      function mockCMP(cmpResponse) {
        return function(...args) {
          args[2](Object.assign({eventStatus: 'tcloaded'}, cmpResponse), true);
        }
      }

      beforeEach(function () {
        didHookReturn = false;
        window.__tcfapi = function () { };
      });

      afterEach(function () {
        config.resetConfig();
        cmpStub.restore();
        delete window.__tcfapi;
        resetConsentData();
      });

      it('should bypass CMP and simply use previously stored consentData', function () {
        let testConsentData = {
          gdprApplies: true,
          tcString: 'xyz',
        };

        cmpStub = sinon.stub(window, '__tcfapi').callsFake(mockCMP(testConsentData));
        setConsentConfig(goodConfig);
        requestBidsHook(() => { }, {});
        cmpStub.reset();

        requestBidsHook(() => {
          didHookReturn = true;
        }, {});
        let consent = gdprDataHandler.getConsentData();

        expect(didHookReturn).to.be.true;
        expect(consent.consentString).to.equal(testConsentData.tcString);
        expect(consent.gdprApplies).to.be.true;
        sinon.assert.notCalled(cmpStub);
      });

      it('should not set consent.gdprApplies to true if defaultGdprScope is true', function () {
        let testConsentData = {
          gdprApplies: false,
          tcString: 'xyz',
        };

        cmpStub = sinon.stub(window, '__tcfapi').callsFake(mockCMP(testConsentData));

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
          setConsentConfig(goodConfig);
          requestBidsHook(() => {
            let consent = gdprDataHandler.getConsentData();
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

          setConsentConfig(goodConfig);

          requestBidsHook(() => {
            didHookReturn = true;
          }, {});
          let consent = gdprDataHandler.getConsentData();
          sinon.assert.notCalled(utils.logError);
          expect(didHookReturn).to.be.true;
          expect(consent.consentString).to.equal(testConsentData.tcString);
          expect(consent.gdprApplies).to.be.true;
          expect(consent.apiVersion).to.equal(2);
        });

        it('produces gdpr metadata', function () {
          let testConsentData = {
            tcString: 'abc12345234',
            gdprApplies: true,
            purposeOneTreatment: false,
            eventStatus: 'tcloaded',
            vendorData: {
              tcString: 'abc12345234'
            }
          };
          cmpStub = sinon.stub(window, '__tcfapi').callsFake((...args) => {
            args[2](testConsentData, true);
          });

          setConsentConfig(goodConfig);

          requestBidsHook(() => {
            didHookReturn = true;
          }, {});
          let consentMeta = gdprDataHandler.getConsentMeta();
          sinon.assert.notCalled(utils.logError);
          expect(consentMeta.consentStringSize).to.be.above(0)
          expect(consentMeta.gdprApplies).to.be.true;
          expect(consentMeta.apiVersion).to.equal(2);
          expect(consentMeta.generatedAt).to.be.above(1644367751709);
        });

        it('performs lookup check and stores consentData for a valid existing user with additional consent', function () {
          let testConsentData = {
            tcString: 'abc12345234',
            addtlConsent: 'superduperstring',
            gdprApplies: true,
            purposeOneTreatment: false,
            eventStatus: 'tcloaded'
          };
          cmpStub = sinon.stub(window, '__tcfapi').callsFake((...args) => {
            args[2](testConsentData, true);
          });

          setConsentConfig(goodConfig);

          requestBidsHook(() => {
            didHookReturn = true;
          }, {});
          let consent = gdprDataHandler.getConsentData();
          sinon.assert.notCalled(utils.logError);
          expect(didHookReturn).to.be.true;
          expect(consent.consentString).to.equal(testConsentData.tcString);
          expect(consent.addtlConsent).to.equal(testConsentData.addtlConsent);
          expect(consent.gdprApplies).to.be.true;
          expect(consent.apiVersion).to.equal(2);
        });

        it('throws an error when processCmpData check fails + does not call requestBids callback', function () {
          let testConsentData = {};
          let bidsBackHandlerReturn = false;

          cmpStub = sinon.stub(window, '__tcfapi').callsFake((...args) => {
            args[2](testConsentData);
          });

          setConsentConfig(goodConfig);

          sinon.assert.notCalled(utils.logWarn);
          sinon.assert.notCalled(utils.logError);

          [utils.logWarn, utils.logError].forEach((stub) => stub.reset());

          requestBidsHook(() => {
            didHookReturn = true;
          }, { bidsBackHandler: () => bidsBackHandlerReturn = true });
          let consent = gdprDataHandler.getConsentData();

          sinon.assert.calledOnce(utils.logError);
          sinon.assert.notCalled(utils.logWarn);
          expect(didHookReturn).to.be.false;
          expect(bidsBackHandlerReturn).to.be.true;
          expect(consent).to.be.null;
          expect(gdprDataHandler.ready).to.be.true;
        });

        describe('when proper consent is not available', () => {
          let tcfStub;

          function runAuction() {
            setConsentConfig({
              cmpApi: 'iab',
              timeout: 10,
              defaultGdprScope: true
            });
            return new Promise((resolve, reject) => {
              requestBidsHook(() => {
                didHookReturn = true;
              }, {});
              setTimeout(() => didHookReturn ? resolve() : reject(new Error('Auction did not run')), 20);
            })
          }

          function mockTcfEvent(tcdata) {
            tcfStub.callsFake((api, version, cb) => {
              if (api === 'addEventListener' && version === 2) {
                // eslint-disable-next-line standard/no-callback-literal
                cb(tcdata, true)
              }
            });
          }

          beforeEach(() => {
            tcfStub = sinon.stub(window, '__tcfapi');
          });

          afterEach(() => {
            tcfStub.restore();
          })

          it('should continue auction with null consent when CMP is unresponsive', () => {
            return runAuction().then(() => {
              const consent = gdprDataHandler.getConsentData();
              expect(consent.gdprApplies).to.be.true;
              expect(consent.consentString).to.be.undefined;
              expect(gdprDataHandler.ready).to.be.true;
            });
          });

          it('should use consent provided by events other than tcloaded', () => {
            mockTcfEvent({
              eventStatus: 'cmpuishown',
              tcString: 'mock-consent-string',
              vendorData: {}
            });
            return runAuction().then(() => {
              const consent = gdprDataHandler.getConsentData();
              expect(consent.gdprApplies).to.be.true;
              expect(consent.consentString).to.equal('mock-consent-string');
              expect(consent.vendorData.vendorData).to.eql({});
              expect(gdprDataHandler.ready).to.be.true;
            });
          });

          it('should timeout after actionTimeout from the first CMP event', (done) => {
            mockTcfEvent({
              eventStatus: 'cmpuishown',
              tcString: 'mock-consent-string',
              vendorData: {}
            });
            setConsentConfig({
              timeout: 1000,
              actionTimeout: 100,
              cmpApi: 'iab',
              defaultGdprScope: true
            });
            let hookRan = false;
            requestBidsHook(() => {
              hookRan = true;
            }, {});
            setTimeout(() => {
              expect(hookRan).to.be.true;
              done();
            }, 200)
          });

          it('should still pick up consent data when actionTimeout is 0', (done) => {
            mockTcfEvent({
              eventStatus: 'tcloaded',
              tcString: 'mock-consent-string',
              vendorData: {}
            });
            setConsentConfig({
              timeout: 1000,
              actionTimeout: 0,
              cmpApi: 'iab',
              defaultGdprScope: true
            });
            requestBidsHook(() => {
              expect(gdprDataHandler.getConsentData().consentString).to.eql('mock-consent-string');
              done();
            }, {})
          })

          Object.entries({
            'null': null,
            'empty': '',
            'undefined': undefined
          }).forEach(([t, cs]) => {
            // some CMPs appear to reply with an empty consent string in 'cmpuishown' - make sure we don't use that
            it(`should NOT use "default" consent if string is ${t}`, () => {
              mockTcfEvent({
                eventStatus: 'cmpuishown',
                tcString: cs,
                vendorData: {random: 'junk'}
              });
              return runAuction().then(() => {
                const consent = gdprDataHandler.getConsentData();
                expect(consent.gdprApplies).to.be.true;
                expect(consent.consentString).to.be.undefined;
                expect(consent.vendorData).to.be.undefined;
              });
            })
          });
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
          sinon.assert.notCalled(utils.logError);
          expect(didHookReturn).to.be.true;
          expect(consent.consentString).to.equal(testConsentData.tcString);
          expect(consent.gdprApplies).to.be.true;
          expect(consent.apiVersion).to.equal(2);
        });
      });
    });
  });
});
