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
},
{
  bidder: BIDDER_CODE,
  params: {
    publisherId: 12345
  },
  sizes: [[1, 1]],
  bidId: '453cf42d72bb3c',
  auctionId: '6c22f5a5-59df-4dc6-b92c-f433bcf0a874'
}];

const bidderReq = {
  refererInfo: {
    referer: 'http://prebid.org/dev-docs/bidder-adaptor.html'
  }
};

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

describe('Undertone Adapter', function () {
  describe('request', function () {
    it('should validate bid request', function () {
      expect(spec.isBidRequestValid(validBidReq)).to.equal(true);
    });
    it('should not validate incorrect bid request', function () {
      expect(spec.isBidRequestValid(invalidBidReq)).to.equal(undefined);
    });
  });
  describe('build request', function () {
    it('should send request to correct url via POST', function () {
      const request = spec.buildRequests(bidReq, bidderReq);
      const domainStart = bidderReq.refererInfo.referer.indexOf('//');
      const domainEnd = bidderReq.refererInfo.referer.indexOf('/', domainStart + 2);
      const domain = bidderReq.refererInfo.referer.substring(domainStart + 2, domainEnd);
      const REQ_URL = `${URL}?pid=${bidReq[0].params.publisherId}&domain=${domain}`;
      expect(request.url).to.equal(REQ_URL);
      expect(request.method).to.equal('POST');
    });
    it('should have all relevant fields', function () {
      const request = spec.buildRequests(bidReq, bidderReq);
      const bid1 = JSON.parse(request.data)['x-ut-hb-params'][0];
      expect(bid1.bidRequestId).to.equal('263be71e91dd9d');
      expect(bid1.sizes.length).to.equal(2);
      expect(bid1.placementId).to.equal('10433394');
      expect(bid1.publisherId).to.equal(12345);
      expect(bid1.params).to.be.an('object');
      const bid2 = JSON.parse(request.data)['x-ut-hb-params'][1];
      expect(bid2.bidRequestId).to.equal('453cf42d72bb3c');
      expect(bid2.sizes.length).to.equal(1);
      expect(bid2.placementId === null).to.equal(true);
      expect(bid2.publisherId).to.equal(12345);
      expect(bid2.params).to.be.an('object');
    });
  });

  describe('interpretResponse', function () {
    it('should build bid array', function () {
      let result = spec.interpretResponse({body: bidResponse});
      expect(result.length).to.equal(1);
    });

    it('should have all relevant fields', function () {
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

    it('should return empty array when response is incorrect', function () {
      expect(spec.interpretResponse({body: {}}).length).to.equal(0);
      expect(spec.interpretResponse({body: []}).length).to.equal(0);
    });

    it('should only use valid bid responses', function () {
      expect(spec.interpretResponse({ body: bidResArray }).length).to.equal(1);
    });
  });

  describe('getUserSyncs', () => {
    it('verifies gdpr consent checked', () => {
      const options = ({ iframeEnabled: true, pixelEnabled: true });
      expect(spec.getUserSyncs(options, {}, { gdprApplies: true }).length).to.equal(0);
    });

    it('Verifies sync iframe option', function () {
      const result = spec.getUserSyncs({ iframeEnabled: true, pixelEnabled: true });
      expect(result).to.have.lengthOf(1);
      expect(result[0].type).to.equal('iframe');
      expect(result[0].url).to.equal('//cdn.undertone.com/js/usersync.html');
    });

    it('Verifies sync image option', function () {
      const result = spec.getUserSyncs({ pixelEnabled: true });
      expect(result).to.have.lengthOf(2);
      expect(result[0].type).to.equal('image');
      expect(result[0].url).to.equal('//usr.undertone.com/userPixel/syncOne?id=1&of=2');
      expect(result[1].type).to.equal('image');
      expect(result[1].url).to.equal('//usr.undertone.com/userPixel/syncOne?id=2&of=2');
    });
  });
});
