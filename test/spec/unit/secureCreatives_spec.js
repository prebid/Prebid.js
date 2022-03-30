import {
  _sendAdToCreative, getReplier, receiveMessage
} from 'src/secureCreatives.js';
import * as secureCreatives from 'src/secureCreatives.js';
import * as utils from 'src/utils.js';
import {getAdUnits, getBidRequests, getBidResponses} from 'test/fixtures/fixtures.js';
import {auctionManager} from 'src/auctionManager.js';
import * as auctionModule from 'src/auction.js';
import * as native from 'src/native.js';
import {fireNativeTrackers, getAllAssetsMessage} from 'src/native.js';
import * as events from 'src/events.js';
import { config as configObj } from 'src/config.js';
import 'src/prebid.js';

import { expect } from 'chai';

var CONSTANTS = require('src/constants.json');

describe('secureCreatives', () => {
  function makeEvent(ev) {
    return Object.assign({origin: 'mock-origin', ports: []}, ev)
  }

  describe('getReplier', () => {
    it('should use source.postMessage if no MessagePort is available', () => {
      const ev = {
        ports: [],
        source: {
          postMessage: sinon.spy()
        },
        origin: 'mock-origin'
      };
      getReplier(ev)('test');
      sinon.assert.calledWith(ev.source.postMessage, JSON.stringify('test'));
    });

    it('should use MesagePort.postMessage if available', () => {
      const ev = {
        ports: [{
          postMessage: sinon.spy()
        }]
      }
      getReplier(ev)('test');
      sinon.assert.calledWith(ev.ports[0].postMessage, JSON.stringify('test'));
    });

    it('should throw if origin is null and no MessagePort is available', () => {
      const ev = {
        origin: null,
        ports: [],
        postMessage: sinon.spy()
      }
      const reply = getReplier(ev);
      expect(() => reply('test')).to.throw();
    });
  });

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
      const reply = sinon.spy();
      _sendAdToCreative(mockAdObject, reply);
      expect(reply.args[0][0].ad).to.equal('<script src="http://prebid.org/creative/1.00"></script>');
      expect(reply.args[0][0].adUrl).to.equal('http://creative.prebid.org/1.00');
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
      stubFireNativeTrackers = sinon.stub(native, 'fireNativeTrackers').callsFake(message => { return message.action; });
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

        const ev = makeEvent({
          data: JSON.stringify(data),
        });

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

        const ev = makeEvent({
          data: JSON.stringify(data)
        });

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

        const ev = makeEvent({
          data: JSON.stringify(data)
        });

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

      it('should emit AD_RENDER_FAILED if requested missing adId', () => {
        const ev = makeEvent({
          data: JSON.stringify({
            message: 'Prebid Request',
            adId: 'missing'
          })
        });
        receiveMessage(ev);
        sinon.assert.calledWith(stubEmit, CONSTANTS.EVENTS.AD_RENDER_FAILED, sinon.match({
          reason: CONSTANTS.AD_RENDER_FAILED_REASON.CANNOT_FIND_AD,
          adId: 'missing'
        }));
      });

      it('should emit AD_RENDER_FAILED if creative can\'t be sent to rendering frame', () => {
        pushBidResponseToAuction({});
        const ev = makeEvent({
          source: {
            postMessage: sinon.stub().callsFake(() => { throw new Error(); })
          },
          data: JSON.stringify({
            message: 'Prebid Request',
            adId: bidId
          })
        });
        receiveMessage(ev)
        sinon.assert.calledWith(stubEmit, CONSTANTS.EVENTS.AD_RENDER_FAILED, sinon.match({
          reason: CONSTANTS.AD_RENDER_FAILED_REASON.EXCEPTION,
          adId: bidId
        }));
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

        const ev = makeEvent({
          data: JSON.stringify(data),
          source: {
            postMessage: sinon.stub()
          },
          origin: 'any origin'
        });

        receiveMessage(ev);

        sinon.assert.neverCalledWith(spyLogWarn, warning);
        sinon.assert.calledOnce(stubGetAllAssetsMessage);
        sinon.assert.calledWith(stubGetAllAssetsMessage, data, adResponse);
        sinon.assert.calledOnce(ev.source.postMessage);
        sinon.assert.notCalled(stubFireNativeTrackers);
        sinon.assert.neverCalledWith(stubEmit, CONSTANTS.EVENTS.BID_WON);
        sinon.assert.notCalled(spyAddWinningBid);
        sinon.assert.neverCalledWith(stubEmit, CONSTANTS.EVENTS.STALE_RENDER);
      });

      it('Prebid native should allow stale rendering without config', function () {
        pushBidResponseToAuction({});

        const data = {
          adId: bidId,
          message: 'Prebid Native',
          action: 'allAssetRequest'
        };

        const ev = makeEvent({
          data: JSON.stringify(data),
          source: {
            postMessage: sinon.stub()
          },
          origin: 'any origin'
        });

        receiveMessage(ev);

        sinon.assert.neverCalledWith(spyLogWarn, warning);
        sinon.assert.calledOnce(stubGetAllAssetsMessage);
        sinon.assert.calledWith(stubGetAllAssetsMessage, data, adResponse);
        sinon.assert.calledOnce(ev.source.postMessage);
        sinon.assert.notCalled(stubFireNativeTrackers);
        sinon.assert.neverCalledWith(stubEmit, CONSTANTS.EVENTS.BID_WON);
        sinon.assert.notCalled(spyAddWinningBid);
        sinon.assert.neverCalledWith(stubEmit, CONSTANTS.EVENTS.STALE_RENDER);

        resetHistories(ev.source.postMessage);

        receiveMessage(ev);

        sinon.assert.neverCalledWith(spyLogWarn, warning);
        sinon.assert.calledOnce(stubGetAllAssetsMessage);
        sinon.assert.calledWith(stubGetAllAssetsMessage, data, adResponse);
        sinon.assert.calledOnce(ev.source.postMessage);
        sinon.assert.notCalled(stubFireNativeTrackers);
        sinon.assert.neverCalledWith(stubEmit, CONSTANTS.EVENTS.BID_WON);
        sinon.assert.notCalled(spyAddWinningBid);
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

        const ev = makeEvent({
          data: JSON.stringify(data),
          source: {
            postMessage: sinon.stub()
          },
          origin: 'any origin'
        });

        receiveMessage(ev);

        sinon.assert.neverCalledWith(spyLogWarn, warning);
        sinon.assert.calledOnce(stubGetAllAssetsMessage);
        sinon.assert.calledWith(stubGetAllAssetsMessage, data, adResponse);
        sinon.assert.calledOnce(ev.source.postMessage);
        sinon.assert.notCalled(stubFireNativeTrackers);
        sinon.assert.neverCalledWith(stubEmit, CONSTANTS.EVENTS.BID_WON);
        sinon.assert.notCalled(spyAddWinningBid);
        sinon.assert.neverCalledWith(stubEmit, CONSTANTS.EVENTS.STALE_RENDER);

        resetHistories(ev.source.postMessage);

        receiveMessage(ev);

        sinon.assert.neverCalledWith(spyLogWarn, warning);
        sinon.assert.calledOnce(stubGetAllAssetsMessage);
        sinon.assert.calledWith(stubGetAllAssetsMessage, data, adResponse);
        sinon.assert.calledOnce(ev.source.postMessage);
        sinon.assert.notCalled(stubFireNativeTrackers);
        sinon.assert.neverCalledWith(stubEmit, CONSTANTS.EVENTS.BID_WON);
        sinon.assert.notCalled(spyAddWinningBid);
        sinon.assert.neverCalledWith(stubEmit, CONSTANTS.EVENTS.STALE_RENDER);

        configObj.setConfig({'auctionOptions': {}});
      });

      it('Prebid native should fire trackers', function () {
        pushBidResponseToAuction({});

        const data = {
          adId: bidId,
          message: 'Prebid Native',
          action: 'click',
        };

        const ev = makeEvent({
          data: JSON.stringify(data),
          source: {
            postMessage: sinon.stub()
          },
          origin: 'any origin'
        });

        receiveMessage(ev);

        sinon.assert.neverCalledWith(spyLogWarn, warning);
        sinon.assert.calledOnce(stubFireNativeTrackers);
        sinon.assert.neverCalledWith(stubEmit, CONSTANTS.EVENTS.BID_WON);
        sinon.assert.notCalled(spyAddWinningBid);

        resetHistories(ev.source.postMessage);

        delete data.action;
        ev.data = JSON.stringify(data);
        receiveMessage(ev);

        sinon.assert.neverCalledWith(spyLogWarn, warning);
        sinon.assert.calledOnce(stubFireNativeTrackers);
        sinon.assert.calledWith(stubEmit, CONSTANTS.EVENTS.BID_WON, adResponse);
        sinon.assert.calledOnce(spyAddWinningBid);

        expect(adResponse).to.have.property('status', CONSTANTS.BID_STATUS.RENDERED);
      });
    });

    describe('Prebid Event', () => {
      Object.entries({
        'unrendered': [false, (bid) => { delete bid.status; }],
        'rendered': [true, (bid) => { bid.status = CONSTANTS.BID_STATUS.RENDERED }]
      }).forEach(([test, [shouldEmit, prepBid]]) => {
        describe(`for ${test} bids`, () => {
          beforeEach(() => {
            prepBid(adResponse);
            pushBidResponseToAuction(adResponse);
          });

          it(`should${shouldEmit ? ' ' : ' not '}emit AD_RENDER_FAILED`, () => {
            const event = makeEvent({
              data: JSON.stringify({
                message: 'Prebid Event',
                event: CONSTANTS.EVENTS.AD_RENDER_FAILED,
                adId: bidId,
                info: {
                  reason: 'Fail reason',
                  message: 'Fail message',
                },
              })
            });
            receiveMessage(event);
            expect(stubEmit.calledWith(CONSTANTS.EVENTS.AD_RENDER_FAILED, {
              adId: bidId,
              bid: adResponse,
              reason: 'Fail reason',
              message: 'Fail message'
            })).to.equal(shouldEmit);
          });

          it(`should${shouldEmit ? ' ' : ' not '}emit AD_RENDER_SUCCEEDED`, () => {
            const event = makeEvent({
              data: JSON.stringify({
                message: 'Prebid Event',
                event: CONSTANTS.EVENTS.AD_RENDER_SUCCEEDED,
                adId: bidId,
              })
            });
            receiveMessage(event);
            expect(stubEmit.calledWith(CONSTANTS.EVENTS.AD_RENDER_SUCCEEDED, {
              adId: bidId,
              bid: adResponse,
              doc: null
            })).to.equal(shouldEmit);
          });
        });
      });
    });
  });
});
