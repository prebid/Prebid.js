import { expect } from 'chai';
import { spec } from 'modules/truvidBidAdapter.js';
import { newBidder } from 'src/adapters/bidderFactory.js';
import { server } from 'test/mocks/xhr.js';

const PLACEMENT_ID = '7a2e91c4d05b3f68a1c9e0b4d7f25a36';

describe('Truvid Bid Adapter', function () {
  const adapter = newBidder(spec);

  const bannerBid = {
    bidder: 'truvid',
    bidId: 'bid1',
    params: { placementId: PLACEMENT_ID },
    mediaTypes: { banner: { sizes: [[300, 250], [728, 90]] } }
  };

  const videoBid = {
    bidder: 'truvid',
    bidId: 'bid2',
    params: { placementId: PLACEMENT_ID },
    mediaTypes: { video: { playerSize: [[640, 480]], maxduration: 30 } }
  };

  const bidderRequest = {
    bidderRequestId: 'req1',
    refererInfo: { page: 'https://example.com/page', domain: 'example.com' }
  };

  describe('spec', function () {
    it('registers under the truvid bidder code', function () {
      expect(spec.code).to.equal('truvid');
    });

    it('declares its GVL id', function () {
      expect(spec.gvlid).to.equal(100);
    });

    it('supports banner and video', function () {
      expect(spec.supportedMediaTypes).to.deep.equal(['banner', 'video']);
    });

    it('inherits the bidder adapter functions', function () {
      expect(adapter.callBids).to.exist.and.to.be.a('function');
    });
  });

  describe('isBidRequestValid', function () {
    it('accepts a non-empty string placementId', function () {
      expect(spec.isBidRequestValid({ params: { placementId: PLACEMENT_ID } })).to.equal(true);
    });

    it('rejects a missing bid, missing params and missing placementId', function () {
      expect(spec.isBidRequestValid(null)).to.equal(false);
      expect(spec.isBidRequestValid({})).to.equal(false);
      expect(spec.isBidRequestValid({ params: { bidFloor: 1 } })).to.equal(false);
    });

    it('rejects an empty or non-string placementId', function () {
      expect(spec.isBidRequestValid({ params: { placementId: '' } })).to.equal(false);
      expect(spec.isBidRequestValid({ params: { placementId: 12345 } })).to.equal(false);
    });

    it('does not accept the old "placement" param name', function () {
      expect(spec.isBidRequestValid({ params: { placement: PLACEMENT_ID } })).to.equal(false);
    });
  });

  describe('buildRequests', function () {
    it('posts to the Truvid endpoint with the placementId substituted in', function () {
      const request = spec.buildRequests([bannerBid], bidderRequest);

      expect(request.method).to.equal('POST');
      expect(request.url).to.equal(`https://us-e.tru-bid.com/ssp/${PLACEMENT_ID}`);
    });

    it('keeps the request a CORS simple request', function () {
      const request = spec.buildRequests([bannerBid], bidderRequest);

      expect(request.options.contentType).to.equal('text/plain');
      expect(() => JSON.parse(request.data)).to.not.throw();
    });

    it('carries the bids through for interpretResponse matching', function () {
      const request = spec.buildRequests([bannerBid], bidderRequest);

      expect(request.bids).to.deep.equal([bannerBid]);
    });

    it('builds a banner impression with all declared sizes', function () {
      const payload = JSON.parse(spec.buildRequests([bannerBid], bidderRequest).data);

      expect(payload.imp).to.have.lengthOf(1);
      expect(payload.imp[0].id).to.equal('bid1');
      expect(payload.imp[0].banner.w).to.equal(300);
      expect(payload.imp[0].banner.h).to.equal(250);
      expect(payload.imp[0].banner.format).to.deep.equal([{ w: 300, h: 250 }, { w: 728, h: 90 }]);
      expect(payload.site.page).to.equal('https://example.com/page');
    });

    it('builds a video impression with the declared constraints', function () {
      const payload = JSON.parse(spec.buildRequests([videoBid], bidderRequest).data);

      expect(payload.imp[0].video.w).to.equal(640);
      expect(payload.imp[0].video.h).to.equal(480);
      expect(payload.imp[0].video.maxduration).to.equal(30);
    });

    it('uses the static bidFloor and currency from params', function () {
      const bid = { ...bannerBid, params: { placementId: PLACEMENT_ID, bidFloor: 1.25, currency: 'EUR' } };
      const imp = JSON.parse(spec.buildRequests([bid], bidderRequest).data).imp[0];

      expect(imp.bidfloor).to.equal(1.25);
      expect(imp.bidfloorcur).to.equal('EUR');
    });

    it('prefers the floors module result, with the currency it returns', function () {
      const bid = { ...bannerBid, getFloor: () => ({ floor: 2, currency: 'GBP' }) };
      const imp = JSON.parse(spec.buildRequests([bid], bidderRequest).data).imp[0];

      expect(imp.bidfloor).to.equal(2);
      expect(imp.bidfloorcur).to.equal('GBP');
    });

    it('forwards GDPR and USP consent', function () {
      const request = spec.buildRequests([bannerBid], {
        ...bidderRequest,
        gdprConsent: { gdprApplies: true, consentString: 'CONSENT' },
        uspConsent: '1YNN'
      });
      const user = JSON.parse(request.data).user;

      expect(user.gdpr).to.equal(1);
      expect(user.gdprConsentString).to.equal('CONSENT');
      expect(user.usPrivacy).to.equal('1YNN');
    });

    it('forwards the supply chain under source.ext.schain', function () {
      const schain = { ver: '1.0', complete: 1, nodes: [{ asi: 'example.com', sid: '1', hp: 1 }] };
      const request = spec.buildRequests([bannerBid], { ...bidderRequest, ortb2: { source: { ext: { schain } } } });

      expect(JSON.parse(request.data).source.ext.schain).to.deep.equal(schain);
    });
  });

  describe('interpretResponse', function () {
    function responseFor(bid) {
      return {
        body: {
          cur: 'USD',
          seatbid: [{ bid: [bid] }]
        }
      };
    }

    it('returns an empty array for an empty or malformed response', function () {
      const request = spec.buildRequests([bannerBid], bidderRequest);

      expect(spec.interpretResponse({ body: {} }, request)).to.deep.equal([]);
      expect(spec.interpretResponse(undefined, request)).to.deep.equal([]);
    });

    it('maps a banner bid', function () {
      const request = spec.buildRequests([bannerBid], bidderRequest);
      const [bid] = spec.interpretResponse(responseFor({
        impid: 'bid1', price: 1.5, adm: '<div>ad</div>', crid: 'c1', w: 300, h: 250, mtype: 1, adomain: ['adv.com']
      }), request);

      expect(bid.requestId).to.equal('bid1');
      expect(bid.cpm).to.equal(1.5);
      expect(bid.mediaType).to.equal('banner');
      expect(bid.ad).to.equal('<div>ad</div>');
      expect(bid.width).to.equal(300);
      expect(bid.height).to.equal(250);
      expect(bid.creativeId).to.equal('c1');
      expect(bid.currency).to.equal('USD');
      expect(bid.netRevenue).to.equal(true);
      expect(bid.ttl).to.equal(1200);
      expect(bid.meta.advertiserDomains).to.deep.equal(['adv.com']);
    });

    it('maps a video bid to vastXml', function () {
      const request = spec.buildRequests([videoBid], bidderRequest);
      const [bid] = spec.interpretResponse(responseFor({
        impid: 'bid2', price: 3, adm: '<VAST version="3.0"></VAST>', crid: 'v1', mtype: 2
      }), request);

      expect(bid.mediaType).to.equal('video');
      expect(bid.vastXml).to.equal('<VAST version="3.0"></VAST>');
      expect(bid.width).to.equal(640);
      expect(bid.height).to.equal(480);
    });

    it('skips bids without a positive price', function () {
      const request = spec.buildRequests([bannerBid], bidderRequest);

      expect(spec.interpretResponse(responseFor({ impid: 'bid1', price: 0, adm: 'x' }), request)).to.deep.equal([]);
    });

    it('carries the win-notice nurl onto the bid response', function () {
      const request = spec.buildRequests([bannerBid], bidderRequest);
      const [bid] = spec.interpretResponse(responseFor({
        impid: 'bid1', price: 1, adm: 'x', mtype: 1, nurl: 'https://us-e.tru-bid.com/win?p=${AUCTION_PRICE}'
      }), request);

      expect(bid.nurl).to.equal('https://us-e.tru-bid.com/win?p=${AUCTION_PRICE}');
    });
  });

  describe('onBidWon', function () {
    it('does not throw and sends nothing when there is no nurl', function () {
      expect(() => spec.onBidWon({ cpm: 1 })).to.not.throw();
      expect(server.requests).to.have.lengthOf(0);
    });

    it('fires the win notice as a keepalive GET, with ${AUCTION_PRICE} replaced by originalCpm', function () {
      spec.onBidWon({
        cpm: 0.9,
        originalCpm: 1.5,
        nurl: 'https://us-e.tru-bid.com/win?p=${AUCTION_PRICE}'
      });

      expect(server.requests).to.have.lengthOf(1);
      const [noticeRequest] = server.requests;
      expect(noticeRequest.method).to.equal('GET');
      expect(noticeRequest.url).to.equal('https://us-e.tru-bid.com/win?p=1.5');
      if (typeof Request !== 'undefined' && 'keepalive' in Request.prototype) {
        expect(noticeRequest.fetch.request.keepalive).to.equal(true);
      }
    });

    it('falls back to cpm when originalCpm is absent', function () {
      spec.onBidWon({ cpm: 0.9, nurl: 'https://us-e.tru-bid.com/win?p=${AUCTION_PRICE}' });

      expect(server.requests).to.have.lengthOf(1);
      expect(server.requests[0].url).to.equal('https://us-e.tru-bid.com/win?p=0.9');
    });
  });

  describe('onTimeout', function () {
    it('does not throw', function () {
      expect(() => spec.onTimeout([{ bidder: 'truvid', timeout: 1000 }])).to.not.throw();
    });
  });
});
