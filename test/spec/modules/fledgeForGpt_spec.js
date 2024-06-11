import {
  getPAAPISizeHook,
  onAuctionConfigFactory,
  setPAAPIConfigFactory,
  slotConfigurator
} from 'modules/fledgeForGpt.js';
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

  describe('slotConfigurator', () => {
    let mockGptSlot, setGptConfig;
    beforeEach(() => {
      mockGptSlot = {
        setConfig: sinon.stub(),
        getAdUnitPath: () => 'mock/gpt/au'
      };
      sandbox.stub(gptUtils, 'getGptSlotForAdUnitCode').callsFake(() => mockGptSlot);
      setGptConfig = slotConfigurator();
    });
    it('should set GPT slot config', () => {
      setGptConfig('au', [fledgeAuctionConfig]);
      sinon.assert.calledWith(gptUtils.getGptSlotForAdUnitCode, 'au');
      sinon.assert.calledWith(mockGptSlot.setConfig, {
        componentAuction: [{
          configKey: 'bidder',
          auctionConfig: fledgeAuctionConfig,
        }]
      });
    });

    describe('when reset = true', () => {
      it('should reset GPT slot config', () => {
        setGptConfig('au', [fledgeAuctionConfig]);
        mockGptSlot.setConfig.resetHistory();
        gptUtils.getGptSlotForAdUnitCode.resetHistory();
        setGptConfig('au', [], true);
        sinon.assert.calledWith(gptUtils.getGptSlotForAdUnitCode, 'au');
        sinon.assert.calledWith(mockGptSlot.setConfig, {
          componentAuction: [{
            configKey: 'bidder',
            auctionConfig: null
          }]
        });
      });

      it('should reset only sellers with no fresh config', () => {
        setGptConfig('au', [{seller: 's1'}, {seller: 's2'}]);
        mockGptSlot.setConfig.resetHistory();
        setGptConfig('au', [{seller: 's1'}], true);
        sinon.assert.calledWith(mockGptSlot.setConfig, {
          componentAuction: [{
            configKey: 's1',
            auctionConfig: {seller: 's1'}
          }, {
            configKey: 's2',
            auctionConfig: null
          }]
        })
      });

      it('should not reset sellers that were already reset', () => {
        setGptConfig('au', [{seller: 's1'}]);
        setGptConfig('au', [], true);
        mockGptSlot.setConfig.resetHistory();
        setGptConfig('au', [], true);
        sinon.assert.notCalled(mockGptSlot.setConfig);
      })

      it('should keep track of configuration history by slot', () => {
        setGptConfig('au1', [{seller: 's1'}]);
        setGptConfig('au1', [{seller: 's2'}], false);
        setGptConfig('au2', [{seller: 's3'}]);
        mockGptSlot.setConfig.resetHistory();
        setGptConfig('au1', [], true);
        sinon.assert.calledWith(mockGptSlot.setConfig, {
          componentAuction: [{
            configKey: 's1',
            auctionConfig: null
          }, {
            configKey: 's2',
            auctionConfig: null
          }]
        });
      })
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
              const auctionConfig = {componentAuctions: [{seller: 'mock1'}, {seller: 'mock2'}]};
              const setGptConfig = sinon.stub();
              const markAsUsed = sinon.stub();
              onAuctionConfigFactory(setGptConfig)('aid', {au1: auctionConfig, au2: null}, markAsUsed);
              if (shouldSetConfig) {
                sinon.assert.calledWith(setGptConfig, 'au1', auctionConfig.componentAuctions);
                sinon.assert.calledWith(setGptConfig, 'au2', []);
                sinon.assert.calledWith(markAsUsed, 'au1');
              } else {
                sinon.assert.notCalled(setGptConfig);
                sinon.assert.notCalled(markAsUsed);
              }
            });
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

    it('sets GPT slot config for each ad unit that has PAAPI config, and resets the rest', () => {
      const cfg = {
        au1: {
          componentAuctions: [{seller: 's1'}, {seller: 's2'}]
        },
        au2: {
          componentAuctions: [{seller: 's3'}]
        },
        au3: null
      }
      getPAAPIConfig.returns(cfg);
      setPAAPIConfigForGPT('mock-filters');
      sinon.assert.calledWith(getPAAPIConfig, 'mock-filters');
      Object.entries(cfg).forEach(([au, config]) => {
        sinon.assert.calledWith(setGptConfig, au, config?.componentAuctions ?? [], true);
      })
    });
  });

  describe('getPAAPISizeHook', () => {
    let next;
    beforeEach(() => {
      next = sinon.stub();
      next.bail = sinon.stub();
    });

    it('should pick largest supported size over larger unsupported size', () => {
      getPAAPISizeHook(next, [[999, 999], [300, 250], [300, 600], [1234, 4321]]);
      sinon.assert.calledWith(next.bail, [300, 600]);
    });

    Object.entries({
      'present': [],
      'supported': [[123, 4], [321, 5]],
      'defined': undefined,
    }).forEach(([t, sizes]) => {
      it(`should defer to next when no size is ${t}`, () => {
        getPAAPISizeHook(next, sizes);
        sinon.assert.calledWith(next, sizes);
      })
    })
  })
});
