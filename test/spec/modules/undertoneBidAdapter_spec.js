import { expect } from 'chai';
import { spec } from 'modules/undertoneBidAdapter';

const URL = '//hb.undertone.com/hb';
const BIDDER_CODE = 'undertone';
const validBidReq = {
  bidder: BIDDER_CODE,
  params: {
    placementId: '10433394',
    publisherId: 12345
  },
  sizes: [[300, 250], [300, 600]],
  bidId: '263be71e91dd9d',
  auctionId: '9ad1fa8d-2297-4660-a018-b39945054746',
};

const invalidBidReq = {
  bidder: BIDDER_CODE,
  params: {
    placementId: '123456789'
  },
  sizes: [[300, 250], [300, 600]],
  bidId: '263be71e91dd9d',
  auctionId: '9ad1fa8d-2297-4660-a018-b39945054746'
};

const bidReq = [{
  bidder: BIDDER_CODE,
  params: {
    placementId: '10433394',
    publisherId: 12345
  },
  sizes: [[300, 250], [300, 600]],
  bidId: '263be71e91dd9d',
  auctionId: '9ad1fa8d-2297-4660-a018-b39945054746'
}];

const validBidRes = {
  ad: '<div>Hello</div>',
  publisherId: 12345,
  bidRequestId: '263be71e91dd9d',
  adId: 15,
  cpm: 100,
  nCampaignId: 2,
  creativeId: '123abc',
  currency: 'USD',
  netRevenue: true,
  width: 300,
  height: 250,
  ttl: 360
};

const bidResponse = [validBidRes];

const bidResArray = [
  validBidRes,
  {
    ad: '',
    bidRequestId: '263be71e91dd9d',
    cpm: 100,
    adId: '123abc',
    currency: 'USD',
    netRevenue: true,
    width: 300,
    height: 250,
    ttl: 360
  },
  {
    ad: '<div>Hello</div>',
    bidRequestId: '',
    cpm: 0,
    adId: '123abc',
    currency: 'USD',
    netRevenue: true,
    width: 300,
    height: 250,
    ttl: 360
  }
];

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
      const domain = null;
      const REQ_URL = `${URL}?pid=${bidReq[0].params.publisherId}&domain=${domain}`;
      expect(request.url).to.equal(REQ_URL);
      expect(request.method).to.equal('POST');
    });
    it('should have all relevant fields', () => {
      const request = spec.buildRequests(bidReq);
      const bid = JSON.parse(request.data)['x-ut-hb-params'][0];
      expect(bid.bidRequestId).to.equal('263be71e91dd9d');
      expect(bid.sizes.length > 0).to.equal(true);
      expect(bid.placementId).to.equal('10433394');
      expect(bid.publisherId).to.equal(12345);
      expect(bid.params).to.be.an('object');
    });
  });

  describe('interpretResponse', () => {
    it('should build bid array', () => {
      let result = spec.interpretResponse({body: bidResponse});
      expect(result.length).to.equal(1);
    });

    it('should have all relevant fields', () => {
      const result = spec.interpretResponse({body: bidResponse});
      const bid = result[0];

      expect(bid.requestId).to.equal('263be71e91dd9d');
      expect(bid.cpm).to.equal(100);
      expect(bid.width).to.equal(300);
      expect(bid.height).to.equal(250);
      expect(bid.creativeId).to.equal(15);
      expect(bid.currency).to.equal('USD');
      expect(bid.netRevenue).to.equal(true);
      expect(bid.ttl).to.equal(360);
    });

    it('should return empty array when response is incorrect', () => {
      expect(spec.interpretResponse({body: {}}).length).to.equal(0);
      expect(spec.interpretResponse({body: []}).length).to.equal(0);
    });

    it('should only use valid bid responses', () => {
      expect(spec.interpretResponse({ body: bidResArray }).length).to.equal(1);
    });
  });
});
