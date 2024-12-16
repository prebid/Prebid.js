import {
  getPAAPISizeHook,
  onAuctionConfigFactory,
  setPAAPIConfigFactory, setTargetingHookFactory,
  slotConfigurator
} from 'modules/paapiForGpt.js';
import * as gptUtils from '../../../libraries/gptUtils/gptUtils.js';
import 'modules/appnexusBidAdapter.js';
import 'modules/rubiconBidAdapter.js';
import {deepSetValue} from '../../../src/utils.js';
import {config} from 'src/config.js';

describe('paapiForGpt module', () => {
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
    let setGptConfig;
    function mockGptSlot(auPath) {
      return {
        setConfig: sinon.stub(),
        getAdUnitPath: () => auPath
      }
    }
    beforeEach(() => {
      setGptConfig = slotConfigurator();
    });

    Object.entries({
      'single slot': [mockGptSlot('mock/gpt/au')],
      'multiple slots': [mockGptSlot('mock/gpt/au'), mockGptSlot('mock/gpt/au2')]
    }).forEach(([t, gptSlots]) => {
      describe(`when ad unit code matches ${t}`, () => {
        it('should set GPT slot config', () => {
          setGptConfig('au', gptSlots, [fledgeAuctionConfig]);
          gptSlots.forEach(slot => {
            sinon.assert.calledWith(slot.setConfig, {
              componentAuction: [{
                configKey: 'bidder',
                auctionConfig: fledgeAuctionConfig,
              }]
            });
          })
        });
        describe('when reset = true', () => {
          it('should reset GPT slot config', () => {
            setGptConfig('au', gptSlots, [fledgeAuctionConfig]);
            gptSlots.forEach(slot => slot.setConfig.resetHistory());
            setGptConfig('au', gptSlots, [], true);
            gptSlots.forEach(slot => {
              sinon.assert.calledWith(slot.setConfig, {
                componentAuction: [{
                  configKey: 'bidder',
                  auctionConfig: null
                }]
              });
            })
          });

          it('should reset only sellers with no fresh config', () => {
            setGptConfig('au', gptSlots, [{seller: 's1'}, {seller: 's2'}]);
            gptSlots.forEach(slot => slot.setConfig.resetHistory());
            setGptConfig('au', gptSlots, [{seller: 's1'}], true);
            gptSlots.forEach(slot => {
              sinon.assert.calledWith(slot.setConfig, {
                componentAuction: [{
                  configKey: 's1',
                  auctionConfig: {seller: 's1'}
                }, {
                  configKey: 's2',
                  auctionConfig: null
                }]
              })
            })
          });

          it('should not reset sellers that were already reset', () => {
            setGptConfig('au', gptSlots, [{seller: 's1'}]);
            setGptConfig('au', gptSlots, [], true);
            gptSlots.forEach(slot => slot.setConfig.resetHistory());
            setGptConfig('au', gptSlots, [], true);
            gptSlots.forEach(slot => sinon.assert.notCalled(slot.setConfig));
          })

          it('should keep track of configuration history by ad unit', () => {
            setGptConfig('au1', gptSlots, [{seller: 's1'}]);
            setGptConfig('au1', gptSlots, [{seller: 's2'}], false);
            setGptConfig('au2', gptSlots, [{seller: 's3'}]);
            gptSlots.forEach(slot => slot.setConfig.resetHistory());
            setGptConfig('au1', gptSlots, [], true);
            gptSlots.forEach(slot => {
              sinon.assert.calledWith(slot.setConfig, {
                componentAuction: [{
                  configKey: 's1',
                  auctionConfig: null
                }, {
                  configKey: 's2',
                  auctionConfig: null
                }]
              });
            })
          })
        });
      })
    })
  });
  describe('setTargeting hook', () => {
    let setPaapiConfig, setTargetingHook, next;
    beforeEach(() => {
      setPaapiConfig = sinon.stub()
      setTargetingHook = setTargetingHookFactory(setPaapiConfig);
      next = sinon.stub();
    });
    function expectFilters(...filters) {
      expect(setPaapiConfig.args.length).to.eql(filters.length)
      filters.forEach(filter => {
        sinon.assert.calledWith(setPaapiConfig, filter, 'mock-matcher')
      })
    }
    function runHook(adUnit) {
      setTargetingHook(next, adUnit, 'mock-matcher');
      sinon.assert.calledWith(next, adUnit, 'mock-matcher');
    }
    it('should invoke with no filters when adUnit is undef', () => {
      runHook();
      expectFilters(undefined);
    });
    it('should invoke once when adUnit is a string', () => {
      runHook('mock-au');
      expectFilters({adUnitCode: 'mock-au'})
    });
    it('should invoke once per ad unit when an array', () => {
      runHook(['au1', 'au2']);
      expectFilters({adUnitCode: 'au1'}, {adUnitCode: 'au2'});
    })
  })
  describe('setPAAPIConfigForGpt', () => {
    let getPAAPIConfig, setGptConfig, getSlots, setPAAPIConfigForGPT;
    beforeEach(() => {
      getPAAPIConfig = sinon.stub();
      setGptConfig = sinon.stub();
      getSlots = sinon.stub().callsFake((codes) => Object.fromEntries(codes.map(code => [code, ['mock-slot']])))
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

    it('passes customSlotMatching to getSlots', () => {
      getPAAPIConfig.returns({au1: {}});
      setPAAPIConfigForGPT('mock-filters', 'mock-custom-matching');
      sinon.assert.calledWith(getSlots, ['au1'], 'mock-custom-matching');
    })

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
        sinon.assert.calledWith(setGptConfig, au, ['mock-slot'], config?.componentAuctions ?? [], true);
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
