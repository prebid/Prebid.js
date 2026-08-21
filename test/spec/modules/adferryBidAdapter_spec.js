import { expect } from 'chai';
import { spec } from 'modules/adferryBidAdapter.js';

describe('adferryBidAdapter', function () {
  const validBid = {
    bidder: 'adferry',
    bidId: 'bid123',
    params: { placementId: 'a1b2c3d4' },
    mediaTypes: { video: { context: 'instream', playerSize: [[640, 480]] } },
  };

  const bidderRequest = {
    timeout: 1000,
    refererInfo: { page: 'https://example.com/watch', domain: 'example.com' },
    gdprConsent: { gdprApplies: true, consentString: 'CONSENT_STRING' },
    uspConsent: '1YNN',
  };

  describe('isBidRequestValid', function () {
    it('accepts a video bid with a placementId', function () {
      expect(spec.isBidRequestValid(validBid)).to.equal(true);
    });

    it('rejects a bid with no placementId', function () {
      // The placementId is the only thing tying the request to a tag. Without
      // it the server answers 400, so failing here saves a round trip and
      // gives the publisher an error they can act on.
      const bid = { ...validBid, params: {} };
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('rejects a banner bid', function () {
      const bid = { ...validBid, mediaTypes: { banner: { sizes: [[300, 250]] } } };
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });
  });

  describe('buildRequests', function () {
    it('sends one request per bid', function () {
      // Not a style choice. The server caps concurrency per tag, so batching
      // would put placements in the same queue behind one another.
      const reqs = spec.buildRequests([validBid, { ...validBid, bidId: 'bid456' }], bidderRequest);
      expect(reqs).to.have.lengthOf(2);
    });

    it('puts placementId on imp[].tagid', function () {
      // This is the single field that joins Prebid to the portal. If it moves,
      // every integration silently 400s.
      const [req] = spec.buildRequests([validBid], bidderRequest);
      expect(req.data.imp[0].tagid).to.equal('a1b2c3d4');
    });

    it('forwards consent', function () {
      const [req] = spec.buildRequests([validBid], bidderRequest);
      expect(req.data.regs.gdpr).to.equal(1);
      expect(req.data.user.ext.consent).to.equal('CONSENT_STRING');
      expect(req.data.regs.ext.us_privacy).to.equal('1YNN');
    });

    it('falls back to 640x480 when no player size is given', function () {
      const bid = { ...validBid, mediaTypes: { video: { context: 'instream' } } };
      const [req] = spec.buildRequests([bid], bidderRequest);
      expect(req.data.imp[0].video.w).to.equal(640);
      expect(req.data.imp[0].video.h).to.equal(480);
    });
  });

  describe('interpretResponse', function () {
    const response = {
      body: {
        id: 'bid123',
        cur: 'USD',
        seatbid: [{
          seat: 'af_1a2b3c4d',
          bid: [{
            impid: 'bid123',
            price: 4.5,
            adm: '<VAST version="4.2"></VAST>',
            crid: 'af_1a2b3c4d',
            w: 640,
            h: 480,
            mtype: 2,
            adomain: ['brand.com'],
          }],
        }],
      },
    };

    it('maps a bid', function () {
      const [bid] = spec.interpretResponse(response);
      expect(bid.cpm).to.equal(4.5);
      expect(bid.requestId).to.equal('bid123');
      expect(bid.vastXml).to.contain('VAST');
      expect(bid.mediaType).to.equal('video');
      expect(bid.meta.advertiserDomains).to.deep.equal(['brand.com']);
    });

    it('returns nothing on a no-bid', function () {
      // A no-bid is the common case, not an error. Returning [] rather than
      // throwing keeps one empty seatbid from taking down the whole auction.
      expect(spec.interpretResponse({ body: { seatbid: [] } })).to.deep.equal([]);
      expect(spec.interpretResponse({ body: {} })).to.deep.equal([]);
      expect(spec.interpretResponse({})).to.deep.equal([]);
    });
  });
});
