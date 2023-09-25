import { ftrackIdSubmodule } from 'modules/ftrackIdSystem.js';
import * as utils from 'src/utils.js';
import { uspDataHandler } from 'src/adapterManager.js';
import { loadExternalScript } from 'src/adloader.js';
import { getGlobal } from 'src/prebidGlobal.js';
import { init, setSubmoduleRegistry } from 'modules/userId/index.js';
import {createEidsArray} from 'modules/userId/eids.js';
import {config} from 'src/config.js';
let expect = require('chai').expect;

let server;

let configMock = {
  name: 'ftrack',
  params: {
    url: 'https://d9.flashtalking.com/d9core',
    ids: {
      'device id': true,
      'single device id': true
    }
  },
  storage: {
    name: 'ftrackId',
    type: 'html5',
    expires: 90,
    refreshInSeconds: 8 * 3600
  },
  debug: true
};

let consentDataMock = {
  gdprApplies: 0,
  consentString: '<CONSENT_STRING>'
};

describe('FTRACK ID System', () => {
  describe(`Global Module Rules`, () => {
    it(`should not use the "PREBID_GLOBAL" variable nor otherwise obtain a pointer to the global PBJS object`, () => {
      expect((/PREBID_GLOBAL/gi).test(JSON.stringify(ftrackIdSubmodule))).to.not.be.ok;
    });
  });

  describe('ftrackIdSubmodule.isConfigOk():', () => {
    let logWarnStub;
    let logErrorStub;

    beforeEach(() => {
      logWarnStub = sinon.stub(utils, 'logWarn');
      logErrorStub = sinon.stub(utils, 'logError');
    });

    afterEach(() => {
      logWarnStub.restore();
      logErrorStub.restore();
    });

    it(`should be rejected if 'config.storage' property is missing`, () => {
      let configMock1 = JSON.parse(JSON.stringify(configMock));
      delete configMock1.storage;
      delete configMock1.params;

      ftrackIdSubmodule.isConfigOk(configMock1);
      expect(logErrorStub.args[0][0]).to.equal(`FTRACK - config.storage required to be set.`);
    });

    it(`should be rejected if 'config.storage.name' property is missing`, () => {
      let configMock1 = JSON.parse(JSON.stringify(configMock));
      delete configMock1.storage.name;

      ftrackIdSubmodule.isConfigOk(configMock1);
      expect(logErrorStub.args[0][0]).to.equal(`FTRACK - config.storage required to be set.`);
    });

    it(`should be rejected if 'config.storage.name' is not 'ftrackId'`, () => {
      let configMock1 = JSON.parse(JSON.stringify(configMock));
      configMock1.storage.name = 'not-ftrack';

      ftrackIdSubmodule.isConfigOk(configMock1);
      expect(logWarnStub.args[0][0]).to.equal(`FTRACK - config.storage.name recommended to be "ftrackId".`);
    });

    it(`should be rejected if 'congig.storage.type' property is missing`, () => {
      let configMock1 = JSON.parse(JSON.stringify(configMock));
      delete configMock1.storage.type;

      ftrackIdSubmodule.isConfigOk(configMock1);
      expect(logErrorStub.args[0][0]).to.equal(`FTRACK - config.storage required to be set.`);
    });

    it(`should be rejected if 'config.storage.type' is not 'html5'`, () => {
      let configMock1 = JSON.parse(JSON.stringify(configMock));
      configMock1.storage.type = 'not-html5';

      ftrackIdSubmodule.isConfigOk(configMock1);
      expect(logWarnStub.args[0][0]).to.equal(`FTRACK - config.storage.type recommended to be "html5".`);
    });

    it(`should be rejected if 'config.params.url' does not exist`, () => {
      let configMock1 = JSON.parse(JSON.stringify(configMock));
      delete configMock1.params.url;

      ftrackIdSubmodule.isConfigOk(configMock1);
      expect(logWarnStub.args[0][0]).to.equal(`FTRACK - config.params.url is required for ftrack to run.`);
    });
  });

  describe(`ftrackIdSubmodule.isThereConsent():`, () => {
    let uspDataHandlerStub;
    beforeEach(() => {
      uspDataHandlerStub = sinon.stub(uspDataHandler, 'getConsentData');
    });

    afterEach(() => {
      uspDataHandlerStub.restore();
    });

    describe(`returns 'false' if:`, () => {
      it(`GDPR: if gdprApplies is truthy`, () => {
        expect(ftrackIdSubmodule.isThereConsent({gdprApplies: 1})).to.not.be.ok;
        expect(ftrackIdSubmodule.isThereConsent({gdprApplies: true})).to.not.be.ok;
      });

      it(`US_PRIVACY version 1: if 'Opt Out Sale' is 'Y'`, () => {
        uspDataHandlerStub.returns('1YYY');
        expect(ftrackIdSubmodule.isThereConsent({})).to.not.be.ok;
      });
    });

    describe(`returns 'true' if`, () => {
      it(`GDPR: if gdprApplies is undefined, false or 0`, () => {
        expect(ftrackIdSubmodule.isThereConsent({gdprApplies: 0})).to.be.ok;
        expect(ftrackIdSubmodule.isThereConsent({gdprApplies: false})).to.be.ok;
        expect(ftrackIdSubmodule.isThereConsent({gdprApplies: null})).to.be.ok;
        expect(ftrackIdSubmodule.isThereConsent({})).to.be.ok;
      });

      it(`US_PRIVACY version 1: if 'Opt Out Sale' is not 'Y' ('N','-')`, () => {
        uspDataHandlerStub.returns('1NNN');
        expect(ftrackIdSubmodule.isThereConsent(null)).to.be.ok;

        uspDataHandlerStub.returns('1---');
        expect(ftrackIdSubmodule.isThereConsent(null)).to.be.ok;
      });
    });
  });

  describe('getId() method', () => {
    it(`should be using the StorageManager to set cookies or localstorage, as opposed to doing it directly`, () => {
      expect((/localStorage/gi).test(JSON.stringify(ftrackIdSubmodule))).to.not.be.ok;
      expect((/cookie/gi).test(JSON.stringify(ftrackIdSubmodule))).to.not.be.ok;
    });

    it(`should be the only method that gets a new ID aka hits the D9 endpoint`, () => {
      ftrackIdSubmodule.getId(configMock, null, null).callback(() => {});
      expect(loadExternalScript.called).to.be.ok;
      expect(loadExternalScript.args[0][0]).to.deep.equal('https://d9.flashtalking.com/d9core');
      loadExternalScript.resetHistory();

      ftrackIdSubmodule.decode('value', configMock);
      expect(loadExternalScript.called).to.not.be.ok;
      expect(loadExternalScript.args).to.deep.equal([]);
      loadExternalScript.resetHistory();

      ftrackIdSubmodule.extendId(configMock, null, {cache: {id: ''}});
      expect(loadExternalScript.called).to.not.be.ok;
      expect(loadExternalScript.args).to.deep.equal([]);

      loadExternalScript.restore();
    });

    describe(`should use the "ids" setting in the config:`, () => {
      it(`should use default IDs if config.params.id is not populated`, () => {
        let configMock1 = JSON.parse(JSON.stringify(configMock));
        delete configMock1.params.ids;
        ftrackIdSubmodule.getId(configMock1, null, null).callback(() => {});

        expect(window.D9r).to.have.property('DeviceID', true);
        expect(window.D9r).to.have.property('SingleDeviceID', true);
        expect(window.D9r).to.not.have.property('HHID');
      });

      describe(`should use correct ID settings if config.params.id is populated`, () => {
        it(`- any ID set as strings should not be added to window.D9r`, () => {
          let configMock1 = JSON.parse(JSON.stringify(configMock));
          configMock1.params.ids['device id'] = 'test device ID';
          configMock1.params.ids['single device id'] = 'test single device ID';
          configMock1.params.ids['household id'] = 'test household ID';
          ftrackIdSubmodule.getId(configMock1, null, null).callback(() => {});

          expect(window.D9r).to.not.have.property('DeviceID');
          expect(window.D9r).to.not.have.property('SingleDeviceID');
          expect(window.D9r).to.not.have.property('HHID');
        })

        it(`- any ID set to false should not be added to window.D9r`, () => {
          let configMock1 = JSON.parse(JSON.stringify(configMock));
          configMock1.params.ids['device id'] = false;
          configMock1.params.ids['single device id'] = false;
          configMock1.params.ids['household id'] = false;
          ftrackIdSubmodule.getId(configMock1, null, null).callback(() => {});

          expect(window.D9r).to.not.have.property('DeviceID');
          expect(window.D9r).to.not.have.property('SingleDeviceID');
          expect(window.D9r).to.not.have.property('HHID');
        });

        it(`- only device id`, () => {
          let configMock1 = JSON.parse(JSON.stringify(configMock));
          delete configMock1.params.ids['single device id'];
          ftrackIdSubmodule.getId(configMock1, null, null).callback(() => {});

          expect(window.D9r).to.have.property('DeviceID', true);
          expect(window.D9r).to.not.have.property('SingleDeviceID');
          expect(window.D9r).to.not.have.property('HHID');
        });

        it(`- only single device id`, () => {
          let configMock1 = JSON.parse(JSON.stringify(configMock));
          delete configMock1.params.ids['device id'];
          ftrackIdSubmodule.getId(configMock1, null, null).callback(() => {});

          expect(window.D9r).to.not.have.property('DeviceID');
          expect(window.D9r).to.have.property('SingleDeviceID', true);
          expect(window.D9r).to.not.have.property('HHID');
        });

        it(`- only household ID`, () => {
          let configMock1 = JSON.parse(JSON.stringify(configMock));
          delete configMock1.params.ids['device id'];
          delete configMock1.params.ids['single device id'];
          configMock1.params.ids['household id'] = true;
          ftrackIdSubmodule.getId(configMock1, null, null).callback(() => {});

          expect(window.D9r).to.not.have.property('DeviceID');
          expect(window.D9r).to.not.have.property('SingleDeviceID');
          expect(window.D9r).to.have.property('HHID', true);
        });
      });
    })

    it(`should populate localstorage and return the IDS (end-to-end test)`, () => {
      let ftrackId,
        ftrackIdExp,
        forceCallback = false;

      // Confirm that our item is not in localStorage yet
      expect(window.localStorage.getItem('ftrack-rtd')).to.not.be.ok;
      expect(window.localStorage.getItem('ftrack-rtd_exp')).to.not.be.ok;

      ftrackIdSubmodule.getId(configMock, consentDataMock, null).callback(() => {});
      return new Promise(function(resolve, reject) {
        window.testTimer = function () {
          // Sinon fake server is NOT changing the readyState to 4, so instead
          // we are forcing the callback to run and just passing in the expected Object
          if (!forceCallback && window.hasOwnProperty('D9r')) {
            window.D9r.callback({ 'DeviceID': ['<DEVICE_ID>'], 'SingleDeviceID': ['<SINGLE_DEVICE_ID>'] });
            forceCallback = true;
          }

          ftrackId = window.localStorage.getItem('ftrackId');
          ftrackIdExp = window.localStorage.getItem('ftrackId_exp');

          if (!!ftrackId && !!ftrackIdExp) {
            expect(window.localStorage.getItem('ftrackId')).to.be.ok;
            expect(window.localStorage.getItem('ftrackId_exp')).to.be.ok;
            resolve();
          } else {
            window.setTimeout(window.testTimer, 25);
          }
        };
        window.testTimer();
      });
    });
  });

  describe(`decode() method`, () => {
    it(`should respond with an object with the key 'ftrackId'`, () => {
      const MOCK_VALUE_STRINGS = {
          HHID: 'household_test_id',
          DeviceID: 'device_test_id',
          SingleDeviceID: 'single_device_test_id'
        },
        MOCK_VALUE_ARRAYS = {
          HHID: ['household_test_id', 'a', 'b'],
          DeviceID: ['device_test_id', 'c', 'd'],
          SingleDeviceID: ['single_device_test_id', 'e', 'f']
        },
        MOCK_VALUE_BOTH = {
          foo: ['foo', 'a', 'b'],
          bar: 'bar',
          baz: ['baz', 'baz', 'baz']
        };

      // strings are just passed through
      expect(ftrackIdSubmodule.decode(MOCK_VALUE_STRINGS, configMock)).to.deep.equal({
        ftrackId: {
          ext: {
            HHID: 'household_test_id',
            DeviceID: 'device_test_id',
            SingleDeviceID: 'single_device_test_id'
          },
          uid: 'device_test_id',
        },
      });

      // arrays are converted to strings
      expect(ftrackIdSubmodule.decode(MOCK_VALUE_ARRAYS, configMock)).to.deep.equal({
        ftrackId: {
          ext: {
            HHID: 'household_test_id|a|b',
            DeviceID: 'device_test_id|c|d',
            SingleDeviceID: 'single_device_test_id|e|f'
          },
          uid: 'device_test_id|c|d',
        },
      });

      // mix of both but uid should be empty string because DeviceId is not defined
      expect(ftrackIdSubmodule.decode(MOCK_VALUE_BOTH, configMock)).to.deep.equal({
        ftrackId: {
          ext: {
            foo: 'foo|a|b',
            bar: 'bar',
            baz: 'baz|baz|baz'
          },
          uid: '',
        },
      });
    });

    it(`should not be making requests to retrieve a new ID, it should just be decoding a response`, () => {
      server = sinon.createFakeServer();
      ftrackIdSubmodule.decode('value', configMock);

      expect(server.requests).to.have.length(0);

      server.restore();
    })
  });

  describe(`extendId() method`, () => {
    it(`should not be making requests to retrieve a new ID, it should just be adding additional data to the id object`, () => {
      server = sinon.createFakeServer();
      ftrackIdSubmodule.extendId(configMock, null, {cache: {id: ''}});

      expect(server.requests).to.have.length(0);

      server.restore();
    });

    it(`should return cacheIdObj`, () => {
      expect(ftrackIdSubmodule.extendId(configMock, null, {cache: {id: ''}})).to.deep.equal({cache: {id: ''}});
    });
  });

  describe('pbjs "get id" methods', () => {
    beforeEach(() => {
      init(config);
      setSubmoduleRegistry([ftrackIdSubmodule]);
    });

    describe('pbjs.getUserIdsAsync()', () => {
      it('should return the IDs in the correct schema - flat schema', () => {
        config.setConfig({
          userSync: {
            auctionDelay: 10,
            userIds: [{
              name: 'ftrack',
              value: {
                ftrackId: {
                  uid: 'device_test_id',
                  ext: {
                    HHID: 'household_test_id',
                    DeviceID: 'device_test_id',
                    SingleDeviceID: 'single_device_test_id'
                  }
                }
              }
            }]
          }
        });

        getGlobal().getUserIdsAsync().then(ids => {
          expect(ids).to.deep.equal({
            uid: 'device_test_id',
            ftrackId: {
              HHID: 'household_test_id',
              DeviceID: 'device_test_id',
              SingleDeviceID: 'single_device_test_id'
            }
          });
        });
      });
    });

    describe('pbjs.getUserIds()', () => {
      it('should return the IDs in the correct schema', () => {
        config.setConfig({
          userSync: {
            auctionDelay: 10,
            userIds: [{
              name: 'ftrack',
              value: {
                ftrackId: {
                  uid: 'device_test_id',
                  ext: {
                    HHID: 'household_test_id',
                    DeviceID: 'device_test_id',
                    SingleDeviceID: 'single_device_test_id'
                  }
                }
              }
            }]
          }
        });

        expect(getGlobal().getUserIds()).to.deep.equal({
          ftrackId: {
            uid: 'device_test_id',
            ext: {
              HHID: 'household_test_id',
              DeviceID: 'device_test_id',
              SingleDeviceID: 'single_device_test_id'
            }
          }
        });
      });
    });

    describe('pbjs.getUserIdsAsEids()', () => {
      it('should return the correct EIDs schema ', () => {
        // Pass all three IDs
        config.setConfig({
          userSync: {
            auctionDelay: 10,
            userIds: [{
              name: 'ftrack',
              value: {
                ftrackId: {
                  uid: 'device_test_id',
                  ext: {
                    HHID: 'household_test_id',
                    DeviceID: 'device_test_id',
                    SingleDeviceID: 'single_device_test_id'
                  }
                }
              }
            }]
          }
        });

        expect(getGlobal().getUserIdsAsEids()).to.deep.equal([{
          source: 'flashtalking.com',
          uids: [{
            id: 'device_test_id',
            atype: 1,
            ext: {
              HHID: 'household_test_id',
              DeviceID: 'device_test_id',
              SingleDeviceID: 'single_device_test_id'
            }
          }]
        }]);
      });

      describe('by ID type:', () => {
        it('- DeviceID', () => {
          // Pass DeviceID only
          config.setConfig({
            userSync: {
              auctionDelay: 10,
              userIds: [{
                name: 'ftrack',
                value: {
                  ftrackId: {
                    uid: 'device_test_id',
                    ext: {
                      DeviceID: 'device_test_id',
                    }
                  }
                }
              }]
            }
          });

          expect(getGlobal().getUserIdsAsEids()).to.deep.equal([{
            source: 'flashtalking.com',
            uids: [{
              id: 'device_test_id',
              atype: 1,
              ext: {
                DeviceID: 'device_test_id'
              }
            }]
          }]);
        });

        it('- HHID', () => {
          // Pass HHID only
          config.setConfig({
            userSync: {
              auctionDelay: 10,
              userIds: [{
                name: 'ftrack',
                value: {
                  ftrackId: {
                    uid: '',
                    ext: {
                      HHID: 'household_test_id'
                    }
                  }
                }
              }]
            }
          });

          expect(getGlobal().getUserIdsAsEids()).to.deep.equal([{
            source: 'flashtalking.com',
            uids: [{
              id: '',
              atype: 1,
              ext: {
                HHID: 'household_test_id'
              }
            }]
          }]);
        });

        it('- SingleDeviceID', () => {
          // Pass SingleDeviceID only
          config.setConfig({
            userSync: {
              auctionDelay: 10,
              userIds: [{
                name: 'ftrack',
                value: {
                  ftrackId: {
                    uid: '',
                    ext: {
                      SingleDeviceID: 'single_device_test_id'
                    }
                  }
                }
              }]
            }
          });

          expect(getGlobal().getUserIdsAsEids()).to.deep.equal([{
            source: 'flashtalking.com',
            uids: [{
              id: '',
              atype: 1,
              ext: {
                SingleDeviceID: 'single_device_test_id'
              }
            }]
          }]);
        });
      });
    });
  })
});
