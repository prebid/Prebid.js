import { expect } from 'chai';
import { spec } from 'modules/xendizBidAdapter';
import { newBidder } from 'src/adapters/bidderFactory';

const VALID_ENDPOINT = '//prebid.xendiz.com/request';
const bidRequest = {
  bidder: 'xendiz',
  adUnitCode: 'test-div',
  sizes: [[300, 250], [300, 600]],
  params: {
    pid: '550e8400-e29b-41d4-a716-446655440000'
  },
  bidId: '30b31c1838de1e',
  bidderRequestId: '22edbae2733bf6',
  auctionId: '1d1a030790a475',
};

const bidResponse = {
  body: {
    id: '1d1a030790a475',
    bids: [{
      id: '30b31c1838de1e',
      price: 3,
      cur: 'USD',
      h: 250,
      w: 300,
      crid: 'test',
      dealid: '1',
      exp: 900,
      adm: 'tag'
    }]
  }
};

const noBidResponse = { body: { id: '1d1a030790a475', bids: [] } };

describe('xendizBidAdapter', function () {
  const adapter = newBidder(spec);

  describe('inherited functions', function () {
    it('exists and is a function', function () {
      expect(adapter.callBids).to.exist.and.to.be.a('function');
    });
  });

  describe('isBidRequestValid', function () {
    it('should return false', function () {
      let bid = Object.assign({}, bidRequest);
      bid.params = {};
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return true', function () {
      expect(spec.isBidRequestValid(bidRequest)).to.equal(true);
    });
  });

  describe('buildRequests', function () {
    it('should format valid url', function () {
      const request = spec.buildRequests([bidRequest]);
      expect(request.url).to.equal(VALID_ENDPOINT);
    });

    it('should format valid url', function () {
      const request = spec.buildRequests([bidRequest]);
      expect(request.url).to.equal(VALID_ENDPOINT);
    });

    it('should format valid request body', function () {
      const request = spec.buildRequests([bidRequest]);
      const payload = JSON.parse(request.data);
      expect(payload.id).to.exist;
      expect(payload.items).to.exist;
      expect(payload.device).to.exist;
    });

    it('should attach valid device info', function () {
      const request = spec.buildRequests([bidRequest]);
      const payload = JSON.parse(request.data);
      expect(payload.device).to.deep.equal([
        navigator.language || '',
        window.screen.width,
        window.screen.height
      ]);
    });

    it('should transform sizes', function () {
      const request = spec.buildRequests([bidRequest]);
      const payload = JSON.parse(request.data);
      const item = payload.items[0];
      expect(item[item.length - 1]).to.deep.equal(['300x250', '300x600']);
    });
  });

  describe('interpretResponse', function () {
    it('should get correct bid response', function () {
      const result = spec.interpretResponse(bidResponse);
      const validResponse = [{
        requestId: '30b31c1838de1e',
        cpm: 3,
        width: 300,
        height: 250,
        creativeId: 'test',
        netRevenue: true,
        dealId: '1',
        currency: 'USD',
        ttl: 900,
        ad: 'tag'
      }];

      expect(result).to.deep.equal(validResponse);
    });

    it('handles nobid responses', function () {
      let result = spec.interpretResponse(noBidResponse);
      expect(result.length).to.equal(0);
    });
  });
});
