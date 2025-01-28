import {
  consentTimeout,
  GPPClient,
  requestBidsHook,
  resetConsentData,
  setConsentConfig,
  userCMP
} from 'modules/consentManagementGpp.js';
import {gppDataHandler} from 'src/adapterManager.js';
import * as utils from 'src/utils.js';
import {config} from 'src/config.js';
import 'src/prebid.js';
import {MODE_CALLBACK, MODE_MIXED} from '../../../libraries/cmp/cmpClient.js';
import {GreedyPromise} from '../../../src/utils/promise.js';

let expect = require('chai').expect;

describe('consentManagementGpp', function () {
  beforeEach(resetConsentData);

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

    describe('static consent string setConsentConfig value', () => {
      afterEach(() => {
        config.resetConfig();
      });

      it('results in user settings overriding system defaults', () => {
        let staticConfig = {
          gpp: {
            cmpApi: 'static',
            timeout: 7500,
            consentData: {
              applicableSections: [7],
              gppString: 'ABCDEFG1234',
              gppVersion: 1,
              sectionId: 3,
              sectionList: [],
              parsedSections: {
                usnat: [
                  {
                    MockUsnatParsedFlag: true
                  },
                ]
              },
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

  describe('GPPClient.get', () => {
    let makeCmp;

    beforeEach(() => {
      makeCmp = sinon.stub().callsFake(() => {
        return sinon.stub()
      });
    });

    it('should re-use same client', () => {
      expect(GPPClient.get(makeCmp)).to.equal(GPPClient.get(makeCmp));
      sinon.assert.calledOnce(makeCmp);
    });

    it('should not re-use errors', () => {
      try {
        GPPClient.get(sinon.stub().throws(new Error()));
      } catch (e) {}
      expect(GPPClient.get(makeCmp)).to.exist;
    })
  })

  describe('GPP client', () => {
    const CHANGE_EVENTS = ['sectionChange', 'signalStatus'];

    let gppClient, gppData, eventListener;

    function mockClient(apiVersion = '1.1', cmpVersion = '1.1') {
      const mockCmp = sinon.stub().callsFake(function ({command, callback}) {
        if (command === 'addEventListener') {
          eventListener = callback;
        } else {
          throw new Error('unexpected command: ' + command);
        }
      })
      const client = new GPPClient(mockCmp);
      client.apiVersion = apiVersion;
      client.events = CHANGE_EVENTS;
      return client;
    }

    beforeEach(() => {
      gppDataHandler.reset();
      eventListener = null;
      gppData = {
        applicableSections: [7],
        gppString: 'mock-string',
        parsedSections: {
          usnat: [
            {
              Field: 'val'
            },
            {
              SubsectionType: 1,
              Gpc: false
            }
          ]
        }
      };
      gppClient = mockClient();
    });

    describe('updateConsent', () => {
      it('should update data handler with consent data', () => {
        return gppClient.updateConsent(gppData).then(data => {
          sinon.assert.match(data, gppData);
          sinon.assert.match(gppDataHandler.getConsentData(), gppData);
          expect(gppDataHandler.ready).to.be.true;
        });
      });

      Object.entries({
        'emtpy': {},
        'missing': null
      }).forEach(([t, data]) => {
        it(`should not update, and reject promise, when gpp data is ${t}`, (done) => {
          gppClient.updateConsent(data).catch(err => {
            expect(err.message).to.match(/empty/);
            expect(err.args).to.eql(data == null ? [] : [data]);
            expect(gppDataHandler.ready).to.be.false;
            done()
          })
        });
      })

      describe('consent data validation', () => {
        Object.entries({
          applicableSections: {
            'not an array': 'not-an-array',
          },
          gppString: {
            'not a string': 234
          },
          parsedSections: {
            'not an object': 'not-an-object'
          }
        }).forEach(([prop, tests]) => {
          describe(`validation: when ${prop} is`, () => {
            Object.entries(tests).forEach(([t, value]) => {
              describe(t, () => {
                it('should not update', (done) => {
                  Object.assign(gppData, {[prop]: value});
                  gppClient.updateConsent(gppData).catch(err => {
                    expect(err.message).to.match(/unexpected/);
                    expect(err.args).to.eql([gppData]);
                    expect(gppDataHandler.ready).to.be.false;
                    done();
                  });
                });
              })
            });
          });
        });
      });
    });

    describe('init', () => {
      it('does not use initial pingData if CMP is not ready', () => {
        gppClient.init({...gppData, signalStatus: 'not ready'});
        expect(eventListener).to.exist;
        expect(gppDataHandler.ready).to.be.false;
      });

      it('uses initial pingData (and resolves promise) if CMP is ready', () => {
        return gppClient.init({...gppData, signalStatus: 'ready'}).then(data => {
          expect(eventListener).to.exist;
          sinon.assert.match(data, gppData);
          sinon.assert.match(gppDataHandler.getConsentData(), gppData);
        })
      });

      it('rejects promise when CMP errors out', (done) => {
        gppClient.init({signalStatus: 'not ready'}).catch((err) => {
          expect(err.message).to.match(/error/);
          expect(err.args).to.eql(['error'])
          done();
        });
        eventListener('error', false);
      });

      Object.entries({
        'empty': {},
        'null': null,
        'irrelevant': {eventName: 'irrelevant'}
      }).forEach(([t, evt]) => {
        it(`ignores ${t} events`, () => {
          let pm = gppClient.init({signalStatus: 'not ready'}).catch((err) => err.args[0] !== 'done' && Promise.reject(err));
          eventListener(evt);
          eventListener('done', false);
          return pm;
        })
      });

      it('rejects the promise when cmpStatus is "error"', (done) => {
        const evt = {eventName: 'other', pingData: {cmpStatus: 'error'}};
        gppClient.init({signalStatus: 'not ready'}).catch(err => {
          expect(err.message).to.match(/error/);
          expect(err.args).to.eql([evt]);
          done();
        });
        eventListener(evt);
      })

      CHANGE_EVENTS.forEach(evt => {
        describe(`event: ${evt}`, () => {
          function makeEvent(pingData) {
            return {
              eventName: evt,
              pingData
            }
          }

          let gppData2
          beforeEach(() => {
            gppData2 = Object.assign(gppData, {gppString: '2nd'});
          });

          it('does not fire consent data updates if the CMP is not ready', (done) => {
            gppClient.init({signalStatus: 'not ready'}).catch(() => {
              expect(gppDataHandler.ready).to.be.false;
              done();
            });
            eventListener({...gppData2, signalStatus: 'not ready'});
            eventListener('done', false);
          })

          it('fires consent data updates (and resolves promise) if CMP is ready', (done) => {
            gppClient.init({signalStatus: 'not ready'}).then(data => {
              sinon.assert.match(data, gppData2);
              done()
            });
            eventListener(makeEvent({...gppData2, signalStatus: 'ready'}));
          });

          it('keeps updating consent data on new events', () => {
            let pm = gppClient.init({signalStatus: 'not ready'}).then(data => {
              sinon.assert.match(data, gppData);
              sinon.assert.match(gppDataHandler.getConsentData(), gppData);
            });
            eventListener(makeEvent({...gppData, signalStatus: 'ready'}));
            return pm.then(() => {
              eventListener(makeEvent({...gppData2, signalStatus: 'ready'}))
            }).then(() => {
              sinon.assert.match(gppDataHandler.getConsentData(), gppData2);
            });
          });
        })
      })
    });
  });

  describe('GPP 1.1 protocol', () => {
    let mockCmp, gppClient;
    beforeEach(() => {
      mockCmp = sinon.stub();
      gppClient = new GPPClient(mockCmp);
    });

    describe('isCMPReady', () => {
      Object.entries({
        'ready': [true, 'ready'],
        'not ready': [false, 'not ready'],
        'undefined': [false, undefined]
      }).forEach(([t, [expected, signalStatus]]) => {
        it(`should be ${expected} when signalStatus is ${t}`, () => {
          expect(gppClient.isCMPReady(Object.assign({}, {signalStatus}))).to.equal(expected);
        });
      });
    });
  })

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
        window.__gpp = function () {};
        setConsentConfig({
          gpp: {
            cmpApi: 'iab',
            timeout: 0
          }
        });
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

      function mockCMP(pingData) {
        return function (command, callback) {
          switch (command) {
            case 'addEventListener':
              // eslint-disable-next-line standard/no-callback-literal
              callback({eventName: 'sectionChange', pingData})
              break;
            case 'ping':
              callback(pingData)
              break;
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

        cmpStub = sinon.stub(window, '__gpp').callsFake(mockCMP({...testConsentData, signalStatus: 'ready'}));
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
  });
});
