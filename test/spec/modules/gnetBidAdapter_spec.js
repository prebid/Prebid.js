import {
  expect
} from 'chai';
import {
  spec
} from 'modules/gnetBidAdapter.js';
import {
  newBidder
} from 'src/adapters/bidderFactory.js';

const ENDPOINT = 'https://service.gnetrtb.com/api/adrequest';

describe('gnetAdapter', function () {
  const adapter = newBidder(spec);

  describe('inherited functions', function () {
    it('exists and is a function', function () {
      expect(adapter.callBids).to.exist.and.to.be.a('function');
    });
  });

  describe('isBidRequestValid', function () {
    let bid = {
      bidder: 'gnet',
      params: {
        websiteId: '1', adunitId: '1'
      }
    };

    it('should return true when required params found', function () {
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should return false when required params are not passed', function () {
      let bid = Object.assign({}, bid);
      delete bid.params;
      bid.params = {};
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });
  });

  describe('onBidWon', function () {
    const bid = {
      requestId: '29d5b1d3a520f8'
    };

    it('return success adserver won bid endpoint', () => {
      const result = spec.onBidWon(bid);
      assert.ok(result);
    });
  });

  describe('buildRequests', function () {
    const bidRequests = [{
      bidder: 'gnet',
      params: {
        websiteId: '1', adunitId: '1'
      },
      adUnitCode: '/150790500/4_ZONA_IAB_300x250_5',
      sizes: [
        [300, 250],
      ],
      bidId: '2a19afd5173318',
      bidderRequestId: '1f4001782ac16c',
      auctionId: 'aba03555-4802-4c45-9f15-05ffa8594cff',
      transactionId: '894bdff6-61ec-4bec-a5a9-f36a5bfccef5',
      gftuid: null
    }];

    const bidderRequest = {
      refererInfo: {
        referer: 'https://gnetrtb.com'
      }
    };

    it('sends bid request to ENDPOINT via POST', function () {
      const requests = spec.buildRequests(bidRequests, bidderRequest);
      expect(requests[0].url).to.equal(ENDPOINT);
      expect(requests[0].method).to.equal('POST');
      expect(requests[0].data).to.equal(JSON.stringify({
        'referer': 'https://gnetrtb.com',
        'adUnitCode': '/150790500/4_ZONA_IAB_300x250_5',
        'bidId': '2a19afd5173318',
        'transactionId': '894bdff6-61ec-4bec-a5a9-f36a5bfccef5',
        'gftuid': null,
        'sizes': ['300x250'],
        'params': {
          'websiteId': '1', 'adunitId': '1'
        }
      }));
    });
  });

  describe('interpretResponse', function () {
    const bidderRequests = [{
      bidder: 'gnet',
      params: {
        clientId: '123456'
      },
      adUnitCode: '/150790500/4_ZONA_IAB_300x250_5',
      sizes: [
        [300, 250],
      ],
      bidId: '2a19afd5173318',
      bidderRequestId: '1f4001782ac16c',
      auctionId: 'aba03555-4802-4c45-9f15-05ffa8594cff',
      transactionId: '894bdff6-61ec-4bec-a5a9-f36a5bfccef5'
    }];

    it('should get correct banner bid response', function () {
      const response = {
        bids: [
          {
            bidId: '2a19afd5173318',
            cpm: 0.1,
            currency: 'BRL',
            width: 300,
            height: 250,
            ad: '<html><h3>I am an ad</h3></html>',
            creativeId: '173560700',
          }
        ]
      };

      const expectedResponse = [
        {
          requestId: '2a19afd5173318',
          cpm: 0.1,
          currency: 'BRL',
          width: 300,
          height: 250,
          ad: '<html><h3>I am an ad</h3></html>',
          ttl: 300,
          meta: {
            advertiserDomains: []
          },
          creativeId: '173560700',
          netRevenue: true
        }
      ];

      const result = spec.interpretResponse({
        body: response
      }, bidderRequests);
      expect(result).to.have.lengthOf(1);
      expect(result).to.deep.have.same.members(expectedResponse);
    });

    it('handles nobid responses', function () {
      const response = '';

      const result = spec.interpretResponse({
        body: response
      }, bidderRequests);
      expect(result.length).to.equal(0);
    });
  });
});
