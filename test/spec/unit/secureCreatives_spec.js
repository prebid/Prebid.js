import {
  _sendAdToCreative, receiveMessage
} from 'src/secureCreatives.js';
import * as utils from 'src/utils.js';
import {getAdUnits, getBidRequests, getBidResponses} from 'test/fixtures/fixtures.js';
import {auctionManager} from 'src/auctionManager.js';
import * as auctionModule from 'src/auction.js';
import * as native from 'src/native.js';
import {fireNativeTrackers, getAllAssetsMessage} from 'src/native.js';
import events from 'src/events.js';
import { config as configObj } from 'src/config.js';

import { expect } from 'chai';

var CONSTANTS = require('src/constants.json');

describe('secureCreatives', () => {
  describe('_sendAdToCreative', () => {
    beforeEach(function () {
      sinon.stub(utils, 'logError');
      sinon.stub(utils, 'logWarn');
    });

    afterEach(function () {
      utils.logError.restore();
      utils.logWarn.restore();
    });
    it('should macro replace ${AUCTION_PRICE} with the winning bid for ad and adUrl', () => {
      const oldVal = window.googletag;
      const oldapntag = window.apntag;
      window.apntag = null
      window.googletag = null;
      const mockAdObject = {
        adId: 'someAdId',
        ad: '<script src="http://prebid.org/creative/${AUCTION_PRICE}"></script>',
        adUrl: 'http://creative.prebid.org/${AUCTION_PRICE}',
        width: 300,
        height: 250,
        renderer: null,
        cpm: '1.00',
        adUnitCode: 'some_dom_id'
      };
      const event = {
        source: { postMessage: sinon.stub() },
        origin: 'origin.sf.com'
      };

      _sendAdToCreative(mockAdObject, event);
      expect(JSON.parse(event.source.postMessage.args[0][0]).ad).to.equal('<script src="http://prebid.org/creative/1.00"></script>');
      expect(JSON.parse(event.source.postMessage.args[0][0]).adUrl).to.equal('http://creative.prebid.org/1.00');
      window.googletag = oldVal;
      window.apntag = oldapntag;
    });
  });

  describe('receiveMessage', function() {
    const bidId = 1;
    const warning = `Ad id ${bidId} has been rendered before`;
    let auction;
    let adResponse = {};
    let spyAddWinningBid;
    let spyLogWarn;
    let stubFireNativeTrackers;
    let stubGetAllAssetsMessage;
    let stubEmit;

    function pushBidResponseToAuction(obj) {
      adResponse = Object.assign({
        auctionId: 1,
        adId: bidId,
        width: 300,
        height: 250,
        renderer: null
      }, obj);
      auction.getBidsReceived = function() {
        let bidsReceived = getBidResponses();
        bidsReceived.push(adResponse);
        return bidsReceived;
      }
      auction.getAuctionId = () => 1;
    }

    function resetAuction() {
      $$PREBID_GLOBAL$$.setConfig({ enableSendAllBids: false });
      auction.getBidRequests = getBidRequests;
      auction.getBidsReceived = getBidResponses;
      auction.getAdUnits = getAdUnits;
      auction.getAuctionStatus = function() { return auctionModule.AUCTION_COMPLETED }
    }

    function resetHistories(...others) {
      [
        spyAddWinningBid,
        spyLogWarn,
        stubFireNativeTrackers,
        stubGetAllAssetsMessage,
        stubEmit
      ].forEach(s => s.resetHistory());

      if (others && others.length > 0) { others.forEach(s => s.resetHistory()); }
    }

    before(function() {
      const adUnits = getAdUnits();
      const adUnitCodes = getAdUnits().map(unit => unit.code);
      const bidsBackHandler = function() {};
      const timeout = 2000;
      auction = auctionManager.createAuction({adUnits, adUnitCodes, callback: bidsBackHandler, cbTimeout: timeout});
      resetAuction();
    });

    after(function() {
      auctionManager.clearAllAuctions();
    });

    beforeEach(function() {
      spyAddWinningBid = sinon.spy(auctionManager, 'addWinningBid');
      spyLogWarn = sinon.spy(utils, 'logWarn');
      stubFireNativeTrackers = sinon.stub(native, 'fireNativeTrackers');
      stubGetAllAssetsMessage = sinon.stub(native, 'getAllAssetsMessage');
      stubEmit = sinon.stub(events, 'emit');
    });

    afterEach(function() {
      spyAddWinningBid.restore();
      spyLogWarn.restore();
      stubFireNativeTrackers.restore();
      stubGetAllAssetsMessage.restore();
      stubEmit.restore();
      resetAuction();
    });

    describe('Prebid Request', function() {
      it('should render', function () {
        pushBidResponseToAuction({
          renderer: {render: sinon.stub(), url: 'some url'}
        });

        const data = {
          adId: bidId,
          message: 'Prebid Request'
        };

        const ev = {
          data: JSON.stringify(data)
        };

        receiveMessage(ev);

        sinon.assert.neverCalledWith(spyLogWarn, warning);
        sinon.assert.calledOnce(spyAddWinningBid);
        sinon.assert.calledWith(spyAddWinningBid, adResponse);
        sinon.assert.calledOnce(adResponse.renderer.render);
        sinon.assert.calledWith(adResponse.renderer.render, adResponse);
        sinon.assert.calledWith(stubEmit, CONSTANTS.EVENTS.BID_WON, adResponse);
        sinon.assert.neverCalledWith(stubEmit, CONSTANTS.EVENTS.STALE_RENDER);

        expect(adResponse).to.have.property('status', CONSTANTS.BID_STATUS.RENDERED);
      });

      it('should allow stale rendering without config', function () {
        pushBidResponseToAuction({
          renderer: {render: sinon.stub(), url: 'some url'}
        });

        const data = {
          adId: bidId,
          message: 'Prebid Request'
        };

        const ev = {
          data: JSON.stringify(data)
        };

        receiveMessage(ev);

        sinon.assert.neverCalledWith(spyLogWarn, warning);
        sinon.assert.calledOnce(spyAddWinningBid);
        sinon.assert.calledWith(spyAddWinningBid, adResponse);
        sinon.assert.calledOnce(adResponse.renderer.render);
        sinon.assert.calledWith(adResponse.renderer.render, adResponse);
        sinon.assert.calledWith(stubEmit, CONSTANTS.EVENTS.BID_WON, adResponse);
        sinon.assert.neverCalledWith(stubEmit, CONSTANTS.EVENTS.STALE_RENDER);

        expect(adResponse).to.have.property('status', CONSTANTS.BID_STATUS.RENDERED);

        resetHistories(adResponse.renderer.render);

        receiveMessage(ev);

        sinon.assert.calledWith(spyLogWarn, warning);
        sinon.assert.calledOnce(spyAddWinningBid);
        sinon.assert.calledWith(spyAddWinningBid, adResponse);
        sinon.assert.calledOnce(adResponse.renderer.render);
        sinon.assert.calledWith(adResponse.renderer.render, adResponse);
        sinon.assert.calledWith(stubEmit, CONSTANTS.EVENTS.BID_WON, adResponse);
        sinon.assert.calledWith(stubEmit, CONSTANTS.EVENTS.STALE_RENDER, adResponse);
      });

      it('should stop stale rendering with config', function () {
        configObj.setConfig({'auctionOptions': {'suppressStaleRender': true}});

        pushBidResponseToAuction({
          renderer: {render: sinon.stub(), url: 'some url'}
        });

        const data = {
          adId: bidId,
          message: 'Prebid Request'
        };

        const ev = {
          data: JSON.stringify(data)
        };

        receiveMessage(ev);

        sinon.assert.neverCalledWith(spyLogWarn, warning);
        sinon.assert.calledOnce(spyAddWinningBid);
        sinon.assert.calledWith(spyAddWinningBid, adResponse);
        sinon.assert.calledOnce(adResponse.renderer.render);
        sinon.assert.calledWith(adResponse.renderer.render, adResponse);
        sinon.assert.calledWith(stubEmit, CONSTANTS.EVENTS.BID_WON, adResponse);
        sinon.assert.neverCalledWith(stubEmit, CONSTANTS.EVENTS.STALE_RENDER);

        expect(adResponse).to.have.property('status', CONSTANTS.BID_STATUS.RENDERED);

        resetHistories(adResponse.renderer.render);

        receiveMessage(ev);

        sinon.assert.calledWith(spyLogWarn, warning);
        sinon.assert.notCalled(spyAddWinningBid);
        sinon.assert.notCalled(adResponse.renderer.render);
        sinon.assert.neverCalledWith(stubEmit, CONSTANTS.EVENTS.BID_WON, adResponse);
        sinon.assert.calledWith(stubEmit, CONSTANTS.EVENTS.STALE_RENDER, adResponse);

        configObj.setConfig({'auctionOptions': {}});
      });
    });

    describe('Prebid Native', function() {
      it('Prebid native should render', function () {
        pushBidResponseToAuction({});

        const data = {
          adId: bidId,
          message: 'Prebid Native',
          action: 'allAssetRequest'
        };

        const ev = {
          data: JSON.stringify(data),
          source: {
            postMessage: sinon.stub()
          },
          origin: 'any origin'
        };

        receiveMessage(ev);

        sinon.assert.neverCalledWith(spyLogWarn, warning);
        sinon.assert.calledOnce(stubGetAllAssetsMessage);
        sinon.assert.calledWith(stubGetAllAssetsMessage, data, adResponse);
        sinon.assert.calledOnce(ev.source.postMessage);
        sinon.assert.calledOnce(stubFireNativeTrackers);
        sinon.assert.calledWith(stubFireNativeTrackers, data, adResponse);
        sinon.assert.calledOnce(spyAddWinningBid);
        sinon.assert.calledWith(stubEmit, CONSTANTS.EVENTS.BID_WON, adResponse);
        sinon.assert.neverCalledWith(stubEmit, CONSTANTS.EVENTS.STALE_RENDER);
      });

      it('Prebid native should allow stale rendering without config', function () {
        pushBidResponseToAuction({});

        const data = {
          adId: bidId,
          message: 'Prebid Native',
          action: 'allAssetRequest'
        };

        const ev = {
          data: JSON.stringify(data),
          source: {
            postMessage: sinon.stub()
          },
          origin: 'any origin'
        };

        receiveMessage(ev);

        sinon.assert.neverCalledWith(spyLogWarn, warning);
        sinon.assert.calledOnce(stubGetAllAssetsMessage);
        sinon.assert.calledWith(stubGetAllAssetsMessage, data, adResponse);
        sinon.assert.calledOnce(ev.source.postMessage);
        sinon.assert.calledOnce(stubFireNativeTrackers);
        sinon.assert.calledWith(stubFireNativeTrackers, data, adResponse);
        sinon.assert.calledOnce(spyAddWinningBid);
        sinon.assert.calledWith(stubEmit, CONSTANTS.EVENTS.BID_WON, adResponse);
        sinon.assert.neverCalledWith(stubEmit, CONSTANTS.EVENTS.STALE_RENDER);

        expect(adResponse).to.have.property('status', CONSTANTS.BID_STATUS.RENDERED);

        resetHistories(ev.source.postMessage);

        receiveMessage(ev);

        sinon.assert.neverCalledWith(spyLogWarn, warning);
        sinon.assert.calledOnce(stubGetAllAssetsMessage);
        sinon.assert.calledWith(stubGetAllAssetsMessage, data, adResponse);
        sinon.assert.calledOnce(ev.source.postMessage);
        sinon.assert.calledOnce(stubFireNativeTrackers);
        sinon.assert.calledWith(stubFireNativeTrackers, data, adResponse);
        sinon.assert.calledOnce(spyAddWinningBid);
        sinon.assert.calledWith(stubEmit, CONSTANTS.EVENTS.BID_WON, adResponse);
        sinon.assert.neverCalledWith(stubEmit, CONSTANTS.EVENTS.STALE_RENDER);
      });

      it('Prebid native should allow stale rendering with config', function () {
        configObj.setConfig({'auctionOptions': {'suppressStaleRender': true}});

        pushBidResponseToAuction({});

        const data = {
          adId: bidId,
          message: 'Prebid Native',
          action: 'allAssetRequest'
        };

        const ev = {
          data: JSON.stringify(data),
          source: {
            postMessage: sinon.stub()
          },
          origin: 'any origin'
        };

        receiveMessage(ev);

        sinon.assert.neverCalledWith(spyLogWarn, warning);
        sinon.assert.calledOnce(stubGetAllAssetsMessage);
        sinon.assert.calledWith(stubGetAllAssetsMessage, data, adResponse);
        sinon.assert.calledOnce(ev.source.postMessage);
        sinon.assert.calledOnce(stubFireNativeTrackers);
        sinon.assert.calledWith(stubFireNativeTrackers, data, adResponse);
        sinon.assert.calledOnce(spyAddWinningBid);
        sinon.assert.calledWith(stubEmit, CONSTANTS.EVENTS.BID_WON, adResponse);
        sinon.assert.neverCalledWith(stubEmit, CONSTANTS.EVENTS.STALE_RENDER);

        expect(adResponse).to.have.property('status', CONSTANTS.BID_STATUS.RENDERED);

        resetHistories(ev.source.postMessage);

        receiveMessage(ev);

        sinon.assert.neverCalledWith(spyLogWarn, warning);
        sinon.assert.calledOnce(stubGetAllAssetsMessage);
        sinon.assert.calledWith(stubGetAllAssetsMessage, data, adResponse);
        sinon.assert.calledOnce(ev.source.postMessage);
        sinon.assert.calledOnce(stubFireNativeTrackers);
        sinon.assert.calledWith(stubFireNativeTrackers, data, adResponse);
        sinon.assert.calledOnce(spyAddWinningBid);
        sinon.assert.calledWith(stubEmit, CONSTANTS.EVENTS.BID_WON, adResponse);
        sinon.assert.neverCalledWith(stubEmit, CONSTANTS.EVENTS.STALE_RENDER);

        configObj.setConfig({'auctionOptions': {}});
      });
    });
  });
});
