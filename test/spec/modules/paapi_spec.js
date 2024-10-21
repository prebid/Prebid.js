import {expect} from 'chai';
import {config} from '../../../src/config.js';
import adapterManager from '../../../src/adapterManager.js';
import * as utils from '../../../src/utils.js';
import {hook} from '../../../src/hook.js';
import 'modules/appnexusBidAdapter.js';
import 'modules/rubiconBidAdapter.js';
import {
  addComponentAuctionHook,
  getPAAPIConfig,
  parseExtPrebidFledge,
  registerSubmodule,
  setImpExtAe,
  setResponseFledgeConfigs,
  reset
} from 'modules/paapi.js';
import * as events from 'src/events.js';
import { EVENTS } from 'src/constants.js';
import {getGlobal} from '../../../src/prebidGlobal.js';
import {auctionManager} from '../../../src/auctionManager.js';
import {stubAuctionIndex} from '../../helpers/indexStub.js';
import {AuctionIndex} from '../../../src/auctionIndex.js';

describe('paapi module', () => {
  let sandbox;
  before(reset);
  beforeEach(() => {
    sandbox = sinon.sandbox.create();
  });
  afterEach(() => {
    sandbox.restore();
    reset();
  });

  [
    'fledgeForGpt',
    'paapi'
  ].forEach(configNS => {
    describe(`using ${configNS} for configuration`, () => {
      describe('getPAAPIConfig', function () {
        let nextFnSpy, fledgeAuctionConfig;
        before(() => {
          config.setConfig({[configNS]: {enabled: true}});
        });
        beforeEach(() => {
          fledgeAuctionConfig = {
            seller: 'bidder',
            mock: 'config'
          };
          nextFnSpy = sinon.spy();
        });

        describe('on a single auction', function () {
          const auctionId = 'aid';
          beforeEach(function () {
            sandbox.stub(auctionManager, 'index').value(stubAuctionIndex({auctionId}));
          });

          it('should call next()', function () {
            const request = {auctionId, adUnitCode: 'auc'};
            addComponentAuctionHook(nextFnSpy, request, fledgeAuctionConfig);
            sinon.assert.calledWith(nextFnSpy, request, fledgeAuctionConfig);
          });

          describe('should collect auction configs', () => {
            let cf1, cf2;
            beforeEach(() => {
              cf1 = {...fledgeAuctionConfig, id: 1, seller: 'b1'};
              cf2 = {...fledgeAuctionConfig, id: 2, seller: 'b2'};
              addComponentAuctionHook(nextFnSpy, {auctionId, adUnitCode: 'au1'}, cf1);
              addComponentAuctionHook(nextFnSpy, {auctionId, adUnitCode: 'au2'}, cf2);
              events.emit(EVENTS.AUCTION_END, { auctionId, adUnitCodes: ['au1', 'au2', 'au3'] });
            });

            it('and make them available at end of auction', () => {
              sinon.assert.match(getPAAPIConfig({auctionId}), {
                au1: {
                  componentAuctions: [cf1]
                },
                au2: {
                  componentAuctions: [cf2]
                }
              });
            });

            it('and filter them by ad unit', () => {
              const cfg = getPAAPIConfig({auctionId, adUnitCode: 'au1'});
              expect(Object.keys(cfg)).to.have.members(['au1']);
              sinon.assert.match(cfg.au1, {
                componentAuctions: [cf1]
              });
            });

            it('and not return them again', () => {
              getPAAPIConfig();
              const cfg = getPAAPIConfig();
              expect(cfg).to.eql({});
            });

            describe('includeBlanks = true', () => {
              it('includes all ad units', () => {
                const cfg = getPAAPIConfig({}, true);
                expect(Object.keys(cfg)).to.have.members(['au1', 'au2', 'au3']);
                expect(cfg.au3).to.eql(null);
              })
              it('includes the targeted adUnit', () => {
                expect(getPAAPIConfig({adUnitCode: 'au3'}, true)).to.eql({
                  au3: null
                })
              });
              it('includes the targeted auction', () => {
                const cfg = getPAAPIConfig({auctionId}, true);
                expect(Object.keys(cfg)).to.have.members(['au1', 'au2', 'au3']);
                expect(cfg.au3).to.eql(null);
              });
              it('does not include non-existing ad units', () => {
                expect(getPAAPIConfig({adUnitCode: 'other'})).to.eql({});
              });
              it('does not include non-existing auctions', () => {
                expect(getPAAPIConfig({auctionId: 'other'})).to.eql({});
              })
            });
          });

          it('should drop auction configs after end of auction', () => {
            events.emit(EVENTS.AUCTION_END, { auctionId });
            addComponentAuctionHook(nextFnSpy, {auctionId, adUnitCode: 'au'}, fledgeAuctionConfig);
            events.emit(EVENTS.AUCTION_END, { auctionId });
            expect(getPAAPIConfig({auctionId})).to.eql({});
          });

          it('should use first size as requestedSize', () => {
            addComponentAuctionHook(nextFnSpy, {
              auctionId,
              adUnitCode: 'au1',
            }, fledgeAuctionConfig);
            events.emit(EVENTS.AUCTION_END, {
              auctionId,
              adUnits: [
                {
                  code: 'au1',
                  mediaTypes: {
                    banner: {
                      sizes: [[200, 100], [300, 200]]
                    }
                  }
                }
              ]
            });
            expect(getPAAPIConfig({auctionId}).au1.requestedSize).to.eql({
              width: '200',
              height: '100'
            })
          })

          it('should augment auctionSignals with FPD', () => {
            addComponentAuctionHook(nextFnSpy, {
              auctionId,
              adUnitCode: 'au1',
              ortb2: {fpd: 1},
              ortb2Imp: {fpd: 2}
            }, fledgeAuctionConfig);
            events.emit(EVENTS.AUCTION_END, { auctionId });
            sinon.assert.match(getPAAPIConfig({auctionId}), {
              au1: {
                componentAuctions: [{
                  ...fledgeAuctionConfig,
                  auctionSignals: {
                    prebid: {
                      ortb2: {fpd: 1},
                      ortb2Imp: {fpd: 2}
                    }
                  }
                }]
              }
            });
          });

          describe('submodules', () => {
            let submods;
            beforeEach(() => {
              submods = [1, 2].map(i => ({
                name: `test${i}`,
                onAuctionConfig: sinon.stub()
              }));
              submods.forEach(registerSubmodule);
            });

            describe('onAuctionConfig', () => {
              const auctionId = 'aid';
              it('is invoked with null configs when there\'s no config', () => {
                events.emit(EVENTS.AUCTION_END, { auctionId, adUnitCodes: ['au'] });
                submods.forEach(submod => sinon.assert.calledWith(submod.onAuctionConfig, auctionId, {au: null}));
              });
              it('is invoked with relevant configs', () => {
                addComponentAuctionHook(nextFnSpy, {auctionId, adUnitCode: 'au1'}, fledgeAuctionConfig);
                addComponentAuctionHook(nextFnSpy, {auctionId, adUnitCode: 'au2'}, fledgeAuctionConfig);
                events.emit(EVENTS.AUCTION_END, { auctionId, adUnitCodes: ['au1', 'au2', 'au3'] });
                submods.forEach(submod => {
                  sinon.assert.calledWith(submod.onAuctionConfig, auctionId, {
                    au1: {componentAuctions: [fledgeAuctionConfig]},
                    au2: {componentAuctions: [fledgeAuctionConfig]},
                    au3: null
                  })
                });
              });
              it('removes configs from getPAAPIConfig if the module calls markAsUsed', () => {
                submods[0].onAuctionConfig.callsFake((auctionId, configs, markAsUsed) => {
                  markAsUsed('au1');
                });
                addComponentAuctionHook(nextFnSpy, {auctionId, adUnitCode: 'au1'}, fledgeAuctionConfig);
                events.emit(EVENTS.AUCTION_END, { auctionId, adUnitCodes: ['au1'] });
                expect(getPAAPIConfig()).to.eql({});
              });
              it('keeps them available if they do not', () => {
                addComponentAuctionHook(nextFnSpy, {auctionId, adUnitCode: 'au1'}, fledgeAuctionConfig);
                events.emit(EVENTS.AUCTION_END, { auctionId, adUnitCodes: ['au1'] });
                expect(getPAAPIConfig()).to.not.be.empty;
              })
            });
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
                  .concat([{adUnitCode: 'other', cpm: 10000, currency: 'EUR'}]);
              },
              'no bids': (payload, values) => {
                payload.bidderRequests = values
                  .map((val) => ({
                    bids: [{
                      adUnitCode: 'au',
                      getFloor: () => ({floor: val.amount, currency: val.cur})
                    }]
                  }))
                  .concat([{bids: {adUnitCode: 'other', getFloor: () => ({floor: -10000, currency: 'EUR'})}}]);
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
                      payload = {auctionId};
                      setup(payload, values);
                    });

                    it('should populate bidfloor/bidfloorcur', () => {
                      addComponentAuctionHook(nextFnSpy, {auctionId, adUnitCode: 'au'}, fledgeAuctionConfig);
                      events.emit(EVENTS.AUCTION_END, payload);
                      const cfg = getPAAPIConfig({auctionId}).au;
                      const signals = cfg.auctionSignals;
                      sinon.assert.match(cfg.componentAuctions[0].auctionSignals, signals || {});
                      expect(signals?.prebid?.bidfloor).to.eql(bidfloor);
                      expect(signals?.prebid?.bidfloorcur).to.eql(bidfloorcur);
                    });
                  });
                });
              });
            });
          });
        });

        describe('with multiple auctions', () => {
          const AUCTION1 = 'auction1';
          const AUCTION2 = 'auction2';

          function mockAuction(auctionId) {
            return {
              getAuctionId() {
                return auctionId;
              }
            };
          }

          function expectAdUnitsFromAuctions(actualConfig, auToAuctionMap) {
            expect(Object.keys(actualConfig)).to.have.members(Object.keys(auToAuctionMap));
            Object.entries(actualConfig).forEach(([au, cfg]) => {
              cfg.componentAuctions.forEach(cmp => expect(cmp.auctionId).to.eql(auToAuctionMap[au]));
            });
          }

          let configs;
          beforeEach(() => {
            const mockAuctions = [mockAuction(AUCTION1), mockAuction(AUCTION2)];
            sandbox.stub(auctionManager, 'index').value(new AuctionIndex(() => mockAuctions));
            configs = {[AUCTION1]: {}, [AUCTION2]: {}};
            Object.entries({
              [AUCTION1]: [['au1', 'au2'], ['missing-1']],
              [AUCTION2]: [['au2', 'au3'], []],
            }).forEach(([auctionId, [adUnitCodes, noConfigAdUnitCodes]]) => {
              adUnitCodes.forEach(adUnitCode => {
                const cfg = {...fledgeAuctionConfig, auctionId, adUnitCode};
                configs[auctionId][adUnitCode] = cfg;
                addComponentAuctionHook(nextFnSpy, {auctionId, adUnitCode}, cfg);
              });
              events.emit(EVENTS.AUCTION_END, { auctionId, adUnitCodes: adUnitCodes.concat(noConfigAdUnitCodes) });
            });
          });

          it('should filter by auction', () => {
            expectAdUnitsFromAuctions(getPAAPIConfig({auctionId: AUCTION1}), {au1: AUCTION1, au2: AUCTION1});
            expectAdUnitsFromAuctions(getPAAPIConfig({auctionId: AUCTION2}), {au2: AUCTION2, au3: AUCTION2});
          });

          it('should filter by auction and ad unit', () => {
            expectAdUnitsFromAuctions(getPAAPIConfig({auctionId: AUCTION1, adUnitCode: 'au2'}), {au2: AUCTION1});
            expectAdUnitsFromAuctions(getPAAPIConfig({auctionId: AUCTION2, adUnitCode: 'au2'}), {au2: AUCTION2});
          });

          it('should use last auction for each ad unit', () => {
            expectAdUnitsFromAuctions(getPAAPIConfig(), {au1: AUCTION1, au2: AUCTION2, au3: AUCTION2});
          });

          it('should filter by ad unit and use latest auction', () => {
            expectAdUnitsFromAuctions(getPAAPIConfig({adUnitCode: 'au2'}), {au2: AUCTION2});
          });

          it('should keep track of which configs were returned', () => {
            expectAdUnitsFromAuctions(getPAAPIConfig({auctionId: AUCTION1}), {au1: AUCTION1, au2: AUCTION1});
            expect(getPAAPIConfig({auctionId: AUCTION1})).to.eql({});
            expectAdUnitsFromAuctions(getPAAPIConfig(), {au2: AUCTION2, au3: AUCTION2});
          });

          describe('includeBlanks = true', () => {
            Object.entries({
              'auction with blanks': {
                filters: {auctionId: AUCTION1},
                expected: {au1: true, au2: true, 'missing-1': false}
              },
              'blank adUnit in an auction': {
                filters: {auctionId: AUCTION1, adUnitCode: 'missing-1'},
                expected: {'missing-1': false}
              },
              'non-existing auction': {
                filters: {auctionId: 'other'},
                expected: {}
              },
              'non-existing adUnit in an auction': {
                filters: {auctionId: AUCTION2, adUnitCode: 'other'},
                expected: {}
              },
              'non-existing ad unit': {
                filters: {adUnitCode: 'other'},
                expected: {},
              },
              'non existing ad unit in a non-existing auction': {
                filters: {adUnitCode: 'other', auctionId: 'other'},
                expected: {}
              },
              'all ad units': {
                filters: {},
                expected: {'au1': true, 'au2': true, 'missing-1': false, 'au3': true}
              }
            }).forEach(([t, {filters, expected}]) => {
              it(t, () => {
                const cfg = getPAAPIConfig(filters, true);
                expect(Object.keys(cfg)).to.have.members(Object.keys(expected));
                Object.entries(expected).forEach(([au, shouldBeFilled]) => {
                  if (shouldBeFilled) {
                    expect(cfg[au]).to.not.be.null;
                  } else {
                    expect(cfg[au]).to.be.null;
                  }
                })
              })
            })
          });
        });
      });

      describe('markForFledge', function () {
        const navProps = Object.fromEntries(['runAdAuction', 'joinAdInterestGroup'].map(p => [p, navigator[p]]));

        before(function () {
          // navigator.runAdAuction & co may not exist, so we can't stub it normally with
          // sinon.stub(navigator, 'runAdAuction') or something
          Object.keys(navProps).forEach(p => {
            navigator[p] = sinon.stub();
          });
          hook.ready();
          config.resetConfig();
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

        function expectFledgeFlags(...enableFlags) {
          const bidRequests = Object.fromEntries(
            adapterManager.makeBidRequests(
              adUnits,
              Date.now(),
              utils.getUniqueIdentifierStr(),
              function callback() {
              },
              []
            ).map(b => [b.bidderCode, b])
          );

          expect(bidRequests.appnexus.fledgeEnabled).to.eql(enableFlags[0].enabled);
          bidRequests.appnexus.bids.forEach(bid => expect(bid.ortb2Imp.ext.ae).to.eql(enableFlags[0].ae));

          expect(bidRequests.rubicon.fledgeEnabled).to.eql(enableFlags[1].enabled);
          bidRequests.rubicon.bids.forEach(bid => expect(bid.ortb2Imp?.ext?.ae).to.eql(enableFlags[1].ae));
        }

        describe('with setBidderConfig()', () => {
          it('should set fledgeEnabled correctly per bidder', function () {
            config.setBidderConfig({
              bidders: ['appnexus'],
              config: {
                defaultForSlots: 1,
                fledgeEnabled: true
              }
            });
            expectFledgeFlags({enabled: true, ae: 1}, {enabled: void 0, ae: void 0});
          });
        });

        describe('with setConfig()', () => {
          it('should set fledgeEnabled correctly per bidder', function () {
            config.setConfig({
              bidderSequence: 'fixed',
              [configNS]: {
                enabled: true,
                bidders: ['appnexus'],
                defaultForSlots: 1,
              }
            });
            expectFledgeFlags({enabled: true, ae: 1}, {enabled: false, ae: undefined});
          });

          it('should set fledgeEnabled correctly for all bidders', function () {
            config.setConfig({
              bidderSequence: 'fixed',
              [configNS]: {
                enabled: true,
                defaultForSlots: 1,
              }
            });
            expectFledgeFlags({enabled: true, ae: 1}, {enabled: true, ae: 1});
          });

          it('should not override pub-defined ext.ae', () => {
            config.setConfig({
              bidderSequence: 'fixed',
              [configNS]: {
                enabled: true,
                defaultForSlots: 1,
              }
            });
            Object.assign(adUnits[0], {ortb2Imp: {ext: {ae: 0}}});
            expectFledgeFlags({enabled: true, ae: 0}, {enabled: true, ae: 0});
          });
        });
      });
    });
  });

  describe('ortb processors for fledge', () => {
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
