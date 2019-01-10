import {
  initSubmodules,
  extendBidData,
  init,
  submodules,
  submoduleConfigs,
  initializedSubmodules,
  syncDelay,
  requestBidHook, setStoredValue,
} from 'modules/universalId';
import {expect} from 'chai'
import sinon from 'sinon'
import {config} from '../../../src/config';
import * as utils from '../../../src/utils';

describe('Universal ID', function () {
  let sandbox;
  let clock;
  let mockSubmodules = [{
    name: 'pubCommonId',
    decode: function (value) { return { 'pubcid': value } },
    getId: function (submoduleConfig, consentData, syncDelay) {}
  }, {
    name: 'unifiedId',
    decode: function (value) { return { 'pubcid': value } },
    getId: function (data, consentData, syncDelay) {}
  }];

  before(function () {
    clock = sinon.useFakeTimers(Date.now());
  });
  after(function () {
    clock.restore();
  });

  beforeEach(function () {
    sandbox = sinon.sandbox.create();
  });
  afterEach(function () {
    sandbox.restore();
  });

  describe('setConfig tests', function () {
    before(function () {
      // window.document.cookie = 'unifiedid=33dc7c63-0670-454d-8aae-cccc3040c92c; expires=Thu, 01 Jan 2020 00:00:01 GMT; path=/';
    });
    beforeEach(function () {
      sinon.stub(utils, 'logInfo');
    });
    afterEach(function () {
      utils.logInfo.restore();
      config.resetConfig();
    });

    describe('opt out', function () {
      before(function () {
        window.document.cookie = '_pbjs_id_optout=;';
      });
      afterEach(function () {
        window.document.cookie = '_pbjs_id_optout=; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      });

      it('fails initialization if opt out cookie exists', function () {
        init(config, mockSubmodules);
        config.setConfig({
          usersync: {
            syncDelay: 0,
            universalIds: [{
              name: 'pubCommonId',
              storage: {
                name: 'pubcid',
                type: 'cookie',
                expires: 'Thu, 01 Jan 2020 00:00:01 GMT'
              },
              value: {
                'foo': 'bar'
              }
            }, {
              name: 'unifiedId',
              storage: {
                name: 'unifiedid',
                type: 'cookie',
                expires: 'Thu, 01 Jan 2020 00:00:01 GMT'
              }
            }]
          }
        });
        expect(utils.logInfo.args[0][0]).to.exist.and.to.equal('UniversalId - opt-out cookie found, exit module');
      });

      it('initializes if no opt out cookie exists', function () {
        init(config, mockSubmodules);
        config.setConfig({
          usersync: {
            syncDelay: 0,
            universalIds: [{
              name: 'pubCommonId',
              storage: {
                name: 'pubcid',
                type: 'cookie',
                expires: 'Thu, 01 Jan 2020 00:00:01 GMT'
              },
              value: {
                'foo': 'bar'
              }
            }, {
              name: 'unifiedId',
              storage: {
                name: 'unifiedid',
                type: 'cookie',
                expires: 'Thu, 01 Jan 2020 00:00:01 GMT'
              }
            }]
          }
        });
        expect(utils.logInfo.args[0][0]).to.exist.and.to.equal('UniversalId - usersync config updated');
      });
    });

    describe('handle variations of config values', function () {
      it('handles config with no usersync object', function () {
        init(config, mockSubmodules);
        config.setConfig({});
        // usersync is undefined, and no logInfo message for 'UniversalId - usersync config updated'
        expect(typeof utils.logInfo.args[0]).to.equal('undefined');
        expect(submodules.length).to.equal(0);
        expect(submoduleConfigs.length).to.equal(0);
      });

      it('handles config with empty usersync object', function () {
        init(config, mockSubmodules);
        config.setConfig({ usersync: {} });
        expect(utils.logInfo.args[0][0]).to.exist.and.to.equal('UniversalId - usersync config updated');
        expect(submodules.length).to.equal(0);
        expect(submoduleConfigs.length).to.equal(0);
      });

      it('handles config with usersync and universalIds that are empty objs', function () {
        init(config, mockSubmodules);
        config.setConfig({
          usersync: {
            universalIds: [{}]
          }
        });
        expect(utils.logInfo.args[0][0]).to.exist.and.to.equal('UniversalId - usersync config updated');
        expect(submodules.length).to.equal(0);
        expect(submoduleConfigs.length).to.equal(0);
      });

      it('handles config with usersync and universalIds with empty names or that dont match a submodule.name', function () {
        init(config, mockSubmodules);
        config.setConfig({
          usersync: {
            universalIds: [{
              name: '',
              value: { test: '1' }
            }, {
              name: 'foo',
              value: { test: '1' }
            }]
          }
        });
        expect(utils.logInfo.args[0][0]).to.exist.and.to.equal('UniversalId - usersync config updated');
        expect(submodules.length).to.equal(0);
        expect(submoduleConfigs.length).to.equal(0);
      });
    });

    it.skip('initialize all submodules', function () {
      init(config, [{
        name: 'pubCommonId',
        decode: function (value) { return { 'pubcid': value } },
        getId: function (submoduleConfig, consentData, syncDelay) {
          const pubId = utils.generateUUID();
          setStoredValue(submoduleConfig.storage, pubId, submoduleConfig.storage.expires || 60);
          extendBidData.push(this.decode(pubId))
        }
      }, {
        name: 'unifiedId',
        decode: function (value) { return { 'pubcid': value } },
        getId: function (data, consentData, syncDelay) {
          // data: '677676677667',
          // expires: 'Sat, 09 Feb 2019 06:23:13 GMT'
        }
      }]);

      config.setConfig({
        usersync: {
          syncDelay: 0,
          universalIds: [{
            name: 'pubCommonId',
            storage: {
              name: 'pubcid',
              type: 'cookie',
              expires: 'Thu, 01 Jan 2020 00:00:01 GMT'
            },
            value: {'foo': 'bar'}
          }, {
            name: 'unifiedId',
            storage: {
              name: 'unifiedid',
              type: 'cookie',
              expires: 'Thu, 01 Jan 2020 00:00:01 GMT'
            }
          }]
        }
      });
    })
  });
});
