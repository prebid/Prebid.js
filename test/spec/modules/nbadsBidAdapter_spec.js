import { expect } from 'chai';
import sinon from 'sinon';
import { spec } from 'modules/nbadsBidAdapter.js';
import { config } from 'src/config.js';
import adapterManager from 'src/adapterManager.js';
import { server } from 'test/mocks/xhr.js';
import * as utils from 'src/utils.js';
import 'modules/priceFloors.js';

const PROD_HOST = 'https://us.nexbids.com';
const TEST_HOST = 'https://test.ssp.nexbids.com';

function makeBid(overrides = {}) {
  return Object.assign({
    bidder: 'nbads',
    bidId: 'bid-1',
    adUnitCode: 'div-1',
    auctionId: 'auction-1',
    bidderRequestId: 'br-1',
    transactionId: 'tx-1',
    params: {
      publisherId: 'Pub-aaaaaaaaaaaaaaaa',
      adUnitCode: 'Unit-1111111111111111'
    },
    mediaTypes: {
      banner: {
        sizes: [[320, 50], [300, 250]]
      }
    }
  }, overrides);
}

function makeBidderRequest(bids) {
  return {
    bidderCode: 'nbads',
    auctionId: 'auction-1',
    bidderRequestId: 'br-1',
    timeout: 1000,
    bids,
    refererInfo: {
      page: 'https://publisher.example/article',
      domain: 'publisher.example',
      ref: ''
    },
    ortb2: {}
  };
}

function makeOrtbResponse(bidOverrides = {}, responseOverrides = {}) {
  const bid = Object.assign({
    id: 'seatbid-1',
    impid: 'bid-1',
    price: 1.23,
    adm: '<div>ad</div>',
    adid: 'ad-1',
    crid: 'crid-1',
    cid: 'cid-1',
    dealid: 'deal-1',
    adomain: ['advertiser.example'],
    w: 320,
    h: 50,
    exp: 120,
    ext: {
      nexbids: {
        pixel: '/openrtb2/track/pixel?t=token-imp',
        click: '/openrtb2/track/click?t=token-click'
      }
    }
  }, bidOverrides);
  return Object.assign({
    id: 'auction-1',
    cur: 'USD',
    seatbid: [{ seat: 'dsp-1', bid: [bid] }]
  }, responseOverrides);
}

const VAST = '<VAST version="4.0"><Ad><InLine><AdSystem>dsp</AdSystem><Impression><![CDATA[https://dsp.example/i]]></Impression></InLine></Ad></VAST>';

const NATIVE_REQUEST = {
  ver: '1.2',
  assets: [
    { id: 1, required: 1, title: { len: 90 } },
    { id: 2, required: 1, img: { type: 3, w: 300, h: 157 } }
  ]
};

const NATIVE_RESPONSE = {
  ver: '1.2',
  assets: [
    { id: 1, title: { text: 'Title' } },
    { id: 2, img: { url: 'https://cdn.example/i.png', w: 300, h: 157 } }
  ],
  link: { url: 'https://landing.example' }
};

function makeVideoBid(overrides = {}) {
  return makeBid(Object.assign({
    mediaTypes: {
      video: {
        context: 'instream',
        playerSize: [[640, 360]],
        mimes: ['video/mp4'],
        protocols: [2, 3, 5, 6],
        minduration: 5,
        maxduration: 30,
        plcmt: 1
      }
    }
  }, overrides));
}

function makeNativeBid(overrides = {}) {
  return makeBid(Object.assign({
    mediaTypes: { native: { ortb: NATIVE_REQUEST } },
    nativeOrtbRequest: NATIVE_REQUEST
  }, overrides));
}

function requestFor(bid) {
  return spec.buildRequests([bid], makeBidderRequest([bid]))[0];
}

describe('nbads(NexBids) bid adapter', function () {
  afterEach(function () {
    config.resetConfig();
  });

  describe('spec', function () {
    it('registers the nbads code for banner, video and native', function () {
      expect(spec.code).to.equal('nbads');
      expect(spec.supportedMediaTypes).to.deep.equal(['banner', 'video', 'native']);
    });
  });

  describe('isBidRequestValid', function () {
    it('accepts a banner bid with publisherId, adUnitCode and sizes', function () {
      expect(spec.isBidRequestValid(makeBid())).to.equal(true);
    });

    it('rejects a missing or non-string publisherId', function () {
      expect(spec.isBidRequestValid(makeBid({ params: { adUnitCode: 'Unit-1' } }))).to.equal(false);
      expect(spec.isBidRequestValid(makeBid({ params: { publisherId: '', adUnitCode: 'Unit-1' } }))).to.equal(false);
      expect(spec.isBidRequestValid(makeBid({ params: { publisherId: 42, adUnitCode: 'Unit-1' } }))).to.equal(false);
    });

    it('rejects a missing or non-string adUnitCode', function () {
      expect(spec.isBidRequestValid(makeBid({ params: { publisherId: 'Pub-1' } }))).to.equal(false);
      expect(spec.isBidRequestValid(makeBid({ params: { publisherId: 'Pub-1', adUnitCode: 7 } }))).to.equal(false);
    });

    it('rejects when params are absent entirely', function () {
      expect(spec.isBidRequestValid(makeBid({ params: undefined }))).to.equal(false);
    });

    it('rejects when no format can be sized', function () {
      expect(spec.isBidRequestValid(makeBid({ mediaTypes: { banner: {} } }))).to.equal(false);
      expect(spec.isBidRequestValid(makeBid({ mediaTypes: { banner: { sizes: [] } } }))).to.equal(false);
      expect(spec.isBidRequestValid(makeBid({ mediaTypes: { video: { context: 'instream' } } }))).to.equal(false);
      expect(spec.isBidRequestValid(makeBid({ mediaTypes: { native: {} }, nativeOrtbRequest: { assets: [] } }))).to.equal(false);
    });

    it('accepts video-only bids only when the video feature is enabled', function () {
      expect(spec.isBidRequestValid(makeVideoBid())).to.equal(FEATURES.VIDEO);
    });

    it('accepts native-only bids only when the native feature is enabled', function () {
      expect(spec.isBidRequestValid(makeNativeBid())).to.equal(FEATURES.NATIVE);
    });

    it('accepts mixed-format bids only when an enabled format is usable', function () {
      const bid = makeVideoBid({ mediaTypes: { banner: { sizes: [] }, video: { context: 'instream', playerSize: [[640, 360]] } } });
      expect(spec.isBidRequestValid(bid)).to.equal(FEATURES.VIDEO);
    });

    ['site', 'app', 'dooh'].forEach((client) => {
      it('reads the publisher and placement from standard ' + client + ' fields without duplicate parameters', function () {
        const bid = makeBid({
          params: undefined,
          ortb2: { [client]: { publisher: { id: 'Pub-standard' } } },
          ortb2Imp: { tagid: 'Unit-standard' }
        });
        expect(spec.isBidRequestValid(bid)).to.equal(true);
        const request = requestFor(bid);
        expect(request.url).to.equal(PROD_HOST + '/openrtb2/auction?publisherId=Pub-standard');
        expect(request.data.imp[0].tagid).to.equal('Unit-standard');
      });
    });

    it('allows publisher and placement parameters to override standard fields independently', function () {
      const standard = {
        ortb2: { site: { publisher: { id: 'Pub-standard' } } },
        ortb2Imp: { tagid: 'Unit-standard' }
      };
      [
        [{}, 'Pub-standard', 'Unit-standard'],
        [{ publisherId: 'Pub-override' }, 'Pub-override', 'Unit-standard'],
        [{ adUnitCode: 'Unit-override' }, 'Pub-standard', 'Unit-override'],
        [{ publisherId: 'Pub-override', adUnitCode: 'Unit-override' }, 'Pub-override', 'Unit-override']
      ].forEach(([params, publisher, placement]) => {
        const bid = makeBid({ ...standard, params });
        const before = JSON.stringify(bid);
        expect(spec.isBidRequestValid(bid)).to.equal(true);
        const request = requestFor(bid);
        expect(request.url).to.contain('publisherId=' + publisher);
        expect(request.data.imp[0].tagid).to.equal(placement);
        expect(JSON.stringify(bid)).to.equal(before);
      });
    });

    it('rejects invalid standard identifiers and explicit parameter overrides', function () {
      ['', 42].forEach((invalid) => {
        expect(spec.isBidRequestValid(makeBid({ params: {}, ortb2: { site: { publisher: { id: invalid } } }, ortb2Imp: { tagid: 'Unit-1' } }))).to.equal(false);
        expect(spec.isBidRequestValid(makeBid({ params: {}, ortb2: { site: { publisher: { id: 'Pub-1' } } }, ortb2Imp: { tagid: invalid } }))).to.equal(false);
        expect(spec.isBidRequestValid(makeBid({ params: { publisherId: invalid, adUnitCode: 'Unit-1' }, ortb2: { site: { publisher: { id: 'Pub-1' } } } }))).to.equal(false);
        expect(spec.isBidRequestValid(makeBid({ params: { publisherId: 'Pub-1', adUnitCode: invalid }, ortb2Imp: { tagid: 'Unit-1' } }))).to.equal(false);
      });
    });
  });

  describe('buildRequests', function () {
    it('posts one OpenRTB request to the production gateway with publisherId on the query string', function () {
      const bids = [makeBid()];
      const requests = spec.buildRequests(bids, makeBidderRequest(bids));

      expect(requests).to.have.lengthOf(1);
      const req = requests[0];
      expect(req.method).to.equal('POST');
      expect(req.url).to.equal(PROD_HOST + '/openrtb2/auction?publisherId=Pub-aaaaaaaaaaaaaaaa');
      expect(req.options).to.deep.equal({ withCredentials: false });
      expect(req.data).to.be.an('object');
    });

    it('url-encodes the publisherId', function () {
      const bids = [makeBid({ params: { publisherId: 'Pub a/b', adUnitCode: 'Unit-1' } })];
      const requests = spec.buildRequests(bids, makeBidderRequest(bids));
      expect(requests[0].url).to.equal(PROD_HOST + '/openrtb2/auction?publisherId=Pub%20a%2Fb');
    });

    it('switches to the staging gateway with config nbads.env = test', function () {
      config.setConfig({ nbads: { env: 'test' } });
      const bids = [makeBid()];
      const requests = spec.buildRequests(bids, makeBidderRequest(bids));
      expect(requests[0].url.indexOf(TEST_HOST + '/openrtb2/auction?')).to.equal(0);
    });

    it('keeps the gateway domain fixed even if an unsupported endpoint setting is supplied', function () {
      ['http://localhost:8082', 'https://other.example'].forEach((endpoint) => {
        config.setConfig({ nbads: { env: 'test', endpoint } });
        const bids = [makeBid()];
        const requests = spec.buildRequests(bids, makeBidderRequest(bids));
        expect(requests[0].url).to.equal(TEST_HOST + '/openrtb2/auction?publisherId=Pub-aaaaaaaaaaaaaaaa');
      });
    });

    it('falls back to production for an unknown env', function () {
      ['nowhere', '__proto__', 'constructor', 'toString'].forEach((env) => {
        config.setConfig({ nbads: { env } });
        const bids = [makeBid()];
        const requests = spec.buildRequests(bids, makeBidderRequest(bids));
        expect(requests[0].url).to.equal(PROD_HOST + '/openrtb2/auction?publisherId=Pub-aaaaaaaaaaaaaaaa');
      });
    });

    it('groups ad units by publisherId, one request per publisher, keeping first-seen order', function () {
      const bids = [
        makeBid({ bidId: 'bid-1', params: { publisherId: 'Pub-A', adUnitCode: 'Unit-A1' } }),
        makeBid({ bidId: 'bid-2', params: { publisherId: 'Pub-B', adUnitCode: 'Unit-B1' } }),
        makeBid({ bidId: 'bid-3', params: { publisherId: 'Pub-A', adUnitCode: 'Unit-A2' } })
      ];
      const requests = spec.buildRequests(bids, makeBidderRequest(bids));

      expect(requests).to.have.lengthOf(2);
      expect(requests[0].url).to.contain('publisherId=Pub-A');
      expect(requests[0].data.imp.map((imp) => imp.id)).to.deep.equal(['bid-1', 'bid-3']);
      expect(requests[0].data.imp.map((imp) => imp.tagid)).to.deep.equal(['Unit-A1', 'Unit-A2']);
      expect(requests[1].url).to.contain('publisherId=Pub-B');
      expect(requests[1].data.imp.map((imp) => imp.id)).to.deep.equal(['bid-2']);
    });

    it('keeps numeric publisher IDs in first-seen order and handles object property names', function () {
      const ids = ['10', '2', '__proto__', 'constructor', '__proto__'];
      const bids = ids.map((publisherId, index) => makeBid({
        bidId: 'bid-' + index,
        params: { publisherId, adUnitCode: 'Unit-' + index }
      }));
      const requests = spec.buildRequests(bids, makeBidderRequest(bids));

      expect(requests.map((req) => req.url)).to.deep.equal([
        PROD_HOST + '/openrtb2/auction?publisherId=10',
        PROD_HOST + '/openrtb2/auction?publisherId=2',
        PROD_HOST + '/openrtb2/auction?publisherId=__proto__',
        PROD_HOST + '/openrtb2/auction?publisherId=constructor'
      ]);
      expect(requests[2].data.imp.map((imp) => imp.id)).to.deep.equal(['bid-2', 'bid-4']);
    });

    it('returns no requests when there are no valid bids', function () {
      expect(spec.buildRequests([], makeBidderRequest([]))).to.deep.equal([]);
    });

    it('batches standard and parameter-based identifiers for the same publisher and format', function () {
      const bids = [makeBid(), makeBid({
        bidId: 'bid-2',
        params: {},
        ortb2: { site: { publisher: { id: 'Pub-aaaaaaaaaaaaaaaa' } } },
        ortb2Imp: { tagid: 'Unit-standard' }
      })];
      const requests = spec.buildRequests(bids, makeBidderRequest(bids));
      expect(requests).to.have.lengthOf(1);
      expect(requests[0].data.imp.map((imp) => imp.tagid)).to.deep.equal(['Unit-1111111111111111', 'Unit-standard']);
    });

    it('requests enabled formats separately while preserving bid association and original input', function () {
      const bid = makeNativeBid({
        mediaTypes: {
          banner: { sizes: [[320, 50]] },
          video: { context: 'instream', playerSize: [[640, 360]] },
          native: { ortb: NATIVE_REQUEST }
        },
        ortb2Imp: {
          banner: { pos: 1 },
          video: { pos: 2 },
          native: { ver: '1.2' },
          ext: { data: { section: 'news' } }
        }
      });
      const before = JSON.stringify(bid);
      const requests = spec.buildRequests([bid], makeBidderRequest([bid]));
      const types = ['banner', ...(FEATURES.VIDEO ? ['video'] : []), ...(FEATURES.NATIVE ? ['native'] : [])];
      expect(requests).to.have.lengthOf(types.length);
      expect(new Set(requests.map((req) => req.data.id)).size).to.equal(types.length);
      requests.forEach((req, i) => {
        const imp = req.data.imp[0];
        expect(req.data.imp).to.have.lengthOf(1);
        expect(imp.id).to.equal('bid-1');
        expect(imp.tagid).to.equal('Unit-1111111111111111');
        expect(imp.ext.data.section).to.equal('news');
        expect(['banner', 'video', 'native'].filter((type) => imp[type])).to.deep.equal([types[i]]);
      });
      expect(JSON.stringify(bid)).to.equal(before);
    });

    if (FEATURES.VIDEO) {
      it('batches by publisher and format while associating video responses with the original bid', function () {
        const bids = [
          makeVideoBid({ mediaTypes: { banner: { sizes: [[320, 50]] }, video: { context: 'instream', playerSize: [[640, 360]] } } }),
          makeVideoBid({ bidId: 'bid-2' }),
          makeBid({ bidId: 'bid-3', params: { publisherId: 'Pub-B', adUnitCode: 'Unit-B' } })
        ];
        const requests = spec.buildRequests(bids, makeBidderRequest(bids));
        expect(requests).to.have.lengthOf(3);
        expect(requests[0].data.imp.map((imp) => imp.id)).to.deep.equal(['bid-1']);
        expect(requests[1].data.imp.map((imp) => imp.id)).to.deep.equal(['bid-1', 'bid-2']);
        expect(requests[2].url).to.contain('publisherId=Pub-B');
        const [response] = spec.interpretResponse({ body: makeOrtbResponse({ impid: 'bid-2', adm: VAST }) }, requests[1]);
        expect(response.requestId).to.equal('bid-2');
        expect(response.mediaType).to.equal('video');
        expect(response.vastXml).to.equal(VAST);
      });

      it('queries floors per format without applying the default response currency to request floors', function () {
        config.setConfig({ currency: { adServerCurrency: 'EUR' } });
        const getFloor = sinon.stub().callsFake(({ mediaType }) => ({ currency: 'EUR', floor: mediaType === 'video' ? 2 : 1 }));
        const bid = makeVideoBid({ getFloor, mediaTypes: { banner: { sizes: [[320, 50]] }, video: { context: 'instream', playerSize: [[640, 360]] } } });
        const requests = spec.buildRequests([bid], makeBidderRequest([bid]));
        expect(requests.map((req) => req.data.imp[0].bidfloor)).to.deep.equal([1, 2]);
        expect(requests.map((req) => req.data.imp[0].bidfloorcur)).to.deep.equal(['EUR', 'EUR']);
        expect(getFloor.args.every(([arg]) => ['banner', 'video'].includes(arg.mediaType) && arg.currency === 'EUR')).to.equal(true);
        expect(spec.interpretResponse({ body: makeOrtbResponse({}, { cur: undefined }) }, requests[0])[0].currency).to.equal('USD');
      });
    }

    if (!FEATURES.VIDEO && !FEATURES.NATIVE) {
      it('keeps banner bidding usable when video and native are disabled', function () {
        const bid = makeNativeBid({
          mediaTypes: {
            banner: { sizes: [[320, 50]] },
            video: { context: 'instream', playerSize: [[640, 360]] },
            native: { ortb: NATIVE_REQUEST }
          }
        });
        const request = requestFor(bid);
        const imp = request.data.imp[0];

        expect(imp.banner.format).to.deep.equal([{ w: 320, h: 50 }]);
        expect(imp.video).to.be.undefined;
        expect(imp.native).to.be.undefined;
        const [response] = spec.interpretResponse({ body: makeOrtbResponse() }, request);
        expect(response.mediaType).to.equal('banner');
        expect(response.ad).to.equal('<div>ad</div>');
        expect(response.burl).to.equal(PROD_HOST + '/openrtb2/track/pixel?t=token-imp');
      });
    }

    it('builds imp with bidId, tagid, banner format from sizes, secure and default mimes', function () {
      const bids = [makeBid()];
      const { data } = spec.buildRequests(bids, makeBidderRequest(bids))[0];

      expect(data.imp).to.have.lengthOf(1);
      const imp = data.imp[0];
      expect(imp.id).to.equal('bid-1');
      expect(imp.tagid).to.equal('Unit-1111111111111111');
      expect(imp.secure).to.equal(1);
      expect(imp.banner.format).to.deep.equal([{ w: 320, h: 50 }, { w: 300, h: 250 }]);
      expect(imp.banner.mimes).to.deep.equal(['text/html', 'text/javascript', 'image/jpeg', 'image/png', 'image/gif']);
      expect(imp.video).to.be.undefined;
      expect(imp.native).to.be.undefined;
    });

    if (FEATURES.VIDEO) {
      it('builds a video imp from mediaTypes.video without banner mimes', function () {
        const bids = [makeVideoBid()];
        const imp = spec.buildRequests(bids, makeBidderRequest(bids))[0].data.imp[0];

        expect(imp.tagid).to.equal('Unit-1111111111111111');
        expect(imp.video).to.include({ w: 640, h: 360, plcmt: 1, minduration: 5, maxduration: 30 });
        expect(imp.video.mimes).to.deep.equal(['video/mp4']);
        expect(imp.video.protocols).to.deep.equal([2, 3, 5, 6]);
        expect(imp.video.context).to.be.undefined;
        expect(imp.banner).to.be.undefined;
      });
    }

    if (FEATURES.NATIVE) {
      it('builds a native imp from the ORTB native request', function () {
        const bids = [makeNativeBid()];
        const imp = spec.buildRequests(bids, makeBidderRequest(bids))[0].data.imp[0];

        expect(imp.native.ver).to.equal('1.2');
        expect(JSON.parse(imp.native.request).assets).to.deep.equal(NATIVE_REQUEST.assets);
        expect(imp.banner).to.be.undefined;
      });
    }

    it('keeps publisher-provided banner mimes from ortb2Imp', function () {
      const bids = [makeBid({ ortb2Imp: { banner: { mimes: ['image/png'] } } })];
      const { data } = spec.buildRequests(bids, makeBidderRequest(bids))[0];
      expect(data.imp[0].banner.mimes).to.deep.equal(['image/png']);
    });

    it('carries tmax from the bidder request timeout and merges ortb2 first-party data', function () {
      const bids = [makeBid()];
      const bidderRequest = makeBidderRequest(bids);
      bidderRequest.timeout = 750;
      bidderRequest.ortb2 = { site: { page: 'https://publisher.example/article', keywords: 'watches' } };
      const { data } = spec.buildRequests(bids, bidderRequest)[0];

      expect(data.tmax).to.equal(750);
      expect(data.site.page).to.equal('https://publisher.example/article');
      expect(data.site.keywords).to.equal('watches');
      expect(data.id).to.be.a('string');
    });
  });

  describe('interpretResponse', function () {
    let request;

    beforeEach(function () {
      const bids = [makeBid()];
      request = spec.buildRequests(bids, makeBidderRequest(bids))[0];
    });

    it('returns no bids for an empty (204) body', function () {
      expect(spec.interpretResponse({ body: '' }, request)).to.deep.equal([]);
      expect(spec.interpretResponse({ body: null }, request)).to.deep.equal([]);
      expect(spec.interpretResponse({}, request)).to.deep.equal([]);
      expect(spec.interpretResponse(undefined, request)).to.deep.equal([]);
    });

    it('returns no bids when seatbid is missing or empty', function () {
      expect(spec.interpretResponse({ body: { id: 'auction-1' } }, request)).to.deep.equal([]);
      expect(spec.interpretResponse({ body: { id: 'auction-1', seatbid: [] } }, request)).to.deep.equal([]);
      expect(spec.interpretResponse({ body: 'not-json' }, request)).to.deep.equal([]);
    });

    it('maps an OpenRTB banner bid onto the Prebid bid response', function () {
      const bids = spec.interpretResponse({ body: makeOrtbResponse() }, request);

      expect(bids).to.have.lengthOf(1);
      const bid = bids[0];
      expect(bid.requestId).to.equal('bid-1');
      expect(bid.mediaType).to.equal('banner');
      expect(bid.cpm).to.equal(1.23);
      expect(bid.currency).to.equal('USD');
      expect(bid.width).to.equal(320);
      expect(bid.height).to.equal(50);
      expect(bid.ad).to.equal('<div>ad</div>');
      expect(bid.creativeId).to.equal('crid-1');
      expect(bid.dealId).to.equal('deal-1');
      expect(bid.ttl).to.equal(120);
      expect(bid.netRevenue).to.equal(true);
      expect(bid.meta.advertiserDomains).to.deep.equal(['advertiser.example']);
    });

    it('defaults a missing response currency to USD without mutating the response body', function () {
      const body = makeOrtbResponse();
      delete body.cur;
      const before = JSON.stringify(body);
      const [bid] = spec.interpretResponse({ body }, request);
      expect(bid.currency).to.equal('USD');
      expect(bid.cpm).to.equal(1.23);
      expect(JSON.stringify(body)).to.equal(before);
    });

    it('preserves an explicit non-USD response currency', function () {
      const [bid] = spec.interpretResponse({ body: makeOrtbResponse({}, { cur: 'EUR' }) }, request);
      expect(bid.currency).to.equal('EUR');
    });

    it('prefers ext.clearprice over price when it is positive', function () {
      const bids = spec.interpretResponse({
        body: makeOrtbResponse({ price: 2.5, ext: { clearprice: 1.75 } })
      }, request);
      expect(bids[0].cpm).to.equal(1.75);
    });

    it('ignores a zero, negative or malformed ext.clearprice', function () {
      expect(spec.interpretResponse({ body: makeOrtbResponse({ price: 2.5, ext: { clearprice: 0 } }) }, request)[0].cpm).to.equal(2.5);
      expect(spec.interpretResponse({ body: makeOrtbResponse({ price: 2.5, ext: { clearprice: -1 } }) }, request)[0].cpm).to.equal(2.5);
      expect(spec.interpretResponse({ body: makeOrtbResponse({ price: 2.5, ext: { clearprice: 'x' } }) }, request)[0].cpm).to.equal(2.5);
    });

    it('defaults ttl to 300 when exp is missing', function () {
      const bids = spec.interpretResponse({ body: makeOrtbResponse({ exp: undefined }) }, request);
      expect(bids[0].ttl).to.equal(300);
    });

    it('always exposes meta.advertiserDomains, empty when adomain is missing', function () {
      const bids = spec.interpretResponse({ body: makeOrtbResponse({ adomain: undefined }) }, request);
      expect(bids[0].meta.advertiserDomains).to.deep.equal([]);
    });

    it('resolves the relative billing pixel against the gateway origin and exposes it as burl', function () {
      const bids = spec.interpretResponse({ body: makeOrtbResponse() }, request);
      expect(bids[0].burl).to.equal(PROD_HOST + '/openrtb2/track/pixel?t=token-imp');
    });

    it('uses the origin of the request that was actually sent (staging gateway)', function () {
      config.setConfig({ nbads: { env: 'test' } });
      const bidRequests = [makeBid()];
      const testRequest = spec.buildRequests(bidRequests, makeBidderRequest(bidRequests))[0];
      const bids = spec.interpretResponse({ body: makeOrtbResponse() }, testRequest);
      expect(bids[0].burl).to.equal(TEST_HOST + '/openrtb2/track/pixel?t=token-imp');
    });

    it('leaves an absolute billing pixel untouched', function () {
      const bids = spec.interpretResponse({
        body: makeOrtbResponse({ ext: { nexbids: { pixel: 'https://cdn.example/px?t=1' } } })
      }, request);
      expect(bids[0].burl).to.equal('https://cdn.example/px?t=1');
    });

    it('has no burl when the response carries no billing pixel', function () {
      const bids = spec.interpretResponse({ body: makeOrtbResponse({ ext: {} }) }, request);
      expect(bids[0].burl).to.be.undefined;
    });

    if (FEATURES.VIDEO) {
      it('uses the gateway mtype for a video bid and exposes the VAST as vastXml', function () {
        const videoRequest = requestFor(makeVideoBid());
        const [bid] = spec.interpretResponse({ body: makeOrtbResponse({ mtype: 2, adm: VAST }) }, videoRequest);

        expect(bid.mediaType).to.equal('video');
        expect(bid.vastXml).to.equal(VAST);
        expect(bid.playerWidth).to.equal(640);
        expect(bid.playerHeight).to.equal(360);
        expect(bid.burl).to.equal(PROD_HOST + '/openrtb2/track/pixel?t=token-imp');
      });
    }

    if (FEATURES.VIDEO) {
      it('infers video from the imp when mtype is missing', function () {
        const [bid] = spec.interpretResponse({ body: makeOrtbResponse({ adm: VAST }) }, requestFor(makeVideoBid()));
        expect(bid.mediaType).to.equal('video');
      });
    }

    if (FEATURES.VIDEO) {
      it('interprets video and banner responses using their separate request formats', function () {
        const multi = makeVideoBid({
          mediaTypes: { banner: { sizes: [[320, 50]] }, video: { context: 'instream', playerSize: [[640, 360]] } }
        });
        const [bannerRequest, videoRequest] = spec.buildRequests([multi], makeBidderRequest([multi]));
        expect(spec.interpretResponse({ body: makeOrtbResponse({ adm: '<?xml version="1.0"?>\n' + VAST }) }, videoRequest)[0].mediaType).to.equal('video');
        expect(spec.interpretResponse({ body: makeOrtbResponse({ adm: '<div>ad</div>' }) }, bannerRequest)[0].mediaType).to.equal('banner');
      });
    }

    if (FEATURES.NATIVE) {
      it('interprets native responses using the native request format on mixed-format ad units', function () {
        const multi = makeNativeBid({
          mediaTypes: { banner: { sizes: [[320, 50]] }, native: { ortb: NATIVE_REQUEST } }
        });
        const nativeRequest = spec.buildRequests([multi], makeBidderRequest([multi]))[1];
        expect(spec.interpretResponse({ body: makeOrtbResponse({ adm: JSON.stringify(NATIVE_RESPONSE) }) }, nativeRequest)[0].mediaType).to.equal('native');
      });
    }

    if (FEATURES.NATIVE) {
      it('maps a native bid onto native.ortb and adds the absolute click beacon to link.clicktrackers', function () {
        const adm = JSON.stringify(Object.assign({}, NATIVE_RESPONSE, { link: { url: 'https://landing.example', clicktrackers: ['https://dsp.example/c'] } }));
        const [bid] = spec.interpretResponse({ body: makeOrtbResponse({ mtype: 4, adm }) }, requestFor(makeNativeBid()));

        expect(bid.mediaType).to.equal('native');
        expect(bid.native.ortb.assets).to.deep.equal(NATIVE_RESPONSE.assets);
        expect(bid.native.ortb.link.clicktrackers).to.deep.equal([
          'https://dsp.example/c',
          PROD_HOST + '/openrtb2/track/click?t=token-click'
        ]);
      });
    }

    if (FEATURES.NATIVE) {
      it('adds link.clicktrackers when the native link has none', function () {
        const [bid] = spec.interpretResponse({
          body: makeOrtbResponse({ adm: JSON.stringify(NATIVE_RESPONSE) })
        }, requestFor(makeNativeBid()));
        expect(bid.mediaType).to.equal('native');
        expect(bid.native.ortb.link.clicktrackers).to.deep.equal([PROD_HOST + '/openrtb2/track/click?t=token-click']);
      });
    }

    it('does not add click trackers to banner or video bids', function () {
      const [banner] = spec.interpretResponse({ body: makeOrtbResponse() }, request);
      expect(banner.native).to.be.undefined;
      if (FEATURES.VIDEO) {
        const [video] = spec.interpretResponse({ body: makeOrtbResponse({ mtype: 2, adm: VAST }) }, requestFor(makeVideoBid()));
        expect(video.native).to.be.undefined;
      }
    });

    it('leaves a protocol-relative billing pixel untouched', function () {
      const bids = spec.interpretResponse({
        body: makeOrtbResponse({ ext: { nexbids: { pixel: '//cdn.example/px?t=1' } } })
      }, request);
      expect(bids[0].burl).to.equal('//cdn.example/px?t=1');
    });

    it('drops bids whose impid does not match a request', function () {
      const bids = spec.interpretResponse({ body: makeOrtbResponse({ impid: 'unknown' }) }, request);
      expect(bids).to.deep.equal([]);
    });
  });

  describe('onBidBillable', function () {
    let sandbox;
    let triggerPixelStub;

    beforeEach(function () {
      sandbox = sinon.createSandbox();
      triggerPixelStub = sandbox.stub(utils, 'triggerPixel');
    });

    afterEach(function () {
      sandbox.restore();
    });

    it('sends credential-free keepalive billing notices through the shared Ajax API', function () {
      const url = PROD_HOST + '/openrtb2/track/pixel?t=token-imp';
      spec.onBidBillable({ burl: url });

      expect(server.requests).to.have.lengthOf(1);
      const request = server.requests[0];
      expect(request.url).to.equal(url);
      expect(request.method).to.equal('GET');
      expect(request.fetch.request.keepalive).to.equal(true);
      expect(request.withCredentials).to.equal(false);
      sinon.assert.notCalled(triggerPixelStub);
      request.respond(200, {}, '');
    });

    it('sends one notice when core billing is triggered repeatedly for the same bid', function () {
      const bid = { bidder: 'nbads', burl: PROD_HOST + '/openrtb2/track/pixel?t=same-bid' };
      adapterManager.triggerBilling(bid);
      adapterManager.triggerBilling(bid);

      expect(server.requests).to.have.lengthOf(1);
      expect(server.requests[0].url).to.equal(bid.burl);
      server.requests[0].respond(200, {}, '');
    });

    it('sends separate billing notices for different bids', function () {
      ['first', 'second'].forEach((token) => {
        adapterManager.triggerBilling({ bidder: 'nbads', burl: PROD_HOST + '/openrtb2/track/pixel?t=' + token });
      });

      expect(server.requests.map((request) => request.url)).to.deep.equal([
        PROD_HOST + '/openrtb2/track/pixel?t=first',
        PROD_HOST + '/openrtb2/track/pixel?t=second'
      ]);
      server.requests.forEach((request) => request.respond(200, {}, ''));
    });

    it('does not send a request when the billing URL is missing or invalid', function () {
      [undefined, null, '', 123].forEach((burl) => spec.onBidBillable({ burl }));
      expect(server.requests).to.have.lengthOf(0);
      sinon.assert.notCalled(triggerPixelStub);
    });
  });
});
