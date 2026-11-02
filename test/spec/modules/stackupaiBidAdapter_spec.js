import { cloneDeep } from 'lodash';
import { config } from 'src/config.js';
import { server } from 'test/mocks/xhr.js';
import { spec } from '../../../modules/stackupaiBidAdapter.ts';

const DEFAULT_ENDPOINT = 'https://adserver.stackup-ai.com/openrtb2/auction';
const CUSTOM_ENDPOINT = 'https://pbs.stackup-ai.com/openrtb2/auction';
const DEFAULT_TIMEOUT_URL = 'https://events.adserver.stackup-ai.com/e/timeout';
const CUSTOM_TIMEOUT_URL = 'https://events.pbs.stackup-ai.com/e/timeout';

const bannerBidRequestBase = {
  adUnitCode: 'banner-ad-unit-code',
  auctionId: 'auction-id',
  bidId: 'banner-bid-id',
  bidder: 'stackupai',
  bidderRequestId: 'bidder-request-id',
  mediaTypes: { banner: { sizes: [[300, 250]] } },
  params: { tag: 'test-tag' },
};

const videoBidRequestBase = {
  adUnitCode: 'video-ad-unit-code',
  auctionId: 'auction-id',
  bidId: 'video-bid-id',
  bidder: 'stackupai',
  bidderRequestId: 'bidder-request-id',
  mediaTypes: {
    video: {
      context: 'instream',
      playerSize: [[1920, 1080]],
      mimes: ['video/mp4'],
      protocols: [2, 3, 7],
    },
  },
  params: { tag: 'test-tag' },
};

const bannerServerResponseBase = {
  body: {
    id: 'response-id',
    cur: 'USD',
    seatbid: [{
      seat: 'stackupai',
      bid: [{
        id: 'banner-bid',
        impid: 'banner-bid-id',
        price: 1.5,
        adm: '<div>banner-ad</div>',
        adomain: ['advertiser.com'],
        crid: 'banner-creative-id',
        w: 300,
        h: 250,
        mtype: 1,
      }],
    }],
  },
};

const VAST_XML = '<VAST version="4.2"><Ad id="test-ad"><InLine></InLine></Ad></VAST>';

const videoServerResponseBase = {
  body: {
    id: 'response-id',
    cur: 'USD',
    seatbid: [{
      seat: 'stackupai',
      bid: [{
        id: 'video-bid',
        impid: 'video-bid-id',
        price: 12,
        adm: VAST_XML,
        adomain: ['advertiser.com'],
        crid: 'video-creative-id',
        w: 1920,
        h: 1080,
        mtype: 2,
      }],
    }],
  },
};

// What Prebid passes to onTimeout: the bid request with params replaced by an
// array of the ad unit's stackupai params (adapterManager.callTimedOutBidders).
function timedOutBid(bidId, params = [{ tag: 'test-tag' }], timeout = 1000) {
  return { bidder: 'stackupai', bidId, adUnitCode: 'ad-unit-code', auctionId: 'auction-id', params, timeout };
}

function bidderRequestFor(bidRequests) {
  return {
    bids: bidRequests,
    auctionId: 'auction-id',
    bidderRequestId: 'bidder-request-id',
    ortb2: { site: { page: 'https://example.com' } },
  };
}

describe('Stackup bid adapter', () => {
  let bannerBidRequest;
  let videoBidRequest;

  beforeEach(() => {
    bannerBidRequest = cloneDeep(bannerBidRequestBase);
    videoBidRequest = cloneDeep(videoBidRequestBase);
  });

  afterEach(() => {
    config.resetConfig();
  });

  describe('spec', () => {
    it('has the required properties', () => {
      expect(spec).to.have.property('code', 'stackupai');
      expect(spec.supportedMediaTypes).to.have.members(['banner', 'video']);
      expect(spec.isBidRequestValid).to.be.a('function');
      expect(spec.buildRequests).to.be.a('function');
      expect(spec.interpretResponse).to.be.a('function');
      expect(spec.onTimeout).to.be.a('function');
    });
  });

  describe('isBidRequestValid', () => {
    it('accepts a valid tag', () => {
      expect(spec.isBidRequestValid(bannerBidRequest)).to.be.true;
    });

    it('accepts letters, digits, dash and underscore up to 128 chars', () => {
      bannerBidRequest.params = { tag: 'pbjs-test_ABC123' };
      expect(spec.isBidRequestValid(bannerBidRequest)).to.be.true;
      bannerBidRequest.params = { tag: 'a'.repeat(128) };
      expect(spec.isBidRequestValid(bannerBidRequest)).to.be.true;
    });

    it('rejects missing params', () => {
      bannerBidRequest.params = undefined;
      expect(spec.isBidRequestValid(bannerBidRequest)).to.be.false;
    });

    it('rejects a missing tag', () => {
      bannerBidRequest.params = { placementId: 'test-tag' };
      expect(spec.isBidRequestValid(bannerBidRequest)).to.be.false;
    });

    [
      ['a number', 123],
      ['a boolean', true],
      ['an object', {}],
      ['an array', []],
      ['null', null],
      ['an empty string', ''],
    ].forEach(([description, tag]) => {
      it(`rejects a tag that is ${description}`, () => {
        bannerBidRequest.params = { tag };
        expect(spec.isBidRequestValid(bannerBidRequest)).to.be.false;
      });
    });

    it('rejects a tag with disallowed characters', () => {
      bannerBidRequest.params = { tag: 'bad tag/1' };
      expect(spec.isBidRequestValid(bannerBidRequest)).to.be.false;
    });

    it('rejects a tag longer than 128 chars', () => {
      bannerBidRequest.params = { tag: 'a'.repeat(129) };
      expect(spec.isBidRequestValid(bannerBidRequest)).to.be.false;
    });
  });

  describe('buildRequests', () => {
    it('sends one POST to the production endpoint by default', () => {
      const request = spec.buildRequests([bannerBidRequest], bidderRequestFor([bannerBidRequest]));

      expect(request.method).to.equal('POST');
      expect(request.url).to.equal(DEFAULT_ENDPOINT);
      expect(request.data.site.page).to.equal('https://example.com');
    });

    it('uses the endpoint from stackupai config', () => {
      config.setConfig({ stackupai: { endpoint: CUSTOM_ENDPOINT } });
      const request = spec.buildRequests([bannerBidRequest], bidderRequestFor([bannerBidRequest]));

      expect(request.url).to.equal(CUSTOM_ENDPOINT);
    });

    [
      ['not a URL', 'javascript:alert(1)'],
      ['plain http', 'http://pbs.stackup-ai.com/openrtb2/auction'],
      ['on another domain', 'https://pbs.example.com/openrtb2/auction'],
      ['on a lookalike domain', 'https://evilstackup-ai.com/openrtb2/auction'],
      ['under our domain as a subdomain of another', 'https://stackup-ai.com.example.com/openrtb2/auction'],
    ].forEach(([description, endpoint]) => {
      it(`ignores an endpoint that is ${description}`, () => {
        config.setConfig({ stackupai: { endpoint } });
        const request = spec.buildRequests([bannerBidRequest], bidderRequestFor([bannerBidRequest]));

        expect(request.url).to.equal(DEFAULT_ENDPOINT);
      });
    });

    it('puts the tag at imp.ext.prebid.bidder.stackupai (singular "bidder")', () => {
      const request = spec.buildRequests([bannerBidRequest], bidderRequestFor([bannerBidRequest]));
      const imp = request.data.imp[0];

      expect(imp.ext.prebid.bidder.stackupai).to.deep.equal({ tag: 'test-tag' });
      expect(imp.ext.prebid).to.not.have.property('bidders');
    });

    it('builds a banner imp', () => {
      const request = spec.buildRequests([bannerBidRequest], bidderRequestFor([bannerBidRequest]));
      const imp = request.data.imp[0];

      expect(imp.id).to.equal('banner-bid-id');
      expect(imp.banner.format).to.deep.equal([{ w: 300, h: 250 }]);
    });

    if (FEATURES.VIDEO) {
      it('builds a video imp', () => {
        const request = spec.buildRequests([videoBidRequest], bidderRequestFor([videoBidRequest]));
        const imp = request.data.imp[0];

        expect(imp.id).to.equal('video-bid-id');
        expect(imp.video).to.include({ w: 1920, h: 1080 });
        expect(imp.video.mimes).to.deep.equal(['video/mp4']);
      });
    }

    it('sends every ad unit as an imp of a single request', () => {
      videoBidRequest.params = { tag: 'other-tag' };
      const bids = [bannerBidRequest, videoBidRequest];
      const request = spec.buildRequests(bids, bidderRequestFor(bids));

      expect(request).to.not.be.an('array');
      expect(request.data.imp).to.have.length(2);
      expect(request.data.imp[0].id).to.equal('banner-bid-id');
      expect(request.data.imp[1].id).to.equal('video-bid-id');
      expect(request.data.imp[1].ext.prebid.bidder.stackupai.tag).to.equal('other-tag');
    });
  });

  describe('interpretResponse', () => {
    it('parses a banner bid', () => {
      const request = spec.buildRequests([bannerBidRequest], bidderRequestFor([bannerBidRequest]));
      const { bids } = spec.interpretResponse(cloneDeep(bannerServerResponseBase), request);

      expect(bids).to.have.length(1);
      expect(bids[0]).to.include({
        requestId: 'banner-bid-id',
        cpm: 1.5,
        currency: 'USD',
        mediaType: 'banner',
        width: 300,
        height: 250,
        creativeId: 'banner-creative-id',
        ad: '<div>banner-ad</div>',
        netRevenue: true,
        ttl: 300,
      });
      expect(bids[0].meta.advertiserDomains).to.deep.equal(['advertiser.com']);
    });

    it('defaults the currency to USD when the response has no cur', () => {
      const request = spec.buildRequests([bannerBidRequest], bidderRequestFor([bannerBidRequest]));
      const response = cloneDeep(bannerServerResponseBase);
      delete response.body.cur;
      const { bids } = spec.interpretResponse(response, request);

      expect(bids[0].currency).to.equal('USD');
    });

    it('keeps the response cur when present', () => {
      const request = spec.buildRequests([bannerBidRequest], bidderRequestFor([bannerBidRequest]));
      const response = cloneDeep(bannerServerResponseBase);
      response.body.cur = 'EUR';
      const { bids } = spec.interpretResponse(response, request);

      expect(bids[0].currency).to.equal('EUR');
    });

    if (FEATURES.VIDEO) {
      it('parses a video bid', () => {
        const request = spec.buildRequests([videoBidRequest], bidderRequestFor([videoBidRequest]));
        const { bids } = spec.interpretResponse(cloneDeep(videoServerResponseBase), request);

        expect(bids).to.have.length(1);
        expect(bids[0]).to.include({
          requestId: 'video-bid-id',
          cpm: 12,
          mediaType: 'video',
          vastXml: VAST_XML,
          creativeId: 'video-creative-id',
        });
      });
    }

    it('returns no bids for a no-fill (empty seatbid)', () => {
      const request = spec.buildRequests([bannerBidRequest], bidderRequestFor([bannerBidRequest]));
      const result = spec.interpretResponse({ body: { id: 'response-id', seatbid: [] } }, request);

      expect(result.bids ?? result).to.have.length(0);
    });

    it('returns no bids for an empty body (HTTP 204)', () => {
      const request = spec.buildRequests([bannerBidRequest], bidderRequestFor([bannerBidRequest]));

      expect(spec.interpretResponse({ body: undefined }, request)).to.deep.equal([]);
    });
  });

  describe('onTimeout', () => {
    const sent = () => server.requests;
    const sentBody = () => JSON.parse(sent()[0].requestBody);

    it('sends one keepalive text/plain POST without credentials to the timeout URL', () => {
      spec.onTimeout([timedOutBid('bid-1'), timedOutBid('bid-2', [{ tag: 'other-tag' }])]);

      expect(sent()).to.have.length(1);
      const [request] = sent();
      expect(request.method).to.equal('POST');
      expect(request.url).to.equal(DEFAULT_TIMEOUT_URL);
      expect(request.requestHeaders['content-type']).to.equal('text/plain');
      expect(request.fetch.request.keepalive).to.be.true;
      expect(request.withCredentials).to.be.false;
      expect(sentBody()).to.deep.equal({
        v: 1,
        tmo: 1000,
        bids: [{ id: 'bid-1', tag: 'test-tag' }, { id: 'bid-2', tag: 'other-tag' }],
      });
    });
    it('reads the tag from a params object as well as an array', () => {
      spec.onTimeout([timedOutBid('bid-1', { tag: 'test-tag' })]);

      expect(sentBody().bids).to.deep.equal([{ id: 'bid-1', tag: 'test-tag' }]);
    });

    it('keeps the tag when the ad unit names the same one twice', () => {
      spec.onTimeout([timedOutBid('bid-1', [{ tag: 'test-tag' }, { tag: 'test-tag' }])]);

      expect(sentBody().bids).to.deep.equal([{ id: 'bid-1', tag: 'test-tag' }]);
    });

    it('omits the tag when the ad unit names more than one', () => {
      spec.onTimeout([timedOutBid('bid-1', [{ tag: 'test-tag' }, { tag: 'other-tag' }])]);

      expect(sentBody().bids).to.deep.equal([{ id: 'bid-1' }]);
    });

    [
      ['invalid', [{ tag: 'bad tag/1' }]],
      ['missing', [{}]],
      ['not a string', [{ tag: 123 }]],
      ['absent with no params', []],
    ].forEach(([description, params]) => {
      it(`omits a tag that is ${description}`, () => {
        spec.onTimeout([timedOutBid('bid-1', params)]);

        expect(sentBody().bids).to.deep.equal([{ id: 'bid-1' }]);
      });
    });

    it('rounds the timeout to whole milliseconds', () => {
      spec.onTimeout([timedOutBid('bid-1', undefined, 999.6)]);

      expect(sentBody().tmo).to.equal(1000);
    });

    it('caps a report at 20 bids', () => {
      spec.onTimeout(Array.from({ length: 25 }, (_, i) => timedOutBid(`bid-${i}`)));

      expect(sentBody().bids).to.have.length(20);
      expect(sentBody().bids[19].id).to.equal('bid-19');
    });

    it('skips bids without a usable id', () => {
      spec.onTimeout([
        timedOutBid(undefined),
        timedOutBid(''),
        timedOutBid('x'.repeat(65)),
        timedOutBid('bid-1'),
      ]);

      expect(sentBody().bids).to.deep.equal([{ id: 'bid-1', tag: 'test-tag' }]);
    });

    it('sends nothing when no bid has a usable id', () => {
      spec.onTimeout([timedOutBid(undefined), timedOutBid('')]);

      expect(sent()).to.have.length(0);
    });

    it('sends nothing without timed-out bids', () => {
      spec.onTimeout([]);
      spec.onTimeout(undefined);

      expect(sent()).to.have.length(0);
    });

    [0, -1, undefined, 'soon'].forEach((timeout) => {
      it(`sends nothing when the timeout is ${String(timeout)}`, () => {
        spec.onTimeout([{ ...timedOutBid('bid-1'), timeout }]);

        expect(sent()).to.have.length(0);
      });
    });

    // Prebid calls onTimeout inside runWithBidder, so setBidderConfig applies.
    it('reports to the timeout URL of an endpoint set with setBidderConfig', () => {
      config.setBidderConfig({ bidders: ['stackupai'], config: { stackupai: { endpoint: CUSTOM_ENDPOINT } } });
      config.runWithBidder('stackupai', () => spec.onTimeout([timedOutBid('bid-1')]));

      expect(sent()[0].url).to.equal(CUSTOM_TIMEOUT_URL);
    });

    it('keeps the endpoint port in the timeout URL', () => {
      config.setConfig({ stackupai: { endpoint: 'https://pbs.stackup-ai.com:8443/openrtb2/auction' } });
      spec.onTimeout([timedOutBid('bid-1')]);

      expect(sent()[0].url).to.equal('https://events.pbs.stackup-ai.com:8443/e/timeout');
    });

    it('reports to the default timeout URL when the endpoint override is invalid', () => {
      config.setConfig({ stackupai: { endpoint: 'javascript:alert(1)' } });
      spec.onTimeout([timedOutBid('bid-1')]);

      expect(sent()[0].url).to.equal(DEFAULT_TIMEOUT_URL);
    });
  });
});
