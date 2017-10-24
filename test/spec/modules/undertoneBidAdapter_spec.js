import { expect } from 'chai';
import { spec } from 'modules/undertoneBidAdapter';

const URL = '//localhost:9090/hb';
const BIDDER_CODE = 'undertone';
const validBidReq = {
  bidder: BIDDER_CODE,
  params: {
    placementId: '123456789',
    publisherId: '123'
  },
  sizes: [[300, 250], [300, 600]],
  bidId: '263be71e91dd9d',
  requestId: '9ad1fa8d-2297-4660-a018-b39945054746',
  auctionId: '1d1a030790a475'
};

const invalidBidReq = {
  bidder: BIDDER_CODE,
  params: {
    placementId: '123456789'
  },
  sizes: [[300, 250], [300, 600]],
  bidId: '263be71e91dd9d',
  requestId: '9ad1fa8d-2297-4660-a018-b39945054746'
};

const bidReq = [
  {
    bidder: BIDDER_CODE,
    params: {
      placementId: 123456789,
      publisherId: '123'
    },
    sizes: [[300, 250], [300, 600]],
    bidId: '263be71e91dd9d',
    requestId: '9ad1fa8d-2297-4660-a018-b39945054746',
    auctionId: '1d1a030790a475'
  }
];

const bidResponse = [{
  ad: '<div>Hello</div>',
  bidRequestId: '263be71e91dd9d',
  cpm: 100,
  creativeId: '123abc',
  currency: 'USD',
  netRevenue: true,
  width: 300,
  height: 250,
  ttl: 360
}];

describe('Undertone Adapter', () => {
  describe('request', () => {
    it('should validate bid request', () => {
      expect(spec.isBidRequestValid(validBidReq)).to.equal(true);
    });
    it('should not validate incorrect bid request', () => {
      expect(spec.isBidRequestValid(invalidBidReq)).to.equal(undefined);
    });
  });
  describe('build request', () => {
    it('should send request to correct url via POST', () => {
      const request = spec.buildRequests(bidReq);
      expect(request.url).to.equal(URL);
      expect(request.method).to.equal('POST');
    });
    it('should have all relevant fields', () => {
      const request = spec.buildRequests(bidReq);
      const bid = request.data[0];

      expect(bid.bidRequestId).to.equal('263be71e91dd9d');
      expect(bid.sizes.length > 0).to.equal(true);
      expect(bid.placementId).to.equal(123456789);
      expect(bid.publisherId).to.equal('123');
      expect(bid.params).to.be.an('object');
    });
  });

  describe('interpretResponse', () => {
    it('should get correct bid response', () => {
      let result = spec.interpretResponse(bidResponse);
      expect(result.length).to.equal(1);
    });

    it('should have all relevant fields', () => {
      const result = spec.interpretResponse(bidResponse);
      const bid = result[0];

      expect(bid.requestId).to.equal('263be71e91dd9d');
      expect(bid.bidderCode).to.equal(BIDDER_CODE);
      expect(bid.cpm).to.equal(100);
      expect(bid.width).to.equal(300);
      expect(bid.height).to.equal(250);
      expect(bid.creativeId).to.equal('123abc');
      expect(bid.currency).to.equal('USD');
      expect(bid.netRevenue).to.be.true;
      expect(bid.ttl).to.equal(360);
    });
  });
});
