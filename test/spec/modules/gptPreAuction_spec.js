import 'src/prebid.js';
import {
  appendGptSlots,
  _currentConfig,
  gptRequestHook,
  INTERNAL_REQUEST_SYM,
  makeBidRequestsHook,
  getAuctionsIdsFromTargeting,
  getSegments,
  getSignals,
  getSignalsArrayByAuctionsIds,
  getSignalsIntersection,
  requestBidsStub
} from 'modules/gptPreAuction.js';
import { config } from 'src/config.js';
import { getHook } from 'src/hook.js';
import { getGlobal } from 'src/prebidGlobal.js';
import * as utils from 'src/utils.js';
import { makeSlot } from '../integration/faker/googletag.js';
import { taxonomies } from '../../../libraries/gptUtils/gptUtils.js';

describe('GPT pre-auction module', () => {
  let sandbox;
  beforeEach(() => {
    sandbox = sinon.createSandbox();
  });
  afterEach(() => {
    sandbox.restore();
    config.setConfig({ gptPreAuction: { enabled: false } });
  });

  const testSlots = [
    makeSlot({ code: 'slotCode1', divId: 'div1' }),
    makeSlot({ code: 'slotCode2', divId: 'div2' }),
    makeSlot({ code: 'slotCode3', divId: 'div3' }),
    makeSlot({ code: 'slotCode4', divId: 'div4' }),
    makeSlot({ code: 'slotCode4', divId: 'div5' })
  ];

  const mockTargeting = { '/123456/header-bid-tag-0': { 'hb_deal_rubicon': '1234', 'hb_deal': '1234', 'hb_pb': '0.53', 'hb_adid': '148018fe5e', 'hb_bidder': 'rubicon', 'foobar': '300x250', 'hb_pb_rubicon': '0.53', 'hb_adid_rubicon': '148018fe5e', 'hb_bidder_rubicon': 'rubicon', 'hb_deal_appnexus': '4321', 'hb_pb_appnexus': '0.1', 'hb_adid_appnexus': '567891011', 'hb_bidder_appnexus': 'appnexus' } };

  const mockAuctionManager = {
    findBidByAdId(adId) {
      const bidsMap = {
        '148018fe5e': {
          auctionId: mocksAuctions[0].auctionId
        },
        '567891011': {
          auctionId: mocksAuctions[1].auctionId
        },
      };
      return bidsMap[adId];
    },
    index: {
      getAuction({ auctionId }) {
        return mocksAuctions.find(auction => auction.auctionId === auctionId);
      }
    }
  };

  const mocksAuctions = [
    {
      auctionId: '1111',
      getFPD: () => ({
        global: {
          user: {
            data: [{
              name: 'dataprovider.com',
              ext: {
                segtax: 4
              },
              segment: [{
                id: '1'
              }, {
                id: '2'
              }]
            }],
          }
        }
      })
    },
    {
      auctionId: '234234',
      getFPD: () => ({
        global: {
          user: {
            data: [{
              name: 'dataprovider.com',
              ext: {
                segtax: 4
              },
              segment: [{
                id: '2'
              }]
            }]
          }
        }
      }),
    }, {
      auctionId: '234324234',
      getFPD: () => ({
        global: {
          user: {
            data: [{
              name: 'dataprovider.com',
              ext: {
                segtax: 4
              },
              segment: [{
                id: '2'
              }, {
                id: '3'
              }]
            }]
          }
        }
      })
    },
  ];

  describe('appendGptSlots', () => {
    it('should not add adServer object to context if no slots defined', () => {
      const adUnit = { code: 'adUnitCode', ortb2Imp: { ext: { data: {} } } };
      appendGptSlots([adUnit]);
      expect(adUnit.ortb2Imp.ext.data.adserver).to.be.undefined;
    });

    it('should not add adServer object to context if no slot matches', () => {
      window.googletag.pubads().setSlots(testSlots);
      const adUnit = { code: 'adUnitCode', ortb2Imp: { ext: { data: {} } } };
      appendGptSlots([adUnit]);
      expect(adUnit.ortb2Imp.ext.data.adserver).to.be.undefined;
    });

    it('should add adServer object to context if matching slot is found', () => {
      window.googletag.pubads().setSlots(testSlots);
      const adUnit = { code: 'slotCode2', ortb2Imp: { ext: { data: {} } } };
      appendGptSlots([adUnit]);
      expect(adUnit.ortb2Imp.ext.data.adserver).to.be.an('object');
      expect(adUnit.ortb2Imp.ext.data.adserver).to.deep.equal({ name: 'gam', adslot: 'slotCode2' });
    });

    it('should add adServer object to context if matching slot is found (in case of twin ad unit)', () => {
      window.googletag.pubads().setSlots(testSlots);
      const adUnit1 = { code: 'slotCode2', ortb2Imp: { ext: { data: {} } } };
      const adUnit2 = { code: 'slotCode2', ortb2Imp: { ext: { data: {} } } };
      appendGptSlots([adUnit1, adUnit2]);
      expect(adUnit1.ortb2Imp.ext.data.adserver).to.be.an('object');
      expect(adUnit1.ortb2Imp.ext.data.adserver).to.deep.equal({ name: 'gam', adslot: 'slotCode2' });

      expect(adUnit2.ortb2Imp.ext.data.adserver).to.be.an('object');
      expect(adUnit2.ortb2Imp.ext.data.adserver).to.deep.equal({ name: 'gam', adslot: 'slotCode2' });
    });

    it('will trim child id if mcmEnabled is set to true', () => {
      config.setConfig({ gptPreAuction: { enabled: true, mcmEnabled: true } });
      window.googletag.pubads().setSlots([
        makeSlot({ code: '/12345,21212/slotCode1', divId: 'div1' }),
        makeSlot({ code: '/12345,21212/slotCode2', divId: 'div2' }),
        makeSlot({ code: '/12345,21212/slotCode3', divId: 'div3' })
      ]);
      const adUnit = { code: '/12345,21212/slotCode2', ortb2Imp: { ext: { data: {} } } };
      appendGptSlots([adUnit]);
      expect(adUnit.ortb2Imp.ext.data.adserver).to.be.an('object');
      expect(adUnit.ortb2Imp.ext.data.adserver).to.deep.equal({ name: 'gam', adslot: '/12345/slotCode2' });
    });

    it('returns full ad unit path even if mcmEnabled is true', () => {
      config.setConfig({ gptPreAuction: { enabled: true, mcmEnabled: true } });
      window.googletag.pubads().setSlots([
        makeSlot({ code: '/12345,21212/slot', divId: 'div1' }),
      ]);
      const adUnit = { code: '/12345,21212/slot' };
      expect(appendGptSlots([adUnit])).to.eql({
        '/12345,21212/slot': '/12345,21212/slot'
      });
    });

    it('will not trim child id if mcmEnabled is not set to true', () => {
      window.googletag.pubads().setSlots([
        makeSlot({ code: '/12345,21212/slotCode1', divId: 'div1' }),
        makeSlot({ code: '/12345,21212/slotCode2', divId: 'div2' }),
        makeSlot({ code: '/12345,21212/slotCode3', divId: 'div3' })
      ]);
      const adUnit = { code: '/12345,21212/slotCode2', ortb2Imp: { ext: { data: {} } } };
      appendGptSlots([adUnit]);
      expect(adUnit.ortb2Imp.ext.data.adserver).to.be.an('object');
      expect(adUnit.ortb2Imp.ext.data.adserver).to.deep.equal({ name: 'gam', adslot: '/12345,21212/slotCode2' });
    });

    it('should use the customGptSlotMatching function if one is given', () => {
      config.setConfig({
        customGptSlotMatching: slot => {
          return (adUnitCode) => adUnitCode.toUpperCase() === slot.getAdUnitPath().toUpperCase();
        }
      });

      window.googletag.pubads().setSlots(testSlots);
      const adUnit = { code: 'SlOtCoDe1', ortb2Imp: { ext: { data: {} } } };
      appendGptSlots([adUnit]);
      expect(adUnit.ortb2Imp.ext.data.adserver).to.be.an('object');
      expect(adUnit.ortb2Imp.ext.data.adserver).to.deep.equal({ name: 'gam', adslot: 'slotCode1' });
      config.resetConfig();
    });
  });

  describe('handleSetGptConfig', () => {
    it('should enable the module by default', () => {
      config.setConfig({ gptPreAuction: {} });
      expect(_currentConfig.enabled).to.equal(true);
    });

    it('should disable the module if told to in set config', () => {
      config.setConfig({ gptPreAuction: { enabled: false } });
      expect(_currentConfig).to.be.an('object').that.is.empty;
    });

    it('should check that custom functions in config are type function', () => {
      config.setConfig({
        gptPreAuction: {
          customPreAuction: 12345,
        }
      });
      expect(_currentConfig).to.deep.equal({
        enabled: true,
        customPreAuction: false,
        useDefaultPreAuction: true
      });
    });
  });

  describe('makeBidRequestsHook', () => {
    let returnedAdUnits;
    const runMakeBidRequests = adUnits => {
      const next = adUnits => {
        returnedAdUnits = adUnits;
      };
      makeBidRequestsHook(next, adUnits);
    };

    it('should use the passed customPreAuction logic', () => {
      let counter = 0;
      config.setConfig({
        gptPreAuction: {
          enabled: true,
          customPreAuction: (adUnit, slotName) => {
            counter += 1;
            return `${adUnit.code}-${slotName || counter}`;
          }
        }
      });
      const testAdUnits = [
        {
          code: 'adUnit1',
          ortb2Imp: { ext: { data: {} } }
        },
        {
          code: 'adUnit2',
        },
        {
          code: 'slotCode3',
        },
        {
          code: 'div4',
        }
      ];

      // all slots should be passed in same time and have slot-${index}
      const expectedAdUnits = [{
        code: 'adUnit1',
        ortb2Imp: {
          ext: {
            // no slotname match so uses adUnit.code-counter
            data: {},
            gpid: 'adUnit1-1'
          }
        }
      },
      // second adunit
      {
        code: 'adUnit2',
        ortb2Imp: {
          ext: {
            // no slotname match so uses adUnit.code-counter
            data: {},
            gpid: 'adUnit2-2'
          }
        }
      }, {
        code: 'slotCode3',
        ortb2Imp: {
          ext: {
            // slotname found, so uses code + slotname (which is same)
            data: {
              adserver: {
                name: 'gam',
                adslot: 'slotCode3'
              }
            },
            gpid: 'slotCode3-slotCode3'
          }
        }
      }, {
        code: 'div4',
        ortb2Imp: {
          ext: {
            // slotname found, so uses code + slotname
            data: {
              adserver: {
                name: 'gam',
                adslot: 'slotCode4'
              }
            },
            gpid: 'div4-slotCode4'
          }
        }
      }];

      window.googletag.pubads().setSlots(testSlots);
      runMakeBidRequests(testAdUnits);
      expect(returnedAdUnits).to.deep.equal(expectedAdUnits);
    });

    it('should pass full slot path to customPreAuction when mcmEnabled is true', () => {
      const customPreAuction = sinon.stub();
      config.setConfig({
        gptPreAuction: {
          enabled: true,
          mcmEnabled: true,
          customPreAuction
        }
      });
      window.googletag.pubads().setSlots([
        makeSlot({ code: '/12345,21212/slot', divId: 'div1' }),
      ]);
      const adUnit = { code: '/12345,21212/slot' };
      makeBidRequestsHook(sinon.stub(), [adUnit]);
      sinon.assert.calledWith(customPreAuction, adUnit, '/12345/slot', adUnit.code);
    });

    it('should not choke if gpt is not available', () => {
      config.setConfig({
        gptPreAuction: {
          enabled: true
        }
      });
      sandbox.stub(window, 'googletag').value(null);
      makeBidRequestsHook(sinon.stub(), [{}]);
    });

    it('should use useDefaultPreAuction logic', () => {
      config.setConfig({
        gptPreAuction: {
          enabled: true,
          useDefaultPreAuction: true
        }
      });
      const testAdUnits = [
        // First adUnit should use the preset pbadslot
        {
          code: 'adUnit1',
          ortb2Imp: { ext: { data: {} } }
        },
        // Second adUnit should not match a gam slot, so no slot set
        {
          code: 'adUnit2',
        },
        // third adunit matches a single slot so uses it
        {
          code: 'slotCode3',
        },
        // fourth adunit matches multiple slots so combination
        {
          code: 'div4',
        }
      ];

      const expectedAdUnits = [{
        code: 'adUnit1',
        ortb2Imp: {
          ext: {
            data: {},
          }
        }
      },
      // second adunit
      {
        code: 'adUnit2',
        ortb2Imp: {
          ext: {
            data: {
            },
          }
        }
      }, {
        code: 'slotCode3',
        ortb2Imp: {
          ext: {
            data: {
              adserver: {
                name: 'gam',
                adslot: 'slotCode3'
              }
            },
            gpid: 'slotCode3'
          }
        }
      }, {
        code: 'div4',
        ortb2Imp: {
          ext: {
            data: {
              adserver: {
                name: 'gam',
                adslot: 'slotCode4'
              }
            },
            gpid: 'slotCode4#div4'
          }
        }
      }];

      window.googletag.pubads().setSlots(testSlots);
      runMakeBidRequests(testAdUnits);
      expect(returnedAdUnits).to.deep.equal(expectedAdUnits);
    });

    it('sets gpid when mcmEnabled: true', () => {
      config.setConfig({ gptPreAuction: { enabled: true, mcmEnabled: true } });
      window.googletag.pubads().setSlots([
        makeSlot({ code: '/12345,21212/slot', divId: 'div1' }),
      ]);
      const adUnit = { code: '/12345,21212/slot' };
      makeBidRequestsHook(sinon.stub(), [adUnit]);
      expect(adUnit.ortb2Imp.ext.gpid).to.eql('/12345/slot');
    });
  });

  describe('pps gpt config', () => {
    it('should parse segments from fpd', () => {
      const twoSegments = getSegments(mocksAuctions[0].getFPD().global, ['user.data'], 4);
      expect(JSON.stringify(twoSegments)).to.equal(JSON.stringify(['1', '2']));
      const zeroSegments = getSegments(mocksAuctions[0].getFPD().global, ['user.data'], 6);
      expect(zeroSegments).to.length(0);
    });

    it('should return signals from fpd', () => {
      const signals = getSignals(mocksAuctions[0].getFPD().global);
      const expectedSignals = [{ taxonomy: taxonomies[0], values: ['1', '2'] }];
      expect(signals).to.eql(expectedSignals);
    });

    it('should properly get auctions ids from targeting', () => {
      const auctionsIds = getAuctionsIdsFromTargeting(mockTargeting, mockAuctionManager);
      expect(auctionsIds).to.eql([mocksAuctions[0].auctionId, mocksAuctions[1].auctionId]);
    });

    it('should filter out adIds that do not map to any auction', () => {
      const auctionsIds = getAuctionsIdsFromTargeting({
        ...mockTargeting,
        'au': { 'hb_adid': 'missing' },
      }, mockAuctionManager);
      expect(auctionsIds).to.eql([mocksAuctions[0].auctionId, mocksAuctions[1].auctionId]);
    });

    it('should properly return empty array of auction ids for invalid targeting', () => {
      let auctionsIds = getAuctionsIdsFromTargeting({}, mockAuctionManager);
      expect(Array.isArray(auctionsIds)).to.equal(true);
      expect(auctionsIds).to.length(0);
      auctionsIds = getAuctionsIdsFromTargeting({ '/123456/header-bid-tag-0/bg': { 'invalidContent': '123' } }, mockAuctionManager);
      expect(Array.isArray(auctionsIds)).to.equal(true);
      expect(auctionsIds).to.length(0);
    });

    it('should properly get signals from auctions', () => {
      const signals = getSignalsArrayByAuctionsIds(['1111', '234234', '234324234'], mockAuctionManager.index);
      const intersection = getSignalsIntersection(signals);
      const expectedResult = { IAB_AUDIENCE_1_1: { values: ['2'] }, IAB_CONTENT_2_2: { values: [] } };
      expect(JSON.stringify(intersection)).to.be.equal(JSON.stringify(expectedResult));
    });

    it('should return empty signals array for empty auctions ids array', () => {
      const signals = getSignalsArrayByAuctionsIds([], mockAuctionManager.index);
      expect(Array.isArray(signals)).to.equal(true);
      expect(signals).to.length(0);
    });

    it('should return properly formatted object for getSignalsIntersection invoked with empty array', () => {
      const signals = getSignalsIntersection([]);
      expect(Object.keys(signals)).to.contain.members(taxonomies);
    });
  });

  describe('requestHook integration', () => {
    it('does not register GPT request hook or stub requestBids when mode is disabled or invalid', () => {
      config.setConfig({ gptPreAuction: { enabled: true } });
      expect(window.googletag._requestHooks).to.have.length(0);
      expect(getHook('requestBids').getHooks({ hook: requestBidsStub }).length).to.equal(0);

      config.setConfig({ gptPreAuction: { enabled: true, requestHook: { mode: 'disabled' } } });
      expect(window.googletag._requestHooks).to.have.length(0);

      config.setConfig({ gptPreAuction: { enabled: true, requestHook: { mode: 'invalid' } } });
      expect(window.googletag._requestHooks).to.have.length(0);
      expect(getHook('requestBids').getHooks({ hook: requestBidsStub }).length).to.equal(0);
    });

    it('synchronously registers GPT request hook and avoids duplicate registrations when mode is test', () => {
      config.setConfig({ gptPreAuction: { enabled: true, requestHook: { mode: 'test' } } });
      config.setConfig({ gptPreAuction: { enabled: true, requestHook: { mode: 'test' } } });

      expect(window.googletag._requestHooks).to.have.length(1);
      expect(window.googletag._requestHooks[0].hook).to.equal(gptRequestHook);
      expect(window.googletag._requestHooks[0].hookId).to.match(/^gpt-pre-auction-v/);
      expect(getHook('requestBids').getHooks({ hook: requestBidsStub }).length).to.equal(1);
    });

    it('prepends hook registration to googletag.cmd when GPT is not yet ready', () => {
      const savedGoogletag = window.googletag;
      const order = [];
      try {
        window.googletag = {
          cmd: [() => order.push('pendingDisplay')]
        };

        config.setConfig({ gptPreAuction: { enabled: true, requestHook: { mode: 'test' } } });
        expect(window.googletag.cmd).to.have.length(2);

        const queuedCmds = window.googletag.cmd.slice();
        window.googletag = savedGoogletag;
        window.googletag._requestHooks = [];

        queuedCmds.forEach(fn => {
          fn();
          if (window.googletag._requestHooks.length === 1 && order.length === 0) {
            order.push('hookRegistered');
          }
        });

        expect(order).to.deep.equal(['hookRegistered', 'pendingDisplay']);
        expect(window.googletag._requestHooks).to.have.length(1);
      } finally {
        window.googletag = savedGoogletag;
      }
    });

    it('initializes googletag.cmd when googletag is undefined and skips registration if disabled before cmd runs', () => {
      const savedGoogletag = window.googletag;
      try {
        window.googletag = undefined;

        config.setConfig({ gptPreAuction: { enabled: true, requestHook: { mode: 'test' } } });
        expect(window.googletag).to.be.an('object');
        expect(window.googletag.cmd).to.be.an('array').with.lengthOf(1);

        const queuedFn = window.googletag.cmd[0];
        config.setConfig({ gptPreAuction: { enabled: true, requestHook: { mode: 'disabled' } } });

        window.googletag = savedGoogletag;
        window.googletag._requestHooks = [];
        queuedFn();

        expect(window.googletag._requestHooks).to.have.length(0);
      } finally {
        window.googletag = savedGoogletag;
      }
    });

    it('falls back to googletag.cmd.push when cmd is a non-array command queue', () => {
      const savedGoogletag = window.googletag;
      try {
        const pushed = [];
        window.googletag = {
          cmd: {
            push: fn => pushed.push(fn)
          }
        };

        config.setConfig({ gptPreAuction: { enabled: true, requestHook: { mode: 'test' } } });
        expect(pushed).to.have.length(1);

        window.googletag = savedGoogletag;
        window.googletag._requestHooks = [];
        pushed[0]();
        expect(window.googletag._requestHooks).to.have.length(1);
      } finally {
        window.googletag = savedGoogletag;
      }
    });

    it('maps slots via isAdUnitCodeMatchingSlot, deduplicates codes, requests bids, and applies GPT targeting', async () => {
      const pbjs = getGlobal();
      const prevAdUnits = pbjs.adUnits;
      try {
        pbjs.adUnits = [
          { code: 'slotCode1' },
          { code: 'div2' },
          { code: 'div2' },
          { code: 'CUSTOM_SLOT_3' },
          { code: 'unmatchedCode' }
        ];
        config.setConfig({
          customGptSlotMatching: slot => adUnitCode =>
            adUnitCode === slot.getAdUnitPath() ||
            adUnitCode === slot.getSlotElementId() ||
            (slot.getAdUnitPath() === 'slotCode3' && adUnitCode === 'CUSTOM_SLOT_3')
        });

        const requestBidsSpy = sandbox.stub(pbjs, 'requestBids').resolves({ bids: {} });
        const setTargetingSpy = sandbox.stub(pbjs, 'setTargetingForGPTAsync');

        await gptRequestHook({
          slots: [
            makeSlot({ code: 'slotCode1', divId: 'div1' }),
            makeSlot({ code: 'slotCode2', divId: 'div2' }),
            makeSlot({ code: 'slotCode2', divId: 'div2' }),
            makeSlot({ code: 'slotCode3', divId: 'div3' })
          ]
        });

        sinon.assert.calledOnce(requestBidsSpy);
        const reqOpts = requestBidsSpy.firstCall.args[0];
        expect(reqOpts.adUnitCodes).to.deep.equal(['slotCode1', 'div2', 'CUSTOM_SLOT_3']);
        expect(reqOpts[INTERNAL_REQUEST_SYM]).to.equal(true);
        sinon.assert.calledOnceWithExactly(setTargetingSpy, ['slotCode1', 'div2', 'CUSTOM_SLOT_3']);
      } finally {
        pbjs.adUnits = prevAdUnits;
        config.resetConfig();
      }
    });

    it('early-returns without invoking requestBids when no ad units match the requested slots', async () => {
      const pbjs = getGlobal();
      const prevAdUnits = pbjs.adUnits;
      try {
        pbjs.adUnits = [{ code: 'otherAdUnit' }];
        const requestBidsSpy = sandbox.stub(pbjs, 'requestBids').resolves({ bids: {} });
        const setTargetingSpy = sandbox.stub(pbjs, 'setTargetingForGPTAsync');

        await gptRequestHook({
          slots: [makeSlot({ code: 'slotCode1', divId: 'div1' })]
        });

        sinon.assert.notCalled(requestBidsSpy);
        sinon.assert.notCalled(setTargetingSpy);
      } finally {
        pbjs.adUnits = prevAdUnits;
      }
    });

    it('stubs external promise-based requestBids calls in test mode and resolves immediately', async () => {
      const pbjs = getGlobal();
      const warnSpy = sandbox.spy(utils, 'logWarn');
      const startAuctionSpy = sinon.spy();
      const startAuctionHook = (next, opts) => {
        startAuctionSpy(opts);
        return next.bail(undefined);
      };
      getHook('startAuction').before(startAuctionHook, 100);

      try {
        config.setConfig({ gptPreAuction: { enabled: true, requestHook: { mode: 'test' } } });

        const result = await pbjs.requestBids({ adUnitCodes: ['div1'] });

        expect(result).to.deep.equal({
          bids: {},
          timedOut: false,
          auctionId: undefined
        });
        sinon.assert.calledOnce(warnSpy);
        sinon.assert.notCalled(startAuctionSpy);
      } finally {
        getHook('startAuction').getHooks({ hook: startAuctionHook }).remove();
      }
    });

    it('invokes bidsBackHandler safely on external calls while allowing internal hook requestBids through', async () => {
      const pbjs = getGlobal();
      const prevAdUnits = pbjs.adUnits;
      const errorSpy = sandbox.spy(utils, 'logError');
      const startAuctionSpy = sinon.spy();
      const startAuctionHook = (next, opts) => {
        startAuctionSpy(opts);
        opts.defer.resolve({ bids: { div1: { bids: [] } }, timedOut: false, auctionId: 'auc-1' });
        return next.bail(undefined);
      };
      getHook('startAuction').before(startAuctionHook, 100);
      const setTargetingSpy = sandbox.stub(pbjs, 'setTargetingForGPTAsync');

      try {
        pbjs.adUnits = [{ code: 'div1', bids: [] }];
        config.setConfig({ gptPreAuction: { enabled: true, requestHook: { mode: 'test' } } });

        // 1. Throwing bidsBackHandler is caught and logged without rejecting the stubbed promise
        const throwResult = await pbjs.requestBids({
          adUnitCodes: ['div1'],
          bidsBackHandler: () => {
            throw new Error('publisher callback boom');
          }
        });
        expect(throwResult).to.deep.equal({ bids: {}, timedOut: false, auctionId: undefined });
        sinon.assert.calledOnce(errorSpy);
        sinon.assert.notCalled(startAuctionSpy);

        // 2. Callback-based publisher flow triggers GPT request hook -> runs real internal auction once
        let hookPromise;
        const pubBidsBackHandler = sinon.spy(() => {
          hookPromise = window.googletag._requestHooks[0].hook({
            slots: [makeSlot({ code: '/1111/home', divId: 'div1' })]
          });
        });

        await pbjs.requestBids({
          adUnitCodes: ['div1'],
          bidsBackHandler: pubBidsBackHandler
        });
        await hookPromise;

        sinon.assert.calledOnce(pubBidsBackHandler);
        sinon.assert.calledOnce(startAuctionSpy);
        expect(startAuctionSpy.firstCall.args[0].adUnitCodes).to.deep.equal(['div1']);
        expect(startAuctionSpy.firstCall.args[0].bidsBackHandler).to.equal(undefined);
        sinon.assert.calledOnceWithExactly(setTargetingSpy, ['div1']);
      } finally {
        pbjs.adUnits = prevAdUnits;
        getHook('startAuction').getHooks({ hook: startAuctionHook }).remove();
      }
    });

    it('unregisters GPT request hook and requestBids stub when disabled and supports toggling back on', async () => {
      const pbjs = getGlobal();
      const startAuctionSpy = sinon.spy();
      const startAuctionHook = (next, opts) => {
        startAuctionSpy(opts);
        opts.defer.resolve({ bids: {}, timedOut: false, auctionId: 'auc-real' });
        return next.bail(undefined);
      };
      getHook('startAuction').before(startAuctionHook, 100);

      try {
        config.setConfig({ gptPreAuction: { enabled: true, requestHook: { mode: 'test' } } });
        expect(window.googletag._requestHooks).to.have.length(1);
        expect(getHook('requestBids').getHooks({ hook: requestBidsStub }).length).to.equal(1);

        // Transition mode -> 'disabled'
        config.setConfig({ gptPreAuction: { enabled: true, requestHook: { mode: 'disabled' } } });
        expect(window.googletag._requestHooks).to.have.length(0);
        expect(getHook('requestBids').getHooks({ hook: requestBidsStub }).length).to.equal(0);

        const resAfterDisable = await pbjs.requestBids({ adUnitCodes: ['div1'] });
        expect(resAfterDisable.auctionId).to.equal('auc-real');
        sinon.assert.calledOnce(startAuctionSpy);

        // Toggle back to 'test', then disable entire gptPreAuction module
        config.setConfig({ gptPreAuction: { enabled: true, requestHook: { mode: 'test' } } });
        expect(window.googletag._requestHooks).to.have.length(1);
        expect(getHook('requestBids').getHooks({ hook: requestBidsStub }).length).to.equal(1);

        config.setConfig({ gptPreAuction: { enabled: false } });
        expect(window.googletag._requestHooks).to.have.length(0);
        expect(getHook('requestBids').getHooks({ hook: requestBidsStub }).length).to.equal(0);
      } finally {
        getHook('startAuction').getHooks({ hook: startAuctionHook }).remove();
      }
    });

    it('does not install requestBids stub when GPT is ready without registerRequestHook support', async () => {
      const pbjs = getGlobal();
      const warnSpy = sandbox.spy(utils, 'logWarn');
      const startAuctionSpy = sinon.spy();
      const startAuctionHook = (next, opts) => {
        startAuctionSpy(opts);
        opts.defer.resolve({ bids: {}, timedOut: false, auctionId: 'auc-fallback' });
        return next.bail(undefined);
      };
      getHook('startAuction').before(startAuctionHook, 100);
      sandbox.stub(window.googletag, 'pubads').returns({ getSlots: () => [] });

      try {
        config.setConfig({ gptPreAuction: { enabled: true, requestHook: { mode: 'test' } } });

        expect(getHook('requestBids').getHooks({ hook: requestBidsStub }).length).to.equal(0);
        sinon.assert.calledOnce(warnSpy);

        const res = await pbjs.requestBids({ adUnitCodes: ['div1'] });
        expect(res.auctionId).to.equal('auc-fallback');
        sinon.assert.calledOnce(startAuctionSpy);
      } finally {
        getHook('startAuction').getHooks({ hook: startAuctionHook }).remove();
      }
    });

    it('removes queued requestBids stub when GPT initializes without registerRequestHook support', () => {
      const savedGoogletag = window.googletag;
      const warnSpy = sandbox.spy(utils, 'logWarn');
      try {
        window.googletag = { cmd: [] };
        config.setConfig({ gptPreAuction: { enabled: true, requestHook: { mode: 'test' } } });
        expect(getHook('requestBids').getHooks({ hook: requestBidsStub }).length).to.equal(1);

        const queuedFn = window.googletag.cmd[0];
        window.googletag = {
          ...savedGoogletag,
          pubads: () => ({ getSlots: () => [] })
        };
        queuedFn();
        expect(getHook('requestBids').getHooks({ hook: requestBidsStub }).length).to.equal(0);
        sinon.assert.calledOnce(warnSpy);
      } finally {
        window.googletag = savedGoogletag;
      }
    });

    it('retains request-scoped adUnits from intercepted requestBids calls for the hook auction', async () => {
      const pbjs = getGlobal();
      const prevAdUnits = pbjs.adUnits;
      const startAuctionSpy = sinon.spy();
      const startAuctionHook = (next, opts) => {
        startAuctionSpy(opts);
        opts.defer.resolve({ bids: {}, timedOut: false, auctionId: 'auc-req-scoped' });
        return next.bail(undefined);
      };
      getHook('startAuction').before(startAuctionHook, 100);
      const setTargetingSpy = sandbox.stub(pbjs, 'setTargetingForGPTAsync');

      try {
        pbjs.adUnits = [];
        config.setConfig({ gptPreAuction: { enabled: true, requestHook: { mode: 'test' } } });

        const reqScopedAdUnits = [
          { code: 'div1', mediaTypes: { banner: { sizes: [[300, 250]] } }, bids: [] },
          { code: 'unmatchedDiv', mediaTypes: { banner: { sizes: [[728, 90]] } }, bids: [] }
        ];

        await pbjs.requestBids({ adUnits: reqScopedAdUnits });
        sinon.assert.notCalled(startAuctionSpy);

        await window.googletag._requestHooks[0].hook({
          slots: [makeSlot({ code: '/1111/home', divId: 'div1' })]
        });

        sinon.assert.calledOnce(startAuctionSpy);
        const auctionOpts = startAuctionSpy.firstCall.args[0];
        expect(auctionOpts.adUnitCodes).to.deep.equal(['div1']);
        expect(auctionOpts.adUnits).to.have.length(1);
        expect(auctionOpts.adUnits[0].code).to.equal('div1');
        sinon.assert.calledOnceWithExactly(setTargetingSpy, ['div1']);
      } finally {
        pbjs.adUnits = prevAdUnits;
        getHook('startAuction').getHooks({ hook: startAuctionHook }).remove();
      }
    });
  });
});
