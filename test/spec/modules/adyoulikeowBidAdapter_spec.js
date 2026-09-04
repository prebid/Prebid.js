import { expect } from 'chai';
import { spec } from 'modules/adyoulikeowBidAdapter.js';
import { newBidder } from 'src/adapters/bidderFactory.js';

const PLACEMENT_ID = '354f787b85c829fb83g2cdaf1ae64435';

describe('AdyoulikeOW Bid Adapter', function () {
  const adapter = newBidder(spec);

  describe('inherited functions', function () {
    it('exists and is a function', function () {
      expect(adapter.callBids).to.exist.and.to.be.a('function');
    });
  });

  describe('isBidRequestValid', function () {
    it('returns true when a placementId is present', function () {
      const bid = { params: { placementId: PLACEMENT_ID } };
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('returns false (not throw) when params is entirely absent', function () {
      expect(() => spec.isBidRequestValid({})).to.not.throw();
      expect(spec.isBidRequestValid({})).to.equal(false);
    });

    it('returns false when placementId is missing', function () {
      const bid = { params: { bidFloor: 1.5 } };
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('returns false when placementId is an empty string', function () {
      const bid = { params: { placementId: '' } };
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });
  });

  describe('buildRequests', function () {
    const bidRequests = [
      {
        bidder: 'adyoulikeow',
        bidId: 'bid1',
        params: { placementId: PLACEMENT_ID },
        mediaTypes: { banner: { sizes: [[300, 250]] } }
      }
    ];

    const bidderRequest = {
      bidderRequestId: 'req1',
      refererInfo: { page: 'https://example.com', domain: 'example.com' },
      gdprConsent: { gdprApplies: true, consentString: 'consentXYZ' },
      uspConsent: '1YNN'
    };

    it('builds the endpoint URL from the first bid request\'s placementId', function () {
      const request = spec.buildRequests(bidRequests, bidderRequest);
      expect(request.url).to.equal(`https://us-e.openweb-ayl.com/ssp/${PLACEMENT_ID}`);
    });

    it('does not put placementId on the impression itself -- routing is URL-only', function () {
      const request = spec.buildRequests(bidRequests, bidderRequest);
      const payload = JSON.parse(request.data);
      expect(payload.imp[0]).to.not.have.property('tagid');
    });

    it('carries the original bids through for interpretResponse matching', function () {
      const request = spec.buildRequests(bidRequests, bidderRequest);
      expect(request.bids).to.equal(bidRequests);
    });

    it('forwards GDPR and USP consent', function () {
      const request = spec.buildRequests(bidRequests, bidderRequest);
      const payload = JSON.parse(request.data);
      expect(payload.user.gdpr).to.equal(1);
      expect(payload.user.gdprConsentString).to.equal('consentXYZ');
      expect(payload.user.usPrivacy).to.equal('1YNN');
    });
  });

  describe('interpretResponse', function () {
    const request = {
      bids: [
        { bidId: 'bid1', mediaTypes: { banner: { sizes: [[300, 250]] } } }
      ]
    };

    const videoRequest = {
      bids: [
        { bidId: 'bid1', mediaTypes: { video: { playerSize: [[640, 480]] } } }
      ]
    };

    it('returns an empty array when there is no seatbid', function () {
      const serverResponse = { body: {} };
      expect(spec.interpretResponse(serverResponse, request)).to.deep.equal([]);
    });

    it('maps a valid banner server bid to a Prebid bid response', function () {
      const serverResponse = {
        body: {
          cur: 'USD',
          seatbid: [{
            bid: [{ impid: 'bid1', price: 1.25, w: 300, h: 250, crid: 'creative1', adm: '<div>ad</div>', adomain: ['advertiser.com'] }]
          }]
        }
      };

      const result = spec.interpretResponse(serverResponse, request);
      expect(result).to.have.lengthOf(1);
      expect(result[0].mediaType).to.equal('banner');
      expect(result[0].ad).to.equal('<div>ad</div>');
    });

    it('maps a valid video server bid to vastXml, not banner ad', function () {
      const serverResponse = {
        body: {
          cur: 'USD',
          seatbid: [{
            bid: [{ impid: 'bid1', price: 2.5, crid: 'creative2', adm: '<VAST></VAST>', adomain: ['advertiser.com'] }]
          }]
        }
      };

      const result = spec.interpretResponse(serverResponse, videoRequest);
      expect(result).to.have.lengthOf(1);
      expect(result[0].mediaType).to.equal('video');
      expect(result[0].vastXml).to.equal('<VAST></VAST>');
      expect(result[0].ad).to.be.undefined;
    });

    it('skips bids with zero or missing price', function () {
      const serverResponse = { body: { seatbid: [{ bid: [{ impid: 'bid1', price: 0 }] }] } };
      expect(spec.interpretResponse(serverResponse, request)).to.have.lengthOf(0);
    });
  });

  describe('onBidWon', function () {
    it('does not throw when nurl is absent', function () {
      expect(() => spec.onBidWon({})).to.not.throw();
    });
  });
});
