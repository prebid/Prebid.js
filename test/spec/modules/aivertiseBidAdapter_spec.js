import { expect } from 'chai';
import sinon from 'sinon';
import { spec, getDeviceType } from 'modules/aivertiseBidAdapter.js';
import { newBidder } from 'src/adapters/bidderFactory.js';
import * as utils from 'src/utils.js';
import * as ajaxLib from 'src/ajax.js';
import { server } from 'test/mocks/xhr.js';

const ENDPOINT = 'https://a.aivertise.com/hb/bid';
const SYNC_URL = 'https://a.aivertise.com/sync';

const DESKTOP_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36';
const IPHONE_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
const IPAD_UA = 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
const ANDROID_TABLET_UA = 'Mozilla/5.0 (Linux; Android 14; SM-X710) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36';

/**
 * Temporarily replace a property using Object.defineProperty, run fn(),
 * then restore — guaranteed even if fn() throws.
 */
function withProperty(obj, prop, value, fn) {
  const original = Object.getOwnPropertyDescriptor(obj, prop);
  Object.defineProperty(obj, prop, { value, configurable: true, writable: true });
  try {
    fn();
  } finally {
    if (original) {
      Object.defineProperty(obj, prop, original);
    } else {
      delete obj[prop];
    }
  }
}

/** Run fn() with the Network Information API removed, as in Safari and Firefox. */
function withoutConnectionApi(fn) {
  withProperty(navigator, 'connection', undefined, () => {
    withProperty(navigator, 'mozConnection', undefined, () => {
      withProperty(navigator, 'webkitConnection', undefined, fn);
    });
  });
}

function makeBidRequest(overrides = {}) {
  return {
    bidder: 'aivertise',
    bidId: 'bid-1',
    bidderRequestId: 'breq-1',
    auctionId: 'auc-1',
    adUnitCode: 'div-aivertise-1',
    mediaTypes: { banner: { sizes: [[300, 250], [336, 280]] } },
    sizes: [[300, 250], [336, 280]],
    params: { publisherId: 'pub-1', placementId: 'plc-1' },
    ortb2Imp: { ext: { gpid: '/1234/home#div-aivertise-1' } },
    ...overrides,
  };
}

function makeBidderRequest(bids, overrides = {}) {
  return {
    bidderCode: 'aivertise',
    bidderRequestId: 'breq-1',
    auctionId: 'auc-1',
    timeout: 1000,
    bids,
    refererInfo: {
      page: 'https://test.aivertise.example/page.html',
      ref: 'https://referrer.example/',
      domain: 'test.aivertise.example',
    },
    // Prebid's consent, schain and userId modules write these 2.5-style ext locations.
    ortb2: {
      site: {
        page: 'https://test.aivertise.example/page.html',
        ref: 'https://referrer.example/',
        domain: 'test.aivertise.example',
        keywords: 'foo,bar',
      },
      device: { ua: DESKTOP_UA, w: 1920, h: 1080, language: 'en' },
      regs: { ext: { gdpr: 1, us_privacy: '1YNN' } },
      user: {
        ext: {
          consent: 'CONSENT_STRING',
          eids: [{ source: 'pubcid.org', uids: [{ id: 'pubcid-1', atype: 1 }] }],
        },
      },
      source: {
        ext: {
          schain: { ver: '1.0', complete: 1, nodes: [{ asi: 'exchange1.com', sid: '1234', hp: 1 }] },
        },
      },
    },
    ...overrides,
  };
}

function buildRequest(bids = [makeBidRequest()], bidderRequestOverrides = {}) {
  const bidderRequest = makeBidderRequest(bids, bidderRequestOverrides);
  return spec.buildRequests(bids, bidderRequest);
}

function interpret(response, request) {
  return spec.interpretResponse(response, request).bids;
}

function makeServerResponse(request, bidOverrides = {}) {
  return {
    body: {
      id: request.data.id,
      cur: 'EUR',
      seatbid: [{
        seat: 'aivertise',
        bid: [{
          id: 'aivertise-bid-1',
          impid: 'bid-1',
          price: 1.25,
          adm: '<div>ad</div>',
          crid: 'creative-1',
          w: 300,
          h: 250,
          adomain: ['aivertise.com'],
          cat: ['IAB1'],
          mtype: 1,
          exp: 300,
          ...bidOverrides,
        }],
      }],
    },
  };
}

describe('Aivertise bid adapter', () => {
  describe('spec constants', () => {
    it('has bidder code "aivertise"', () => {
      expect(spec.code).to.equal('aivertise');
    });

    it('declares the IAB TCF GVL id 1654', () => {
      expect(spec.gvlid).to.equal(1654);
    });

    it('supports only the banner media type', () => {
      expect(spec.supportedMediaTypes).to.deep.equal(['banner']);
    });

    it('callBids exists and is a function', () => {
      expect(newBidder(spec).callBids).to.be.a('function');
    });
  });

  describe('isBidRequestValid()', () => {
    it('returns true when publisherId and banner sizes are present', () => {
      expect(spec.isBidRequestValid(makeBidRequest())).to.equal(true);
    });

    it('returns false when params is missing', () => {
      expect(spec.isBidRequestValid(makeBidRequest({ params: undefined }))).to.equal(false);
    });

    it('returns false when publisherId is missing', () => {
      expect(spec.isBidRequestValid(makeBidRequest({ params: { placementId: 'x' } }))).to.equal(false);
    });

    it('returns false when safeFrame is true', () => {
      expect(spec.isBidRequestValid(makeBidRequest({ params: { publisherId: 'p', safeFrame: true } }))).to.equal(false);
    });

    it('returns false when banner sizes are missing', () => {
      expect(spec.isBidRequestValid(makeBidRequest({ mediaTypes: { banner: { sizes: [] } } }))).to.equal(false);
      expect(spec.isBidRequestValid(makeBidRequest({ mediaTypes: { video: {} } }))).to.equal(false);
    });
  });

  describe('buildRequests()', () => {
    it('POSTs an OpenRTB payload to the Aivertise endpoint', () => {
      const request = buildRequest();
      expect(request.method).to.equal('POST');
      expect(request.url).to.equal(ENDPOINT);
      expect(request.options).to.deep.equal({ contentType: 'text/plain', withCredentials: true });
      expect(request.data.id).to.be.a('string');
      expect(request.data.tmax).to.equal(1000);
    });

    describe('imp', () => {
      it('creates one banner imp per bid request', () => {
        const bids = [makeBidRequest(), makeBidRequest({ bidId: 'bid-2', adUnitCode: 'div-aivertise-2' })];
        const { imp } = buildRequest(bids).data;
        expect(imp.map((i) => i.id)).to.deep.equal(['bid-1', 'bid-2']);
        expect(imp[0].banner.format).to.deep.equal([{ w: 300, h: 250 }, { w: 336, h: 280 }]);
      });

      it('sets tagid and bidder params from params', () => {
        const [imp] = buildRequest([makeBidRequest({
          params: { publisherId: 'pub-1', placementId: 'plc-1', siteDomain: 'override.example' },
        })]).data.imp;
        expect(imp.tagid).to.equal('plc-1');
        expect(imp.ext.bidder).to.deep.equal({
          publisherId: 'pub-1',
          placementId: 'plc-1',
          siteDomain: 'override.example',
        });
      });

      it('omits tagid and optional params when not supplied', () => {
        const [imp] = buildRequest([makeBidRequest({ params: { publisherId: 'pub-1' } })]).data.imp;
        expect(imp).not.to.have.property('tagid');
        expect(imp.ext.bidder).to.deep.equal({ publisherId: 'pub-1' });
      });

      it('carries the ad unit code and gpid', () => {
        const [imp] = buildRequest().data.imp;
        expect(imp.ext.adunitcode).to.equal('div-aivertise-1');
        expect(imp.ext.gpid).to.equal('/1234/home#div-aivertise-1');
      });
    });

    describe('OpenRTB 2.6 field locations', () => {
      it('moves GDPR, US privacy and consent out of ext', () => {
        const { regs, user } = buildRequest().data;
        expect(regs.gdpr).to.equal(1);
        expect(regs.us_privacy).to.equal('1YNN');
        expect(user.consent).to.equal('CONSENT_STRING');
        expect(regs.ext?.gdpr).to.be.undefined;
        expect(user.ext?.consent).to.be.undefined;
      });

      it('moves eids to user.eids', () => {
        const { user } = buildRequest().data;
        expect(user.eids).to.deep.equal([{ source: 'pubcid.org', uids: [{ id: 'pubcid-1', atype: 1 }] }]);
        expect(user.ext?.eids).to.be.undefined;
      });

      it('moves schain to source.schain', () => {
        const { source } = buildRequest().data;
        expect(source.schain.nodes[0].asi).to.equal('exchange1.com');
        expect(source.ext?.schain).to.be.undefined;
      });

      it('passes site first-party data through', () => {
        const { site } = buildRequest().data;
        expect(site.page).to.equal('https://test.aivertise.example/page.html');
        expect(site.domain).to.equal('test.aivertise.example');
        expect(site.keywords).to.equal('foo,bar');
      });
    });

    describe('site enrichment', () => {
      let metas;

      beforeEach(() => {
        metas = [];
      });

      afterEach(() => {
        metas.forEach((meta) => meta.remove());
      });

      function addMeta(property, content) {
        const meta = document.createElement('meta');
        meta.setAttribute('property', property);
        meta.setAttribute('content', content);
        document.head.appendChild(meta);
        metas.push(meta);
      }

      function siteWithout(field) {
        const bidderRequest = makeBidderRequest([makeBidRequest()]);
        delete bidderRequest.ortb2.site[field];
        return spec.buildRequests(bidderRequest.bids, bidderRequest).data.site;
      }

      it('falls back to article:tag meta for keywords', () => {
        addMeta('article:tag', 'sports');
        addMeta('article:tag', 'football');
        expect(siteWithout('keywords').keywords).to.equal('sports,football');
      });

      it('does not override existing keywords', () => {
        addMeta('article:tag', 'sports');
        expect(buildRequest().data.site.keywords).to.equal('foo,bar');
      });

      it('reads the section from article:section meta', () => {
        addMeta('article:section', 'Technology');
        expect(buildRequest().data.site.ext.data.section).to.equal('Technology');
      });

      it('keeps a publisher-supplied section', () => {
        addMeta('article:section', 'Technology');
        const bidderRequest = makeBidderRequest([makeBidRequest()]);
        bidderRequest.ortb2.site.ext = { data: { section: 'Sports' } };
        const { site } = spec.buildRequests(bidderRequest.bids, bidderRequest).data;
        expect(site.ext.data.section).to.equal('Sports');
      });
    });

    describe('device enrichment', () => {
      it('sets connectiontype from the Network Information API', () => {
        withProperty(navigator, 'connection', { effectiveType: '4g' }, () => {
          expect(buildRequest().data.device.connectiontype).to.equal(6);
        });
      });

      it('omits connectiontype when the Network Information API is missing (Safari, Firefox)', () => {
        withoutConnectionApi(() => {
          const { device } = buildRequest().data;
          expect(device).not.to.have.property('connectiontype');
          expect(device.ua).to.equal(DESKTOP_UA);
        });
      });

      it('keeps a connectiontype already present in first-party data', () => {
        const bidderRequest = makeBidderRequest([makeBidRequest()]);
        bidderRequest.ortb2.device.connectiontype = 2;
        expect(spec.buildRequests(bidderRequest.bids, bidderRequest).data.device.connectiontype).to.equal(2);
      });

      it('sets devicetype from the user agent', () => {
        expect(buildRequest().data.device.devicetype).to.equal(2);
      });

      it('keeps a devicetype already present in first-party data', () => {
        const bidderRequest = makeBidderRequest([makeBidRequest()]);
        bidderRequest.ortb2.device.devicetype = 5;
        expect(spec.buildRequests(bidderRequest.bids, bidderRequest).data.device.devicetype).to.equal(5);
      });
    });

    describe('test mode', () => {
      it('sets test=1 when refererInfo.page contains aivertiseTest=1', () => {
        const request = buildRequest(undefined, {
          refererInfo: { page: 'https://test.aivertise.example/?aivertiseTest=1' },
        });
        expect(request.data.test).to.equal(1);
      });

      it('sets test=1 when window.location.href contains aivertiseTest=1', () => {
        // window.location can't be redefined in real browsers; change the URL via the History API instead.
        const originalUrl = window.location.href;
        const testUrl = new URL(originalUrl);
        testUrl.searchParams.set('aivertiseTest', '1');
        window.history.replaceState(window.history.state, '', testUrl.toString());
        try {
          expect(buildRequest().data.test).to.equal(1);
        } finally {
          window.history.replaceState(window.history.state, '', originalUrl);
        }
      });

      it('does not set test mode by default', () => {
        expect(buildRequest().data.test).to.equal(0);
      });
    });
  });

  describe('getDeviceType()', () => {
    it('detects desktop', () => {
      expect(getDeviceType(DESKTOP_UA)).to.equal(2);
    });

    it('detects phones', () => {
      expect(getDeviceType(IPHONE_UA)).to.equal(4);
      expect(getDeviceType(DESKTOP_UA, { mobile: 1 })).to.equal(4);
    });

    it('detects tablets', () => {
      expect(getDeviceType(IPAD_UA)).to.equal(5);
      expect(getDeviceType(ANDROID_TABLET_UA)).to.equal(5);
    });
  });

  describe('interpretResponse()', () => {
    it('converts an OpenRTB bid into a Prebid bid', () => {
      const request = buildRequest();
      const [bid] = interpret(makeServerResponse(request), request);
      expect(bid).to.include({
        requestId: 'bid-1',
        cpm: 1.25,
        currency: 'EUR',
        width: 300,
        height: 250,
        creativeId: 'creative-1',
        ttl: 300,
        netRevenue: true,
        mediaType: 'banner',
        ad: '<div>ad</div>',
      });
      expect(bid.meta.advertiserDomains).to.deep.equal(['aivertise.com']);
      expect(bid.meta.primaryCatId).to.equal('IAB1');
    });

    it('prepends a win pixel for nurl', () => {
      const request = buildRequest();
      const nurl = 'https://a.aivertise.com/track?type=bid_won&bidId=bid-1';
      const [bid] = interpret(makeServerResponse(request, { nurl }), request);
      expect(bid.ad).to.include(nurl);
      expect(bid.ad).to.include('<div>ad</div>');
    });

    it('defaults the currency to EUR when cur is missing', () => {
      const request = buildRequest();
      const response = makeServerResponse(request);
      delete response.body.cur;
      expect(interpret(response, request)[0].currency).to.equal('EUR');
    });

    it('adds test targeting for test requests', () => {
      const request = buildRequest(undefined, {
        refererInfo: { page: 'https://test.aivertise.example/?aivertiseTest=1' },
      });
      const [bid] = interpret(makeServerResponse(request), request);
      expect(bid.adserverTargeting).to.deep.equal({ aivertiseBidderTest: '1' });
    });

    it('does not add test targeting for regular requests', () => {
      const request = buildRequest();
      const [bid] = interpret(makeServerResponse(request), request);
      expect(bid.adserverTargeting).to.be.undefined;
    });

    it('ignores bids for unknown imps', () => {
      const request = buildRequest();
      expect(interpret(makeServerResponse(request, { impid: 'nope' }), request)).to.deep.equal([]);
    });

    it('returns no bids for an empty (204) response', () => {
      const request = buildRequest();
      expect(spec.interpretResponse({ body: undefined }, request)).to.deep.equal([]);
      expect(spec.interpretResponse({ body: {} }, request)).to.deep.equal([]);
    });

    describe('debug logging', () => {
      let logInfoStub;
      let logWarnStub;

      beforeEach(() => {
        logInfoStub = sinon.stub(utils, 'logInfo');
        logWarnStub = sinon.stub(utils, 'logWarn');
      });

      afterEach(() => {
        logInfoStub.restore();
        logWarnStub.restore();
      });

      const withHeaders = (response, headers) => ({
        ...response,
        headers: { get: (name) => headers[name] ?? null },
      });

      it('warns with the request ID when there is no bid for lack of consent', () => {
        const request = buildRequest();
        spec.interpretResponse(withHeaders({ body: undefined }, {
          'X-Aivertise-Request-Id': 'req-1',
          'X-Aivertise-No-Bid-Reason': 'no_consent:no_vendor_consent',
        }), request);
        expect(logWarnStub.calledOnce).to.equal(true);
        expect(logWarnStub.firstCall.args[0]).to.include('req-1').and.include('no_consent:no_vendor_consent');
      });

      it('logs the request ID and reason for other no-bids', () => {
        const request = buildRequest();
        spec.interpretResponse(withHeaders({ body: undefined }, {
          'X-Aivertise-Request-Id': 'req-2',
          'X-Aivertise-No-Bid-Reason': 'no_bid',
        }), request);
        expect(logWarnStub.called).to.equal(false);
        expect(logInfoStub.calledWithMatch(/req-2.*no_bid/)).to.equal(true);
      });

      it('logs the request ID of a bid response', () => {
        const request = buildRequest();
        const bids = interpret(withHeaders(makeServerResponse(request), { 'X-Aivertise-Request-Id': 'req-3' }), request);
        expect(bids).to.have.length(1);
        expect(logInfoStub.calledWithMatch(/req-3/)).to.equal(true);
      });

      it('copes with responses without readable headers', () => {
        const request = buildRequest();
        const headers = { get: () => { throw new Error('not exposed'); } };
        expect(spec.interpretResponse({ body: undefined, headers }, request)).to.deep.equal([]);
      });
    });
  });

  describe('onSetTargeting()', () => {
    const targetingUrl = (bidId) =>
      `https://t.aivertise.com/track?type=bid_targeted&bidId=${bidId}&demandId=1&sig=abc`;
    let clock;
    let sendBeaconStub;

    beforeEach(() => {
      clock = sinon.useFakeTimers();
      sendBeaconStub = sinon.stub(ajaxLib, 'sendBeacon').returns(true);
    });

    afterEach(() => {
      clock.restore();
      sendBeaconStub.restore();
    });

    const targetedBid = (bidId) => {
      const request = buildRequest();
      const [bid] = interpret(makeServerResponse(request, { ext: { aivertise: { targetingurl: targetingUrl(bidId) } } }), request);
      return bid;
    };

    it('keeps the targeting URL from bid.ext.aivertise on the bid', () => {
      expect(targetedBid('bid-1').aivertiseTargetingUrl).to.equal(targetingUrl('bid-1'));
    });

    it('sends the targeting events of one call in a single batch', () => {
      spec.onSetTargeting(targetedBid('bid-1'));
      spec.onSetTargeting(targetedBid('bid-2'));
      expect(sendBeaconStub.called).to.equal(false);

      clock.tick(0);
      expect(sendBeaconStub.calledOnce).to.equal(true);
      const [url, body] = sendBeaconStub.firstCall.args;
      expect(url).to.equal('https://t.aivertise.com/track');
      expect(JSON.parse(body).events).to.deep.equal([
        { type: 'bid_targeted', bidId: 'bid-1', demandId: '1', sig: 'abc' },
        { type: 'bid_targeted', bidId: 'bid-2', demandId: '1', sig: 'abc' },
      ]);
    });

    it('falls back to a POST when the beacon is refused', () => {
      sendBeaconStub.returns(false);
      spec.onSetTargeting(targetedBid('bid-1'));
      clock.tick(0);
      const requests = server.requests.filter((r) => r.url === 'https://t.aivertise.com/track');
      expect(requests).to.have.length(1);
      expect(requests[0].method).to.equal('POST');
      expect(JSON.parse(requests[0].requestBody).events).to.have.length(1);
    });

    it('does nothing for bids without a targeting URL', () => {
      const request = buildRequest();
      const [bid] = interpret(makeServerResponse(request), request);
      spec.onSetTargeting(bid);
      clock.tick(0);
      expect(sendBeaconStub.called).to.equal(false);
      expect(server.requests.filter((r) => r.url.includes('/track'))).to.have.length(0);
    });
  });

  describe('getUserSyncs()', () => {
    it('returns no syncs when neither iframe nor image syncs are enabled', () => {
      expect(spec.getUserSyncs({ iframeEnabled: false, pixelEnabled: false }, [], undefined, undefined)).to.eql([]);
      expect(spec.getUserSyncs({}, [], undefined, undefined)).to.eql([]);
    });

    it('prefers the iframe sync when both are enabled', () => {
      expect(spec.getUserSyncs({ iframeEnabled: true, pixelEnabled: true }, [], undefined, undefined))
        .to.eql([{ type: 'iframe', url: SYNC_URL }]);
    });

    it('falls back to an image sync when only images are enabled', () => {
      expect(spec.getUserSyncs({ iframeEnabled: false, pixelEnabled: true }, [], undefined, undefined))
        .to.eql([{ type: 'image', url: `${SYNC_URL}?type=image` }]);
    });

    it('passes consent on the image sync', () => {
      const syncs = spec.getUserSyncs({ pixelEnabled: true }, [], { gdprApplies: true, consentString: 'CSTR' }, '1YNN');
      expect(syncs).to.have.length(1);
      expect(syncs[0].type).to.equal('image');
      expect(syncs[0].url).to.equal(`${SYNC_URL}?gdpr=1&gdpr_consent=CSTR&us_privacy=1YNN&type=image`);
    });

    it('returns a bare iframe sync when no consent is supplied', () => {
      expect(spec.getUserSyncs({ iframeEnabled: true }, [], undefined, undefined))
        .to.eql([{ type: 'iframe', url: SYNC_URL }]);
    });

    it('appends gdpr=1 and the consent string when gdprApplies is true', () => {
      const syncs = spec.getUserSyncs({ iframeEnabled: true }, [], { gdprApplies: true, consentString: 'CSTR' }, undefined);
      expect(syncs[0].url).to.include('gdpr=1');
      expect(syncs[0].url).to.include('gdpr_consent=CSTR');
    });

    it('appends gdpr=0 when gdprApplies is false', () => {
      const syncs = spec.getUserSyncs({ iframeEnabled: true }, [], { gdprApplies: false, consentString: 'X' }, undefined);
      expect(syncs[0].url).to.include('gdpr=0');
    });

    it('encodes special characters in the consent string', () => {
      const syncs = spec.getUserSyncs({ iframeEnabled: true }, [], { gdprApplies: true, consentString: 'a b&c' }, undefined);
      expect(syncs[0].url).to.include('gdpr_consent=a%20b%26c');
    });

    it('appends us_privacy', () => {
      const syncs = spec.getUserSyncs({ iframeEnabled: true }, [], undefined, '1YNN');
      expect(syncs[0].url).to.include('us_privacy=1YNN');
      expect(syncs[0].url).not.to.include('gdpr=');
    });
  });
});
