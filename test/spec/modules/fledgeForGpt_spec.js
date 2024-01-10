import {onAuctionConfigFactory, setComponentAuction, setPAAPIConfigFactory} from 'modules/fledgeForGpt.js';
import * as gptUtils from '../../../libraries/gptUtils/gptUtils.js';
import 'modules/appnexusBidAdapter.js';
import 'modules/rubiconBidAdapter.js';
import {deepSetValue} from '../../../src/utils.js';
import {config} from 'src/config.js';

describe('fledgeForGpt module', () => {
  let sandbox, fledgeAuctionConfig;

  beforeEach(() => {
    sandbox = sinon.sandbox.create();
    fledgeAuctionConfig = {
      seller: 'bidder',
      mock: 'config'
    };
  });
  afterEach(() => {
    sandbox.restore();
  });

  describe('setComponentAuction', () => {
    let mockGptSlot;
    beforeEach(() => {
      mockGptSlot = {
        setConfig: sinon.stub(),
        getAdUnitPath: () => 'mock/gpt/au'
      };
      sandbox.stub(gptUtils, 'getGptSlotForAdUnitCode').callsFake(() => mockGptSlot);
    });
    it('should set GPT slot config', () => {
      setComponentAuction('au', [fledgeAuctionConfig]);
      sinon.assert.calledWith(gptUtils.getGptSlotForAdUnitCode, 'au');
      sinon.assert.calledWith(mockGptSlot.setConfig, {
        componentAuction: [{
          configKey: 'bidder',
          auctionConfig: fledgeAuctionConfig,
        }]
      });
    });
  });
  describe('onAuctionConfig', () => {
    [
      'fledgeForGpt',
      'paapi.gpt'
    ].forEach(namespace => {
      describe(`using ${namespace} config`, () => {
        Object.entries({
          'omitted': [undefined, true],
          'enabled': [true, true],
          'disabled': [false, false]
        }).forEach(([t, [autoconfig, shouldSetConfig]]) => {
          describe(`when autoconfig is ${t}`, () => {
            beforeEach(() => {
              const cfg = {};
              deepSetValue(cfg, `${namespace}.autoconfig`, autoconfig);
              config.setConfig(cfg);
            });
            afterEach(() => {
              config.resetConfig();
            });
            it(`should ${shouldSetConfig ? '' : 'NOT'} set GPT slot configuration`, () => {
              const auctionConfig = {componentAuctions: ['mock1', 'mock2']};
              const setGptConfig = sinon.stub();
              onAuctionConfigFactory(setGptConfig)('aid', 'au', auctionConfig);
              if (shouldSetConfig) {
                sinon.assert.calledWith(setGptConfig, 'au', auctionConfig.componentAuctions);
              } else {
                sinon.assert.notCalled(setGptConfig);
              }
            })
          })
        })
      })
    })
  });
  describe('setPAAPIConfigForGpt', () => {
    let getPAAPIConfig, setGptConfig, setPAAPIConfigForGPT;
    beforeEach(() => {
      getPAAPIConfig = sinon.stub();
      setGptConfig = sinon.stub();
      setPAAPIConfigForGPT = setPAAPIConfigFactory(getPAAPIConfig, setGptConfig);
    });

    Object.entries({
      missing: null,
      empty: {}
    }).forEach(([t, configs]) => {
      it(`does not set GPT slot config when config is ${t}`, () => {
        getPAAPIConfig.returns(configs);
        setPAAPIConfigForGPT('mock-filters');
        sinon.assert.calledWith(getPAAPIConfig, 'mock-filters');
        sinon.assert.notCalled(setGptConfig);
      })
    });

    it('sets GPT slot config for each ad unit that has PAAPI config', () => {
      const cfg = {
        au1: {
          componentAuctions: ['a1', 'a2']
        },
        au2: {
          componentAuctions: ['a3']
        }
      }
      getPAAPIConfig.returns(cfg);
      setPAAPIConfigForGPT('mock-filters');
      sinon.assert.calledWith(getPAAPIConfig, 'mock-filters');
      Object.entries(cfg).forEach(([au, config]) => {
        sinon.assert.calledWith(setGptConfig, au, config.componentAuctions);
      })
    })
  })
});
