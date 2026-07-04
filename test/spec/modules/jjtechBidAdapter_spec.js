import { expect } from 'chai';
import { spec } from '../../../modules/jjtechBidAdapter.ts';

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
});
