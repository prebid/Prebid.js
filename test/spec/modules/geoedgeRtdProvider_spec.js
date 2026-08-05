import * as utils from '../../../src/utils.js';
import { loadExternalScriptStub } from 'test/mocks/adloaderStub.js';
import * as geoedgeRtdModule from '../../../modules/geoedgeRtdProvider.js';
import { server } from '../../../test/mocks/xhr.js';
import * as events from '../../../src/events.js';
import { EVENTS } from '../../../src/constants.js';
import { getGlobal } from '../../../src/prebidGlobal.js';

const {
  geoedgeSubmodule,
  getClientUrl,
  getInPageUrl,
  htmlPlaceholder,
  setWrapper,
  getMacros,
  WRAPPER_URL,
  loadClientInIframe,
  isVastBid,
  markClientAsLoaded,
  resetOutstreamGateStateForTesting,
  OUTSTREAM_GATE_TIMEOUT
} = geoedgeRtdModule;

const key = '123123123';
// The client publishes its gate on the client frame's window under this name.
const OUTSTREAM_API = 'grumiOutstreamApi';

function makeConfig(gpt) {
  return {
    name: 'geoedge',
    params: {
      wap: false,
      key,
      bidders: {
        bidderA: true,
        bidderB: false
      },
      gpt
    }
  };
}

function mockBid(bidderCode) {
  return {
    ad: '<creative/>',
    adId: '1234',
    cpm: '1.00',
    width: 300,
    height: 250,
    bidderCode,
    requestId: utils.getUniqueIdentifierStr(),
    creativeId: 'id',
    currency: 'USD',
    netRevenue: true,
    ttl: 360
  };
}

function mockMessageFromClient(key) {
  return {
    key,
    impression: true,
    adId: 1234,
    type: 'impression'
  };
}

const mockWrapper = `<wrapper>${htmlPlaceholder}</wrapper>`;

describe('Geoedge RTD module', function () {
  describe('submodule', function () {
    describe('name', function () {
      it('should be geoedge', function () {
        expect(geoedgeSubmodule.name).to.equal('geoedge');
      });
    });
    describe('init', function () {
      before(function () {
        sinon.spy(geoedgeRtdModule, 'loadClientInIframe');
      });
      after(function () {
        geoedgeRtdModule.loadClientInIframe.restore();
      });
      it('should return false when missing params or key', function () {
        const missingParams = geoedgeSubmodule.init({});
        const missingKey = geoedgeSubmodule.init({ params: {} });
        expect(missingParams || missingKey).to.equal(false);
      });
      it('should return true when params are ok', function () {
        expect(geoedgeSubmodule.init(makeConfig(false))).to.equal(true);
      });
      it('should fetch the wrapper', function () {
        geoedgeSubmodule.init(makeConfig(false));
        const request = server.requests[0];
        const isWrapperRequest = request && request.url && request.url && request.url === WRAPPER_URL;
        expect(isWrapperRequest).to.equal(true);
      });
      it('should call loadClientInIframe', function () {
        expect(loadClientInIframe.called);
      });
      it('should emit billable events with applicable winning bids', function (done) {
        let counter = 0;
        events.on(EVENTS.BILLABLE_EVENT, function (event) {
          if (event.vendor === geoedgeSubmodule.name && event.type === 'impression') {
            counter += 1;
          }
          expect(counter).to.equal(1);
          done();
        });
        window.postMessage(mockMessageFromClient(key), '*');
      });
      it('should load the in page code when gpt params is true', function () {
        geoedgeSubmodule.init(makeConfig(true));
        const isInPageUrl = arg => arg === getInPageUrl(key);
        expect(loadExternalScriptStub.calledWith(sinon.match(isInPageUrl))).to.equal(true);
      });
      it('should set the window.grumi config object when gpt params is true', function () {
        const hasGrumiObj = typeof window.grumi === 'object';
        expect(hasGrumiObj && window.grumi.key === key && window.grumi.fromPrebid).to.equal(true);
      });
    });
    describe('loadClientInIframe', function () {
      let iframe;
      loadClientInIframe(key);
      const loadExternalScriptCall = loadExternalScriptStub.getCall(0);
      it('should create an invisible iframe and insert it to the DOM', function () {
        iframe = document.getElementById('grumiFrame');
        expect(iframe && iframe.style.display === 'none');
      });
      it('should assign params object to the iframe\'s window', function () {
        const grumi = iframe.contentWindow.grumi;
        expect(grumi.key).to.equal(key);
      });
      it('should load the client into the iframe', function () {
        const isClientUrl = arg => arg === getClientUrl(key);
        expect(loadExternalScriptCall.calledWithMatch(isClientUrl)).to.equal(true);
      });
      it('should carry the publisher outstream opt-in into the frame', function () {
        loadClientInIframe(key, true);
        // insertElement prepends into <head>, so the newest frame is the FIRST match, not the last
        const grumi = document.querySelector('#grumiFrame').contentWindow.grumi;
        expect(grumi.outstream).to.equal(true);
      });
      it('should hand the frame a reference to this prebid instance when outstream is on', function () {
        loadClientInIframe(key, true);
        const grumi = document.querySelector('#grumiFrame').contentWindow.grumi;
        expect(grumi.pbjs).to.equal(getGlobal());
      });
      it('should not put the prebid instance in the frame without the outstream opt-in', function () {
        loadClientInIframe(key);
        const grumi = document.querySelector('#grumiFrame').contentWindow.grumi;
        expect(grumi.pbjs).to.equal(undefined);
      });
    });
    describe('setWrapper', function () {
      it('should set the wrapper', function () {
        setWrapper(mockWrapper);
        expect(geoedgeRtdModule.wrapper).to.equal(mockWrapper);
      });
    });
    describe('getMacros', function () {
      it('return a dictionary of macros replaced with values from bid object', function () {
        const bid = mockBid('testBidder');
        const dict = getMacros(bid, key);
        const hasCpm = dict['%_hbCpm!'] === bid.cpm;
        const hasCurrency = dict['%_hbCurrency!'] === bid.currency;
        expect(hasCpm && hasCurrency);
      });
      it('return a dictionary of macros replaced with values from overrides object if provided', function () {
        const bid = mockBid('testBidder');
        window.grumi.overrides = { site: 'test-overrides' };
        const overrides = window.grumi.overrides;
        const dict = getMacros(bid, key);
        const siteOveridden = dict['%%SITE%%'] === overrides.site;
        expect(siteOveridden);
      });
    });
    describe('onBidResponseEvent', function () {
      const bidFromA = mockBid('bidderA');
      it('should wrap bid html when bidder is configured', function () {
        geoedgeSubmodule.onBidResponseEvent(bidFromA, makeConfig(false));
        expect(bidFromA.ad.indexOf('<wrapper>')).to.equal(0);
      });
      it('should not wrap bid html when bidder is not configured', function () {
        const bidFromB = mockBid('bidderB');
        geoedgeSubmodule.onBidResponseEvent(bidFromB, makeConfig(false));
        expect(bidFromB.ad.indexOf('<wrapper>')).to.equal(-1);
      });
      it('should only muatate the bid ad porperty', function () {
        const copy = Object.assign({}, bidFromA);
        delete copy.ad;
        const equalsOriginal = Object.keys(copy).every(key => copy[key] === bidFromA[key]);
        expect(equalsOriginal).to.equal(true);
      });
    });

    // -----------------------------------------------------------------------
    // Outstream video gate
    // -----------------------------------------------------------------------

    describe('isVastBid', function () {
      it('should accept a bid labeled as video', function () {
        expect(isVastBid({ mediaType: 'video' })).to.equal(true);
      });
      it('should accept a bid carrying vastXml', function () {
        expect(isVastBid({ vastXml: '<VAST version="4.0"></VAST>' })).to.equal(true);
      });
      it('should accept a mislabeled bid whose ad starts with a VAST tag, case-insensitively', function () {
        expect(isVastBid({ ad: '<vast version="3.0"></vast>' })).to.equal(true);
        expect(isVastBid({ ad: '<?xml version="1.0"?><VAST></VAST>' })).to.equal(true);
      });
      it('should reject a vastUrl-only bid, since a correctly labeled video bid always arrives with vastXml backfilled', function () {
        expect(isVastBid({ vastUrl: 'https://example.com/vast.xml' })).to.equal(false);
      });
      it('should not scan past the head of bid.ad for a VAST marker', function () {
        const buried = `${'x'.repeat(400)}<VAST></VAST>`;
        expect(isVastBid({ ad: buried })).to.equal(false);
      });
      it('should reject a display bid', function () {
        expect(isVastBid(mockBid('bidderA'))).to.equal(false);
      });
      it('should reject a bid with no ad and no video fields', function () {
        expect(isVastBid({})).to.equal(false);
      });
    });

    describe('outstream gate', function () {
      let frame;
      let originalRender;

      function makeOutstreamConfig(outstream) {
        return {
          name: 'geoedge',
          params: { key, outstream, bidders: { bidderA: true } }
        };
      }

      // isRendererRequired() needs url (or renderNow); the gate additionally needs render itself.
      function mockRenderer() {
        return { url: 'https://example.com/outstream.js', render: sinon.spy() };
      }

      function mockVideoBid(extra) {
        return Object.assign(mockBid('bidderA'), {
          mediaType: 'video',
          vastXml: '<VAST version="4.0"></VAST>',
          renderer: mockRenderer()
        }, extra);
      }

      function gate(bid, outstream = true) {
        geoedgeSubmodule.onBidResponseEvent(bid, makeOutstreamConfig(outstream));
        return bid;
      }

      function isWrapped(bid, original) {
        return bid.renderer.render !== original;
      }

      function publishGate(shouldRender) {
        frame.contentWindow[OUTSTREAM_API] = { shouldRender: sinon.stub().returns(shouldRender) };
      }

      beforeEach(function () {
        document.querySelectorAll('#grumiFrame').forEach(el => el.remove());
        // establishes clientFrame; the adloader stub fires the load callback synchronously
        loadClientInIframe(key, true);
        frame = document.querySelector('#grumiFrame');
        delete frame.contentWindow[OUTSTREAM_API];
        resetOutstreamGateStateForTesting();
      });

      describe('deciding what to wrap', function () {
        it('should wrap the renderer of an outstream video bid', function () {
          const bid = mockVideoBid();
          originalRender = bid.renderer.render;
          gate(bid);
          expect(isWrapped(bid, originalRender)).to.equal(true);
        });
        it('should not wrap when the publisher did not opt in to outstream', function () {
          const bid = mockVideoBid();
          originalRender = bid.renderer.render;
          gate(bid, false);
          expect(isWrapped(bid, originalRender)).to.equal(false);
        });
        it('should not wrap a bid from a bidder params.bidders excludes', function () {
          const bid = mockVideoBid({ bidderCode: 'bidderB' });
          originalRender = bid.renderer.render;
          gate(bid);
          expect(isWrapped(bid, originalRender)).to.equal(false);
        });
        it('should not wrap a bid carrying a safeRenderer, since prebid never calls bid.renderer for those', function () {
          const bid = mockVideoBid({ safeRenderer: true });
          originalRender = bid.renderer.render;
          gate(bid);
          expect(isWrapped(bid, originalRender)).to.equal(false);
        });
        it('should not wrap when the renderer is not required by prebid', function () {
          const bid = mockVideoBid({ renderer: { render: sinon.spy() } }); // no url / renderNow
          originalRender = bid.renderer.render;
          gate(bid);
          expect(isWrapped(bid, originalRender)).to.equal(false);
        });
        it('should not wrap when the renderer has no render method', function () {
          const bid = mockVideoBid({ renderer: { url: 'https://example.com/outstream.js' } });
          gate(bid);
          expect(bid.renderer.render).to.equal(undefined);
        });
        it('should wrap a renderer only once across repeated bidResponse events', function () {
          const bid = mockVideoBid();
          gate(bid);
          const wrappedOnce = bid.renderer.render;
          gate(bid);
          expect(bid.renderer.render).to.equal(wrappedOnce);
        });
        it('should fall through to html wrapping for a display bid when outstream is on', function () {
          const bid = mockBid('bidderA');
          gate(bid);
          expect(bid.ad.indexOf('<wrapper>')).to.equal(0);
        });
        it('should not wrap the html of a gated video bid', function () {
          const bid = mockVideoBid({ ad: '<VAST></VAST>' });
          gate(bid);
          expect(bid.ad.indexOf('<wrapper>')).to.equal(-1);
        });
      });

      describe('enforcing at render time', function () {
        it('should render when the client allows the bid', function () {
          const bid = mockVideoBid();
          originalRender = bid.renderer.render;
          gate(bid);
          markClientAsLoaded();
          publishGate(true);
          bid.renderer.render();
          expect(originalRender.calledOnce).to.equal(true);
        });
        it('should not render when the client blocks the bid', function () {
          const bid = mockVideoBid();
          originalRender = bid.renderer.render;
          gate(bid);
          markClientAsLoaded();
          publishGate(false);
          bid.renderer.render();
          expect(originalRender.called).to.equal(false);
        });
        it('should render unprotected when the client published no gate', function () {
          const bid = mockVideoBid();
          originalRender = bid.renderer.render;
          gate(bid);
          markClientAsLoaded();
          bid.renderer.render();
          expect(originalRender.calledOnce).to.equal(true);
        });
        it('should preserve the renderer receiver and arguments', function () {
          const bid = mockVideoBid();
          originalRender = bid.renderer.render;
          gate(bid);
          markClientAsLoaded();
          publishGate(true);
          bid.renderer.render('a', 'b');
          expect(originalRender.calledOn(bid.renderer)).to.equal(true);
          expect(originalRender.calledWithExactly('a', 'b')).to.equal(true);
        });
      });

      describe('parking a render until the client loads', function () {
        it('should not render while the client has neither loaded nor timed out', function () {
          const bid = mockVideoBid();
          originalRender = bid.renderer.render;
          gate(bid);
          bid.renderer.render();
          expect(originalRender.called).to.equal(false);
        });
        it('should release a parked render once the client loads and allows it', function () {
          const bid = mockVideoBid();
          originalRender = bid.renderer.render;
          gate(bid);
          bid.renderer.render();
          publishGate(true);
          markClientAsLoaded();
          expect(originalRender.calledOnce).to.equal(true);
        });
        it('should drop a parked render when the loaded client blocks it', function () {
          const bid = mockVideoBid();
          originalRender = bid.renderer.render;
          gate(bid);
          bid.renderer.render();
          publishGate(false);
          markClientAsLoaded();
          expect(originalRender.called).to.equal(false);
        });
        it('should release each parked render exactly once', function () {
          const first = mockVideoBid();
          const second = mockVideoBid();
          const firstRender = first.renderer.render;
          const secondRender = second.renderer.render;
          gate(first);
          gate(second);
          first.renderer.render();
          second.renderer.render();
          publishGate(true);
          markClientAsLoaded();
          markClientAsLoaded();
          expect(firstRender.calledOnce).to.equal(true);
          expect(secondRender.calledOnce).to.equal(true);
        });
      });

      // Adapters may install one Renderer for every outstream bid they make: ozone caches a single
      // module-level instance (modules/ozoneBidAdapter.js, newRenderer). The renderer is wrapped once,
      // so the wrapper has to judge whichever bid prebid passes to render() rather than any bid it saw
      // at wrap time.
      describe('a renderer shared across bids', function () {
        let sharedRenderer;
        let originalSharedRender;
        let first;
        let second;

        // per-adId verdicts, so one shared renderer's bids can be judged differently
        function publishGatePerBid(verdictsByAdId) {
          frame.contentWindow[OUTSTREAM_API] = {
            shouldRender: sinon.spy((bid) => verdictsByAdId[bid && bid.adId] === true)
          };
        }

        beforeEach(function () {
          sharedRenderer = mockRenderer();
          originalSharedRender = sharedRenderer.render;
          first = mockVideoBid({ adId: 'first', renderer: sharedRenderer });
          second = mockVideoBid({ adId: 'second', renderer: sharedRenderer });
          gate(first);
          gate(second);
        });

        it('should wrap the shared renderer exactly once', function () {
          const wrappedOnce = sharedRenderer.render;
          expect(wrappedOnce).to.not.equal(originalSharedRender);
          gate(mockVideoBid({ adId: 'third', renderer: sharedRenderer }));
          expect(sharedRenderer.render).to.equal(wrappedOnce);
        });

        it('should ask the client about the bid being rendered, not the first bid on the renderer', function () {
          markClientAsLoaded();
          publishGatePerBid({ first: true, second: true });
          sharedRenderer.render(second);
          expect(frame.contentWindow[OUTSTREAM_API].shouldRender.calledWith(second)).to.equal(true);
          expect(frame.contentWindow[OUTSTREAM_API].shouldRender.calledWith(first)).to.equal(false);
        });

        it('should render a later bid the client allows even when the first bid is blocked', function () {
          markClientAsLoaded();
          publishGatePerBid({ first: false, second: true });
          sharedRenderer.render(second);
          expect(originalSharedRender.calledOnce).to.equal(true);
        });

        it('should block a later bid the client blocks even when the first bid is allowed', function () {
          markClientAsLoaded();
          publishGatePerBid({ first: true, second: false });
          sharedRenderer.render(second);
          expect(originalSharedRender.called).to.equal(false);
        });

        it('should judge a parked later bid on its own verdict', function () {
          sharedRenderer.render(second); // parked: the client has neither loaded nor timed out
          publishGatePerBid({ first: false, second: true });
          markClientAsLoaded();
          expect(originalSharedRender.calledOnce).to.equal(true);
          expect(originalSharedRender.calledWithExactly(second)).to.equal(true);
        });

        it('should drop a parked later bid the client blocks, whatever the first bid got', function () {
          sharedRenderer.render(second);
          publishGatePerBid({ first: true, second: false });
          markClientAsLoaded();
          expect(originalSharedRender.called).to.equal(false);
        });

        it('should not html-wrap a later bid whose renderer was already gated', function () {
          expect(second.ad.indexOf('<wrapper>')).to.equal(-1);
        });
      });

      describe('failing open on the client load deadline', function () {
        let clock;

        beforeEach(function () {
          clock = sinon.useFakeTimers();
          // re-arm the deadline against the fake clock
          loadClientInIframe(key, true);
          frame = document.querySelector('#grumiFrame');
          delete frame.contentWindow[OUTSTREAM_API];
          resetOutstreamGateStateForTesting();
        });
        afterEach(function () {
          clock.restore();
        });

        it('should release a parked render when the deadline passes', function () {
          const bid = mockVideoBid();
          originalRender = bid.renderer.render;
          gate(bid);
          bid.renderer.render();
          expect(originalRender.called).to.equal(false);
          clock.tick(OUTSTREAM_GATE_TIMEOUT);
          expect(originalRender.calledOnce).to.equal(true);
        });
        it('should release a parked render even when a gate would have blocked it', function () {
          const bid = mockVideoBid();
          originalRender = bid.renderer.render;
          gate(bid);
          bid.renderer.render();
          publishGate(false);
          clock.tick(OUTSTREAM_GATE_TIMEOUT);
          expect(originalRender.calledOnce).to.equal(true);
        });
        it('should render immediately once the deadline has already passed', function () {
          const bid = mockVideoBid();
          originalRender = bid.renderer.render;
          gate(bid);
          clock.tick(OUTSTREAM_GATE_TIMEOUT);
          bid.renderer.render();
          expect(originalRender.calledOnce).to.equal(true);
        });
        it('should not release a parked render before the deadline', function () {
          const bid = mockVideoBid();
          originalRender = bid.renderer.render;
          gate(bid);
          bid.renderer.render();
          clock.tick(OUTSTREAM_GATE_TIMEOUT - 1);
          expect(originalRender.called).to.equal(false);
        });
      });
    });
  });
});
