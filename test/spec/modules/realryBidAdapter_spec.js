import { expect } from 'chai';
import { spec } from 'modules/realryBidAdapter.js';
import { BANNER, NATIVE } from 'src/mediaTypes.js';
import { config } from 'src/config.js';

const ENDPOINT = 'https://bid.realry.com/bid/openrtb';

function bannerBid(params = { placementId: 'home-atf' }) {
  return {
    bidder: 'realry',
    bidId: 'bid-banner-1',
    adUnitCode: 'div-banner',
    transactionId: 'tx-1',
    auctionId: 'auc-1',
    params,
    mediaTypes: { banner: { sizes: [[300, 250], [728, 90]] } },
    ortb2Imp: { ext: { gpid: '/1234/home#div-banner' } },
  };
}

function nativeBid(params = { placementId: 'pdp-rail' }) {
  return {
    bidder: 'realry',
    bidId: 'bid-native-1',
    adUnitCode: 'div-native',
    transactionId: 'tx-2',
    auctionId: 'auc-1',
    params,
    mediaTypes: {
      native: {
        ortb: {
          assets: [
            { id: 1, required: 1, title: { len: 90 } },
            { id: 2, required: 1, img: { type: 3, wmin: 300, hmin: 250 } },
            { id: 3, data: { type: 1, len: 40 } },
            { id: 4, data: { type: 6 } },
          ],
        },
      },
    },
  };
}

function bidderRequest(bids) {
  return {
    bidderCode: 'realry',
    bidderRequestId: 'breq-1',
    auctionId: 'auc-1',
    timeout: 1000,
    refererInfo: { page: 'https://publisher.example/articles/handbags', domain: 'publisher.example', ref: '' },
    ortb2: { site: { domain: 'publisher.example', page: 'https://publisher.example/articles/handbags' } },
    bids,
  };
}

describe('realryBidAdapter', function () {
  describe('isBidRequestValid', function () {
    it('accepts a valid banner bid', function () {
      expect(spec.isBidRequestValid(bannerBid())).to.equal(true);
    });
    it('accepts a valid native bid', function () {
      expect(spec.isBidRequestValid(nativeBid())).to.equal(true);
    });
    it('rejects when params missing', function () {
      const b = bannerBid(); delete b.params;
      expect(spec.isBidRequestValid(b)).to.equal(false);
    });
    it('rejects when placementId missing', function () {
      expect(spec.isBidRequestValid(bannerBid({}))).to.equal(false);
    });
    it('rejects when placementId is the empty string', function () {
      expect(spec.isBidRequestValid(bannerBid({ placementId: '' }))).to.equal(false);
    });
  });

  describe('spec metadata', function () {
    it('exposes the right code and media types', function () {
      expect(spec.code).to.equal('realry');
      expect(spec.supportedMediaTypes).to.deep.equal([BANNER, NATIVE]);
    });
  });

  describe('buildRequests', function () {
    it('builds a single POST request to the endpoint with credentials', function () {
      const bids = [bannerBid()];
      const reqs = spec.buildRequests(bids, bidderRequest(bids));
      expect(reqs).to.have.lengthOf(1);
      expect(reqs[0].method).to.equal('POST');
      expect(reqs[0].url).to.equal(ENDPOINT);
      expect(reqs[0].options.withCredentials).to.equal(true);
    });

    it('produces a valid oRTB body with imp[]', function () {
      const bids = [bannerBid()];
      const { data } = spec.buildRequests(bids, bidderRequest(bids))[0];
      expect(data).to.be.an('object');
      expect(data.imp).to.be.an('array').with.lengthOf(1);
    });

    it('uses placementId as tagid', function () {
      const bids = [bannerBid({ placementId: 'home-atf' })];
      const { data } = spec.buildRequests(bids, bidderRequest(bids))[0];
      expect(data.imp[0].tagid).to.equal('home-atf');
    });

    it('forwards GPID from ortb2Imp.ext.gpid', function () {
      const bids = [bannerBid()];
      const { data } = spec.buildRequests(bids, bidderRequest(bids))[0];
      expect(data.imp[0].ext.gpid).to.equal('/1234/home#div-banner');
    });

    it('forwards sellerId param to imp.ext.realry.sellerId when provided', function () {
      const bids = [bannerBid({ placementId: 'home-atf', sellerId: 'seller-acme' })];
      const { data } = spec.buildRequests(bids, bidderRequest(bids))[0];
      expect(data.imp[0].ext.realry.sellerId).to.equal('seller-acme');
    });

    it('omits imp.ext.realry.sellerId when sellerId not provided', function () {
      const bids = [bannerBid()];
      const { data } = spec.buildRequests(bids, bidderRequest(bids))[0];
      expect(data.imp[0].ext && data.imp[0].ext.realry).to.equal(undefined);
    });

    it('builds a banner imp with format', function () {
      const bids = [bannerBid()];
      const { data } = spec.buildRequests(bids, bidderRequest(bids))[0];
      expect(data.imp[0].banner).to.exist;
      expect(data.imp[0].banner.format).to.be.an('array');
    });

    it('builds a request for a native bid', function () {
      // Note: imp.native population requires Prebid's native module to be
      // loaded into the test bundle (see test/test_index.js). With this spec
      // run in isolation we only assert the imp count — the converter still
      // wires native correctly under a full Prebid build.
      const bids = [nativeBid()];
      const { data } = spec.buildRequests(bids, bidderRequest(bids))[0];
      expect(data.imp).to.have.lengthOf(1);
    });

    it('sets ext.prebid.channel to pbjs', function () {
      const bids = [bannerBid()];
      const { data } = spec.buildRequests(bids, bidderRequest(bids))[0];
      expect(data.ext.prebid.channel.name).to.equal('pbjs');
    });

    it('forwards user eids', function () {
      const bid = bannerBid();
      const eids = [{ source: 'id5-sync.com', uids: [{ id: 'ID5-1', atype: 1 }] }];
      bid.userIdAsEids = eids;
      const bids = [bid];
      const breq = bidderRequest(bids);
      breq.ortb2 = { ...breq.ortb2, user: { ext: { eids } } };
      const { data } = spec.buildRequests(bids, breq)[0];
      expect(data.user.ext.eids).to.deep.equal(eids);
    });
  });

  describe('interpretResponse', function () {
    function build(bids) {
      return spec.buildRequests(bids, bidderRequest(bids))[0];
    }

    it('returns [] on empty body', function () {
      expect(spec.interpretResponse({ body: null }, {})).to.deep.equal([]);
    });

    it('returns [] when no seatbid', function () {
      expect(spec.interpretResponse({ body: { id: 'x' } }, {})).to.deep.equal([]);
    });

    it('parses a banner bid (mediaType inferred from imp)', function () {
      const bids = [bannerBid()];
      const request = build(bids);
      // The converter keys context off the originating bidId — same value
      // flows through to imp.id, so the response must echo it as impid.
      const impid = bids[0].bidId;
      const response = {
        body: {
          id: 'breq-1',
          cur: 'USD',
          seatbid: [{
            seat: 'realry',
            bid: [{
              impid,
              price: 1.25,
              crid: 'prod-42',
              adomain: ['realry.com'],
              w: 300,
              h: 250,
              adm: '<a href="https://bid.realry.com/click?bid_id=bid-xyz"><img src="https://cdn.example.com/bag.jpg" /></a>',
              nurl: 'https://bid.realry.com/imp?bid_id=bid-xyz',
            }],
          }],
        },
      };
      const out = spec.interpretResponse(response, request);
      expect(out).to.have.lengthOf(1);
      expect(out[0].cpm).to.equal(1.25);
      expect(out[0].creativeId).to.equal('prod-42');
      expect(out[0].mediaType).to.equal(BANNER);
      expect(out[0].meta.advertiserDomains).to.deep.equal(['realry.com']);
    });

    it('parses a native bid (mediaType inferred from native imp)', function () {
      const bids = [nativeBid()];
      const request = build(bids);
      const impid = bids[0].bidId;
      const admObject = {
        ver: '1.2',
        assets: [
          { id: 1, title: { text: 'Leather Crossbody Bag' } },
          { id: 2, img: { type: 3, url: 'https://cdn.example.com/bag.jpg' } },
          { id: 3, data: { type: 1, value: 'Acme Boutique' } },
          { id: 4, data: { type: 6, value: 'USD 0.85' } },
        ],
        link: { url: 'https://bid.realry.com/click?bid_id=bid-abc' },
      };
      const response = {
        body: {
          id: 'breq-1',
          cur: 'USD',
          seatbid: [{
            seat: 'realry',
            bid: [{
              impid,
              price: 0.85,
              crid: 'prod-42',
              adm: JSON.stringify(admObject),
              nurl: 'https://bid.realry.com/imp?bid_id=bid-abc',
            }],
          }],
        },
      };
      const out = spec.interpretResponse(response, request);
      expect(out).to.have.lengthOf(1);
      expect(out[0].mediaType).to.equal(NATIVE);
      expect(out[0].cpm).to.equal(0.85);
    });

    // Multi-format imp regression: if the imp opts into both banner AND
    // native, the adapter must NOT pre-decide media type at request time
    // — the server picks per bid. mtype is sniffed from the adm shape
    // (`{` = native admObject JSON, anything else = banner HTML).
    function multiFormatBid() {
      const b = bannerBid();
      b.bidId = 'bid-mf-1';
      b.adUnitCode = 'div-mf';
      b.mediaTypes = {
        banner: { sizes: [[300, 250]] },
        native: { ortb: { assets: [{ id: 1, required: 1, title: { len: 90 } }] } },
      };
      return b;
    }

    it('routes a banner adm to BANNER on a multi-format imp', function () {
      const bids = [multiFormatBid()];
      const request = build(bids);
      const response = {
        body: {
          id: 'breq-mf',
          cur: 'USD',
          seatbid: [{
            seat: 'realry',
            bid: [{
              impid: bids[0].bidId,
              price: 1.10,
              crid: 'prod-mf',
              adomain: ['realry.com'],
              w: 300,
              h: 250,
              adm: '<a href="https://bid.realry.com/click?bid_id=bid-mf"><img src="https://cdn.example.com/bag.jpg" /></a>',
            }],
          }],
        },
      };
      const out = spec.interpretResponse(response, request);
      expect(out).to.have.lengthOf(1);
      expect(out[0].mediaType).to.equal(BANNER);
    });

    it('routes a Native 1.2 admObject to NATIVE on a multi-format imp', function () {
      const bids = [multiFormatBid()];
      const request = build(bids);
      const admObject = {
        ver: '1.2',
        assets: [{ id: 1, title: { text: 'Leather Crossbody Bag' } }],
        link: { url: 'https://bid.realry.com/click?bid_id=bid-mf' },
      };
      const response = {
        body: {
          id: 'breq-mf',
          cur: 'USD',
          seatbid: [{
            seat: 'realry',
            bid: [{
              impid: bids[0].bidId,
              price: 0.95,
              crid: 'prod-mf',
              adm: JSON.stringify(admObject),
            }],
          }],
        },
      };
      const out = spec.interpretResponse(response, request);
      expect(out).to.have.lengthOf(1);
      expect(out[0].mediaType).to.equal(NATIVE);
    });
  });

  afterEach(function () { config.resetConfig(); });
});
