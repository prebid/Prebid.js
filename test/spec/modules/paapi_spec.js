import {expect} from 'chai';
import {config} from '../../../src/config.js';
import adapterManager from '../../../src/adapterManager.js';
import * as utils from '../../../src/utils.js';
import {deepAccess, deepClone} from '../../../src/utils.js';
import {hook} from '../../../src/hook.js';
import 'modules/appnexusBidAdapter.js';
import 'modules/rubiconBidAdapter.js';
import {
  addPaapiConfigHook,
  buyersToAuctionConfigs,
  getPAAPIConfig,
  getPAAPISize,
  IGB_TO_CONFIG,
  mergeBuyers,
  parseExtIgi,
  parseExtPrebidFledge,
  partitionBuyers,
  partitionBuyersByBidder,
  registerSubmodule,
  reset,
  setImpExtAe,
  setResponsePaapiConfigs
} from 'modules/paapi.js';
import * as events from 'src/events.js';
import {EVENTS} from 'src/constants.js';
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
      let getPAAPISizeStub;

      function getPAAPISizeHook(next, sizes) {
        next.bail(getPAAPISizeStub(sizes));
      }

      before(() => {
        getPAAPISize.before(getPAAPISizeHook, 100);
      });

      after(() => {
        getPAAPISize.getHooks({hook: getPAAPISizeHook}).remove();
      });

      beforeEach(() => {
        getPAAPISizeStub = sinon.stub();
      });

      describe('getPAAPIConfig', function () {
        let nextFnSpy, auctionConfig, paapiConfig;
        before(() => {
          config.setConfig({[configNS]: {enabled: true}});
        });
        beforeEach(() => {
          auctionConfig = {
            seller: 'bidder',
            mock: 'config'
          };
          paapiConfig = {
            config: auctionConfig
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
            addPaapiConfigHook(nextFnSpy, request, paapiConfig);
            sinon.assert.calledWith(nextFnSpy, request, paapiConfig);
          });

          describe('igb', () => {
            let igb1, igb2, buyerAuctionConfig;
            beforeEach(() => {
              igb1 = {
                origin: 'buyer1'
              };
              igb2 = {
                origin: 'buyer2'
              };
              buyerAuctionConfig = {
                seller: 'seller',
                decisionLogicURL: 'seller-decision-logic'
              };
              config.mergeConfig({
                [configNS]: {
                  componentSeller: {
                    auctionConfig: buyerAuctionConfig
                  }
                }
              });
            });

            function addIgb(request, igb) {
              addPaapiConfigHook(nextFnSpy, Object.assign({auctionId}, request), {igb});
            }

            it('should be collected into an auction config', () => {
              addIgb({adUnitCode: 'au1'}, igb1);
              addIgb({adUnitCode: 'au1'}, igb2);
              events.emit(EVENTS.AUCTION_END, {auctionId, adUnitCodes: ['au1']});
              const buyerConfig = getPAAPIConfig({auctionId}).au1.componentAuctions[0];
              sinon.assert.match(buyerConfig, {
                interestGroupBuyers: [igb1.origin, igb2.origin],
                ...buyerAuctionConfig
              });
            });

            describe('FPD', () => {
              let ortb2, ortb2Imp;
              beforeEach(() => {
                ortb2 = {'fpd': 1};
                ortb2Imp = {'fpd': 2};
              });

              function getBuyerAuctionConfig() {
                addIgb({adUnitCode: 'au1', ortb2, ortb2Imp}, igb1);
                events.emit(EVENTS.AUCTION_END, {auctionId, adUnitCodes: ['au1']});
                return getPAAPIConfig({auctionId}).au1.componentAuctions[0];
              }

              it('should be added to auction config', () => {
                sinon.assert.match(getBuyerAuctionConfig().perBuyerSignals[igb1.origin], {
                  prebid: {
                    ortb2,
                    ortb2Imp
                  }
                });
              });

              it('should not override existing perBuyerSignals', () => {
                const original = {
                  ortb2: {
                    fpd: 'original'
                  }
                };
                igb1.pbs = {
                  prebid: deepClone(original)
                };
                sinon.assert.match(getBuyerAuctionConfig().perBuyerSignals[igb1.origin], {
                  prebid: original
                });
              });
            });
          });

          describe('should collect auction configs', () => {
            let cf1, cf2;
            beforeEach(() => {
              cf1 = {...auctionConfig, id: 1, seller: 'b1'};
              cf2 = {...auctionConfig, id: 2, seller: 'b2'};
              addPaapiConfigHook(nextFnSpy, {auctionId, adUnitCode: 'au1'}, {config: cf1});
              addPaapiConfigHook(nextFnSpy, {auctionId, adUnitCode: 'au2'}, {config: cf2});
              events.emit(EVENTS.AUCTION_END, {auctionId, adUnitCodes: ['au1', 'au2', 'au3']});
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
              });
              it('includes the targeted adUnit', () => {
                expect(getPAAPIConfig({adUnitCode: 'au3'}, true)).to.eql({
                  au3: null
                });
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
              });
            });
          });

          it('should drop auction configs after end of auction', () => {
            events.emit(EVENTS.AUCTION_END, {auctionId});
            addPaapiConfigHook(nextFnSpy, {auctionId, adUnitCode: 'au'}, paapiConfig);
            events.emit(EVENTS.AUCTION_END, {auctionId});
            expect(getPAAPIConfig({auctionId})).to.eql({});
          });

          describe('FPD', () => {
            let ortb2, ortb2Imp;
            beforeEach(() => {
              ortb2 = {fpd: 1};
              ortb2Imp = {fpd: 2};
            });

            function getComponentAuctionConfig() {
              addPaapiConfigHook(nextFnSpy, {
                auctionId,
                adUnitCode: 'au1',
                ortb2: {fpd: 1},
                ortb2Imp: {fpd: 2}
              }, paapiConfig);
              events.emit(EVENTS.AUCTION_END, {auctionId});
              return getPAAPIConfig({auctionId}).au1.componentAuctions[0];
            }

            it('should be added to auctionSignals', () => {
              sinon.assert.match(getComponentAuctionConfig().auctionSignals, {
                prebid: {ortb2, ortb2Imp}
              });
            });
            it('should not override existing auctionSignals', () => {
              auctionConfig.auctionSignals = {prebid: {ortb2: {fpd: 'original'}}};
              sinon.assert.match(getComponentAuctionConfig().auctionSignals, {
                prebid: {
                  ortb2: {fpd: 'original'},
                  ortb2Imp
                }
              });
            });

            it('should be added to perBuyerSignals', () => {
              auctionConfig.interestGroupBuyers = ['buyer1', 'buyer2'];
              const pbs = getComponentAuctionConfig().perBuyerSignals;
              sinon.assert.match(pbs, {
                buyer1: {prebid: {ortb2, ortb2Imp}},
                buyer2: {prebid: {ortb2, ortb2Imp}}
              });
            });

            it('should not override existing perBuyerSignals', () => {
              auctionConfig.interestGroupBuyers = ['buyer'];
              const original = {
                prebid: {
                  ortb2: {
                    fpd: 'original'
                  }
                }
              };
              auctionConfig.perBuyerSignals = {
                buyer: deepClone(original)
              };
              sinon.assert.match(getComponentAuctionConfig().perBuyerSignals.buyer, original);
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
                events.emit(EVENTS.AUCTION_END, {auctionId, adUnitCodes: ['au']});
                submods.forEach(submod => sinon.assert.calledWith(submod.onAuctionConfig, auctionId, {au: null}));
              });
              it('is invoked with relevant configs', () => {
                addPaapiConfigHook(nextFnSpy, {auctionId, adUnitCode: 'au1'}, paapiConfig);
                addPaapiConfigHook(nextFnSpy, {auctionId, adUnitCode: 'au2'}, paapiConfig);
                events.emit(EVENTS.AUCTION_END, {auctionId, adUnitCodes: ['au1', 'au2', 'au3']});
                submods.forEach(submod => {
                  sinon.assert.calledWith(submod.onAuctionConfig, auctionId, {
                    au1: {componentAuctions: [auctionConfig]},
                    au2: {componentAuctions: [auctionConfig]},
                    au3: null
                  });
                });
              });
              it('removes configs from getPAAPIConfig if the module calls markAsUsed', () => {
                submods[0].onAuctionConfig.callsFake((auctionId, configs, markAsUsed) => {
                  markAsUsed('au1');
                });
                addPaapiConfigHook(nextFnSpy, {auctionId, adUnitCode: 'au1'}, paapiConfig);
                events.emit(EVENTS.AUCTION_END, {auctionId, adUnitCodes: ['au1']});
                expect(getPAAPIConfig()).to.eql({});
              });
              it('keeps them available if they do not', () => {
                addPaapiConfigHook(nextFnSpy, {auctionId, adUnitCode: 'au1'}, paapiConfig);
                events.emit(EVENTS.AUCTION_END, {auctionId, adUnitCodes: ['au1']});
                expect(getPAAPIConfig()).to.not.be.empty;
              });
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
                      addPaapiConfigHook(nextFnSpy, {auctionId, adUnitCode: 'au'}, paapiConfig);
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

          describe('requestedSize', () => {
            let adUnit;
            beforeEach(() => {
              adUnit = {
                code: 'au',
              };
            });

            function getConfig() {
              addPaapiConfigHook(nextFnSpy, {auctionId, adUnitCode: adUnit.code}, paapiConfig);
              events.emit(EVENTS.AUCTION_END, {auctionId, adUnitCodes: [adUnit.code], adUnits: [adUnit]});
              return getPAAPIConfig()[adUnit.code];
            }

            Object.entries({
              'adUnit.ortb2Imp.ext.paapi.requestedSize'() {
                adUnit.ortb2Imp = {
                  ext: {
                    paapi: {
                      requestedSize: {
                        width: 123,
                        height: 321
                      }
                    }
                  }
                };
              },
              'largest size'() {
                getPAAPISizeStub.returns([123, 321]);
              }
            }).forEach(([t, setup]) => {
              describe(`should be set from ${t}`, () => {
                beforeEach(setup);

                it('without overriding component auctions, if set', () => {
                  auctionConfig.requestedSize = {width: '1px', height: '2px'};
                  expect(getConfig().componentAuctions[0].requestedSize).to.eql({
                    width: '1px',
                    height: '2px'
                  });
                });

                it('on component auction, if missing', () => {
                  expect(getConfig().componentAuctions[0].requestedSize).to.eql({
                    width: 123,
                    height: 321
                  });
                });

                it('on top level auction', () => {
                  expect(getConfig().requestedSize).to.eql({
                    width: 123,
                    height: 321,
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
                const cfg = {...auctionConfig, auctionId, adUnitCode};
                configs[auctionId][adUnitCode] = cfg;
                addPaapiConfigHook(nextFnSpy, {auctionId, adUnitCode}, {config: cfg});
              });
              events.emit(EVENTS.AUCTION_END, {auctionId, adUnitCodes: adUnitCodes.concat(noConfigAdUnitCodes)});
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
                });
              });
            });
          });
        });
      });

      describe('markForFledge', function () {
        const navProps = Object.fromEntries(['runAdAuction', 'joinAdInterestGroup'].map(p => [p, navigator[p]]));
        let adUnits;

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

        beforeEach(() => {
          getPAAPISizeStub = sinon.stub();
          adUnits = [{
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
        });

        afterEach(function () {
          config.resetConfig();
        });

        function mark() {
          return Object.fromEntries(
            adapterManager.makeBidRequests(
              adUnits,
              Date.now(),
              utils.getUniqueIdentifierStr(),
              function callback() {
              },
              []
            ).map(b => [b.bidderCode, b])
          );
        }

        function expectFledgeFlags(...enableFlags) {
          const bidRequests = mark();
          expect(bidRequests.appnexus.fledgeEnabled).to.eql(enableFlags[0].enabled);
          expect(bidRequests.appnexus.paapi?.enabled).to.eql(enableFlags[0].enabled);
          bidRequests.appnexus.bids.forEach(bid => expect(bid.ortb2Imp.ext.ae).to.eql(enableFlags[0].ae));

          expect(bidRequests.rubicon.fledgeEnabled).to.eql(enableFlags[1].enabled);
          expect(bidRequests.rubicon.paapi?.enabled).to.eql(enableFlags[1].enabled);
          bidRequests.rubicon.bids.forEach(bid => expect(bid.ortb2Imp?.ext?.ae).to.eql(enableFlags[1].ae));

          Object.values(bidRequests).flatMap(req => req.bids).forEach(bid => {
            if (bid.ortb2Imp?.ext?.ae) {
              sinon.assert.match(bid.ortb2Imp.ext.igs, {
                ae: bid.ortb2Imp.ext.ae,
                biddable: 1
              });
            }
          });
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

          Object.entries({
            'not set': {
              cfg: {},
              componentSeller: false
            },
            'set': {
              cfg: {
                componentSeller: {
                  auctionConfig: {
                    decisionLogicURL: 'publisher.example'
                  }
                }
              },
              componentSeller: true
            }
          }).forEach(([t, {cfg, componentSeller}]) => {
            it(`should set request paapi.componentSeller = ${componentSeller} when config componentSeller is ${t}`, () => {
              config.setConfig({
                [configNS]: {
                  enabled: true,
                  defaultForSlots: 1,
                  ...cfg
                }
              });
              Object.values(mark()).forEach(br => expect(br.paapi?.componentSeller).to.eql(componentSeller));
            });
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

          it('should populate ext.igs when request has ext.ae', () => {
            config.setConfig({
              bidderSequence: 'fixed',
              [configNS]: {
                enabled: true
              }
            });
            Object.assign(adUnits[0], {ortb2Imp: {ext: {ae: 3}}});
            expectFledgeFlags({enabled: true, ae: 3}, {enabled: true, ae: 3});
          });

          it('should not override pub-defined ext.igs', () => {
            config.setConfig({
              [configNS]: {
                enabled: true
              }
            });
            Object.assign(adUnits[0], {ortb2Imp: {ext: {ae: 1, igs: {biddable: 0}}}});
            const bidReqs = mark();
            Object.values(bidReqs).flatMap(req => req.bids).forEach(bid => {
              sinon.assert.match(bid.ortb2Imp.ext, {
                ae: 1,
                igs: {
                  ae: 1,
                  biddable: 0
                }
              });
            });
          });

          it('should fill ext.ae from ext.igs, if defined', () => {
            config.setConfig({
              [configNS]: {
                enabled: true
              }
            });
            Object.assign(adUnits[0], {ortb2Imp: {ext: {igs: {}}}});
            expectFledgeFlags({enabled: true, ae: 1}, {enabled: true, ae: 1});
          });
        });

        describe('ortb2Imp.ext.paapi.requestedSize', () => {
          beforeEach(() => {
            config.setConfig({
              [configNS]: {
                enabled: true,
                defaultForSlots: 1,
              }
            });
          });

          it('should default to value returned by getPAAPISize', () => {
            getPAAPISizeStub.returns([123, 321]);
            Object.values(mark()).flatMap(b => b.bids).forEach(bidRequest => {
              sinon.assert.match(bidRequest.ortb2Imp.ext.paapi, {
                requestedSize: {
                  width: 123,
                  height: 321
                }
              });
            });
          });

          it('should not be overridden, if provided by the pub', () => {
            adUnits[0].ortb2Imp = {
              ext: {
                paapi: {
                  requestedSize: {
                    width: '123px',
                    height: '321px'
                  }
                }
              }
            };
            Object.values(mark()).flatMap(b => b.bids).forEach(bidRequest => {
              sinon.assert.match(bidRequest.ortb2Imp.ext.paapi, {
                requestedSize: {
                  width: '123px',
                  height: '321px'
                }
              });
            });
            sinon.assert.notCalled(getPAAPISizeStub);
          });

          it('should not be set if adUnit has no banner sizes', () => {
            adUnits[0].mediaTypes = {
              video: {}
            };
            Object.values(mark()).flatMap(b => b.bids).forEach(bidRequest => {
              expect(bidRequest.ortb2Imp?.ext?.paapi?.requestedSize).to.not.exist;
            });
          });
        });
      });
    });
  });

  describe('igb', () => {
    let igb1, igb2;
    const buyer1 = 'https://buyer1.example';
    const buyer2 = 'https://buyer2.example';
    beforeEach(() => {
      igb1 = {
        origin: buyer1,
        cur: 'EUR',
        maxbid: 1,
        pbs: {
          signal: 1
        },
        ps: {
          priority: 1
        }
      };
      igb2 = {
        origin: buyer2,
        cur: 'USD',
        maxbid: 2,
        pbs: {
          signal: 2
        },
        ps: {
          priority: 2
        }
      };
    });

    describe('mergeBuyers', () => {
      it('should merge multiple igb into a partial auction config', () => {
        sinon.assert.match(mergeBuyers([igb1, igb2]), {
          interestGroupBuyers: [buyer1, buyer2],
          perBuyerCurrencies: {
            [buyer1]: 'EUR',
            [buyer2]: 'USD'
          },
          perBuyerSignals: {
            [buyer1]: {
              signal: 1
            },
            [buyer2]: {
              signal: 2
            }
          },
          perBuyerPrioritySignals: {
            [buyer1]: {
              priority: 1
            },
            [buyer2]: {
              priority: 2
            }
          },
          auctionSignals: {
            prebid: {
              perBuyerMaxbid: {
                [buyer1]: 1,
                [buyer2]: 2
              }
            }
          }
        });
      });

      Object.entries(IGB_TO_CONFIG).forEach(([igbField, configField]) => {
        it(`should not set ${configField} if ${igbField} is undefined`, () => {
          delete igb1[igbField];
          expect(deepAccess(mergeBuyers([igb1, igb2]), configField)[buyer1]).to.not.exist;
        });
      });

      it('ignores igbs that have no origin', () => {
        delete igb1.origin;
        expect(mergeBuyers([igb1, igb2])).to.eql(mergeBuyers([igb2]));
      });

      it('ignores igbs with duplicate origin', () => {
        igb2.origin = igb1.origin;
        expect(mergeBuyers([igb1, igb2])).to.eql(mergeBuyers([igb1]));
      });
    });

    describe('partitionBuyers', () => {
      it('should return a single partition when there are no duplicates', () => {
        expect(partitionBuyers([igb1, igb2])).to.eql([[igb1, igb2]]);
      });
      it('should ignore igbs that have no origin', () => {
        delete igb1.origin;
        expect(partitionBuyers([igb1, igb2])).to.eql([[igb2]]);
      });
      it('should return a single partition when duplicates exist, but do not conflict', () => {
        expect(partitionBuyers([igb1, igb2, deepClone(igb1)])).to.eql([[igb1, igb2]]);
      });
      it('should return multiple partitions when there are conflicts', () => {
        const igb3 = deepClone(igb1);
        const igb4 = deepClone(igb1);
        igb3.pbs.signal = 'conflict';
        igb4.ps.signal = 'conflict';
        expect(partitionBuyers([igb1, igb2, igb3, igb4])).to.eql([
          [igb1, igb2],
          [igb3],
          [igb4]
        ]);
      });
    });

    describe('partitionBuyersByBidder', () => {
      it('should split requests by bidder', () => {
        expect(partitionBuyersByBidder([[{bidder: 'a'}, igb1], [{bidder: 'b'}, igb2]])).to.eql([
          [{bidder: 'a'}, [igb1]],
          [{bidder: 'b'}, [igb2]]
        ]);
      });

      it('accepts repeated buyers, if from different bidders', () => {
        expect(partitionBuyersByBidder([
          [{bidder: 'a', extra: 'data'}, igb1],
          [{bidder: 'b', more: 'data'}, igb1],
          [{bidder: 'a'}, igb2],
          [{bidder: 'b'}, igb2]
        ])).to.eql([
          [{bidder: 'a', extra: 'data'}, [igb1, igb2]],
          [{bidder: 'b', more: 'data'}, [igb1, igb2]]
        ]);
      });
      describe('buyersToAuctionConfig', () => {
        let config, partitioners, merge, igbRequests;
        beforeEach(() => {
          config = {
            auctionConfig: {
              decisionLogicURL: 'mock-decision-logic'
            }
          };
          partitioners = {
            compact: sinon.stub(),
            expand: sinon.stub(),
          };
          let i = 0;
          merge = sinon.stub().callsFake(() => ({config: i++}));
          igbRequests = [
            [{}, igb1],
            [{}, igb2]
          ];
        });

        function toAuctionConfig(reqs = igbRequests) {
          return buyersToAuctionConfigs(reqs, merge, config, partitioners);
        }

        it('uses compact partitions by default, and returns an auction config for each one', () => {
          partitioners.compact.returns([[{}, 1], [{}, 2]]);
          const [cf1, cf2] = toAuctionConfig();
          sinon.assert.match(cf1, {
            ...config.auctionConfig,
            config: 0
          });
          sinon.assert.match(cf2, {
            ...config.auctionConfig,
            config: 1
          });
          sinon.assert.calledWith(partitioners.compact, igbRequests);
          [1, 2].forEach(mockPart => sinon.assert.calledWith(merge, mockPart));
        });

        it('uses per-bidder partition when config has separateAuctions', () => {
          config.separateAuctions = true;
          partitioners.expand.returns([]);
          toAuctionConfig();
          sinon.assert.called(partitioners.expand);
        });

        it('does not return any auction config when configuration does not specify auctionConfig', () => {
          delete config.auctionConfig;
          expect(toAuctionConfig()).to.eql([]);
          Object.values(partitioners).forEach(part => sinon.assert.notCalled(part));
        });

        it('sets FPD in auction signals when partitioner returns it', () => {
          const fpd = {
            ortb2: {fpd: 1},
            ortb2Imp: {fpd: 2}
          };
          partitioners.compact.returns([[{}], [fpd]]);
          const [cf1, cf2] = toAuctionConfig();
          expect(cf1.auctionSignals?.prebid).to.not.exist;
          expect(cf2.auctionSignals.prebid).to.eql(fpd);
        });
      });
    });
  });

  describe('getPAAPISize', () => {
    before(() => {
      getPAAPISize.getHooks().remove();
    });

    Object.entries({
      'ignores placeholders': {
        in: [[1, 1], [0, 0], [3, 4]],
        out: [3, 4]
      },
      'picks largest size by area': {
        in: [[200, 100], [150, 150]],
        out: [150, 150]
      },
      'can handle no sizes': {
        in: [],
        out: undefined
      },
      'can handle no input': {
        in: undefined,
        out: undefined
      }
    }).forEach(([t, {in: input, out}]) => {
      it(t, () => {
        expect(getPAAPISize(input)).to.eql(out);
      });
    });
  });

  describe('ortb processors for fledge', () => {
    it('imp.ext.ae should be removed if fledge is not enabled', () => {
      const imp = {ext: {ae: 1, igs: {}}};
      setImpExtAe(imp, {}, {bidderRequest: {}});
      expect(imp.ext.ae).to.not.exist;
      expect(imp.ext.igs).to.not.exist;
    });
    it('imp.ext.ae should be left intact if fledge is enabled', () => {
      const imp = {ext: {ae: 2, igs: {biddable: 0}}};
      setImpExtAe(imp, {}, {bidderRequest: {fledgeEnabled: true}});
      expect(imp.ext).to.eql({
        ae: 2,
        igs: {
          biddable: 0
        }
      });
    });

    describe('response parsing', () => {
      function generateImpCtx(fledgeFlags) {
        return Object.fromEntries(Object.entries(fledgeFlags).map(([impid, fledgeEnabled]) => [impid, {imp: {ext: {ae: fledgeEnabled}}}]));
      }

      function extractResult(type, ctx) {
        return Object.fromEntries(
          Object.entries(ctx)
            .map(([impid, ctx]) => [impid, ctx.paapiConfigs?.map(cfg => cfg[type].id)])
            .filter(([_, val]) => val != null)
        );
      }

      Object.entries({
        'parseExtPrebidFledge': {
          parser: parseExtPrebidFledge,
          responses: {
            'ext.prebid.fledge'(configs) {
              return {
                ext: {
                  prebid: {
                    fledge: {
                      auctionconfigs: configs
                    }
                  }
                }
              };
            },
          }
        },
        'parseExtIgi': {
          parser: parseExtIgi,
          responses: {
            'ext.igi.igs'(configs) {
              return {
                ext: {
                  igi: [{
                    igs: configs
                  }]
                }
              };
            },
            'ext.igi.igs with impid on igi'(configs) {
              return {
                ext: {
                  igi: configs.map(cfg => {
                    const impid = cfg.impid;
                    delete cfg.impid;
                    return {
                      impid,
                      igs: [cfg]
                    };
                  })
                }
              };
            },
            'ext.igi.igs with conflicting impid'(configs) {
              return {
                ext: {
                  igi: [{
                    impid: 'conflict',
                    igs: configs
                  }]
                }
              };
            }
          }
        }
      }).forEach(([t, {parser, responses}]) => {
        describe(t, () => {
          Object.entries(responses).forEach(([t, packageConfigs]) => {
            describe(`when response uses ${t}`, () => {
              function generateCfg(impid, ...ids) {
                return ids.map((id) => ({impid, config: {id}}));
              }

              it('should collect auction configs by imp', () => {
                const ctx = {
                  impContext: generateImpCtx({e1: 1, e2: 1, d1: 0})
                };
                const resp = packageConfigs(
                  generateCfg('e1', 1, 2, 3)
                    .concat(generateCfg('e2', 4)
                      .concat(generateCfg('d1', 5, 6)))
                );
                parser({}, resp, ctx);
                expect(extractResult('config', ctx.impContext)).to.eql({
                  e1: [1, 2, 3],
                  e2: [4],
                });
              });
              it('should not choke if fledge config references unknown imp', () => {
                const ctx = {impContext: generateImpCtx({i: 1})};
                const resp = packageConfigs(generateCfg('unknown', 1));
                parser({}, resp, ctx);
                expect(extractResult('config', ctx.impContext)).to.eql({});
              });
            });
          });
        });
      });

      describe('response ext.igi.igb', () => {
        it('should collect igb by imp', () => {
          const ctx = {
            impContext: generateImpCtx({e1: 1, e2: 1, d1: 0})
          };
          const resp = {
            ext: {
              igi: [
                {
                  impid: 'e1',
                  igb: [
                    {id: 1},
                    {id: 2}
                  ]
                },
                {
                  impid: 'e2',
                  igb: [
                    {id: 3}
                  ]
                },
                {
                  impid: 'd1',
                  igb: [
                    {id: 4}
                  ]
                }
              ]
            }
          };
          parseExtIgi({}, resp, ctx);
          expect(extractResult('igb', ctx.impContext)).to.eql({
            e1: [1, 2],
            e2: [3],
          });
        });
      });
    });

    describe('setResponsePaapiConfigs', () => {
      it('should set paapi configs/igb paired with their corresponding bid id', () => {
        const ctx = {
          impContext: {
            1: {
              bidRequest: {bidId: 'bid1'},
              paapiConfigs: [{config: {id: 1}}, {config: {id: 2}}]
            },
            2: {
              bidRequest: {bidId: 'bid2'},
              paapiConfigs: [{config: {id: 3}}]
            },
            3: {
              bidRequest: {bidId: 'bid3'}
            },
            4: {
              bidRequest: {bidId: 'bid1'},
              paapiConfigs: [{igb: {id: 4}}]
            }
          }
        };
        const resp = {};
        setResponsePaapiConfigs(resp, {}, ctx);
        expect(resp.paapi).to.eql([
          {bidId: 'bid1', config: {id: 1}},
          {bidId: 'bid1', config: {id: 2}},
          {bidId: 'bid2', config: {id: 3}},
          {bidId: 'bid1', igb: {id: 4}}
        ]);
      });
      it('should not set paapi if no config or igb exists', () => {
        const resp = {};
        setResponsePaapiConfigs(resp, {}, {
          impContext: {
            1: {
              paapiConfigs: []
            },
            2: {}
          }
        });
        expect(resp).to.eql({});
      });
    });
  });
});
