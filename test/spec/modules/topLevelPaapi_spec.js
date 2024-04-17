import {
  addComponentAuctionHook,
  getPAAPIConfig,
  registerSubmodule,
  reset as resetPaapi
} from '../../../modules/paapi.js';
import {config} from 'src/config.js';
import {EVENTS} from 'src/constants.js';
import * as events from 'src/events.js';
import {topLevelPAAPI} from '/modules/topLevelPaapi.js';
import {auctionManager} from '../../../src/auctionManager.js';

describe('topLevelPaapi', () => {
  let sandbox, auction, paapiConfig, next, adUnit, auctionId;
  before(() => {
    resetPaapi();
    registerSubmodule(topLevelPAAPI);
  });
  after(() => {
    resetPaapi();
  });
  beforeEach(() => {
    sandbox = sinon.createSandbox();
    auction = {};
    sandbox.stub(auctionManager.index, 'getAuction').callsFake(() => auction);
    next = sinon.stub();
    auctionId = 'auct';
    adUnit = {
      code: 'au'
    };
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

  function addPaapiContext() {
    addComponentAuctionHook(next, {adUnitCode: adUnit.code, auctionId}, paapiConfig);
    events.emit(EVENTS.AUCTION_END, {auctionId, adUnitCodes: [adUnit.code], adUnits: [adUnit]});
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
      addPaapiContext();
      sinon.assert.match(getPAAPIConfig()[adUnit.code], auctionConfig);
    });
  });

  describe('when not configured', () => {
    it('should not alter configs returned by getPAAPIConfig', () => {
      addPaapiContext();
      expect(getPAAPIConfig()[adUnit.code].seller).to.not.exist;
    });
  });
});
