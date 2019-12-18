/* globals describe, it, beforeEach, afterEach, sinon */
import { expect } from 'chai'
import * as utils from 'src/utils'
import { STATUS } from 'src/constants'
import { VIDEO } from 'src/mediaTypes'
import { Renderer } from 'src/Renderer'
import { adapter } from 'modules/unrulyBidAdapter'

describe('UnrulyAdapter', function () {
  function createOutStreamExchangeBid({
    adUnitCode = 'placement2',
    statusCode = 1,
    bidId = 'foo',
    vastUrl = 'https://targeting.unrulymedia.com/in_article?uuid=74544e00-d43b-4f3a-a799-69d22ce979ce&supported_mime_type=application/javascript&supported_mime_type=video/mp4&tj=%7B%22site%22%3A%7B%22lang%22%3A%22en-GB%22%2C%22ref%22%3A%22%22%2C%22page%22%3A%22https%3A%2F%2Fdemo.unrulymedia.com%2FinArticle%2Finarticle_nypost_upbeat%2Ftravel_magazines.html%22%2C%22domain%22%3A%22demo.unrulymedia.com%22%7D%2C%22user%22%3A%7B%22profile%22%3A%7B%22quantcast%22%3A%7B%22segments%22%3A%5B%7B%22id%22%3A%22D%22%7D%2C%7B%22id%22%3A%22T%22%7D%5D%7D%7D%7D%7D&video_width=618&video_height=347'
  }) {
    return {
      'ext': {
        'statusCode': statusCode,
        'renderer': {
          'id': 'unruly_inarticle',
          'config': {
            'siteId': 123456,
            'targetingUUID': 'xxx-yyy-zzz'
          },
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

  beforeEach(function () {
    sandbox = sinon.sandbox.create();
    sandbox.stub(utils, 'logError');
    sandbox.stub(Renderer, 'install');

    fakeRenderer = {
      setRender: sinon.stub()
    };
    Renderer.install.returns(fakeRenderer)
  });

  afterEach(function () {
    sandbox.restore();
    delete parent.window.unruly
  });

  it('should expose Unruly Bidder code', function () {
    expect(adapter.code).to.equal('unruly')
  });

  it('should contain the VIDEO mediaType', function () {
    expect(adapter.supportedMediaTypes).to.deep.equal([ VIDEO ])
  });

  describe('isBidRequestValid', function () {
    it('should be a function', function () {
      expect(typeof adapter.isBidRequestValid).to.equal('function')
    });

    it('should return false if bid is falsey', function () {
      expect(adapter.isBidRequestValid()).to.be.false;
    });

    it('should return true if bid.mediaType is "video"', function () {
      const mockBid = { mediaType: 'video' };

      expect(adapter.isBidRequestValid(mockBid)).to.be.true;
    });

    it('should return true if bid.mediaTypes.video.context is "outstream"', function () {
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

  describe('buildRequests', function () {
    it('should be a function', function () {
      expect(typeof adapter.buildRequests).to.equal('function');
    });
    it('should return an object', function () {
      const mockBidRequests = ['mockBid'];
      expect(typeof adapter.buildRequests(mockBidRequests)).to.equal('object')
    });
    it('should return a server request with a valid exchange url', function () {
      const mockBidRequests = ['mockBid'];
      expect(adapter.buildRequests(mockBidRequests).url).to.equal('https://targeting.unrulymedia.com/prebid')
    });
    it('should return a server request with method === POST', function () {
      const mockBidRequests = ['mockBid'];
      expect(adapter.buildRequests(mockBidRequests).method).to.equal('POST');
    });
    it('should ensure contentType is `text/plain`', function () {
      const mockBidRequests = ['mockBid'];
      expect(adapter.buildRequests(mockBidRequests).options).to.deep.equal({
        contentType: 'text/plain'
      });
    });
    it('should return a server request with valid payload', function () {
      const mockBidRequests = ['mockBid'];
      const mockBidderRequest = {bidderCode: 'mockBidder'};
      expect(adapter.buildRequests(mockBidRequests, mockBidderRequest).data)
        .to.deep.equal({bidRequests: mockBidRequests, bidderRequest: mockBidderRequest})
    })
  });

  describe('interpretResponse', function () {
    it('should be a function', function () {
      expect(typeof adapter.interpretResponse).to.equal('function');
    });
    it('should return [] when serverResponse is undefined', function () {
      expect(adapter.interpretResponse()).to.deep.equal([]);
    });
    it('should return [] when  serverResponse has no bids', function () {
      const mockServerResponse = { body: { bids: [] } };
      expect(adapter.interpretResponse(mockServerResponse)).to.deep.equal([])
    });
    it('should return array of bids when receive a successful response from server', function () {
      const mockExchangeBid = createOutStreamExchangeBid({adUnitCode: 'video1', bidId: 'mockBidId'});
      const mockServerResponse = createExchangeResponse(mockExchangeBid);
      expect(adapter.interpretResponse(mockServerResponse)).to.deep.equal([
        {
          requestId: 'mockBidId',
          cpm: 20,
          width: 323,
          height: 323,
          vastUrl: 'https://targeting.unrulymedia.com/in_article?uuid=74544e00-d43b-4f3a-a799-69d22ce979ce&supported_mime_type=application/javascript&supported_mime_type=video/mp4&tj=%7B%22site%22%3A%7B%22lang%22%3A%22en-GB%22%2C%22ref%22%3A%22%22%2C%22page%22%3A%22https%3A%2F%2Fdemo.unrulymedia.com%2FinArticle%2Finarticle_nypost_upbeat%2Ftravel_magazines.html%22%2C%22domain%22%3A%22demo.unrulymedia.com%22%7D%2C%22user%22%3A%7B%22profile%22%3A%7B%22quantcast%22%3A%7B%22segments%22%3A%5B%7B%22id%22%3A%22D%22%7D%2C%7B%22id%22%3A%22T%22%7D%5D%7D%7D%7D%7D&video_width=618&video_height=347',
          netRevenue: true,
          creativeId: 'mockBidId',
          ttl: 360,
          currency: 'USD',
          renderer: fakeRenderer,
          mediaType: 'video'
        }
      ])
    });

    it('should initialize and set the renderer', function () {
      expect(Renderer.install.called).to.be.false;
      expect(fakeRenderer.setRender.called).to.be.false;

      const mockReturnedBid = createOutStreamExchangeBid({adUnitCode: 'video1', bidId: 'mockBidId'});
      const mockRenderer = {
        url: 'value: mockRendererURL',
        config: {
          siteId: 123456,
          targetingUUID: 'xxx-yyy-zzz'
        }
      };
      mockReturnedBid.ext.renderer = mockRenderer;
      const mockServerResponse = createExchangeResponse(mockReturnedBid);

      adapter.interpretResponse(mockServerResponse);

      expect(Renderer.install.calledOnce).to.be.true;
      sinon.assert.calledWithExactly(
        Renderer.install,
        Object.assign({}, mockRenderer, {callback: sinon.match.func})
      );

      sinon.assert.calledOnce(fakeRenderer.setRender);
      sinon.assert.calledWithExactly(fakeRenderer.setRender, sinon.match.func)
    });

    it('should return [] and log if bidResponse renderer config is not available', function () {
      sinon.assert.notCalled(utils.logError)

      expect(Renderer.install.called).to.be.false;
      expect(fakeRenderer.setRender.called).to.be.false;

      const mockReturnedBid = createOutStreamExchangeBid({adUnitCode: 'video1', bidId: 'mockBidId'});
      const mockRenderer = {
        url: 'value: mockRendererURL'
      };
      mockReturnedBid.ext.renderer = mockRenderer;
      const mockServerResponse = createExchangeResponse(mockReturnedBid);

      expect(adapter.interpretResponse(mockServerResponse)).to.deep.equal([]);

      const logErrorCalls = utils.logError.getCalls();
      expect(logErrorCalls.length).to.equal(2);

      const [ configErrorCall, siteIdErrorCall ] = logErrorCalls;

      expect(configErrorCall.args.length).to.equal(1);
      expect(configErrorCall.args[0].message).to.equal('UnrulyBidAdapter: Missing renderer config.');

      expect(siteIdErrorCall.args.length).to.equal(1);
      expect(siteIdErrorCall.args[0].message).to.equal('UnrulyBidAdapter: Missing renderer siteId.');
    });

    it('should return [] and log if siteId is not available', function () {
      sinon.assert.notCalled(utils.logError)

      expect(Renderer.install.called).to.be.false;
      expect(fakeRenderer.setRender.called).to.be.false;

      const mockReturnedBid = createOutStreamExchangeBid({adUnitCode: 'video1', bidId: 'mockBidId'});
      const mockRenderer = {
        url: 'value: mockRendererURL',
        config: {}
      };
      mockReturnedBid.ext.renderer = mockRenderer;
      const mockServerResponse = createExchangeResponse(mockReturnedBid);

      expect(adapter.interpretResponse(mockServerResponse)).to.deep.equal([]);

      const logErrorCalls = utils.logError.getCalls();
      expect(logErrorCalls.length).to.equal(1);

      const [ siteIdErrorCall ] = logErrorCalls;

      expect(siteIdErrorCall.args.length).to.equal(1);
      expect(siteIdErrorCall.args[0].message).to.equal('UnrulyBidAdapter: Missing renderer siteId.');
    });

    it('bid is placed on the bid queue when render is called', function () {
      const exchangeBid = createOutStreamExchangeBid({ adUnitCode: 'video', vastUrl: 'value: vastUrl' });
      const exchangeResponse = createExchangeResponse(exchangeBid);

      adapter.interpretResponse(exchangeResponse);

      sinon.assert.calledOnce(fakeRenderer.setRender);
      fakeRenderer.setRender.firstCall.args[0]();

      expect(window.top).to.have.deep.nested.property('unruly.native.prebid.uq');

      const uq = window.top.unruly.native.prebid.uq;
      const sentRendererConfig = uq[0][1];

      expect(uq[0][0]).to.equal('render');
      expect(sentRendererConfig.vastUrl).to.equal('value: vastUrl');
      expect(sentRendererConfig.renderer).to.equal(fakeRenderer);
      expect(sentRendererConfig.adUnitCode).to.equal('video')
    });

    it('should ensure that renderer is placed in Prebid supply mode', function () {
      const mockExchangeBid = createOutStreamExchangeBid({adUnitCode: 'video1', bidId: 'mockBidId'});
      const mockServerResponse = createExchangeResponse(mockExchangeBid);

      expect('unruly' in window.parent).to.equal(false);

      adapter.interpretResponse(mockServerResponse);

      const supplyMode = window.parent.unruly.native.supplyMode;

      expect(supplyMode).to.equal('prebid');
    });
  });

  describe('getUserSyncs', () => {
    it('should push user sync iframe if enabled', () => {
      const mockConsent = {}
      const response = {}
      const syncOptions = { iframeEnabled: true }
      const syncs = adapter.getUserSyncs(syncOptions, response, mockConsent)
      expect(syncs[0]).to.deep.equal({
        type: 'iframe',
        url: 'https://video.unrulymedia.com/iframes/third-party-iframes.html'
      });
    })

    it('should not push user sync iframe if not enabled', () => {
      const mockConsent = {}
      const response = {}
      const syncOptions = { iframeEnabled: false }
      const syncs = adapter.getUserSyncs(syncOptions, response, mockConsent);
      expect(syncs).to.be.empty;
    });
  });

  it('should not append consent params if gdpr does not apply', () => {
    const mockConsent = {}
    const response = {}
    const syncOptions = { iframeEnabled: true }
    const syncs = adapter.getUserSyncs(syncOptions, response, mockConsent)
    expect(syncs[0]).to.deep.equal({
      type: 'iframe',
      url: 'https://video.unrulymedia.com/iframes/third-party-iframes.html'
    })
  });

  it('should append consent params if gdpr does apply and consent is given', () => {
    const mockConsent = {
      gdprApplies: true,
      consentString: 'hello'
    };
    const response = {}
    const syncOptions = { iframeEnabled: true }
    const syncs = adapter.getUserSyncs(syncOptions, response, mockConsent)
    expect(syncs[0]).to.deep.equal({
      type: 'iframe',
      url: 'https://video.unrulymedia.com/iframes/third-party-iframes.html?gdpr=1&gdpr_consent=hello'
    })
  });

  it('should append consent param if gdpr applies and no consent is given', () => {
    const mockConsent = {
      gdprApplies: true,
      consentString: {}
    };
    const response = {};
    const syncOptions = { iframeEnabled: true }
    const syncs = adapter.getUserSyncs(syncOptions, response, mockConsent)
    expect(syncs[0]).to.deep.equal({
      type: 'iframe',
      url: 'https://video.unrulymedia.com/iframes/third-party-iframes.html?gdpr=0'
    })
  })
});
