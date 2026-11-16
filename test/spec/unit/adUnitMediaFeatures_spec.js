import { expect } from 'chai';
import pbjs, { checkAdUnitSetup, startAuction } from 'src/prebid.js';
import { config } from 'src/config.js';
import { auctionManager } from 'src/auctionManager.js';
import { resetAuctionState } from 'src/auction.js';
import adapterManager from 'src/adapterManager.js';
import { registerBidder } from 'src/adapters/bidderFactory.js';
import { nativeAdapters } from 'src/native.js';
import { server } from '../../mocks/xhr.js';

describe('Ad units without an enabled media type', function () {
  const bidder = 'mediaFeatureRegression';
  const enabled = { banner: true, native: FEATURES.NATIVE, video: FEATURES.VIDEO, audio: FEATURES.AUDIO };
  let sandbox, buildRequests, createAuction, pageErrors, networkStart;

  function recordError(event) {
    pageErrors.push(event.error?.message || event.message);
  }

  function recordRejection(event) {
    pageErrors.push(event.reason?.message || String(event.reason));
  }

  // Exercise the asynchronous continuation used by auction hooks, without
  // replacing validation, auction creation, bidder dispatch or requestBids.
  function resumeAuction(next, options) {
    setTimeout(() => next(options), 0);
  }

  beforeEach(function () {
    sandbox = sinon.createSandbox();
    pageErrors = [];
    networkStart = server.requests.length;
    window.addEventListener('error', recordError);
    window.addEventListener('unhandledrejection', recordRejection);
    config.resetConfig();
    config.setConfig({ debug: false, bidderTimeout: 100, userSync: { syncEnabled: false } });
    auctionManager.clearAllAuctions();
    resetAuctionState();
    buildRequests = sandbox.spy(() => []);
    registerBidder({
      code: bidder,
      supportedMediaTypes: Object.keys(enabled).filter(type => enabled[type]),
      isBidRequestValid: () => true,
      buildRequests,
      interpretResponse: () => []
    });
    createAuction = sandbox.spy(auctionManager, 'createAuction');
    startAuction.before(resumeAuction, 99);
  });

  afterEach(function () {
    startAuction.getHooks({ hook: resumeAuction }).remove();
    window.removeEventListener('error', recordError);
    window.removeEventListener('unhandledrejection', recordRejection);
    delete adapterManager.bidderRegistry[bidder];
    [adapterManager.videoAdapters, nativeAdapters].forEach(adapters => {
      for (let index = adapters.length - 1; index >= 0; index--) {
        if (adapters[index] === bidder) adapters.splice(index, 1);
      }
    });
    auctionManager.clearAllAuctions();
    resetAuctionState();
    config.resetConfig();
    sandbox.restore();
  });

  function unit(types, code = 'media-feature-unit') {
    const definitions = {
      banner: { sizes: [[300, 250]] },
      native: { ortb: { ver: '1.2', assets: [{ id: 1, required: 1, title: { len: 80 } }] } },
      video: { context: 'instream', playerSize: [[640, 360]], mimes: ['video/mp4'], protocols: [2, 3] },
      audio: { mimes: ['audio/mp4'], protocols: [2, 3] },
      unknown: { testOnly: true }
    };
    return { code, mediaTypes: Object.fromEntries(types.map(type => [type, definitions[type]])), bids: [{ bidder }] };
  }

  async function request(adUnits, expectedCodes, app = false) {
    const callback = sandbox.spy();
    let timer;
    try {
      const result = await Promise.race([
        pbjs.requestBids({
          adUnits,
          timeout: 100,
          bidsBackHandler: callback,
          ortb2: app ? { app: { id: 'synthetic-app', bundle: 'invalid.synthetic.app' } } : { site: { domain: 'publisher.invalid' } }
        }),
        new Promise((resolve, reject) => {
          timer = setTimeout(() => reject(new Error('requestBids did not resolve for the tested media feature set')), 1000);
        })
      ]);
      expect(callback.callCount).to.equal(1);
      expect(result.bids || {}).to.deep.equal({});
      expect(result.timedOut).not.to.equal(true);
      expect(createAuction.callCount).to.equal(expectedCodes.length ? 1 : 0);
      expect(buildRequests.callCount).to.equal(expectedCodes.length ? 1 : 0);
      if (expectedCodes.length) {
        expect(result.auctionId).to.be.a('string');
        expect(buildRequests.firstCall.args[0].map(bid => bid.adUnitCode).sort()).to.deep.equal([...expectedCodes].sort());
      } else {
        expect(result.auctionId).to.equal(undefined);
      }
      expect(pageErrors).to.deep.equal([]);
      expect(server.requests.length).to.equal(networkStart);
    } finally {
      clearTimeout(timer);
    }
  }

  ['native', 'video', 'audio'].forEach(type => {
    it(`validates ${type}-only units according to the compiled feature`, function () {
      const result = checkAdUnitSetup([unit([type])]);
      expect(result).to.have.length(enabled[type] ? 1 : 0);
      if (enabled[type]) expect(result[0]).to.have.property('bids').with.length(1);
    });

    [false, true].forEach(app => {
      it(`completes public requestBids for ${app ? 'app' : 'web'} ${type}-only units`, async function () {
        await request([unit([type])], enabled[type] ? ['media-feature-unit'] : [], app);
      });
    });

    it(`preserves Banner in a mixed Banner+${type} unit`, async function () {
      await request([unit(['banner', type])], ['media-feature-unit']);
    });
  });

  it('does not create an empty object for an unknown-only media type', function () {
    expect(checkAdUnitSetup([unit(['unknown'])])).to.deep.equal([]);
  });

  [false, true].forEach(app => {
    it(`completes ${app ? 'app' : 'web'} requests containing only unknown media`, async function () {
      await request([unit(['unknown'])], [], app);
    });
  });

  it('validates a unit with all optional media according to the compiled feature set', function () {
    const result = checkAdUnitSetup([unit(['native', 'video', 'audio'])]);
    expect(result).to.have.length(enabled.native || enabled.video || enabled.audio ? 1 : 0);
    if (result.length) expect(result[0]).to.have.property('bids').with.length(1);
  });

  [false, true].forEach(app => {
    it(`completes ${app ? 'app' : 'web'} requests containing all optional media types`, async function () {
      await request([unit(['native', 'video', 'audio'])], enabled.native || enabled.video || enabled.audio ? ['media-feature-unit'] : [], app);
    });
  });

  it('retains the Banner unit when a separate Native-only unit is disabled', async function () {
    await request([unit(['native'], 'native-unit'), unit(['banner'], 'banner-unit')], enabled.native ? ['native-unit', 'banner-unit'] : ['banner-unit']);
  });

  it('completes public requestBids with no ad units', async function () {
    await request([], []);
  });
});
