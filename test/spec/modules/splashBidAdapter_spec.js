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
      config.setConfig({ allowTopWindowRenderers: false });
      expect(FORMATS.map(format => spec.isBidRequestValid(makeBid({ format })))).to.deep.equal([true, false, false]);
      sinon.assert.calledWith(warn, "splash: parallax requires the adapter's top-window renderer, which this configuration disables");
      sinon.assert.calledWith(warn, "splash: interstitial requires the adapter's top-window renderer, which this configuration disables");
      config.setConfig({ allowTopWindowRenderers: true });
      expect(FORMATS.every(format => spec.isBidRequestValid(makeBid({ format })))).to.equal(true);
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

    it('matches response formats case-insensitively and prefers ext.splash over ext.general', () => {
      sandbox.stub(utils, 'logWarn');
      const request = () => buildRequest(makeBid({ format: 'interstitial' }));
      const accepted = ext => respond(request(), [makeServerBid('interstitial', { ext })]).length === 1;
      expect(accepted({ splash: { format: 'INTERSTITIAL' } })).to.equal(true);
      expect(accepted({ splash: { format: 'interstitial' }, general: { display_format: 'standard' } })).to.equal(true);
      expect(accepted({ splash: { format: 'splitboard' }, general: { display_format: 'Interstitial' } })).to.equal(true);
      expect(accepted({ splash: { format: 42 }, general: { display_format: 'standard' } })).to.equal(false);
      expect(accepted({ splash: { format: 'unknown' }, general: { display_format: 'unknown' } })).to.equal(true);
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

      describe('desktop Safari pointer guard', () => {
        let intersectionObservers;

        beforeEach(() => {
          utils.isSafariBrowser.returns(true);
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
          sinon.assert.calledWith(matchMedia, '(pointer: fine) and (hover: hover)');
          expect(frame.classList.contains('sp-pointer-guarded')).to.equal(true);
          expect(getComputedStyle(iframe).position).to.equal('absolute');
          expect(getComputedStyle(iframe).pointerEvents).to.equal('auto');
          expect(getComputedStyle(frame).overflow).to.equal('hidden');
          expect(Math.abs(iframe.getBoundingClientRect().left)).to.be.lessThan(1);
          expect(Math.abs(iframe.getBoundingClientRect().top)).to.be.lessThan(1);
          expect(addWindow.calledWith('mousemove')).to.equal(false);
          expect(addWindow.calledWith('scroll')).to.equal(false);

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

        it('follows live geometry without parent pointer, scroll or resize events', () => {
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
          rect.returns([{ left: 120, top: 200 }]);
          sinon.assert.calledTwice(raf);
          raf.secondCall.args[0]();
          expect([iframe.style.left, iframe.style.top]).to.deep.equal(['-120px', '-200px']);
          sinon.assert.calledThrice(raf);
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
          expect(Math.abs(iframe.getBoundingClientRect().top)).to.be.lessThan(1);
        });

        it('realigns after a layout shift and slot reparenting without publisher events', async () => {
          sandbox.stub(window, 'matchMedia').returns({ matches: true });
          const raf = sandbox.stub(window, 'requestAnimationFrame').returns(126);
          const { frame } = render();
          intersect(frame);
          const iframe = frame.querySelector('iframe');
          root.style.marginTop = '100px';
          raf.firstCall.args[0]();
          expect(Math.abs(iframe.getBoundingClientRect().top)).to.be.lessThan(1);
          const parent = root.appendChild(document.createElement('div'));
          parent.style.cssText = 'padding-left:80px;padding-top:30px';
          parent.appendChild(slot);
          await tick();
          raf.secondCall.args[0]();
          expect(Math.abs(iframe.getBoundingClientRect().top)).to.be.lessThan(1);
          expect(Math.abs(iframe.getBoundingClientRect().left)).to.be.lessThan(1);
          expect(frame.isConnected).to.equal(true);
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

        it('sleeps offscreen and in a hidden tab, then resumes without duplicate animation frames', async () => {
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
          sinon.assert.calledThrice(raf);
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

        [
          ['outside Safari', () => utils.isSafariBrowser.returns(false)],
          ['for coarse pointers', () => sandbox.stub(window, 'matchMedia').returns({ matches: false })],
          ['without matchMedia', () => sandbox.stub(window, 'matchMedia').value(undefined)],
        ].forEach(([title, setup]) => {
          it(`is not installed ${title}`, () => {
            setup();
            const add = sandbox.spy(window, 'addEventListener');
            const { frame } = render();
            expect(frame.classList.contains('sp-pointer-guarded')).to.equal(false);
            expect(add.calledWith('scroll')).to.equal(false);
            expect(getComputedStyle(frame.querySelector('iframe')).position).to.equal('fixed');
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
        sandbox.stub(window, 'MutationObserver').callsFake(() => ({ observe() { throw new Error('observer unavailable'); }, disconnect }));
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
        window.dispatchEvent(new MessageEvent('message', { data, source }));
      }

      it('renders a full-screen dialog with a focused host close button and locks page scroll', () => {
        const { overlay: element, iframe, close } = render({ adm: '<a href="${CLICKTHROUGH}">${AUCTION_PRICE}</a>' });
        expect(element.parentNode).to.equal(document.body);
        expect(element.className).to.equal('sp-interstitial-overlay');
        expect(element.getAttribute('data-sp-owner')).to.match(OWNER);
        expect([element.getAttribute('role'), element.getAttribute('aria-modal'), element.getAttribute('aria-label')]).to.deep.equal(['dialog', 'true', 'Advertisement']);
        expect(getComputedStyle(element).position).to.equal('fixed');
        expect(iframe.className).to.equal('sp-interstitial-creative');
        expect(iframe.title).to.equal('Splash interstitial creative');
        expect(parse(iframe.getAttribute('srcdoc')).body.innerHTML).to.equal('<a href="">3.5</a>');
        expect(close.type).to.equal('button');
        expect(close.textContent).to.equal('Close ad');
        expect(close.getAttribute('aria-label')).to.equal('Close advertisement');
        expect(close.hidden).to.equal(false);
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

      [
        ['shows', 'a creative without its own controls', '<div>creative</div>', false],
        ['hides', 'a creative with ready controls and an enabled close button', CONTROLS, true],
        ['shows', 'a creative marked ready but configured without a close button', '<div data-froc-interstitial-controls-ready="1">no close</div>', false],
        ['shows', 'a creative whose close button is disabled', '<div data-froc-interstitial-controls-ready="1"><button class="froc-display-close" disabled>Close</button></div>', false],
        ['shows', 'a close button outside a ready controls container', '<button class="froc-display-close">Close</button>', false],
      ].forEach(([verb, title, adm, hidden]) => {
        it(`${verb} the host close button for ${title}`, function (done) {
          this.timeout(4000);
          const { iframe, close } = render({ adm });
          onLoad(iframe, done, () => {
            expect(close.hidden).to.equal(hidden);
            // The focused host button hands focus to the creative when the creative's own controls take over.
            expect(document.activeElement).to.equal(hidden ? iframe : close);
          });
        });
      });

      it('keeps a visible, working host close button after a head script throws before ready controls', function (done) {
        this.timeout(4000);
        const failing = '<!doctype html><html><head><script>' +
          'window.bridgeReadyBeforeFailure = window.__splashPrebidInterstitialBridge === true;' +
          'throw new Error("head creative failure");' +
          '</script></head><body>' + CONTROLS + '</body></html>';
        const { overlay: element, iframe, close } = render({ adm: failing });
        const creativeWindow = iframe.contentWindow;
        let loaded = false;
        let reportedError = false;

        // The error message and iframe load can reach the host in either order.
        function assertClose() {
          if (!loaded || !reportedError) return;
          try {
            expect(iframe.contentDocument.querySelector('[data-froc-interstitial-controls-ready="1"] .froc-display-close')).not.to.equal(null);
            expect(element.isConnected).to.equal(true);
            expect(close.textContent).to.equal('Close ad');
            expect(close.hidden).to.equal(false);
            expect(close.disabled).to.equal(false);
            expect(getComputedStyle(close).display).not.to.equal('none');
            expect(close.getBoundingClientRect().width).to.be.greaterThan(0);
            expect(close.getBoundingClientRect().height).to.be.greaterThan(0);
            close.click();
            expect(element.isConnected).to.equal(false);
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
        iframe.addEventListener('load', () => {
          try {
            expect(creativeWindow.bridgeReadyBeforeFailure).to.equal(true);
            loaded = true;
            assertClose();
          } catch (error) {
            done(error);
          }
        }, { once: true });
      });

      it('uses a full creative document\'s working controls without showing an additional Close ad button', function (done) {
        this.timeout(4000);
        const adm = '<!doctype html><html><head><script>' +
          'document.addEventListener("DOMContentLoaded", function () {' +
          'document.querySelector(".froc-display-close").addEventListener("click", function () {' +
          'parent.postMessage({ source: "froc-display", type: "close" }, "*");' +
          '});});</script></head><body>' + CONTROLS + '</body></html>';
        const { overlay: element, iframe, close } = render({ adm });
        const creativeWindow = iframe.contentWindow;
        listen(event => {
          if (event.source !== creativeWindow || !event.data || event.data.source !== 'froc-display' || event.data.type !== 'close') return;
          try {
            expect(element.isConnected).to.equal(false);
            expect(scrollLock()).to.equal(null);
            done();
          } catch (error) {
            done(error);
          }
        });
        iframe.addEventListener('load', () => {
          try {
            const creativeClose = iframe.contentDocument.querySelector('[data-froc-interstitial-controls-ready="1"] .froc-display-close');
            expect(creativeClose).not.to.equal(null);
            expect(creativeClose.disabled).to.equal(false);
            expect(creativeWindow.getComputedStyle(creativeClose).display).not.to.equal('none');
            expect(close.hidden).to.equal(true);
            expect(getComputedStyle(close).display).to.equal('none');
            expect(document.activeElement).to.equal(iframe);
            creativeClose.click();
          } catch (error) {
            done(error);
          }
        }, { once: true });
      });

      it('shows the host close button again when the creative reports an error, without moving focus', function (done) {
        this.timeout(4000);
        const failing = CONTROLS + '<script>window.addEventListener("message", function (event) { if (event.data === "fail") throw new Error("creative failure"); });</script>';
        const { iframe, close } = render({ adm: failing });
        iframe.addEventListener('load', () => {
          try {
            expect(close.hidden).to.equal(true);
            const focused = document.activeElement;
            message(window, { source: 'froc-display', type: 'render-error' });
            expect(close.hidden).to.equal(true);
            listen(event => {
              if (event.source !== iframe.contentWindow || !event.data || event.data.type !== 'render-error') return;
              try {
                expect(close.hidden).to.equal(false);
                expect(document.activeElement).to.equal(focused);
                expect(focused).not.to.equal(close);
                done();
              } catch (error) {
                done(error);
              }
            });
            iframe.contentWindow.postMessage('fail', '*');
          } catch (error) {
            done(error);
          }
        }, { once: true });
      });

      it('shows the host close button when the creative has an unhandled promise rejection', function (done) {
        this.timeout(4000);
        const rejecting = CONTROLS + '<script>window.addEventListener("message", function (event) { if (event.data === "reject") Promise.reject(new Error("creative rejection")); });</script>';
        const { iframe, close } = render({ adm: rejecting });
        iframe.addEventListener('load', () => {
          try {
            expect(close.hidden).to.equal(true);
            listen(event => {
              if (event.source !== iframe.contentWindow || !event.data || event.data.type !== 'render-error') return;
              try {
                expect(close.hidden).to.equal(false);
                done();
              } catch (error) {
                done(error);
              }
            });
            iframe.contentWindow.postMessage('reject', '*');
          } catch (error) {
            done(error);
          }
        }, { once: true });
      });

      it('shows the host close button when the creative document becomes inaccessible', function (done) {
        this.timeout(4000);
        const { iframe, close } = render({ adm: CONTROLS });
        onLoad(iframe, done, () => {
          expect(close.hidden).to.equal(true);
          Object.defineProperty(iframe, 'contentDocument', { configurable: true, get: () => null });
          iframe.dispatchEvent(new Event('load'));
          expect(close.hidden).to.equal(false);
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

      [['the creative document', iframe => iframe.contentWindow], ['an owned nested frame', iframe => iframe.contentDocument.querySelector('iframe').contentWindow]]
        .forEach(([title, target]) => {
          it(`closes on Escape inside ${title} through the bridge`, function (done) {
            this.timeout(4000);
            const { iframe } = render({ adm: '<iframe srcdoc="<button>Answer</button>"></iframe>' });
            const creativeWindow = iframe.contentWindow;
            listen(event => {
              if (event.source !== creativeWindow || !event.data || event.data.type !== 'close') return;
              try {
                expect(iframe.isConnected).to.equal(false);
                expect(scrollLock()).to.equal(null);
                done();
              } catch (error) {
                done(error);
              }
            });
            iframe.addEventListener('load', () => {
              try {
                const win = target(iframe);
                expect(win.document.__splashEscapeBound).to.equal(true);
                win.document.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'Escape', cancelable: true }));
              } catch (error) {
                done(error);
              }
            }, { once: true });
          });
        });

      it('closes on Escape inside a frame that the creative adds after loading', function (done) {
        this.timeout(4000);
        const adder = '<script>window.addEventListener("message", function (event) { if (event.data !== "add") return;' +
          'var frame = document.createElement("iframe"); frame.id = "late"; frame.srcdoc = "<button>Late</button>"; document.body.appendChild(frame); });</script>';
        const { iframe } = render({ adm: adder });
        const creativeWindow = iframe.contentWindow;
        listen(event => {
          if (event.source !== creativeWindow || !event.data || event.data.type !== 'close') return;
          try {
            expect(iframe.isConnected).to.equal(false);
            expect(scrollLock()).to.equal(null);
            done();
          } catch (error) {
            done(error);
          }
        });
        iframe.addEventListener('load', () => {
          try {
            iframe.contentDocument.addEventListener('load', event => {
              if (!event.target || event.target.id !== 'late') return;
              try {
                const win = event.target.contentWindow;
                expect(win.document.__splashEscapeBound).to.equal(true);
                win.document.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'Escape', cancelable: true }));
              } catch (error) {
                done(error);
              }
            }, true);
            creativeWindow.postMessage('add', '*');
          } catch (error) {
            done(error);
          }
        }, { once: true });
      });

      it('relays click, custom-event and close from real owned nested frames through the bridge', function (done) {
        this.timeout(4000);
        const child = '<script>window.addEventListener("message", function (event) { if (event.data !== "go") return;' +
          '["click", "custom-event", "close"].forEach(function (type) { parent.postMessage({ source: "froc-display", type: type }, "*"); }); });</script>';
        const { iframe } = render({ adm: '<iframe srcdoc="' + child.replace(/"/g, '&quot;') + '"></iframe>' });
        const creativeWindow = iframe.contentWindow;
        const relayed = [];
        listen(event => {
          if (event.source !== creativeWindow || !event.data || event.data.source !== 'froc-display') return;
          relayed.push(event.data.type);
          if (event.data.type !== 'close') return;
          try {
            expect(relayed).to.deep.equal(['click', 'custom-event', 'close']);
            expect(iframe.isConnected).to.equal(false);
            done();
          } catch (error) {
            done(error);
          }
        });
        iframe.addEventListener('load', () => {
          iframe.contentDocument.querySelector('iframe').contentWindow.postMessage('go', '*');
        }, { once: true });
      });

      it('does not relay forged or unsupported messages through the bridge', function (done) {
        this.timeout(4000);
        const { iframe } = render({ adm: '<iframe srcdoc="<div>child</div>"></iframe>' });
        onLoad(iframe, done, () => {
          const win = iframe.contentWindow;
          const child = iframe.contentDocument.querySelector('iframe').contentWindow;
          const relay = sandbox.stub(window, 'postMessage');
          try {
            [
              [window, { source: 'froc-display', type: 'close' }],
              [child, { source: 'forged', type: 'close' }],
              [child, { source: 'froc-display', type: 'render-error' }],
              [child, { source: 'froc-display', type: 'unknown' }],
              [child, null],
            ].forEach(([source, data]) => win.dispatchEvent(new win.MessageEvent('message', { data, source })));
            sinon.assert.notCalled(relay);
            const click = { source: 'froc-display', type: 'click' };
            win.dispatchEvent(new win.MessageEvent('message', { data: click, source: child }));
            sinon.assert.calledOnceWithExactly(relay, click, '*');
          } finally {
            relay.restore();
          }
          expect(iframe.isConnected).to.equal(true);
        });
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
          expect(doc.getElementById(FRAME_STYLE_ID).textContent).to.contain('body iframe{position:absolute!important;inset:0!important');
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
