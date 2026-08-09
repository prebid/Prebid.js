import { expect } from 'chai';
import { spec } from 'modules/advertronicBidAdapter.js';

describe('advertronicBidAdapter', function () {
  const bannerBidRequest = {
    bidder: 'advertronic',
    bidId: 'bid-1',
    adUnitCode: 'div-banner',
    transactionId: 'txn-1',
    params: { publisherId: '7', placementId: 'tok123abc456' },
    mediaTypes: { banner: { sizes: [[300, 250], [300, 600]] } },
  };

  const videoBidRequest = {
    bidder: 'advertronic',
    bidId: 'bid-2',
    adUnitCode: 'div-video',
    transactionId: 'txn-2',
    params: { publisherId: '7', placementId: 'tokvideo0001' },
    mediaTypes: {
      video: { context: 'outstream', playerSize: [[640, 360]], mimes: ['video/mp4'] },
    },
  };

  const bidderRequest = {
    bidderCode: 'advertronic',
    auctionId: 'auc-1',
    bidderRequestId: 'br-1',
    timeout: 1000,
    bids: [bannerBidRequest, videoBidRequest],
    refererInfo: { page: 'https://pub.example/article' },
  };

  describe('isBidRequestValid', function () {
    it('accepts valid params', function () {
      expect(spec.isBidRequestValid(bannerBidRequest)).to.equal(true);
    });
    it('rejects missing placementId', function () {
      expect(spec.isBidRequestValid({ params: { publisherId: '7' } })).to.equal(false);
    });
    it('rejects missing publisherId', function () {
      expect(spec.isBidRequestValid({ params: { placementId: 'tok' } })).to.equal(false);
    });
    it('rejects non-numeric publisherId', function () {
      expect(spec.isBidRequestValid({ params: { placementId: 'tok', publisherId: 'oops' } })).to.equal(false);
    });
    it('rejects numeric placementId (string token expected)', function () {
      expect(spec.isBidRequestValid({ params: { placementId: 123, publisherId: '7' } })).to.equal(false);
    });
  });

  describe('buildRequests', function () {
    it('sends a single POST with ORTB payload and credentials', function () {
      const reqs = spec.buildRequests([bannerBidRequest, videoBidRequest], bidderRequest);
      expect(reqs).to.have.lengthOf(1);
      const req = reqs[0];
      expect(req.method).to.equal('POST');
      expect(req.url).to.equal('https://ssp.advertronic.io/prebid/v1/auction');
      expect(req.options.withCredentials).to.equal(true);

      const data = req.data;
      expect(data.imp).to.have.lengthOf(2);
      expect(data.imp[0].tagid).to.equal('tok123abc456');
      expect(data.imp[0].banner.format[0]).to.deep.include({ w: 300, h: 250 });
      expect(data.imp[1].tagid).to.equal('tokvideo0001');
      if (FEATURES.VIDEO) {
        expect(data.imp[1].video).to.be.an('object');
      }
      expect(data.site.publisher.id).to.equal('7');
      expect(data.tmax).to.equal(1000);
    });
  });

  describe('interpretResponse', function () {
    function ortbResponse() {
      const reqs = spec.buildRequests([bannerBidRequest, videoBidRequest], bidderRequest);
      const request = reqs[0];
      const impidBanner = request.data.imp[0].id;
      const impidVideo = request.data.imp[1].id;
      const body = {
        id: request.data.id,
        cur: 'RUB',
        seatbid: [
          {
            seat: 'advertronic',
            bid: [
              {
                id: 'a-1',
                impid: impidBanner,
                price: 40,
                adm: '<div>ad</div>',
                crid: 'cr1',
                adomain: ['adv.ru'],
                w: 300,
                h: 250,
                mtype: 1,
              },
              {
                id: 'a-2',
                impid: impidVideo,
                price: 55,
                adm: '<VAST version="3.0"></VAST>',
                crid: 'cr2',
                adomain: ['video-adv.ru'],
                w: 640,
                h: 360,
                mtype: 2,
                api: 2,
              },
            ],
          },
        ],
      };
      return { request, body };
    }

    it('maps a banner bid', function () {
      const { request, body } = ortbResponse();
      const bids = spec.interpretResponse({ body }, request);
      expect(bids).to.have.lengthOf(2);
      const b = bids.find((x) => x.requestId === 'bid-1');
      expect(b.cpm).to.equal(40);
      expect(b.currency).to.equal('RUB');
      expect(b.netRevenue).to.equal(true);
      expect(b.ttl).to.equal(300);
      expect(b.mediaType).to.equal('banner');
      expect(b.ad).to.equal('<div>ad</div>');
      expect(b.creativeId).to.equal('cr1');
      expect(b.width).to.equal(300);
      expect(b.height).to.equal(250);
      expect(b.meta.advertiserDomains).to.deep.equal(['adv.ru']);
    });

    if (FEATURES.VIDEO) {
      it('maps a video bid: vastXml, VPAID flag, outstream renderer', function () {
        const { request, body } = ortbResponse();
        const bids = spec.interpretResponse({ body }, request);
        const v = bids.find((x) => x.requestId === 'bid-2');
        expect(v.mediaType).to.equal('video');
        expect(v.vastXml).to.contain('<VAST');
        expect(v.advtVpaid).to.equal(true);
        expect(v.renderer).to.be.an('object');
        expect(v.renderer.url).to.equal('https://ssp.advertronic.io/tag/prebid-renderer-v1.js');
      });
    }

    it('returns no bids on empty body (204)', function () {
      const reqs = spec.buildRequests([bannerBidRequest], bidderRequest);
      expect(spec.interpretResponse({ body: null }, reqs[0])).to.deep.equal([]);
      expect(spec.interpretResponse(undefined, reqs[0])).to.deep.equal([]);
    });
  });

  describe('getUserSyncs', function () {
    it('returns the iframe sync when iframeEnabled', function () {
      const syncs = spec.getUserSyncs({ iframeEnabled: true });
      expect(syncs).to.deep.equal([
        { type: 'iframe', url: 'https://ssp.advertronic.io/prebid/v1/sync' },
      ]);
    });
    it('returns nothing otherwise (no pixel sync)', function () {
      expect(spec.getUserSyncs({ pixelEnabled: true })).to.deep.equal([]);
    });
  });
});
