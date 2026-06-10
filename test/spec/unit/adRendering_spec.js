import * as events from 'src/events.js';
import * as utils from 'src/utils.js';
import {
  deferRendering,
  doRender,
  emitAdRenderSucceeded,
  getRenderingData,
  handleCreativeEvent,
  handleNativeMessage,
  handleRender, markWinningBid, renderIfDeferred,
} from '../../../src/adRendering.js';
import { getPreparedBidForAuction } from '../../../src/auction.js';
import { AD_RENDER_FAILED_REASON, BID_STATUS, EVENTS } from 'src/constants.js';
import { expect } from 'chai/index.mjs';
import { config } from 'src/config.js';
import { VIDEO } from '../../../src/mediaTypes.js';
import { auctionManager } from '../../../src/auctionManager.js';
import adapterManager from '../../../src/adapterManager.js';
import { bidFilters } from 'src/targeting/filters.js';
import {
  EVENT_TYPE_IMPRESSION,
  EVENT_TYPE_WIN,
  TRACKER_METHOD_IMG,
  TRACKER_METHOD_JS
} from '../../../src/eventTrackers.js';

describe('adRendering', () => {
  let sandbox;
  beforeEach(() => {
    sandbox = sinon.createSandbox();
    sandbox.stub(utils, 'logWarn');
    sandbox.stub(utils, 'logError');
  });
  afterEach(() => {
    sandbox.restore();
  });

  describe('getRenderingData', () => {
    let bidResponse;
    beforeEach(() => {
      bidResponse = {};
    });

    it('should carry over instl', () => {
      bidResponse.instl = true;
      const result = getRenderingData(bidResponse);
      expect(result.instl).to.be.true;
    });

    ['ad', 'adUrl'].forEach((prop) => {
      describe(`on ${prop}`, () => {
        it('replaces AUCTION_PRICE macro', () => {
          bidResponse[prop] = 'pre${AUCTION_PRICE}post';
          bidResponse.cpm = 123;
          const result = getRenderingData(bidResponse);
          expect(result[prop]).to.eql('pre123post');
        });
        it('replaces CLICKTHROUGH macro', () => {
          bidResponse[prop] = 'pre${CLICKTHROUGH}post';
          const result = getRenderingData(bidResponse, { clickUrl: 'clk' });
          expect(result[prop]).to.eql('preclkpost');
        });
        it('defaults CLICKTHROUGH to empty string', () => {
          bidResponse[prop] = 'pre${CLICKTHROUGH}post';
          const result = getRenderingData(bidResponse);
          expect(result[prop]).to.eql('prepost');
        });
      });
    });
  });

  describe('rendering logic', () => {
    let bidResponse, renderFn, resizeFn, adId;
    beforeEach(() => {
      sandbox.stub(events, 'emit');
      renderFn = sinon.stub();
      resizeFn = sinon.stub();
      adId = 123;
      bidResponse = {
        adId
      };
    });

    function expectAdRenderFailedEvent(reason) {
      sinon.assert.calledWith(events.emit, EVENTS.AD_RENDER_FAILED, sinon.match({ adId, reason }));
    }

    describe('doRender', () => {
      let getRenderingDataStub;
      function getRenderingDataHook(next, ...args) {
        next.bail(getRenderingDataStub(...args));
      }
      before(() => {
        getRenderingData.before(getRenderingDataHook, 999);
      });
      after(() => {
        getRenderingData.getHooks({ hook: getRenderingDataHook }).remove();
      });
      beforeEach(() => {
        getRenderingDataStub = sinon.stub();
      });

      describe('when the ad has a renderer', () => {
        let bidResponse;
        beforeEach(() => {
          bidResponse = {
            adId: 'mock-ad-id',
            renderer: {
              url: 'some-custom-renderer',
              render: sinon.stub()
            }
          };
        });

        it('does not invoke renderFn, but the renderer instead', () => {
          doRender({ renderFn, bidResponse });
          sinon.assert.notCalled(renderFn);
          sinon.assert.called(bidResponse.renderer.render);
        });

        it('allows rendering on the main document', () => {
          doRender({ renderFn, bidResponse, isMainDocument: true });
          sinon.assert.notCalled(renderFn);
          sinon.assert.called(bidResponse.renderer.render);
        });

        it('emits AD_RENDER_SUCCEDED', () => {
          doRender({ renderFn, bidResponse });
          sinon.assert.calledWith(events.emit, EVENTS.AD_RENDER_SUCCEEDED, sinon.match({
            bid: bidResponse,
            adId: bidResponse.adId
          }));
        });
      });

      describe('when the ad has a safe renderer URL', () => {
        it('does not emit AD_RENDER_SUCCEDED immediately', () => {
          getRenderingDataStub.returns({ safeRenderer: { url: 'mock-url-safe-renderer' } });
          let bidWithSafeRenderer = {
            adId: 'mock-ad-id',
            safeRenderer: { url: 'mock-url-safe-renderer' }
          };
          doRender({ renderFn, bidResponse: bidWithSafeRenderer });
          sinon.assert.neverCalledWith(events.emit, EVENTS.AD_RENDER_SUCCEEDED);
        });

        it('prepareBidForRendering: safeRenderer.getConfig(bid) overrides static safeRenderer.config', () => {
          const publisherConfig = { player: 'pub', theme: 'dark' };
          const getConfig = sinon.stub().returns(publisherConfig);
          const bidWithSafeRenderer = {
            adId: 'safe-config-priority',
            cpm: 2.5,
            safeRenderer: {
              url: 'https://cdn.example/safe.js',
              config: { player: 'bidder', theme: 'light', onlyOnBid: true },
              getConfig,
            },
          };

          doRender({ renderFn, resizeFn, bidResponse: bidWithSafeRenderer });

          sinon.assert.calledOnce(getConfig);
          sinon.assert.calledWithExactly(getConfig, bidWithSafeRenderer);
          sinon.assert.calledOnce(renderFn);
          const payload = renderFn.firstCall.args[0];
          expect(payload.safeRenderer.config).to.eql(publisherConfig);
          expect(payload.safeRenderer.url).to.equal('https://cdn.example/safe.js');
        });
      });

      if (FEATURES.VIDEO) {
        it('should emit AD_RENDER_FAILED on video bids', () => {
          bidResponse.mediaType = VIDEO;
          doRender({ renderFn, bidResponse });
          expectAdRenderFailedEvent(AD_RENDER_FAILED_REASON.PREVENT_WRITING_ON_MAIN_DOCUMENT);
        });
      }

      it('should emit AD_RENDER_FAILED when renderer-less bid is being rendered on the main document', () => {
        doRender({ renderFn, bidResponse, isMainDocument: true });
        expectAdRenderFailedEvent(AD_RENDER_FAILED_REASON.PREVENT_WRITING_ON_MAIN_DOCUMENT);
      });

      it('invokes renderFn with rendering data', () => {
        const data = { ad: 'creative' };
        getRenderingDataStub.returns(data);
        doRender({ renderFn, resizeFn, bidResponse });
        sinon.assert.calledWith(renderFn, sinon.match({
          adId: bidResponse.adId,
          ...data
        }));
      });

      it('invokes resizeFn with w/h from rendering data', () => {
        getRenderingDataStub.returns({ width: 123, height: 321 });
        doRender({ renderFn, resizeFn, bidResponse });
        sinon.assert.calledWith(resizeFn, 123, 321);
      });

      it('does not invoke resizeFn if rendering data has no w/h', () => {
        getRenderingDataStub.returns({});
        doRender({ renderFn, resizeFn, bidResponse });
        sinon.assert.notCalled(resizeFn);
      });
    });

    describe('markWinningBid', () => {
      let bid;
      beforeEach(() => {
        bid = { adId: '123' };
        sandbox.stub(utils, 'triggerPixel');
      });
      it('should fire BID_WON', () => {
        markWinningBid(bid);
        sinon.assert.calledWith(events.emit, EVENTS.BID_WON, bid);
      });
      it('should fire win tracking pixels', () => {
        bid.eventtrackers = [{ event: EVENT_TYPE_WIN, method: TRACKER_METHOD_IMG, url: 'tracker' }];
        markWinningBid(bid);
        sinon.assert.calledWith(utils.triggerPixel, 'tracker');
      });
      it('should NOT fire non-win or non-pixel trackers', () => {
        bid.eventtrackers = [
          { event: EVENT_TYPE_WIN, method: TRACKER_METHOD_JS, url: 'ignored' },
          { event: EVENT_TYPE_IMPRESSION, method: TRACKER_METHOD_IMG, url: 'ignored' }
        ];
        markWinningBid(bid);
        sinon.assert.notCalled(utils.triggerPixel);
      });
    });

    describe('deferRendering', () => {
      let fn, markWin;
      function markWinHook(next, bidResponse) {
        markWin(bidResponse);
      }
      before(() => {
        markWinningBid.before(markWinHook);
      });
      after(() => {
        markWinningBid.getHooks({ hook: markWinHook }).remove();
      });
      beforeEach(() => {
        fn = sinon.stub();
        markWin = sinon.stub();
      });

      [null, undefined].forEach((bidResponse) => {
        it(`should run fn immediately if bidResponse is ${bidResponse}`, () => {
          deferRendering(bidResponse, fn);
          sinon.assert.called(fn);
        });
      });

      [undefined, false].forEach(defer => {
        describe(`when bid has deferRendering = ${defer}`, () => {
          if (defer != null) {
            beforeEach(() => { bidResponse.deferRendering = defer; });
          }
          it('should run fn and mark bid as rendered', () => {
            deferRendering(bidResponse, fn);
            sinon.assert.called(fn);
            expect(bidResponse.status).to.equal(BID_STATUS.RENDERED);
          });
        });
      });

      describe('when bid is marked for deferred rendering', () => {
        beforeEach(() => {
          bidResponse.deferRendering = true;
        });
        it('should not run fn and not mark bid as rendered', () => {
          deferRendering(bidResponse, fn);
          sinon.assert.notCalled(fn);
          expect(bidResponse.status).to.not.equal(BID_STATUS.RENDERED);
        });

        it('should render on subsequent call to renderIfDeferred', () => {
          deferRendering(bidResponse, fn);
          renderIfDeferred(bidResponse);
          sinon.assert.called(fn);
          expect(bidResponse.status).to.eql(BID_STATUS.RENDERED);
        });

        it('should not render again if renderIfDeferred is called multiple times', () => {
          deferRendering(bidResponse, fn);
          renderIfDeferred(bidResponse);
          renderIfDeferred(bidResponse);
          sinon.assert.calledOnce(fn);
        });
      });

      it('should run fn if bid is not marked for deferral', () => {
        deferRendering(bidResponse, fn);
      });
      [true, false].forEach(defer => {
        it(`should mark bid as winning (deferRendering = ${defer})`, () => {
          bidResponse.deferRendering = defer;
          deferRendering(bidResponse, fn);
          sinon.assert.calledWith(markWin, bidResponse);
        });

        it('should not mark a winner twice', () => {
          bidResponse.deferRendering = defer;
          deferRendering(bidResponse, fn);
          deferRendering(bidResponse, fn);
          sinon.assert.calledOnce(markWin);
        });
      });
    });
    describe('renderIfDeferred', () => {
      it('should not choke on unmarked bids', () => {
        renderIfDeferred(bidResponse);
        expect(bidResponse.status).to.not.equal(BID_STATUS.RENDERED);
      });
    });
    describe('handleRender', () => {
      let doRenderStub;
      function doRenderHook(next, ...args) {
        next.bail(doRenderStub(...args));
      }
      before(() => {
        doRender.before(doRenderHook, 999);
      });
      after(() => {
        doRender.getHooks({ hook: doRenderHook }).remove();
      });
      beforeEach(() => {
        sandbox.stub(auctionManager, 'addWinningBid');
        doRenderStub = sinon.stub();
      });
      describe('should emit AD_RENDER_FAILED', () => {
        it('when bidResponse is missing', () => {
          handleRender({ adId });
          expectAdRenderFailedEvent(AD_RENDER_FAILED_REASON.CANNOT_FIND_AD);
          sinon.assert.notCalled(doRenderStub);
        });
        it('on exceptions', () => {
          doRenderStub.throws(new Error());
          handleRender({ adId, bidResponse });
          expectAdRenderFailedEvent(AD_RENDER_FAILED_REASON.EXCEPTION);
        });
      });

      describe('when bid was already rendered', () => {
        beforeEach(() => {
          bidResponse.status = BID_STATUS.RENDERED;
        });
        afterEach(() => {
          config.resetConfig();
        });
        it('should emit STALE_RENDER', () => {
          handleRender({ adId, bidResponse });
          sinon.assert.calledWith(events.emit, EVENTS.STALE_RENDER, bidResponse);
          sinon.assert.called(doRenderStub);
        });
        it('should skip rendering if suppressStaleRender', () => {
          config.setConfig({ auctionOptions: { suppressStaleRender: true } });
          handleRender({ adId, bidResponse });
          sinon.assert.notCalled(doRenderStub);
        });
      });

      describe('when bid has already expired', () => {
        const isBidNotExpiredStub = sinon.stub(bidFilters, 'isBidNotExpired');
        beforeEach(() => {
          isBidNotExpiredStub.returns(false);
        });
        afterEach(() => {
          isBidNotExpiredStub.restore();
        });
        it('should emit EXPIRED_RENDER', () => {
          handleRender({ adId, bidResponse });
          sinon.assert.calledWith(events.emit, EVENTS.EXPIRED_RENDER, bidResponse);
          sinon.assert.called(doRenderStub);
        });
        it('should skip rendering if suppressExpiredRender', () => {
          config.setConfig({ auctionOptions: { suppressExpiredRender: true } });
          handleRender({ adId, bidResponse });
          sinon.assert.notCalled(doRenderStub);
        });
      });
    });
  });

  describe('allowTopWindowRenderers', () => {
    /** Minimal index stub so `getPreparedBidForAuction` can resolve publisher renderers from the bid request. */
    function makeIndexStub({ requestRenderer, requestSafeRenderer }) {
      return {
        getAdUnit: sinon.stub().returns({}),
        getBidRequest: sinon.stub().returns({
          ...(requestRenderer && { renderer: requestRenderer }),
          ...(requestSafeRenderer && { safeRenderer: requestSafeRenderer }),
        }),
        getMediaTypes: sinon.stub().returns({}),
      };
    }

    beforeEach(() => {
      sandbox.stub(events, 'emit');
    });

    afterEach(() => {
      config.resetConfig();
    });

    it('when false, strips bid.renderer so top-window publisher renderers are not installed', () => {
      config.setConfig({ allowTopWindowRenderers: false });
      const renderStub = sinon.stub();
      const idx = makeIndexStub({
        requestRenderer: {
          url: 'https://publisher/renderer.js',
          render: renderStub,
          options: {},
        },
        requestSafeRenderer: { url: 'https://publisher/safe.js' },
      });
      const bid = {
        bidderCode: 'appnexus',
        adUnitCode: 'div-1',
        mediaType: 'banner',
        requestId: 'req-1',
        cpm: 1.5,
      };
      const prepared = getPreparedBidForAuction(bid, { index: idx });

      expect(prepared.renderer).to.equal(null);
      expect(prepared.safeRenderer).to.deep.include({ url: 'https://publisher/safe.js' });
    });

    it('when false, clears an adapter-preinstalled renderer on the bid', () => {
      config.setConfig({ allowTopWindowRenderers: false });
      const adapterRender = sinon.stub();
      const idx = makeIndexStub({});
      const bid = {
        bidderCode: 'demo',
        adUnitCode: 'div-1',
        mediaType: 'banner',
        requestId: 'req-2',
        cpm: 1,
        renderer: { url: 'https://bidder/outstream.js', render: adapterRender },
      };
      const prepared = getPreparedBidForAuction(bid, { index: idx });
      expect(prepared.renderer).to.equal(null);
    });

    it('when true, installs publisher renderer from the bid request onto the bid', () => {
      config.setConfig({ allowTopWindowRenderers: true });
      const renderStub = sinon.stub();
      const idx = makeIndexStub({
        requestRenderer: {
          url: 'https://publisher/renderer.js',
          render: renderStub,
          options: {},
        },
      });
      const bid = {
        bidderCode: 'appnexus',
        adUnitCode: 'div-1',
        mediaType: 'banner',
        requestId: 'req-3',
        cpm: 2,
      };
      const prepared = getPreparedBidForAuction(bid, { index: idx });

      expect(prepared.renderer).to.be.an('object');
      expect(prepared.renderer.url).to.equal('https://publisher/renderer.js');
    });
  });

  describe('handleCreativeEvent', () => {
    let bid;
    beforeEach(() => {
      sandbox.stub(events, 'emit');
      bid = {
        status: BID_STATUS.RENDERED
      };
    });
    it('emits AD_RENDER_FAILED with given reason', () => {
      handleCreativeEvent({ event: EVENTS.AD_RENDER_FAILED, info: { reason: 'reason', message: 'message' } }, bid);
      sinon.assert.calledWith(events.emit, EVENTS.AD_RENDER_FAILED, sinon.match({ bid, reason: 'reason', message: 'message' }));
    });

    it('emits AD_RENDER_SUCCEEDED', () => {
      handleCreativeEvent({ event: EVENTS.AD_RENDER_SUCCEEDED }, bid);
      sinon.assert.calledWith(events.emit, EVENTS.AD_RENDER_SUCCEEDED, sinon.match({ bid }));
    });

    it('logs an error on other events', () => {
      handleCreativeEvent({ event: 'unsupported' }, bid);
      sinon.assert.called(utils.logError);
      sinon.assert.notCalled(events.emit);
    });
  });

  describe('handleNativeMessage', () => {
    if (!FEATURES.NATIVE) return;
    let bid;
    beforeEach(() => {
      bid = {
        adId: '123'
      };
    });

    it('should resize', () => {
      const resizeFn = sinon.stub();
      handleNativeMessage({ action: 'resizeNativeHeight', height: 100 }, bid, { resizeFn });
      sinon.assert.calledWith(resizeFn, undefined, 100);
    });

    it('should fire trackers', () => {
      const data = {
        action: 'click'
      };
      const fireTrackers = sinon.stub();
      handleNativeMessage(data, bid, { fireTrackers });
      sinon.assert.calledWith(fireTrackers, data, bid);
    });
  });

  describe('onAdRenderSucceeded', () => {
    let mockAdapterSpec, bids;
    beforeEach(() => {
      mockAdapterSpec = {
        onAdRenderSucceeded: sinon.stub()
      };
      adapterManager.bidderRegistry['mockBidder'] = {
        bidder: 'mockBidder',
        getSpec: function () { return mockAdapterSpec; },
      };
      bids = [
        { bidder: 'mockBidder', params: { placementId: 'id' } },
      ];
    });

    afterEach(function () {
      delete adapterManager.bidderRegistry['mockBidder'];
    });

    it('should invoke onAddRenderSucceeded on emitAdRenderSucceeded', () => {
      emitAdRenderSucceeded({ bid: bids[0] });
      sinon.assert.called(mockAdapterSpec.onAdRenderSucceeded);
    });
  });
});
