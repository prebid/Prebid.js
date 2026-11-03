import { expect } from 'chai';
import { spec, storage } from 'modules/playgamaBidAdapter.js';
import { loadExternalScriptStub } from 'test/mocks/adloaderStub.js';

const PRODUCTION_ENDPOINT = 'https://ssp.playgama.com/v2/auction';
const STAGING_ENDPOINT = 'https://ssp-staging.playgama.com/v2/auction';

function bidRequest(overrides = {}) {
  return {
    bidder: 'playgama',
    bidId: 'bid-1',
    adUnitCode: 'div-1',
    params: { publisherId: 'pub-1', adUnitId: 'au-1' },
    ...overrides,
  };
}

function withParams(params) {
  return bidRequest({ params: { publisherId: 'pub-1', adUnitId: 'au-1', ...params } });
}

function sspBid(overrides = {}) {
  return {
    requestId: 'bid-1',
    cpm: 1,
    currency: 'USD',
    width: 300,
    height: 250,
    creativeId: 'cr-1',
    netRevenue: true,
    ttl: 300,
    mediaType: 'banner',
    meta: { advertiserDomains: [], seat: 'seat-1', demandPartner: 'ref' },
    render: { mode: 'default' },
    ...overrides,
  };
}

const OUTSTREAM = { mediaType: 'video', vastXml: '<VAST/>', render: { mode: 'outstream' } };
const INTERSTITIAL = { width: 1, height: 1, ad: '<div>interstitial</div>', render: { mode: 'interstitial' } };

function sentPayload(bids, bidderRequest = {}) {
  const [request] = spec.buildRequests(bids, bidderRequest);
  return JSON.parse(request.data);
}

function interpretResponse(body, bidRequests = [bidRequest()]) {
  return spec.interpretResponse({ body }, { bidRequests });
}

function interpretedRenderer(bid, request = bidRequest()) {
  const [interpreted] = interpretResponse({ bids: [sspBid(bid)] }, [request]);
  return interpreted.renderer;
}

function stubRendererScripts() {
  const outstreamInit = sinon.stub().resolves();
  const interstitialRender = sinon.stub();
  const OutstreamRenderer = sinon.stub().callsFake(function () {
    this.init = outstreamInit;
  });
  const InterstitialRenderer = sinon.stub().callsFake(function () {
    this.render = interstitialRender;
  });
  window.PgPrebidRenderers = { OutstreamRenderer, InterstitialRenderer };
  return { OutstreamRenderer, outstreamInit, InterstitialRenderer, interstitialRender };
}

function scriptLoads(outcome) {
  loadExternalScriptStub.callsFake((url, moduleType, moduleCode, callback) => {
    callback[outcome]();
    return document.createElement('script');
  });
}

describe('playgamaBidAdapter', function () {
  let container;

  beforeEach(function () {
    container = document.createElement('div');
    container.id = 'div-1';
    document.body.appendChild(container);
  });

  afterEach(function () {
    container.remove();
    delete window.PgPrebidRenderers;
  });

  describe('isBidRequestValid', function () {
    it('accepts a bid with publisherId and adUnitId', function () {
      expect(spec.isBidRequestValid(bidRequest())).to.equal(true);
    });

    [
      ['missing params', { params: undefined }],
      ['missing publisherId', { params: { adUnitId: 'au-1' } }],
      ['missing adUnitId', { params: { publisherId: 'pub-1' } }],
      ['an empty publisherId', { params: { publisherId: '', adUnitId: 'au-1' } }],
      ['a non-string publisherId', { params: { publisherId: 1, adUnitId: 'au-1' } }],
      ['a non-string adUnitId', { params: { publisherId: 'pub-1', adUnitId: ['au-1'] } }],
    ].forEach(([label, overrides]) => {
      it(`rejects a bid with ${label}`, function () {
        expect(spec.isBidRequestValid(bidRequest(overrides))).to.equal(false);
      });
    });
  });

  describe('buildRequests', function () {
    it('returns nothing without bids', function () {
      expect(spec.buildRequests([], {})).to.deep.equal([]);
    });

    it('posts the Prebid objects to the SSP once, without the copies Prebid repeats', function () {
      const ortb2 = { site: { page: 'https://example.com' } };
      const sentBid = bidRequest({
        mediaTypes: { banner: { sizes: [[300, 250]] } },
        ortb2Imp: { ext: { gpid: '/1/leaderboard' } },
      });
      const bid = { ...sentBid, ortb2 };
      const bidderRequest = { ortb2, bids: [bid], gdprConsent: { consentString: 'c', gdprApplies: true } };

      const [request] = spec.buildRequests([bid], bidderRequest);

      expect(request.method).to.equal('POST');
      expect(request.url).to.equal(PRODUCTION_ENDPOINT);
      expect(request.options).to.deep.equal({ contentType: 'text/plain' });
      expect(request.bidRequests).to.deep.equal([bid]);
      expect(JSON.parse(request.data)).to.deep.equal({
        valid_bid_requests: [{ ...sentBid, floors: {} }],
        bidder_request: { ortb2, gdprConsent: bidderRequest.gdprConsent },
        device: { pxratio: window.devicePixelRatio },
        user: {},
      });
    });

    it('routes to the staging SSP when params.env is staging', function () {
      const [request] = spec.buildRequests([withParams({ env: 'staging' })], {});

      expect(request.url).to.equal(STAGING_ENDPOINT);
    });

    it('ignores an unknown env', function () {
      const [request] = spec.buildRequests([withParams({ env: 'local' })], {});

      expect(request.url).to.equal(PRODUCTION_ENDPOINT);
    });

    it('sends the Price Floors module result for each declared format', function () {
      const getFloor = sinon.stub().callsFake(({ mediaType }) => ({
        floor: mediaType === 'banner' ? 1.5 : 2,
        currency: 'USD',
      }));
      const mediaTypes = { banner: { sizes: [[300, 250]] }, video: { playerSize: [640, 480] } };

      const payload = sentPayload([bidRequest({ mediaTypes, getFloor })]);

      sinon.assert.calledWith(getFloor, { currency: 'USD', mediaType: 'banner', size: '*' });
      sinon.assert.calledWith(getFloor, { currency: 'USD', mediaType: 'video', size: '*' });
      expect(payload.valid_bid_requests[0].floors).to.deep.equal({
        banner: { floor: 1.5, currency: 'USD' },
        video: { floor: 2, currency: 'USD' },
      });
    });
  });

  describe('interpretResponse', function () {
    it('returns no bids when the response has none', function () {
      expect(interpretResponse(undefined)).to.deep.equal([]);
      expect(interpretResponse({})).to.deep.equal([]);
      expect(interpretResponse({ bids: [] })).to.deep.equal([]);
    });

    it('matches each SSP bid to the bid request it was sent for, dropping unknown ones', function () {
      const [request] = spec.buildRequests([bidRequest({ bidId: 'bid-1' }), bidRequest({ bidId: 'bid-2' })], {});

      const bids = interpretResponse(
        { bids: [sspBid({ requestId: 'bid-2' }), sspBid({ requestId: 'unknown' })] },
        request.bidRequests
      );

      expect(bids.map((bid) => bid.requestId)).to.deep.equal(['bid-2']);
    });

    it('passes a default-render bid through, adding the SSP auction id to meta', function () {
      const [bid] = interpretResponse({ auction_id: 'ssp-auction-1', bids: [sspBid()] });

      const { render, ...expected } = sspBid();
      expect(bid).to.deep.equal({ ...expected, meta: { ...expected.meta, pgAuctionId: 'ssp-auction-1' } });
      expect(bid.renderer).to.be.undefined;
    });

    it('sizes a GAM-delivered h5 interstitial to the viewport minus the SSP gap', function () {
      const [bid] = interpretResponse({
        bids: [sspBid({ width: 1, height: 1, render: { mode: 'h5_gam', viewportGapPx: 160 } })],
      });

      expect(bid.width).to.equal(window.innerWidth - 160);
      expect(bid.height).to.equal(window.innerHeight - 160);
    });

    it('keeps the bid size of a GAM-delivered h5 interstitial without a gap', function () {
      const [bid] = interpretResponse({ bids: [sspBid({ width: 1, height: 1, render: { mode: 'h5_gam' } })] });

      expect(bid.width).to.equal(1);
      expect(bid.height).to.equal(1);
    });
  });

  describe('renderers', function () {
    [
      ['outstream', OUTSTREAM],
      ['interstitial', INTERSTITIAL],
    ].forEach(([name, bid]) => {
      it(`loads the ${name} renderer from the environment's renderers base`, function () {
        expect(interpretedRenderer(bid).url).to.equal(`https://playgama.com/prebid-renderers/${name}.js`);
        expect(interpretedRenderer(bid, withParams({ env: 'staging' })).url).to.equal(
          `https://staging.playgama.com/prebid-renderers/${name}.js`
        );
      });
    });

    [
      ['outstream', OUTSTREAM, 'OutstreamRenderer'],
      ['interstitial', INTERSTITIAL, 'InterstitialRenderer'],
    ].forEach(([name, bid, script]) => {
      it(`reports a ${name} script load failure to onError`, function () {
        const renderer = interpretedRenderer(bid);
        const scripts = stubRendererScripts();
        const onError = sinon.stub();
        renderer.config = { onError };
        scriptLoads('error');

        renderer.render({ adUnitCode: 'div-1' });

        sinon.assert.calledWithMatch(onError, /Failed to load/);
        sinon.assert.notCalled(scripts[script]);
      });

      it(`reports a missing ${name} container to onError`, function () {
        const renderer = interpretedRenderer(bid);
        stubRendererScripts();
        const onError = sinon.stub();
        renderer.config = { onError };
        scriptLoads('success');

        renderer.render({ adUnitCode: 'missing' });

        sinon.assert.calledWithMatch(onError, /container not found/);
      });
    });

    it('reports an error when the loaded outstream script did not register a renderer', function () {
      const renderer = interpretedRenderer(OUTSTREAM);
      const onError = sinon.stub();
      renderer.config = { onError };
      scriptLoads('success');

      renderer.render({ adUnitCode: 'div-1' });

      sinon.assert.calledWithMatch(onError, /did not register itself/);
    });

    it('reports an error when the loaded interstitial script did not register a renderer', function () {
      const renderer = interpretedRenderer(INTERSTITIAL);
      const onError = sinon.stub();
      renderer.config = { onError };
      scriptLoads('success');

      renderer.render({ adUnitCode: 'div-1' });

      sinon.assert.calledWithMatch(onError, /did not register itself/);
    });

    it('plays outstream once the script loads, passing the VAST to the player', function () {
      const vastUrl = 'https://ads.test/vast.xml';
      const renderer = interpretedRenderer({ ...OUTSTREAM, vastXml: undefined, vastUrl });
      const { OutstreamRenderer, outstreamInit } = stubRendererScripts();
      scriptLoads('success');

      renderer.render({ adUnitCode: 'div-1', vastUrl, width: 640, height: 480 });

      sinon.assert.calledOnce(OutstreamRenderer);
      expect(OutstreamRenderer.firstCall.args[0]).to.equal(container);
      expect(OutstreamRenderer.firstCall.args[1]).to.deep.equal({ vastXml: undefined, vastUrl, width: 640, height: 480 });
      sinon.assert.calledOnce(outstreamInit);
    });

    it('reports outstream onRendered and onViewable once each, even though the player loops', function () {
      const renderer = interpretedRenderer(OUTSTREAM);
      const { OutstreamRenderer } = stubRendererScripts();
      const onRendered = sinon.stub();
      const onViewable = sinon.stub();
      renderer.config = { onRendered, onViewable };
      scriptLoads('success');

      renderer.render({ adUnitCode: 'div-1' });
      const callbacks = OutstreamRenderer.firstCall.args[2];
      callbacks.onReady();
      callbacks.onReady();
      callbacks.onStarted();
      callbacks.onStarted();

      sinon.assert.calledOnce(onRendered);
      sinon.assert.calledOnce(onViewable);
    });

    it('reports an outstream player failure to onError', function () {
      const renderer = interpretedRenderer(OUTSTREAM);
      const { OutstreamRenderer } = stubRendererScripts();
      const onError = sinon.stub();
      renderer.config = { onError };
      scriptLoads('success');

      renderer.render({ adUnitCode: 'div-1' });
      OutstreamRenderer.firstCall.args[2].onError({ kind: 'timeout' });

      sinon.assert.calledWith(onError, 'adError {"kind":"timeout"}');
    });

    it('shows the interstitial and reports onRendered once the script loads', function () {
      const renderer = interpretedRenderer(INTERSTITIAL);
      const { InterstitialRenderer, interstitialRender } = stubRendererScripts();
      const onRendered = sinon.stub();
      const onClose = sinon.stub();
      const onViewable = sinon.stub();
      renderer.config = { onRendered, onClose, onViewable };
      scriptLoads('success');

      renderer.render({ adUnitCode: 'div-1' });

      sinon.assert.calledOnce(interstitialRender);
      sinon.assert.calledOnce(onRendered);
      const callbacks = InterstitialRenderer.firstCall.args[2];
      callbacks.onClose();
      callbacks.onViewable();
      sinon.assert.calledOnce(onClose);
      sinon.assert.calledOnce(onViewable);
    });

    it('does not report onRendered when the interstitial fails while rendering', function () {
      const renderer = interpretedRenderer(INTERSTITIAL);
      const { InterstitialRenderer, interstitialRender } = stubRendererScripts();
      interstitialRender.callsFake(() => {
        InterstitialRenderer.firstCall.args[2].onError('no creative');
      });
      const onRendered = sinon.stub();
      const onError = sinon.stub();
      renderer.config = { onRendered, onError };
      scriptLoads('success');

      renderer.render({ adUnitCode: 'div-1' });

      sinon.assert.calledWith(onError, 'no creative');
      sinon.assert.notCalled(onRendered);
    });
  });

  describe('_pgid cookie', function () {
    let getCookie;
    let setCookie;

    beforeEach(function () {
      getCookie = sinon.stub(storage, 'getCookie');
      setCookie = sinon.stub(storage, 'setCookie');
    });

    afterEach(function () {
      getCookie.restore();
      setCookie.restore();
    });

    it('echoes the stored id and sends none when storage gives nothing', function () {
      getCookie.onFirstCall().returns('abc123').onSecondCall().returns(null);

      expect(sentPayload([bidRequest()]).user.id).to.equal('abc123');
      expect(sentPayload([bidRequest()]).user.id).to.be.undefined;
      sinon.assert.alwaysCalledWith(getCookie, '_pgid');
    });

    it('stores ext_pgid as a 90-day SameSite=None cookie', function () {
      const clock = sinon.useFakeTimers(Date.UTC(2026, 0, 1));

      try {
        interpretResponse({ bids: [], ext_pgid: 'def456' });
      } finally {
        clock.restore();
      }

      sinon.assert.calledOnceWithExactly(setCookie, '_pgid', 'def456', new Date(Date.UTC(2026, 3, 1)).toUTCString(), 'None');
    });

    it('leaves the cookie alone when the response carries no id', function () {
      interpretResponse({ bids: [] });

      sinon.assert.notCalled(setCookie);
    });
  });

  describe('getUserSyncs', function () {
    const responses = [
      {
        body: {
          sync_pixels: [
            { type: 'iframe', url: 'https://sync.example.test/usermatch' },
            { type: 'redirect', url: 'https://sync.example.test/pixel?partner=one' },
          ],
        },
      },
    ];

    it('uses one iframe transport for mixed syncs and keeps the SSP urls untouched', function () {
      expect(spec.getUserSyncs({ iframeEnabled: true, pixelEnabled: true }, responses)).to.deep.equal([
        { type: 'iframe', url: 'https://sync.example.test/usermatch' },
        { type: 'iframe', url: 'https://sync.example.test/pixel?partner=one' },
      ]);
    });

    it('keeps only iframe syncs when pixels are disabled', function () {
      expect(spec.getUserSyncs({ iframeEnabled: true, pixelEnabled: false }, responses)).to.deep.equal([
        { type: 'iframe', url: 'https://sync.example.test/usermatch' },
      ]);
    });

    it('keeps only image syncs when iframes are disabled', function () {
      expect(spec.getUserSyncs({ iframeEnabled: false, pixelEnabled: true }, responses)).to.deep.equal([
        { type: 'image', url: 'https://sync.example.test/pixel?partner=one' },
      ]);
    });

    it('maps explicit and missing sync types to image and skips pixels without a url', function () {
      const imageResponses = [
        {
          body: {
            sync_pixels: [
              { type: 'image', url: 'https://sync.example.test/explicit-image' },
              { url: 'https://sync.example.test/default-image' },
              { type: 'image' },
            ],
          },
        },
        { body: {} },
        null,
      ];

      expect(spec.getUserSyncs({ iframeEnabled: false, pixelEnabled: true }, imageResponses)).to.deep.equal([
        { type: 'image', url: 'https://sync.example.test/explicit-image' },
        { type: 'image', url: 'https://sync.example.test/default-image' },
      ]);
    });
  });

  describe('onBidderError', function () {
    it('does not throw', function () {
      expect(() => spec.onBidderError({ error: { status: 500, statusText: 'Internal Server Error' } })).to.not.throw();
    });
  });
});
