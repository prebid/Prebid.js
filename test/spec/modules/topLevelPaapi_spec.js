import {
  addComponentAuctionHook,
  getPAAPIConfig,
  registerSubmodule,
  reset as resetPaapi
} from '../../../modules/paapi.js';
import {config} from 'src/config.js';
import {EVENTS} from 'src/constants.js';
import * as events from 'src/events.js';
import {getPAAPIBids, topLevelPAAPI} from '/modules/topLevelPaapi.js';
import {auctionManager} from '../../../src/auctionManager.js';

describe('topLevelPaapi', () => {
  let sandbox, paapiConfig, next, auctionId, auctions;
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
    paapiConfig = {
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
      auction.adUnits[adUnitCode] = {code: adUnitCode};
    }
    addComponentAuctionHook(next, {adUnitCode, auctionId: _auctionId}, {
      ...auctionConfig,
      auctionId: _auctionId,
      adUnitCode
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
            auctionConfig
          }
        }
      });
    });

    it('should augment config returned by getPAAPIConfig', () => {
      addPaapiConfig('au', paapiConfig);
      endAuctions();
      sinon.assert.match(getPAAPIConfig().au, auctionConfig);
    });

    it('should default resolveToConfig: false', () => {
      addPaapiConfig('au', paapiConfig);
      endAuctions();
      expect(getPAAPIConfig()['au'].resolveToConfig).to.eql(false);
    });

    describe('getPAAPIBids', () => {
      let raa;
      beforeEach(() => {
        raa = sinon.stub().callsFake((cfg) => {
          const {auctionId, adUnitCode} = cfg.componentAuctions[0];
          return Promise.resolve(`raa-${adUnitCode}-${auctionId}`);
        });
      });

      function getBids(filters) {
        return getPAAPIBids(filters, raa);
      }

      describe('with one auction config', () => {
        beforeEach(() => {
          addPaapiConfig('au', paapiConfig, 'auct');
          endAuctions();
        });
        it('should resolve to raa result', () => {
          return getBids({adUnitCode: 'au', auctionId}).then(result => {
            sinon.assert.calledWith(raa, sinon.match({
              ...auctionConfig,
              componentAuctions: sinon.match(cmp => cmp.find(cfg => sinon.match(cfg, paapiConfig)))
            }));
            expect(result).to.eql({
              au: 'raa-au-auct'
            });
          });
        });

        it('should resolve to the same result when called again', () => {
          getBids({adUnitCode: 'au', auctionId});
          return getBids({adUnitCode: 'au', auctionId: 'auct'}).then(result => {
            sinon.assert.calledOnce(raa);
            expect(result).to.eql({
              au: 'raa-au-auct'
            });
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
              sinon.assert.calledWith(events.emit, EVENTS.PAAPI_BID, {
                bid: 'raa-au-auct',
                adUnitCode: 'au',
                auctionId: 'auct'
              });
            });
          });
          it('should fire PAAPI_NO_BID', () => {
            raa = sinon.stub().callsFake(() => Promise.resolve(null));
            return getBids({adUnitCode: 'au', auctionId}).then(() => {
              sinon.assert.calledWith(events.emit, EVENTS.PAAPI_NO_BID, {
                adUnitCode: 'au',
                auctionId: 'auct'
              });
            });
          });
        });
      });

      it('should resolve the same result from different filters', () => {
        const targets = {
          auct1: ['au1', 'au2'],
          auct2: ['au1', 'au3']
        };
        Object.entries(targets).forEach(([auctionId, adUnitCodes]) => {
          adUnitCodes.forEach(au => addPaapiConfig(au, paapiConfig, auctionId));
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
            expect(actual).to.eql(expected);
          });
        });
      });
    });
  });

  describe('when not configured', () => {
    it('should not alter configs returned by getPAAPIConfig', () => {
      addPaapiConfig('au', paapiConfig);
      endAuctions();
      expect(getPAAPIConfig().au.seller).to.not.exist;
    });
  });
});
