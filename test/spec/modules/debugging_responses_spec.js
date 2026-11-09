import { expect } from 'chai';
import makeResponseResolvers from '../../../modules/debugging/responses.js';
import { BANNER, NATIVE, VIDEO } from '../../../src/mediaTypes.js';

describe('debugging response resolvers', () => {
  let resolvers, renderer, Renderer;

  beforeEach(() => {
    renderer = { setRender: sinon.stub() };
    Renderer = { install: sinon.stub().returns(renderer) };
    resolvers = makeResponseResolvers({ Renderer, BANNER, NATIVE, VIDEO });
  });

  describe('banner responses', () => {
    [
      { width: 300, height: 250, size: '250px', repeat: 'repeat-x' },
      { width: 160, height: 600, size: '160px', repeat: 'repeat-y' },
      { width: 300, height: 300, size: '300px', repeat: 'repeat-x' },
      { wratio: 16, hratio: 9, size: '100%', repeat: 'repeat-x' },
      { wratio: 9, hratio: 16, size: '100%', repeat: 'repeat-y' }
    ].forEach(({ size, repeat, ...dimensions }) => {
      it(`generates a ${repeat} placeholder for ${JSON.stringify(dimensions)}`, () => {
        const response = { ...dimensions };
        resolvers[BANNER]({}, response);

        const doc = new DOMParser().parseFromString(response.ad, 'text/html');
        const style = doc.querySelector('div').style;
        const expectedStyle = doc.createElement('div').style;
        // Browsers may include the implicit auto height when serializing background-size.
        expectedStyle.backgroundSize = size;
        expect(style.width).to.equal(dimensions.width == null ? '100%' : `${dimensions.width}px`);
        expect(style.height).to.equal(dimensions.height == null ? '100%' : `${dimensions.height}px`);
        expect(style.backgroundSize).to.equal(expectedStyle.backgroundSize);
        expect(style.backgroundRepeat).to.equal(repeat);
        expect(style.backgroundImage).to.contain('https://vcdn.adnxs.com/');
      });
    });

    ['ad', 'adUrl'].forEach(property => {
      [null, '', 'existing creative'].forEach(value => {
        it(`preserves an explicitly supplied ${property} of ${JSON.stringify(value)}`, () => {
          const response = { [property]: value };
          resolvers[BANNER]({}, response);
          expect(response).to.deep.equal({ [property]: value });
        });
      });
    });
  });

  describe('video responses', () => {
    let originalGlobals;

    beforeEach(() => {
      originalGlobals = Object.fromEntries(['googletag', 'jwplayer'].map(name => [
        name, Object.getOwnPropertyDescriptor(window, name)
      ]));
      window.googletag = undefined;
    });

    afterEach(() => {
      Object.entries(originalGlobals).forEach(([name, descriptor]) => {
        if (descriptor) {
          Object.defineProperty(window, name, descriptor);
        } else {
          delete window[name];
        }
      });
    });

    ['vastXml', 'vastUrl'].forEach(property => {
      it(`preserves an existing ${property} and renderer`, () => {
        const response = { [property]: 'existing creative', renderer: {} };
        const expected = { ...response };
        resolvers[VIDEO]({}, response);
        expect(response).to.deep.equal(expected);
        expect(Renderer.install.called).to.be.false;
      });
    });

    function renderResponse({ adUnitCode = 'video-slot', parentId = adUnitCode, vastUrl } = {}) {
      const response = { width: 640, height: 360 };
      resolvers[VIDEO]({}, response);
      const vast = new DOMParser().parseFromString(response.vastXml, 'application/xml');
      expect(vast.querySelector('parsererror')).to.equal(null);
      expect(vast.documentElement.tagName).to.equal('VAST');
      expect(vast.querySelector('MediaFile').getAttribute('type')).to.equal('video/mp4');
      expect(Renderer.install.calledOnceWithExactly({
        url: 'https://cdn.jwplayer.com/libraries/l5MchIxB.js'
      })).to.be.true;
      expect(response.renderer).to.equal(renderer);
      expect(renderer.setRender.calledOnce).to.be.true;

      const player = { on: sinon.stub(), loadAdTag: sinon.spy(), loadAdXml: sinon.spy() };
      const setup = sinon.stub().returns(player);
      window.jwplayer = sinon.stub().returns({ setup });
      const doc = document.implementation.createHTMLDocument('debugging video');
      const parent = doc.createElement('div');
      parent.id = parentId;
      doc.body.appendChild(parent);
      const bid = { adUnitCode, vastXml: response.vastXml, ...(vastUrl ? { vastUrl } : {}) };
      renderer.setRender.firstCall.args[0](bid, doc);

      expect(parent.children).to.have.lengthOf(1);
      expect(parent.firstElementChild.id).to.equal(`${parentId}-video-player`);
      expect(window.jwplayer.calledOnceWithExactly(`${parentId}-video-player`)).to.be.true;
      expect(setup.calledOnceWithExactly({
        debug: true,
        width: 640,
        height: 360,
        advertising: { client: 'vast', outstream: true, endstate: 'close' }
      })).to.be.true;
      expect(player.on.calledOnceWith('ready', sinon.match.func)).to.be.true;
      return { player, response, ready: player.on.firstCall.args[1] };
    }

    it('renders in the ad unit div without GPT and loads the default VAST when ready', async () => {
      const { player, response, ready } = renderResponse();
      expect(player.loadAdXml.called).to.be.false;
      await ready();
      expect(player.loadAdXml.calledOnceWithExactly(response.vastXml)).to.be.true;
      expect(player.loadAdTag.called).to.be.false;
    });

    it('loads a bid VAST URL only after the player is ready', async () => {
      const vastUrl = 'https://example.com/vast.xml';
      const { player, ready } = renderResponse({ vastUrl });
      expect(player.loadAdTag.called).to.be.false;
      await ready();
      expect(player.loadAdTag.calledOnceWithExactly(vastUrl)).to.be.true;
      expect(player.loadAdXml.called).to.be.false;
    });

    [
      { name: 'ad unit path', adUnitCode: '/123/video', parentId: 'gpt-video' },
      { name: 'element ID', adUnitCode: 'gpt-video', parentId: 'gpt-video' },
      { name: 'unmatched ad unit', adUnitCode: 'other-video', parentId: 'other-video' }
    ].forEach(({ name, ...options }) => {
      it(`finds the correct render container for a GPT ${name}`, () => {
        window.googletag = {
          pubads: () => ({
            getSlots: () => [
              { getAdUnitPath: () => '/123/unrelated', getSlotElementId: () => 'unrelated' },
              { getAdUnitPath: () => '/123/video', getSlotElementId: () => 'gpt-video' }
            ]
          })
        };
        renderResponse(options);
      });
    });

    it('falls back to the ad unit div when GPT has not initialized pubads', () => {
      window.googletag = {};
      renderResponse();
    });
  });

  describe('native responses', () => {
    it('generates native assets with their requested IDs and required flags', () => {
      const assets = [
        { id: 1, required: 1, img: { type: 3, wmin: 300 } },
        { id: 2, required: 0, video: { protocols: [2, 3] } },
        { id: 3, required: 1, data: { type: 3 } },
        { id: 4, required: 1, title: { len: 100 } }
      ];
      const request = { nativeOrtbRequest: { assets } };
      const original = JSON.parse(JSON.stringify(request));
      const response = {};
      resolvers[NATIVE](request, response);

      const native = response.native.ortb;
      expect(native.link).to.deep.equal({
        url: 'https://www.link.example', clicktrackers: ['https://impression.example']
      });
      expect(native.assets.map(({ id, required }) => ({ id, required }))).to.deep.equal(
        assets.map(({ id, required }) => ({ id, required }))
      );
      expect(native.assets[0].img).to.deep.equal({
        type: 3,
        w: 600,
        h: 500,
        url: 'https://vcdn.adnxs.com/p/creative-image/27/c0/52/67/27c05267-5a6d-4874-834e-18e218493c32.png'
      });
      const vast = new DOMParser().parseFromString(native.assets[1].video.vasttag, 'application/xml');
      expect(vast.querySelector('parsererror')).to.equal(null);
      expect(vast.documentElement.tagName).to.equal('VAST');
      expect(native.assets[2].data).to.deep.equal({ value: '5 stars' });
      expect(native.assets[3].title).to.deep.equal({ text: 'Prebid Native Example' });
      expect(request).to.deep.equal(original);
    });

    it('preserves an explicitly supplied native response', () => {
      const native = { ortb: { assets: [] } };
      const response = { native };
      resolvers[NATIVE]({}, response);
      expect(response.native).to.equal(native);
      expect(response).to.deep.equal({ native });
    });

    it('supports a native request with no assets', () => {
      const response = {};
      resolvers[NATIVE]({ nativeOrtbRequest: { assets: [] } }, response);
      expect(response.native.ortb.assets).to.deep.equal([]);
    });
  });
});
