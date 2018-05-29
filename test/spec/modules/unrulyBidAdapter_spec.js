/* globals describe, it, beforeEach, afterEach, sinon */
import { expect } from 'chai'
import * as utils from 'src/utils'
import { STATUS } from 'src/constants'
import { VIDEO } from 'src/mediaTypes'
import { Renderer } from 'src/Renderer'
import { adapter } from 'modules/unrulyBidAdapter'

describe('UnrulyAdapter', () => {
  function createOutStreamExchangeBid({
    adUnitCode = 'placement2',
    statusCode = 1,
    bidId = 'foo',
    vastUrl = 'https://targeting.unrulymedia.com/in_article?uuid=74544e00-d43b-4f3a-a799-69d22ce979ce&supported_mime_type=application/javascript&supported_mime_type=video/mp4&tj=%7B%22site%22%3A%7B%22lang%22%3A%22en-GB%22%2C%22ref%22%3A%22%22%2C%22page%22%3A%22http%3A%2F%2Fdemo.unrulymedia.com%2FinArticle%2Finarticle_nypost_upbeat%2Ftravel_magazines.html%22%2C%22domain%22%3A%22demo.unrulymedia.com%22%7D%2C%22user%22%3A%7B%22profile%22%3A%7B%22quantcast%22%3A%7B%22segments%22%3A%5B%7B%22id%22%3A%22D%22%7D%2C%7B%22id%22%3A%22T%22%7D%5D%7D%7D%7D%7D&video_width=618&video_height=347'
  }) {
    return {
      'ext': {
        'statusCode': statusCode,
        'renderer': {
          'id': 'unruly_inarticle',
          'config': {},
          'url': 'https://video.unrulymedia.com/native/prebid-loader.js'
        },
        'adUnitCode': adUnitCode
      },
      'cpm': 20,
      'bidderCode': 'unruly',
      'width': 323,
      'vastUrl': vastUrl,
      'bidId': bidId,
      'height': 323
    }
  }

  const createExchangeResponse = (...bids) => ({
    body: { bids }
  });

  let sandbox;
  let fakeRenderer;

  beforeEach(() => {
    sandbox = sinon.sandbox.create();
    sandbox.stub(utils, 'logError');
    sandbox.stub(Renderer, 'install');

    fakeRenderer = {
      setRender: sinon.stub()
    };
    Renderer.install.returns(fakeRenderer)
  });

  afterEach(() => {
    sandbox.restore();
    delete parent.window.unruly
  });

  it('should expose Unruly Bidder code', () => {
    expect(adapter.code).to.equal('unruly')
  });

  it('should contain the VIDEO mediaType', function () {
    expect(adapter.supportedMediaTypes).to.deep.equal([ VIDEO ])
  });

  describe('isBidRequestValid', () => {
    it('should be a function', () => {
      expect(typeof adapter.isBidRequestValid).to.equal('function')
    });

    it('should return false if bid is falsey', () => {
      expect(adapter.isBidRequestValid()).to.be.false;
    });

    it('should return true if bid.mediaType is "video"', () => {
      const mockBid = { mediaType: 'video' };

      expect(adapter.isBidRequestValid(mockBid)).to.be.true;
    });

    it('should return true if bid.mediaTypes.video.context is "outstream"', () => {
      const mockBid = {
        mediaTypes: {
          video: {
            context: 'outstream'
          }
        }
      };

      expect(adapter.isBidRequestValid(mockBid)).to.be.true;
    });
  });

  describe('buildRequests', () => {
    it('should be a function', () => {
      expect(typeof adapter.buildRequests).to.equal('function');
    });
    it('should return an object', () => {
      const mockBidRequests = ['mockBid'];
      expect(typeof adapter.buildRequests(mockBidRequests)).to.equal('object')
    });
    it('should return a server request with a valid exchange url', () => {
      const mockBidRequests = ['mockBid'];
      expect(adapter.buildRequests(mockBidRequests).url).to.equal('https://targeting.unrulymedia.com/prebid')
    });
    it('should return a server request with method === POST', () => {
      const mockBidRequests = ['mockBid'];
      expect(adapter.buildRequests(mockBidRequests).method).to.equal('POST');
    });
    it('should ensure contentType is `application/json`', function () {
      const mockBidRequests = ['mockBid'];
      expect(adapter.buildRequests(mockBidRequests).options).to.deep.equal({
        contentType: 'application/json'
      });
    });
    it('should return a server request with valid payload', () => {
      const mockBidRequests = ['mockBid'];
      expect(adapter.buildRequests(mockBidRequests).data).to.deep.equal({bidRequests: mockBidRequests})
    })
  });

  describe('interpretResponse', () => {
    it('should be a function', () => {
      expect(typeof adapter.interpretResponse).to.equal('function');
    });
    it('should return empty array when serverResponse is undefined', () => {
      expect(adapter.interpretResponse()).to.deep.equal([]);
    });
    it('should return empty array when  serverResponse has no bids', () => {
      const mockServerResponse = { body: { bids: [] } };
      expect(adapter.interpretResponse(mockServerResponse)).to.deep.equal([])
    });
    it('should return array of bids when receive a successful response from server', () => {
      const mockExchangeBid = createOutStreamExchangeBid({adUnitCode: 'video1', bidId: 'mockBidId'});
      const mockServerResponse = createExchangeResponse(mockExchangeBid);
      expect(adapter.interpretResponse(mockServerResponse)).to.deep.equal([
        {
          requestId: 'mockBidId',
          cpm: 20,
          width: 323,
          height: 323,
          vastUrl: 'https://targeting.unrulymedia.com/in_article?uuid=74544e00-d43b-4f3a-a799-69d22ce979ce&supported_mime_type=application/javascript&supported_mime_type=video/mp4&tj=%7B%22site%22%3A%7B%22lang%22%3A%22en-GB%22%2C%22ref%22%3A%22%22%2C%22page%22%3A%22http%3A%2F%2Fdemo.unrulymedia.com%2FinArticle%2Finarticle_nypost_upbeat%2Ftravel_magazines.html%22%2C%22domain%22%3A%22demo.unrulymedia.com%22%7D%2C%22user%22%3A%7B%22profile%22%3A%7B%22quantcast%22%3A%7B%22segments%22%3A%5B%7B%22id%22%3A%22D%22%7D%2C%7B%22id%22%3A%22T%22%7D%5D%7D%7D%7D%7D&video_width=618&video_height=347',
          netRevenue: true,
          creativeId: 'mockBidId',
          ttl: 360,
          currency: 'USD',
          renderer: fakeRenderer
        }
      ])
    });

    it('should initialize and set the renderer', () => {
      expect(Renderer.install).not.to.have.been.called;
      expect(fakeRenderer.setRender).not.to.have.been.called;

      const mockReturnedBid = createOutStreamExchangeBid({adUnitCode: 'video1', bidId: 'mockBidId'});
      const mockRenderer = { url: 'value: mockRendererURL' };
      mockReturnedBid.ext.renderer = mockRenderer;
      const mockServerResponse = createExchangeResponse(mockReturnedBid);

      adapter.interpretResponse(mockServerResponse);

      expect(Renderer.install).to.have.been.calledOnce;
      sinon.assert.calledWithExactly(
        Renderer.install,
        Object.assign({}, mockRenderer, {callback: sinon.match.func})
      );

      sinon.assert.calledOnce(fakeRenderer.setRender);
      sinon.assert.calledWithExactly(fakeRenderer.setRender, sinon.match.func)
    });

    it('bid is placed on the bid queue when render is called', () => {
      const exchangeBid = createOutStreamExchangeBid({ adUnitCode: 'video', vastUrl: 'value: vastUrl' });
      const exchangeResponse = createExchangeResponse(exchangeBid);

      adapter.interpretResponse(exchangeResponse);

      sinon.assert.calledOnce(fakeRenderer.setRender);
      fakeRenderer.setRender.firstCall.args[0]();

      expect(window.top).to.have.deep.property('unruly.native.prebid.uq');

      const uq = window.top.unruly.native.prebid.uq;
      const sentRendererConfig = uq[0][1];

      expect(uq[0][0]).to.equal('render');
      expect(sentRendererConfig.vastUrl).to.equal('value: vastUrl');
      expect(sentRendererConfig.renderer).to.equal(fakeRenderer);
      expect(sentRendererConfig.adUnitCode).to.equal('video')
    })

    it('should ensure that renderer is placed in Prebid supply mode', () => {
      const mockExchangeBid = createOutStreamExchangeBid({adUnitCode: 'video1', bidId: 'mockBidId'});
      const mockServerResponse = createExchangeResponse(mockExchangeBid);

      expect('unruly' in window.parent).to.equal(false);

      adapter.interpretResponse(mockServerResponse);

      const supplyMode = window.parent.unruly.native.supplyMode;

      expect(supplyMode).to.equal('prebid');
    });
  });
});
