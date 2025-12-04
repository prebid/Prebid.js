import {consentConfig, gdprScope, resetConsentData, setConsentConfig, tcfCmpEventManager} from 'modules/consentManagementTcf.js';
import {gdprDataHandler} from 'src/adapterManager.js';
import * as utils from 'src/utils.js';
import {config} from 'src/config.js';
import 'src/prebid.js';

const expect = require('chai').expect;

describe('consentManagement', function () {
  function mockCMP(cmpResponse) {
    return function(...args) {
      args[2](Object.assign({eventStatus: 'tcloaded'}, cmpResponse), true);
    }
  }

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

      it('should use system default values', async function () {
        await setConsentConfig({});
        expect(consentConfig.cmpHandler).to.be.equal('iab');
        expect(consentConfig.cmpTimeout).to.be.equal(10000);
        expect(gdprScope).to.be.equal(false);
      });

      it('should exit consent manager if config is not an object', async function () {
        await setConsentConfig('');
        expect(consentConfig.cmpHandler).to.be.undefined;
        sinon.assert.calledOnce(utils.logWarn);
      });

      it('should exit consent manager if gdpr not set with new config structure', async function () {
        await setConsentConfig({usp: {cmpApi: 'iab', timeout: 50}});
        expect(consentConfig.cmpHandler).to.be.undefined;
        sinon.assert.calledOnce(utils.logWarn);
      });

      it('should exit consentManagement module if config is "undefined"', async function () {
        await setConsentConfig(undefined);
        expect(consentConfig.cmpHandler).to.be.undefined;
        sinon.assert.calledOnce(utils.logWarn);
      });

      it('should not produce any consent metadata', async function () {
        await setConsentConfig(undefined)
        const consentMetadata = gdprDataHandler.getConsentMeta();
        expect(consentMetadata).to.be.undefined;
        sinon.assert.calledOnce(utils.logWarn);
      })

      it('should immediately look up consent data', async () => {
        await setConsentConfig({gdpr: {cmpApi: 'invalid'}});
        expect(gdprDataHandler.ready).to.be.true;
      })
    });

    describe('valid setConsentConfig value', function () {
      afterEach(function () {
        config.resetConfig();
      });

      it('results in all user settings overriding system defaults', async function () {
        const allConfig = {
          cmpApi: 'iab',
          timeout: 7500,
          defaultGdprScope: true
        };

        await setConsentConfig(allConfig);
        expect(consentConfig.cmpHandler).to.be.equal('iab');
        expect(consentConfig.cmpTimeout).to.be.equal(7500);
        expect(gdprScope).to.be.true;
      });

      it('should use new consent manager config structure for gdpr', async function () {
        await setConsentConfig({
          gdpr: {cmpApi: 'daa', timeout: 8700}
        });

        expect(consentConfig.cmpHandler).to.be.equal('daa');
        expect(consentConfig.cmpTimeout).to.be.equal(8700);
      });

      it('should ignore config.usp and use config.gdpr, with default cmpApi', async function () {
        await setConsentConfig({
          gdpr: {timeout: 5000},
          usp: {cmpApi: 'daa', timeout: 50}
        });

        expect(consentConfig.cmpHandler).to.be.equal('iab');
        expect(consentConfig.cmpTimeout).to.be.equal(5000);
      });

      it('should ignore config.usp and use config.gdpr, with default cmpAip and timeout', async function () {
        await setConsentConfig({
          gdpr: {},
          usp: {cmpApi: 'daa', timeout: 50}
        });

        expect(consentConfig.cmpHandler).to.be.equal('iab');
        expect(consentConfig.cmpTimeout).to.be.equal(10000);
      });

      it('should recognize config.gdpr, with default cmpAip and timeout', async function () {
        await setConsentConfig({
          gdpr: {}
        });

        expect(consentConfig.cmpHandler).to.be.equal('iab');
        expect(consentConfig.cmpTimeout).to.be.equal(10000);
      });

      it('should fallback to old consent manager config object if no config.gdpr', async function () {
        await setConsentConfig({
          cmpApi: 'iab',
          timeout: 3333,
          gdpr: false
        });

        expect(consentConfig.cmpHandler).to.be.equal('iab');
        expect(consentConfig.cmpTimeout).to.be.equal(3333);
        expect(gdprScope).to.be.equal(false);
      });

      it('should enable gdprDataHandler', async () => {
        await setConsentConfig({gdpr: {}});
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

          it('results in user settings overriding system defaults for v2 spec', async () => {
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

            await setConsentConfig({
              cmpApi: 'static',
              timeout: 7500,
              consentData: packageCfg(consentData)
            });
            expect(consentConfig.cmpHandler).to.be.equal('static');
            expect(gdprScope).to.be.equal(false);
            const consent = gdprDataHandler.getConsentData();
            expect(consent.consentString).to.eql(consentData.tcString);
            expect(consent.vendorData).to.eql(consentData);
            expect(consentConfig.staticConsentData).to.be.equal(consentData);
          });
        });
      });
    });
  });

  describe('requestBidsHook tests:', function () {
    const goodConfig = {
      cmpApi: 'iab',
      timeout: 7500,
    };

    const staticConfig = {
      cmpApi: 'static',
      timeout: 7500,
      consentData: {}
    }

    beforeEach(resetConsentData);
    after(resetConsentData)

    async function runHook(request = {}) {
      let hookRan = false;
      consentConfig.requestBidsHook(() => {
        hookRan = true
      }, request);
      try {
        await consentConfig.loadConsentData();
      } catch (e) {
      }
      return hookRan;
    }

    describe('error checks:', function () {
      beforeEach(function () {
        sinon.stub(utils, 'logWarn');
        sinon.stub(utils, 'logError');
      });

      afterEach(function () {
        utils.logWarn.restore();
        utils.logError.restore();
        config.resetConfig();
      });

      it('should throw a warning and return to hooked function when an unknown CMP framework ID is used', async function () {
        const badCMPConfig = {
          cmpApi: 'bad'
        };
        await setConsentConfig(badCMPConfig);
        expect(consentConfig.cmpHandler).to.be.equal(badCMPConfig.cmpApi);
        expect(await runHook()).to.be.true;
        const consent = gdprDataHandler.getConsentData();
        sinon.assert.calledOnce(utils.logWarn);
        expect(consent).to.be.null;
      });

      it('should call gdprDataHandler.setConsentData() when unknown CMP api is used', async () => {
        await setConsentConfig({gdpr: {cmpApi: 'invalid'}});
        expect(await runHook()).to.be.true;
        expect(gdprDataHandler.ready).to.be.true;
      })

      it('should throw proper errors when CMP is not found', async function () {
        await setConsentConfig(goodConfig);
        expect(await runHook()).to.be.false;
        const consent = gdprDataHandler.getConsentData();
        // throw 2 errors; one for no bidsBackHandler and for CMP not being found (this is an error due to gdpr config)
        sinon.assert.calledTwice(utils.logError);
        expect(consent).to.be.null;
        expect(gdprDataHandler.ready).to.be.true;
      });

      it('should poll again to check if it appears later', async () => {
        await setConsentConfig({
          cmpApi: 'iab',
          timeout: 10,
        });
        expect(await runHook()).to.be.false;
        try {
          window.__tcfapi = mockCMP({
            gdprApplies: true,
            tcString: 'xyz',
          });
          expect(await runHook()).to.be.true;
          expect(gdprDataHandler.getConsentData().consentString).to.eql('xyz')
        } finally {
          delete window.__tcfapi
        }
      })

      it('should not trip when adUnits have no size', async () => {
        await setConsentConfig(staticConfig);
        expect(await runHook({adUnits: [{code: 'test', mediaTypes: {video: {}}}]})).to.be.true;
      });

      it('should continue the auction immediately, without consent data, if timeout is 0', async () => {
        window.__tcfapi = function () {
        };
        await setConsentConfig({
          cmpApi: 'iab',
          timeout: 0,
          defaultGdprScope: true
        });
        try {
          expect(await runHook()).to.be.true;
          const consent = gdprDataHandler.getConsentData();
          expect(consent.gdprApplies).to.be.true;
          expect(consent.consentString).to.be.undefined;
        } finally {
          delete window.__tcfapi;
        }
      })
    });

    describe('already known consentData:', function () {
      let cmpStub = sinon.stub();

      beforeEach(function () {
        window.__tcfapi = function () { };
      });

      afterEach(function () {
        config.resetConfig();
        cmpStub.restore();
        delete window.__tcfapi;
        resetConsentData();
      });

      it('should bypass CMP and simply use previously stored consentData', async function () {
        const testConsentData = {
          gdprApplies: true,
          tcString: 'xyz',
        };

        cmpStub = sinon.stub(window, '__tcfapi').callsFake(mockCMP(testConsentData));
        await setConsentConfig(goodConfig);
        expect(await runHook()).to.be.true;
        cmpStub.resetHistory();

        expect(await runHook()).to.be.true;
        const consent = gdprDataHandler.getConsentData();
        expect(consent.consentString).to.equal(testConsentData.tcString);
        expect(consent.gdprApplies).to.be.true;
        sinon.assert.notCalled(cmpStub);
      });

      it('should not set consent.gdprApplies to true if defaultGdprScope is true', async function () {
        const testConsentData = {
          gdprApplies: false,
          tcString: 'xyz',
        };

        cmpStub = sinon.stub(window, '__tcfapi').callsFake(mockCMP(testConsentData));

        await setConsentConfig({
          cmpApi: 'iab',
          timeout: 7500,
          defaultGdprScope: true
        });

        expect(await runHook()).to.be.true;
        const consent = gdprDataHandler.getConsentData();
        expect(consent.gdprApplies).to.be.false;
      });
    });

    describe('iframe tests', function () {
      let cmpPostMessageCb = () => { };
      let stringifyResponse;

      function createIFrameMarker(frameName) {
        const ifr = document.createElement('iframe');
        ifr.width = 0;
        ifr.height = 0;
        ifr.name = frameName;
        document.body.appendChild(ifr);
        return ifr;
      }

      function creatCmpMessageHandler(prefix, returnValue) {
        return function (event) {
          if (event && event.data) {
            const data = event.data;
            if (data[`${prefix}Call`]) {
              const callId = data[`${prefix}Call`].callId;
              const response = {
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
        it(`should return the consent string from a postmessage + addEventListener response - ${testName}`, async () => {
          stringifyResponse = messageFormatString;
          await setConsentConfig(goodConfig);
          expect(await runHook()).to.be.true;
          const consent = gdprDataHandler.getConsentData();
          sinon.assert.notCalled(utils.logError);
          expect(consent.consentString).to.equal(tarConsentString);
          expect(consent.gdprApplies).to.be.true;
          expect(consent.apiVersion).to.equal(ver);
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
        sinon.stub(utils, 'logError');
        sinon.stub(utils, 'logWarn');
      });

      afterEach(function () {
        config.resetConfig();
        if (window.__tcfapi) {
          cmpStub.restore();
        }
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

        it('performs lookup check and stores consentData for a valid existing user', async function () {
          const testConsentData = {
            tcString: 'abc12345234',
            gdprApplies: true,
            purposeOneTreatment: false,
            eventStatus: 'tcloaded'
          };
          cmpStub = sinon.stub(window, '__tcfapi').callsFake((...args) => {
            args[2](testConsentData, true);
          });

          await setConsentConfig(goodConfig);
          expect(await runHook()).to.be.true;
          const consent = gdprDataHandler.getConsentData();
          sinon.assert.notCalled(utils.logError);
          expect(consent.consentString).to.equal(testConsentData.tcString);
          expect(consent.gdprApplies).to.be.true;
          expect(consent.apiVersion).to.equal(2);
        });

        it('produces gdpr metadata', async function () {
          const testConsentData = {
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

          await setConsentConfig(goodConfig);

          expect(await runHook()).to.be.true;
          const consentMeta = gdprDataHandler.getConsentMeta();
          sinon.assert.notCalled(utils.logError);
          expect(consentMeta.consentStringSize).to.be.above(0)
          expect(consentMeta.gdprApplies).to.be.true;
          expect(consentMeta.apiVersion).to.equal(2);
          expect(consentMeta.generatedAt).to.be.above(1644367751709);
        });

        it('performs lookup check and stores consentData for a valid existing user with additional consent', async function () {
          const testConsentData = {
            tcString: 'abc12345234',
            addtlConsent: 'superduperstring',
            gdprApplies: true,
            purposeOneTreatment: false,
            eventStatus: 'tcloaded'
          };
          cmpStub = sinon.stub(window, '__tcfapi').callsFake((...args) => {
            args[2](testConsentData, true);
          });

          await setConsentConfig(goodConfig);
          expect(await runHook()).to.be.true;
          const consent = gdprDataHandler.getConsentData();
          sinon.assert.notCalled(utils.logError);
          expect(consent.consentString).to.equal(testConsentData.tcString);
          expect(consent.addtlConsent).to.equal(testConsentData.addtlConsent);
          expect(consent.gdprApplies).to.be.true;
          expect(consent.apiVersion).to.equal(2);
        });

        it('throws an error when processCmpData check fails + does not call requestBids callback', async function () {
          const testConsentData = {};
          let bidsBackHandlerReturn = false;

          cmpStub = sinon.stub(window, '__tcfapi').callsFake((...args) => {
            args[2](testConsentData);
          });

          await setConsentConfig(goodConfig);

          sinon.assert.notCalled(utils.logWarn);
          sinon.assert.notCalled(utils.logError);

          [utils.logWarn, utils.logError].forEach((stub) => stub.resetHistory());

          expect(await runHook({bidsBackHandler: () => bidsBackHandlerReturn = true})).to.be.false;
          const consent = gdprDataHandler.getConsentData();

          sinon.assert.calledOnce(utils.logError);
          sinon.assert.notCalled(utils.logWarn);
          expect(bidsBackHandlerReturn).to.be.true;
          expect(consent).to.be.null;
          expect(gdprDataHandler.ready).to.be.true;
        });

        describe('when proper consent is not available', () => {
          let tcfStub;

          async function runAuction() {
            await setConsentConfig({
              cmpApi: 'iab',
              timeout: 10,
              defaultGdprScope: true
            });
            return new Promise((resolve, reject) => {
              let hookRan = false;
              consentConfig.requestBidsHook(() => {
                hookRan = true;
              }, {});
              setTimeout(() => hookRan ? resolve() : reject(new Error('Auction did not run')), 20);
            })
          }

          function mockTcfEvent(tcdata) {
            tcfStub.callsFake((api, version, cb) => {
              if (api === 'addEventListener' && version === 2) {
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

          it('should timeout after actionTimeout from the first CMP event', async () => {
            mockTcfEvent({
              eventStatus: 'cmpuishown',
              tcString: 'mock-consent-string',
              vendorData: {}
            });
            await setConsentConfig({
              timeout: 1000,
              actionTimeout: 100,
              cmpApi: 'iab',
              defaultGdprScope: true
            });
            let hookRan = false;
            consentConfig.requestBidsHook(() => {
              hookRan = true;
            }, {});
            return new Promise((resolve) => setTimeout(resolve, 200))
              .then(() => {
                expect(hookRan).to.be.true;
              })
          });

          it('should still pick up consent data when actionTimeout is 0', async () => {
            mockTcfEvent({
              eventStatus: 'tcloaded',
              tcString: 'mock-consent-string',
              vendorData: {}
            });
            await setConsentConfig({
              timeout: 1000,
              actionTimeout: 0,
              cmpApi: 'iab',
              defaultGdprScope: true
            });
            expect(await runHook()).to.be.true;
            expect(gdprDataHandler.getConsentData().consentString).to.eql('mock-consent-string');
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

        it('It still considers it a valid cmp response if gdprApplies is not a boolean', async function () {
          // gdprApplies is undefined, should just still store consent response but use whatever defaultGdprScope was
          const testConsentData = {
            tcString: 'abc12345234',
            purposeOneTreatment: false,
            eventStatus: 'tcloaded'
          };
          cmpStub = sinon.stub(window, '__tcfapi').callsFake((...args) => {
            args[2](testConsentData, true);
          });

          await setConsentConfig({
            cmpApi: 'iab',
            timeout: 7500,
            defaultGdprScope: true
          });
          expect(await runHook()).to.be.true;
          const consent = gdprDataHandler.getConsentData();
          sinon.assert.notCalled(utils.logError);
          expect(consent.consentString).to.equal(testConsentData.tcString);
          expect(consent.gdprApplies).to.be.true;
          expect(consent.apiVersion).to.equal(2);
        });

        it('should set CMP listener ID when listenerId is provided in tcfData', async function () {
          const testConsentData = {
            tcString: 'abc12345234',
            gdprApplies: true,
            purposeOneTreatment: false,
            eventStatus: 'tcloaded',
            listenerId: 123
          };

          // Create a spy that will be applied when tcfCmpEventManager is created
          let setCmpListenerIdSpy = sinon.spy(tcfCmpEventManager, 'setCmpListenerId');

          cmpStub = sinon.stub(window, '__tcfapi').callsFake((...args) => {
            args[2](testConsentData, true);
          });

          await setConsentConfig(goodConfig);
          expect(await runHook()).to.be.true;

          sinon.assert.calledOnce(setCmpListenerIdSpy);
          sinon.assert.calledWith(setCmpListenerIdSpy, 123);

          setCmpListenerIdSpy.restore();
        });

        it('should not set CMP listener ID when listenerId is null', async function () {
          const testConsentData = {
            tcString: 'abc12345234',
            gdprApplies: true,
            purposeOneTreatment: false,
            eventStatus: 'tcloaded',
            listenerId: null
          };

          // Create a spy that will be applied when tcfCmpEventManager is created
          let setCmpListenerIdSpy = sinon.spy(tcfCmpEventManager, 'setCmpListenerId');

          cmpStub = sinon.stub(window, '__tcfapi').callsFake((...args) => {
            args[2](testConsentData, true);
          });

          await setConsentConfig(goodConfig);
          expect(await runHook()).to.be.true;

          sinon.assert.notCalled(setCmpListenerIdSpy);

          setCmpListenerIdSpy.restore();
        });

        it('should not set CMP listener ID when listenerId is undefined', async function () {
          const testConsentData = {
            tcString: 'abc12345234',
            gdprApplies: true,
            purposeOneTreatment: false,
            eventStatus: 'tcloaded',
            listenerId: undefined
          };

          // Create a spy that will be applied when tcfCmpEventManager is created
          let setCmpListenerIdSpy = sinon.spy(tcfCmpEventManager, 'setCmpListenerId');

          cmpStub = sinon.stub(window, '__tcfapi').callsFake((...args) => {
            args[2](testConsentData, true);
          });

          await setConsentConfig(goodConfig);
          expect(await runHook()).to.be.true;

          sinon.assert.notCalled(setCmpListenerIdSpy);
          setCmpListenerIdSpy.restore();
        });

        it('should set CMP listener ID when listenerId is 0 (valid listener ID)', async function () {
          const testConsentData = {
            tcString: 'abc12345234',
            gdprApplies: true,
            purposeOneTreatment: false,
            eventStatus: 'tcloaded',
            listenerId: 0
          };

          // Create a spy that will be applied when tcfCmpEventManager is created
          let setCmpListenerIdSpy = sinon.spy(tcfCmpEventManager, 'setCmpListenerId');

          cmpStub = sinon.stub(window, '__tcfapi').callsFake((...args) => {
            args[2](testConsentData, true);
          });

          await setConsentConfig(goodConfig);
          expect(await runHook()).to.be.true;

          sinon.assert.calledOnce(setCmpListenerIdSpy);
          sinon.assert.calledWith(setCmpListenerIdSpy, 0);
          setCmpListenerIdSpy.restore();
        });

        it('should set CMP API reference when CMP is found', async function () {
          const testConsentData = {
            tcString: 'abc12345234',
            gdprApplies: true,
            purposeOneTreatment: false,
            eventStatus: 'tcloaded'
          };

          // Create a spy that will be applied when tcfCmpEventManager is created
          let setCmpApiSpy = sinon.spy(tcfCmpEventManager, 'setCmpApi');

          cmpStub = sinon.stub(window, '__tcfapi').callsFake((...args) => {
            args[2](testConsentData, true);
          });

          await setConsentConfig(goodConfig);
          expect(await runHook()).to.be.true;

          sinon.assert.calledOnce(setCmpApiSpy);
          expect(setCmpApiSpy.getCall(0).args[0]).to.be.a('function');
          setCmpApiSpy.restore();
        });
      });
    });
  });
});
