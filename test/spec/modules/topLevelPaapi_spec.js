import {
  addPaapiConfigHook,
  getPAAPIConfig,
  registerSubmodule,
  reset as resetPaapi
} from '../../../modules/paapi.js';
import {config} from 'src/config.js';
import {BID_STATUS, EVENTS} from 'src/constants.js';
import * as events from 'src/events.js';
import {
  getPaapiAdId,
  getPAAPIBids,
  getRenderingDataHook, markWinningBidHook,
  parsePaapiAdId,
  parsePaapiSize, resizeCreativeHook,
  topLevelPAAPI
} from '/modules/topLevelPaapi.js';
import {auctionManager} from '../../../src/auctionManager.js';
import {expect} from 'chai/index.js';
import {getBidToRender} from '../../../src/adRendering.js';

describe('topLevelPaapi', () => {
  let sandbox, auctionConfig, next, auctionId, auctions;
  before(() => {
    resetPaapi();
  });
  beforeEach(() => {
    registerSubmodule(topLevelPAAPI);
  });
  afterEach(() => {
    resetPaapi();
  });
  beforeEach(() => {
    sandbox = sinon.createSandbox();
    auctions = {};
    sandbox.stub(auctionManager.index, 'getAuction').callsFake(({auctionId}) => auctions[auctionId]?.auction);
    next = sinon.stub();
    auctionId = 'auct';
    auctionConfig = {
      seller: 'mock.seller'
    };
    config.setConfig({
      paapi: {
        enabled: true,
        defaultForSlots: 1
      }
    });
  });
  afterEach(() => {
    config.resetConfig();
    sandbox.restore();
  });

  function addPaapiConfig(adUnitCode, auctionConfig, _auctionId = auctionId) {
    let auction = auctions[_auctionId];
    if (!auction) {
      auction = auctions[_auctionId] = {
        auction: {},
        adUnits: {}
      };
    }
    if (!auction.adUnits.hasOwnProperty(adUnitCode)) {
      auction.adUnits[adUnitCode] = {
        code: adUnitCode,
        ortb2Imp: {
          ext: {
            paapi: {
              requestedSize: {
                width: 123,
                height: 321
              }
            }
          }
        }
      };
    }
    addPaapiConfigHook(next, {adUnitCode, auctionId: _auctionId}, {
      config: {
        ...auctionConfig,
        auctionId: _auctionId,
        adUnitCode
      }
    });
  }

  function endAuctions() {
    Object.entries(auctions).forEach(([auctionId, {adUnits}]) => {
      events.emit(EVENTS.AUCTION_END, {auctionId, adUnitCodes: Object.keys(adUnits), adUnits: Object.values(adUnits)});
    });
  }

  describe('when configured', () => {
    let auctionConfig;
    beforeEach(() => {
      auctionConfig = {
        seller: 'top.seller',
        decisionLogicURL: 'https://top.seller/decision-logic.js'
      };
      config.mergeConfig({
        paapi: {
          topLevelSeller: {
            auctionConfig,
            autorun: false
          }
        }
      });
    });

    it('should augment config returned by getPAAPIConfig', () => {
      addPaapiConfig('au', auctionConfig);
      endAuctions();
      sinon.assert.match(getPAAPIConfig().au, auctionConfig);
    });

    it('should not choke if auction config is not defined', () => {
      const cfg = config.getConfig('paapi');
      delete cfg.topLevelSeller.auctionConfig;
      config.setConfig(cfg);
      addPaapiConfig('au', auctionConfig);
      endAuctions();
      expect(getPAAPIConfig().au.componentAuctions).to.exist;
    });

    it('should default resolveToConfig: false', () => {
      addPaapiConfig('au', auctionConfig);
      endAuctions();
      expect(getPAAPIConfig()['au'].resolveToConfig).to.eql(false);
    });

    describe('when autoRun is set', () => {
      let origRaa;
      beforeEach(() => {
        origRaa = navigator.runAdAuction;
        navigator.runAdAuction = sinon.stub();
      });
      afterEach(() => {
        navigator.runAdAuction = origRaa;
      });

      it('should start auctions automatically, when autoRun is set', () => {
        config.mergeConfig({
          paapi: {
            topLevelSeller: {
              autorun: true
            }
          }
        })
        addPaapiConfig('au', auctionConfig);
        endAuctions();
        sinon.assert.called(navigator.runAdAuction);
      });
    });

    describe('getPAAPIBids', () => {
      Object.entries({
        'a string URN': {
          pack: (val) => val,
          unpack: (urn) => ({urn}),
          canRender: true,
        },
        'a frameConfig object': {
          pack: (val) => ({val}),
          unpack: (val) => ({frameConfig: {val}}),
          canRender: false
        }
      }).forEach(([t, {pack, unpack, canRender}]) => {
        describe(`when runAdAuction returns ${t}`, () => {
          let raa;
          beforeEach(() => {
            raa = sinon.stub().callsFake((cfg) => {
              const {auctionId, adUnitCode} = cfg.componentAuctions[0];
              return Promise.resolve(pack(`raa-${adUnitCode}-${auctionId}`));
            });
          });

          function getBids(filters) {
            return getPAAPIBids(filters, raa);
          }

          function expectBids(actual, expected) {
            expect(Object.keys(actual)).to.eql(Object.keys(expected));
            Object.entries(expected).forEach(([au, val]) => {
              sinon.assert.match(actual[au], val == null ? val : {
                adId: sinon.match(val => parsePaapiAdId(val)[1] === au),
                width: 123,
                height: 321,
                source: 'paapi',
                ...unpack(val)
              });
            });
          }

          describe('with one auction config', () => {
            beforeEach(() => {
              addPaapiConfig('au', auctionConfig, 'auct');
              endAuctions();
            });
            it('should resolve to raa result', () => {
              return getBids({adUnitCode: 'au', auctionId}).then(result => {
                sinon.assert.calledWith(raa, sinon.match({
                  ...auctionConfig,
                  componentAuctions: sinon.match(cmp => cmp.find(cfg => sinon.match(cfg, auctionConfig)))
                }));
                expectBids(result, {au: 'raa-au-auct'});
              });
            });

            Object.entries({
              'returns null': () => Promise.resolve(),
              'throws': () => { throw new Error() },
              'rejects': () => Promise.reject(new Error())
            }).forEach(([t, behavior]) => {
              it('should resolve to null when runAdAuction returns null', () => {
                raa = sinon.stub().callsFake(behavior);
                return getBids({adUnitCode: 'au', auctionId: 'auct'}).then(result => {
                  expectBids(result, {au: null});
                });
              });
            })

            it('should resolve to the same result when called again', () => {
              getBids({adUnitCode: 'au', auctionId});
              return getBids({adUnitCode: 'au', auctionId: 'auct'}).then(result => {
                sinon.assert.calledOnce(raa);
                expectBids(result, {au: 'raa-au-auct'});
              });
            });

            describe('events', () => {
              beforeEach(() => {
                sandbox.stub(events, 'emit');
              });
              it('should fire PAAPI_RUN_AUCTION', () => {
                return Promise.all([
                  getBids({adUnitCode: 'au', auctionId}),
                  getBids({adUnitCode: 'other', auctionId})
                ]).then(() => {
                  sinon.assert.calledWith(events.emit, EVENTS.RUN_PAAPI_AUCTION, {
                    adUnitCode: 'au',
                    auctionId,
                    auctionConfig: sinon.match(auctionConfig)
                  });
                  sinon.assert.neverCalledWith(events.emit, EVENTS.RUN_PAAPI_AUCTION, {
                    adUnitCode: 'other'
                  });
                });
              });
              it('should fire PAAPI_BID', () => {
                return getBids({adUnitCode: 'au', auctionId}).then(() => {
                  sinon.assert.calledWith(events.emit, EVENTS.PAAPI_BID, sinon.match({
                    ...unpack('raa-au-auct'),
                    adUnitCode: 'au',
                    auctionId: 'auct'
                  }));
                });
              });
              it('should fire PAAPI_NO_BID', () => {
                raa = sinon.stub().callsFake(() => Promise.resolve(null));
                return getBids({adUnitCode: 'au', auctionId}).then(() => {
                  sinon.assert.calledWith(events.emit, EVENTS.PAAPI_NO_BID, sinon.match({
                    adUnitCode: 'au',
                    auctionId: 'auct'
                  }));
                });
              });

              it('should fire PAAPI_ERROR', () => {
                raa = sinon.stub().callsFake(() => Promise.reject(new Error('message')));
                return getBids({adUnitCode: 'au', auctionId}).then(res => {
                  expect(res).to.eql({au: null});
                  sinon.assert.calledWith(events.emit, EVENTS.PAAPI_ERROR, sinon.match({
                    adUnitCode: 'au',
                    auctionId: 'auct',
                    error: sinon.match({message: 'message'})
                  }));
                });
              });
            });

            it('should hook into getBidToRender', () => {
              return getBids({adUnitCode: 'au', auctionId}).then(res => {
                return getBidToRender(res.au.adId).then(bidToRender => [res.au, bidToRender])
              }).then(([paapiBid, bidToRender]) => {
                if (canRender) {
                  expect(bidToRender).to.eql(paapiBid)
                } else {
                  expect(bidToRender).to.not.exist;
                }
              });
            });

            describe('when overrideWinner is set', () => {
              let mockContextual;
              beforeEach(() => {
                mockContextual = {
                  adId: 'mock',
                  adUnitCode: 'au'
                }
                sandbox.stub(auctionManager, 'findBidByAdId').returns(mockContextual);
                config.mergeConfig({
                  paapi: {
                    topLevelSeller: {
                      overrideWinner: true
                    }
                  }
                });
              });

              it(`should ${!canRender ? 'NOT' : ''} override winning bid for the same adUnit`, () => {
                return Promise.all([
                  getBids({adUnitCode: 'au', auctionId}).then(res => res.au),
                  getBidToRender(mockContextual.adId)
                ]).then(([paapiBid, bidToRender]) => {
                  if (canRender) {
                    expect(bidToRender).to.eql(paapiBid);
                    expect(paapiBid.overriddenAdId).to.eql(mockContextual.adId);
                  } else {
                    expect(bidToRender).to.eql(mockContextual)
                  }
                })
              });

              it('should not override when the ad unit has no paapi winner', () => {
                mockContextual.adUnitCode = 'other';
                return getBidToRender(mockContextual.adId).then(bidToRender => {
                  expect(bidToRender).to.eql(mockContextual);
                })
              });

              it('should not override when already a paapi bid', () => {
                return getBids({adUnitCode: 'au', auctionId}).then(res => {
                  return getBidToRender(res.au.adId).then((bidToRender) => [bidToRender, res.au]);
                }).then(([bidToRender, paapiBid]) => {
                  expect(bidToRender).to.eql(canRender ? paapiBid : mockContextual)
                })
              });

              if (canRender) {
                it('should not not override when the bid was already rendered', () => {
                  getBids();
                  return getBidToRender(mockContextual.adId).then((bid) => {
                    // first pass - paapi wins over contextual
                    expect(bid.source).to.eql('paapi');
                    bid.status = BID_STATUS.RENDERED;
                    return getBidToRender(mockContextual.adId, false).then(bidToRender => [bid, bidToRender])
                  }).then(([paapiBid, bidToRender]) => {
                    // if `forRender` = false (bit retrieved for x-domain events and such)
                    // the referenced bid is still paapi
                    expect(bidToRender).to.eql(paapiBid);
                    return getBidToRender(mockContextual.adId);
                  }).then(bidToRender => {
                    // second pass, paapi has been rendered, contextual should win
                    expect(bidToRender).to.eql(mockContextual);
                    bidToRender.status = BID_STATUS.RENDERED;
                    return getBidToRender(mockContextual.adId, false);
                  }).then(bidToRender => {
                    // if the contextual bid has been rendered, it's the one being referenced
                    expect(bidToRender).to.eql(mockContextual);
                  });
                })
              }
            });
          });

          it('should resolve the same result from different filters', () => {
            const targets = {
              auct1: ['au1', 'au2'],
              auct2: ['au1', 'au3']
            };
            Object.entries(targets).forEach(([auctionId, adUnitCodes]) => {
              adUnitCodes.forEach(au => addPaapiConfig(au, auctionConfig, auctionId));
            });
            endAuctions();
            return Promise.all(
              [
                [
                  {adUnitCode: 'au1', auctionId: 'auct1'},
                  {
                    au1: 'raa-au1-auct1'
                  }
                ],
                [
                  {},
                  {
                    au1: 'raa-au1-auct2',
                    au2: 'raa-au2-auct1',
                    au3: 'raa-au3-auct2'
                  }
                ],
                [
                  {auctionId: 'auct1'},
                  {
                    au1: 'raa-au1-auct1',
                    au2: 'raa-au2-auct1'
                  }
                ],
                [
                  {adUnitCode: 'au1'},
                  {
                    au1: 'raa-au1-auct2'
                  }
                ],
              ].map(([filters, expected]) => getBids(filters).then(res => [res, expected]))
            ).then(res => {
              res.forEach(([actual, expected]) => {
                expectBids(actual, expected);
              });
            });
          });
        });
      });
    });
  });

  describe('when not configured', () => {
    it('should not alter configs returned by getPAAPIConfig', () => {
      addPaapiConfig('au', auctionConfig);
      endAuctions();
      expect(getPAAPIConfig().au.seller).to.not.exist;
    });
  });

  describe('paapi adId', () => {
    [
      ['auctionId', 'adUnitCode'],
      ['auction:id', 'adUnit:code'],
      ['auction:uid', 'ad:unit']
    ].forEach(([auctionId, adUnitCode]) => {
      it(`can encode and decode ${auctionId}, ${adUnitCode}`, () => {
        expect(parsePaapiAdId(getPaapiAdId(auctionId, adUnitCode))).to.eql([auctionId, adUnitCode]);
      });
    });

    [undefined, null, 'not-a-paapi-ad', 'paapi:/malformed'].forEach(adId => {
      it(`returns null for adId ${adId}`, () => {
        expect(parsePaapiAdId(adId)).to.not.exist;
      });
    });
  });

  describe('parsePaapiSize', () => {
    [
      [null, null],
      [undefined, null],
      [123, 123],
      ['123', 123],
      ['123px', 123],
      ['1sw', null],
      ['garbage', null]
    ].forEach(([input, expected]) => {
      it(`can parse ${input} => ${expected}`, () => {
        expect(parsePaapiSize(input)).to.eql(expected);
      });
    });
  });

  describe('rendering hooks', () => {
    let next;
    beforeEach(() => {
      next = sinon.stub()
      next.bail = sinon.stub()
    });
    describe('getRenderingDataHook', () => {
      it('intercepts paapi bids', () => {
        getRenderingDataHook(next, {
          source: 'paapi',
          width: 123,
          height: null,
          urn: 'url'
        });
        sinon.assert.calledWith(next.bail, {
          width: 123,
          height: null,
          adUrl: 'url'
        });
      });
      it('does not touch non-paapi bids', () => {
        getRenderingDataHook(next, {bid: 'data'}, {other: 'options'});
        sinon.assert.calledWith(next, {bid: 'data'}, {other: 'options'});
      });
    });

    describe('markWinnigBidsHook', () => {
      beforeEach(() => {
        sandbox.stub(events, 'emit');
      });
      it('handles paapi bids', () => {
        const bid = {source: 'paapi'};
        markWinningBidHook(next, bid);
        sinon.assert.notCalled(next);
        sinon.assert.called(next.bail);
        expect(bid.status).to.eql(BID_STATUS.RENDERED);
        sinon.assert.calledWith(events.emit, EVENTS.BID_WON, bid);
      });
      it('ignores non-paapi bids', () => {
        markWinningBidHook(next, {other: 'bid'});
        sinon.assert.calledWith(next, {other: 'bid'});
        sinon.assert.notCalled(next.bail);
      });
    });
  });
});
