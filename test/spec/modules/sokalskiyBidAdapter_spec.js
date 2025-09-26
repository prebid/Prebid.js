import { expect } from 'chai';
import { spec } from 'modules/sokalskiyBidAdapter.js';
import { newBidder } from 'src/adapters/bidderFactory.js';

const DEFAULT_BIDDER_CODE = 'sokalskiy';
const ENDPOINT = 'our path';

const DISPLAY_REQUEST = {
  bidder: DEFAULT_BIDDER_CODE,
  params: { placementId: 'placement-1' },
  mediaTypes: { banner: { sizes: [[300, 250]] } },
  adUnitCode: 'div-banner',
  bidId: 'test-bid-1',
  auctionId: 'auction-123'
};

const SERVER_DISPLAY_RESPONSE = {
  body: [{
    requestId: 'test-bid-1',
    cpm: 1.2,
    width: 300,
    height: 250,
    creativeId: 'creative-display-123',
    currency: 'USD',
    ad: '<div>Banner creative</div>'
  }]
};

describe('SokalskiyBidAdapter', () => {
  const adapter = newBidder(spec);

  describe('inherited functions', () => {
    it('should have callBids function', () => {
      expect(adapter.callBids).to.exist.and.to.be.a('function');
    });
  });

  describe('isBidRequestValid', () => {
    it('returns true with placementId param', () => {
      expect(spec.isBidRequestValid(DISPLAY_REQUEST)).to.equal(true);
    });

    it('returns false if params missing', () => {
      const invalidBid = { ...DISPLAY_REQUEST };
      delete invalidBid.params;
      expect(spec.isBidRequestValid(invalidBid)).to.equal(false);
    });

    it('returns false if placementId missing', () => {
      const invalidBid = { ...DISPLAY_REQUEST, params: {} };
      expect(spec.isBidRequestValid(invalidBid)).to.equal(false);
    });
  });

  describe('buildRequests', () => {
    const displayRequests = spec.buildRequests([DISPLAY_REQUEST], { auctionId: 'auction-123' });

    it('creates POST requests', () => {
      expect(displayRequests[0].method).to.equal('POST');
    });

    it('uses correct endpoint', () => {
      expect(displayRequests[0].url).to.equal(ENDPOINT);
    });

    it('stringifies payload', () => {
      const payload = JSON.parse(displayRequests[0].data);
      expect(payload).to.have.property('auctionId', 'auction-123');
      expect(payload.bids).to.be.an('array');
      expect(payload.bids[0]).to.include({
        bidId: 'test-bid-1',
        placementId: 'placement-1',
        adUnitCode: 'div-banner'
      });
    });
  });

  describe('interpretResponse', () => {
    it('returns empty array for invalid response', () => {
      const result = spec.interpretResponse({}, {});
      expect(result).to.be.an('array').that.is.empty;
    });

    it('parses display response', () => {
      const result = spec.interpretResponse(SERVER_DISPLAY_RESPONSE, {});
      expect(result).to.be.an('array').with.lengthOf(1);
      const bid = result[0];
      expect(bid.requestId).to.equal('test-bid-1');
      expect(bid.mediaType).to.equal('banner');
      expect(bid.ad).to.contain('Banner creative');
    });
  });
});
