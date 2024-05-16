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
  describe('GPPClient.ping', () => {
    function mkPingData(gppVersion) {
      return {
        gppVersion
      }
    }
    Object.entries({
      'unknown': {
        expectedMode: MODE_CALLBACK,
        pingData: mkPingData(),
        apiVersion: '1.1',
        client({callback}) {
          callback(this.pingData);
        }
      },
      '1.0': {
        expectedMode: MODE_MIXED,
        pingData: mkPingData('1.0'),
        apiVersion: '1.0',
        client() {
          return this.pingData;
        }
      },
      '1.1 that runs callback immediately': {
        expectedMode: MODE_CALLBACK,
        pingData: mkPingData('1.1'),
        apiVersion: '1.1',
        client({callback}) {
          callback(this.pingData);
        }
      },
      '1.1 that defers callback': {
        expectedMode: MODE_CALLBACK,
        pingData: mkPingData('1.1'),
        apiVersion: '1.1',
        client({callback}) {
          setTimeout(() => callback(this.pingData), 10);
        }
      },
      '> 1.1': {
        expectedMode: MODE_CALLBACK,
        pingData: mkPingData('1.2'),
        apiVersion: '1.1',
        client({callback}) {
          setTimeout(() => callback(this.pingData), 10);
        }
      }
    }).forEach(([t, scenario]) => {
      describe(`using CMP version ${t}`, () => {
        let clients, mkClient;
        beforeEach(() => {
          clients = [];
          mkClient = ({mode}) => {
            const mockClient = function (args) {
              if (args.command === 'ping') {
                return Promise.resolve(scenario.client(args));
              }
            }
            mockClient.mode = mode;
            mockClient.close = sinon.stub();
            clients.push(mockClient);
            return mockClient;
          }
        });

        it('should resolve to client with the correct mode', () => {
          return GPPClient.ping(mkClient).then(([client]) => {
            expect(client.cmp.mode).to.eql(scenario.expectedMode);
          });
        });

        it('should resolve to pingData', () => {
          return GPPClient.ping(mkClient).then(([_, pingData]) => {
            expect(pingData).to.eql(scenario.pingData);
          });
        });

        it('should .close the probing client', () => {
          return GPPClient.ping(mkClient).then(([client]) => {
            sinon.assert.called(clients[0].close);
            sinon.assert.notCalled(client.cmp.close);
          })
        });

        it('should .tag the client with version', () => {
          return GPPClient.ping(mkClient).then(([client]) => {
            expect(client.apiVersion).to.eql(scenario.apiVersion);
          })
        })
      })
    });

    it('should reject when mkClient returns null (CMP not found)', () => {
      return GPPClient.ping(() => null).catch((err) => {
        expect(err.message).to.match(/not found/);
      });
    });

    it('should reject when client rejects', () => {
      const err = {some: 'prop'};
      const mockClient = () => Promise.reject(err);
      mockClient.close = sinon.stub();
      return GPPClient.ping(() => mockClient).catch((result) => {
        expect(result).to.eql(err);
        sinon.assert.called(mockClient.close);
      });
    });

    it('should reject when callback is invoked with success = false', () => {
      const err = 'error';
      const mockClient = ({callback}) => callback(err, false);
      mockClient.close = sinon.stub();
      return GPPClient.ping(() => mockClient).catch((result) => {
        expect(result).to.eql(err);
        sinon.assert.called(mockClient.close);
      })
    })
  });

  describe('GPPClient.init', () => {
    let makeCmp, cmpCalls, cmpResult;

    beforeEach(() => {
      cmpResult = {signalStatus: 'ready', gppString: 'mock-str'};
      cmpCalls = [];
      makeCmp = sinon.stub().callsFake(() => {
        function mockCmp(args) {
          cmpCalls.push(args);
          return GreedyPromise.resolve(cmpResult);
        }
        mockCmp.close = sinon.stub();
        return mockCmp;
      });
    });

    it('should re-use same client', (done) => {
      GPPClient.init(makeCmp).then(([client]) => {
        GPPClient.init(makeCmp).then(([client2, consentPm]) => {
          expect(client2).to.equal(client);
          expect(cmpCalls.filter((el) => el.command === 'ping').length).to.equal(2) // recycled client should be refreshed
          consentPm.then((consent) => {
            expect(consent.gppString).to.eql('mock-str');
            done()
          })
        });
      });
    });

    it('should not re-use errors', (done) => {
      cmpResult = GreedyPromise.reject(new Error());
      GPPClient.init(makeCmp).catch(() => {
        cmpResult = {signalStatus: 'ready'};
        return GPPClient.init(makeCmp).then(([client]) => {
          expect(client).to.exist;
          done()
        })
      })
    })
  })

  describe('GPP client', () => {
    const CHANGE_EVENTS = ['sectionChange', 'signalStatus'];

    let gppClient, gppData, cmpReady, eventListener;

    function mockClient(apiVersion = '1.1', cmpVersion = '1.1') {
      const mockCmp = sinon.stub().callsFake(function ({command, callback}) {
        if (command === 'addEventListener') {
          eventListener = callback;
        } else {
          throw new Error('unexpected command: ' + command);
        }
      })
      const client = new GPPClient(cmpVersion, mockCmp);
      client.apiVersion = apiVersion;
      client.getGPPData = sinon.stub().callsFake(() => Promise.resolve(gppData));
      client.isCMPReady = sinon.stub().callsFake(() => cmpReady);
      client.events = CHANGE_EVENTS;
      return client;
    }

    beforeEach(() => {
      gppDataHandler.reset();
      eventListener = null;
      cmpReady = true;
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
        return gppClient.updateConsent().then(data => {
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
          gppData = data;
          gppClient.updateConsent().catch(err => {
            expect(err.message).to.match(/empty/);
            expect(err.args).to.eql(data == null ? [] : [data]);
            expect(gppDataHandler.ready).to.be.false;
            done()
          })
        });
      })

      it('should not update when gpp data rejects', (done) => {
        gppData = Promise.reject(new Error('err'));
        gppClient.updateConsent().catch(err => {
          expect(gppDataHandler.ready).to.be.false;
          expect(err.message).to.eql('err');
          done();
        })
      });

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
                  gppClient.updateConsent().catch(err => {
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
      beforeEach(() => {
        gppClient.isCMPReady = function (pingData) {
          return pingData.ready;
        }
        gppClient.getGPPData = function (pingData) {
          return Promise.resolve(pingData);
        }
      })

      it('does not use initial pingData if CMP is not ready', () => {
        gppClient.init({...gppData, ready: false});
        expect(eventListener).to.exist;
        expect(gppDataHandler.ready).to.be.false;
      });

      it('uses initial pingData (and resolves promise) if CMP is ready', () => {
        return gppClient.init({...gppData, ready: true}).then(data => {
          expect(eventListener).to.exist;
          sinon.assert.match(data, gppData);
          sinon.assert.match(gppDataHandler.getConsentData(), gppData);
        })
      });

      it('rejects promise when CMP errors out', (done) => {
        gppClient.init({ready: false}).catch((err) => {
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
          let pm = gppClient.init({ready: false}).catch((err) => err.args[0] !== 'done' && Promise.reject(err));
          eventListener(evt);
          eventListener('done', false);
          return pm;
        })
      });

      it('rejects the promise when cmpStatus is "error"', (done) => {
        const evt = {eventName: 'other', pingData: {cmpStatus: 'error'}};
        gppClient.init({ready: false}).catch(err => {
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
            gppClient.init({ready: false}).catch(() => {
              expect(gppDataHandler.ready).to.be.false;
              done();
            });
            eventListener({...gppData2, ready: false});
            eventListener('done', false);
          })

          it('fires consent data updates (and resolves promise) if CMP is ready', (done) => {
            gppClient.init({ready: false}).then(data => {
              sinon.assert.match(data, gppData2);
              done()
            });
            cmpReady = true;
            eventListener(makeEvent({...gppData2, ready: true}));
          });

          it('keeps updating consent data on new events', () => {
            let pm = gppClient.init({ready: false}).then(data => {
              sinon.assert.match(data, gppData);
              sinon.assert.match(gppDataHandler.getConsentData(), gppData);
            });
            eventListener(makeEvent({...gppData, ready: true}));
            return pm.then(() => {
              eventListener(makeEvent({...gppData2, ready: true}))
            }).then(() => {
              sinon.assert.match(gppDataHandler.getConsentData(), gppData2);
            });
          });
        })
      })
    });
  });

  describe('GPP 1.0 protocol', () => {
    let mockCmp, gppClient;
    beforeEach(() => {
      mockCmp = sinon.stub();
      gppClient = new (GPPClient.getClient('1.0'))('1.0', mockCmp);
    });

    describe('isCMPReady', () => {
      Object.entries({
        'loaded': [true, 'loaded'],
        'other': [false, 'other'],
        'undefined': [false, undefined]
      }).forEach(([t, [expected, cmpStatus]]) => {
        it(`should be ${expected} when cmpStatus is ${t}`, () => {
          expect(gppClient.isCMPReady(Object.assign({}, {cmpStatus}))).to.equal(expected);
        });
      });
    });

    describe('getGPPData', () => {
      let gppData, pingData;
      beforeEach(() => {
        gppData = {
          gppString: 'mock-string',
          supportedAPIs: ['usnat'],
          applicableSections: [7, 8]
        }
        pingData = {
          supportedAPIs: gppData.supportedAPIs
        };
      });

      function mockCmpCommands(commands) {
        mockCmp.callsFake(({command, parameter}) => {
          if (commands.hasOwnProperty((command))) {
            return Promise.resolve(commands[command](parameter));
          } else {
            return Promise.reject(new Error(`unrecognized command ${command}`))
          }
        })
      }

      it('should retrieve consent string and applicableSections', () => {
        mockCmpCommands({
          getGPPData: () => gppData
        })
        return gppClient.getGPPData(pingData).then(data => {
          sinon.assert.match(data, gppData);
        })
      });

      it('should reject when getGPPData rejects', (done) => {
        mockCmpCommands({
          getGPPData: () => Promise.reject(new Error('err'))
        });
        gppClient.getGPPData(pingData).catch(err => {
          expect(err.message).to.eql('err');
          done();
        });
      });

      it('should not choke if supportedAPIs is missing', () => {
        [gppData, pingData].forEach(ob => { delete ob.supportedAPIs; })
        mockCmpCommands({
          getGPPData: () => gppData
        });
        return gppClient.getGPPData(pingData).then(res => {
          expect(res.gppString).to.eql(gppData.gppString);
          expect(res.parsedSections).to.eql({});
        })
      })

      describe('section data', () => {
        let usnat, parsedUsnat;

        function mockSections(sections) {
          mockCmpCommands({
            getGPPData: () => gppData,
            getSection: (api) => (sections[api])
          });
        };

        beforeEach(() => {
          usnat = {
            MockField: 'val',
            OtherField: 'o',
            Gpc: true
          };
          parsedUsnat = [
            {
              MockField: 'val',
              OtherField: 'o'
            },
            {
              SubsectionType: 1,
              Gpc: true
            }
          ]
        });

        it('retrieves section data', () => {
          mockSections({usnat});
          return gppClient.getGPPData(pingData).then(data => {
            expect(data.parsedSections).to.eql({usnat: parsedUsnat})
          });
        });

        it('does not choke if a section is missing', () => {
          mockSections({usnat});
          gppData.supportedAPIs = ['usnat', 'missing'];
          return gppClient.getGPPData(pingData).then(data => {
            expect(data.parsedSections).to.eql({usnat: parsedUsnat});
          })
        });

        it('does not choke if a section fails', () => {
          mockSections({usnat, err: Promise.reject(new Error('err'))});
          gppData.supportedAPIs = ['usnat', 'err'];
          return gppClient.getGPPData(pingData).then(data => {
            expect(data.parsedSections).to.eql({usnat: parsedUsnat});
          })
        });
      })
    });
  });

  describe('GPP 1.1 protocol', () => {
    let mockCmp, gppClient;
    beforeEach(() => {
      mockCmp = sinon.stub();
      gppClient = new (GPPClient.getClient('1.1'))('1.1', mockCmp);
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

    it('gets GPPData from pingData', () => {
      mockCmp.throws(new Error());
      const pingData = {
        'gppVersion': '1.1',
        'cmpStatus': 'loaded',
        'cmpDisplayStatus': 'disabled',
        'supportedAPIs': [
          '5:tcfcav1',
          '7:usnat',
          '8:usca',
          '9:usva',
          '10:usco',
          '11:usut',
          '12:usct'
        ],
        'signalStatus': 'ready',
        'cmpId': 31,
        'sectionList': [
          7
        ],
        'applicableSections': [
          7
        ],
        'gppString': 'DBABL~BAAAAAAAAgA.QA',
        'parsedSections': {
          'usnat': [
            {
              'Version': 1,
              'SharingNotice': 0,
              'SaleOptOutNotice': 0,
              'SharingOptOutNotice': 0,
              'TargetedAdvertisingOptOutNotice': 0,
              'SensitiveDataProcessingOptOutNotice': 0,
              'SensitiveDataLimitUseNotice': 0,
              'SaleOptOut': 0,
              'SharingOptOut': 0,
              'TargetedAdvertisingOptOut': 0,
              'SensitiveDataProcessing': [
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0
              ],
              'KnownChildSensitiveDataConsents': [
                0,
                0
              ],
              'PersonalDataConsents': 0,
              'MspaCoveredTransaction': 2,
              'MspaOptOutOptionMode': 0,
              'MspaServiceProviderMode': 0
            },
            {
              'SubsectionType': 1,
              'Gpc': false
            }
          ]
        }
      };
      return gppClient.getGPPData(pingData).then((gppData) => {
        sinon.assert.match(gppData, {
          gppString: pingData.gppString,
          applicableSections: pingData.applicableSections,
          parsedSections: pingData.parsedSections
        })
      })
    })
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
