import { expect } from 'chai';
import { spec } from 'modules/adhouseBidAdapter.js';
import { BANNER, VIDEO } from 'src/mediaTypes.js';

describe('adhouseBidAdapter', function () {
  const bannerBid = {
    bidder: 'adhouse',
    params: { placementId: '12345' },
    adUnitCode: 'div-banner',
    bidId: 'bid-1',
    transactionId: 'tx-1',
    auctionId: 'auc-1',
    mediaTypes: {
      banner: { sizes: [[300, 250], [728, 90]] }
    },
    ortb2Imp: {}
  };

  const videoBid = {
    bidder: 'adhouse',
    params: { placementId: '999999', videoType: 'standart_video' },
    adUnitCode: 'div-video',
    bidId: 'bid-2',
    transactionId: 'tx-2',
    auctionId: 'auc-1',
    mediaTypes: {
      video: {
        context: 'instream',
        playerSize: [[640, 360]],
        mimes: ['video/mp4'],
        protocols: [2, 3]
      }
    },
    ortb2Imp: {}
  };

  const bidderRequest = {
    bidderCode: 'adhouse',
    auctionId: 'auc-1',
    bidderRequestId: 'req-1',
    timeout: 2000,
    refererInfo: { page: 'https://example.com/article', domain: 'example.com' }
  };

  describe('isBidRequestValid', function () {
    it('returns true when placementId is present', function () {
      expect(spec.isBidRequestValid(bannerBid)).to.equal(true);
    });

    it('accepts numeric placementId', function () {
      expect(spec.isBidRequestValid({ params: { placementId: 555 } })).to.equal(true);
    });

    it('returns false when params missing', function () {
      expect(spec.isBidRequestValid({})).to.equal(false);
    });

    it('returns false when placementId missing/empty', function () {
      expect(spec.isBidRequestValid({ params: {} })).to.equal(false);
      expect(spec.isBidRequestValid({ params: { placementId: '' } })).to.equal(false);
    });

    it('rejects an unknown videoType', function () {
      expect(spec.isBidRequestValid({ params: { placementId: '1', videoType: 'banner' } })).to.equal(false);
    });
  });

  describe('buildRequests', function () {
    it('returns empty array with no bids', function () {
      expect(spec.buildRequests([], bidderRequest)).to.deep.equal([]);
    });

    it('builds a single POST and leaves content type at the ajax default', function () {
      const reqs = spec.buildRequests([bannerBid], bidderRequest);
      expect(reqs).to.have.lengthOf(1);
      const r = reqs[0];
      expect(r.method).to.equal('POST');
      expect(r.url).to.equal('https://bid.adhouse.pro/openrtb2/auction');
      expect(r.options.withCredentials).to.equal(true);
      expect(r.options.contentType).to.equal(undefined);
      expect(r.data).to.be.an('object');
      expect(r.data.imp).to.be.an('array').with.lengthOf(1);
    });

    it('carries placementId in tagid and imp.ext.adhouse', function () {
      const r = spec.buildRequests([bannerBid], bidderRequest)[0];
      const imp = r.data.imp[0];
      expect(imp.tagid).to.equal('12345');
      expect(imp.ext.adhouse.placementId).to.equal('12345');
    });

    it('asks the floors module for USD and copies the result onto the imp', function () {
      const bid = Object.assign({}, bannerBid, {
        getFloor: function () {
          return { floor: 1.25, currency: 'USD' };
        }
      });
      const imp = spec.buildRequests([bid], bidderRequest)[0].data.imp[0];
      expect(imp.bidfloor).to.equal(1.25);
      expect(imp.bidfloorcur).to.equal('USD');
    });

    it('includes a banner object', function () {
      const r = spec.buildRequests([bannerBid], bidderRequest)[0];
      expect(r.data.imp[0].banner).to.be.an('object');
    });

    (FEATURES.VIDEO ? it : it.skip)('includes a video object and the videoType hint', function () {
      const imp = spec.buildRequests([videoBid], bidderRequest)[0].data.imp[0];
      expect(imp.video).to.be.an('object');
      expect(imp.ext.adhouse.videoType).to.equal('standart_video');
    });
  });

  describe('interpretResponse', function () {
    function buildRequestData(bid) {
      return spec.buildRequests([bid], bidderRequest)[0];
    }

    it('returns [] for an empty body', function () {
      expect(spec.interpretResponse({ body: {} }, buildRequestData(bannerBid))).to.deep.equal([]);
      expect(spec.interpretResponse({}, buildRequestData(bannerBid))).to.deep.equal([]);
    });

    it('parses a banner seatbid into a USD Prebid bid', function () {
      const request = buildRequestData(bannerBid);
      const response = {
        body: {
          id: 'auc-1',
          cur: 'USD',
          seatbid: [{
            seat: 'adhouse',
            bid: [{
              id: 'b1',
              impid: request.data.imp[0].id,
              price: 4.2,
              adm: '<div>ad</div>',
              crid: '99',
              w: 300,
              h: 250,
              mtype: 1,
              adomain: ['brand.com']
            }]
          }]
        }
      };
      const bids = spec.interpretResponse(response, request);
      expect(bids).to.have.lengthOf(1);
      expect(bids[0].cpm).to.equal(4.2);
      expect(bids[0].currency).to.equal('USD');
      expect(bids[0].width).to.equal(300);
      expect(bids[0].height).to.equal(250);
      expect(bids[0].ad).to.equal('<div>ad</div>');
      expect(bids[0].mediaType).to.equal(BANNER);
      expect(bids[0].meta.advertiserDomains).to.deep.equal(['brand.com']);
    });

    (FEATURES.VIDEO ? it : it.skip)('parses a video seatbid into a VAST bid', function () {
      const request = buildRequestData(videoBid);
      const vast = '<VAST version="3.0"></VAST>';
      const response = {
        body: {
          id: 'auc-1',
          cur: 'USD',
          seatbid: [{
            seat: 'adhouse',
            bid: [{
              id: 'b2',
              impid: request.data.imp[0].id,
              price: 9,
              adm: vast,
              crid: '77',
              w: 640,
              h: 360,
              mtype: 2,
              adomain: ['brand.com']
            }]
          }]
        }
      };
      const bids = spec.interpretResponse(response, request);
      expect(bids).to.have.lengthOf(1);
      expect(bids[0].mediaType).to.equal(VIDEO);
      expect(bids[0].vastXml).to.equal(vast);
      expect(bids[0].currency).to.equal('USD');
    });
  });

  describe('getUserSyncs', function () {
    it('returns an empty array', function () {
      expect(spec.getUserSyncs({}, [])).to.deep.equal([]);
    });
  });
});
