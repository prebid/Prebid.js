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
const SIZES = { parallax: [700, 1600], interstitial: [320, 480] };
const TOP_WINDOW = 'Splash top-window renderer';
const SAFE = 'Splash Safe Renderer';
const PUBLISHER_SAFE = 'publisher Safe Renderer';
const PUBLISHER_RENDERER = 'publisher renderer';
const DEFAULT_FRAME = 'default frame';

describe('Splash rendererSupport integration', () => {
  let sandbox, publisherRender;

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

  function run(format, support, publisher = {}) {
    publisherRender.resetHistory();
    const [width, height] = SIZES[format];
    const adUnit = {
      code: `splash-${format}-slot`,
      adUnitId: `splash-${format}-unit`,
      ...publisher,
      mediaTypes: { banner: { sizes: [[width, height]] } },
      bids: [{ bidder: 'splash', params: { publisherId: '725', placementId: '100023', displayFormat: format } }],
    };
    const [request] = adapterManager.makeBidRequests([adUnit], 'renderer-support-auction', Date.now(), 1000);
    if (support === undefined) {
      delete request.bids[0].rendererSupport;
    } else {
      request.bids[0].rendererSupport = { banner: support };
    }

    let built;
    const buildRequests = sandbox.stub().callsFake((bids, bidderRequest) => {
      built = spec.buildRequests(bids, bidderRequest)[0];
      return [];
    });
    const bidder = newBidder({ ...spec, buildRequests });
    bidder.callBids(request, () => {}, () => {}, sandbox.spy(), () => {}, config.callbackWithBidder('splash'));
    sinon.assert.calledOnce(buildRequests);

    expect(JSON.stringify(built.data)).not.to.contain('rendererSupport');
    const [bid] = spec.interpretResponse({
      body: {
        seatbid: [{ bid: [{ id: 'renderer-support-bid', impid: built.data.imp[0].id, price: 3, w: width, h: height, crid: 'renderer-support-creative', adm: '<div>creative</div>' }] }],
      },
    }, built);
    const attached = { renderer: !!bid.renderer, safeRenderer: !!bid.safeRenderer };
    const splashRender = sandbox.spy();
    if (bid.renderer) bid.renderer.setRender(splashRender);

    const index = {
      getAdUnit: () => adUnit,
      getBidderRequest: () => request,
      getBidRequest: () => request.bids[0],
      getMediaTypes: () => request.bids[0].mediaTypes,
    };
    const prepared = config.runWithBidder('splash', () => getPreparedBidForAuction(bid, { index }));
    const renderFn = sandbox.spy();
    doRender({ renderFn, resizeFn: () => {}, bidResponse: prepared, doc: document, isMainDocument: false });

    let rendered = DEFAULT_FRAME;
    if (splashRender.called) rendered = TOP_WINDOW;
    else if (publisherRender.called) rendered = PUBLISHER_RENDERER;
    if (renderFn.called && renderFn.firstCall.args[0].safeRenderer) {
      rendered = renderFn.firstCall.args[0].safeRenderer.url === SAFE_URL ? SAFE : PUBLISHER_SAFE;
    }
    return { attached, rendered };
  }

  ['parallax', 'interstitial'].forEach(format => {
    it(`${format}: prefers the page-level renderer when core permits both`, () => {
      expect(run(format, { renderer: true, safeRenderer: true })).to.deep.equal({
        attached: { renderer: true, safeRenderer: false },
        rendered: TOP_WINDOW,
      });
    });

    it(`${format}: uses the bidder renderer when core permits only it`, () => {
      expect(run(format, { renderer: true, safeRenderer: false })).to.deep.equal({
        attached: { renderer: true, safeRenderer: false },
        rendered: TOP_WINDOW,
      });
    });

    it(`${format}: uses Safe Renderer when core disallows the bidder renderer`, () => {
      expect(run(format, { renderer: false, safeRenderer: true })).to.deep.equal({
        attached: { renderer: false, safeRenderer: true },
        rendered: SAFE,
      });
    });

    it(`${format}: leaves rendering to the publisher when core disallows both bidder renderers`, () => {
      expect(run(format, { renderer: false, safeRenderer: false }, { renderer: { render: publisherRender } }).rendered).to.equal(PUBLISHER_RENDERER);
      expect(run(format, { renderer: false, safeRenderer: false }, { safeRenderer: { url: 'https://publisher.example/safe.js' } }).rendered).to.equal(PUBLISHER_SAFE);
    });

    it(`${format}: uses Safe Renderer with older core that does not send rendererSupport`, () => {
      expect(run(format, undefined)).to.deep.equal({
        attached: { renderer: false, safeRenderer: true },
        rendered: SAFE,
      });
    });
  });
});
