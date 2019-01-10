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
      window.document.cookie = 'unifiedid=33dc7c63-0670-454d-8aae-cccc3040c92c; expires=Thu, 01 Jan 2020 00:00:01 GMT; path=/';
      window.document.cookie = 'pubcid=33dc7c63-0670-454d-8aae-cccc3040c92c; expires=Thu, 01 Jan 2020 00:00:01 GMT; path=/';
    });
    beforeEach(function () {
      // sinon.stub(utils, 'logInfo');
    });
    afterEach(function () {
      // utils.logInfo.restore();
      config.resetConfig();
    });

    it('default config should not enable any id submodules', function () {
      const conf = {
        getConfigCallback: undefined,
        getConfig: function (value, callback) {
          conf.getConfigCallback = callback;
        }
      };

      init(conf, [{
        name: 'pubCommonId',
        decode: function (value) {
          return { 'pubcid': value }
        },
        getId: function (submoduleConfig, consentData, syncDelay) {
          const pubId = utils.generateUUID();
          setStoredValue(submoduleConfig.storage, pubId, submoduleConfig.storage.expires || 60);
          extendBidData.push(this.decode(pubId))
          // const getIdResponse = {
          //   data: '19191919191',
          //   expires: 3939489
          // };
        }
      }, {
        name: 'unifiedId',
        decode: function (value) {
          return { 'pubcid': value }
        },
        getId: function (data, consentData, syncDelay) {
          // const getIdResponse = {
          //   data: '677676677667',
          //   expires: 'Sat, 09 Feb 2019 06:23:13 GMT'
          // };
        }
      }]);

      conf.getConfigCallback({
        usersync: {
          syncDelay: 5,
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
    })
  });
});
