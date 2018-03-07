import { expect } from 'chai';
import { spec } from 'modules/ucfunnelBidAdapter';

const URL = '//hb.aralego.com/header';
const BIDDER_CODE = 'ucfunnel';
const validBidReq = {
  bidder: BIDDER_CODE,
  params: {
    adid: 'test-ad-83444226E44368D1E32E49EEBE6D29'
  },
  sizes: [[300, 250]],
  bidId: '263be71e91dd9d',
  auctionId: '9ad1fa8d-2297-4660-a018-b39945054746',
};

const invalidBidReq = {
  bidder: BIDDER_CODE,
  params: {
    adid: 123456789
  },
  sizes: [[300, 250]],
  bidId: '263be71e91dd9d',
  auctionId: '9ad1fa8d-2297-4660-a018-b39945054746'
};

const bidReq = [{
  bidder: BIDDER_CODE,
  params: {
    adid: 'test-ad-83444226E44368D1E32E49EEBE6D29'
  },
  sizes: [[300, 250]],
  bidId: '263be71e91dd9d',
  auctionId: '9ad1fa8d-2297-4660-a018-b39945054746'
}];

const validBidRes = {
  ad_id: 'ad-83444226E44368D1E32E49EEBE6D29',
  adm: '<html style="height:100%"><body style="width:300px;height: 100%;padding:0;margin:0 auto;"><div style="width:100%;height:100%;display:table;"><div style="width:100%;height:100%;display:table-cell;text-align:center;vertical-align:middle;"><a href="//www.ucfunnel.com/" target="_blank"><img src="//cdn.aralego.net/ucfad/house/ucf/AdGent-300x250.jpg" width="300px" height="250px" align="middle" style="border:none"></a></div></div></body></html>',
  cpm: 0.01,
  height: 250,
  width: 300
};

const bidResponse = validBidRes;

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

describe('ucfunnel Adapter', () => {
  describe('request', () => {
    it('should validate bid request', () => {
      expect(spec.isBidRequestValid(validBidReq)).to.equal(true);
    });
    it('should not validate incorrect bid request', () => {
      expect(spec.isBidRequestValid(invalidBidReq)).to.equal(false);
    });
  });
  describe('build request', () => {
    it('Verify bid request', () => {
      const request = spec.buildRequests(bidReq);
      expect(request[0].method).to.equal('GET');
      expect(request[0].url).to.equal(URL);
      expect(request[0].data).to.match(new RegExp(`${bidReq[0].params.adid}`));
    });
  });

  describe('interpretResponse', () => {
    it('should build bid array', () => {
      const request = spec.buildRequests(bidReq);
      const result = spec.interpretResponse({body: bidResponse}, request[0]);
      expect(result.length).to.equal(1);
    });

    it('should have all relevant fields', () => {
      const request = spec.buildRequests(bidReq);
      const result = spec.interpretResponse({body: bidResponse}, request[0]);
      const bid = result[0];

      expect(bid.requestId).to.equal('263be71e91dd9d');
      expect(bid.cpm).to.equal(0.01);
      expect(bid.width).to.equal(300);
      expect(bid.height).to.equal(250);
    });
  });
});
