import { expect } from 'chai';
import { getGlobal } from 'src/prebidGlobal.js';
import 'src/prebid.js';
import 'modules/videoModule/index.js';
import { registerBidder } from 'src/adapters/bidderFactory.js';
import { config } from 'src/config.js';
import { Renderer } from 'src/Renderer.js';
import { doRender } from 'src/adRendering.js';
import { server } from 'test/mocks/xhr.js';

const BIDDER = 'rendererFlagsBidder';
const ENDPOINT = 'https://renderer-flags.example/bid';
const BIDDER_SAFE_URL = 'https://bidder.example/safe.js';
const PUB_SAFE_URL = 'https://publisher.example/safe.js';

const MEDIA_TYPES = {
  banner: { sizes: [[300, 250]] },
};

if (FEATURES.VIDEO) {
  MEDIA_TYPES.video = { context: 'outstream', playerSize: [[640, 480]] };
}

const pubRenderer = () => ({ render: sinon.stub() });
const backupRenderer = () => ({ ...pubRenderer(), backupOnly: true });
const pubSafeRenderer = () => ({ url: PUB_SAFE_URL });

/**
 * Every way a publisher can affect whether a renderer / safeRenderer set by the bidder on its bid runs.
 * `mediaType` receives the configured media type's object (e.g. adUnit.mediaTypes.banner).
 */
const CASES = [
  { name: 'nothing configured', expected: { renderer: true, safeRenderer: true } },

  { name: 'adUnit.renderer', adUnit: { renderer: pubRenderer() }, expected: { renderer: false, safeRenderer: true } },
  { name: 'adUnit.renderer, backupOnly', adUnit: { renderer: backupRenderer() }, expected: { renderer: true, safeRenderer: true } },
  { name: 'adUnit.renderer without render()', adUnit: { renderer: { url: 'https://publisher.example/r.js' } }, expected: { renderer: true, safeRenderer: true } },
  { name: 'adUnit.bids[].renderer', bid: { renderer: pubRenderer() }, expected: { renderer: false, safeRenderer: true } },
  { name: 'adUnit.bids[].renderer, backupOnly, with adUnit.renderer', adUnit: { renderer: pubRenderer() }, bid: { renderer: backupRenderer() }, expected: { renderer: false, safeRenderer: true } },
  { name: 'adUnit.bids[].renderer with adUnit.renderer, backupOnly', adUnit: { renderer: backupRenderer() }, bid: { renderer: pubRenderer() }, expected: { renderer: false, safeRenderer: true } },
  { name: 'adUnit.bids[].renderer on another bidder', otherBid: { renderer: pubRenderer() }, expected: { renderer: true, safeRenderer: true } },
  { name: 'mediaTypes[type].renderer', mediaType: { renderer: pubRenderer() }, expected: { renderer: false, safeRenderer: true } },
  { name: 'mediaTypes[type].renderer, backupOnly', mediaType: { renderer: backupRenderer() }, expected: { renderer: true, safeRenderer: true } },
  { name: 'mediaTypes[type].renderer, backupOnly, with adUnit.renderer', adUnit: { renderer: pubRenderer() }, mediaType: { renderer: backupRenderer() }, expected: { renderer: false, safeRenderer: true } },
  { name: 'mediaTypes[type].renderer with adUnit.renderer, backupOnly', adUnit: { renderer: backupRenderer() }, mediaType: { renderer: pubRenderer() }, expected: { renderer: false, safeRenderer: true } },

  { name: 'adUnit.safeRenderer', adUnit: { safeRenderer: pubSafeRenderer() }, expected: { renderer: false, safeRenderer: false } },
  { name: 'adUnit.safeRenderer without url', adUnit: { safeRenderer: {} }, expected: { renderer: true, safeRenderer: true } },
  { name: 'adUnit.bids[].safeRenderer', bid: { safeRenderer: pubSafeRenderer() }, expected: { renderer: false, safeRenderer: false } },
  { name: 'adUnit.bids[].safeRenderer on another bidder', otherBid: { safeRenderer: pubSafeRenderer() }, expected: { renderer: true, safeRenderer: true } },
  { name: 'mediaTypes[type].safeRenderer', mediaType: { safeRenderer: pubSafeRenderer() }, expected: { renderer: false, safeRenderer: false } },
  { name: 'adUnit.safeRenderer with mediaTypes[type].renderer, backupOnly', adUnit: { safeRenderer: pubSafeRenderer() }, mediaType: { renderer: backupRenderer() }, expected: { renderer: false, safeRenderer: false } },
  { name: 'adUnit.safeRenderer, backupOnly', adUnit: { safeRenderer: { ...pubSafeRenderer(), backupOnly: true } }, expected: { renderer: false, safeRenderer: true } },

  { name: 'allowTopWindowRenderers: false', config: { allowTopWindowRenderers: false }, expected: { renderer: false, safeRenderer: true } },
  { name: 'allowTopWindowRenderers: false, for this bidder', bidderConfig: { allowTopWindowRenderers: false }, expected: { renderer: false, safeRenderer: true } },
  { name: 'allowTopWindowRenderers: false, overridden for this bidder', config: { allowTopWindowRenderers: false }, bidderConfig: { allowTopWindowRenderers: true }, expected: { renderer: true, safeRenderer: true } },

  // TODO: what should the video module do for bids with either type of renderer?
  // .renderer skips it, probably by accident
  // { name: 'videoModule (adUnit.video)', only: 'video', adUnit: { video: { divId: 'player' } }, expected: { renderer: true, safeRenderer: false } },
];

describe('bidder renderer flags', () => {
  let sandbox, spec, seen, adapterSets, bidderRenderer;

  before(() => {
    spec = {
      code: BIDDER,
      supportedMediaTypes: ['banner', 'video'],
      isBidRequestValid(bid) {
        seen.push(bid);
        return true;
      },
      buildRequests(bidRequests, bidderRequest) {
        seen.push(...bidRequests, ...bidderRequest.bids);
        return [{ method: 'POST', url: ENDPOINT, data: '{}', bidRequests }];
      },
      interpretResponse(resp, { bidRequests }) {
        return bidRequests.map(br => {
          const mediaType = Object.keys(br.mediaTypes)[0];
          const bid = {
            requestId: br.bidId,
            mediaType,
            cpm: 1,
            width: 300,
            height: 250,
            ttl: 300,
            creativeId: 'c',
            netRevenue: true,
            currency: 'USD',
            ...(mediaType === 'video' ? { vastXml: '<VAST version="3.0"></VAST>' } : { ad: '<div></div>' }),
          };
          if (adapterSets === 'renderer') {
            bid.renderer = Renderer.install({ renderNow: true, adUnitCode: br.adUnitCode });
            bid.renderer.setRender(bidderRenderer);
          } else {
            bid.safeRenderer = { url: BIDDER_SAFE_URL };
          }
          return bid;
        });
      },
    };
    registerBidder(spec);
  });

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    seen = [];
    bidderRenderer = sinon.stub();
    config.resetConfig();
    config.setBidderConfig({ bidders: [BIDDER], config: {} });
    server.respondWith(ENDPOINT, [200, { 'Content-Type': 'text/plain' }, '{}']);
  });

  afterEach(() => {
    sandbox.restore();
    config.resetConfig();
  });

  function makeAdUnit(type, tc) {
    const { mediaTypes: _, ...adUnitProps } = tc.adUnit ?? {};
    return {
      code: `renderer-flags-${type}`,
      ...adUnitProps,
      mediaTypes: { [type]: { ...MEDIA_TYPES[type], ...tc.mediaType } },
      bids: [
        { bidder: BIDDER, params: {}, ...tc.bid },
        ...(tc.otherBid ? [{ bidder: 'otherBidder', params: {}, ...tc.otherBid }] : []),
      ],
    };
  }

  async function runAuction(type, tc) {
    config.setConfig({ maxRequestsPerOrigin: 100, ...tc.config });
    if (tc.bidderConfig) config.setBidderConfig({ bidders: [BIDDER], config: tc.bidderConfig });
    const adUnit = makeAdUnit(type, tc);
    const responder = setInterval(() => server.respond());
    let bids;
    try {
      ({ bids } = await getGlobal().requestBids({ adUnits: [adUnit], timeout: 1000 }));
    } finally {
      clearInterval(responder);
    }
    const bid = bids[adUnit.code]?.bids?.find(b => b.bidderCode === BIDDER);
    expect(bid, 'bid from the auction').to.exist;
    return bid;
  }

  function render(bidResponse) {
    const renderFn = sinon.stub();
    doRender({ renderFn, resizeFn: sinon.stub(), bidResponse, doc: document, isMainDocument: false });
    return renderFn;
  }

  Object.keys(MEDIA_TYPES).forEach(type => {
    describe(type, () => {
      CASES.filter(tc => tc.only == null || tc.only === type).forEach(tc => {
        describe(tc.name, () => {
          if (tc.only === 'video') {
            beforeEach(() => {
              sandbox.stub(getGlobal().videoModule, 'renderBid');
            });
          }

          it(`renders as expected (renderer ${tc.expected.renderer ? 'runs' : 'does not run'}, safeRenderer ${tc.expected.safeRenderer ? 'runs' : 'does not run'})`, async () => {
            adapterSets = 'renderer';
            render(await runAuction(type, tc));
            expect(bidderRenderer.called, 'bidder renderer ran').to.equal(tc.expected.renderer);

            adapterSets = 'safeRenderer';
            const renderFn = render(await runAuction(type, tc));
            const ranSafeRenderer = renderFn.called && renderFn.args[0][0].safeRenderer?.url === BIDDER_SAFE_URL;
            expect(ranSafeRenderer, 'bidder safeRenderer ran').to.equal(tc.expected.safeRenderer);
          });

          it('exposes the matching rendererSupport to the adapter', async () => {
            adapterSets = 'renderer';
            await runAuction(type, tc);
            expect(seen).to.not.be.empty;
            seen.forEach(bidRequest => {
              expect(bidRequest.rendererSupport).to.eql({ [type]: tc.expected });
            });
          });
        });
      });
    });
  });

  if (FEATURES.VIDEO) {
    describe('multi-format ad unit', () => {
      async function getRendererSupport(mediaTypes) {
        const adUnit = {
          code: 'renderer-flags-multiformat',
          mediaTypes: Object.fromEntries(Object.entries(MEDIA_TYPES).map(([type, mt]) => [type, { ...mt, ...mediaTypes[type] }])),
          bids: [{ bidder: BIDDER, params: {} }],
        };
        const responder = setInterval(() => server.respond());
        try {
          await getGlobal().requestBids({ adUnits: [adUnit], timeout: 1000 });
        } finally {
          clearInterval(responder);
        }
        expect(seen).to.not.be.empty;
        return seen.map(bidRequest => bidRequest.rendererSupport);
      }

      it('scopes mediaTypes[type].renderer to its media type', async () => {
        (await getRendererSupport({ banner: { renderer: pubRenderer() } })).forEach(support => {
          expect(support).to.eql({
            banner: { renderer: false, safeRenderer: true },
            video: { renderer: true, safeRenderer: true },
          });
        });
      });

      it('scopes mediaTypes[type].safeRenderer to its media type', async () => {
        (await getRendererSupport({ video: { safeRenderer: pubSafeRenderer() } })).forEach(support => {
          expect(support).to.eql({
            banner: { renderer: true, safeRenderer: true },
            video: { renderer: false, safeRenderer: false },
          });
        });
      });
    });
  }
});
