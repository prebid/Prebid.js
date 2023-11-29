import * as events from 'src/events.js';
import * as utils from 'src/utils.js';
import {handleCreativeEvent, handleRender} from '../../../src/adRendering.js';
import CONSTANTS from 'src/constants.json';
import {expect} from 'chai/index.mjs';

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

  describe('handleRender', () => {
    let bidResponse, renderFn, result;
    beforeEach(() => {
      result = null;
      renderFn = sinon.stub().callsFake((r) => { result = r; });
      bidResponse = {
        adId: 123
      }
    });

    it('does not invoke renderFn, but the renderer instead, if the ad has one', () => {
      const renderer = {
        url: 'some-custom-renderer',
        render: sinon.spy()
      }
      handleRender(renderFn, {bidResponse: {renderer}});
      sinon.assert.notCalled(renderFn);
      sinon.assert.called(renderer.render);
    });

    ['ad', 'adUrl'].forEach((prop) => {
      describe(`on ${prop}`, () => {
        it('replaces AUCTION_PRICE macro', () => {
          bidResponse[prop] = 'pre${AUCTION_PRICE}post';
          bidResponse.cpm = 123;
          handleRender(renderFn, {adId: 123, bidResponse});
          expect(result[prop]).to.eql('pre123post');
        });
        it('replaces CLICKTHROUGH macro', () => {
          bidResponse[prop] = 'pre${CLICKTHROUGH}post';
          handleRender(renderFn, {adId: 123, bidResponse, options: {clickUrl: 'clk'}});
          expect(result[prop]).to.eql('preclkpost');
        });
        it('defaults CLICKTHROUGH to empty string', () => {
          bidResponse[prop] = 'pre${CLICKTHROUGH}post';
          handleRender(renderFn, {adId: 123, bidResponse});
          expect(result[prop]).to.eql('prepost');
        });
      });
    });
  });

  describe('handleCreativeEvent', () => {
    let bid;
    beforeEach(() => {
      sandbox.stub(events, 'emit');
      bid = {
        status: CONSTANTS.BID_STATUS.RENDERED
      }
    });
    it('emits AD_RENDER_FAILED with given reason', () => {
      handleCreativeEvent({event: CONSTANTS.EVENTS.AD_RENDER_FAILED, info: {reason: 'reason', message: 'message'}}, bid);
      sinon.assert.calledWith(events.emit, CONSTANTS.EVENTS.AD_RENDER_FAILED, sinon.match({bid, reason: 'reason', message: 'message'}));
    });

    it('emits AD_RENDER_SUCCEEDED', () => {
      handleCreativeEvent({event: CONSTANTS.EVENTS.AD_RENDER_SUCCEEDED}, bid);
      sinon.assert.calledWith(events.emit, CONSTANTS.EVENTS.AD_RENDER_SUCCEEDED, sinon.match({bid}));
    });

    it('logs an error on other events', () => {
      handleCreativeEvent({event: 'unsupported'}, bid);
      sinon.assert.called(utils.logError);
      sinon.assert.notCalled(events.emit);
    });
  });
});
