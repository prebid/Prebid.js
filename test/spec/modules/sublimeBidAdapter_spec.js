import { expect } from 'chai';
import { spec } from 'modules/sublimeBidAdapter.js';
import { newBidder } from 'src/adapters/bidderFactory.js';

describe('Sublime Adapter', function() {
  const adapter = newBidder(spec);

  describe('inherited functions', function() {
    it('exists and is a function', function() {
      expect(adapter.callBids).to.exist.and.to.be.a('function');
    });
  });

  describe('isBidRequestValid', function() {
    let bid = {
      bidder: 'sublime',
      params: {
        zoneId: 24549,
        endpoint: '',
      },
    };

    it('should return true when required params found', function() {
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should return false when required params are not passed', function() {
      let bid = Object.assign({}, bid);
      bid.params = {};
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });
  });

  describe('buildRequests', function() {
    let bidRequests = [
      {
        bidder: 'sublime',
        adUnitCode: 'sublime_code',
        bidId: 'abc1234',
        sizes: [[1800, 1000], [640, 300]],
        requestId: 'xyz654',
        params: {
          zoneId: 123,
          callbackName: 'false'
        }
      }, {
        bidder: 'sublime',
        adUnitCode: 'sublime_code_2',
        bidId: 'abc1234_2',
        sizes: [[1, 1]],
        requestId: 'xyz654_2',
        params: {
          zoneId: 456,
        }
      }
    ];

    let bidderRequest = {
      gdprConsent: {
        consentString: 'EOHEIRCOUCOUIEHZIOEIU-TEST',
        gdprApplies: true
      },
      refererInfo: {
        referer: 'https://example.com',
        numIframes: 2,
      }
    };

    let request = spec.buildRequests(bidRequests, bidderRequest);

    it('should have a post method', function() {
      expect(request[0].method).to.equal('POST');
      expect(request[1].method).to.equal('POST');
    });

    it('should contains a request id equals to the bid id', function() {
      expect(request[0].data.requestId).to.equal(bidRequests[0].bidId);
      expect(request[1].data.requestId).to.equal(bidRequests[1].bidId);
    });

    it('should have an url that contains bid keyword', function() {
      expect(request[0].url).to.match(/bid/);
      expect(request[1].url).to.match(/bid/);
    });
  });

  describe('buildRequests: default arguments', function() {
    let bidRequests = [{
      bidder: 'sublime',
      adUnitCode: 'sublime_code',
      bidId: 'abc1234',
      sizes: [[1800, 1000], [640, 300]],
      requestId: 'xyz654',
      params: {
        zoneId: 123
      }
    }];

    let request = spec.buildRequests(bidRequests);

    it('should have an url that match the default endpoint', function() {
      expect(request[0].url).to.equal('https://pbjs.sskzlabs.com/bid');
    });
  });

  describe('interpretResponse', function() {
    let serverResponse = {
      'request_id': '3db3773286ee59',
      'cpm': 0.5,
      'ad': '<!-- Creative -->',
    };

    it('should get correct bid response', function() {
      // Mock the fire method
      top.window.sublime = {
        analytics: {
          fire: function() {}
        }
      };

      let expectedResponse = [
        {
          requestId: '',
          cpm: 0.5,
          width: 1800,
          height: 1000,
          creativeId: 1,
          dealId: 1,
          currency: 'USD',
          netRevenue: true,
          ttl: 600,
          ad: '',
        },
      ];
      let result = spec.interpretResponse({body: serverResponse});
      expect(Object.keys(result[0])).to.have.members(Object.keys(expectedResponse[0]));
    });

    it('should get correct default size for 1x1', function() {
      let serverResponse = {
        'requestId': 'xyz654_2',
        'cpm': 0.5,
        'ad': '<!-- Creative -->',
      };

      let bidRequest = {
        bidder: 'sublime',
        adUnitCode: 'sublime_code_2',
        bidId: 'abc1234_2',
        data: {
          w: 1,
          h: 1,
        },
        requestId: 'xyz654_2',
        params: {
          zoneId: 456,
        }
      };

      let result = spec.interpretResponse({body: serverResponse}, bidRequest);

      let expectedResponse = {
        requestId: 'xyz654_2',
        cpm: 0.5,
        width: 1,
        height: 1,
        creativeId: 1,
        dealId: 1,
        currency: 'EUR',
        netRevenue: true,
        ttl: 600,
        ad: '<!-- Creative -->',
      };

      expect(result[0]).to.deep.equal(expectedResponse);
    });

    it('should return bid empty response', function () {
      let serverResponse = '';
      let bidRequest = {};

      let result = spec.interpretResponse({ body: serverResponse }, bidRequest);

      let expectedResponse = [];

      expect(result).to.deep.equal(expectedResponse);
    });

    it('should return bid with default value in response', function () {
      let serverResponse = {
        'requestId': 'xyz654_2',
        'ad': '<!-- ad -->',
      };

      let bidRequest = {
        bidder: 'sublime',
        adUnitCode: 'sublime_code_2',
        bidId: 'abc1234_2',
        data: {
          w: 1,
          h: 1,
        },
        requestId: 'xyz654_2',
        params: {
          zoneId: 456,
        }
      };

      let result = spec.interpretResponse({ body: serverResponse }, bidRequest);

      let expectedResponse = {
        requestId: 'xyz654_2',
        cpm: 0,
        width: 1,
        height: 1,
        creativeId: 1,
        dealId: 1,
        currency: 'EUR',
        netRevenue: true,
        ttl: 600,
        ad: '<!-- ad -->',
      };

      expect(result[0]).to.deep.equal(expectedResponse);
    });

    it('should return empty bid response because of timeout', function () {
      let serverResponse = {
        'requestId': 'xyz654_2',
        'timeout': true,
        'ad': '',
      };

      let bidRequest = {
        bidder: 'sublime',
        adUnitCode: 'sublime_code_2',
        bidId: 'abc1234_2',
        data: {
          w: 1,
          h: 1,
        },
        requestId: 'xyz654_2',
        params: {
          zoneId: 456,
        }
      };

      let result = spec.interpretResponse({ body: serverResponse }, bidRequest);

      let expectedResponse = [];

      expect(result).to.deep.equal(expectedResponse);
    });
  });
});
