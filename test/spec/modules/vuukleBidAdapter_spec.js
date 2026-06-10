import { expect } from 'chai';
import { spec } from 'modules/vuukleBidAdapter.js';
import { BANNER, VIDEO, NATIVE } from 'src/mediaTypes.js';
import { config } from 'src/config.js';

const ENDPOINT = 'https://rtb.vuukle.com/openrtb2/web';

function bannerBid(params = { sid: 'vuukle-test' }) {
  return {
    bidder: 'vuukle',
    bidId: 'bid-banner-1',
    adUnitCode: 'div-banner',
    transactionId: 'tx-1',
    auctionId: 'auc-1',
    params,
    mediaTypes: { banner: { sizes: [[300, 250], [728, 90]] } },
    ortb2Imp: { ext: { gpid: '/1234/home#div-banner' } },
  };
}

function videoBid(context = 'outstream', params = { sid: 'vuukle-test' }) {
  return {
    bidder: 'vuukle',
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

function nativeBid(params = { sid: 'vuukle-test' }) {
  return {
    bidder: 'vuukle',
    bidId: 'bid-native-1',
    adUnitCode: 'div-native',
    transactionId: 'tx-3',
    auctionId: 'auc-1',
    params,
    mediaTypes: {
      native: {
        ortb: {
          assets: [
            { id: 1, required: 1, title: { len: 80 } },
            { id: 2, required: 1, img: { type: 3, w: 300, h: 250 } },
          ],
        },
      },
    },
  };
}

function bidderRequest(bids) {
  return {
    bidderCode: 'vuukle',
    bidderRequestId: 'breq-1',
    auctionId: 'auc-1',
    timeout: 1000,
    refererInfo: { page: 'https://example.com/article', domain: 'example.com', ref: '' },
    ortb2: { site: { domain: 'example.com', page: 'https://example.com/article' } },
    bids,
  };
}

describe('vuukleBidAdapter', function () {
  describe('isBidRequestValid', function () {
    it('accepts a valid banner bid', function () {
      expect(spec.isBidRequestValid(bannerBid())).to.equal(true);
    });
    it('rejects when params missing', function () {
      const b = bannerBid(); delete b.params;
      expect(spec.isBidRequestValid(b)).to.equal(false);
    });
    it('rejects when sid missing', function () {
      expect(spec.isBidRequestValid(bannerBid({}))).to.equal(false);
    });
    it('accepts a valid video bid', function () {
      expect(spec.isBidRequestValid(videoBid())).to.equal(true);
    });
    it('rejects video without mimes', function () {
      const b = videoBid(); b.mediaTypes.video.mimes = [];
      expect(spec.isBidRequestValid(b)).to.equal(false);
    });
    it('rejects video without playerSize', function () {
      const b = videoBid(); delete b.mediaTypes.video.playerSize; delete b.sizes;
      expect(spec.isBidRequestValid(b)).to.equal(false);
    });
    it('accepts a valid native bid', function () {
      expect(spec.isBidRequestValid(nativeBid())).to.equal(true);
    });
  });

  describe('spec metadata', function () {
    it('has the right code, gvlid and media types', function () {
      expect(spec.code).to.equal('vuukle');
      expect(spec.gvlid).to.equal(1004);
      expect(spec.supportedMediaTypes).to.include.members([BANNER, VIDEO, NATIVE]);
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

    it('produces a valid oRTB body with imp + site.publisher.id = sid', function () {
      const bids = [bannerBid({ sid: 'vuukle-abc' })];
      const { data } = spec.buildRequests(bids, bidderRequest(bids))[0];
      expect(data).to.be.an('object');
      expect(data.imp).to.be.an('array').with.lengthOf(1);
      expect(data.site.publisher.id).to.equal('vuukle-abc');
    });

    it('sets a banner imp with format and tagid from adUnitCode', function () {
      const bids = [bannerBid()];
      const { data } = spec.buildRequests(bids, bidderRequest(bids))[0];
      expect(data.imp[0].banner).to.exist;
      expect(data.imp[0].banner.format).to.be.an('array');
      expect(data.imp[0].tagid).to.equal('div-banner');
      expect(data.imp[0].ext.gpid).to.equal('/1234/home#div-banner');
    });

    it('uses placementId as tagid when provided', function () {
      const bids = [bannerBid({ sid: 'vuukle-test', placementId: 'home-atf' })];
      const { data } = spec.buildRequests(bids, bidderRequest(bids))[0];
      expect(data.imp[0].tagid).to.equal('home-atf');
    });

    it('forwards params.bidfloor to imp.bidfloor', function () {
      const bids = [bannerBid({ sid: 'vuukle-test', bidfloor: 1.75 })];
      const { data } = spec.buildRequests(bids, bidderRequest(bids))[0];
      expect(data.imp[0].bidfloor).to.equal(1.75);
      expect(data.imp[0].bidfloorcur).to.equal('USD');
    });

    it('builds a request for a video bid', function () {
      const bids = [videoBid('instream')];
      const { data } = spec.buildRequests(bids, bidderRequest(bids))[0];
      expect(data.imp).to.have.lengthOf(1);
    });

    it('builds a request for a native bid', function () {
      const bids = [nativeBid()];
      const { data } = spec.buildRequests(bids, bidderRequest(bids))[0];
      expect(data.imp).to.have.lengthOf(1);
    });

    it('forwards user eids', function () {
      const bid = bannerBid();
      const eids = [{ source: 'id5.io', uids: [{ id: 'ID5-1', atype: 1 }] }];
      bid.userIdAsEids = eids;
      const bids = [bid];
      const breq = bidderRequest(bids);
      breq.ortb2 = { ...breq.ortb2, user: { ext: { eids } } };
      const { data } = spec.buildRequests(bids, breq)[0];
      expect(data.user.ext.eids).to.deep.equal(eids);
    });

    it('forwards supply chain (schain)', function () {
      const schain = { complete: 1, ver: '1.0', nodes: [{ asi: 'vuukle.com', sid: 'vuukle-test', hp: 1 }] };
      const bids = [bannerBid()];
      const breq = bidderRequest(bids);
      breq.ortb2 = { ...breq.ortb2, source: { ext: { schain } } };
      const { data } = spec.buildRequests(bids, breq)[0];
      const sc = (data.source && (data.source.schain || (data.source.ext && data.source.ext.schain)));
      expect(sc).to.deep.equal(schain);
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

    it('parses a banner bid', function () {
      const bids = [bannerBid()];
      const request = build(bids);
      const response = {
        body: {
          id: 'breq-1',
          cur: 'USD',
          seatbid: [{
            seat: 'pubmatic',
            bid: [{
              impid: 'bid-banner-1',
              price: 3.21,
              crid: 'cr-9',
              adomain: ['acme.com'],
              w: 300,
              h: 250,
              adm: '<div>ad</div>',
              mtype: 1
            }]
          }]
        }
      };
      const out = spec.interpretResponse(response, request);
      expect(out).to.have.lengthOf(1);
      expect(out[0].cpm).to.equal(3.21);
      expect(out[0].creativeId).to.equal('cr-9');
      expect(out[0].width).to.equal(300);
      expect(out[0].height).to.equal(250);
      expect(out[0].mediaType).to.equal(BANNER);
      expect(out[0].meta.advertiserDomains).to.deep.equal(['acme.com']);
    });

    it('parses an outstream video bid and attaches a renderer', function () {
      const bids = [videoBid('outstream')];
      const request = build(bids);
      const response = {
        body: {
          id: 'breq-1',
          cur: 'USD',
          seatbid: [{
            seat: 'unruly',
            bid: [{
              impid: 'bid-video-1',
              price: 8.5,
              crid: 'v-1',
              adomain: ['brand.com'],
              w: 640,
              h: 480,
              adm: '<VAST version="4.2"></VAST>',
              mtype: 2
            }]
          }]
        }
      };
      const out = spec.interpretResponse(response, request);
      expect(out).to.have.lengthOf(1);
      expect(out[0].mediaType).to.equal(VIDEO);
      expect(out[0].renderer).to.exist;
    });
  });

  describe('getUserSyncs', function () {
    it('returns [] when neither iframe nor pixel is enabled', function () {
      expect(spec.getUserSyncs({ iframeEnabled: false, pixelEnabled: false }, [])).to.deep.equal([]);
    });
    it('returns an iframe sync when iframe is enabled', function () {
      const syncs = spec.getUserSyncs({ iframeEnabled: true, pixelEnabled: true }, []);
      expect(syncs).to.have.lengthOf(1);
      expect(syncs[0].type).to.equal('iframe');
    });
    it('returns a pixel sync when only pixel is enabled', function () {
      const syncs = spec.getUserSyncs({ iframeEnabled: false, pixelEnabled: true }, []);
      expect(syncs[0].type).to.equal('image');
    });
    it('forwards consent params (gdpr, usp, gpp)', function () {
      const syncs = spec.getUserSyncs(
        { iframeEnabled: true },
        [],
        { gdprApplies: true, consentString: 'CONSENT' },
        '1YNN',
        { gppString: 'GPP', applicableSections: [7, 8] },
      );
      expect(syncs[0].url).to.contain('gdpr=1');
      expect(syncs[0].url).to.contain('gdpr_consent=CONSENT');
      expect(syncs[0].url).to.contain('us_privacy=1YNN');
      expect(syncs[0].url).to.contain('gpp=GPP');
      expect(syncs[0].url).to.contain('gpp_sid=7%2C8');
    });
  });

  afterEach(function () { config.resetConfig(); });
});
