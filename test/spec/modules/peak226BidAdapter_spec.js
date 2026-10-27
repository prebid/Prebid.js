import { expect } from 'chai';
import { spec } from 'modules/peak226BidAdapter.js';
import { BANNER, VIDEO, NATIVE } from 'src/mediaTypes.js';
import { config } from 'src/config.js';
// load the module that registers the ORTB imp.bidfloor processor
import 'modules/priceFloors.js';

const ENDPOINTS = {
  us: 'https://us.a.viddea.com/edge_direct',
  eu: 'https://eu.a.viddea.com/edge_direct',
  jp: 'https://jp.a.viddea.com/edge_direct',
};

const DEFAULT_PARAMS = { publisherId: 'pub-test', placementId: 'plc-test' };

function bannerBid(params = DEFAULT_PARAMS, overrides = {}) {
  return {
    bidder: 'peak226',
    bidId: 'bid-banner-1',
    adUnitCode: 'div-banner',
    transactionId: 'tx-1',
    auctionId: 'auc-1',
    params,
    mediaTypes: { banner: { sizes: [[300, 250], [728, 90]] } },
    ortb2Imp: { ext: { gpid: '/1234/home#div-banner' } },
    ...overrides,
  };
}

function videoBid(context = 'outstream', params = DEFAULT_PARAMS) {
  return {
    bidder: 'peak226',
    bidId: 'bid-video-1',
    adUnitCode: 'div-video',
    transactionId: 'tx-2',
    auctionId: 'auc-1',
    params,
    mediaTypes: {
      video: {
        context,
        playerSize: [[640, 480]],
        mimes: ['video/mp4'],
        protocols: [2, 3, 5, 6],
        api: [2],
        plcmt: context === 'instream' ? 1 : 4,
      },
    },
  };
}

const NATIVE_ASSETS = [
  { id: 1, required: 1, title: { len: 80 } },
  { id: 2, required: 1, img: { type: 3, w: 300, h: 250 } },
];

function nativeBid(params = DEFAULT_PARAMS) {
  return {
    bidder: 'peak226',
    bidId: 'bid-native-1',
    adUnitCode: 'div-native',
    transactionId: 'tx-3',
    auctionId: 'auc-1',
    params,
    mediaTypes: { native: { ortb: { assets: NATIVE_ASSETS } } },
    // normally populated by core from mediaTypes.native ahead of buildRequests
    nativeOrtbRequest: { assets: NATIVE_ASSETS },
  };
}

// A single ad unit declaring all three formats at once.
function multiFormatBid(params = DEFAULT_PARAMS) {
  return {
    bidder: 'peak226',
    bidId: 'bid-multi-1',
    adUnitCode: 'div-multi',
    transactionId: 'tx-4',
    auctionId: 'auc-1',
    params,
    mediaTypes: {
      banner: bannerBid().mediaTypes.banner,
      video: videoBid('outstream').mediaTypes.video,
      native: nativeBid().mediaTypes.native,
    },
    nativeOrtbRequest: nativeBid().nativeOrtbRequest,
    ortb2Imp: { ext: { gpid: '/1234/home#div-multi' } },
  };
}

function bidderRequest(bids, ortb2 = {}) {
  return {
    bidderCode: 'peak226',
    bidderRequestId: 'breq-1',
    auctionId: 'auc-1',
    timeout: 1000,
    refererInfo: { page: 'https://example.com/article', domain: 'example.com', ref: '' },
    ortb2: { site: { domain: 'example.com', page: 'https://example.com/article' }, ...ortb2 },
    bids,
  };
}

function ortbBid(overrides = {}) {
  return {
    impid: 'bid-banner-1',
    price: 3.21,
    crid: 'cr-9',
    adomain: ['acme.com'],
    w: 300,
    h: 250,
    adm: '<div>ad</div>',
    mtype: 1,
    ...overrides,
  };
}

function ortbResponse(bids, extra = {}) {
  return { body: { id: 'breq-1', cur: 'USD', seatbid: [{ seat: 'peak226', bid: bids }], ...extra } };
}

describe('peak226BidAdapter', function () {
  afterEach(function () {
    config.resetConfig();
  });

  describe('spec', function () {
    it('has the right code, gvlid and media types', function () {
      expect(spec.code).to.equal('peak226');
      expect(spec.gvlid).to.equal(1202);
      expect(spec.supportedMediaTypes).to.have.members([BANNER, VIDEO, NATIVE]);
    });

    it('does not register user syncs', function () {
      expect(spec.getUserSyncs).to.be.undefined;
    });
  });

  describe('isBidRequestValid', function () {
    it('accepts a bid with publisherId and placementId', function () {
      expect(spec.isBidRequestValid(bannerBid())).to.equal(true);
    });

    it('accepts numeric ids', function () {
      expect(spec.isBidRequestValid(bannerBid({ publisherId: 123, placementId: 456 }))).to.equal(true);
    });

    it('rejects when params are missing', function () {
      const bid = bannerBid();
      delete bid.params;
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('rejects when publisherId is missing or empty in both params and ortb2', function () {
      expect(spec.isBidRequestValid(bannerBid({ placementId: 'plc-test' }))).to.equal(false);
      expect(spec.isBidRequestValid(bannerBid({ publisherId: '', placementId: 'plc-test' }))).to.equal(false);
    });

    it('rejects when placementId is missing or empty in params, ortb2Imp.tagid and ortb2Imp.ext.gpid', function () {
      expect(spec.isBidRequestValid(bannerBid({ publisherId: 'pub-test' }, { ortb2Imp: {} }))).to.equal(false);
      expect(spec.isBidRequestValid(bannerBid({ publisherId: 'pub-test', placementId: '' }, { ortb2Imp: {} }))).to.equal(false);
    });

    it('accepts a bid with no placementId or tagid when ortb2Imp.ext.gpid supplies the id', function () {
      const bid = bannerBid({ publisherId: 'pub-test' });
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('accepts a bid with no params when ortb2 and ortb2Imp supply the ids', function () {
      ['site', 'app', 'dooh'].forEach((section) => {
        const bid = bannerBid(undefined, {
          ortb2: { [section]: { publisher: { id: 'pub-fpd' } } },
          ortb2Imp: { tagid: 'tag-fpd' },
        });
        delete bid.params;
        expect(spec.isBidRequestValid(bid), section).to.equal(true);
      });
    });

    it('accepts a bid that mixes params with ortb2-supplied ids', function () {
      const fromOrtb2Publisher = bannerBid({ placementId: 'plc-test' }, {
        ortb2: { site: { publisher: { id: 'pub-fpd' } } },
      });
      expect(spec.isBidRequestValid(fromOrtb2Publisher)).to.equal(true);

      const fromOrtb2Tagid = bannerBid({ publisherId: 'pub-test' }, { ortb2Imp: { tagid: 'tag-fpd' } });
      expect(spec.isBidRequestValid(fromOrtb2Tagid)).to.equal(true);
    });

    it('rejects when ortb2 carries a client section without a publisher id', function () {
      const bid = bannerBid({ placementId: 'plc-test' }, { ortb2: { site: { domain: 'example.com' } } });
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('does not validate media types (core does)', function () {
      const bid = multiFormatBid();
      bid.mediaTypes.video.mimes = [];
      expect(spec.isBidRequestValid(bid)).to.equal(true);
      expect(spec.isBidRequestValid(videoBid())).to.equal(true);
      expect(spec.isBidRequestValid(nativeBid())).to.equal(true);
    });
  });

  describe('buildRequests', function () {
    it('builds a single POST request to the default (us) endpoint', function () {
      const bids = [bannerBid()];
      const requests = spec.buildRequests(bids, bidderRequest(bids));
      expect(requests).to.have.lengthOf(1);
      expect(requests[0].method).to.equal('POST');
      expect(requests[0].url).to.equal(ENDPOINTS.us);
    });

    it('routes to the endpoint matching params.region', function () {
      ['eu', 'jp'].forEach((region) => {
        const bids = [bannerBid({ ...DEFAULT_PARAMS, region })];
        const [request] = spec.buildRequests(bids, bidderRequest(bids));
        expect(request.url).to.equal(ENDPOINTS[region]);
      });
    });

    it('falls back to the us endpoint for an unknown region', function () {
      const bids = [bannerBid({ ...DEFAULT_PARAMS, region: 'mars' })];
      const [request] = spec.buildRequests(bids, bidderRequest(bids));
      expect(request.url).to.equal(ENDPOINTS.us);
    });

    it('produces an ORTB body with imp, tmax and site.publisher.id', function () {
      const bids = [bannerBid({ publisherId: 'pub-abc', placementId: 'plc-test' })];
      const [{ data }] = spec.buildRequests(bids, bidderRequest(bids));
      expect(data.imp).to.be.an('array').with.lengthOf(1);
      expect(data.tmax).to.equal(1000);
      expect(data.site.publisher.id).to.equal('pub-abc');
      expect(data.site.domain).to.equal('example.com');
    });

    it('stringifies numeric publisherId and placementId', function () {
      const bids = [bannerBid({ publisherId: 123, placementId: 456 })];
      const [{ data }] = spec.buildRequests(bids, bidderRequest(bids));
      expect(data.site.publisher.id).to.equal('123');
      expect(data.imp[0].tagid).to.equal('456');
    });

    it('sets publisher.id on app when the request is an app request', function () {
      const bids = [bannerBid()];
      const breq = bidderRequest(bids);
      breq.ortb2 = { app: { bundle: 'com.example.app' } };
      const [{ data }] = spec.buildRequests(bids, breq);
      expect(data.app.publisher.id).to.equal('pub-test');
      expect(data.site).to.be.undefined;
    });

    it('sets a banner imp with format, tagid from placementId and gpid', function () {
      const bids = [bannerBid({ publisherId: 'pub-test', placementId: 'home-atf' })];
      const [{ data }] = spec.buildRequests(bids, bidderRequest(bids));
      expect(data.imp[0].banner.format).to.deep.equal([{ w: 300, h: 250 }, { w: 728, h: 90 }]);
      expect(data.imp[0].tagid).to.equal('home-atf');
      expect(data.imp[0].ext.gpid).to.equal('/1234/home#div-banner');
    });

    it('sets publisher.id on dooh when the request is a dooh request', function () {
      const bids = [bannerBid()];
      const breq = bidderRequest(bids);
      breq.ortb2 = { dooh: { venuetype: ['airport'] } };
      const [{ data }] = spec.buildRequests(bids, breq);
      expect(data.dooh.publisher.id).to.equal('pub-test');
      expect(data.site).to.be.undefined;
      expect(data.app).to.be.undefined;
    });

    it('uses the ortb2 publisher id and ortb2Imp.tagid when no params are given', function () {
      const bid = bannerBid(undefined, { ortb2Imp: { tagid: 'tag-fpd' } });
      delete bid.params;
      const breq = bidderRequest([bid], { site: { publisher: { id: 'pub-fpd' } } });
      bid.ortb2 = breq.ortb2;
      const requests = spec.buildRequests([bid], breq);
      expect(requests).to.have.lengthOf(1);
      expect(requests[0].url).to.equal(ENDPOINTS.us);
      expect(requests[0].data.site.publisher.id).to.equal('pub-fpd');
      expect(requests[0].data.imp[0].tagid).to.equal('tag-fpd');
    });

    it('lets params override the ortb2 publisher id and ortb2Imp.tagid', function () {
      const bid = bannerBid({ publisherId: 'pub-param', placementId: 'plc-param' }, {
        ortb2Imp: { tagid: 'tag-fpd' },
      });
      const breq = bidderRequest([bid], { site: { publisher: { id: 'pub-fpd' } } });
      bid.ortb2 = breq.ortb2;
      const [{ data }] = spec.buildRequests([bid], breq);
      expect(data.site.publisher.id).to.equal('pub-param');
      expect(data.imp[0].tagid).to.equal('plc-param');
    });

    it('splits bids whose ortb2 publisher ids differ into separate requests', function () {
      const first = bannerBid(undefined, {
        ortb2: { site: { publisher: { id: 'pub-a' } } },
        ortb2Imp: { tagid: 'tag-a' },
      });
      const second = bannerBid(undefined, {
        bidId: 'bid-banner-2',
        adUnitCode: 'div-banner-2',
        ortb2: { site: { publisher: { id: 'pub-b' } } },
        ortb2Imp: { tagid: 'tag-b' },
      });
      [first, second].forEach((bid) => delete bid.params);
      const bids = [first, second];
      const requests = spec.buildRequests(bids, bidderRequest(bids));
      expect(requests).to.have.lengthOf(2);
      expect(requests.map((r) => r.data.imp[0].tagid)).to.have.members(['tag-a', 'tag-b']);
    });

    it('forwards price floors in USD', function () {
      const bid = bannerBid();
      bid.getFloor = ({ currency }) => ({ floor: 1.25, currency });
      const bids = [bid];
      const [{ data }] = spec.buildRequests(bids, bidderRequest(bids));
      expect(data.imp[0].bidfloor).to.equal(1.25);
      expect(data.imp[0].bidfloorcur).to.equal('USD');
    });

    if (FEATURES.VIDEO) {
      it('builds a video imp from mediaTypes.video', function () {
        const bids = [videoBid('instream')];
        const [{ data }] = spec.buildRequests(bids, bidderRequest(bids));
        expect(data.imp).to.have.lengthOf(1);
        expect(data.imp[0].video.mimes).to.deep.equal(['video/mp4']);
        expect(data.imp[0].video.w).to.equal(640);
        expect(data.imp[0].video.h).to.equal(480);
      });
    }

    if (FEATURES.NATIVE) {
      it('builds a native imp from the ORTB native request', function () {
        const bids = [nativeBid()];
        const [{ data }] = spec.buildRequests(bids, bidderRequest(bids));
        expect(data.imp).to.have.lengthOf(1);
        expect(data.imp[0].native.request).to.be.a('string');
        expect(JSON.parse(data.imp[0].native.request).assets).to.have.lengthOf(2);
      });
    }

    it('sends every declared format on a single imp for a multiformat ad unit', function () {
      const bids = [multiFormatBid({ publisherId: 'pub-test', placementId: 'multi-atf' })];
      const [{ data }] = spec.buildRequests(bids, bidderRequest(bids));
      expect(data.imp).to.have.lengthOf(1);
      expect(data.imp[0].banner).to.exist;
      expect(data.imp[0].tagid).to.equal('multi-atf');
      expect(data.imp[0].ext.gpid).to.equal('/1234/home#div-multi');
      if (FEATURES.VIDEO) {
        expect(data.imp[0].video).to.exist;
      }
      if (FEATURES.NATIVE) {
        expect(data.imp[0].native).to.exist;
      }
    });

    it('forwards user eids', function () {
      const eids = [{ source: 'id5.io', uids: [{ id: 'ID5-1', atype: 1 }] }];
      const bids = [bannerBid()];
      const [{ data }] = spec.buildRequests(bids, bidderRequest(bids, { user: { ext: { eids } } }));
      expect(data.user.ext.eids).to.deep.equal(eids);
    });

    it('forwards supply chain (schain)', function () {
      const schain = { complete: 1, ver: '1.0', nodes: [{ asi: 'peak226.com', sid: 'pub-test', hp: 1 }] };
      const bids = [bannerBid()];
      const [{ data }] = spec.buildRequests(bids, bidderRequest(bids, { source: { ext: { schain } } }));
      expect(data.source.ext.schain).to.deep.equal(schain);
    });

    it('forwards consent signals from ortb2', function () {
      const bids = [bannerBid()];
      const breq = bidderRequest(bids, {
        regs: { coppa: 1, ext: { gdpr: 1, us_privacy: '1YNN' } },
        user: { ext: { consent: 'CONSENT' } },
      });
      const [{ data }] = spec.buildRequests(bids, breq);
      expect(data.regs.coppa).to.equal(1);
      expect(data.regs.ext.gdpr).to.equal(1);
      expect(data.regs.ext.us_privacy).to.equal('1YNN');
      expect(data.user.ext.consent).to.equal('CONSENT');
    });

    it('keeps bids with the same region and publisherId in one request', function () {
      const bids = [bannerBid(), { ...videoBid('instream') }];
      const requests = spec.buildRequests(bids, bidderRequest(bids));
      expect(requests).to.have.lengthOf(1);
      expect(requests[0].data.imp).to.have.lengthOf(2);
    });

    it('splits bids with different regions into separate requests', function () {
      const bids = [
        bannerBid({ ...DEFAULT_PARAMS, region: 'us' }),
        bannerBid({ ...DEFAULT_PARAMS, region: 'eu' }, { bidId: 'bid-banner-2', adUnitCode: 'div-banner-2' }),
      ];
      const requests = spec.buildRequests(bids, bidderRequest(bids));
      expect(requests.map((r) => r.url)).to.have.members([ENDPOINTS.us, ENDPOINTS.eu]);
      requests.forEach((r) => {
        expect(r.data.imp).to.have.lengthOf(1);
      });
      const euRequest = requests.find((r) => r.url === ENDPOINTS.eu);
      expect(euRequest.data.imp[0].id).to.equal('bid-banner-2');
    });

    it('splits bids with different publisherIds into separate requests with their own publisher.id', function () {
      const bids = [
        bannerBid({ publisherId: 'pub-a', placementId: 'plc-1' }),
        bannerBid({ publisherId: 'pub-b', placementId: 'plc-2' }, { bidId: 'bid-banner-2', adUnitCode: 'div-banner-2' }),
      ];
      const requests = spec.buildRequests(bids, bidderRequest(bids));
      expect(requests).to.have.lengthOf(2);
      expect(requests.map((r) => r.url)).to.deep.equal([ENDPOINTS.us, ENDPOINTS.us]);
      const byPublisher = Object.fromEntries(requests.map((r) => [r.data.site.publisher.id, r.data.imp]));
      expect(byPublisher['pub-a']).to.have.lengthOf(1);
      expect(byPublisher['pub-a'][0].tagid).to.equal('plc-1');
      expect(byPublisher['pub-b']).to.have.lengthOf(1);
      expect(byPublisher['pub-b'][0].tagid).to.equal('plc-2');
    });
  });

  describe('interpretResponse', function () {
    function build(bids) {
      return spec.buildRequests(bids, bidderRequest(bids))[0];
    }

    it('returns [] on empty body', function () {
      expect(spec.interpretResponse({ body: null }, {})).to.deep.equal([]);
      expect(spec.interpretResponse(undefined, {})).to.deep.equal([]);
    });

    it('returns [] when there is no seatbid', function () {
      expect(spec.interpretResponse({ body: { id: 'x' } }, {})).to.deep.equal([]);
    });

    it('parses a banner bid', function () {
      const request = build([bannerBid()]);
      const out = spec.interpretResponse(ortbResponse([ortbBid()]), request);
      expect(out).to.have.lengthOf(1);
      expect(out[0].requestId).to.equal('bid-banner-1');
      expect(out[0].cpm).to.equal(3.21);
      expect(out[0].currency).to.equal('USD');
      expect(out[0].creativeId).to.equal('cr-9');
      expect(out[0].width).to.equal(300);
      expect(out[0].height).to.equal(250);
      expect(out[0].ad).to.equal('<div>ad</div>');
      expect(out[0].mediaType).to.equal(BANNER);
      expect(out[0].netRevenue).to.equal(true);
      expect(out[0].ttl).to.equal(300);
      expect(out[0].meta.advertiserDomains).to.deep.equal(['acme.com']);
    });

    it('defaults currency to USD when the response has no cur', function () {
      const request = build([bannerBid()]);
      const response = ortbResponse([ortbBid()]);
      delete response.body.cur;
      const out = spec.interpretResponse(response, request);
      expect(out[0].currency).to.equal('USD');
    });

    it('uses bid.exp as ttl and dealid as dealId when present', function () {
      const request = build([bannerBid()]);
      const out = spec.interpretResponse(ortbResponse([ortbBid({ exp: 120, dealid: 'deal-1' })]), request);
      expect(out[0].ttl).to.equal(120);
      expect(out[0].dealId).to.equal('deal-1');
    });

    it('resolves ${AUCTION_PRICE} in adm, nurl and burl', function () {
      const request = build([bannerBid()]);
      const out = spec.interpretResponse(ortbResponse([ortbBid({
        price: 3.25,
        adm: '<div>ad</div><img src="https://count.viddea.com/win?p=${AUCTION_PRICE}">',
        nurl: 'https://count.viddea.com/nurl?p=${AUCTION_PRICE}',
        burl: 'https://count.viddea.com/burl?p=${AUCTION_PRICE}',
      })]), request);
      expect(out).to.have.lengthOf(1);
      expect(out[0].ad).to.include('https://count.viddea.com/win?p=3.25');
      expect(out[0].ad).to.include('https://count.viddea.com/nurl?p=3.25');
      expect(out[0].ad).to.not.include('${AUCTION_PRICE}');
      expect(out[0].burl).to.equal('https://count.viddea.com/burl?p=3.25');
    });

    it('drops bids without a recognised mtype', function () {
      const request = build([bannerBid()]);
      const out = spec.interpretResponse(ortbResponse([ortbBid({ mtype: undefined })]), request);
      expect(out).to.deep.equal([]);
    });

    if (FEATURES.VIDEO) {
      it('parses a video bid as VAST XML with the price macro resolved and no renderer attached', function () {
        const request = build([videoBid('outstream')]);
        const out = spec.interpretResponse(ortbResponse([ortbBid({
          impid: 'bid-video-1',
          price: 8.5,
          crid: 'v-1',
          w: 640,
          h: 480,
          adm: '<VAST version="4.2"><Ad><Impression><![CDATA[https://count.viddea.com/imp?p=${AUCTION_PRICE}]]></Impression></Ad></VAST>',
          mtype: 2,
        })]), request);
        expect(out).to.have.lengthOf(1);
        expect(out[0].mediaType).to.equal(VIDEO);
        expect(out[0].cpm).to.equal(8.5);
        expect(out[0].vastXml).to.include('https://count.viddea.com/imp?p=8.5');
        expect(out[0].vastXml).to.not.include('${AUCTION_PRICE}');
        expect(out[0].renderer).to.not.exist;
      });

      it('uses nurl as vastUrl for a video bid', function () {
        const request = build([videoBid('instream')]);
        const out = spec.interpretResponse(ortbResponse([ortbBid({
          impid: 'bid-video-1',
          price: 2,
          adm: undefined,
          nurl: 'https://vast.viddea.com/v?p=${AUCTION_PRICE}',
          mtype: 2,
        })]), request);
        expect(out[0].mediaType).to.equal(VIDEO);
        expect(out[0].vastUrl).to.equal('https://vast.viddea.com/v?p=2');
      });

      it('parses banner and video bids returned against the same multiformat imp', function () {
        const request = build([multiFormatBid()]);
        const out = spec.interpretResponse(ortbResponse([
          ortbBid({ impid: 'bid-multi-1', price: 2.5, crid: 'cr-b' }),
          ortbBid({ impid: 'bid-multi-1', price: 8.5, crid: 'cr-v', w: 640, h: 480, adm: '<VAST version="4.2"></VAST>', mtype: 2 }),
        ]), request);
        expect(out).to.have.lengthOf(2);
        const banner = out.find((b) => b.mediaType === BANNER);
        const video = out.find((b) => b.mediaType === VIDEO);
        expect(banner.cpm).to.equal(2.5);
        expect(banner.creativeId).to.equal('cr-b');
        expect(video.cpm).to.equal(8.5);
        expect(video.creativeId).to.equal('cr-v');
        expect(video.vastXml).to.equal('<VAST version="4.2"></VAST>');
      });
    }

    if (FEATURES.NATIVE) {
      it('parses a native bid', function () {
        const request = build([nativeBid()]);
        const out = spec.interpretResponse(ortbResponse([ortbBid({
          impid: 'bid-native-1',
          price: 1.5,
          crid: 'n-1',
          w: undefined,
          h: undefined,
          mtype: 4,
          adm: JSON.stringify({
            assets: [
              { id: 1, title: { text: 'Great offer' } },
              { id: 2, img: { url: 'https://example.com/img.png', w: 300, h: 250 } },
            ],
            link: { url: 'https://example.com/click?p=${AUCTION_PRICE}' },
          }),
        })]), request);
        expect(out).to.have.lengthOf(1);
        expect(out[0].mediaType).to.equal(NATIVE);
        expect(out[0].native.ortb.assets).to.have.lengthOf(2);
        expect(out[0].native.ortb.link.url).to.equal('https://example.com/click?p=1.5');
      });

      it('parses a native bid returned via the non-standard adm_native field', function () {
        // peak226 sends native markup as an already-parsed object under adm_native instead of
        // adm (a JSON string per OpenRTB), with adm left empty; core's native processor only
        // reads bid.adm and throws if it's not a populated object/string.
        const request = build([nativeBid()]);
        const bid = ortbBid({
          impid: 'bid-native-1',
          price: 0.134235255767336,
          crid: '89735525',
          w: undefined,
          h: undefined,
          mtype: 4,
          adm: '',
        });
        bid.adm_native = {
          ver: '1',
          assets: [
            { id: 1, title: { text: 'Dave: Credit, Cash & Money App' } },
            { id: 2, img: { url: 'https://cdn.example.com/creative.png', w: 480, h: 320 } },
          ],
          link: { url: 'https://example.com/click_short/abc' },
          imptrackers: ['https://example.com/ad_delivered/abc'],
          eventtrackers: [
            { event: 1, method: 1, url: 'https://example.com/edge_direct_imp/abc/${AUCTION_PRICE}' },
          ],
        };
        const out = spec.interpretResponse(ortbResponse([bid]), request);
        expect(out).to.have.lengthOf(1);
        expect(out[0].mediaType).to.equal(NATIVE);
        expect(out[0].native.ortb.assets).to.have.lengthOf(2);
        expect(out[0].native.ortb.eventtrackers[0].url).to.equal(
          'https://example.com/edge_direct_imp/abc/0.134235255767336'
        );
      });
    }
  });
});
