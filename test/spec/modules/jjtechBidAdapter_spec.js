import { expect } from 'chai';
import { spec } from '../../../modules/jjtechBidAdapter.ts';
import { deepClone } from '../../../src/utils.js';

const ENDPOINT_URL = 'https://prebid-server.jambojar.com/openrtb2/auction';

const bidRequestBase = {
  adUnitCode: 'banner-ad-unit-code',
  auctionId: 'auction-id',
  bidId: 'bid-id-1',
  bidder: 'jjtech',
  bidderRequestId: 'bidder-request-id',
  mediaTypes: { banner: { sizes: [[300, 250]] } },
  params: { placementId: 'test-placement-1' },
};

describe('JJTech bid adapter', () => {
  describe('spec', () => {
    it('has the required properties', () => {
      expect(spec).to.have.property('code', 'jjtech');
      expect(spec).to.have.property('supportedMediaTypes').that.includes('banner');
      expect(spec).to.have.property('isBidRequestValid').that.is.a('function');
      expect(spec).to.have.property('buildRequests').that.is.a('function');
      expect(spec).to.have.property('interpretResponse').that.is.a('function');
      expect(spec).to.have.property('getUserSyncs').that.is.a('function');
    });
  });

  describe('isBidRequestValid', () => {
    let bid;

    beforeEach(() => {
      bid = deepClone(bidRequestBase);
    });

    it('returns true when placementId is a non-empty string', () => {
      expect(spec.isBidRequestValid(bid)).to.be.true;
    });

    it('returns false when params is missing', () => {
      delete bid.params;
      expect(spec.isBidRequestValid(bid)).to.be.false;
    });

    it('returns false when placementId is missing', () => {
      bid.params = {};
      expect(spec.isBidRequestValid(bid)).to.be.false;
    });

    it('returns false when placementId is an empty string', () => {
      bid.params = { placementId: '' };
      expect(spec.isBidRequestValid(bid)).to.be.false;
    });

    it('returns false when placementId is a number', () => {
      bid.params = { placementId: 12345 };
      expect(spec.isBidRequestValid(bid)).to.be.false;
    });

    it('returns false when placementId is null', () => {
      bid.params = { placementId: null };
      expect(spec.isBidRequestValid(bid)).to.be.false;
    });
  });
});
