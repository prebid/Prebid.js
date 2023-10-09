import {
  expect
} from 'chai';
import * as fledge from 'modules/fledgeForGpt.js';
import {config} from '../../../src/config.js';
import adapterManager from '../../../src/adapterManager.js';
import * as utils from '../../../src/utils.js';
import * as gptUtils from '../../../libraries/gptUtils/gptUtils.js';
import {hook} from '../../../src/hook.js';
import 'modules/appnexusBidAdapter.js';
import 'modules/rubiconBidAdapter.js';
import {parseExtPrebidFledge, setImpExtAe, setResponseFledgeConfigs} from 'modules/fledgeForGpt.js';
import * as events from 'src/events.js';
import CONSTANTS from 'src/constants.json';
import {getGlobal} from '../../../src/prebidGlobal.js';

describe('fledgeForGpt module', () => {
  let sandbox;

  beforeEach(() => {
    sandbox = sinon.sandbox.create();
  });
  afterEach(() => {
    sandbox.restore();
  });
  describe('addComponentAuction', function () {
    before(() => {
      fledge.init({enabled: true});
    });

    const fledgeAuctionConfig = {
      seller: 'bidder',
      mock: 'config'
    };

    describe('addComponentAuctionHook', function () {
      let nextFnSpy, mockGptSlot;
      beforeEach(function () {
        nextFnSpy = sinon.spy();
        mockGptSlot = {
          setConfig: sinon.stub(),
          getAdUnitPath: () => 'mock/gpt/au'
        };
        sandbox.stub(gptUtils, 'getGptSlotForAdUnitCode').callsFake(() => mockGptSlot);
      });

      it('should call next()', function () {
        fledge.addComponentAuctionHook(nextFnSpy, 'aid', 'auc', fledgeAuctionConfig);
        sinon.assert.calledWith(nextFnSpy, 'aid', 'auc', fledgeAuctionConfig);
      });

      it('should collect auction configs and route them to GPT at end of auction', () => {
        events.emit(CONSTANTS.EVENTS.AUCTION_INIT, {auctionId: 'aid'});
        const cf1 = {...fledgeAuctionConfig, id: 1, seller: 'b1'};
        const cf2 = {...fledgeAuctionConfig, id: 2, seller: 'b2'};
        fledge.addComponentAuctionHook(nextFnSpy, 'aid', 'au1', cf1);
        fledge.addComponentAuctionHook(nextFnSpy, 'aid', 'au2', cf2);
        events.emit(CONSTANTS.EVENTS.AUCTION_END, {auctionId: 'aid'});
        sinon.assert.calledWith(gptUtils.getGptSlotForAdUnitCode, 'au1');
        sinon.assert.calledWith(gptUtils.getGptSlotForAdUnitCode, 'au2');
        sinon.assert.calledWith(mockGptSlot.setConfig, {
          componentAuction: [{
            configKey: 'b1',
            auctionConfig: cf1,
          }]
        });
        sinon.assert.calledWith(mockGptSlot.setConfig, {
          componentAuction: [{
            configKey: 'b2',
            auctionConfig: cf2,
          }]
        });
      });

      it('should drop auction configs after end of auction', () => {
        events.emit(CONSTANTS.EVENTS.AUCTION_INIT, {auctionId: 'aid'});
        events.emit(CONSTANTS.EVENTS.AUCTION_END, {auctionId: 'aid'});
        fledge.addComponentAuctionHook(nextFnSpy, 'aid', 'au', fledgeAuctionConfig);
        events.emit(CONSTANTS.EVENTS.AUCTION_END, {auctionId: 'aid'});
        sinon.assert.notCalled(mockGptSlot.setConfig);
      });

      describe('floor signal', () => {
        before(() => {
          if (!getGlobal().convertCurrency) {
            getGlobal().convertCurrency = () => null;
            getGlobal().convertCurrency.mock = true;
          }
        });
        after(() => {
          if (getGlobal().convertCurrency.mock) {
            delete getGlobal().convertCurrency;
          }
        });

        beforeEach(() => {
          sandbox.stub(getGlobal(), 'convertCurrency').callsFake((amount, from, to) => {
            if (from === to) return amount;
            if (from === 'USD' && to === 'JPY') return amount * 100;
            if (from === 'JPY' && to === 'USD') return amount / 100;
            throw new Error('unexpected currency conversion');
          });
        });

        Object.entries({
          'bids': (payload, values) => {
            payload.bidsReceived = values
              .map((val) => ({adUnitCode: 'au', cpm: val.amount, currency: val.cur}))
              .concat([{adUnitCode: 'other', cpm: 10000, currency: 'EUR'}])
          },
          'no bids': (payload, values) => {
            payload.bidderRequests = values
              .map((val) => ({bids: [{adUnitCode: 'au', getFloor: () => ({floor: val.amount, currency: val.cur})}]}))
              .concat([{bids: {adUnitCode: 'other', getFloor: () => ({floor: -10000, currency: 'EUR'})}}])
          }
        }).forEach(([tcase, setup]) => {
          describe(`when auction has ${tcase}`, () => {
            Object.entries({
              'no currencies': {
                values: [{amount: 1}, {amount: 100}, {amount: 10}, {amount: 100}],
                'bids': {
                  bidfloor: 100,
                  bidfloorcur: undefined
                },
                'no bids': {
                  bidfloor: 1,
                  bidfloorcur: undefined,
                }
              },
              'only zero values': {
                values: [{amount: 0, cur: 'USD'}, {amount: 0, cur: 'JPY'}],
                'bids': {
                  bidfloor: undefined,
                  bidfloorcur: undefined,
                },
                'no bids': {
                  bidfloor: undefined,
                  bidfloorcur: undefined,
                }
              },
              'matching currencies': {
                values: [{amount: 10, cur: 'JPY'}, {amount: 100, cur: 'JPY'}],
                'bids': {
                  bidfloor: 100,
                  bidfloorcur: 'JPY',
                },
                'no bids': {
                  bidfloor: 10,
                  bidfloorcur: 'JPY',
                }
              },
              'mixed currencies': {
                values: [{amount: 10, cur: 'USD'}, {amount: 10, cur: 'JPY'}],
                'bids': {
                  bidfloor: 10,
                  bidfloorcur: 'USD'
                },
                'no bids': {
                  bidfloor: 10,
                  bidfloorcur: 'JPY',
                }
              }
            }).forEach(([t, testConfig]) => {
              const values = testConfig.values;
              const {bidfloor, bidfloorcur} = testConfig[tcase];

              describe(`with ${t}`, () => {
                let payload;
                beforeEach(() => {
                  payload = {auctionId: 'aid'};
                  setup(payload, values);
                });

                it('should populate bidfloor/bidfloorcur', () => {
                  events.emit(CONSTANTS.EVENTS.AUCTION_INIT, {auctionId: 'aid'});
                  fledge.addComponentAuctionHook(nextFnSpy, 'aid', 'au', fledgeAuctionConfig);
                  events.emit(CONSTANTS.EVENTS.AUCTION_END, payload);
                  sinon.assert.calledWith(mockGptSlot.setConfig, sinon.match(arg => {
                    return arg.componentAuction.some(au => au.auctionConfig.auctionSignals?.prebid?.bidfloor === bidfloor && au.auctionConfig.auctionSignals?.prebid?.bidfloorcur === bidfloorcur)
                  }))
                })
              });
            });
          })
        })
      });
    });
  });

  describe('fledgeEnabled', function () {
    const navProps = Object.fromEntries(['runAdAuction', 'joinAdInterestGroup'].map(p => [p, navigator[p]]));

    before(function () {
      // navigator.runAdAuction & co may not exist, so we can't stub it normally with
      // sinon.stub(navigator, 'runAdAuction') or something
      Object.keys(navProps).forEach(p => {
        navigator[p] = sinon.stub();
      });
      hook.ready();
    });

    after(function () {
      Object.entries(navProps).forEach(([p, orig]) => navigator[p] = orig);
    });

    afterEach(function () {
      config.resetConfig();
    });

    const adUnits = [{
      'code': '/19968336/header-bid-tag1',
      'mediaTypes': {
        'banner': {
          'sizes': [[728, 90]]
        },
      },
      'bids': [
        {
          'bidder': 'appnexus',
        },
        {
          'bidder': 'rubicon',
        },
      ]
    }];

    describe('with setBidderConfig()', () => {
      it('should set fledgeEnabled correctly per bidder', function () {
        config.setConfig({bidderSequence: 'fixed'});
        config.setBidderConfig({
          bidders: ['appnexus'],
          config: {
            fledgeEnabled: true,
            defaultForSlots: 1,
          }
        });

        const bidRequests = adapterManager.makeBidRequests(
          adUnits,
          Date.now(),
          utils.getUniqueIdentifierStr(),
          function callback() {
          },
          []
        );

        expect(bidRequests[0].bids[0].bidder).equals('appnexus');
        expect(bidRequests[0].fledgeEnabled).to.be.true;
        expect(bidRequests[0].defaultForSlots).to.equal(1);

        expect(bidRequests[1].bids[0].bidder).equals('rubicon');
        expect(bidRequests[1].fledgeEnabled).to.be.undefined;
        expect(bidRequests[1].defaultForSlots).to.be.undefined;
      });
    });

    describe('with setConfig()', () => {
      it('should set fledgeEnabled correctly per bidder', function () {
        config.setConfig({
          bidderSequence: 'fixed',
          fledgeForGpt: {
            enabled: true,
            bidders: ['appnexus'],
            defaultForSlots: 1,
          }
        });

        const bidRequests = adapterManager.makeBidRequests(
          adUnits,
          Date.now(),
          utils.getUniqueIdentifierStr(),
          function callback() {
          },
          []
        );

        expect(bidRequests[0].bids[0].bidder).equals('appnexus');
        expect(bidRequests[0].fledgeEnabled).to.be.true;
        expect(bidRequests[0].defaultForSlots).to.equal(1);

        expect(bidRequests[1].bids[0].bidder).equals('rubicon');
        expect(bidRequests[1].fledgeEnabled).to.be.undefined;
        expect(bidRequests[1].defaultForSlots).to.be.undefined;
      });

      it('should set fledgeEnabled correctly for all bidders', function () {
        config.setConfig({
          bidderSequence: 'fixed',
          fledgeForGpt: {
            enabled: true,
            defaultForSlots: 1,
          }
        });

        const bidRequests = adapterManager.makeBidRequests(
          adUnits,
          Date.now(),
          utils.getUniqueIdentifierStr(),
          function callback() {
          },
          []
        );

        expect(bidRequests[0].bids[0].bidder).equals('appnexus');
        expect(bidRequests[0].fledgeEnabled).to.be.true;
        expect(bidRequests[0].defaultForSlots).to.equal(1);

        expect(bidRequests[1].bids[0].bidder).equals('rubicon');
        expect(bidRequests[0].fledgeEnabled).to.be.true;
        expect(bidRequests[0].defaultForSlots).to.equal(1);
      });
    });
  });

  describe('ortb processors for fledge', () => {
    describe('when defaultForSlots is set', () => {
      it('imp.ext.ae should be set if fledge is enabled', () => {
        const imp = {};
        setImpExtAe(imp, {}, {bidderRequest: {fledgeEnabled: true, defaultForSlots: 1}});
        expect(imp.ext.ae).to.equal(1);
      });
      it('imp.ext.ae should be left intact if set on adunit and fledge is enabled', () => {
        const imp = {ext: {ae: 2}};
        setImpExtAe(imp, {}, {bidderRequest: {fledgeEnabled: true, defaultForSlots: 1}});
        expect(imp.ext.ae).to.equal(2);
      });
    });
    describe('when defaultForSlots is not defined', () => {
      it('imp.ext.ae should be removed if fledge is not enabled', () => {
        const imp = {ext: {ae: 1}};
        setImpExtAe(imp, {}, {bidderRequest: {}});
        expect(imp.ext.ae).to.not.exist;
      });
      it('imp.ext.ae should be left intact if fledge is enabled', () => {
        const imp = {ext: {ae: 2}};
        setImpExtAe(imp, {}, {bidderRequest: {fledgeEnabled: true}});
        expect(imp.ext.ae).to.equal(2);
      });
    });
    describe('parseExtPrebidFledge', () => {
      function packageConfigs(configs) {
        return {
          ext: {
            prebid: {
              fledge: {
                auctionconfigs: configs
              }
            }
          }
        };
      }

      function generateImpCtx(fledgeFlags) {
        return Object.fromEntries(Object.entries(fledgeFlags).map(([impid, fledgeEnabled]) => [impid, {imp: {ext: {ae: fledgeEnabled}}}]));
      }

      function generateCfg(impid, ...ids) {
        return ids.map((id) => ({impid, config: {id}}));
      }

      function extractResult(ctx) {
        return Object.fromEntries(
          Object.entries(ctx)
            .map(([impid, ctx]) => [impid, ctx.fledgeConfigs?.map(cfg => cfg.config.id)])
            .filter(([_, val]) => val != null)
        );
      }

      it('should collect fledge configs by imp', () => {
        const ctx = {
          impContext: generateImpCtx({e1: 1, e2: 1, d1: 0})
        };
        const resp = packageConfigs(
          generateCfg('e1', 1, 2, 3)
            .concat(generateCfg('e2', 4)
              .concat(generateCfg('d1', 5, 6)))
        );
        parseExtPrebidFledge({}, resp, ctx);
        expect(extractResult(ctx.impContext)).to.eql({
          e1: [1, 2, 3],
          e2: [4],
        });
      });
      it('should not choke if fledge config references unknown imp', () => {
        const ctx = {impContext: generateImpCtx({i: 1})};
        const resp = packageConfigs(generateCfg('unknown', 1));
        parseExtPrebidFledge({}, resp, ctx);
        expect(extractResult(ctx.impContext)).to.eql({});
      });
    });
    describe('setResponseFledgeConfigs', () => {
      it('should set fledgeAuctionConfigs paired with their corresponding bid id', () => {
        const ctx = {
          impContext: {
            1: {
              bidRequest: {bidId: 'bid1'},
              fledgeConfigs: [{config: {id: 1}}, {config: {id: 2}}]
            },
            2: {
              bidRequest: {bidId: 'bid2'},
              fledgeConfigs: [{config: {id: 3}}]
            },
            3: {
              bidRequest: {bidId: 'bid3'}
            }
          }
        };
        const resp = {};
        setResponseFledgeConfigs(resp, {}, ctx);
        expect(resp.fledgeAuctionConfigs).to.eql([
          {bidId: 'bid1', config: {id: 1}},
          {bidId: 'bid1', config: {id: 2}},
          {bidId: 'bid2', config: {id: 3}},
        ]);
      });
      it('should not set fledgeAuctionConfigs if none exist', () => {
        const resp = {};
        setResponseFledgeConfigs(resp, {}, {
          impContext: {
            1: {
              fledgeConfigs: []
            },
            2: {}
          }
        });
        expect(resp).to.eql({});
      });
    });
  });
});
