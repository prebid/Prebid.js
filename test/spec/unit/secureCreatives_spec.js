import {getReplier, receiveMessage, resizeRemoteCreative} from 'src/secureCreatives.js';
import * as utils from 'src/utils.js';
import {getAdUnits, getBidRequests, getBidResponses} from 'test/fixtures/fixtures.js';
import {auctionManager} from 'src/auctionManager.js';
import * as auctionModule from 'src/auction.js';
import * as native from 'src/native.js';
import {fireNativeTrackers, getAllAssetsMessage} from 'src/native.js';
import * as events from 'src/events.js';
import {config as configObj} from 'src/config.js';
import * as creativeRenderers from 'src/creativeRenderers.js';
import 'src/prebid.js';
import 'modules/nativeRendering.js';

import {expect} from 'chai';

import { AD_RENDER_FAILED_REASON, BID_STATUS, EVENTS } from 'src/constants.js';

describe('secureCreatives', () => {
  let sandbox;

  beforeEach(() => {
    sandbox = sinon.sandbox.create();
  });

  afterEach(() => {
    sandbox.restore();
  });

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
      spyAddWinningBid = sandbox.spy(auctionManager, 'addWinningBid');
      spyLogWarn = sandbox.spy(utils, 'logWarn');
      stubFireNativeTrackers = sandbox.stub(native, 'fireNativeTrackers').callsFake(message => { return message.action; });
      stubGetAllAssetsMessage = sandbox.stub(native, 'getAllAssetsMessage');
      stubEmit = sandbox.stub(events, 'emit');
    });

    afterEach(function() {
      sandbox.restore();
      resetAuction();
      adResponse.adId = bidId;
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
        sinon.assert.calledWith(stubEmit, EVENTS.BID_WON, adResponse);
        sinon.assert.neverCalledWith(stubEmit, EVENTS.STALE_RENDER);

        expect(adResponse).to.have.property('status', BID_STATUS.RENDERED);
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
        sinon.assert.calledWith(stubEmit, EVENTS.BID_WON, adResponse);
        sinon.assert.neverCalledWith(stubEmit, EVENTS.STALE_RENDER);

        expect(adResponse).to.have.property('status', BID_STATUS.RENDERED);

        resetHistories(adResponse.renderer.render);

        receiveMessage(ev);

        sinon.assert.calledWith(spyLogWarn, warning);
        sinon.assert.calledOnce(spyAddWinningBid);
        sinon.assert.calledWith(spyAddWinningBid, adResponse);
        sinon.assert.calledOnce(adResponse.renderer.render);
        sinon.assert.calledWith(adResponse.renderer.render, adResponse);
        sinon.assert.calledWith(stubEmit, EVENTS.BID_WON, adResponse);
        sinon.assert.calledWith(stubEmit, EVENTS.STALE_RENDER, adResponse);
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
        sinon.assert.calledWith(stubEmit, EVENTS.BID_WON, adResponse);
        sinon.assert.neverCalledWith(stubEmit, EVENTS.STALE_RENDER);

        expect(adResponse).to.have.property('status', BID_STATUS.RENDERED);

        resetHistories(adResponse.renderer.render);

        receiveMessage(ev);

        sinon.assert.calledWith(spyLogWarn, warning);
        sinon.assert.notCalled(spyAddWinningBid);
        sinon.assert.notCalled(adResponse.renderer.render);
        sinon.assert.neverCalledWith(stubEmit, EVENTS.BID_WON, adResponse);
        sinon.assert.calledWith(stubEmit, EVENTS.STALE_RENDER, adResponse);

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
        sinon.assert.calledWith(stubEmit, EVENTS.AD_RENDER_FAILED, sinon.match({
          reason: AD_RENDER_FAILED_REASON.CANNOT_FIND_AD,
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
        sinon.assert.calledWith(stubEmit, EVENTS.AD_RENDER_FAILED, sinon.match({
          reason: AD_RENDER_FAILED_REASON.EXCEPTION,
          adId: bidId
        }));
      });

      it('should include renderers in responses', () => {
        sandbox.stub(creativeRenderers, 'getCreativeRendererSource').returns('mock-renderer');
        pushBidResponseToAuction({});
        const ev = makeEvent({
          source: {
            postMessage: sinon.stub()
          },
          data: JSON.stringify({adId: bidId, message: 'Prebid Request'})
        });
        receiveMessage(ev);
        sinon.assert.calledWith(ev.source.postMessage, sinon.match(ob => JSON.parse(ob).renderer === 'mock-renderer'));
      });

      if (FEATURES.NATIVE) {
        it('should include native rendering data in responses', () => {
          const bid = {
            native: {
              ortb: {
                assets: [
                  {
                    id: 1,
                    data: {
                      type: 2,
                      value: 'vbody'
                    }
                  }
                ]
              },
              body: 'vbody',
              adTemplate: 'tpl',
              rendererUrl: 'rurl'
            }
          }
          pushBidResponseToAuction(bid);
          const ev = makeEvent({
            source: {
              postMessage: sinon.stub()
            },
            data: JSON.stringify({adId: bidId, message: 'Prebid Request'})
          })
          receiveMessage(ev);
          sinon.assert.calledWith(ev.source.postMessage, sinon.match(ob => {
            const data = JSON.parse(ob);
            ['width', 'height'].forEach(prop => expect(data[prop]).to.not.exist);
            const native = data.native;
            sinon.assert.match(native, {
              ortb: bid.native.ortb,
              adTemplate: bid.native.adTemplate,
              rendererUrl: bid.native.rendererUrl,
            })
            expect(Object.fromEntries(native.assets.map(({key, value}) => [key, value]))).to.eql({
              adTemplate: bid.native.adTemplate,
              rendererUrl: bid.native.rendererUrl,
              body: 'vbody'
            });
            return true;
          }))
        })
      }
    });

    describe('Prebid Native', function() {
      if (!FEATURES.NATIVE) {
        return;
      }

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
        sinon.assert.calledWith(stubEmit, EVENTS.BID_WON, adResponse);
        sinon.assert.calledOnce(spyAddWinningBid);
        sinon.assert.neverCalledWith(stubEmit, EVENTS.STALE_RENDER);
      });

      it('Prebid native should not fire BID_WON when receiveMessage is called more than once', () => {
        let adId = 3;
        pushBidResponseToAuction({ adId });

        const data = {
          adId: adId,
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
        sinon.assert.calledWith(stubEmit, EVENTS.BID_WON, adResponse);

        receiveMessage(ev);
        stubEmit.withArgs(EVENTS.BID_WON, adResponse).calledOnce;
      });
    });

    describe('Prebid Event', () => {
      Object.entries({
        'unrendered': [false, (bid) => { delete bid.status; }],
        'rendered': [true, (bid) => { bid.status = BID_STATUS.RENDERED }]
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
                event: EVENTS.AD_RENDER_FAILED,
                adId: bidId,
                info: {
                  reason: 'Fail reason',
                  message: 'Fail message',
                },
              })
            });
            receiveMessage(event);
            expect(stubEmit.calledWith(EVENTS.AD_RENDER_FAILED, {
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
                event: EVENTS.AD_RENDER_SUCCEEDED,
                adId: bidId,
              })
            });
            receiveMessage(event);
            expect(stubEmit.calledWith(EVENTS.AD_RENDER_SUCCEEDED, {
              adId: bidId,
              bid: adResponse,
              doc: null
            })).to.equal(shouldEmit);
          });
        });
      });
    });
  });

  describe('resizeRemoteCreative', () => {
    let origGpt;
    before(() => {
      origGpt = window.googletag;
    });
    after(() => {
      window.googletag = origGpt;
    });
    function mockSlot(elementId, pathId) {
      let targeting = {};
      return {
        getSlotElementId: sinon.stub().callsFake(() => elementId),
        getAdUnitPath: sinon.stub().callsFake(() => pathId),
        setTargeting: sinon.stub().callsFake((key, value) => {
          value = Array.isArray(value) ? value : [value];
          targeting[key] = value;
        }),
        getTargetingKeys: sinon.stub().callsFake(() => Object.keys(targeting)),
        getTargeting: sinon.stub().callsFake((key) => targeting[key] || [])
      }
    }
    let slots;
    beforeEach(() => {
      slots = [
        mockSlot('div1', 'au1'),
        mockSlot('div2', 'au2'),
        mockSlot('div3', 'au3')
      ]
      window.googletag = {
        pubads: sinon.stub().returns({
          getSlots: sinon.stub().returns(slots)
        })
      };
      sandbox.stub(document, 'getElementById');
    })

    it('should find correct gpt slot based on ad id rather than ad unit code when resizing secure creative', function () {
      slots[1].setTargeting('hb_adid', ['adId']);
      resizeRemoteCreative({
        adId: 'adId',
        width: 300,
        height: 250,
      });
      [0, 2].forEach((i) => sinon.assert.notCalled(slots[i].getSlotElementId))
      sinon.assert.called(slots[1].getSlotElementId);
      sinon.assert.calledWith(document.getElementById, 'div2');
    });
  })
});
