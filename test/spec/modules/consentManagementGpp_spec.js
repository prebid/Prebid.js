import {
  consentConfig,
  GPPClient,
  resetConsentData,
  setConsentConfig,
} from 'modules/consentManagementGpp.js';
import {gppDataHandler} from 'src/adapterManager.js';
import * as utils from 'src/utils.js';
import {config} from 'src/config.js';
import 'src/prebid.js';

const expect = require('chai').expect;

describe('consentManagementGpp', function () {
  beforeEach(resetConsentData);
  after(resetConsentData);

  async function runHook(request = {}) {
    let hookRan = false;
    consentConfig.requestBidsHook(() => {
      hookRan = true;
    }, request);
    try {
      await consentConfig.loadConsentData()
    } catch (e) {
    }
    return hookRan;
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
        await setConsentConfig({
          gpp: {}
        });
        expect(consentConfig.cmpHandler).to.be.equal('iab');
        expect(consentConfig.cmpTimeout).to.be.equal(10000);
        sinon.assert.callCount(utils.logInfo, 3);
      });

      it('should exit consent manager if config is not an object', async function () {
        await setConsentConfig('');
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
        const consentMetadata = gppDataHandler.getConsentMeta();
        expect(consentMetadata).to.be.undefined;
        sinon.assert.calledOnce(utils.logWarn);
      })

      it('should immediately look up consent data', async () => {
        await setConsentConfig({
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

      it('results in all user settings overriding system defaults', async function () {
        const allConfig = {
          gpp: {
            cmpApi: 'iab',
            timeout: 7500
          }
        };

        await setConsentConfig(allConfig);
        expect(consentConfig.cmpHandler).to.be.equal('iab');
        expect(consentConfig.cmpTimeout).to.be.equal(7500);
      });

      it('should recognize config.gpp, with default cmpApi and timeout', async function () {
        await setConsentConfig({
          gpp: {}
        });

        expect(consentConfig.cmpHandler).to.be.equal('iab');
        expect(consentConfig.cmpTimeout).to.be.equal(10000);
      });

      it('should enable gppDataHandler', async () => {
        await setConsentConfig({
          gpp: {}
        });
        expect(gppDataHandler.enabled).to.be.true;
      });
    });

    describe('static consent string setConsentConfig value', () => {
      afterEach(() => {
        config.resetConfig();
      });

      it('results in user settings overriding system defaults', async () => {
        const staticConfig = {
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

        await setConsentConfig(staticConfig);
        expect(consentConfig.cmpHandler).to.be.equal('static');
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
      gppDataHandler.enable();
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
          const pm = gppClient.init({signalStatus: 'not ready'}).catch((err) => err.args[0] !== 'done' && Promise.reject(err));
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
            const pm = gppClient.init({signalStatus: 'not ready'}).then(data => {
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
        });
      });
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

  describe('moduleConfig.requestBidsHook tests:', function () {
    const goodConfig = {
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

      it('should throw a warning and return to hooked function when an unknown CMP framework ID is used', async function () {
        const badCMPConfig = {
          gpp: {
            cmpApi: 'bad'
          }
        };
        await setConsentConfig(badCMPConfig);
        expect(consentConfig.cmpHandler).to.be.equal(badCMPConfig.gpp.cmpApi);
        expect(await runHook()).to.be.true;
        const consent = gppDataHandler.getConsentData();
        expect(consent).to.be.null;
        sinon.assert.calledOnce(utils.logWarn);
      });

      it('should call gppDataHandler.setConsentData() when unknown CMP api is used', async () => {
        await setConsentConfig({
          gpp: {
            cmpApi: 'invalid'
          }
        });
        expect(await runHook()).to.be.true;
        expect(gppDataHandler.ready).to.be.true;
      })

      it('should throw proper errors when CMP is not found', async function () {
        await setConsentConfig(goodConfig);
        expect(await runHook()).to.be.false;
        const consent = gppDataHandler.getConsentData();
        // throw 2 errors; one for no bidsBackHandler and for CMP not being found (this is an error due to gdpr config)
        sinon.assert.calledTwice(utils.logError);
        expect(consent).to.be.null;
        expect(gppDataHandler.ready).to.be.true;
      });

      it('should not trip when adUnits have no size', async () => {
        await setConsentConfig(staticConfig);
        const request = {
          adUnits: [{
            code: 'test',
            mediaTypes: {
              video: {}
            }
          }]
        };
        expect(await runHook(request)).to.be.true;
      });

      it('should continue the auction after timeout, if cmp does not reply', async () => {
        window.__gpp = function () {
        };
        await setConsentConfig({
          gpp: {
            cmpApi: 'iab',
            timeout: 10
          }
        });
        try {
          expect(await runHook()).to.be.true;
          const consent = gppDataHandler.getConsentData();
          expect(consent.applicableSections).to.deep.equal([]);
          expect(consent.gppString).to.be.undefined;
        } finally {
          delete window.__gpp;
        }
      });
    });

    describe('on CMP sectionChange events', () => {
      let pingData, triggerCMPEvent;
      beforeEach(() => {
        pingData = {
          applicableSections: [7],
          gppString: 'xyz',
        };
        triggerCMPEvent = null;
        window.__gpp = sinon.stub().callsFake(function (command, callback) {
          switch (command) {
            case 'addEventListener':
              triggerCMPEvent = (event, payload = {}) => callback({eventName: event, pingData: {...pingData, ...payload}})
              break;
            case 'ping':
              callback(pingData)
              break;
            default:
              throw new Error('unexpected __gpp invocation')
          }
        });
        setConsentConfig(goodConfig);
      });

      afterEach(() => {
        delete window.__gpp;
        resetConsentData();
      });

      function startHook() {
        let hookRan = false;
        consentConfig.requestBidsHook(() => {
          hookRan = true;
        }, {});
        return () => new Promise((resolve) => setTimeout(resolve(hookRan), 5));
      }

      it('should wait for signalStatus: ready', async () => {
        const didHookRun = startHook();
        expect(await didHookRun()).to.be.false;
        triggerCMPEvent('sectionChange', {signalStatus: 'not ready'});
        expect(await didHookRun()).to.be.false;
        triggerCMPEvent('sectionChange', {signalStatus: 'ready'});
        await consentConfig.loadConsentData();
        expect(await didHookRun()).to.be.true;
        expect(gppDataHandler.getConsentData().gppString).to.eql('xyz');
      });

      it('should re-use GPP data once ready', async () => {
        let didHookRun = startHook();
        await didHookRun();
        triggerCMPEvent('sectionChange', {signalStatus: 'ready'});
        await consentConfig.loadConsentData();
        window.__gpp.resetHistory();
        didHookRun = startHook();
        await consentConfig.loadConsentData();
        expect(await didHookRun()).to.be.true;
        sinon.assert.notCalled(window.__gpp);
      });

      it('after signalStatus: ready, should wait again for signalStatus: ready', async () => {
        let didHookRun = startHook();
        await didHookRun();
        triggerCMPEvent('sectionChange', {signalStatus: 'ready'});
        await consentConfig.loadConsentData();
        for (const run of ['first', 'second']) {
          triggerCMPEvent('cmpDisplayStatus', {signalStatus: 'not ready'});
          didHookRun = startHook();
          expect(await didHookRun()).to.be.false;
          triggerCMPEvent('sectionChange', {signalStatus: 'ready', gppString: run});
          await consentConfig.loadConsentData();
          expect(await didHookRun()).to.be.true;
          expect(gppDataHandler.getConsentData().gppString).to.eql(run);
        }
      });
    })
  });
});
