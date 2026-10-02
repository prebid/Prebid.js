import { expect } from 'chai';
import sinon from 'sinon';
import { spec } from 'modules/nexbidsBidAdapter.js';
import { config } from 'src/config.js';
import * as utils from 'src/utils.js';

const PROD_HOST = 'https://us.nexbids.com';
const TEST_HOST = 'https://test.ssp.nexbids.com';

function makeBid(overrides = {}) {
  return Object.assign({
    bidder: 'nexbids',
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
    bidderCode: 'nexbids',
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

describe('NexBids bid adapter', function () {
  afterEach(function () {
    config.resetConfig();
  });

  describe('spec', function () {
    it('registers the nexbids code for banner, video and native', function () {
      expect(spec.code).to.equal('nexbids');
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

    it('accepts a video bid with a playerSize', function () {
      expect(spec.isBidRequestValid(makeVideoBid())).to.equal(true);
    });

    it('accepts a native bid with ORTB native assets', function () {
      expect(spec.isBidRequestValid(makeNativeBid())).to.equal(true);
    });

    it('accepts a multi-format bid when any one format is usable', function () {
      const bid = makeVideoBid({ mediaTypes: { banner: { sizes: [] }, video: { context: 'instream', playerSize: [[640, 360]] } } });
      expect(spec.isBidRequestValid(bid)).to.equal(true);
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

    it('switches to the staging gateway with config nexbids.env = test', function () {
      config.setConfig({ nexbids: { env: 'test' } });
      const bids = [makeBid()];
      const requests = spec.buildRequests(bids, makeBidderRequest(bids));
      expect(requests[0].url.indexOf(TEST_HOST + '/openrtb2/auction?')).to.equal(0);
    });

    it('honours an explicit endpoint origin override, stripping trailing slashes', function () {
      config.setConfig({ nexbids: { env: 'test', endpoint: 'http://localhost:8082/' } });
      const bids = [makeBid()];
      const requests = spec.buildRequests(bids, makeBidderRequest(bids));
      expect(requests[0].url).to.equal('http://localhost:8082/openrtb2/auction?publisherId=Pub-aaaaaaaaaaaaaaaa');
    });

    it('ignores an endpoint override that is not an http(s) origin', function () {
      config.setConfig({ nexbids: { endpoint: 'localhost:8082' } });
      const bids = [makeBid()];
      const requests = spec.buildRequests(bids, makeBidderRequest(bids));
      expect(requests[0].url.indexOf(PROD_HOST)).to.equal(0);
    });

    it('falls back to production for an unknown env', function () {
      config.setConfig({ nexbids: { env: 'nowhere' } });
      const bids = [makeBid()];
      const requests = spec.buildRequests(bids, makeBidderRequest(bids));
      expect(requests[0].url.indexOf(PROD_HOST)).to.equal(0);
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

    it('builds a native imp from the ORTB native request', function () {
      const bids = [makeNativeBid()];
      const imp = spec.buildRequests(bids, makeBidderRequest(bids))[0].data.imp[0];

      expect(imp.native.ver).to.equal('1.2');
      expect(JSON.parse(imp.native.request).assets).to.deep.equal(NATIVE_REQUEST.assets);
      expect(imp.banner).to.be.undefined;
    });

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
      config.setConfig({ nexbids: { env: 'test' } });
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

    it('uses the gateway mtype for a video bid and exposes the VAST as vastXml', function () {
      const videoRequest = requestFor(makeVideoBid());
      const [bid] = spec.interpretResponse({ body: makeOrtbResponse({ mtype: 2, adm: VAST }) }, videoRequest);

      expect(bid.mediaType).to.equal('video');
      expect(bid.vastXml).to.equal(VAST);
      expect(bid.playerWidth).to.equal(640);
      expect(bid.playerHeight).to.equal(360);
      expect(bid.burl).to.equal(PROD_HOST + '/openrtb2/track/pixel?t=token-imp');
    });

    it('infers video from the imp when mtype is missing', function () {
      const [bid] = spec.interpretResponse({ body: makeOrtbResponse({ adm: VAST }) }, requestFor(makeVideoBid()));
      expect(bid.mediaType).to.equal('video');
    });

    it('sniffs the creative on a multi-format imp when mtype is missing', function () {
      const multi = requestFor(makeVideoBid({
        mediaTypes: { banner: { sizes: [[320, 50]] }, video: { context: 'instream', playerSize: [[640, 360]] } }
      }));
      expect(spec.interpretResponse({ body: makeOrtbResponse({ adm: '<?xml version="1.0"?>\n' + VAST }) }, multi)[0].mediaType).to.equal('video');
      expect(spec.interpretResponse({ body: makeOrtbResponse({ adm: '<div>ad</div>' }) }, multi)[0].mediaType).to.equal('banner');
      const bannerNative = requestFor(makeNativeBid({
        mediaTypes: { banner: { sizes: [[320, 50]] }, native: { ortb: NATIVE_REQUEST } }
      }));
      expect(spec.interpretResponse({ body: makeOrtbResponse({ adm: JSON.stringify(NATIVE_RESPONSE) }) }, bannerNative)[0].mediaType).to.equal('native');
    });

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

    it('adds link.clicktrackers when the native link has none', function () {
      const [bid] = spec.interpretResponse({
        body: makeOrtbResponse({ adm: JSON.stringify(NATIVE_RESPONSE) })
      }, requestFor(makeNativeBid()));
      expect(bid.mediaType).to.equal('native');
      expect(bid.native.ortb.link.clicktrackers).to.deep.equal([PROD_HOST + '/openrtb2/track/click?t=token-click']);
    });

    it('does not add click trackers to banner or video bids', function () {
      const [banner] = spec.interpretResponse({ body: makeOrtbResponse() }, request);
      expect(banner.native).to.be.undefined;
      const [video] = spec.interpretResponse({ body: makeOrtbResponse({ mtype: 2, adm: VAST }) }, requestFor(makeVideoBid()));
      expect(video.native).to.be.undefined;
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

    it('fires the billing pixel once', function () {
      spec.onBidBillable({ burl: PROD_HOST + '/openrtb2/track/pixel?t=token-imp' });
      sinon.assert.calledOnce(triggerPixelStub);
      sinon.assert.calledWith(triggerPixelStub, PROD_HOST + '/openrtb2/track/pixel?t=token-imp');
    });

    it('does nothing without a billing pixel', function () {
      spec.onBidBillable({});
      spec.onBidBillable({ burl: '' });
      sinon.assert.notCalled(triggerPixelStub);
    });
  });
});
