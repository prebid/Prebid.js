import {
  outstreamRenderer,
  renderBid,
  bidShouldUsePlayerWidthAndHeight,
  DEFAULT_RENDERER_URL
} from 'libraries/magniteUtils/outstream.js';
import { Renderer } from 'src/Renderer.js';
import * as utils from 'src/utils.js';

describe('Magnite Utils Outstream', function () {
  let logWarnStub;

  beforeEach(function () {
    logWarnStub = sinon.stub(utils, 'logWarn');
  });

  afterEach(function () {
    logWarnStub.restore();
  });

  describe('bidShouldUsePlayerWidthAndHeight', function () {
    it('should return true if bid has no dimensions but has player size', function () {
      const bid = {
        playerWidth: 640,
        playerHeight: 480
      };
      expect(bidShouldUsePlayerWidthAndHeight(bid)).to.be.true;
    });

    it('should return false if bid has dimensions', function () {
      const bid = {
        width: 300,
        height: 250,
        playerWidth: 640,
        playerHeight: 480
      };
      expect(bidShouldUsePlayerWidthAndHeight(bid)).to.be.false;
    });

    it('should return false if bid has no player size', function () {
      const bid = {
        width: undefined,
        height: undefined
      };
      expect(bidShouldUsePlayerWidthAndHeight(bid)).to.be.false;
    });
  });

  describe('outstreamRenderer', function () {
    let rendererInstallStub;
    let rendererSetRenderSpy;

    beforeEach(function () {
      rendererSetRenderSpy = sinon.spy();
      rendererInstallStub = sinon.stub(Renderer, 'install').returns({
        setRender: rendererSetRenderSpy
      });
    });

    afterEach(function () {
      rendererInstallStub.restore();
    });

    it('should install renderer with default URL if not provided', function () {
      const bid = {
        adId: 'test-ad-id',
        adUnitCode: 'test-ad-unit'
      };
      outstreamRenderer(bid);
      expect(rendererInstallStub.calledOnce).to.be.true;
      expect(rendererInstallStub.firstCall.args[0].url).to.equal(DEFAULT_RENDERER_URL);
    });

    it('should install renderer with provided URL', function () {
      const bid = {
        adId: 'test-ad-id',
        adUnitCode: 'test-ad-unit'
      };
      const customUrl = 'https://custom.url/renderer.js';
      outstreamRenderer(bid, customUrl);
      expect(rendererInstallStub.firstCall.args[0].url).to.equal(customUrl);
    });

    it('should set render function', function () {
      const bid = {
        adId: 'test-ad-id',
        adUnitCode: 'test-ad-unit'
      };
      outstreamRenderer(bid);
      expect(rendererSetRenderSpy.calledOnce).to.be.true;
      expect(rendererSetRenderSpy.firstCall.args[0]).to.equal(renderBid);
    });
  });

  describe('renderBid', function () {
    let adUnitElement;
    let bid;
    let rendererPushSpy;

    beforeEach(function () {
      adUnitElement = document.createElement('div');
      adUnitElement.id = 'test-ad-unit';
      document.body.appendChild(adUnitElement);

      rendererPushSpy = sinon.spy();
      bid = {
        adUnitCode: 'test-ad-unit',
        width: 640,
        height: 480,
        vastUrl: 'https://vast.url',
        renderer: {
          getConfig: () => ({}),
          push: rendererPushSpy
        }
      };

      globalThis.MagniteApex = {
        renderAd: sinon.spy()
      };
    });

    afterEach(function () {
      document.body.removeChild(adUnitElement);
      delete globalThis.MagniteApex;
    });

    it('should log warning if ad unit element not found', function () {
      bid.adUnitCode = 'missing-ad-unit';
      renderBid(bid);
      expect(logWarnStub.calledWithMatch('Magnite: unable to find ad unit element')).to.be.true;
    });

    it('should push render function to renderer', function () {
      renderBid(bid);
      expect(rendererPushSpy.calledOnce).to.be.true;
      const callback = rendererPushSpy.firstCall.args[0];
      callback();
      expect(globalThis.MagniteApex.renderAd.calledOnce).to.be.true;
      const args = globalThis.MagniteApex.renderAd.firstCall.args[0];
      expect(args.width).to.equal(640);
      expect(args.height).to.equal(480);
      expect(args.vastUrl).to.equal('https://vast.url');
      expect(args.placement.attachTo).to.equal(adUnitElement);
    });

    it('should hide google ads div', function () {
      const wrapper = document.createElement('div');
      adUnitElement.appendChild(wrapper);
      const googleAdsDiv = document.createElement('div');
      googleAdsDiv.id = 'google_ads_iframe';
      wrapper.appendChild(googleAdsDiv);

      renderBid(bid);
      expect(googleAdsDiv.style.display).to.equal('none');
    });
  });
});
