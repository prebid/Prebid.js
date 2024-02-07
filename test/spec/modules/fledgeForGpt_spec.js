import {
  configsBySeller,
  onAuctionConfigFactory,
  setComponentAuction,
  setPAAPIConfigFactory
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
      setComponentAuction('au', {key: fledgeAuctionConfig});
      sinon.assert.calledWith(gptUtils.getGptSlotForAdUnitCode, 'au');
      sinon.assert.calledWith(mockGptSlot.setConfig, {
        componentAuction: [{
          configKey: 'key',
          auctionConfig: fledgeAuctionConfig,
        }]
      });
    });

    it('should reset GPT slot config', () => {
      setComponentAuction('au', {key: null});
      sinon.assert.calledWith(gptUtils.getGptSlotForAdUnitCode, 'au');
      sinon.assert.calledWith(mockGptSlot.setConfig, {
        componentAuction: [{
          configKey: 'key',
          auctionConfig: null
        }]
      })
    })
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
              onAuctionConfigFactory(setGptConfig)('aid', 'au', auctionConfig);
              if (shouldSetConfig) {
                sinon.assert.calledWith(setGptConfig, 'au', configsBySeller(auctionConfig.componentAuctions));
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
        sinon.assert.calledWith(setGptConfig, au, configsBySeller(config.componentAuctions));
      })
    });

    describe('when reuse = false', () => {
      it('resets all previously set configs', () => {
        getPAAPIConfig.returns({
          au1: {
            componentAuctions: [{seller: 's1'}, {seller: 's2'}]
          },
          au2: {
            componentAuctions: [{seller: 's1'}]
          }
        });
        setPAAPIConfigForGPT();
        getPAAPIConfig.returns({
          au2: {
            componentAuctions: [{seller: 's2'}]
          }
        });
        setPAAPIConfigForGPT({reuse: false});
        sinon.assert.calledWith(setGptConfig, 'au1', {
          s1: null,
          s2: null
        });
        sinon.assert.calledWith(setGptConfig, 'au2', {
          s1: null,
          s2: {seller: 's2'}
        })
        getPAAPIConfig.returns({
          au3: {
            componentAuctions: [{seller: 's3'}]
          }
        });
        setPAAPIConfigForGPT({reuse: false});
        sinon.assert.calledWith(setGptConfig, 'au2', {
          s2: null
        })
      });

      it('only resets sellers that have no fresh config', () => {
        getPAAPIConfig.returns({
          au1: {
            componentAuctions: [{seller: 's1'}, {seller: 's2'}]
          }
        });
        setPAAPIConfigForGPT();
        setGptConfig.resetHistory();
        getPAAPIConfig.returns({
          au1: {
            componentAuctions: [{seller: 's1'}]
          }
        });
        setPAAPIConfigForGPT({reuse: false})
        sinon.assert.calledWith(setGptConfig, 'au1', {
          s1: {seller: 's1'},
          s2: null
        })
      });

      it('does not reset slots that have already been reset', () => {
        getPAAPIConfig.returns({
          au1: {
            componentAuctions: [{seller: 's1'}]
          },
          au2: {
            componentAuctions: [{seller: 's1'}]
          }
        });
        setPAAPIConfigForGPT();
        getPAAPIConfig.returns({});
        setPAAPIConfigForGPT({adUnitCode: 'au1', reuse: false});
        setGptConfig.resetHistory();
        setPAAPIConfigForGPT({adUnitCode: 'au1', reuse: false});
        sinon.assert.notCalled(setGptConfig);
        setPAAPIConfigForGPT({reuse: false});
        sinon.assert.calledWith(setGptConfig, 'au2', {
          s1: null
        })
      })

      it('only resets the given adUnit', () => {
        getPAAPIConfig.returns({
          au1: {
            componentAuctions: [{seller: 's1'}]
          },
          au2: {
            componentAuctions: [{seller: 's2'}]
          }
        });
        setPAAPIConfigForGPT();
        getPAAPIConfig.returns({});
        setGptConfig.resetHistory();
        setPAAPIConfigForGPT({adUnitCode: 'au1', reuse: false});
        sinon.assert.calledWith(setGptConfig, 'au1', {
          s1: null
        });
      })
    })

    Object.entries({
      'true': {reuse: true},
      'undefined': {}
    }).forEach(([t, options]) => {
      it(`when reuse is ${t}, should not reset previous slots`, () => {
        getPAAPIConfig.returns({
          au1: {
            componentAuctions: [{seller: 's1'}]
          }
        });
        setPAAPIConfigForGPT();
        setGptConfig.resetHistory();
        getPAAPIConfig.returns({});
        setPAAPIConfigForGPT(options);
        sinon.assert.notCalled(setGptConfig);
      })
    })
  })
});
