import { expect } from 'chai';
import 'src/prebid.js';
import { spec } from 'modules/splashBidAdapter.js';
import adapterManager from 'src/adapterManager.js';
import { newBidder } from 'src/adapters/bidderFactory.js';
import { getPreparedBidForAuction } from 'src/auction.js';
import { config } from 'src/config.js';
import * as events from 'src/events.js';
import * as utils from 'src/utils.js';

describe('Splash renderer policy through core', () => {
  let sandbox;
  const publisherRenderer = { render() {} };
  const backupRenderer = { ...publisherRenderer, backupOnly: true };
  const safeRenderer = { url: 'https://publisher.example/safe.js' };
  const cases = [
    ['default', {}, {}, {}, {}],
    ['top-window disabled', {}, {}, {}, { allowTopWindowRenderers: false }],
    ['ad-unit Safe Renderer', { safeRenderer }, {}, {}, {}],
    ['bid Safe Renderer', {}, { safeRenderer }, {}, {}],
    ['bid Safe Renderer overrides ad unit', { safeRenderer }, { safeRenderer: { url: 'https://publisher.example/bid-safe.js' } }, {}, {}],
    ['media-type Safe Renderer', {}, {}, { safeRenderer }, {}],
    ['invalid Safe Renderer without URL', { safeRenderer: {} }, {}, {}, {}],
    ['Safe Renderer on another media type', { mediaTypes: { video: { safeRenderer } } }, {}, {}, {}],
    ['ad-unit publisher renderer', { renderer: publisherRenderer }, {}, {}, {}],
    ['bid publisher renderer', {}, { renderer: publisherRenderer }, {}, {}],
    ['media-type publisher renderer', {}, {}, { renderer: publisherRenderer }, {}],
    ['ad-unit backup renderer', { renderer: backupRenderer }, {}, {}, {}],
    ['media-type backup renderer', {}, {}, { renderer: backupRenderer }, {}],
    ['media-type backup with ad-unit override', { renderer: publisherRenderer }, {}, { renderer: backupRenderer }, {}],
    ['media-type override with ad-unit backup', { renderer: backupRenderer }, {}, { renderer: publisherRenderer }, {}],
    ['Safe Renderer with backup renderer', { safeRenderer, renderer: backupRenderer }, {}, {}, {}],
  ];

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    sandbox.stub(events, 'emit');
    sandbox.stub(utils, 'logWarn');
    config.resetConfig();
  });

  afterEach(() => {
    sandbox.restore();
    config.resetConfig();
  });

  function run(format, adUnitOptions, bidOptions, bannerOptions, settings) {
    config.setConfig(settings);
    const adUnit = {
      code: 'splash-policy-slot',
      adUnitId: 'splash-policy-unit',
      ...adUnitOptions,
      mediaTypes: { ...adUnitOptions.mediaTypes, banner: { sizes: [[320, 480]], ...bannerOptions } },
      bids: [{ bidder: 'splash', params: { publisherId: '725', placementId: '100023', displayFormat: format }, ...bidOptions }],
    };
    const requests = adapterManager.makeBidRequests([adUnit], 'policy-auction', Date.now(), 1000);
    expect(requests).to.have.length(1);
    const request = requests[0];
    const validation = sandbox.spy(spec.isBidRequestValid);
    let ortb;
    const buildRequests = sandbox.stub().callsFake((bids, bidderRequest) => {
      ortb = spec.buildRequests(bids, bidderRequest)[0].data;
      return [];
    });
    const bidder = newBidder({ ...spec, isBidRequestValid: validation, buildRequests });
    const ajax = sandbox.spy();
    config.runWithBidder('splash', () => bidder.callBids(request, () => {}, () => {}, ajax, () => {}, config.callbackWithBidder('splash')));
    sinon.assert.calledOnce(validation);
    sinon.assert.notCalled(ajax);
    const accepted = validation.returnValues[0];
    expect(buildRequests.calledOnce).to.equal(accepted);
    if (ortb) {
      expect(JSON.stringify(ortb)).not.to.contain('allowTopWindowRenderers');
      expect(JSON.stringify(ortb)).not.to.contain('safeRenderer');
      expect(ortb.imp[0].ext.general.display_format).to.equal(format);
    }

    // Compare admission with core's actual final selection, not a duplicate policy implementation.
    if (format !== 'standard') {
      const adapterRenderer = { renderNow: true, render() {} };
      const index = {
        getAdUnit: () => adUnit,
        getBidRequest: () => request.bids[0],
        getMediaTypes: () => request.bids[0].mediaTypes,
      };
      const prepared = config.runWithBidder('splash', () => getPreparedBidForAuction({
        bidderCode: 'splash',
        adUnitCode: adUnit.code,
        requestId: request.bids[0].bidId,
        cpm: 3,
        mediaType: 'banner',
        renderer: adapterRenderer,
      }, { index }));
      expect(accepted).to.equal(prepared.renderer === adapterRenderer && !prepared.safeRenderer?.url);
    } else {
      expect(accepted).to.equal(true);
    }
    return { request, validatedBid: validation.firstCall.args[0] };
  }

  ['standard', 'parallax', 'interstitial'].forEach(format => {
    cases.forEach(([name, adUnit, bid, banner, settings]) => {
      it(`${format}: admission agrees with final core policy for ${name}`, () => {
        run(format, adUnit, bid, banner, settings);
      });
    });
  });

  it('uses the bidder-scoped core policy rather than another bidder or the global value', () => {
    config.setBidderConfig({ bidders: ['splash'], config: { allowTopWindowRenderers: true } });
    const first = run('parallax', {}, {}, {}, { allowTopWindowRenderers: false });
    expect(first.validatedBid.allowTopWindowRenderers).to.equal(true);
    expect(first.request.bids[0]).not.to.have.property('allowTopWindowRenderers');
    config.setBidderConfig({ bidders: ['splash'], config: { allowTopWindowRenderers: false } });
    const second = run('parallax', {}, {}, {}, { allowTopWindowRenderers: true });
    expect(second.validatedBid.allowTopWindowRenderers).to.equal(false);
    expect(second.request.bids[0]).not.to.have.property('allowTopWindowRenderers');
    expect(first.validatedBid.allowTopWindowRenderers).to.equal(true);
    expect(config.getCurrentBidder()).to.equal(null);
  });
});
