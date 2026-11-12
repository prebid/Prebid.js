import { expect } from 'chai';
import 'src/prebid.js';
import { spec } from 'modules/splashBidAdapter.js';
import adapterManager from 'src/adapterManager.js';
import { doRender } from 'src/adRendering.js';
import { newBidder } from 'src/adapters/bidderFactory.js';
import { getPreparedBidForAuction } from 'src/auction.js';
import { config } from 'src/config.js';
import * as events from 'src/events.js';
import * as utils from 'src/utils.js';

const SAFE_URL = 'https://cdn.splashandroll.com/runtime/prebid/safe-renderer/1.0.0/splash-safe-renderer.js';
const SIZES = { standard: [300, 600], parallax: [700, 1600], interstitial: [320, 480] };

// What core runs for the bid: the adapter's top-window renderer or Safe Renderer, a publisher one, or its default frame.
const TOP_WINDOW = 'Splash top-window renderer';
const SAFE = 'Splash Safe Renderer';
const PUBLISHER_SAFE = 'publisher Safe Renderer';
const PUBLISHER_TOP_WINDOW = 'publisher renderer';
const NOT_REQUESTED = 'not requested';

describe('Splash renderer choice through core', () => {
  let sandbox, publisherRender;
  const safeRenderer = { url: 'https://publisher.example/safe.js' };
  const backupSafeRenderer = { ...safeRenderer, backupOnly: true };
  const publisherRenderer = () => ({ render: publisherRender });
  const backupRenderer = () => ({ render: publisherRender, backupOnly: true });

  // [name, ad unit, ad unit bid, banner media type, setConfig, outcome when core supplies allowTopWindowRenderers]
  const cases = [
    ['default', {}, {}, {}, {}, TOP_WINDOW],
    ['top-window disabled', {}, {}, {}, { allowTopWindowRenderers: false }, SAFE],
    ['ad-unit Safe Renderer', { safeRenderer }, {}, {}, {}, PUBLISHER_SAFE],
    ['bid Safe Renderer', {}, { safeRenderer }, {}, {}, PUBLISHER_SAFE],
    ['bid Safe Renderer overrides ad unit', { safeRenderer }, { safeRenderer: { url: 'https://publisher.example/bid-safe.js' } }, {}, {}, PUBLISHER_SAFE],
    ['media-type Safe Renderer', {}, {}, { safeRenderer }, {}, PUBLISHER_SAFE],
    ['invalid Safe Renderer without URL', { safeRenderer: {} }, {}, {}, {}, TOP_WINDOW],
    ['Safe Renderer on another media type', { mediaTypes: { video: { safeRenderer } } }, {}, {}, {}, TOP_WINDOW],
    ['backupOnly ad-unit Safe Renderer', { safeRenderer: backupSafeRenderer }, {}, {}, {}, SAFE],
    ['backupOnly bid Safe Renderer', {}, { safeRenderer: backupSafeRenderer }, {}, {}, SAFE],
    ['backupOnly media-type Safe Renderer', {}, {}, { safeRenderer: backupSafeRenderer }, {}, SAFE],
    ['backupOnly media-type Safe Renderer with an ad-unit one', { safeRenderer }, {}, { safeRenderer: backupSafeRenderer }, {}, PUBLISHER_SAFE],
    ['backupOnly Safe Renderer with top-window disabled', { safeRenderer: backupSafeRenderer }, {}, {}, { allowTopWindowRenderers: false }, SAFE],
    ['ad-unit publisher renderer', () => ({ renderer: publisherRenderer() }), {}, {}, {}, SAFE],
    ['bid publisher renderer', {}, () => ({ renderer: publisherRenderer() }), {}, {}, SAFE],
    ['bid renderer overrides ad unit backup', () => ({ renderer: backupRenderer() }), () => ({ renderer: publisherRenderer() }), {}, {}, SAFE],
    ['media-type publisher renderer', {}, {}, () => ({ renderer: publisherRenderer() }), {}, SAFE],
    ['publisher renderer with top-window disabled', () => ({ renderer: publisherRenderer() }), {}, {}, { allowTopWindowRenderers: false }, SAFE],
    ['ad-unit backup renderer', () => ({ renderer: backupRenderer() }), {}, {}, {}, TOP_WINDOW],
    ['bid backup renderer', {}, () => ({ renderer: backupRenderer() }), {}, {}, TOP_WINDOW],
    ['media-type backup renderer', {}, {}, () => ({ renderer: backupRenderer() }), {}, TOP_WINDOW],
    ['media-type backup with ad-unit override', () => ({ renderer: publisherRenderer() }), {}, () => ({ renderer: backupRenderer() }), {}, SAFE],
    ['media-type override with ad-unit backup', () => ({ renderer: backupRenderer() }), {}, () => ({ renderer: publisherRenderer() }), {}, SAFE],
    ['Safe Renderer with backup renderer', () => ({ safeRenderer, renderer: backupRenderer() }), {}, {}, {}, PUBLISHER_SAFE],
    // The bid request carries only the bid's own renderer settings, so the adapter cannot see that core falls through
    // from a backupOnly one to the ad unit's. Core then runs the publisher's choice.
    ['backupOnly bid renderer over an ad-unit one', () => ({ renderer: publisherRenderer() }), () => ({ renderer: backupRenderer() }), {}, {}, PUBLISHER_TOP_WINDOW],
    ['backupOnly bid Safe Renderer over an ad-unit one', { safeRenderer }, { safeRenderer: backupSafeRenderer }, {}, {}, PUBLISHER_SAFE],
  ];

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    sandbox.stub(events, 'emit');
    sandbox.stub(utils, 'logWarn');
    publisherRender = sandbox.spy();
    config.resetConfig();
  });

  afterEach(() => {
    sandbox.restore();
    config.resetConfig();
  });

  function options(value) {
    return typeof value === 'function' ? value() : value;
  }

  function withoutPermission(outcome) {
    // Without a permission from core the adapter always uses its Safe Renderer, which core prefers to any renderer.
    return [TOP_WINDOW, PUBLISHER_TOP_WINDOW].includes(outcome) ? SAFE : outcome;
  }

  function run(format, adUnitOptions, bidOptions, bannerOptions, settings) {
    config.setConfig(settings);
    const [w, h] = SIZES[format];
    const adUnitSettings = options(adUnitOptions);
    const adUnit = {
      code: 'splash-policy-slot',
      adUnitId: 'splash-policy-unit',
      ...adUnitSettings,
      mediaTypes: { ...adUnitSettings.mediaTypes, banner: { sizes: [[w, h]], ...options(bannerOptions) } },
      bids: [{ bidder: 'splash', params: { publisherId: '725', placementId: '100023', displayFormat: format }, ...options(bidOptions) }],
    };
    const requests = adapterManager.makeBidRequests([adUnit], 'policy-auction', Date.now(), 1000);
    expect(requests).to.have.length(1);
    const [request] = requests;
    let built;
    const buildRequests = sandbox.stub().callsFake((bids, bidderRequest) => {
      built = spec.buildRequests(bids, bidderRequest)[0];
      return [];
    });
    const ajax = sandbox.spy();
    const bidder = newBidder({ ...spec, buildRequests });
    config.runWithBidder('splash', () => bidder.callBids(request, () => {}, () => {}, ajax, () => {}, config.callbackWithBidder('splash')));
    sinon.assert.calledOnce(buildRequests);
    sinon.assert.notCalled(ajax);
    if (!built) return { request, outcome: NOT_REQUESTED };

    ['allowTopWindowRenderers', 'safeRenderer', 'backupOnly', 'publisher.example'].forEach(text => expect(JSON.stringify(built.data)).not.to.contain(text));
    expect(built.data.imp[0].ext.general.display_format).to.equal(format);
    const [bid] = spec.interpretResponse({
      body: { seatbid: [{ bid: [{ id: 'policy-bid', impid: built.data.imp[0].id, price: 3, w, h, crid: 'policy-creative', adm: '<div>creative</div>' }] }] }
    }, built);
    const attached = [bid.renderer && 'renderer', bid.safeRenderer && 'safeRenderer'].filter(Boolean);
    expect(attached.length, 'renderers set by the adapter').to.be.below(2);
    const ownRender = sandbox.spy();
    if (bid.renderer) bid.renderer.setRender(ownRender);

    const index = {
      getAdUnit: () => adUnit,
      getBidderRequest: () => request,
      getBidRequest: () => request.bids[0],
      getMediaTypes: () => request.bids[0].mediaTypes,
    };
    const prepared = config.runWithBidder('splash', () => getPreparedBidForAuction(bid, { index }));
    const renderFn = sandbox.spy();
    doRender({ renderFn, resizeFn: () => {}, bidResponse: prepared, doc: document, isMainDocument: false });

    let outcome;
    if (ownRender.called) outcome = TOP_WINDOW;
    else if (publisherRender.called) outcome = PUBLISHER_TOP_WINDOW;
    else if (renderFn.called && renderFn.firstCall.args[0].safeRenderer) outcome = renderFn.firstCall.args[0].safeRenderer.url === SAFE_URL ? SAFE : PUBLISHER_SAFE;
    else if (renderFn.called) outcome = 'default frame';
    expect([ownRender, publisherRender, renderFn].filter(fn => fn.called), 'render paths').to.have.length(1);
    return { request, outcome, attached };
  }

  ['parallax', 'interstitial'].forEach(format => {
    cases.forEach(([name, adUnit, bid, banner, settings, expected]) => {
      it(`${format}: core renders the bid as chosen by the adapter for ${name}`, () => {
        const { request, outcome } = run(format, adUnit, bid, banner, settings);
        const supplied = typeof request.allowTopWindowRenderers === 'boolean';
        expect(outcome).to.equal(supplied ? expected : withoutPermission(expected));
      });
    });
  });

  cases.forEach(([name, adUnit, bid, banner, settings]) => {
    it(`standard: is requested and leaves rendering to core for ${name}`, () => {
      const { outcome, attached } = run('standard', adUnit, bid, banner, settings);
      expect(outcome).not.to.equal(NOT_REQUESTED);
      expect(attached).to.deep.equal([]);
    });
  });

  it('follows the bidder-scoped permission rather than another bidder or the global value', () => {
    config.setBidderConfig({ bidders: ['splash'], config: { allowTopWindowRenderers: true } });
    const enabled = run('parallax', {}, {}, {}, { allowTopWindowRenderers: false });
    config.setBidderConfig({ bidders: ['splash'], config: { allowTopWindowRenderers: false } });
    const disabled = run('interstitial', {}, {}, {}, { allowTopWindowRenderers: true });
    if (typeof enabled.request.allowTopWindowRenderers === 'boolean') {
      expect([enabled.request.allowTopWindowRenderers, disabled.request.allowTopWindowRenderers]).to.deep.equal([true, false]);
      expect(enabled.outcome).to.equal(TOP_WINDOW);
    } else {
      expect(enabled.outcome).to.equal(SAFE);
    }
    expect(disabled.outcome).to.equal(SAFE);
    [enabled, disabled].forEach(({ request }) => expect(request.bids[0]).not.to.have.property('allowTopWindowRenderers'));
    expect(config.getCurrentBidder()).to.equal(null);
  });
});
