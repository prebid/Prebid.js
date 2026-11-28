import { expect } from 'chai';
import { ALIASES, BIDDER_CODE, spec } from 'modules/riptideBidAdapter.js';

// SHARED_* mirror examples/headerbidding/testdata in the Riptide repository (bid_requests.json,
// ortb_request.json, ortb_response.json), the request and response its server-side adapters and
// auction tests use. Keep them identical.
const CONSENT = 'CPXxRfAPXxRfAAfKABENB-CgAAAAAAAAAAYgAAAAAAAA';
const SCHAIN = { complete: 1, ver: '1.0', nodes: [{ asi: 'publisher.example', sid: 'pub1', hp: 1 }] };

function sharedBidderRequest() {
  return {
    bidderCode: 'riptide',
    auctionId: 'auction-1',
    bidderRequestId: 'request-1',
    timeout: 500,
    gdprConsent: { gdprApplies: true, consentString: CONSENT },
    uspConsent: '1YNN',
    ortb2: {
      site: { page: 'https://publisher.example/article', domain: 'publisher.example', cat: ['IAB1'] },
      device: { ua: 'Mozilla/5.0 (X11; Linux x86_64) header-bidding-fixture/1.0', js: 1 },
      regs: { ext: { gdpr: 1, us_privacy: '1YNN' } },
      user: { ext: { consent: CONSENT } },
      source: { schain: SCHAIN },
    },
  };
}

function sharedBids() {
  return [{
    bidId: 'bid-video-1',
    adUnitCode: 'preroll',
    params: { publisherId: 'pub1', placementId: 'tag-direct' },
    mediaTypes: { video: { context: 'instream', playerSize: [[640, 480]], mimes: ['video/mp4'], minduration: 5, maxduration: 30, protocols: [2, 3, 7, 8], plcmt: 1 } },
  }, {
    bidId: 'bid-banner-1',
    adUnitCode: 'leaderboard',
    params: { publisherId: 'pub1', placementId: 'tag-direct', bidfloor: 0.25 },
    ortb2Imp: { ext: { gpid: '/1234/home/leaderboard' } },
    mediaTypes: { banner: { sizes: [[728, 90], [970, 250]] } },
  }];
}

const SHARED_ORTB_REQUEST = {
  id: 'request-1',
  test: 0,
  imp: [{
    id: 'bid-video-1',
    tagid: 'tag-direct',
    secure: 1,
    video: { mimes: ['video/mp4'], w: 640, h: 480, minduration: 5, maxduration: 30, protocols: [2, 3, 7, 8], plcmt: 1 },
  }, {
    id: 'bid-banner-1',
    tagid: 'tag-direct',
    secure: 1,
    bidfloor: 0.25,
    bidfloorcur: 'USD',
    banner: { topframe: 0, format: [{ w: 728, h: 90 }, { w: 970, h: 250 }] },
    ext: { gpid: '/1234/home/leaderboard' },
  }],
  site: { page: 'https://publisher.example/article', domain: 'publisher.example', cat: ['IAB1'], publisher: { id: 'pub1' } },
  device: { ua: 'Mozilla/5.0 (X11; Linux x86_64) header-bidding-fixture/1.0', js: 1 },
  user: { consent: CONSENT },
  regs: { gdpr: 1, us_privacy: '1YNN' },
  source: { schain: SCHAIN },
  tmax: 500,
  cur: ['USD'],
};

const SHARED_ORTB_RESPONSE = {
  id: 'request-1',
  cur: 'USD',
  seatbid: [{
    seat: 'riptide',
    bid: [{
      id: 'bid-1',
      impid: 'bid-video-1',
      price: 5.0,
      adm: '<VAST version="4.2"><Ad id="sample"><InLine><AdSystem>Riptide</AdSystem><AdTitle>Sample</AdTitle><Impression><![CDATA[https://beacon.example/impression?e=sealed]]></Impression><Creatives><Creative><Linear><Duration>00:00:15</Duration><MediaFiles><MediaFile type="video/mp4" width="1280" height="720"><![CDATA[https://cdn.example/spot.mp4]]></MediaFile></MediaFiles></Linear></Creative></Creatives></InLine></Ad></VAST>',
      adomain: ['local-dev.example'],
      crid: 'dev-vast-15',
      w: 640,
      h: 480,
      mtype: 2,
      dur: 15,
      nurl: 'https://beacon.example/win?e=sealed',
      burl: 'https://beacon.example/bill?e=sealed',
    }],
  }],
};

const PARTNER = { host: 'ads.examplepartner.example', syncHost: 'sync.examplepartner.example', gvlid: undefined };

function banner(overrides = {}) {
  return {
    bidId: 'b1',
    params: { publisherId: 'pub1', placementId: 'tag-banner' },
    mediaTypes: { banner: { sizes: [[300, 250]] } },
    ...overrides,
  };
}

function outstream(overrides = {}) {
  return {
    bidId: 'o1',
    params: { publisherId: 'pub1', placementId: 'tag-outstream' },
    mediaTypes: { video: { context: 'outstream', playerSize: [[640, 360]], mimes: ['video/mp4'] } },
    ...overrides,
  };
}

const NATIVE_REQUEST = { ver: '1.2', assets: [{ id: 1, required: 1, title: { len: 90 } }, { id: 2, required: 1, img: { type: 3, w: 1200, h: 627 } }] };

function nativeBid() {
  return {
    bidId: 'n1',
    params: { publisherId: 'pub1', placementId: 'tag-native' },
    mediaTypes: { native: { ortb: NATIVE_REQUEST } },
    nativeOrtbRequest: NATIVE_REQUEST,
  };
}

function bidderRequest(overrides = {}) {
  return { bidderCode: BIDDER_CODE, bidderRequestId: 'req-1', timeout: 300, ortb2: {}, ...overrides };
}

function build(bids, br = bidderRequest()) {
  return spec.buildRequests(bids, br);
}

function respond(request, body) {
  return spec.interpretResponse({ body }, request);
}

function seat(...bid) {
  return { id: 'req-1', cur: 'USD', seatbid: [{ seat: 'riptide', bid }] };
}

function withPartner(fn) {
  ALIASES.examplepartner = PARTNER;
  try {
    fn();
  } finally {
    delete ALIASES.examplepartner;
  }
}

describe('riptideBidAdapter', function () {
  describe('spec', function () {
    it('registers the parent code with no GVL id and no aliases', function () {
      expect(spec.code).to.equal('riptide');
      expect(spec.gvlid).to.equal(undefined);
      expect(spec.aliases).to.deep.equal([]);
      expect(spec.supportedMediaTypes).to.deep.equal(['banner', 'video', 'native']);
      expect(spec.disclosureURL).to.equal('local://modules/riptideBidAdapter.json');
      expect(ALIASES.riptide).to.deep.equal({ host: 'serve.riptideads.com', syncHost: 'sync.riptideads.com', gvlid: undefined });
    });
  });

  describe('isBidRequestValid', function () {
    const cases = [
      ['both ids', { publisherId: 'p', placementId: 't' }, true],
      ['a numeric floor', { publisherId: 'p', placementId: 't', bidfloor: 0.5 }, true],
      ['a zero floor', { publisherId: 'p', placementId: 't', bidfloor: 0 }, true],
      ['no placementId', { publisherId: 'p' }, false],
      ['no publisherId', { placementId: 't' }, false],
      ['an empty id', { publisherId: '', placementId: 't' }, false],
      ['a numeric id', { publisherId: 1, placementId: 't' }, false],
      ['a string floor', { publisherId: 'p', placementId: 't', bidfloor: '0.5' }, false],
      ['a negative floor', { publisherId: 'p', placementId: 't', bidfloor: -1 }, false],
    ];
    cases.forEach(([name, params, valid]) => {
      it(`is ${valid} for ${name}`, function () {
        expect(spec.isBidRequestValid({ params })).to.equal(valid);
      });
    });

    it('rejects a bid without params', function () {
      expect(spec.isBidRequestValid({})).to.equal(false);
    });
  });

  describe('buildRequests', function () {
    it('builds the shared OpenRTB 2.6 request, with consent and the supply chain at their 2.6 locations', function () {
      const requests = spec.buildRequests(sharedBids(), sharedBidderRequest());
      expect(requests).to.have.lengthOf(1);
      expect(requests[0].method).to.equal('POST');
      expect(requests[0].url).to.equal('https://serve.riptideads.com/ortb');
      expect(requests[0].options).to.deep.equal({ contentType: 'text/plain', withCredentials: false });
      expect(requests[0].data).to.deep.equal(SHARED_ORTB_REQUEST);
    });

    const credentialCases = [
      ['no consent data', undefined, true],
      ['GDPR does not apply', { gdprApplies: false }, true],
      ['GDPR with purpose 1 consent', { gdprApplies: true, vendorData: { purpose: { consents: { 1: true } } } }, true],
      ['GDPR without purpose 1 consent', { gdprApplies: true, vendorData: { purpose: { consents: { 1: false } } } }, false],
      ['GDPR without vendor data', { gdprApplies: true, consentString: 'CONSENT' }, false],
    ];
    credentialCases.forEach(([name, gdprConsent, withCredentials]) => {
      it(`sends cookies only with device access: ${name}`, function () {
        const [request] = build([banner()], bidderRequest({ gdprConsent }));
        expect(request.options).to.deep.equal({ contentType: 'text/plain', withCredentials });
      });
    });

    it('builds a banner imp from the ad unit sizes', function () {
      const [{ data }] = build([banner()]);
      expect(data.imp[0].id).to.equal('b1');
      expect(data.imp[0].tagid).to.equal('tag-banner');
      expect(data.imp[0].banner.format).to.deep.equal([{ w: 300, h: 250 }]);
      expect(data.imp[0].video).to.equal(undefined);
    });

    it('builds a native imp from the native ORTB 1.2 request', function () {
      const [{ data }] = build([nativeBid()]);
      expect(data.imp[0].native).to.deep.equal({ request: JSON.stringify(NATIVE_REQUEST), ver: '1.2' });
      expect(data.imp[0].tagid).to.equal('tag-native');
    });

    it('sends a multi-format ad unit as one imp carrying banner and video', function () {
      const [{ data }] = build([banner({ mediaTypes: { banner: { sizes: [[300, 250]] }, video: { context: 'outstream', playerSize: [[640, 360]], mimes: ['video/mp4'] } } })]);
      expect(data.imp).to.have.lengthOf(1);
      expect(data.imp[0].banner.format).to.deep.equal([{ w: 300, h: 250 }]);
      expect(data.imp[0].video).to.deep.include({ w: 640, h: 360, mimes: ['video/mp4'], plcmt: 4 });
    });

    it('forwards ortb2Imp: gpid, instl and rwdd', function () {
      const [{ data }] = build([banner({ ortb2Imp: { instl: 1, rwdd: 1, ext: { gpid: '/1/home', data: { pbadslot: '/1/home' } } } })]);
      expect(data.imp[0].instl).to.equal(1);
      expect(data.imp[0].rwdd).to.equal(1);
      expect(data.imp[0].ext.gpid).to.equal('/1/home');
      expect(data.imp[0].ext.data).to.deep.equal({ pbadslot: '/1/home' });
    });

    it('forwards first-party data: site, content, user data, eids and the DSA object', function () {
      const eids = [
        { source: 'pubcid.org', uids: [{ id: 'shared-1', atype: 1 }] },
        { source: 'uidapi.com', uids: [{ id: 'uid2-1', atype: 3 }] },
        { source: 'id5-sync.com', uids: [{ id: 'id5-1', atype: 1 }] },
      ];
      const dsa = { dsarequired: 2, pubrender: 0, datatopub: 1, transparency: [{ domain: 'publisher.example', dsaparams: [1] }] };
      const ortb2 = {
        site: { page: 'https://publisher.example/a', keywords: 'news', content: { language: 'en', data: [{ name: 'seg.example', segment: [{ id: '1' }] }] } },
        user: { keywords: 'sports', data: [{ name: 'dmp.example', segment: [{ id: '7' }] }], eids },
        regs: { ext: { dsa } },
      };
      const [{ data }] = build([banner()], bidderRequest({ ortb2 }));
      expect(data.site).to.deep.equal({ ...ortb2.site, publisher: { id: 'pub1' } });
      expect(data.user.eids).to.deep.equal(eids);
      expect(data.user.data).to.deep.equal(ortb2.user.data);
      expect(data.user.keywords).to.equal('sports');
      expect(data.regs.ext.dsa).to.deep.equal(dsa);
    });

    it('keeps eids Prebid placed at user.ext.eids', function () {
      const eids = [{ source: 'pubcid.org', uids: [{ id: 'shared-1', atype: 1 }] }];
      const [{ data }] = build([banner()], bidderRequest({ ortb2: { user: { ext: { eids } } } }));
      expect(data.user.ext.eids).to.deep.equal(eids);
    });

    it('prefers the price floors module floor in USD over params.bidfloor', function () {
      const calls = [];
      const getFloor = (req) => { calls.push(req); return { floor: 1.25, currency: 'USD' }; };
      const [{ data }] = build([banner({ params: { publisherId: 'p', placementId: 't', bidfloor: 0.1 }, getFloor })]);
      expect(calls).to.deep.equal([{ currency: 'USD', mediaType: '*', size: '*' }]);
      expect(data.imp[0].bidfloor).to.equal(1.25);
      expect(data.imp[0].bidfloorcur).to.equal('USD');
    });

    it('falls back to params.bidfloor when the floors module has no USD floor', function () {
      const [{ data }] = build([banner({ params: { publisherId: 'p', placementId: 't', bidfloor: 0.1 }, getFloor: () => ({}) })]);
      expect(data.imp[0].bidfloor).to.equal(0.1);
      expect(data.imp[0].bidfloorcur).to.equal('USD');
      const [{ data: none }] = build([banner()]);
      expect(none.imp[0].bidfloor).to.equal(undefined);
    });

    it('keeps an app or DOOH request on its own publisher object', function () {
      const [{ data }] = build([banner()], bidderRequest({ ortb2: { app: { bundle: 'com.example.app', publisher: { name: 'Example' } } } }));
      expect(data.app).to.deep.equal({ bundle: 'com.example.app', publisher: { name: 'Example', id: 'pub1' } });
      expect(data.site).to.equal(undefined);
      const [{ data: dooh }] = build([banner()], bidderRequest({ ortb2: { dooh: { venuetype: ['transit'] } } }));
      expect(dooh.dooh).to.deep.equal({ venuetype: ['transit'], publisher: { id: 'pub1' } });
      expect(dooh.site).to.equal(undefined);
    });

    it('sends one request per publisher', function () {
      const requests = build([banner(), banner({ bidId: 'b2', params: { publisherId: 'pub2', placementId: 't2' } })]);
      expect(requests.map((r) => [r.data.site.publisher.id, r.data.imp.map((i) => i.id)])).to.deep.equal([['pub1', ['b1']], ['pub2', ['b2']]]);
    });

    it('takes consent from the consent objects when first-party data carries none', function () {
      const gpp = 'DBACNY~CPXxRfAPXxRfAAfKABENB-CgAAAAAAAAAAYgAAAAAAAA~1YNN';
      const [{ data }] = build([banner()], bidderRequest({
        gdprConsent: { gdprApplies: false, consentString: 'CONSENT' },
        uspConsent: '1---',
        gppConsent: { gppString: gpp, applicableSections: [2, 6] },
        ortb2: { regs: { coppa: 1 } },
      }));
      expect(data.regs).to.deep.equal({ coppa: 1, gdpr: 0, us_privacy: '1---', gpp, gpp_sid: [2, 6] });
      expect(data.user).to.deep.equal({ consent: 'CONSENT' });
    });

    it('moves a 2.5 source.ext.schain to source.schain and leaves no empty objects', function () {
      const [{ data }] = build([banner()], bidderRequest({ ortb2: { source: { tid: 't', ext: { schain: SCHAIN } } } }));
      expect(data.source.schain).to.deep.equal(SCHAIN);
      expect(data.source.ext).to.equal(undefined);
      const [{ data: bare }] = build([banner()]);
      expect(bare.regs).to.equal(undefined);
      expect(bare.user).to.equal(undefined);
    });

    it('sends an alias to its own host and an unknown code nowhere', function () {
      withPartner(() => {
        const [request] = build([banner()], bidderRequest({ bidderCode: 'examplepartner' }));
        expect(request.url).to.equal('https://ads.examplepartner.example/ortb');
      });
      expect(build([banner()], bidderRequest({ bidderCode: 'unlisted' }))).to.deep.equal([]);
      expect(build([])).to.deep.equal([]);
    });
  });

  describe('video', function () {
    it('sends an outstream ad unit as plcmt 4 and an instream one as plcmt 1', function () {
      const instream = outstream({ bidId: 'i1', mediaTypes: { video: { context: 'instream', playerSize: [[640, 360]], mimes: ['video/mp4'] } } });
      const [request] = build([outstream(), instream]);
      expect(request.data.imp.map((imp) => [imp.id, imp.video.plcmt])).to.deep.equal([['o1', 4], ['i1', 1]]);
    });

    it("keeps the ad unit's own plcmt", function () {
      const [request] = build([outstream({ mediaTypes: { video: { context: 'outstream', plcmt: 3, playerSize: [[640, 360]], mimes: ['video/mp4'] } } })]);
      expect(request.data.imp[0].video.plcmt).to.equal(3);
    });

    it('returns VAST markup with no renderer and no vastUrl, so Prebid uses the ad unit renderer', function () {
      const [request] = build([outstream()]);
      const [bid] = respond(request, seat({ id: 'x', impid: 'o1', price: 4, adm: '<VAST version="4.2"></VAST>', mtype: 2, w: 640, h: 360, crid: 'c3', nurl: 'https://n.example/w' }));
      expect(bid.requestId).to.equal('o1');
      expect(bid.mediaType).to.equal('video');
      expect(bid.cpm).to.equal(4);
      expect(bid.playerWidth).to.equal(640);
      expect(bid.playerHeight).to.equal(360);
      expect(bid.vastXml).to.equal('<VAST version="4.2"></VAST>');
      expect(bid.vastUrl).to.equal(undefined);
      expect(bid.renderer).to.equal(undefined);
    });
  });

  describe('interpretResponse', function () {
    it('parses the shared response: video by mtype, VAST markup, nurl and burl passed through', function () {
      const [request] = spec.buildRequests(sharedBids(), sharedBidderRequest());
      const out = respond(request, SHARED_ORTB_RESPONSE);
      expect(out).to.have.lengthOf(1);
      const bid = out[0];
      expect(bid.requestId).to.equal('bid-video-1');
      expect(bid.cpm).to.equal(5);
      expect(bid.currency).to.equal('USD');
      expect(bid.width).to.equal(640);
      expect(bid.height).to.equal(480);
      expect(bid.playerWidth).to.equal(640);
      expect(bid.playerHeight).to.equal(480);
      expect(bid.creativeId).to.equal('dev-vast-15');
      expect(bid.mediaType).to.equal('video');
      expect(bid.netRevenue).to.equal(true);
      expect(bid.ttl).to.equal(300);
      expect(bid.duration).to.equal(15);
      expect(bid.nurl).to.equal('https://beacon.example/win?e=sealed');
      expect(bid.burl).to.equal('https://beacon.example/bill?e=sealed');
      expect(bid.meta.advertiserDomains).to.deep.equal(['local-dev.example']);
      expect(bid.vastXml).to.contain('<VAST');
      expect(bid.vastUrl).to.equal(undefined);
    });

    it('parses a banner bid, firing nurl as a pixel ahead of the markup, with its deal id', function () {
      const [request] = build([banner()]);
      const [bid] = respond(request, seat({ id: 'x', impid: 'b1', price: 1.5, adm: '<div>ad</div>', mtype: 1, w: 300, h: 250, crid: 'c1', dealid: 'deal-1', nurl: 'https://n.example/w', exp: 60, adomain: ['brand.example'] }));
      expect(bid.mediaType).to.equal('banner');
      expect(bid.cpm).to.equal(1.5);
      expect(bid.currency).to.equal('USD');
      expect(bid.netRevenue).to.equal(true);
      expect(bid.width).to.equal(300);
      expect(bid.height).to.equal(250);
      expect(bid.dealId).to.equal('deal-1');
      expect(bid.ttl).to.equal(60);
      expect(bid.nurl).to.equal('https://n.example/w');
      expect(bid.meta.advertiserDomains).to.deep.equal(['brand.example']);
      expect(bid.ad).to.contain('<img src="https://n.example/w">');
      expect(bid.ad.endsWith('<div>ad</div>')).to.equal(true);
    });

    it('parses a native bid into its ORTB native response', function () {
      const [request] = build([nativeBid()]);
      const adm = { ver: '1.2', assets: [{ id: 1, title: { text: 'Hello' } }, { id: 2, img: { url: 'https://cdn.example/i.png', w: 1200, h: 627 } }], link: { url: 'https://click.example' } };
      const [bid] = respond(request, seat({ id: 'x', impid: 'n1', price: 2, adm: JSON.stringify(adm), mtype: 4, crid: 'c2' }));
      expect(bid.mediaType).to.equal('native');
      expect(bid.native).to.deep.equal({ ortb: adm });
    });

    it('types a bid without mtype by its single-format imp and drops it for a multi-format imp', function () {
      const multi = banner({ bidId: 'm1', mediaTypes: { banner: { sizes: [[300, 250]] }, video: { playerSize: [640, 480], mimes: ['video/mp4'] } } });
      const [request] = build([banner(), multi]);
      const out = respond(request, seat(
        { id: 'x', impid: 'b1', price: 1, adm: '<div/>', crid: 'c' },
        { id: 'y', impid: 'm1', price: 1, adm: '<div/>', crid: 'c' },
      ));
      expect(out.map((b) => [b.requestId, b.mediaType])).to.deep.equal([['b1', 'banner']]);
    });

    it('types a multi-format bid by its mtype', function () {
      const multi = banner({ bidId: 'm1', mediaTypes: { banner: { sizes: [[300, 250]] }, video: { playerSize: [640, 480], mimes: ['video/mp4'] } } });
      const [request] = build([multi]);
      const [bid] = respond(request, seat({ id: 'y', impid: 'm1', price: 1, adm: '<VAST/>', mtype: 2, crid: 'c' }));
      expect(bid.mediaType).to.equal('video');
      expect(bid.vastXml).to.equal('<VAST/>');
    });

    it('drops a bid for an unknown imp and a native bid without assets', function () {
      const [request] = build([banner(), nativeBid()]);
      expect(respond(request, seat(
        { id: 'u', impid: 'nope', price: 1, adm: '<div/>', mtype: 1, crid: 'c' },
        { id: 'n', impid: 'n1', price: 1, adm: '{}', mtype: 4, crid: 'c' },
      ))).to.deep.equal([]);
    });

    it('answers a 204 and a coded no-bid with no bids', function () {
      const [request] = build([banner()]);
      expect(spec.interpretResponse({ body: undefined }, request)).to.deep.equal([]);
      expect(spec.interpretResponse({ body: '' }, request)).to.deep.equal([]);
      expect(spec.interpretResponse(undefined, request)).to.deep.equal([]);
      expect(respond(request, { id: 'req-1', nbr: 2 })).to.deep.equal([]);
    });
  });

  describe('getUserSyncs', function () {
    const both = { iframeEnabled: true, pixelEnabled: true };
    const sync = (query) => `https://sync.riptideads.com/usersync${query}`;
    const purpose1 = (granted) => ({ gdprApplies: true, consentString: 'CO a/b', vendorData: { purpose: { consents: { 1: granted } } } });

    const consentCases = [
      ['no consent', [undefined, undefined, undefined], ''],
      ['GDPR applies, with purpose 1', [purpose1(true), undefined, undefined], '?gdpr=1&gdpr_consent=CO%20a%2Fb'],
      ['GDPR applies, without purpose 1', [purpose1(false), undefined, undefined], '?gdpr=1&gdpr_consent=CO%20a%2Fb'],
      ['GDPR does not apply', [{ gdprApplies: false }, undefined, undefined], '?gdpr=0'],
      ['US Privacy 1YYN', [undefined, '1YYN', undefined], '?us_privacy=1YYN'],
      ['GPP', [undefined, undefined, { gppString: 'DBABMA~1YNN', applicableSections: [7, 8] }], '?gpp=DBABMA~1YNN&gpp_sid=7%2C8'],
      ['empty signals', [{ gdprApplies: false }, '', { gppString: '', applicableSections: [] }], '?gdpr=0'],
    ];
    consentCases.forEach(([name, [gdpr, usp, gpp], query]) => {
      it(`returns one image sync with the page's consent: ${name}`, function () {
        expect(spec.getUserSyncs(both, [], gdpr, usp, gpp)).to.deep.equal([{ type: 'image', url: sync(query) }]);
      });
    });

    it('returns an iframe sync when only iframes are allowed', function () {
      expect(spec.getUserSyncs({ iframeEnabled: true, pixelEnabled: false }, [], { gdprApplies: true, consentString: 'C' }))
        .to.deep.equal([{ type: 'iframe', url: sync('?gdpr=1&gdpr_consent=C') }]);
    });

    it('syncs nothing when neither sync type is allowed', function () {
      expect(spec.getUserSyncs({ iframeEnabled: false, pixelEnabled: false }, [], purpose1(true))).to.deep.equal([]);
    });

    it("uses the syncing alias's host, and the parent's for a code it does not know", function () {
      withPartner(() => {
        const alias = { ...spec, code: 'examplepartner' };
        expect(alias.getUserSyncs({ pixelEnabled: true }, [])[0].url).to.equal('https://sync.examplepartner.example/usersync');
      });
      expect({ ...spec, code: 'unlisted' }.getUserSyncs({ pixelEnabled: true }, [])[0].url).to.equal('https://sync.riptideads.com/usersync');
    });
  });
});
