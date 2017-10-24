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

const unvalidBidReq = {
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

describe('Undertone Adapter', () => {
  describe('request', () => {
    it('should validate bid request', () => {
      expect(spec.isBidRequestValid(validBidReq)).to.equal(true);
    });
    it('should not validate incorrect bid request', () => {
      expect(spec.isBidRequestValid(unvalidBidReq)).to.equal(undefined);
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
});
