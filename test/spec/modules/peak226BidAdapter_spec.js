import { expect } from 'chai';
import { spec } from 'modules/peak226BidAdapter.js';
import { BANNER, VIDEO, NATIVE } from 'src/mediaTypes.js';
import { config } from 'src/config.js';

const ENDPOINTS = {
  us: 'https://us.peak226.com/openrtb2',
  eu: 'https://eu.peak226.com/openrtb2',
  jp: 'https://jp.peak226.com/openrtb2',
};

function bannerBid(params = { publisherId: 'pub-test', placementId: 'plc-test' }) {
  return {
    bidder: 'peak226',
    bidId: 'bid-banner-1',
    adUnitCode: 'div-banner',
    transactionId: 'tx-1',
    auctionId: 'auc-1',
    params,
    mediaTypes: { banner: { sizes: [[300, 250], [728, 90]] } },
    ortb2Imp: { ext: { gpid: '/1234/home#div-banner' } },
  };
}

function videoBid(context = 'outstream', params = { publisherId: 'pub-test', placementId: 'plc-test' }) {
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

function nativeBid(params = { publisherId: 'pub-test', placementId: 'plc-test' }) {
  return {
    bidder: 'peak226',
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
    // normally populated by core from mediaTypes.native ahead of buildRequests
    nativeOrtbRequest: {
      assets: [
        { id: 1, required: 1, title: { len: 80 } },
        { id: 2, required: 1, img: { type: 3, w: 300, h: 250 } },
      ],
    },
  };
}

// A single ad unit declaring all three formats at once. Reuses the mediaTypes shapes
// from the single-format fixtures above so the multiformat cases can't drift from them.
function multiFormatBid(params = { publisherId: 'pub-test', placementId: 'plc-test' }) {
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
    // normally populated by core from mediaTypes.native ahead of buildRequests
    nativeOrtbRequest: nativeBid().nativeOrtbRequest,
    ortb2Imp: { ext: { gpid: '/1234/home#div-multi' } },
  };
}

function bidderRequest(bids) {
  return {
    bidderCode: 'peak226',
    bidderRequestId: 'breq-1',
    auctionId: 'auc-1',
    timeout: 1000,
    refererInfo: { page: 'https://example.com/article', domain: 'example.com', ref: '' },
    ortb2: { site: { domain: 'example.com', page: 'https://example.com/article' } },
    bids,
  };
}

describe('peak226BidAdapter', function () {
  describe('isBidRequestValid', function () {
    it('accepts a valid banner bid', function () {
      expect(spec.isBidRequestValid(bannerBid())).to.equal(true);
    });
    it('rejects when params missing', function () {
      const b = bannerBid(); delete b.params;
      expect(spec.isBidRequestValid(b)).to.equal(false);
    });
    it('rejects when publisherId missing', function () {
      expect(spec.isBidRequestValid(bannerBid({ placementId: 'plc-test' }))).to.equal(false);
    });
    it('rejects when placementId missing', function () {
      expect(spec.isBidRequestValid(bannerBid({ publisherId: 'pub-test' }))).to.equal(false);
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
    it('accepts a multiformat (banner + video + native) bid', function () {
      expect(spec.isBidRequestValid(multiFormatBid())).to.equal(true);
    });
    it('rejects a whole multiformat bid when its video block is malformed', function () {
      // Validation is additive, not per-format: a video block missing mimes drops the
      // entire bid, banner and native opportunities included. Asserted so the trade-off
      // is a documented choice rather than a surprise.
      const b = multiFormatBid(); b.mediaTypes.video.mimes = [];
      expect(spec.isBidRequestValid(b)).to.equal(false);
    });
  });

  describe('spec metadata', function () {
    it('has the right code, gvlid and media types', function () {
      expect(spec.code).to.equal('peak226');
      expect(spec.gvlid).to.equal(1202);
      expect(spec.supportedMediaTypes).to.include.members([BANNER, VIDEO, NATIVE]);
    });
  });

  describe('buildRequests', function () {
    it('builds a single POST request to the default (us) endpoint', function () {
      const bids = [bannerBid()];
      const req = spec.buildRequests(bids, bidderRequest(bids));
      expect(req.method).to.equal('POST');
      expect(req.url).to.equal(ENDPOINTS.us);
    });

    it('routes to the eu endpoint when params.region is eu', function () {
      const bids = [bannerBid({ publisherId: 'pub-test', placementId: 'plc-test', region: 'eu' })];
      const req = spec.buildRequests(bids, bidderRequest(bids));
      expect(req.url).to.equal(ENDPOINTS.eu);
    });

    it('routes to the jp endpoint when params.region is jp', function () {
      const bids = [bannerBid({ publisherId: 'pub-test', placementId: 'plc-test', region: 'jp' })];
      const req = spec.buildRequests(bids, bidderRequest(bids));
      expect(req.url).to.equal(ENDPOINTS.jp);
    });

    it('produces a valid oRTB body with imp + site.publisher.id = publisherId', function () {
      const bids = [bannerBid({ publisherId: 'pub-abc', placementId: 'plc-test' })];
      const { data } = spec.buildRequests(bids, bidderRequest(bids));
      expect(data).to.be.an('object');
      expect(data.imp).to.be.an('array').with.lengthOf(1);
      expect(data.site.publisher.id).to.equal('pub-abc');
    });

    it('sets a banner imp with format and tagid from placementId', function () {
      const bids = [bannerBid({ publisherId: 'pub-test', placementId: 'home-atf' })];
      const { data } = spec.buildRequests(bids, bidderRequest(bids));
      expect(data.imp[0].banner).to.exist;
      expect(data.imp[0].banner.format).to.be.an('array');
      expect(data.imp[0].tagid).to.equal('home-atf');
      expect(data.imp[0].ext.gpid).to.equal('/1234/home#div-banner');
    });

    if (FEATURES.VIDEO) {
      it('builds a request for a video bid', function () {
        const bids = [videoBid('instream')];
        const { data } = spec.buildRequests(bids, bidderRequest(bids));
        expect(data.imp).to.have.lengthOf(1);
        expect(data.imp[0].video).to.exist;
      });
    }

    if (FEATURES.NATIVE) {
      it('builds a request for a native bid', function () {
        const bids = [nativeBid()];
        const { data } = spec.buildRequests(bids, bidderRequest(bids));
        expect(data.imp).to.have.lengthOf(1);
        expect(data.imp[0].native).to.exist;
      });
    }

    it('sends every declared format on a single imp for a multiformat ad unit', function () {
      // peak226 bids on any supported format: banner, video and native coexist on one
      // imp. No preferred-format selection, no format dropped.
      const bids = [multiFormatBid({ publisherId: 'pub-test', placementId: 'multi-atf' })];
      const { data } = spec.buildRequests(bids, bidderRequest(bids));
      expect(data.imp).to.have.lengthOf(1);
      expect(data.imp[0].banner).to.exist;
      expect(data.imp[0].tagid).to.equal('multi-atf');
      expect(data.imp[0].ext.gpid).to.equal('/1234/home#div-multi');
      if (FEATURES.VIDEO) {
        expect(data.imp[0].video).to.exist;
        expect(data.imp[0].video.mimes).to.deep.equal(['video/mp4']);
      }
      if (FEATURES.NATIVE) {
        expect(data.imp[0].native).to.exist;
      }
    });

    it('forwards user eids', function () {
      const bid = bannerBid();
      const eids = [{ source: 'id5.io', uids: [{ id: 'ID5-1', atype: 1 }] }];
      bid.userIdAsEids = eids;
      const bids = [bid];
      const breq = bidderRequest(bids);
      breq.ortb2 = { ...breq.ortb2, user: { ext: { eids } } };
      const { data } = spec.buildRequests(bids, breq);
      expect(data.user.ext.eids).to.deep.equal(eids);
    });

    it('forwards supply chain (schain)', function () {
      const schain = { complete: 1, ver: '1.0', nodes: [{ asi: 'peak226.com', sid: 'pub-test', hp: 1 }] };
      const bids = [bannerBid()];
      const breq = bidderRequest(bids);
      breq.ortb2 = { ...breq.ortb2, source: { ext: { schain } } };
      const { data } = spec.buildRequests(bids, breq);
      const sc = (data.source && (data.source.schain || (data.source.ext && data.source.ext.schain)));
      expect(sc).to.deep.equal(schain);
    });
  });

  describe('interpretResponse', function () {
    function build(bids) {
      return spec.buildRequests(bids, bidderRequest(bids));
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
            seat: 'peak226',
            bid: [{
              impid: 'bid-banner-1',
              price: 3.21,
              crid: 'cr-9',
              adomain: ['acme.com'],
              w: 300,
              h: 250,
              adm: '<div>ad</div>',
              mtype: 1,
            }],
          }],
        },
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

    it('parses a video bid without attaching a renderer', function () {
      const bids = [videoBid('outstream')];
      const request = build(bids);
      const response = {
        body: {
          id: 'breq-1',
          cur: 'USD',
          seatbid: [{
            seat: 'peak226',
            bid: [{
              impid: 'bid-video-1',
              price: 8.5,
              crid: 'v-1',
              adomain: ['brand.com'],
              w: 640,
              h: 480,
              adm: '<VAST version="4.2"></VAST>',
              mtype: 2,
            }],
          }],
        },
      };
      const out = spec.interpretResponse(response, request);
      expect(out).to.have.lengthOf(1);
      expect(out[0].mediaType).to.equal(VIDEO);
      // peak226 returns VAST directly with no bidder-hosted renderer.
      expect(out[0].renderer).to.not.exist;
      if (FEATURES.VIDEO) {
        expect(out[0].vastXml).to.equal('<VAST version="4.2"></VAST>');
      }
    });

    if (FEATURES.VIDEO) {
      it('parses banner and video bids returned against the same multiformat imp', function () {
        // The response side of "bid on any supported format": two bids share one impid
        // and are disambiguated purely by mtype.
        const bids = [multiFormatBid()];
        const request = build(bids);
        const response = {
          body: {
            id: 'breq-1',
            cur: 'USD',
            seatbid: [{
              seat: 'peak226',
              bid: [
                {
                  impid: 'bid-multi-1',
                  price: 2.5,
                  crid: 'cr-b',
                  adomain: ['acme.com'],
                  w: 300,
                  h: 250,
                  adm: '<div>ad</div>',
                  mtype: 1,
                },
                {
                  impid: 'bid-multi-1',
                  price: 8.5,
                  crid: 'cr-v',
                  adomain: ['brand.com'],
                  w: 640,
                  h: 480,
                  adm: '<VAST version="4.2"></VAST>',
                  mtype: 2,
                },
              ],
            }],
          },
        };
        const out = spec.interpretResponse(response, request);
        expect(out).to.have.lengthOf(2);
        expect(out.map((b) => b.mediaType)).to.have.members([BANNER, VIDEO]);
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
        const bids = [nativeBid()];
        const request = build(bids);
        const response = {
          body: {
            id: 'breq-1',
            cur: 'USD',
            seatbid: [{
              seat: 'peak226',
              bid: [{
                impid: 'bid-native-1',
                price: 1.5,
                crid: 'n-1',
                adomain: ['acme.com'],
                mtype: 4,
                adm: JSON.stringify({
                  assets: [
                    { id: 1, title: { text: 'Great offer' } },
                    { id: 2, img: { url: 'https://example.com/img.png', w: 300, h: 250 } },
                  ],
                  link: { url: 'https://example.com/click' },
                }),
              }],
            }],
          },
        };
        const out = spec.interpretResponse(response, request);
        expect(out).to.have.lengthOf(1);
        expect(out[0].mediaType).to.equal(NATIVE);
        expect(out[0].native.ortb.assets).to.have.lengthOf(2);
      });
    }
  });

  describe('getUserSyncs', function () {
    it('is not yet implemented (pending sync support confirmation)', function () {
      expect(spec.getUserSyncs).to.be.undefined;
    });
  });

  afterEach(function () { config.resetConfig(); });
});
