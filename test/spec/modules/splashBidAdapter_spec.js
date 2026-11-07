import { expect } from 'chai';
import 'src/prebid.js';
import 'modules/priceFloors.js';
import 'modules/currency.js';
import { spec } from 'modules/splashBidAdapter.js';
import { config } from 'src/config.js';
import { BANNER } from 'src/mediaTypes.js';
import { Renderer } from 'src/Renderer.js';
import * as winDimensions from 'src/utils/winDimensions.js';
import * as utils from 'src/utils.js';

const PROD_URL = 'https://ssp.splashandroll.com/auction/splash';
const STG_URL = 'https://ssp.emisja.stg.froc.mc2.rocks/auction/splash';
const PAGE = 'https://one.tcpip.pl/public/prebid-official.html';
const PLACEMENTS = { standard: '100021', parallax: '100022', interstitial: '100023' };
const SIZES = { standard: [300, 600], parallax: [700, 1600], interstitial: [320, 480] };
const FORMATS = Object.keys(PLACEMENTS);
const OWNER = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const FRAME_STYLE_ID = 'splash-prebid-interstitial-frame-style';
const CONTROLS = '<div data-froc-interstitial-controls-ready="1"><button class="froc-display-close" type="button">Close</button></div>';
const SSP_CREATIVE = '<!DOCTYPE html><html><head></head><body><div class="froc-standard-display"><script>window.sspReady = true;</script></div></body></html>';
const SSP_WRAPPED = '<iframe srcdoc="' + SSP_CREATIVE.replace(/"/g, '&quot;') + '"></iframe>';

function makeBid({ format = 'standard', params = {}, ...overrides } = {}) {
  const [w, h] = SIZES[format];
  return {
    bidder: 'splash',
    bidId: `${format}-bid`,
    adUnitCode: `${format}-slot`,
    params: {
      publisherId: '725',
      placementId: PLACEMENTS[format],
      ...(format === 'standard' ? {} : { displayFormat: format }),
      ...params,
    },
    mediaTypes: { banner: { sizes: [[w, h]] } },
    allowTopWindowRenderers: true,
    ortb2Imp: {},
    ...overrides,
  };
}

function makeBidderRequest(overrides = {}) {
  return {
    bidderCode: 'splash',
    bidderRequestId: 'bidder-request-1',
    auctionId: 'auction-1',
    timeout: 1500,
    refererInfo: { page: PAGE, domain: 'one.tcpip.pl' },
    ortb2: { site: { page: PAGE, domain: 'one.tcpip.pl' } },
    ...overrides,
  };
}

function buildRequest(bid = makeBid(), bidderRequest = makeBidderRequest()) {
  const requests = spec.buildRequests([bid], bidderRequest);
  expect(requests).to.have.length(1);
  return requests[0];
}

function makeServerBid(format = 'standard', overrides = {}) {
  const [w, h] = SIZES[format];
  return {
    id: `${format}-server-bid`,
    impid: `${format}-bid`,
    price: 3.5,
    w,
    h,
    crid: `${format}-creative`,
    adm: `<div>${format} creative</div>`,
    ...overrides,
  };
}

function respond(request, bids, body = {}) {
  return spec.interpretResponse({ body: { id: 'response-1', cur: 'PLN', seatbid: [{ seat: 'splash', bid: bids }], ...body } }, request);
}

function bidFor(format, serverOverrides = {}, bidOverrides = {}) {
  const request = buildRequest(makeBid({ format, ...bidOverrides }));
  return respond(request, [makeServerBid(format, serverOverrides)])[0];
}

function parse(html) {
  return new DOMParser().parseFromString(html, 'text/html');
}

function wrapped(html) {
  return '<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;padding:0;height:100%}</style></head><body>' + html + '</body></html>';
}

function tick() {
  return new Promise(resolve => setTimeout(resolve, 0));
}

describe('splashBidAdapter', () => {
  let sandbox, pixel;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    pixel = sandbox.stub(utils, 'triggerPixel');
    sandbox.stub(HTMLImageElement.prototype, 'src').set(function (url) { this.setAttribute('data-spec-src', url); });
    config.resetConfig();
  });

  afterEach(() => {
    const pixelCalls = pixel.callCount;
    sandbox.restore();
    config.resetConfig();
    expect(pixelCalls, 'utils.triggerPixel calls').to.equal(0);
  });

  it('registers a banner-only bidder with GVL ID 1490 and no user sync or lifecycle handlers', () => {
    expect(spec.code).to.equal('splash');
    expect(spec.gvlid).to.equal(1490);
    expect(spec.supportedMediaTypes).to.deep.equal([BANNER]);
    ['getUserSyncs', 'onBidWon', 'onBidBillable', 'onTimeout', 'onSetTargeting', 'onBidderError', 'onAdRenderSucceeded', 'onBidViewable']
      .forEach(handler => expect(spec, handler).not.to.have.property(handler));
  });

  describe('isBidRequestValid', () => {
    let warn;

    beforeEach(() => {
      warn = sandbox.stub(utils, 'logWarn');
    });

    FORMATS.forEach(format => {
      it(`accepts a ${format} ad unit`, () => {
        expect(spec.isBidRequestValid(makeBid({ format }))).to.equal(true);
        sinon.assert.notCalled(warn);
      });
    });

    it('treats a null displayFormat as standard', () => {
      expect(spec.isBidRequestValid(makeBid({ params: { displayFormat: null } }))).to.equal(true);
    });

    [undefined, null, {}, { params: null }].forEach((bid, index) => {
      it(`rejects a bid without params (${index})`, () => {
        expect(spec.isBidRequestValid(bid)).to.equal(false);
      });
    });

    ['publisherId', 'placementId'].forEach(field => {
      [undefined, null, '', 725, true, {}, ['725']].forEach(value => {
        it(`rejects ${field} = ${JSON.stringify(value)}`, () => {
          expect(spec.isBidRequestValid(makeBid({ params: { [field]: value } }))).to.equal(false);
          sinon.assert.calledWith(warn, 'splash: publisherId and placementId must be non-empty strings');
        });
      });
    });

    ['', 'Parallax', 'banner', 'splitboard', 1, true, {}].forEach(displayFormat => {
      it(`rejects displayFormat = ${JSON.stringify(displayFormat)}`, () => {
        expect(spec.isBidRequestValid(makeBid({ params: { displayFormat } }))).to.equal(false);
        sinon.assert.calledWith(warn, 'splash: unsupported displayFormat', displayFormat);
      });
    });

    it('rejects Parallax and Interstitial when top-window renderers are disabled, keeping Standard', () => {
      expect(FORMATS.map(format => spec.isBidRequestValid(makeBid({ format, allowTopWindowRenderers: false })))).to.deep.equal([true, false, false]);
      sinon.assert.calledWith(warn, "splash: parallax requires the adapter's top-window renderer, which this configuration disables");
      sinon.assert.calledWith(warn, "splash: interstitial requires the adapter's top-window renderer, which this configuration disables");
      expect(FORMATS.every(format => spec.isBidRequestValid(makeBid({ format })))).to.equal(true);
    });

    it('uses only the renderer policy supplied by core, not global configuration', () => {
      config.setConfig({ allowTopWindowRenderers: false });
      expect(spec.isBidRequestValid(makeBid({ format: 'parallax' }))).to.equal(true);
      config.setConfig({ allowTopWindowRenderers: true });
      expect(spec.isBidRequestValid(makeBid({ format: 'interstitial', allowTopWindowRenderers: false }))).to.equal(false);
    });

    [undefined, null, 'true', 1].forEach(policy => {
      it(`does not assume custom rendering is allowed without a valid core policy (${String(policy)})`, () => {
        expect(FORMATS.map(format => spec.isBidRequestValid(makeBid({ format, allowTopWindowRenderers: policy })))).to.deep.equal([true, false, false]);
      });
    });

    it('rejects Parallax and Interstitial when the banner uses a Safe Renderer, keeping Standard', () => {
      const withSafeRenderer = (format, safeRenderer) => makeBid({ format, mediaTypes: { banner: { sizes: [SIZES[format]], safeRenderer } } });
      const safeRenderer = { url: 'https://cdn.example/safe-renderer.js' };
      expect(FORMATS.map(format => spec.isBidRequestValid(withSafeRenderer(format, safeRenderer)))).to.deep.equal([true, false, false]);
      // Core uses a Safe Renderer only when it has a URL.
      expect(spec.isBidRequestValid(withSafeRenderer('parallax', {}))).to.equal(true);
      // A Safe Renderer on the ad unit's bid definition takes precedence as well.
      expect(FORMATS.map(format => spec.isBidRequestValid(makeBid({ format, safeRenderer })))).to.deep.equal([true, false, false]);
    });

    it('rejects Parallax and Interstitial when a publisher renderer would replace the adapter renderer', () => {
      const renderer = { render() {} };
      const withMediaTypeRenderer = (format, value) => makeBid({ format, mediaTypes: { banner: { sizes: [SIZES[format]], renderer: value } } });
      expect(FORMATS.map(format => spec.isBidRequestValid(withMediaTypeRenderer(format, renderer)))).to.deep.equal([true, false, false]);
      expect(FORMATS.map(format => spec.isBidRequestValid(makeBid({ format, renderer })))).to.deep.equal([true, false, false]);
      // A backup-only renderer or one without a render function leaves the adapter renderer in place.
      expect(spec.isBidRequestValid(withMediaTypeRenderer('parallax', { ...renderer, backupOnly: true }))).to.equal(true);
      expect(spec.isBidRequestValid(makeBid({ format: 'interstitial', renderer: { ...renderer, backupOnly: true } }))).to.equal(true);
      expect(spec.isBidRequestValid(makeBid({ format: 'parallax', renderer: { url: 'https://cdn.example/renderer.js' } }))).to.equal(true);
      expect(spec.isBidRequestValid(makeBid({ format: 'parallax', renderer: { render: 'invalid-but-truthy' } }))).to.equal(false);
    });
  });

  describe('buildRequests', () => {
    it('sends one POST with the ORTB object to the production endpoint', () => {
      const request = buildRequest();
      expect(request.method).to.equal('POST');
      expect(request.url).to.equal(PROD_URL);
      expect(request).not.to.have.property('options');
      expect(request.data).to.be.an('object');
      const { data } = request;
      expect(Object.keys(data).sort()).to.deep.equal(['cur', 'id', 'imp', 'site', 'test', 'tmax']);
      expect(data.cur).to.deep.equal(['PLN']);
      expect(data.tmax).to.equal(1500);
      expect(data.site).to.deep.equal({ page: PAGE, domain: 'one.tcpip.pl', publisher: { id: '725' }, id: '100021' });
      const [imp] = data.imp;
      expect(imp).to.deep.equal({
        id: 'standard-bid',
        tagid: '100021',
        secure: 1,
        banner: { topframe: imp.banner.topframe, format: [{ w: 300, h: 600 }], w: 300, h: 600 },
        ext: { general: { placement_type: 'display', display_format: 'standard' } },
      });
    });

    it('returns no requests without bids', () => {
      expect(spec.buildRequests([], makeBidderRequest())).to.deep.equal([]);
    });

    it('accepts the Splash staging endpoint exactly', () => {
      expect(buildRequest(makeBid({ params: { endpoint: STG_URL } })).url).to.equal(STG_URL);
      expect(buildRequest(makeBid({ params: { endpoint: PROD_URL } })).url).to.equal(PROD_URL);
    });

    [undefined, null].forEach(endpoint => {
      it(`uses production without a warning for endpoint = ${endpoint}`, () => {
        const warn = sandbox.stub(utils, 'logWarn');
        expect(buildRequest(makeBid({ params: { endpoint } })).url).to.equal(PROD_URL);
        sinon.assert.notCalled(warn);
      });
    });

    [
      '',
      'not-a-url',
      '/auction/splash',
      '//ssp.splashandroll.com/auction/splash',
      'http://ssp.splashandroll.com/auction/splash',
      'https://SSP.SPLASHANDROLL.COM/auction/splash',
      'https://ssp.splashandroll.com/auction/splash/',
      'https://ssp.splashandroll.com/auction/splash?debug=1',
      'https://ssp.splashandroll.com/auction/splash#fragment',
      'https://ssp.splashandroll.com/auction/unsupported',
      'https://ssp.splashandroll.com:8443/auction/splash',
      'https://ssp.splashandroll.com.evil.example/auction/splash',
      'https://ssp.emisja.stg.froc.mc2.rocks/auction/splash/',
      'https://ssp.emisja.stg.froc.mc2.rocks/auction/unsupported',
      42,
      {},
    ].forEach(endpoint => {
      it(`falls back to production with a warning for endpoint = ${JSON.stringify(endpoint)}`, () => {
        const warn = sandbox.stub(utils, 'logWarn');
        expect(buildRequest(makeBid({ params: { endpoint } })).url).to.equal(PROD_URL);
        sinon.assert.calledWith(warn, `splash: unsupported endpoint, using ${PROD_URL}`, endpoint);
      });
    });

    it('groups bids into one request per resolved endpoint and publisher', () => {
      sandbox.stub(utils, 'logWarn');
      const requests = spec.buildRequests([
        makeBid({ bidId: 'a' }),
        makeBid({ format: 'interstitial', bidId: 'b' }),
        makeBid({ bidId: 'c', params: { endpoint: STG_URL } }),
        makeBid({ bidId: 'd', params: { publisherId: '726' } }),
        makeBid({ format: 'parallax', bidId: 'e', params: { endpoint: 'https://unsupported.example/auction' } }),
      ], makeBidderRequest());
      expect(requests.map(({ url, data }) => [url, data.site.publisher.id, data.imp.map(imp => imp.id)])).to.deep.equal([
        [PROD_URL, '725', ['a', 'b', 'e']],
        [STG_URL, '725', ['c']],
        [PROD_URL, '726', ['d']],
      ]);
      const [grouped] = requests;
      expect(grouped.data.imp.map(imp => [imp.tagid, imp.ext.general.display_format])).to.deep.equal([
        ['100021', 'standard'], ['100023', 'interstitial'], ['100022', 'parallax'],
      ]);
      expect(grouped.data.site.id).to.equal('100021');
      expect(new Set(requests.map(request => request.data.id)).size).to.equal(3);
    });

    it('sets banner w/h from the first format unless ortb2Imp sets them', () => {
      const multiSize = buildRequest(makeBid({ mediaTypes: { banner: { sizes: [[300, 600], [300, 250]] } } })).data.imp[0].banner;
      expect(multiSize.format).to.deep.equal([{ w: 300, h: 600 }, { w: 300, h: 250 }]);
      expect(multiSize).to.include({ w: 300, h: 600 });
      const explicit = buildRequest(makeBid({ ortb2Imp: { banner: { w: 320, h: 50 } } })).data.imp[0].banner;
      expect(explicit).to.include({ w: 320, h: 50 });
      expect(explicit.format).to.deep.equal([{ w: 300, h: 600 }]);
      const sizeless = buildRequest(makeBid({ mediaTypes: { banner: {} } })).data.imp[0].banner;
      expect(sizeless).not.to.have.any.keys('w', 'h', 'format');
    });

    it('forwards mediaTypes.banner.pos and never takes a position from params', () => {
      [1, 0].forEach(pos => {
        const bid = makeBid({ mediaTypes: { banner: { sizes: [[300, 600]], pos } }, params: { pos: 7 } });
        expect(buildRequest(bid).data.imp[0].banner.pos).to.equal(pos);
      });
      expect(buildRequest(makeBid({ params: { pos: 7 } })).data.imp[0].banner).not.to.have.property('pos');
    });

    it('marks interstitial imps with instl=1 unless ortb2Imp sets instl', () => {
      expect(buildRequest(makeBid({ format: 'interstitial' })).data.imp[0].instl).to.equal(1);
      expect(buildRequest(makeBid({ format: 'interstitial', ortb2Imp: { instl: 0 } })).data.imp[0].instl).to.equal(0);
      ['standard', 'parallax'].forEach(format => {
        expect(buildRequest(makeBid({ format })).data.imp[0]).not.to.have.property('instl');
      });
    });

    FORMATS.forEach(format => {
      it(`signals the ${format} format in imp.ext.general next to ortb2Imp extensions`, () => {
        const bid = makeBid({ format, ortb2Imp: { ext: { gpid: '/725/slot', data: { pbadslot: '/725/slot' } } } });
        expect(buildRequest(bid).data.imp[0].ext).to.deep.equal({
          gpid: '/725/slot',
          data: { pbadslot: '/725/slot' },
          general: { placement_type: 'display', display_format: format },
        });
      });
    });

    it('requests PLN even when the ad server currency is EUR', () => {
      config.setConfig({ currency: { adServerCurrency: 'EUR', rates: { EUR: { PLN: 4.3 }, PLN: { EUR: 0.23 } } } });
      try {
        const getFloor = sandbox.stub().returns({ floor: 3, currency: 'PLN' });
        const { data } = buildRequest(makeBid({ getFloor }));
        expect(data.cur).to.deep.equal(['PLN']);
        sinon.assert.calledWith(getFloor, { currency: 'PLN', mediaType: 'banner', size: '*' });
      } finally {
        config.setConfig({ currency: {} });
      }
    });

    it('overrides site.publisher.id and keeps an FPD site.id', () => {
      const ortb2 = { site: { id: 'fpd-site', page: PAGE, publisher: { id: 'fpd-publisher', name: 'TCPIP' } } };
      const { site } = buildRequest(makeBid(), makeBidderRequest({ ortb2 })).data;
      expect(site).to.deep.equal({ id: 'fpd-site', page: PAGE, publisher: { id: '725', name: 'TCPIP' } });
      expect(buildRequest(makeBid(), makeBidderRequest({ ortb2: {} })).data.site).to.deep.equal({ publisher: { id: '725' }, id: '100021' });
    });

    it('identifies the publisher on app or dooh instead of site when FPD declares that client', () => {
      sandbox.stub(utils, 'logWarn');
      const app = buildRequest(makeBid(), makeBidderRequest({ ortb2: { app: { bundle: 'pl.tcpip.app', publisher: { name: 'TCPIP' } } } })).data;
      expect(app).not.to.have.property('site');
      expect(app.app).to.deep.equal({ bundle: 'pl.tcpip.app', publisher: { name: 'TCPIP', id: '725' }, id: '100021' });
      const both = buildRequest(makeBid(), makeBidderRequest({ ortb2: { site: { page: PAGE }, app: { id: 'fpd-app', bundle: 'pl.tcpip.app' } } })).data;
      expect(both).not.to.have.property('site');
      expect(both.app).to.deep.equal({ id: 'fpd-app', bundle: 'pl.tcpip.app', publisher: { id: '725' } });
      const dooh = buildRequest(makeBid(), makeBidderRequest({ ortb2: { dooh: { venuetype: ['transit'] } } })).data;
      expect(dooh).not.to.have.any.keys('site', 'app');
      expect(dooh.dooh).to.deep.equal({ venuetype: ['transit'], publisher: { id: '725' }, id: '100021' });
    });

    [
      ['site when app is empty', {
        app: {},
        site: { id: 'fpd-site', page: PAGE, publisher: { id: 'fpd-publisher', name: 'TCPIP' }, ext: { data: { section: 'news' } } },
      }, 'site'],
      ['site when dooh is empty', {
        dooh: {},
        site: { page: PAGE },
      }, 'site'],
      ['dooh when app and site are empty', {
        app: {},
        dooh: { venuetype: ['transit'], publisher: { id: 'fpd-publisher', name: 'TCPIP' } },
        site: {},
      }, 'dooh'],
      ['app when dooh and site are empty', {
        dooh: {},
        app: { bundle: 'pl.tcpip.app' },
        site: {},
      }, 'app'],
      ['dooh ahead of populated app and site', {
        app: { id: 'fpd-app', bundle: 'pl.tcpip.app' },
        site: { id: 'fpd-site', page: PAGE },
        dooh: { id: 'fpd-dooh', venuetype: ['transit'] },
      }, 'dooh'],
      ['app ahead of site when dooh is empty', {
        site: { page: PAGE },
        app: { id: 'fpd-app', bundle: 'pl.tcpip.app' },
        dooh: {},
      }, 'app'],
      ['site as a fallback when every client section is empty', { app: {}, dooh: {}, site: {} }, 'site'],
    ].forEach(([title, ortb2, client]) => {
      it(`identifies the publisher only on ${title} without mutating FPD`, () => {
        sandbox.stub(utils, 'logWarn');
        const bidderRequest = makeBidderRequest({ ortb2 });
        const before = utils.deepClone(bidderRequest);
        const original = before.ortb2[client];
        const { data } = buildRequest(makeBid(), bidderRequest);
        expect(['dooh', 'app', 'site'].filter(section => data[section] && Object.keys(data[section]).length > 0)).to.deep.equal([client]);
        expect(data[client]).to.deep.equal({
          ...original,
          id: original.id || '100021',
          publisher: { ...original.publisher, id: '725' },
        });
        expect(bidderRequest).to.deep.equal(before);
      });
    });

    it('forwards filtered first-party, privacy and supply chain data unchanged', () => {
      const ortb2 = {
        site: {
          id: 'fpd-site',
          domain: 'one.tcpip.pl',
          page: PAGE,
          ref: 'https://referrer.example/',
          cat: ['IAB12'],
          pagecat: ['IAB12-1'],
          keywords: 'news,sport',
          publisher: { name: 'TCPIP', domain: 'tcpip.pl' },
          ext: { data: { section: 'news' } },
        },
        device: { ua: 'agent', language: 'pl', w: 390, h: 844, sua: { mobile: 1 } },
        user: { ext: { consent: 'tcf-consent', eids: [{ source: 'pubcid.org', uids: [{ id: 'pubcid-1', atype: 1 }] }] } },
        regs: { coppa: 1, gpp: 'gpp-string', gpp_sid: [7], ext: { gdpr: 1, us_privacy: '1YNN', dsa: { dsarequired: 2, pubrender: 0, datatopub: 1 } } },
        source: { tid: 'auction-tid', ext: { schain: { ver: '1.0', complete: 1, nodes: [{ asi: 'tcpip.pl', sid: '725', hp: 1 }] } } },
        ext: { custom: 'request-extension' },
      };
      const bid = makeBid({ ortb2Imp: { ext: { tid: 'imp-tid' } } });
      const bidderRequest = makeBidderRequest({ ortb2 });
      const before = utils.deepClone([bid, bidderRequest]);
      const { data } = buildRequest(bid, bidderRequest);
      expect(data.site).to.deep.equal({ ...ortb2.site, publisher: { ...ortb2.site.publisher, id: '725' } });
      ['device', 'user', 'regs', 'source', 'ext'].forEach(key => expect(data[key], key).to.deep.equal(ortb2[key]));
      expect(data.imp[0].ext.tid).to.equal('imp-tid');
      expect([bid, bidderRequest]).to.deep.equal(before);
    });

    it('does not invent transaction IDs or copy raw request fields', () => {
      const bid = makeBid({ transactionId: 'raw-transaction-id', userIdAsEids: [{ source: 'raw.example', uids: [{ id: 'raw-eid' }] }] });
      const { data } = buildRequest(bid, makeBidderRequest({ gdprConsent: { gdprApplies: true, consentString: 'raw-consent' } }));
      expect(data).not.to.have.any.keys('source', 'user', 'regs');
      expect(data.imp[0].ext).to.deep.equal({ general: { placement_type: 'display', display_format: 'standard' } });
      expect(JSON.stringify(data)).not.to.match(/raw-|auction-1|bidder-request-1/);
    });

    it('ignores removed legacy params', () => {
      const legacyFormats = ['displayMode', 'display_format', 'placementType', 'creativeType', 'format', 'template', 'layout', 'effect'];
      const removed = {
        siteId: 'removed-site',
        keywords: 'removed-keywords',
        cat: ['removed-cat'],
        pagecat: ['removed-pagecat'],
        pos: 7,
        parallaxSlotHeight: 900,
        parallaxHeight: 900,
        displayHeight: 900,
        parallaxSlotWidth: 400,
        displayWidth: 400,
        parallax: true,
        isParallax: true,
        ...Object.fromEntries(legacyFormats.map(key => [key, 'parallax'])),
      };
      const bid = makeBid({ params: removed });
      expect(spec.isBidRequestValid(bid)).to.equal(true);
      const { data } = buildRequest(bid);
      expect(Object.keys(data).sort()).to.deep.equal(['cur', 'id', 'imp', 'site', 'test', 'tmax']);
      expect(data.site).to.deep.equal({ page: PAGE, domain: 'one.tcpip.pl', publisher: { id: '725' }, id: '100021' });
      const [imp] = data.imp;
      expect(Object.keys(imp).sort()).to.deep.equal(['banner', 'ext', 'id', 'secure', 'tagid']);
      expect(imp.banner).to.deep.equal({ topframe: imp.banner.topframe, format: [{ w: 300, h: 600 }], w: 300, h: 600 });
      expect(imp.ext).to.deep.equal({ general: { placement_type: 'display', display_format: 'standard' } });
      expect(JSON.stringify(data)).not.to.contain('removed-');
    });
  });

  describe('price floors', () => {
    it('uses the Price Floors module floor in PLN ahead of params.bidfloor', () => {
      const getFloor = sandbox.stub().returns({ floor: 4.2, currency: 'PLN' });
      const imp = buildRequest(makeBid({ getFloor, params: { bidfloor: 3 } })).data.imp[0];
      expect(imp).to.include({ bidfloor: 4.2, bidfloorcur: 'PLN' });
      sinon.assert.calledWith(getFloor, { currency: 'PLN', mediaType: 'banner', size: '*' });
      getFloor.getCalls().forEach(call => expect(call.args[0]).to.include({ currency: 'PLN', mediaType: 'banner' }));
    });

    it('falls back to params.bidfloor in PLN when the Price Floors module sets no floor', () => {
      sandbox.stub(utils, 'logWarn');
      [
        undefined,
        () => ({}),
        () => ({ floor: 0, currency: 'PLN' }),
        () => { throw new Error('floor unavailable'); },
      ].forEach(getFloor => {
        const imp = buildRequest(makeBid({ getFloor, params: { bidfloor: 3 } })).data.imp[0];
        expect(imp).to.include({ bidfloor: 3, bidfloorcur: 'PLN' });
      });
    });

    [0, -1, NaN, Infinity, '3', null].forEach(bidfloor => {
      it(`ignores params.bidfloor = ${String(bidfloor)}`, () => {
        const imp = buildRequest(makeBid({ params: { bidfloor } })).data.imp[0];
        expect(imp).not.to.have.any.keys('bidfloor', 'bidfloorcur');
      });
    });
  });

  describe('interpretResponse', () => {
    it('maps an ORTB bid to a banner bid response', () => {
      const request = buildRequest();
      const dsa = { behalf: 'Advertiser', paid: 'Advertiser', adrender: 1 };
      const [bid] = respond(request, [makeServerBid('standard', {
        dealid: 'deal-1', exp: 120, mtype: 4, adomain: ['advertiser.example'], cat: ['IAB1-1', 'IAB1-2'], attr: [1], ext: { dsa },
      })]);
      expect(bid).to.include({
        requestId: 'standard-bid',
        seatBidId: 'standard-server-bid',
        cpm: 3.5,
        currency: 'PLN',
        width: 300,
        height: 600,
        creativeId: 'standard-creative',
        dealId: 'deal-1',
        ttl: 120,
        netRevenue: true,
        mediaType: BANNER,
        ad: '<div>standard creative</div>',
      });
      expect(bid.meta).to.deep.equal({
        advertiserDomains: ['advertiser.example'], dsa, primaryCatId: 'IAB1-1', secondaryCatIds: ['IAB1-2'], attr: [1],
      });
      expect(bid).not.to.have.any.keys('renderer', 'adUrl', 'eventtrackers');
    });

    it('defaults currency to PLN, creativeId to the bid id and ttl to 300', () => {
      const request = buildRequest();
      const [bid] = respond(request, [makeServerBid('standard', { crid: undefined })], { cur: undefined });
      expect(bid).to.include({ currency: 'PLN', creativeId: 'standard-server-bid', ttl: 300 });
      expect(respond(request, [makeServerBid()], { cur: 'EUR' })[0].currency).to.equal('EUR');
    });

    [undefined, {}, { body: null }, { body: '' }, { body: {} }, { body: { seatbid: [] } }, { body: { seatbid: {} } }, { body: { seatbid: [null] } },
      { body: { seatbid: [{}] } }, { body: { seatbid: [{ bid: {} }] } }, { body: { seatbid: [{ bid: [] }] } }, { body: { seatbid: [{ bid: [null, 'bid'] }] } }]
      .forEach((response, index) => {
        it(`returns no bids for an empty or invalid response (${index})`, () => {
          expect(spec.interpretResponse(response, buildRequest())).to.deep.equal([]);
        });
      });

    [0, -1, NaN, Infinity, '3.5', null, undefined].forEach(price => {
      it(`ignores a bid with price = ${String(price)}`, () => {
        expect(respond(buildRequest(), [makeServerBid('standard', { price })])).to.deep.equal([]);
      });
    });

    it('ignores bids for unknown imps', () => {
      const logError = sandbox.stub(utils, 'logError');
      const bids = respond(buildRequest(), [makeServerBid('standard', { impid: 'unknown' }), makeServerBid()]);
      expect(bids.map(bid => bid.requestId)).to.deep.equal(['standard-bid']);
      sinon.assert.calledWith(logError, sinon.match(/does not match any imp/));
    });

    [
      [['advertiser.example', '', null, 42, 'second.example'], ['advertiser.example', 'second.example']],
      [[], []],
      ['advertiser.example', undefined],
      [{}, undefined],
      [undefined, undefined],
    ].forEach(([adomain, expected]) => {
      it(`normalizes adomain = ${JSON.stringify(adomain)}`, () => {
        const [bid] = respond(buildRequest(), [makeServerBid('standard', { adomain })]);
        if (expected) expect(bid.meta.advertiserDomains).to.deep.equal(expected);
        else expect(bid.meta).not.to.have.property('advertiserDomains');
      });
    });

    it('maps bids to their own imps and formats across concurrent requests', () => {
      const logError = sandbox.stub(utils, 'logError');
      const requests = spec.buildRequests([
        makeBid(),
        makeBid({ format: 'interstitial' }),
        makeBid({ format: 'parallax', params: { publisherId: '726' } }),
      ], makeBidderRequest());
      expect(requests).to.have.length(2);
      const body = {
        cur: 'PLN',
        seatbid: [{ bid: [makeServerBid('parallax'), makeServerBid('interstitial'), makeServerBid('standard', { w: 320, h: 480 })] }],
      };
      const first = spec.interpretResponse({ body }, requests[0]);
      const second = spec.interpretResponse({ body }, requests[1]);
      expect(first.map(bid => [bid.requestId, !!bid.renderer])).to.deep.equal([['interstitial-bid', true], ['standard-bid', false]]);
      expect(second.map(bid => [bid.requestId, !!bid.renderer])).to.deep.equal([['parallax-bid', true]]);
      expect(second[0].renderer).not.to.equal(first[0].renderer);
      sinon.assert.calledWith(logError, sinon.match(/does not match any imp/));
    });

    FORMATS.forEach(format => {
      FORMATS.filter(other => other !== format).forEach(conflicting => {
        [['splash', { splash: { format: conflicting } }], ['general', { general: { display_format: conflicting } }]].forEach(([field, ext]) => {
          it(`rejects a ${conflicting} bid declared in ext.${field} for a ${format} ad unit`, () => {
            const warn = sandbox.stub(utils, 'logWarn');
            expect(respond(buildRequest(makeBid({ format })), [makeServerBid(format, { ext })])).to.deep.equal([]);
            sinon.assert.calledWith(warn, `splash: ignoring a ${conflicting} bid for a ${format} ad unit`, `${format}-bid`);
          });
        });
      });
    });

    it('matches response formats case-insensitively and rejects invalid or conflicting declarations', () => {
      sandbox.stub(utils, 'logWarn');
      const request = () => buildRequest(makeBid({ format: 'interstitial' }));
      const accepted = ext => respond(request(), [makeServerBid('interstitial', { ext })]).length === 1;
      expect(accepted({ splash: { format: 'INTERSTITIAL' } })).to.equal(true);
      expect(accepted({ splash: { format: 'interstitial' }, general: { display_format: 'INTERSTITIAL' } })).to.equal(true);
      expect(accepted({ splash: { format: 'interstitial' }, general: { display_format: 'standard' } })).to.equal(false);
      expect(accepted({ splash: { format: 'splitboard' }, general: { display_format: 'Interstitial' } })).to.equal(false);
      expect(accepted({ splash: { format: 42 }, general: { display_format: 'standard' } })).to.equal(false);
      expect(accepted({ splash: { format: 'unknown' }, general: { display_format: 'unknown' } })).to.equal(false);
    });

    [
      { w: 320, h: 480 },
      { w: 700, h: 1600, ext: { splash: { slot: { width: 375, height: 667 } } } },
      { adm: '<div class="splitboard"><div class="splitboard-content">creative</div></div>' },
    ].forEach((overrides, index) => {
      it(`never infers a custom format for a Standard ad unit from size or markup (${index})`, () => {
        const bid = bidFor('standard', overrides);
        expect(bid).not.to.have.property('renderer');
        if (overrides.w) expect(bid).to.include({ width: overrides.w, height: overrides.h });
      });
    });

    [['parallax', 300, 250], ['interstitial', 300, 600]].forEach(([format, w, h]) => {
      it(`installs the ${format} renderer from the request format regardless of creative size`, () => {
        const bid = bidFor(format, { w, h });
        expect(bid.renderer).to.be.instanceOf(Renderer);
        expect(bid.renderer).to.include({ id: `${format}-bid`, adUnitCode: `${format}-slot`, url: undefined, renderNow: true });
        expect(bid).to.include({ width: w, height: h });
      });
    });

    ['parallax', 'interstitial'].forEach(format => {
      it(`ignores a ${format} bid without string markup`, () => {
        const request = buildRequest(makeBid({ format }));
        expect(respond(request, [makeServerBid(format, { adm: undefined, nurl: 'https://ssp.example/win' })])).to.deep.equal([]);
        expect(respond(request, [makeServerBid(format, { adm: 42 })])).to.deep.equal([]);
        expect(respond(request, [makeServerBid(format, { adm: '' })])).to.deep.equal([]);
      });
    });

    it('uses the Parallax slot size reported by Splash for the bid size', () => {
      expect(bidFor('parallax', { ext: { splash: { slot: { width: 375, height: 667 } } } })).to.include({ width: 375, height: 667 });
      expect(bidFor('parallax', { ext: { splash: { slot: { width: '375', height: '667' } } } })).to.include({ width: 375, height: 667 });
      [{ height: 667 }, { width: 375, height: 0 }].forEach(slot => {
        expect(bidFor('parallax', { ext: { splash: { slot } } })).to.include({ width: 700, height: 1600 });
      });
      expect(bidFor('interstitial', { ext: { splash: { slot: { width: 375, height: 667 } } } })).to.include({ width: 320, height: 480 });
    });
  });

  describe('event trackers', () => {
    it('reports burl as an impression tracker and nurl as a win tracker with macros substituted', () => {
      const [bid] = respond(buildRequest(), [makeServerBid('standard', {
        burl: 'https://ssp.example/bill?p=${AUCTION_PRICE}&c=${AUCTION_CURRENCY}',
        nurl: 'https://ssp.example/win?p=${AUCTION_PRICE}&c=${AUCTION_CURRENCY}',
      })], { cur: 'EUR' });
      expect(bid.eventtrackers).to.deep.equal([
        { event: 1, method: 1, url: 'https://ssp.example/bill?p=3.5&c=EUR' },
        { event: 500, method: 1, url: 'https://ssp.example/win?p=3.5&c=EUR' },
      ]);
      expect(bid.ad).to.equal('<div>standard creative</div>');
      expect(bid).not.to.have.property('adUrl');
    });

    it('serves a nurl-only Standard bid through adUrl without a win tracker', () => {
      const nurl = 'https://ssp.example/ad?p=${AUCTION_PRICE}';
      const [bid] = respond(buildRequest(), [makeServerBid('standard', { adm: undefined, nurl, burl: 'https://ssp.example/bill' })]);
      expect(bid.adUrl).to.equal(nurl);
      expect(bid).not.to.have.property('ad');
      expect(bid.eventtrackers).to.deep.equal([{ event: 1, method: 1, url: 'https://ssp.example/bill' }]);
    });

    it('ignores tracker URLs that are not https', () => {
      ['http://ssp.example/bill', '//ssp.example/bill', 'javascript:alert(1)', '', 42].forEach(url => {
        const [bid] = respond(buildRequest(), [makeServerBid('standard', { burl: url, nurl: url })]);
        expect(bid, String(url)).not.to.have.property('eventtrackers');
      });
    });

    it('keeps event trackers declared in the bid extension', () => {
      const viewable = { event: 2, method: 1, url: 'https://ssp.example/view' };
      const [bid] = respond(buildRequest(), [makeServerBid('standard', { burl: 'https://ssp.example/bill', ext: { eventtrackers: [viewable] } })]);
      expect(bid.eventtrackers).to.deep.equal([viewable, { event: 1, method: 1, url: 'https://ssp.example/bill' }]);
    });
  });

  describe('renderers', () => {
    const STYLES = '#splash-parallax-style, #splash-interstitial-style, style[data-splash-scroll-lock]';
    let root, slot, otherSlot, viewport, initialStyles, messageListeners;

    beforeEach(() => {
      initialStyles = new Set(document.querySelectorAll(STYLES));
      messageListeners = [];
      viewport = { innerHeight: 640 };
      sandbox.stub(winDimensions, 'getWinDimensions').callsFake(() => viewport);
      // Keep renderer behaviour independent of the browser running the suite.
      sandbox.stub(utils, 'isSafariBrowser').returns(false);
      sandbox.stub(utils, 'isChromeIOSBrowser').returns(false);
      root = document.createElement('div');
      slot = document.createElement('div');
      slot.id = 'splash-spec-slot';
      otherSlot = document.createElement('div');
      otherSlot.id = 'splash-spec-other-slot';
      root.append(slot, otherSlot);
      document.body.appendChild(root);
    });

    afterEach(async () => {
      messageListeners.forEach(listener => window.removeEventListener('message', listener));
      document.querySelectorAll('.sp-interstitial-overlay[data-splash-renderer]').forEach(element => element.remove());
      root.remove();
      // Removal observers tear the renderers down in a microtask.
      await Promise.resolve();
      await Promise.resolve();
      document.querySelectorAll(STYLES).forEach(style => {
        if (!initialStyles.has(style)) style.remove();
      });
    });

    function listen(listener) {
      messageListeners.push(listener);
      window.addEventListener('message', listener);
    }

    function failIframeWrite() {
      const createElement = document.createElement.bind(document);
      sandbox.stub(document, 'createElement').callsFake((...args) => {
        const element = createElement(...args);
        if (element.tagName === 'IFRAME') {
          Object.defineProperty(element, 'srcdoc', {
            get() { return ''; },
            set() { throw new Error('iframe write failed'); },
          });
        }
        return element;
      });
    }

    function onLoad(iframe, done, assertions) {
      iframe.addEventListener('load', () => {
        try {
          assertions();
          done();
        } catch (error) {
          done(error);
        }
      }, { once: true });
    }

    it('does not add view tracking or timers beyond the Interstitial watchdog', () => {
      const clock = sandbox.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] });
      const observer = sandbox.stub(window, 'IntersectionObserver');
      const parallax = bidFor('parallax');
      parallax.element = slot;
      parallax.renderer.render(parallax, document);
      expect(clock.countTimers()).to.equal(0);
      const interstitial = bidFor('interstitial');
      interstitial.renderer.render(interstitial, document);
      expect(clock.countTimers()).to.equal(1);
      document.querySelector('.sp-interstitial-close').click();
      expect(clock.countTimers()).to.equal(0);
      sinon.assert.notCalled(observer);
    });

    it('does not style publisher elements that reuse renderer class names', () => {
      const foreign = document.createElement('div');
      // A fixed width keeps the comparison independent of the scrollbar that the scroll lock removes.
      foreign.style.width = '400px';
      foreign.innerHTML = '<div class="sp-frame splitboard"><div class="sp-stage splitboard-content"><iframe class="sp-creative"></iframe></div></div>' +
        '<div class="sp-interstitial-overlay"><iframe class="sp-interstitial-creative"></iframe><button class="sp-interstitial-close"></button></div>';
      root.appendChild(foreign);
      const elements = Array.from(foreign.querySelectorAll('*'));
      const styles = () => elements.map(element => ['position', 'width', 'height', 'overflow', 'pointerEvents'].map(property => getComputedStyle(element)[property]));
      const before = styles();
      const parallax = bidFor('parallax');
      parallax.element = slot;
      parallax.renderer.render(parallax, document);
      const interstitial = bidFor('interstitial');
      interstitial.renderer.render(interstitial, document);
      expect(styles()).to.deep.equal(before);
      expect(getComputedStyle(slot.querySelector('.sp-creative')).position).to.equal('fixed');
      expect(getComputedStyle(document.querySelector('.sp-interstitial-overlay[data-splash-renderer]')).position).to.equal('fixed');
    });

    describe('Parallax', () => {
      beforeEach(() => {
        // Layout and markup assertions do not execute creatives. Avoid exhausting the
        // browser's navigation limit before the real Interstitial iframe tests run.
        const documents = new WeakMap();
        const getAttribute = HTMLIFrameElement.prototype.getAttribute;
        sandbox.stub(HTMLIFrameElement.prototype, 'srcdoc')
          .get(function () { return documents.get(this) || ''; })
          .set(function (html) { documents.set(this, html); });
        sandbox.stub(HTMLIFrameElement.prototype, 'getAttribute').callsFake(function (name) {
          return name === 'srcdoc' && documents.has(this) ? documents.get(this) : getAttribute.call(this, name);
        });
      });

      function parallaxBid(serverOverrides = {}) {
        const bid = bidFor('parallax', serverOverrides);
        bid.adUnitCode = 'parallax-slot';
        bid.element = slot;
        return bid;
      }

      function ownFrame(container = slot) {
        return container.querySelector('.sp-frame[data-splash-renderer="parallax"]');
      }

      function render(serverOverrides = {}) {
        const bid = parallaxBid(serverOverrides);
        bid.renderer.render(bid, document);
        return { bid, frame: ownFrame(), svg: slot.querySelector('svg.sp-clip-svg') };
      }

      function srcdocFor(adm, bidChanges = {}) {
        const bid = Object.assign(parallaxBid({ adm }), bidChanges);
        bid.renderer.render(bid, document);
        return ownFrame().querySelector('iframe').getAttribute('srcdoc');
      }

      it('renders a clipped, viewport-high frame with a fixed creative iframe into adUnit.element', () => {
        const bid = parallaxBid();
        bid.adUnitCode = 'not-a-dom-id';
        bid.renderer.render(bid, document);
        const frame = ownFrame();
        const svg = slot.querySelector('svg.sp-clip-svg');
        const clipId = svg.querySelector('clipPath').id;
        expect(frame.className).to.equal('sp-frame splitboard');
        expect(frame.getAttribute('data-sp-owner')).to.match(OWNER);
        expect(clipId).to.match(/^sp-clip-/);
        expect(frame.style.clipPath).to.contain(clipId);
        expect(svg.getAttribute('aria-hidden')).to.equal('true');
        expect(svg.querySelector('polygon').getAttribute('points')).to.equal('0 0.99, 0 0.01, 1 0.01, 1 0.99');
        expect(frame.style.height).to.equal('640px');
        expect(frame.querySelector('.sp-stage').style.height).to.equal('640px');
        const iframe = frame.querySelector('iframe.sp-creative');
        expect(iframe.title).to.equal('Splash parallax creative');
        expect(iframe.getAttribute('sandbox')).to.equal('allow-scripts allow-popups allow-popups-to-escape-sandbox');
        expect(iframe.sandbox.contains('allow-same-origin')).to.equal(false);
        expect(iframe.getAttribute('srcdoc')).to.equal('<div>parallax creative</div>');
        expect(getComputedStyle(iframe).position).to.equal('fixed');
        expect(document.querySelectorAll('#splash-parallax-style')).to.have.length(1);
      });

      it('keeps the aperture within a padded, offset slot without shifting the viewport creative', () => {
        root.style.cssText = 'width:280px;margin-left:80px;padding:24px;box-sizing:border-box';
        const before = document.documentElement.scrollWidth;
        const { frame } = render();
        const slotRect = slot.getBoundingClientRect();
        const frameRect = frame.getBoundingClientRect();
        const creativeRect = frame.querySelector('iframe').getBoundingClientRect();
        expect(slotRect.left).to.be.greaterThan(0);
        expect(frameRect.left).to.equal(slotRect.left);
        expect(frameRect.right).to.equal(slotRect.right);
        expect(frameRect.width).to.equal(slotRect.width);
        expect(creativeRect.left).to.equal(0);
        expect(document.documentElement.scrollWidth).to.be.at.most(before);
      });

      it('gives an auto-width inline-block slot an intrinsic width limited to its container', async () => {
        root.style.cssText = 'width:280px;margin-left:80px;padding:24px;box-sizing:border-box';
        slot.style.display = 'inline-block';
        const { frame } = render();
        expect(frame.getBoundingClientRect().width).to.equal(232);
        expect(slot.getBoundingClientRect().width).to.equal(232);
        root.style.width = '240px';
        await settleLayout();
        expect(frame.getBoundingClientRect().width).to.equal(192);
        expect(slot.getBoundingClientRect().right).to.be.at.most(root.getBoundingClientRect().right - 24);
      });

      it('sizes an intrinsic slot without ResizeObserver and updates it on viewport changes', () => {
        sandbox.stub(window, 'ResizeObserver').value(undefined);
        root.style.cssText = 'width:280px;padding:24px;box-sizing:border-box';
        slot.style.display = 'inline-block';
        const { frame } = render();
        expect(frame.getBoundingClientRect().width).to.equal(232);
        root.style.width = '240px';
        window.dispatchEvent(new Event('resize'));
        expect(frame.getBoundingClientRect().width).to.equal(192);
      });

      async function settleLayout() {
        await new Promise(requestAnimationFrame);
        await new Promise(requestAnimationFrame);
        await new Promise(requestAnimationFrame);
      }

      [
        ['centered flex row', 'display:flex;justify-content:center', ''],
        ['centered flex column', 'display:flex;flex-direction:column;align-items:center', ''],
        ['centered grid', 'display:grid;justify-items:center', ''],
        ['inline-block wrapper', '', 'display:inline-block'],
        ['padded float', '', 'float:left;padding:10px'],
        ['absolute left wrapper', 'position:relative;height:700px', 'position:absolute;left:30px'],
        ['absolute right wrapper', 'position:relative;height:700px', 'position:absolute;right:30px'],
        ['RTL inline-block wrapper', 'direction:rtl', 'display:inline-block;padding:10px'],
      ].forEach(([title, layoutStyle, wrapperStyle]) => {
        it(`keeps a positive, bounded aperture in a ${title}`, () => {
          root.style.cssText = 'width:640px;max-width:calc(100vw - 32px)';
          const layout = root.appendChild(document.createElement('div'));
          layout.style.cssText = layoutStyle;
          const wrapper = layout.appendChild(document.createElement('div'));
          wrapper.style.cssText = wrapperStyle;
          wrapper.appendChild(slot);
          const before = document.documentElement.scrollWidth;
          const { frame } = render();
          const rect = frame.getBoundingClientRect();
          const bounds = layout.getBoundingClientRect();
          expect(rect.width).to.be.greaterThan(1);
          expect(rect.left).to.be.at.least(bounds.left - 1);
          expect(rect.right).to.be.at.most(bounds.right + 1);
          expect(rect.right).to.be.at.most(document.documentElement.clientWidth + 1);
          expect(document.documentElement.scrollWidth).to.be.at.most(before);
        });
      });

      it('resizes an intrinsic slot after reparenting and follows its new container', async () => {
        const first = root.appendChild(document.createElement('div'));
        const second = root.appendChild(document.createElement('div'));
        first.style.width = '300px';
        second.style.width = '600px';
        slot.style.display = 'inline-block';
        first.appendChild(slot);
        const { frame } = render();
        expect(frame.getBoundingClientRect().width).to.equal(300);
        second.appendChild(slot);
        await settleLayout();
        expect(frame.getBoundingClientRect().width).to.equal(600);
        second.style.width = '400px';
        await settleLayout();
        expect(frame.getBoundingClientRect().width).to.equal(400);
      });

      it('sizes a revealed intrinsic slot without resizing or scrolling its fixed-size container', async () => {
        root.style.cssText = 'width:600px;height:700px';
        slot.style.display = 'none';
        const { frame } = render();
        await settleLayout();
        slot.style.display = 'inline-block';
        await settleLayout();
        expect(frame.getBoundingClientRect().width).to.equal(600);
      });

      it('respects a publisher width added after intrinsic sizing', async () => {
        root.style.width = '600px';
        slot.style.display = 'inline-block';
        const { frame } = render();
        expect(frame.getBoundingClientRect().width).to.equal(600);
        slot.style.width = '120px';
        await settleLayout();
        expect(frame.getBoundingClientRect().width).to.equal(120);
        expect(frame.style.minWidth).to.equal('');
      });

      it('limits intrinsic width to the viewport even when an ancestor extends beyond it', () => {
        root.style.cssText = 'position:absolute;left:calc(100vw - 120px);width:500px';
        slot.style.display = 'inline-block';
        const { frame } = render();
        const rect = frame.getBoundingClientRect();
        expect(rect.width).to.be.greaterThan(1);
        expect(rect.right).to.be.at.most(document.documentElement.clientWidth + 1);
      });

      it('does not mistake slot padding for the width of an intrinsic ancestor', () => {
        root.style.width = '600px';
        const wrapper = root.appendChild(document.createElement('div'));
        wrapper.style.display = 'inline-block';
        slot.style.padding = '10px';
        wrapper.appendChild(slot);
        const { frame } = render();
        expect(frame.getBoundingClientRect().width).to.equal(580);
        expect(wrapper.getBoundingClientRect().width).to.equal(600);
      });

      it('fits a centered intrinsic slot when its container extends past the viewport', () => {
        root.style.cssText = 'position:absolute;left:calc(100vw - 400px);width:600px;display:flex;justify-content:center';
        const { frame } = render();
        const rect = frame.getBoundingClientRect();
        expect(rect.width).to.be.greaterThan(100);
        expect(rect.right).to.be.at.most(document.documentElement.clientWidth + 1);
      });

      it('disconnects sizing observations on removal and ignores stale callbacks', async () => {
        let observer;
        const raf = sandbox.stub(window, 'requestAnimationFrame').returns(129);
        const cancel = sandbox.spy(window, 'cancelAnimationFrame');
        sandbox.stub(window, 'ResizeObserver').callsFake(callback => {
          observer = { callback, observe: sandbox.spy(), disconnect: sandbox.spy() };
          return observer;
        });
        const { frame } = render();
        sinon.assert.calledWith(observer.observe, frame);
        sinon.assert.calledWith(observer.observe, slot);
        observer.callback([]);
        observer.callback([]);
        sinon.assert.calledOnce(raf);
        const before = frame.style.cssText;
        slot.remove();
        await tick();
        sinon.assert.calledOnce(observer.disconnect);
        sinon.assert.calledOnceWithExactly(cancel, 129);
        viewport = { innerHeight: 100 };
        observer.callback([]);
        sinon.assert.calledOnce(raf);
        expect(frame.style.cssText).to.equal(before);
      });

      it('disconnects its sizing observer when initialization fails', () => {
        const disconnect = sandbox.spy();
        sandbox.stub(window, 'ResizeObserver').callsFake(() => ({ observe() { throw new Error('resize observer unavailable'); }, disconnect }));
        sandbox.stub(utils, 'logError');
        const add = sandbox.spy(window, 'addEventListener');
        expect(() => render()).to.throw('resize observer unavailable');
        sinon.assert.calledOnce(disconnect);
        expect(add.calledWith('resize')).to.equal(false);
        expect(slot.childElementCount).to.equal(0);
      });

      it('cleans up when sizing observations cannot follow a moved slot', async () => {
        const observer = { observe: sandbox.spy(), disconnect: sandbox.spy() };
        sandbox.stub(window, 'ResizeObserver').returns(observer);
        const warn = sandbox.stub(utils, 'logWarn');
        const { frame } = render();
        observer.observe = sandbox.stub().throws(new Error('cannot observe new parent'));
        const parent = root.appendChild(document.createElement('div'));
        parent.appendChild(slot);
        await tick();
        expect(frame.isConnected).to.equal(false);
        sinon.assert.calledTwice(observer.disconnect);
        sinon.assert.calledWith(warn, 'splash: removal observer failed', sinon.match.instanceOf(Error));
      });

      it('finds the slot by ad unit code and throws a logged error when it is missing', () => {
        const bid = parallaxBid();
        delete bid.element;
        bid.adUnitCode = slot.id;
        bid.renderer.render(bid, document);
        expect(ownFrame()).not.to.equal(null);
        const logError = sandbox.stub(utils, 'logError');
        bid.adUnitCode = 'missing-slot';
        expect(() => bid.renderer.render(bid, document)).to.throw('splash: slot element not found for missing-slot');
        sinon.assert.calledWith(logError, 'splash: parallax render failed', sinon.match.instanceOf(Error));
      });

      [
        ['substitutes the price and click macros', '<a href="${CLICKTHROUGH}">${AUCTION_PRICE}</a>', '<a href="">3.5</a>'],
        ['extracts a nested Splitboard iframe document', '<div class="splitboard"><div class="splitboard-content"><iframe srcdoc="&lt;p&gt;INNER&lt;/p&gt;"></iframe></div></div>', '<p>INNER</p>'],
        ['wraps Splitboard content without a nested document', '<div class="splitboard"><div class="splitboard-content"><p>PARA</p></div></div>', wrapped('<p>PARA</p>')],
        ['falls back to the Splitboard root content', '<div class="splitboard"><p>fallback</p></div>', wrapped('<p>fallback</p>')],
        ['keeps unrelated markup mentioning splitboard', '<div data-kind="splitboard">ordinary</div>'],
        ['unwraps the SSP iframe around Standard Display markup', SSP_WRAPPED, SSP_CREATIVE],
        ['keeps unwrapped Standard Display markup', SSP_CREATIVE],
        ['keeps an SSP iframe that has siblings', SSP_WRAPPED + '<div>sibling</div>'],
        ['keeps an iframe whose document is not Standard Display', '<iframe srcdoc="plain" title="froc-standard-display"></iframe>'],
      ].forEach(([title, adm, expected = adm]) => {
        it(`${title} in the creative markup`, () => {
          expect(srcdocFor(adm)).to.equal(expected);
        });
      });

      it('prefers originalCpm for the price macro', () => {
        expect(srcdocFor('<p>${AUCTION_PRICE}</p>', { originalCpm: 4.2 })).to.equal('<p>4.2</p>');
      });

      it('keeps the markup unchanged when it cannot be parsed', () => {
        sandbox.stub(DOMParser.prototype, 'parseFromString').throws(new Error('parser unavailable'));
        [SSP_WRAPPED, '<div class="splitboard"><p>creative</p></div>'].forEach(adm => expect(srcdocFor(adm)).to.equal(adm));
      });

      it('replaces only its own frame in the same slot on refresh', () => {
        const foreign = document.createElement('div');
        foreign.className = 'sp-frame splitboard';
        foreign.setAttribute('data-sp-owner', 'another-renderer');
        slot.appendChild(foreign);
        const first = parallaxBid();
        const other = parallaxBid();
        other.element = otherSlot;
        first.renderer.render(first, document);
        other.renderer.render(other, document);
        const oldFrame = ownFrame();
        const oldSvg = slot.querySelector('svg.sp-clip-svg');
        const remove = sandbox.spy(window, 'removeEventListener');
        first.renderer.render(first, document);
        expect(oldFrame.isConnected).to.equal(false);
        expect(oldSvg.isConnected).to.equal(false);
        sinon.assert.calledWith(remove, 'resize', sinon.match.func);
        expect(slot.querySelectorAll('.sp-frame[data-splash-renderer]')).to.have.length(1);
        expect(slot.querySelectorAll('svg.sp-clip-svg')).to.have.length(1);
        expect(foreign.isConnected).to.equal(true);
        expect(ownFrame(otherSlot)).not.to.equal(null);
        expect(otherSlot.querySelectorAll('svg.sp-clip-svg')).to.have.length(1);
        expect(document.querySelectorAll('#splash-parallax-style')).to.have.length(1);
      });

      ['frame', 'slot', 'ancestor'].forEach(target => {
        it(`tears down when the publisher removes the ${target}`, async () => {
          const remove = sandbox.spy(window, 'removeEventListener');
          const { frame, svg } = render();
          ({ frame, slot, ancestor: root })[target].remove();
          await tick();
          expect(frame.parentNode).to.equal(null);
          expect(svg.parentNode).to.equal(null);
          sinon.assert.calledWith(remove, 'resize', sinon.match.func);
          sinon.assert.calledWith(remove, 'orientationchange', sinon.match.func);
          viewport = { innerHeight: 100 };
          window.dispatchEvent(new Event('resize'));
          expect(frame.style.height).to.equal('640px');
        });
      });

      it('keeps the frame when the slot moves or unrelated nodes change, and tears down on later removal', async () => {
        const remove = sandbox.spy(window, 'removeEventListener');
        const { frame, svg } = render();
        const newParent = document.createElement('div');
        document.body.appendChild(newParent);
        try {
          newParent.appendChild(slot);
          await tick();
          const sibling = newParent.appendChild(document.createElement('div'));
          sibling.remove();
          await tick();
          expect(frame.isConnected).to.equal(true);
          expect(svg.isConnected).to.equal(true);
          expect(remove.calledWith('resize')).to.equal(false);
          newParent.remove();
          await tick();
          expect(svg.parentNode).to.equal(null);
          sinon.assert.calledWith(remove, 'resize', sinon.match.func);
        } finally {
          newParent.remove();
        }
      });

      it('tears down and warns when re-observing a moved slot fails', () => {
        const observers = [];
        sandbox.stub(window, 'MutationObserver').callsFake(callback => {
          const observer = { callback, observe: sandbox.spy(), disconnect: sandbox.spy() };
          observers.push(observer);
          return observer;
        });
        const warn = sandbox.stub(utils, 'logWarn');
        const { frame, svg } = render();
        const [observer] = observers;
        expect(observer.observe.args.map(args => args[0])).to.have.ordered.members([slot, root, document.body, document.documentElement, document]);
        sinon.assert.alwaysCalledWith(observer.observe, sinon.match.any, { childList: true });
        observer.callback([]);
        expect(observer.observe.callCount).to.equal(5);
        const wrapper = root.appendChild(document.createElement('div'));
        wrapper.appendChild(slot);
        observer.observe = sandbox.stub().throws(new Error('observe failed'));
        observer.callback([]);
        expect(frame.isConnected).to.equal(false);
        expect(svg.isConnected).to.equal(false);
        sinon.assert.calledWith(warn, 'splash: removal observer failed', sinon.match.instanceOf(Error));
      });

      it('renders without MutationObserver support and still replaces the frame on refresh', () => {
        const unsupported = sandbox.stub(window, 'MutationObserver').value(undefined);
        const { frame } = render();
        expect(frame.isConnected).to.equal(true);
        unsupported.restore();
        render();
        expect(frame.isConnected).to.equal(false);
        expect(slot.querySelectorAll('.sp-frame[data-splash-renderer]')).to.have.length(1);
      });

      it('sizes the slot from the reported height, clamped to the viewport, on resize and orientation changes', () => {
        // Window dimensions are cached until reset, so each viewport change must reset them before reading.
        let cached = viewport;
        winDimensions.getWinDimensions.callsFake(() => cached);
        const reset = sandbox.stub(winDimensions, 'resetWinDimensions').callsFake(() => { cached = viewport; });
        const { frame } = render({ ext: { splash: { slot: { height: 600 } } } });
        const stage = frame.querySelector('.sp-stage');
        expect(frame.style.height).to.equal('600px');
        viewport = { innerHeight: 400 };
        window.dispatchEvent(new Event('resize'));
        expect([frame.style.height, stage.style.height]).to.deep.equal(['400px', '400px']);
        viewport = { innerHeight: 900 };
        window.dispatchEvent(new Event('orientationchange'));
        expect([frame.style.height, stage.style.height]).to.deep.equal(['600px', '600px']);
        sinon.assert.calledTwice(reset);
      });

      [
        ['follows the viewport without a reported slot height', {}, 2000, '2000px'],
        ['follows the viewport when the slot height equals the creative height', { ext: { splash: { slot: { height: 1600 } } } }, 2000, '2000px'],
        ['treats a one pixel difference as the creative height', { ext: { splash: { slot: { height: 1599 } } } }, 2000, '2000px'],
        ['uses a smaller reported slot height', { ext: { splash: { slot: { height: 1500 } } } }, 2000, '1500px'],
        ['uses the slot height when the creative height is unknown', { h: undefined, ext: { splash: { slot: { height: 1600 } } } }, 2000, '1600px'],
        ['uses the slot height when the viewport height is unknown', { ext: { splash: { slot: { height: 600 } } } }, 0, '600px'],
        ['leaves the height unset when neither is known', {}, 0, ''],
      ].forEach(([title, overrides, innerHeight, expected]) => {
        it(`${title}`, () => {
          viewport = { innerHeight };
          expect(render(overrides).frame.style.height).to.equal(expected);
        });
      });

      it('falls back to the document client height for the viewport', () => {
        viewport = { innerHeight: 0, document: { documentElement: { clientHeight: 450 } } };
        expect(render().frame.style.height).to.equal('450px');
      });

      describe('Safari and iOS Chrome frame alignment', () => {
        let intersectionObservers;

        beforeEach(() => {
          utils.isSafariBrowser.returns(true);
          sandbox.stub(window.CSS, 'supports').returns(false);
          sandbox.stub(window, 'ResizeObserver').returns({ observe: sandbox.spy(), disconnect: sandbox.spy() });
          intersectionObservers = [];
          sandbox.stub(window, 'IntersectionObserver').callsFake(callback => {
            const observer = { callback, observe: sandbox.spy(), disconnect: sandbox.spy() };
            intersectionObservers.push(observer);
            return observer;
          });
        });

        function intersect(frame, isIntersecting = true) {
          const observer = intersectionObservers[intersectionObservers.length - 1];
          expect(observer, 'Safari visibility observer').not.to.equal(undefined);
          observer.callback([{ target: frame, isIntersecting }]);
          return observer;
        }

        it('physically clips an absolute creative while keeping its viewport alignment', async () => {
          const matchMedia = sandbox.stub(window, 'matchMedia').returns({ matches: true });
          root.style.cssText = 'width:280px;margin-left:80px;padding:24px;box-sizing:border-box';
          const addWindow = sandbox.spy(window, 'addEventListener');
          const { frame } = render();
          intersect(frame);
          const iframe = frame.querySelector('iframe');
          sinon.assert.notCalled(matchMedia);
          expect(frame.classList.contains('sp-pointer-guarded')).to.equal(true);
          expect(getComputedStyle(iframe).position).to.equal('absolute');
          expect(getComputedStyle(iframe).pointerEvents).to.equal('auto');
          expect(getComputedStyle(frame).overflow).to.equal('hidden');
          expect(Math.abs(iframe.getBoundingClientRect().left)).to.be.lessThan(1);
          expect(Math.abs(iframe.getBoundingClientRect().top)).to.be.lessThan(1);
          expect(addWindow.calledWith('mousemove')).to.equal(false);
          sinon.assert.calledWith(addWindow, 'scroll', sinon.match.func, { passive: true, capture: true });

          const cancel = sandbox.spy(window, 'cancelAnimationFrame');
          frame.remove();
          await tick();
          expect(frame.classList.contains('sp-pointer-guarded')).to.equal(false);
          sinon.assert.calledOnce(cancel);
          expect(iframe.style.left).to.equal('');
          expect(iframe.style.top).to.equal('');
        });

        it('hit-tests the creative only within the aperture and respects publisher controls above it', () => {
          sandbox.stub(window, 'matchMedia').returns({ matches: true });
          root.style.cssText = 'position:absolute;left:80px;top:80px;width:280px;padding:24px;box-sizing:border-box';
          const { frame } = render();
          frame.style.maxHeight = '200px';
          // Simulate Safari ignoring the ancestor clip-path; overflow must still bound hit testing.
          frame.style.clipPath = 'none';
          frame.style.setProperty('-webkit-clip-path', 'none');
          const rect = frame.getBoundingClientRect();
          const x = rect.left + rect.width / 2;
          const y = rect.top + rect.height / 2;
          expect(document.elementFromPoint(x, y)).to.equal(frame.querySelector('iframe'));
          const publisherControl = root.appendChild(document.createElement('button'));
          publisherControl.style.cssText = 'position:fixed;width:10px;height:10px;margin:0;padding:0;z-index:0';
          [
            [rect.left - 8, y], [rect.right + 8, y], [x, rect.top - 8], [x, rect.bottom + 8],
          ].forEach(([left, top]) => {
            publisherControl.style.left = left - 5 + 'px';
            publisherControl.style.top = top - 5 + 'px';
            expect(document.elementFromPoint(left, top), `${left},${top}`).to.equal(publisherControl);
          });
          publisherControl.style.zIndex = '2';
          publisherControl.style.left = x - 5 + 'px';
          publisherControl.style.top = y - 5 + 'px';
          expect(document.elementFromPoint(x, y)).to.equal(publisherControl);
        });

        it('coalesces scroll events into one alignment without a continuous animation loop', () => {
          sandbox.stub(window, 'matchMedia').returns({ matches: true });
          const raf = sandbox.stub(window, 'requestAnimationFrame').returns(123);
          const { frame } = render();
          intersect(frame);
          const iframe = frame.querySelector('iframe');
          const rect = sandbox.stub(frame, 'getClientRects').returns([{ left: 90, top: -130 }]);
          sinon.assert.calledOnce(raf);
          sinon.assert.notCalled(rect);
          raf.firstCall.args[0]();
          expect([iframe.style.left, iframe.style.top]).to.deep.equal(['-90px', '130px']);
          sinon.assert.calledOnce(raf);
          rect.returns([{ left: 120, top: 200 }]);
          slot.dispatchEvent(new Event('scroll'));
          slot.dispatchEvent(new Event('scroll'));
          window.dispatchEvent(new Event('scroll'));
          sinon.assert.calledTwice(raf);
          sinon.assert.calledOnce(rect);
          raf.secondCall.args[0]();
          expect([iframe.style.left, iframe.style.top]).to.deep.equal(['-120px', '-200px']);
          sinon.assert.calledTwice(raf);
          sinon.assert.calledTwice(rect);
        });

        it('waits for a visible aperture when the slot starts hidden', () => {
          sandbox.stub(window, 'matchMedia').returns({ matches: true });
          const raf = sandbox.stub(window, 'requestAnimationFrame').returns(124);
          slot.style.display = 'none';
          const { frame } = render();
          const iframe = frame.querySelector('iframe');
          expect([iframe.style.left, iframe.style.top]).to.deep.equal(['', '']);
          slot.style.display = '';
          intersect(frame);
          sinon.assert.calledOnce(raf);
          raf.firstCall.args[0]();
          expect(Math.abs(iframe.getBoundingClientRect().top)).to.be.lessThan(1);
        });

        it('realigns after observed ancestor layout changes and slot reparenting', async () => {
          sandbox.stub(window, 'matchMedia').returns({ matches: true });
          const raf = sandbox.stub(window, 'requestAnimationFrame').returns(126);
          const { frame } = render();
          intersect(frame);
          const iframe = frame.querySelector('iframe');
          raf.firstCall.args[0]();
          root.style.marginTop = '100px';
          await tick();
          sinon.assert.calledTwice(raf);
          raf.secondCall.args[0]();
          expect(Math.abs(iframe.getBoundingClientRect().top)).to.be.lessThan(1);
          const parent = root.appendChild(document.createElement('div'));
          parent.style.cssText = 'padding-left:80px;padding-top:30px';
          parent.appendChild(slot);
          await tick();
          sinon.assert.calledThrice(raf);
          raf.thirdCall.args[0]();
          expect(Math.abs(iframe.getBoundingClientRect().top)).to.be.lessThan(1);
          expect(Math.abs(iframe.getBoundingClientRect().left)).to.be.lessThan(1);
          expect(frame.isConnected).to.equal(true);
        });

        it('aligns after resize observations, viewport events and resource loads without polling', () => {
          sandbox.stub(window, 'matchMedia').returns({ matches: true });
          const viewport = new EventTarget();
          sandbox.stub(window, 'visualViewport').value(viewport);
          const raf = sandbox.stub(window, 'requestAnimationFrame');
          raf.callsFake(() => raf.callCount);
          const { frame } = render();
          intersect(frame);
          const iframe = frame.querySelector('iframe');
          const rect = sandbox.stub(frame, 'getClientRects').returns([{ left: 30, top: 50 }]);
          raf.firstCall.args[0]();
          sinon.assert.calledOnce(raf);

          viewport.dispatchEvent(new Event('scroll'));
          viewport.dispatchEvent(new Event('resize'));
          slot.dispatchEvent(new Event('load'));
          sinon.assert.calledTwice(raf);
          raf.secondCall.args[0]();
          sinon.assert.calledTwice(raf);

          window.ResizeObserver.firstCall.args[0]();
          sinon.assert.calledThrice(raf);
          // ResizeObserver defers sizing; sizing then schedules exactly one alignment.
          raf.thirdCall.args[0]();
          expect(raf.callCount).to.equal(4);
          rect.returns([{ left: 60, top: 90 }]);
          raf.getCall(3).args[0]();
          expect([iframe.style.left, iframe.style.top]).to.deep.equal(['-60px', '-90px']);
          expect(raf.callCount).to.equal(4);
        });

        it('realigns after a sibling is inserted without resizing an ancestor', async () => {
          sandbox.stub(window, 'matchMedia').returns({ matches: true });
          const raf = sandbox.stub(window, 'requestAnimationFrame').returns(143);
          root.style.height = '500px';
          const { frame } = render();
          intersect(frame);
          raf.firstCall.args[0]();
          const iframe = frame.querySelector('iframe');
          const spacer = document.createElement('div');
          spacer.style.height = '60px';
          slot.before(spacer);
          await tick();
          sinon.assert.calledTwice(raf);
          raf.secondCall.args[0]();
          expect(Math.abs(iframe.getBoundingClientRect().top)).to.be.lessThan(1);
          sinon.assert.calledTwice(raf);
        });

        it('removes capture and visual viewport listeners and ancestor observations on removal', async () => {
          sandbox.stub(window, 'matchMedia').returns({ matches: true });
          const viewport = new EventTarget();
          sandbox.stub(window, 'visualViewport').value(viewport);
          const removeViewport = sandbox.spy(viewport, 'removeEventListener');
          const removeWindow = sandbox.spy(window, 'removeEventListener');
          const removeDocument = sandbox.spy(document, 'removeEventListener');
          const NativeMutationObserver = window.MutationObserver;
          const layoutDisconnect = sandbox.spy();
          sandbox.stub(window, 'MutationObserver').callsFake(callback => {
            const observer = new NativeMutationObserver(callback);
            const observe = observer.observe.bind(observer);
            const disconnect = observer.disconnect.bind(observer);
            observer.observe = (element, options) => {
              if (options.attributes) observer.disconnect = () => { layoutDisconnect(); disconnect(); };
              observe(element, options);
            };
            return observer;
          });
          const raf = sandbox.stub(window, 'requestAnimationFrame').returns(142);
          const { frame } = render();
          intersect(frame);
          frame.remove();
          await tick();
          sinon.assert.calledOnce(layoutDisconnect);
          sinon.assert.calledWith(removeWindow, 'scroll', sinon.match.func, true);
          sinon.assert.calledWith(removeDocument, 'load', sinon.match.func, true);
          ['scroll', 'resize'].forEach(type => sinon.assert.calledWith(removeViewport, type, sinon.match.func));
          viewport.dispatchEvent(new Event('resize'));
          slot.dispatchEvent(new Event('scroll'));
          root.style.marginTop = '80px';
          await tick();
          sinon.assert.calledOnce(raf);
        });

        it('keeps scroll alignment when visualViewport is only a dimensions polyfill', async () => {
          sandbox.stub(window, 'matchMedia').returns({ matches: true });
          sandbox.stub(window, 'visualViewport').value({ width: 1024, height: 768 });
          const raf = sandbox.stub(window, 'requestAnimationFrame').returns(144);
          const { frame } = render();
          intersect(frame);
          raf.firstCall.args[0]();
          const rect = sandbox.stub(frame, 'getClientRects').returns([{ left: 40, top: -50 }]);
          window.dispatchEvent(new Event('scroll'));
          raf.secondCall.args[0]();
          expect([frame.querySelector('iframe').style.left, frame.querySelector('iframe').style.top]).to.deep.equal(['-40px', '50px']);
          sinon.assert.calledOnce(rect);
          frame.remove();
          await tick();
          expect(frame.classList.contains('sp-pointer-guarded')).to.equal(false);
        });

        describe('native vertical positioning', () => {
          beforeEach(() => {
            window.CSS.supports.callsFake((property, value) =>
              (property === 'overflow' && value === 'clip') || (property === 'position' && value === 'sticky'));
          });

          it('keeps the canvas viewport-sized inside a clipped sticky travel area', () => {
            root.style.cssText = 'width:280px;margin-left:70px;margin-top:80px';
            const { frame } = render();
            const iframe = frame.querySelector('iframe');
            const stage = frame.querySelector('.sp-stage');
            expect(frame.classList.contains('sp-native-parallax')).to.equal(true);
            expect(getComputedStyle(frame).overflowY).to.equal('clip');
            expect(getComputedStyle(iframe).position).to.equal('sticky');
            expect(iframe.getAttribute('sandbox')).not.to.include('allow-same-origin');
            expect(Math.abs(iframe.getBoundingClientRect().top)).to.be.lessThan(1);
            expect(Math.abs(iframe.getBoundingClientRect().left)).to.be.lessThan(1);
            expect(stage.getBoundingClientRect().height).to.be.closeTo(frame.getBoundingClientRect().height + 2 * iframe.getBoundingClientRect().height, 1);
          });

          it('does not write vertical iframe offsets when scrolling changes the aperture position', () => {
            const raf = sandbox.stub(window, 'requestAnimationFrame').returns(180);
            const { frame } = render();
            intersect(frame);
            const iframe = frame.querySelector('iframe');
            const rect = sandbox.stub(frame, 'getClientRects').returns([{ left: 30, top: -160 }]);
            raf.firstCall.args[0]();
            expect(iframe.style.marginLeft).to.equal('-30px');
            expect([iframe.style.top, iframe.style.left]).to.deep.equal(['', '']);
            rect.returns([{ left: 30, top: -480 }]);
            window.dispatchEvent(new Event('scroll'));
            raf.secondCall.args[0]();
            expect([iframe.style.top, iframe.style.left, iframe.style.marginLeft]).to.deep.equal(['', '', '-30px']);
            sinon.assert.calledTwice(raf);
          });

          ['auto', 'scroll', 'hidden'].forEach(overflow => {
            it(`retains absolute clipping under an overflow:${overflow} ancestor`, () => {
              root.style.overflow = overflow;
              const { frame } = render();
              expect(frame.classList.contains('sp-native-parallax')).to.equal(false);
              expect(getComputedStyle(frame.querySelector('iframe')).position).to.equal('absolute');
            });
          });

          ['transform:translateY(10px)', 'perspective:500px', 'filter:blur(0px)', 'will-change:transform', 'contain:paint'].forEach(style => {
            it(`retains the existing alignment for a ${style} ancestor`, () => {
              root.style.cssText = style;
              const { frame } = render();
              expect(frame.classList.contains('sp-native-parallax')).to.equal(false);
            });
          });

          ['translate:0 20px', 'rotate:5deg', 'scale:0.9', 'will-change:translate'].forEach(style => {
            it(`retains absolute alignment under an individual ${style} ancestor`, () => {
              root.style.cssText = style;
              const { frame } = render();
              expect(frame.classList.contains('sp-native-parallax')).to.equal(false);
            });
          });

          it('does not treat a non-propagating body scroll container as the root viewport', () => {
            const htmlStyle = document.documentElement.style.cssText;
            const bodyStyle = document.body.style.cssText;
            try {
              document.documentElement.style.overflowX = 'hidden';
              document.body.style.overflowX = 'hidden';
              const { frame } = render();
              expect(frame.classList.contains('sp-native-parallax')).to.equal(false);
            } finally {
              document.documentElement.style.cssText = htmlStyle;
              document.body.style.cssText = bodyStyle;
            }
          });

          it('rechecks data-attribute CSS selectors that change the scroll container', async () => {
            const style = document.createElement('style');
            style.textContent = '[data-splash-native-test="clipped"]{overflow:hidden}';
            document.head.appendChild(style);
            try {
              const { frame } = render();
              expect(frame.classList.contains('sp-native-parallax')).to.equal(true);
              root.setAttribute('data-splash-native-test', 'clipped');
              await tick();
              expect(frame.classList.contains('sp-native-parallax')).to.equal(false);
            } finally {
              style.remove();
            }
          });

          it('rechecks geometry when a stylesheet load changes CSS without resizing the ancestor', () => {
            const style = document.createElement('style');
            style.textContent = '.splash-native-load-test{overflow:visible}';
            root.className = 'splash-native-load-test';
            document.head.appendChild(style);
            try {
              const { frame } = render();
              expect(frame.classList.contains('sp-native-parallax')).to.equal(true);
              style.sheet.insertRule('.splash-native-load-test{overflow:hidden}', 1);
              style.dispatchEvent(new Event('load'));
              expect(frame.classList.contains('sp-native-parallax')).to.equal(false);
            } finally {
              style.remove();
            }
          });

          it('re-evaluates native positioning when publisher overflow changes', async () => {
            const { frame } = render();
            expect(frame.classList.contains('sp-native-parallax')).to.equal(true);
            root.style.overflow = 'auto';
            await tick();
            expect(frame.classList.contains('sp-native-parallax')).to.equal(false);
            expect(frame.querySelector('.sp-stage').style.height).to.equal(frame.style.height);
            expect(frame.querySelector('iframe').style.marginLeft).to.equal('');
            root.style.overflow = 'visible';
            await tick();
            expect(frame.classList.contains('sp-native-parallax')).to.equal(true);
            expect(frame.querySelector('iframe').style.top).to.equal('');
          });

          it('preserves clipping when the native canvas extends outside the aperture', () => {
            root.style.cssText = 'position:absolute;left:70px;top:70px;width:280px';
            const { frame } = render({ ext: { splash: { slot: { height: 160 } } } });
            const iframe = frame.querySelector('iframe');
            const rect = frame.getBoundingClientRect();
            frame.style.clipPath = 'none';
            frame.style.setProperty('-webkit-clip-path', 'none');
            expect(document.elementFromPoint(rect.left + 10, rect.top + 10)).to.equal(iframe);
            [
              [rect.left - 8, rect.top + 10], [rect.right + 8, rect.top + 10],
              [rect.left + 10, rect.top - 8], [rect.left + 10, rect.bottom + 8],
            ].forEach(([x, y]) => expect(document.elementFromPoint(x, y)).not.to.equal(iframe));
          });

          it('uses native positioning for iOS Chrome and clears it on removal', async () => {
            utils.isSafariBrowser.returns(false);
            utils.isChromeIOSBrowser.returns(true);
            const { frame } = render();
            const iframe = frame.querySelector('iframe');
            expect(frame.classList.contains('sp-native-parallax')).to.equal(true);
            frame.remove();
            await tick();
            expect(frame.classList.contains('sp-native-parallax')).to.equal(false);
            expect(iframe.style.marginLeft).to.equal('');
          });
        });

        it('cancels pending alignment and removes listeners on refresh and removal', async () => {
          sandbox.stub(window, 'matchMedia').returns({ matches: true });
          const raf = sandbox.stub(window, 'requestAnimationFrame').returns(125);
          const cancel = sandbox.spy(window, 'cancelAnimationFrame');
          const remove = sandbox.spy(window, 'removeEventListener');
          const first = render().frame;
          intersect(first);
          sinon.assert.calledOnce(raf);
          const second = render().frame;
          intersect(second);
          sinon.assert.calledWith(cancel, 125);
          expect(first.classList.contains('sp-pointer-guarded')).to.equal(false);
          sinon.assert.calledTwice(raf);
          second.remove();
          await tick();
          sinon.assert.calledTwice(cancel);
          ['resize', 'orientationchange'].forEach(type => expect(remove.getCalls().filter(call => call.args[0] === type)).to.have.length(2));
          sinon.assert.calledTwice(raf);
        });

        it('sleeps offscreen and in a hidden tab, then queues one update on return', async () => {
          sandbox.stub(window, 'matchMedia').returns({ matches: true });
          const raf = sandbox.stub(window, 'requestAnimationFrame').returns(127);
          const cancel = sandbox.spy(window, 'cancelAnimationFrame');
          const removeDocument = sandbox.spy(document, 'removeEventListener');
          let hidden = false;
          sandbox.stub(document, 'hidden').get(() => hidden);
          const { frame } = render();
          sinon.assert.notCalled(raf);
          const observer = intersect(frame);
          sinon.assert.calledOnce(raf);
          intersect(frame);
          sinon.assert.calledOnce(raf);
          intersect(frame, false);
          sinon.assert.calledOnce(cancel);
          intersect(frame, false);
          sinon.assert.calledOnce(cancel);
          intersect(frame);
          sinon.assert.calledTwice(raf);
          hidden = true;
          document.dispatchEvent(new Event('visibilitychange'));
          sinon.assert.calledTwice(cancel);
          hidden = false;
          document.dispatchEvent(new Event('visibilitychange'));
          sinon.assert.calledThrice(raf);
          frame.remove();
          await tick();
          sinon.assert.calledOnce(observer.disconnect);
          sinon.assert.calledThrice(cancel);
          sinon.assert.calledWith(removeDocument, 'visibilitychange', sinon.match.func);
          observer.callback([{ target: frame, isIntersecting: true }]);
          raf.thirdCall.args[0]();
          document.dispatchEvent(new Event('visibilitychange'));
          sinon.assert.calledThrice(raf);
        });

        it('suspends one instance without stopping another visible creative', () => {
          sandbox.stub(window, 'matchMedia').returns({ matches: true });
          const raf = sandbox.stub(window, 'requestAnimationFrame');
          raf.onCall(0).returns(130);
          raf.onCall(1).returns(131);
          const cancel = sandbox.spy(window, 'cancelAnimationFrame');
          const first = render().frame;
          const firstObserver = intersect(first);
          const bid = parallaxBid();
          bid.element = otherSlot;
          bid.renderer.render(bid, document);
          const second = ownFrame(otherSlot);
          intersect(second);
          sinon.assert.calledTwice(raf);
          firstObserver.callback([{ target: first, isIntersecting: false }]);
          sinon.assert.calledOnceWithExactly(cancel, 130);
          expect(second.isConnected).to.equal(true);
          raf.secondCall.args[0]();
          sinon.assert.calledTwice(raf);
        });

        it('retains alignment and cleanup when IntersectionObserver is unavailable', async () => {
          window.IntersectionObserver.restore();
          sandbox.stub(window, 'IntersectionObserver').value(undefined);
          sandbox.stub(window, 'matchMedia').returns({ matches: true });
          const raf = sandbox.stub(window, 'requestAnimationFrame').returns(128);
          const cancel = sandbox.spy(window, 'cancelAnimationFrame');
          const { frame } = render();
          sinon.assert.calledOnce(raf);
          expect(getComputedStyle(frame.querySelector('iframe')).position).to.equal('absolute');
          frame.remove();
          await tick();
          sinon.assert.calledOnce(cancel);
        });

        it('rolls back visibility observations if they cannot start', () => {
          sandbox.stub(window, 'matchMedia').returns({ matches: true });
          const disconnect = sandbox.spy();
          window.IntersectionObserver.callsFake(() => ({ observe() { throw new Error('visibility observer unavailable'); }, disconnect }));
          sandbox.stub(utils, 'logError');
          expect(() => render()).to.throw('visibility observer unavailable');
          sinon.assert.calledOnce(disconnect);
          expect(slot.childElementCount).to.equal(0);
        });

        it('leaves non-WebKit browser frames fixed', () => {
          utils.isSafariBrowser.returns(false);
          const add = sandbox.spy(window, 'addEventListener');
          const { frame } = render();
          expect(frame.classList.contains('sp-pointer-guarded')).to.equal(false);
          expect(add.calledWith('scroll')).to.equal(false);
          expect(getComputedStyle(frame.querySelector('iframe')).position).to.equal('fixed');
        });

        [
          ['for coarse pointers', () => sandbox.stub(window, 'matchMedia').returns({ matches: false })],
          ['without matchMedia', () => sandbox.stub(window, 'matchMedia').value(undefined)],
          ['in iOS Chrome', () => {
            utils.isSafariBrowser.returns(false);
            utils.isChromeIOSBrowser.returns(true);
            sandbox.stub(window, 'matchMedia').returns({ matches: false });
          }],
        ].forEach(([title, setup]) => {
          it(`physically clips the creative ${title}`, () => {
            setup();
            const add = sandbox.spy(window, 'addEventListener');
            const { frame } = render();
            expect(frame.classList.contains('sp-pointer-guarded')).to.equal(true);
            sinon.assert.calledWith(add, 'scroll', sinon.match.func, { passive: true, capture: true });
            expect(getComputedStyle(frame.querySelector('iframe')).position).to.equal('absolute');
          });
        });
      });

      it('rolls back the inserted DOM when writing the creative fails', () => {
        failIframeWrite();
        const logError = sandbox.stub(utils, 'logError');
        const add = sandbox.spy(window, 'addEventListener');
        const bid = parallaxBid();
        expect(() => bid.renderer.render(bid, document)).to.throw('iframe write failed');
        expect(slot.childElementCount).to.equal(0);
        expect(add.calledWith('resize')).to.equal(false);
        sinon.assert.calledWith(logError, 'splash: parallax render failed', sinon.match.instanceOf(Error));
      });

      it('rolls back the DOM and listeners when the removal observer cannot start', () => {
        utils.isSafariBrowser.returns(true);
        sandbox.stub(window, 'matchMedia').returns({ matches: true });
        const disconnect = sandbox.spy();
        const NativeMutationObserver = window.MutationObserver;
        const mutationObserver = sandbox.stub(window, 'MutationObserver');
        mutationObserver.onFirstCall().callsFake(callback => new NativeMutationObserver(callback));
        mutationObserver.onSecondCall().returns({ observe() { throw new Error('observer unavailable'); }, disconnect });
        const remove = sandbox.spy(window, 'removeEventListener');
        sandbox.stub(utils, 'logError');
        const bid = parallaxBid();
        expect(() => bid.renderer.render(bid, document)).to.throw('observer unavailable');
        sinon.assert.calledOnce(disconnect);
        ['resize', 'orientationchange'].forEach(type => sinon.assert.calledWith(remove, type, sinon.match.func));
        expect(slot.childElementCount).to.equal(0);
      });
    });

    describe('Interstitial', () => {
      function overlay(doc = document) {
        return doc.querySelector('.sp-interstitial-overlay[data-splash-renderer="interstitial"]');
      }

      function scrollLock(doc = document) {
        return doc.querySelector('style[data-splash-scroll-lock]');
      }

      function render(serverOverrides = {}, doc = document) {
        const bid = bidFor('interstitial', serverOverrides);
        bid.renderer.render(bid, doc);
        const element = overlay(doc);
        return { bid, overlay: element, iframe: element.querySelector('iframe'), close: element.querySelector('.sp-interstitial-close') };
      }

      function srcdocFor(adm) {
        return render({ adm }).iframe.getAttribute('srcdoc');
      }

      function message(source, data) {
        const event = new MessageEvent('message', { data });
        // Firefox rejects opaque WindowProxy values in MessageEventInit.
        Object.defineProperty(event, 'source', { value: source });
        window.dispatchEvent(event);
      }

      function fixtureScript(body) {
        return '<script>window.addEventListener("message", function (event) {' +
          'if (event.source !== parent || !event.data || event.data.source !== "splash-spec") return;' +
          body + '});</script>';
      }

      function command(iframe, action) {
        iframe.contentWindow.postMessage({ source: 'splash-spec', command: action }, '*');
      }

      function fixtureReports(iframe, done, assertions) {
        const creativeWindow = iframe.contentWindow;
        listen(event => {
          if (event.source !== creativeWindow || !event.data || event.data.source !== 'splash-spec') return;
          try {
            assertions(event.data);
          } catch (error) {
            done(error);
          }
        });
      }

      function nestedFixture(child, late = false) {
        const url = 'data:text/html;charset=utf-8,' + encodeURIComponent(child);
        return (late ? '' : '<iframe sandbox="allow-scripts" src="' + url + '"></iframe>') +
          '<script>window.addEventListener("message", function (event) {' +
          'var frame = document.querySelector("iframe");' +
          'if (frame && event.source === frame.contentWindow && event.data && event.data.source === "splash-spec") {' +
          'parent.postMessage(event.data, "*");}});</script>' +
          fixtureScript('if (event.data.command === "add") {' +
            'var frame = document.createElement("iframe"); frame.setAttribute("sandbox", "allow-scripts");' +
            'frame.addEventListener("load", function () {parent.postMessage({source: "splash-spec", type: "child-added"}, "*");});' +
            'frame.src = ' + JSON.stringify(url) + '; document.body.appendChild(frame);' +
            '} else {document.querySelector("iframe").contentWindow.postMessage(event.data, "*");}');
      }

      function renderUntilClose(serverOverrides, done, assertions = () => {}) {
        let rendered, creativeWindow;
        const messages = [];
        // Chrome 113 and WebKit clear event.source when the renderer removes its frame.
        // Observe before the renderer, then assert after its message handlers have run.
        listen(event => {
          if (event.source !== creativeWindow || !event.data || event.data.source !== 'froc-display') return;
          messages.push(event.data);
          if (event.data.type !== 'close') return;
          setTimeout(() => {
            try {
              expect(rendered.overlay.isConnected).to.equal(false);
              expect(rendered.iframe.isConnected).to.equal(false);
              expect(scrollLock()).to.equal(null);
              assertions(messages);
              done();
            } catch (error) {
              done(error);
            }
          }, 0);
        });
        rendered = render(serverOverrides);
        creativeWindow = rendered.iframe.contentWindow;
        return rendered;
      }

      it('keeps HTML tracking frames hidden without blocking quiz or CTA clicks', function (done) {
        this.timeout(4000);
        const child = '<style>html,body{height:100%;margin:0}button{position:absolute;inset:0;width:100%;height:100%}</style>' +
          '<button id="quiz">Answer</button><script>' +
          'document.querySelector("button").onclick=function(){var type=this.id==="quiz"?"quiz":"cta";' +
            'this.id="cta";this.textContent="CTA";parent.postMessage({source:"tracking-frame-child",type:type},"*");};' +
          'window.addEventListener("message",function(event){if(event.source===parent&&event.data==="click"){' +
            'document.elementFromPoint(innerWidth/2,innerHeight/2).click();}});' +
          'parent.postMessage({source:"tracking-frame-child",type:"ready"},"*");</script>';
        const adm = '<style>#creative-root,.froc-display-stage{position:relative;height:100%;box-sizing:border-box}</style>' +
          '<div id="creative-root" class="froc-standard-display--interstitial"><div class="froc-display-stage">' +
          '<iframe id="quiz-frame" class="froc-display-frame" srcdoc="' + child.replace(/&/g, '&amp;').replace(/"/g, '&quot;') + '"></iframe></div></div>' +
          '<script>(function(){var creative=document.getElementById("quiz-frame"),tracker=document.createElement("iframe"),' +
            'creativeReady=false,trackerReady=false;' +
            'function report(data){data.source="splash-spec";parent.postMessage(data,"*");}' +
            'window.addEventListener("message",function(event){' +
              'if(event.source===tracker.contentWindow&&event.data==="tracker-executed")trackerReady=true;' +
              'if(event.source===creative.contentWindow&&event.data&&event.data.source==="tracking-frame-child"){' +
                'if(event.data.type==="ready")creativeReady=true;else report({type:event.data.type});' +
              '}' +
              'if(creativeReady&&trackerReady){report({type:"ready"});creativeReady=false;}' +
              'if(event.source!==parent||!event.data||event.data.source!=="splash-spec")return;' +
              'if(event.data.command==="inspect"){' +
                'var bounds=tracker.getBoundingClientRect();' +
                'report({type:"inspect",width:bounds.width,height:bounds.height,trackerExecuted:trackerReady,' +
                  'hit:document.elementFromPoint(innerWidth/2,innerHeight/2)===creative,' +
                  'creativePosition:getComputedStyle(creative).position});' +
              '}else if(event.data.command==="click")creative.contentWindow.postMessage("click","*");' +
            '});' +
            'tracker.style.position="absolute";tracker.style.width="0";tracker.style.height="0";' +
            'tracker.style.opacity="0";tracker.style.overflow="hidden";tracker.setAttribute("aria-hidden","true");' +
            'tracker.srcdoc=' + JSON.stringify('<script>parent.postMessage("tracker-executed","*");') + '+"<"+"/script>";' +
            'document.body.appendChild(tracker);' +
          '}());</script>';
        const { iframe, close } = render({ adm });
        let answers = 0;
        fixtureReports(iframe, done, report => {
          if (report.type === 'ready') command(iframe, 'inspect');
          if (report.type === 'inspect') {
            expect(report.trackerExecuted).to.equal(true);
            expect(report.width).to.be.at.most(4);
            expect(report.height).to.be.at.most(4);
            expect(report.hit).to.equal(true);
            expect(report.creativePosition).to.equal('absolute');
            command(iframe, 'click');
          }
          if (report.type === 'quiz') {
            answers++;
            command(iframe, 'click');
          }
          if (report.type === 'cta') {
            expect(answers).to.equal(1);
            close.click();
            expect(overlay()).to.equal(null);
            expect(scrollLock()).to.equal(null);
            done();
          }
        });
      });

      it('renders a full-screen dialog with a focused host close button and locks page scroll', () => {
        const { overlay: element, iframe, close } = render({ adm: '<a href="${CLICKTHROUGH}">${AUCTION_PRICE}</a>' });
        expect(element.parentNode).to.equal(document.body);
        expect(element.className).to.equal('sp-interstitial-overlay');
        expect(element.getAttribute('data-sp-owner')).to.match(OWNER);
        expect([element.getAttribute('role'), element.getAttribute('aria-modal'), element.getAttribute('aria-label')]).to.deep.equal(['dialog', 'true', 'Advertisement']);
        expect(getComputedStyle(element).position).to.equal('fixed');
        expect(iframe.className).to.equal('sp-interstitial-creative');
        expect(iframe.title).to.equal('Splash interstitial creative');
        expect(iframe.getAttribute('sandbox')).to.equal('allow-scripts allow-popups allow-popups-to-escape-sandbox');
        expect(iframe.sandbox.contains('allow-same-origin')).to.equal(false);
        expect(parse(iframe.getAttribute('srcdoc')).body.innerHTML).to.equal('<a href="">3.5</a>');
        expect(close.type).to.equal('button');
        expect(close.textContent).to.equal('Pomiń');
        expect(close.getAttribute('aria-label')).to.equal('Pomiń reklamę');
        expect(close.hidden).to.equal(false);
        expect(close.disabled).to.equal(false);
        expect(document.activeElement).to.equal(close);
        expect(scrollLock().getAttribute('data-splash-scroll-lock')).to.equal('1');
        expect(scrollLock().textContent).to.equal('html,body{overflow:hidden!important}');
        expect(document.querySelectorAll('#splash-interstitial-style')).to.have.length(1);
      });

      it('renders into the top document by default and keeps the host close button for a creative without controls', function (done) {
        this.timeout(4000);
        const bid = bidFor('interstitial', { adm: '<div></div>' });
        bid.renderer.render(bid);
        const element = overlay();
        const iframe = element.querySelector('iframe');
        const close = element.querySelector('.sp-interstitial-close');
        expect(parse(iframe.getAttribute('srcdoc')).body.innerHTML).to.equal('<div></div>');
        onLoad(iframe, done, () => {
          expect(close.hidden).to.equal(false);
          close.click();
          expect(element.isConnected).to.equal(false);
        });
      });

      it('replaces the built-in Splash bar while retaining its runtime elements and the host close', function (done) {
        this.timeout(4000);
        const adm = '<div id="creative-root" class="froc-standard-display--interstitial">' +
          '<div class="froc-display-interstitial-bar"><button class="froc-display-close" aria-label="Skip label">Pomiń</button>' +
          '<span class="froc-display-timer">10</span><span class="froc-display-interstitial-logo">Logo</span></div>' +
          '<button class="froc-display-close" id="cta">Learn more</button></div>' + fixtureScript(
          'var skip=document.querySelector(".froc-display-interstitial-bar .froc-display-close");' +
          'parent.postMessage({source:"splash-spec",bar:getComputedStyle(skip.parentElement).display,' +
            'skipRects:skip.getClientRects().length,timer:getComputedStyle(document.querySelector(".froc-display-timer")).display,' +
            'logo:getComputedStyle(document.querySelector(".froc-display-interstitial-logo")).display,' +
            'cta:getComputedStyle(document.querySelector("#cta")).display},"*");'
        );
        const { overlay: element, iframe, close } = render({ adm });
        fixtureReports(iframe, done, report => {
          expect(report.bar).to.equal('none');
          expect(report.skipRects).to.equal(0);
          expect(report.timer).not.to.equal('none');
          expect(report.logo).not.to.equal('none');
          expect(report.cta).not.to.equal('none');
          expect(close.hidden).to.equal(false);
          expect(close.disabled).to.equal(false);
          expect(getComputedStyle(close).display).not.to.equal('none');
          close.click();
          expect(element.isConnected).to.equal(false);
          expect(scrollLock()).to.equal(null);
          done();
        });
        iframe.addEventListener('load', () => command(iframe, 'inspect'), { once: true });
      });

      ['standard', 'parallax'].forEach(format => {
        it(`does not suppress a creative's controls in ${format}`, () => {
          const adm = '<div id="creative-root" class="froc-standard-display--interstitial">' +
            '<div class="froc-display-interstitial-bar"><button class="froc-display-close">Pomiń</button></div></div>';
          const bid = bidFor(format, { adm });
          if (format === 'parallax') {
            bid.element = slot;
            bid.renderer.render(bid, document);
            expect(slot.querySelector('iframe').getAttribute('srcdoc')).to.equal(adm);
          } else expect(bid.ad).to.equal(adm);
        });
      });

      [
        ['a creative without its own controls', '<div>creative</div>'],
        ['a creative with spoofed ready controls and an unwired close button', CONTROLS],
        ['a creative marked ready but configured without a close button', '<div data-froc-interstitial-controls-ready="1">no close</div>'],
        ['a creative whose close button is disabled', '<div data-froc-interstitial-controls-ready="1"><button class="froc-display-close" disabled>Close</button></div>'],
        ['a close button outside a ready controls container', '<button class="froc-display-close">Close</button>'],
      ].forEach(([title, adm]) => {
        it(`keeps the host close button visible, enabled and focused for ${title}`, function (done) {
          this.timeout(4000);
          const { overlay: element, iframe, close } = render({ adm });
          onLoad(iframe, done, () => {
            expect(close.hidden).to.equal(false);
            expect(close.disabled).to.equal(false);
            expect(getComputedStyle(close).display).not.to.equal('none');
            expect(document.activeElement).to.equal(close);
            close.click();
            expect(element.isConnected).to.equal(false);
            expect(iframe.isConnected).to.equal(false);
            expect(scrollLock()).to.equal(null);
          });
        });
      });

      it('keeps a visible, working host close button after a head script throws before ready controls', function (done) {
        this.timeout(4000);
        const failing = '<!doctype html><html><head><script>' +
          'window.bridgeReadyBeforeFailure = window.__splashPrebidInterstitialBridge === true;' +
          'throw new Error("head creative failure");' +
          '</script></head><body>' + CONTROLS + fixtureScript(
          'parent.postMessage({source: "splash-spec", bridgeReady: window.bridgeReadyBeforeFailure,' +
            'hasClose: !!document.querySelector("[data-froc-interstitial-controls-ready] .froc-display-close")}, "*");'
        ) + '</body></html>';
        const { overlay: element, iframe, close } = render({ adm: failing });
        const creativeWindow = iframe.contentWindow;
        let report;
        let reportedError = false;

        // Error notification and the fixture's report can reach the host in either order.
        function assertClose() {
          if (!report || !reportedError) return;
          try {
            expect(report.bridgeReady).to.equal(true);
            expect(report.hasClose).to.equal(true);
            expect(element.isConnected).to.equal(true);
            expect(close.textContent).to.equal('Pomiń');
            expect(close.hidden).to.equal(false);
            expect(close.disabled).to.equal(false);
            expect(getComputedStyle(close).display).not.to.equal('none');
            expect(close.getBoundingClientRect().width).to.be.greaterThan(0);
            expect(close.getBoundingClientRect().height).to.be.greaterThan(0);
            expect(document.activeElement).to.equal(close);
            close.click();
            expect(element.isConnected).to.equal(false);
            expect(iframe.isConnected).to.equal(false);
            expect(scrollLock()).to.equal(null);
            done();
          } catch (error) {
            done(error);
          }
        }

        listen(event => {
          if (event.source !== creativeWindow || !event.data || event.data.source !== 'froc-display' || event.data.type !== 'render-error') return;
          reportedError = true;
          assertClose();
        });
        fixtureReports(iframe, done, data => {
          report = data;
          assertClose();
        });
        iframe.addEventListener('load', () => command(iframe, 'inspect'), { once: true });
      });

      it('uses a full creative document\'s working controls while keeping the focused host Close ad button available', function (done) {
        this.timeout(4000);
        const adm = '<!doctype html><html><head><script>' +
          'document.addEventListener("DOMContentLoaded", function () {' +
          'document.querySelector(".froc-display-close").addEventListener("click", function () {' +
          'parent.postMessage({ source: "froc-display", type: "close" }, "*");' +
          '});});</script></head><body>' + CONTROLS + fixtureScript(
          'var close = document.querySelector("[data-froc-interstitial-controls-ready] .froc-display-close");' +
            'if (event.data.command === "inspect") parent.postMessage({source: "splash-spec", hasClose: !!close,' +
            'disabled: close.disabled, display: getComputedStyle(close).display}, "*");' +
            'if (event.data.command === "close") close.click();'
        ) + '</body></html>';
        let inspected = false;
        const { iframe, close } = renderUntilClose({ adm }, done, () => expect(inspected).to.equal(true));
        fixtureReports(iframe, done, report => {
          expect(report.hasClose).to.equal(true);
          expect(report.disabled).to.equal(false);
          expect(report.display).not.to.equal('none');
          expect(close.hidden).to.equal(false);
          expect(close.disabled).to.equal(false);
          expect(getComputedStyle(close).display).not.to.equal('none');
          expect(document.activeElement).to.equal(close);
          inspected = true;
          command(iframe, 'close');
        });
        iframe.addEventListener('load', () => command(iframe, 'inspect'), { once: true });
      });

      [
        ['throws an error', 'throw new Error("creative failure");'],
        ['has an unhandled promise rejection', 'Promise.reject(new Error("creative rejection"));'],
      ].forEach(([title, failure]) => {
        it(`keeps the host close button usable and focused when the creative ${title}`, function (done) {
          this.timeout(4000);
          const adm = CONTROLS + fixtureScript('if (event.data.command === "fail") {' + failure + '}');
          const { overlay: element, iframe, close } = render({ adm });
          const creativeWindow = iframe.contentWindow;
          listen(event => {
            if (event.source !== creativeWindow || !event.data || event.data.source !== 'froc-display' || event.data.type !== 'render-error') return;
            try {
              expect(close.hidden).to.equal(false);
              expect(close.disabled).to.equal(false);
              expect(document.activeElement).to.equal(close);
              close.click();
              expect(element.isConnected).to.equal(false);
              expect(iframe.isConnected).to.equal(false);
              expect(scrollLock()).to.equal(null);
              done();
            } catch (error) {
              done(error);
            }
          });
          iframe.addEventListener('load', () => {
            message(window, { source: 'froc-display', type: 'render-error' });
            command(iframe, 'fail');
          }, { once: true });
        });
      });

      it('keeps the host close button usable with a genuinely inaccessible sandboxed creative document', function (done) {
        this.timeout(4000);
        const { overlay: element, iframe, close } = render({ adm: CONTROLS });
        onLoad(iframe, done, () => {
          expect(iframe.contentDocument).to.equal(null);
          expect(() => iframe.contentWindow.document).to.throw();
          expect(close.hidden).to.equal(false);
          expect(close.disabled).to.equal(false);
          expect(document.activeElement).to.equal(close);
          close.click();
          expect(element.isConnected).to.equal(false);
          expect(iframe.isConnected).to.equal(false);
          expect(scrollLock()).to.equal(null);
        });
      });

      it('closes from the host button, restoring focus and releasing listeners, timer and scroll lock', () => {
        const clock = sandbox.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
        const focusTarget = root.appendChild(document.createElement('button'));
        focusTarget.focus();
        const focus = sandbox.spy(focusTarget, 'focus');
        const removeWindow = sandbox.spy(window, 'removeEventListener');
        const removeDocument = sandbox.spy(document, 'removeEventListener');
        const { overlay: element, close } = render();
        expect(clock.countTimers()).to.equal(1);
        close.click();
        expect(element.isConnected).to.equal(false);
        expect(scrollLock()).to.equal(null);
        expect(document.activeElement).to.equal(focusTarget);
        // Restoring focus must not scroll the page.
        sinon.assert.calledOnceWithExactly(focus, { preventScroll: true });
        expect(clock.countTimers()).to.equal(0);
        sinon.assert.calledWith(removeWindow, 'message', sinon.match.func);
        sinon.assert.calledWith(removeDocument, 'keydown', sinon.match.func);
        const removals = removeWindow.callCount;
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', cancelable: true }));
        expect(removeWindow.callCount).to.equal(removals);
      });

      it('does not move focus back to an element that was removed meanwhile', () => {
        const focusTarget = root.appendChild(document.createElement('button'));
        focusTarget.focus();
        const focus = sandbox.spy(focusTarget, 'focus');
        const { close } = render();
        focusTarget.remove();
        close.click();
        sinon.assert.notCalled(focus);
        expect(overlay()).to.equal(null);
      });

      it('closes on Escape in the host document and ignores other keys', () => {
        const { overlay: element } = render();
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', cancelable: true }));
        expect(element.isConnected).to.equal(true);
        const escape = new KeyboardEvent('keydown', { key: 'Escape', cancelable: true });
        document.dispatchEvent(escape);
        expect(escape.defaultPrevented).to.equal(true);
        expect(element.isConnected).to.equal(false);
        expect(scrollLock()).to.equal(null);
      });

      it('accepts creative close messages only from its own iframe', () => {
        const { overlay: element, iframe } = render();
        [
          [window, { source: 'froc-display', type: 'close' }],
          [iframe.contentWindow, { source: 'forged', type: 'close' }],
          [iframe.contentWindow, { type: 'close' }],
          [iframe.contentWindow, { source: 'froc-display', type: 'click' }],
          [iframe.contentWindow, { source: 'froc-display', type: 'custom-event' }],
          [iframe.contentWindow, null],
          [iframe.contentWindow, 'close'],
        ].forEach(([source, data]) => message(source, data));
        expect(element.isConnected).to.equal(true);
        message(iframe.contentWindow, { source: 'froc-display', type: 'close' });
        expect(element.isConnected).to.equal(false);
        expect(scrollLock()).to.equal(null);
      });

      it('closes on Escape inside the creative document through its own bridge', function (done) {
        this.timeout(4000);
        const adm = fixtureScript(
          'if (event.data.command === "inspect") {' +
          'var enter = new KeyboardEvent("keydown", {key: "Enter", cancelable: true}); document.dispatchEvent(enter);' +
          'parent.postMessage({source: "splash-spec", bridgeReady: window.__splashPrebidInterstitialBridge === true,' +
          'enterPrevented: enter.defaultPrevented}, "*");}' +
          'if (event.data.command === "escape") document.dispatchEvent(new KeyboardEvent("keydown", {key: "Escape", cancelable: true}));'
        );
        let inspected = false;
        const { overlay: element, iframe, close } = renderUntilClose({ adm }, done, () => expect(inspected).to.equal(true));
        fixtureReports(iframe, done, report => {
          expect(report.bridgeReady).to.equal(true);
          expect(report.enterPrevented).to.equal(false);
          expect(element.isConnected).to.equal(true);
          expect(document.activeElement).to.equal(close);
          inspected = true;
          command(iframe, 'escape');
        });
        iframe.addEventListener('load', () => command(iframe, 'inspect'), { once: true });
      });

      [false, true].forEach(late => {
        it(`closes on cooperative Escape inside a cross-origin child${late ? ' added after loading' : ''}`, function (done) {
          this.timeout(4000);
          // A cross-origin child's key events do not reach the creative document.
          // Its own script must send close to the creative's bridge.
          const child = '<script>document.addEventListener("keydown", function (event) {' +
            'if (event.key === "Escape") {event.preventDefault(); parent.postMessage({source: "froc-display", type: "close"}, "*");}});</script>' +
            fixtureScript('if (event.data.command === "escape") document.dispatchEvent(new KeyboardEvent("keydown", {key: "Escape", cancelable: true}));');
          const { iframe } = renderUntilClose({ adm: nestedFixture(child, late) }, done);
          fixtureReports(iframe, done, report => {
            expect(report.type).to.equal('child-added');
            command(iframe, 'escape');
          });
          iframe.addEventListener('load', () => command(iframe, late ? 'add' : 'escape'), { once: true });
        });
      });

      it('keeps the host close usable when an arbitrary cross-origin child does not cooperate on Escape', function (done) {
        this.timeout(4000);
        const child = fixtureScript(
          'var escape = new KeyboardEvent("keydown", {key: "Escape", cancelable: true}); document.dispatchEvent(escape);' +
          'parent.postMessage({source: "splash-spec", type: "escape-dispatched", prevented: escape.defaultPrevented,' +
          'bridgeReady: window.__splashPrebidInterstitialBridge === true}, "*");'
        );
        const { overlay: element, iframe, close } = render({ adm: nestedFixture(child) });
        fixtureReports(iframe, done, report => {
          expect(report.type).to.equal('escape-dispatched');
          expect(report.prevented).to.equal(false);
          expect(report.bridgeReady).to.equal(false);
          expect(element.isConnected).to.equal(true);
          expect(close.hidden).to.equal(false);
          expect(close.disabled).to.equal(false);
          expect(document.activeElement).to.equal(close);
          close.click();
          expect(element.isConnected).to.equal(false);
          expect(iframe.isConnected).to.equal(false);
          expect(scrollLock()).to.equal(null);
          done();
        });
        iframe.addEventListener('load', () => command(iframe, 'escape'), { once: true });
      });

      it('relays click, custom-event and close from real owned nested frames through the bridge', function (done) {
        this.timeout(4000);
        const child = fixtureScript('if (event.data.command !== "go") return;' +
          '["click", "custom-event", "close"].forEach(function (type) { parent.postMessage({source: "froc-display", type: type}, "*"); });');
        const { iframe } = renderUntilClose({ adm: nestedFixture(child) }, done, messages => {
          expect(messages.map(message => message.type)).to.deep.equal(['click', 'custom-event', 'close']);
        });
        iframe.addEventListener('load', () => command(iframe, 'go'), { once: true });
      });

      it('does not relay real parent, grandchild, forged or unsupported messages through the bridge', function (done) {
        this.timeout(4000);
        const grandchild = fixtureScript(
          '["click", "custom-event", "close"].forEach(function (type) {parent.parent.postMessage({source: "froc-display", type: type}, "*");});' +
          'parent.postMessage({source: "splash-spec", type: "sent"}, "*");'
        );
        const child = fixtureScript(
          'if (event.data.command !== "go") return;' +
          '[{source: "forged", type: "close"}, {source: "froc-display", type: "render-error"},' +
          '{source: "froc-display", type: "unknown"}, {type: "close"}, null, "close"].forEach(function (data) {parent.postMessage(data, "*");});' +
          'var frame = document.createElement("iframe"); frame.setAttribute("sandbox", "allow-scripts");' +
          'window.addEventListener("message", function (reply) {' +
          'if (reply.source !== frame.contentWindow || !reply.data || reply.data.source !== "splash-spec" || reply.data.type !== "sent") return;' +
          'parent.postMessage({source: "froc-display", type: "click", directChildSentinel: true}, "*");});' +
          'frame.addEventListener("load", function () {frame.contentWindow.postMessage({source: "splash-spec", command: "go"}, "*");});' +
          'frame.src = ' + JSON.stringify('data:text/html;charset=utf-8,' + encodeURIComponent(grandchild)) + '; document.body.appendChild(frame);'
        );
        let rendered, creativeWindow;
        const relayed = [];
        // Observe before runtime so an incorrectly relayed close cannot lose its source on removal.
        listen(event => {
          if (event.source !== creativeWindow) return;
          try {
            relayed.push(event.data);
            expect(relayed).to.deep.equal([{ source: 'froc-display', type: 'click', directChildSentinel: true }]);
            expect(rendered.overlay.isConnected).to.equal(true);
            expect(rendered.close.hidden).to.equal(false);
            expect(rendered.close.disabled).to.equal(false);
            expect(document.activeElement).to.equal(rendered.close);
            rendered.close.click();
            expect(rendered.overlay.isConnected).to.equal(false);
            expect(rendered.iframe.isConnected).to.equal(false);
            expect(scrollLock()).to.equal(null);
            done();
          } catch (error) {
            done(error);
          }
        });
        rendered = render({ adm: nestedFixture(child) });
        creativeWindow = rendered.iframe.contentWindow;
        rendered.iframe.addEventListener('load', () => {
          creativeWindow.postMessage({ source: 'froc-display', type: 'close' }, '*');
          command(rendered.iframe, 'go');
        }, { once: true });
      });

      it('tears down after the five minute watchdog', () => {
        const clock = sandbox.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
        const { overlay: element } = render();
        clock.tick(5 * 60 * 1000 - 1);
        expect(element.isConnected).to.equal(true);
        clock.tick(1);
        expect(element.isConnected).to.equal(false);
        expect(scrollLock()).to.equal(null);
        expect(clock.countTimers()).to.equal(0);
      });

      it('replaces its previous overlay, clearing the previous watchdog and restoring the original focus', () => {
        const clock = sandbox.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
        const focusTarget = root.appendChild(document.createElement('button'));
        focusTarget.focus();
        const first = render().overlay;
        clock.tick(1000);
        const { overlay: second, close } = render();
        expect(first.isConnected).to.equal(false);
        expect(document.querySelectorAll('.sp-interstitial-overlay[data-splash-renderer]')).to.have.length(1);
        expect(clock.countTimers()).to.equal(1);
        expect(scrollLock().getAttribute('data-splash-scroll-lock')).to.equal('1');
        clock.tick(5 * 60 * 1000 - 1000);
        expect(second.isConnected).to.equal(true);
        close.click();
        expect(document.activeElement).to.equal(focusTarget);
        expect(scrollLock()).to.equal(null);
      });

      it('releases listeners and the scroll lock when the publisher removes the overlay', async () => {
        const add = sandbox.spy(window, 'addEventListener');
        const remove = sandbox.spy(window, 'removeEventListener');
        const { overlay: element } = render();
        const onMessage = add.getCalls().find(call => call.args[0] === 'message').args[1];
        element.remove();
        await tick();
        sinon.assert.calledWith(remove, 'message', onMessage);
        expect(scrollLock()).to.equal(null);
      });

      it('reference-counts the scroll lock with a foreign lock and leaves foreign overlays alone', () => {
        const foreign = document.body.appendChild(document.createElement('div'));
        foreign.className = 'sp-interstitial-overlay';
        foreign.setAttribute('data-sp-owner', 'another-renderer');
        const lock = document.head.appendChild(document.createElement('style'));
        lock.setAttribute('data-splash-scroll-lock', '1');
        try {
          render();
          expect(lock.getAttribute('data-splash-scroll-lock')).to.equal('2');
          const { close } = render();
          expect(foreign.isConnected).to.equal(true);
          expect(lock.getAttribute('data-splash-scroll-lock')).to.equal('2');
          close.click();
          expect(lock.isConnected).to.equal(true);
          expect(lock.getAttribute('data-splash-scroll-lock')).to.equal('1');
          expect(document.querySelectorAll('style[data-splash-scroll-lock]')).to.have.length(1);
        } finally {
          foreign.remove();
          lock.remove();
        }
      });

      it('removes a stale overlay of its own without a teardown hook', () => {
        const { overlay: first, close } = render();
        const owner = first.getAttribute('data-sp-owner');
        close.click();
        const stale = document.body.appendChild(document.createElement('div'));
        stale.className = 'sp-interstitial-overlay';
        stale.setAttribute('data-sp-owner', owner);
        render();
        expect(stale.isConnected).to.equal(false);
        expect(document.querySelectorAll('#splash-interstitial-style')).to.have.length(1);
      });

      it('renders into the document passed to the renderer', () => {
        const host = root.appendChild(document.createElement('iframe'));
        const hostDocument = host.contentDocument;
        const hostWindow = host.contentWindow;
        sandbox.stub(hostWindow.HTMLImageElement.prototype, 'src').set(function (url) { this.setAttribute('data-spec-src', url); });
        const { overlay: element } = render({}, hostDocument);
        expect(element.ownerDocument).to.equal(hostDocument);
        expect(element.parentNode).to.equal(hostDocument.body);
        expect(overlay()).to.equal(null);
        expect(scrollLock()).to.equal(null);
        expect(scrollLock(hostDocument).getAttribute('data-splash-scroll-lock')).to.equal('1');
        expect(hostDocument.getElementById('splash-interstitial-style')).not.to.equal(null);
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', cancelable: true }));
        expect(element.isConnected).to.equal(true);
        hostDocument.dispatchEvent(new hostWindow.KeyboardEvent('keydown', { key: 'Escape', cancelable: true }));
        expect(element.isConnected).to.equal(false);
        expect(scrollLock(hostDocument)).to.equal(null);
      });

      it('releases everything and rethrows when writing the creative fails', () => {
        const clock = sandbox.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
        failIframeWrite();
        const logError = sandbox.stub(utils, 'logError');
        const add = sandbox.spy(window, 'addEventListener');
        const remove = sandbox.spy(window, 'removeEventListener');
        const bid = bidFor('interstitial');
        expect(() => bid.renderer.render(bid, document)).to.throw('iframe write failed');
        const onMessage = add.getCalls().find(call => call.args[0] === 'message').args[1];
        sinon.assert.calledWith(remove, 'message', onMessage);
        expect(overlay()).to.equal(null);
        expect(scrollLock()).to.equal(null);
        expect(clock.countTimers()).to.equal(0);
        sinon.assert.calledWith(logError, 'splash: interstitial render failed', sinon.match.instanceOf(Error));
      });

      it('releases the scroll lock and rethrows when the removal observer cannot start', () => {
        const disconnect = sandbox.spy();
        sandbox.stub(window, 'MutationObserver').callsFake(() => ({ observe() { throw new Error('observer unavailable'); }, disconnect }));
        const logError = sandbox.stub(utils, 'logError');
        const bid = bidFor('interstitial');
        expect(() => bid.renderer.render(bid, document)).to.throw('observer unavailable');
        sinon.assert.calledOnce(disconnect);
        expect(overlay()).to.equal(null);
        expect(scrollLock()).to.equal(null);
        sinon.assert.calledWith(logError, 'splash: interstitial render failed', sinon.match.instanceOf(Error));
      });

      describe('creative document', () => {
        function bridgeScripts(doc) {
          return Array.from(doc.querySelectorAll('script')).filter(script => script.textContent.includes('__splashPrebidInterstitialBridge'));
        }

        it('wraps fragments in a full-screen document with the bridge', () => {
          const html = srcdocFor('<header>Title</header><div>creative</div>');
          expect(html.startsWith(`<!doctype html><html><head><meta charset="utf-8"><style id="${FRAME_STYLE_ID}">`)).to.equal(true);
          expect(html.endsWith('<body><header>Title</header><div>creative</div></body></html>')).to.equal(true);
          const doc = parse(html);
          expect(doc.getElementById(FRAME_STYLE_ID).textContent).to.contain('.froc-display-stage>iframe.froc-display-frame{position:absolute!important;inset:0!important');
          expect(doc.getElementById(FRAME_STYLE_ID).textContent).not.to.contain('body iframe{');
          expect(bridgeScripts(doc)).to.have.length(1);
          expect(bridgeScripts(doc)[0].parentNode).to.equal(doc.head);
        });

        it('injects the bridge before the head scripts of full documents without touching creative scripts', () => {
          const script = 'function frameDocument(bridge, media) { return "<!doctype html><html><head>" + bridge + "</head><body>" + media + "</body></html>"; }';
          const secondScript = 'window.creativeReady = true;';
          const creative = `<!DOCTYPE html><html lang="pl"><head><title>Ad</title><script>${script}</script><script>${secondScript}</script></head><body><div id="creative-root"></div></body></html>`;
          const html = srcdocFor(creative);
          expect(html.startsWith('<!doctype html><html lang="pl"><head>')).to.equal(true);
          const doc = parse(html);
          expect(doc.querySelectorAll(`#${FRAME_STYLE_ID}`)).to.have.length(1);
          expect(bridgeScripts(doc)).to.have.length(1);
          const [bridge] = bridgeScripts(doc);
          expect(bridge.parentNode).to.equal(doc.head);
          expect(Array.from(doc.head.querySelectorAll('script')).map(script => script.textContent)).to.deep.equal([bridge.textContent, script, secondScript]);
          expect(doc.head.querySelector('title').textContent).to.equal('Ad');
          expect(doc.body.innerHTML).to.equal('<div id="creative-root"></div>');
        });

        it('adds a doctype to documents without one', () => {
          expect(srcdocFor('<html><body><p>creative</p></body></html>').startsWith('<!doctype html><html><head><script')).to.equal(true);
        });

        it('injects the bridge only once', () => {
          const prepared = srcdocFor('<div>creative</div>');
          expect(srcdocFor(prepared)).to.equal(prepared);
        });

        it('unwraps the SSP iframe around Standard Display markup', () => {
          const doc = parse(srcdocFor(SSP_WRAPPED));
          expect(doc.body.querySelector(':scope > iframe')).to.equal(null);
          expect(doc.body.querySelector(':scope > .froc-standard-display')).not.to.equal(null);
          expect(bridgeScripts(doc)).to.have.length(1);
        });

        it('falls back to the wrapper with a warning when the document cannot be parsed', () => {
          const warn = sandbox.stub(utils, 'logWarn');
          const creative = '<!doctype html><html><body><p>creative</p></body></html>';
          sandbox.stub(DOMParser.prototype, 'parseFromString').throws(new Error('parser unavailable'));
          const html = srcdocFor(creative);
          sinon.assert.calledWith(warn, 'splash: could not prepare the interstitial document', sinon.match.instanceOf(Error));
          expect(html.startsWith(`<!doctype html><html><head><meta charset="utf-8"><style id="${FRAME_STYLE_ID}">`)).to.equal(true);
          expect(html.endsWith(`<body>${creative}</body></html>`)).to.equal(true);
        });
      });
    });
  });
});
