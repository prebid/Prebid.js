import {
  setConsentConfig,
  requestBidsHook,
  resetConsentData,
  userCMP,
  consentTimeout,
  storeConsentData, lookupIabConsent
} from 'modules/consentManagementGpp.js';
import { gppDataHandler } from 'src/adapterManager.js';
import * as utils from 'src/utils.js';
import { config } from 'src/config.js';
import 'src/prebid.js';

let expect = require('chai').expect;

describe('consentManagementGpp', function () {
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
        setConsentConfig({
          gpp: {}
        });
        expect(userCMP).to.be.equal('iab');
        expect(consentTimeout).to.be.equal(10000);
        sinon.assert.callCount(utils.logInfo, 3);
      });

      it('should exit consent manager if config is not an object', function () {
        setConsentConfig('');
        expect(userCMP).to.be.undefined;
        sinon.assert.calledOnce(utils.logWarn);
      });

      it('should exit consentManagement module if config is "undefined"', function () {
        setConsentConfig(undefined);
        expect(userCMP).to.be.undefined;
        sinon.assert.calledOnce(utils.logWarn);
      });

      it('should not produce any consent metadata', function () {
        setConsentConfig(undefined)
        let consentMetadata = gppDataHandler.getConsentMeta();
        expect(consentMetadata).to.be.undefined;
        sinon.assert.calledOnce(utils.logWarn);
      })

      it('should immediately look up consent data', () => {
        setConsentConfig({
          gpp: {
            cmpApi: 'invalid'
          }
        });
        expect(gppDataHandler.ready).to.be.true;
      })
    });

    describe('valid setConsentConfig value', function () {
      afterEach(function () {
        config.resetConfig();
      });

      it('results in all user settings overriding system defaults', function () {
        let allConfig = {
          gpp: {
            cmpApi: 'iab',
            timeout: 7500
          }
        };

        setConsentConfig(allConfig);
        expect(userCMP).to.be.equal('iab');
        expect(consentTimeout).to.be.equal(7500);
      });

      it('should recognize config.gpp, with default cmpApi and timeout', function () {
        setConsentConfig({
          gpp: {}
        });

        expect(userCMP).to.be.equal('iab');
        expect(consentTimeout).to.be.equal(10000);
      });

      it('should enable gppDataHandler', () => {
        setConsentConfig({
          gpp: {}
        });
        expect(gppDataHandler.enabled).to.be.true;
      });
    });

    describe('lookupIABConsent', () => {
      let mockCmp, mockCmpEvent, gppData, sectionData
      beforeEach(() => {
        gppData = {
          gppString: 'mockString',
          applicableSections: [],
          pingData: {}
        };
        sectionData = {};
        mockCmp = sinon.stub().callsFake(({command, callback, parameter}) => {
          let res;
          switch (command) {
            case 'addEventListener':
              mockCmpEvent = callback;
              break;
            case 'getGPPData':
              res = gppData;
              break;
            case 'getSection':
              res = sectionData[parameter];
              break;
          }
          return Promise.resolve(res);
        });
      })

      function runLookup() {
        return new Promise((resolve, reject) => lookupIabConsent({onSuccess: resolve, onError: reject}, () => mockCmp));
      }

      function oneShotLookup() {
        const pm = runLookup();
        mockCmpEvent({eventName: 'sectionChange'});
        return pm;
      }

      it('fetches all sections', () => {
        gppData.pingData.supportedAPIs = ['usnat', 'usca']
        sectionData = {
          usnat: {mock: 'usnat'},
          usca: {mock: 'usca'}
        };
        return oneShotLookup().then((res) => {
          expect(res.sectionData).to.eql(sectionData);
        });
      });

      it('does not choke if some section data is not available', () => {
        gppData.pingData.supportedAPIs = ['usnat', 'usca']
        sectionData = {
          usca: {mock: 'data'}
        };
        return oneShotLookup().then((res) => {
          expect(res.sectionData).to.eql(sectionData);
        })
      });
    })

    describe('static consent string setConsentConfig value', () => {
      afterEach(() => {
        config.resetConfig();
      });

      it('results in user settings overriding system defaults', () => {
        let staticConfig = {
          gpp: {
            cmpApi: 'static',
            timeout: 7500,
            sectionData: {
              usnat: {
                MockUsnatParsedFlag: true
              }
            },
            consentData: {
              applicableSections: [7],
              gppString: 'ABCDEFG1234',
              gppVersion: 1,
              sectionId: 3,
              sectionList: []
            }
          }
        };

        setConsentConfig(staticConfig);
        expect(userCMP).to.be.equal('static');
        const consent = gppDataHandler.getConsentData();
        expect(consent.gppString).to.eql(staticConfig.gpp.consentData.gppString);
        expect(consent.gppData).to.eql(staticConfig.gpp.consentData);
        expect(consent.sectionData).to.eql(staticConfig.gpp.sectionData);
      });
    });
  });

  describe('requestBidsHook tests:', function () {
    let goodConfig = {
      gpp: {
        cmpApi: 'iab',
        timeout: 7500,
      }
    };

    const staticConfig = {
      gpp: {
        cmpApi: 'static',
        timeout: 7500,
        consentData: {
          gppString: 'abc12345',
          applicableSections: [7]
        }
      }
    }

    let didHookReturn;

    beforeEach(resetConsentData);
    after(resetConsentData);

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
          gpp: {
            cmpApi: 'bad'
          }
        };
        setConsentConfig(badCMPConfig);
        expect(userCMP).to.be.equal(badCMPConfig.gpp.cmpApi);

        requestBidsHook(() => {
          didHookReturn = true;
        }, {});
        let consent = gppDataHandler.getConsentData();

        sinon.assert.calledOnce(utils.logWarn);
        expect(didHookReturn).to.be.true;
        expect(consent).to.be.null;
      });

      it('should call gppDataHandler.setConsentData() when unknown CMP api is used', () => {
        setConsentConfig({
          gpp: {
            cmpApi: 'invalid'
          }
        });
        let hookRan = false;
        requestBidsHook(() => {
          hookRan = true;
        }, {});
        expect(hookRan).to.be.true;
        expect(gppDataHandler.ready).to.be.true;
      })

      it('should throw proper errors when CMP is not found', function () {
        setConsentConfig(goodConfig);

        requestBidsHook(() => {
          didHookReturn = true;
        }, {});
        let consent = gppDataHandler.getConsentData();
        // throw 2 errors; one for no bidsBackHandler and for CMP not being found (this is an error due to gdpr config)
        sinon.assert.calledTwice(utils.logError);
        expect(didHookReturn).to.be.false;
        expect(consent).to.be.null;
        expect(gppDataHandler.ready).to.be.true;
      });

      it('should not trip when adUnits have no size', () => {
        setConsentConfig(staticConfig);
        let ran = false;
        requestBidsHook(() => {
          ran = true;
        }, {
          adUnits: [{
            code: 'test',
            mediaTypes: {
              video: {}
            }
          }]
        });
        return gppDataHandler.promise.then(() => {
          expect(ran).to.be.true;
        });
      });

      it('should continue the auction immediately, without consent data, if timeout is 0', (done) => {
        setConsentConfig({
          gpp: {
            cmpApi: 'iab',
            timeout: 0
          }
        });
        window.__gpp = function () {};
        try {
          requestBidsHook(() => {
            const consent = gppDataHandler.getConsentData();
            expect(consent.applicableSections).to.deep.equal([]);
            expect(consent.gppString).to.be.undefined;
            done();
          }, {})
        } finally {
          delete window.__gpp;
        }
      });
    });

    describe('already known consentData:', function () {
      let cmpStub = sinon.stub();

      function mockCMP(cmpResponse) {
        return function (...args) {
          if (args[0] === 'addEventListener') {
            args[1](({
              eventName: 'sectionChange'
            }));
          } else if (args[0] === 'getGPPData') {
            return cmpResponse;
          }
        }
      }

      beforeEach(function () {
        didHookReturn = false;
        window.__gpp = function () {};
      });

      afterEach(function () {
        config.resetConfig();
        cmpStub.restore();
        delete window.__gpp;
        resetConsentData();
      });

      it('should bypass CMP and simply use previously stored consentData', function () {
        let testConsentData = {
          applicableSections: [7],
          gppString: 'xyz',
        };

        cmpStub = sinon.stub(window, '__gpp').callsFake(mockCMP(testConsentData));
        setConsentConfig(goodConfig);
        requestBidsHook(() => {}, {});
        cmpStub.reset();

        requestBidsHook(() => {
          didHookReturn = true;
        }, {});
        let consent = gppDataHandler.getConsentData();

        expect(didHookReturn).to.be.true;
        expect(consent.gppString).to.equal(testConsentData.gppString);
        expect(consent.applicableSections).to.deep.equal(testConsentData.applicableSections);
        sinon.assert.notCalled(cmpStub);
      });
    });

    describe('iframe tests', function () {
      let cmpPostMessageCb = () => {};
      let stringifyResponse;

      function createIFrameMarker(frameName) {
        let ifr = document.createElement('iframe');
        ifr.width = 0;
        ifr.height = 0;
        ifr.name = frameName;
        document.body.appendChild(ifr);
        return ifr;
      }

      function creatCmpMessageHandler(prefix, returnEvtValue, returnGPPValue) {
        return function (event) {
          if (event && event.data) {
            let data = event.data;
            if (data[`${prefix}Call`]) {
              let callId = data[`${prefix}Call`].callId;
              let response;
              if (data[`${prefix}Call`].command === 'addEventListener') {
                response = {
                  [`${prefix}Return`]: {
                    callId,
                    returnValue: returnEvtValue,
                    success: true
                  }
                }
              } else if (data[`${prefix}Call`].command === 'getGPPData') {
                response = {
                  [`${prefix}Return`]: {
                    callId,
                    returnValue: returnGPPValue,
                    success: true
                  }
                }
              } else if (data[`${prefix}Call`].command === 'getSection') {
                response = {
                  [`${prefix}Return`]: {
                    callId,
                    returnValue: {},
                    success: true
                  }
                }
              }
              event.source.postMessage(stringifyResponse ? JSON.stringify(response) : response, '*');
            }
          }
        }
      }

      function testIFramedPage(testName, messageFormatString, tarConsentString, tarSections) {
        it(`should return the consent string from a postmessage + addEventListener response - ${testName}`, (done) => {
          stringifyResponse = messageFormatString;
          setConsentConfig(goodConfig);
          requestBidsHook(() => {
            let consent = gppDataHandler.getConsentData();
            sinon.assert.notCalled(utils.logError);
            expect(consent.gppString).to.equal(tarConsentString);
            expect(consent.applicableSections).to.deep.equal(tarSections);
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

      describe('workflow for iframe pages:', function () {
        stringifyResponse = false;
        let ifr2 = null;

        beforeEach(function () {
          ifr2 = createIFrameMarker('__gppLocator');
          cmpPostMessageCb = creatCmpMessageHandler('__gpp', {
            eventName: 'sectionChange'
          }, {
            gppString: 'abc12345234',
            applicableSections: [7]
          });
          window.addEventListener('message', cmpPostMessageCb, false);
        });

        afterEach(function () {
          delete window.__gpp; // deletes the local copy made by the postMessage CMP call function
          document.body.removeChild(ifr2);
          window.removeEventListener('message', cmpPostMessageCb);
        });

        testIFramedPage('with/JSON response', false, 'abc12345234', [7]);
        testIFramedPage('with/String response', true, 'abc12345234', [7]);
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

      describe('CMP workflow for normal pages:', function () {
        beforeEach(function () {
          window.__gpp = function () {};
        });

        afterEach(function () {
          delete window.__gpp;
        });

        it('performs lookup check and stores consentData for a valid existing user', function () {
          let testConsentData = {
            gppString: 'abc12345234',
            applicableSections: [7]
          };
          cmpStub = sinon.stub(window, '__gpp').callsFake((...args) => {
            if (args[0] === 'addEventListener') {
              args[1]({
                eventName: 'sectionChange'
              });
            } else if (args[0] === 'getGPPData') {
              return testConsentData;
            }
          });

          setConsentConfig(goodConfig);

          requestBidsHook(() => {
            didHookReturn = true;
          }, {});
          let consent = gppDataHandler.getConsentData();
          sinon.assert.notCalled(utils.logError);
          expect(didHookReturn).to.be.true;
          expect(consent.gppString).to.equal(testConsentData.gppString);
          expect(consent.applicableSections).to.deep.equal(testConsentData.applicableSections);
        });

        it('produces gdpr metadata', function () {
          let testConsentData = {
            gppString: 'abc12345234',
            applicableSections: [7]
          };
          cmpStub = sinon.stub(window, '__gpp').callsFake((...args) => {
            if (args[0] === 'addEventListener') {
              args[1]({
                eventName: 'sectionChange'
              });
            } else if (args[0] === 'getGPPData') {
              return testConsentData;
            }
          });

          setConsentConfig(goodConfig);

          requestBidsHook(() => {
            didHookReturn = true;
          }, {});
          let consentMeta = gppDataHandler.getConsentMeta();
          sinon.assert.notCalled(utils.logError);
          expect(consentMeta.generatedAt).to.be.above(1644367751709);
        });

        it('throws an error when processCmpData check fails + does not call requestBids callback', function () {
          let testConsentData = {};
          let bidsBackHandlerReturn = false;

          cmpStub = sinon.stub(window, '__gpp').callsFake((...args) => {
            if (args[0] === 'addEventListener') {
              args[1]({
                eventName: 'sectionChange'
              });
            } else if (args[0] === 'getGPPData') {
              return testConsentData;
            }
          });

          setConsentConfig(goodConfig);

          sinon.assert.notCalled(utils.logWarn);
          sinon.assert.notCalled(utils.logError);

          [utils.logWarn, utils.logError].forEach((stub) => stub.reset());

          requestBidsHook(() => {
            didHookReturn = true;
          }, {
            bidsBackHandler: () => bidsBackHandlerReturn = true
          });
          let consent = gppDataHandler.getConsentData();

          sinon.assert.calledOnce(utils.logError);
          sinon.assert.notCalled(utils.logWarn);
          expect(didHookReturn).to.be.false;
          expect(bidsBackHandlerReturn).to.be.true;
          expect(consent).to.be.null;
          expect(gppDataHandler.ready).to.be.true;
        });

        describe('when proper consent is not available', () => {
          let gppStub;

          function runAuction() {
            setConsentConfig({
              gpp: {
                cmpApi: 'iab',
                timeout: 10,
              }
            });
            return new Promise((resolve, reject) => {
              requestBidsHook(() => {
                didHookReturn = true;
              }, {});
              setTimeout(() => didHookReturn ? resolve() : reject(new Error('Auction did not run')), 20);
            })
          }

          function mockGppCmp(gppdata) {
            gppStub.callsFake((api, cb) => {
              if (api === 'addEventListener') {
                // eslint-disable-next-line standard/no-callback-literal
                cb({
                  pingData: {
                    cmpStatus: 'loaded'
                  }
                }, true);
              }
              if (api === 'getGPPData') {
                return gppdata;
              }
            });
          }

          beforeEach(() => {
            gppStub = sinon.stub(window, '__gpp');
          });

          afterEach(() => {
            gppStub.restore();
          })

          it('should continue auction with null consent when CMP is unresponsive', () => {
            return runAuction().then(() => {
              const consent = gppDataHandler.getConsentData();
              expect(consent.applicableSections).to.deep.equal([]);
              expect(consent.gppString).to.be.undefined;
              expect(gppDataHandler.ready).to.be.true;
            });
          });

          it('should use consent provided by events other than sectionChange', () => {
            mockGppCmp({
              gppString: 'mock-consent-string',
              applicableSections: [7]
            });
            return runAuction().then(() => {
              const consent = gppDataHandler.getConsentData();
              expect(consent.applicableSections).to.deep.equal([7]);
              expect(consent.gppString).to.equal('mock-consent-string');
              expect(gppDataHandler.ready).to.be.true;
            });
          });
        });
      });
    });
  });
});
