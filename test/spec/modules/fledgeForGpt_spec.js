import {onAuctionConfigFactory, setPAAPIConfigFactory, slotConfigurator} from 'modules/fledgeForGpt.js';
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
    let mockGptSlot, setGptConfig, getSlots;
    beforeEach(() => {
      mockGptSlot = {
        setConfig: sinon.stub(),
        getAdUnitPath: () => 'mock/gpt/au'
      };
      sandbox.stub(gptUtils, 'getGptSlotForAdUnitCode').callsFake(() => mockGptSlot);
      [setGptConfig, getSlots] = slotConfigurator();
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
      expect(getSlots()).to.eql(['au']);
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
        expect(getSlots()).to.eql([]);
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
        expect(getSlots()).to.eql(['au1', 'au2']);
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
        expect(getSlots()).to.eql(['au2'])
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
              onAuctionConfigFactory(setGptConfig)('aid', 'au', auctionConfig, markAsUsed);
              if (shouldSetConfig) {
                sinon.assert.calledWith(setGptConfig, 'au', auctionConfig.componentAuctions);
                sinon.assert.called(markAsUsed);
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
    let getPAAPIConfig, setGptConfig, getSlots, setPAAPIConfigForGPT;
    beforeEach(() => {
      getPAAPIConfig = sinon.stub();
      setGptConfig = sinon.stub();
      getSlots = sinon.stub();
      getSlots.returns([]);
      setPAAPIConfigForGPT = setPAAPIConfigFactory(getPAAPIConfig, setGptConfig, getSlots);
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
          componentAuctions: [{seller: 's1'}, {seller: 's2'}]
        },
        au2: {
          componentAuctions: [{seller: 's3'}]
        }
      }
      getPAAPIConfig.returns(cfg);
      setPAAPIConfigForGPT('mock-filters');
      sinon.assert.calledWith(getPAAPIConfig, 'mock-filters');
      Object.entries(cfg).forEach(([au, config]) => {
        sinon.assert.calledWith(setGptConfig, au, config.componentAuctions, true);
      })
    });

    it('resets previously set slots', () => {
      getSlots.returns(['au1', 'au2']);
      getPAAPIConfig.returns({});
      setPAAPIConfigForGPT();
      ['au1', 'au2'].forEach(au => sinon.assert.calledWith(setGptConfig, au, [], true));
    });

    it('does not reset-and-set', () => {
      getSlots.returns(['au1', 'au2']);
      getPAAPIConfig.returns({
        au1: {
          componentAuctions: [{seller: 's1'}]
        }
      });
      setPAAPIConfigForGPT();
      sinon.assert.calledTwice(setGptConfig);
      sinon.assert.calledWith(setGptConfig, 'au1', [{seller: 's1'}], true);
      sinon.assert.calledWith(setGptConfig, 'au2', [], true);
    })

    it('only resets the given adUnit', () => {
      getSlots.returns(['au1', 'au2']);
      getPAAPIConfig.returns({});
      setPAAPIConfigForGPT({adUnitCode: 'au1'});
      sinon.assert.calledOnce(setGptConfig);
      sinon.assert.calledWith(setGptConfig, 'au1', [], true);
    });
  })
});
