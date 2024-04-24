import * as events from 'src/events.js';
import * as utils from 'src/utils.js';
import {
  doRender, getBidToRender,
  getRenderingData,
  handleCreativeEvent,
  handleNativeMessage,
  handleRender
} from '../../../src/adRendering.js';
import { AD_RENDER_FAILED_REASON, BID_STATUS, EVENTS } from 'src/constants.js';
import {expect} from 'chai/index.mjs';
import {config} from 'src/config.js';
import {VIDEO} from '../../../src/mediaTypes.js';
import {auctionManager} from '../../../src/auctionManager.js';

describe('adRendering', () => {
  let sandbox;
  beforeEach(() => {
    sandbox = sinon.sandbox.create();
    sandbox.stub(utils, 'logWarn');
    sandbox.stub(utils, 'logError');
  })
  afterEach(() => {
    sandbox.restore();
  })

  describe('getBidToRender', () => {
    beforeEach(() => {
      sandbox.stub(auctionManager, 'findBidByAdId').callsFake(() => 'auction-bid')
    });
    it('should default to bid from auctionManager', () => {
      return getBidToRender('adId', true, Promise.resolve(null)).then((res) => {
        expect(res).to.eql('auction-bid');
        sinon.assert.calledWith(auctionManager.findBidByAdId, 'adId');
      });
    });
    it('should give precedence to override promise', () => {
      return getBidToRender('adId', true, Promise.resolve('override')).then((res) => {
        expect(res).to.eql('override');
        sinon.assert.notCalled(auctionManager.findBidByAdId);
      })
    });
    it('should return undef when override rejects', () => {
      return getBidToRender('adId', true, Promise.reject(new Error('any reason'))).then(res => {
        expect(res).to.not.exist;
      })
    })
  })
  describe('getRenderingData', () => {
    let bidResponse;
    beforeEach(() => {
      bidResponse = {};
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
          const result = getRenderingData(bidResponse, {clickUrl: 'clk'});
          expect(result[prop]).to.eql('preclkpost');
        });
        it('defaults CLICKTHROUGH to empty string', () => {
          bidResponse[prop] = 'pre${CLICKTHROUGH}post';
          const result = getRenderingData(bidResponse);
          expect(result[prop]).to.eql('prepost');
        });
      });
    });
  })

  describe('rendering logic', () => {
    let bidResponse, renderFn, resizeFn, adId;
    beforeEach(() => {
      sandbox.stub(events, 'emit');
      renderFn = sinon.stub();
      resizeFn = sinon.stub();
      adId = 123;
      bidResponse = {
        adId
      }
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
      })
      after(() => {
        getRenderingData.getHooks({hook: getRenderingDataHook}).remove();
      });
      beforeEach(() => {
        getRenderingDataStub = sinon.stub();
      })

      describe('when the ad has a renderer', () => {
        let bidResponse;
        beforeEach(() => {
          bidResponse = {
            adId: 'mock-ad-id',
            renderer: {
              url: 'some-custom-renderer',
              render: sinon.stub()
            }
          }
        });

        it('does not invoke renderFn, but the renderer instead', () => {
          doRender({renderFn, bidResponse});
          sinon.assert.notCalled(renderFn);
          sinon.assert.called(bidResponse.renderer.render);
        });

        it('emits AD_RENDER_SUCCEDED', () => {
          doRender({renderFn, bidResponse});
          sinon.assert.calledWith(events.emit, EVENTS.AD_RENDER_SUCCEEDED, sinon.match({
            bid: bidResponse,
            adId: bidResponse.adId
          }));
        });
      });

      if (FEATURES.VIDEO) {
        it('should emit AD_RENDER_FAILED on video bids', () => {
          bidResponse.mediaType = VIDEO;
          doRender({renderFn, bidResponse});
          expectAdRenderFailedEvent(AD_RENDER_FAILED_REASON.PREVENT_WRITING_ON_MAIN_DOCUMENT)
        });
      }

      it('invokes renderFn with rendering data', () => {
        const data = {ad: 'creative'};
        getRenderingDataStub.returns(data);
        doRender({renderFn, resizeFn, bidResponse});
        sinon.assert.calledWith(renderFn, sinon.match({
          adId: bidResponse.adId,
          ...data
        }))
      });

      it('invokes resizeFn with w/h from rendering data', () => {
        getRenderingDataStub.returns({width: 123, height: 321});
        doRender({renderFn, resizeFn, bidResponse});
        sinon.assert.calledWith(resizeFn, 123, 321);
      });

      it('does not invoke resizeFn if rendering data has no w/h', () => {
        getRenderingDataStub.returns({});
        doRender({renderFn, resizeFn, bidResponse});
        sinon.assert.notCalled(resizeFn);
      })
    });

    describe('handleRender', () => {
      let doRenderStub
      function doRenderHook(next, ...args) {
        next.bail(doRenderStub(...args));
      }
      before(() => {
        doRender.before(doRenderHook, 999);
      })
      after(() => {
        doRender.getHooks({hook: doRenderHook}).remove();
      })
      beforeEach(() => {
        sandbox.stub(auctionManager, 'addWinningBid');
        doRenderStub = sinon.stub();
      })
      describe('should emit AD_RENDER_FAILED', () => {
        it('when bidResponse is missing', () => {
          handleRender({adId});
          expectAdRenderFailedEvent(AD_RENDER_FAILED_REASON.CANNOT_FIND_AD);
          sinon.assert.notCalled(doRenderStub);
        });
        it('on exceptions', () => {
          doRenderStub.throws(new Error());
          handleRender({adId, bidResponse});
          expectAdRenderFailedEvent(AD_RENDER_FAILED_REASON.EXCEPTION);
        });
      })

      describe('when bid was already rendered', () => {
        beforeEach(() => {
          bidResponse.status = BID_STATUS.RENDERED;
        });
        afterEach(() => {
          config.resetConfig();
        })
        it('should emit STALE_RENDER', () => {
          handleRender({adId, bidResponse});
          sinon.assert.calledWith(events.emit, EVENTS.STALE_RENDER, bidResponse);
          sinon.assert.called(doRenderStub);
        });
        it('should skip rendering if suppressStaleRender', () => {
          config.setConfig({auctionOptions: {suppressStaleRender: true}});
          handleRender({adId, bidResponse});
          sinon.assert.notCalled(doRenderStub);
        })
      });

      it('should mark bid as won and emit BID_WON', () => {
        handleRender({renderFn, bidResponse});
        sinon.assert.calledWith(events.emit, EVENTS.BID_WON, bidResponse);
        sinon.assert.calledWith(auctionManager.addWinningBid, bidResponse);
      })
    })
  })

  describe('handleCreativeEvent', () => {
    let bid;
    beforeEach(() => {
      sandbox.stub(events, 'emit');
      bid = {
        status: BID_STATUS.RENDERED
      }
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
      handleCreativeEvent({event: 'unsupported'}, bid);
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
    })

    it('should resize', () => {
      const resizeFn = sinon.stub();
      handleNativeMessage({action: 'resizeNativeHeight', height: 100}, bid, {resizeFn});
      sinon.assert.calledWith(resizeFn, undefined, 100);
    });

    it('should fire trackers', () => {
      const data = {
        action: 'click'
      };
      const fireTrackers = sinon.stub();
      handleNativeMessage(data, bid, {fireTrackers});
      sinon.assert.calledWith(fireTrackers, data, bid);
    })
  })
});
