import { expect } from 'chai';
import { spec } from 'modules/sublimeBidAdapter.js';
import { newBidder } from 'src/adapters/bidderFactory.js';

let utils = require('src/utils');

describe('Sublime Adapter', function() {
  const adapter = newBidder(spec);

  describe('sendEvent', function() {
    let sandbox;
    const triggeredPixelProperties = [
      't',
      'tse',
      'z',
      'e',
      'src',
      'puid',
      'trId',
      'pbav',
      'pubpbv',
      'device',
      'pubtimeout',
    ];

    beforeEach(function () {
      sandbox = sinon.sandbox.create();
    });

    it('should trigger pixel', function () {
      sandbox.spy(utils, 'triggerPixel');
      spec.sendEvent('test');
      expect(utils.triggerPixel.called).to.equal(true);
      const params = utils.parseUrl(utils.triggerPixel.args[0][0]).search;
      expect(Object.keys(params)).to.have.members(triggeredPixelProperties);
    });

    afterEach(function () {
      sandbox.restore();
    });
  })

  describe('inherited functions', function() {
    it('exists and is a function', function() {
      expect(adapter.callBids).to.exist.and.to.be.a('function');
    });
  });

  describe('isBidRequestValid', function() {
    const bid = {
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
      const bid = Object.assign({}, bid);
      bid.params = {};
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });
  });

  describe('buildRequests', function() {
    const bidRequests = [
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

    const bidderRequest = {
      gdprConsent: {
        consentString: 'EOHEIRCOUCOUIEHZIOEIU-TEST',
        gdprApplies: true
      },
      refererInfo: {
        referer: 'https://example.com',
        numIframes: 2,
      }
    };

    const request = spec.buildRequests(bidRequests, bidderRequest);

    it('should have a post method', function() {
      expect(request[0].method).to.equal('POST');
      expect(request[1].method).to.equal('POST');
    });

    it('should contains a request id equals to the bid id', function() {
      for (let i = 0; i < request.length; i = i + 1) {
        expect(JSON.parse(request[i].data).requestId).to.equal(bidRequests[i].bidId);
      }
    });

    it('should have an url that contains bid keyword', function() {
      expect(request[0].url).to.match(/bid/);
      expect(request[1].url).to.match(/bid/);
    });
  });

  describe('buildRequests: default arguments', function() {
    const bidRequests = [{
      bidder: 'sublime',
      adUnitCode: 'sublime_code',
      bidId: 'abc1234',
      sizes: [[1800, 1000], [640, 300]],
      requestId: 'xyz654',
      params: {
        zoneId: 123
      }
    }];

    const request = spec.buildRequests(bidRequests);

    it('should have an url that match the default endpoint', function() {
      expect(request[0].url).to.equal('https://pbjs.sskzlabs.com/bid');
    });
  });

  describe('interpretResponse', function() {
    const serverResponse = {
      'request_id': '3db3773286ee59',
      'sspname': 'foo',
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

      const expectedResponse = [
        {
          requestId: '',
          cpm: 0.5,
          width: 1800,
          height: 1000,
          creativeId: 1,
          dealId: 1,
          currency: 'USD',
          sspname: 'foo',
          netRevenue: true,
          ttl: 600,
          pbav: '0.7.2',
          ad: '',
        },
      ];
      const result = spec.interpretResponse({body: serverResponse});
      expect(Object.keys(result[0])).to.have.members(Object.keys(expectedResponse[0]));
    });

    it('should get correct default size for 1x1', function() {
      const serverResponse = {
        'requestId': 'xyz654_2',
        'sspname': 'sublime',
        'cpm': 0.5,
        'ad': '<!-- Creative -->',
      };

      const bidRequest = {
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

      const result = spec.interpretResponse({body: serverResponse}, bidRequest);

      const expectedResponse = {
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
        pbav: '0.7.2',
        sspname: 'sublime'
      };

      expect(result[0]).to.deep.equal(expectedResponse);
    });

    it('should return bid empty response', function () {
      const serverResponse = '';
      const bidRequest = {};

      const result = spec.interpretResponse({ body: serverResponse }, bidRequest);

      const expectedResponse = [];

      expect(result).to.deep.equal(expectedResponse);
    });

    it('should return bid with default value in response', function () {
      const serverResponse = {
        'requestId': 'xyz654_2',
        'sspname': 'sublime',
        'ad': '<!-- ad -->',
      };

      const bidRequest = {
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

      const result = spec.interpretResponse({ body: serverResponse }, bidRequest);

      const expectedResponse = {
        requestId: 'xyz654_2',
        cpm: 0,
        width: 1,
        height: 1,
        creativeId: 1,
        dealId: 1,
        currency: 'EUR',
        sspname: 'sublime',
        netRevenue: true,
        ttl: 600,
        ad: '<!-- ad -->',
        pbav: '0.7.2',
      };

      expect(result[0]).to.deep.equal(expectedResponse);
    });

    it('should return empty bid response because of timeout', function () {
      const serverResponse = {
        'requestId': 'xyz654_2',
        'timeout': true,
        'ad': '',
      };

      const bidRequest = {
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

      const result = spec.interpretResponse({ body: serverResponse }, bidRequest);

      const expectedResponse = [];

      expect(result).to.deep.equal(expectedResponse);

      describe('On bid Time out', function () {
        spec.onTimeout(result);
      });
    });

    it('should add advertiserDomains', function() {
      const responseWithAdvertiserDomains = utils.deepClone(serverResponse);
      responseWithAdvertiserDomains.advertiserDomains = ['a_sublime_adomain'];

      const bidRequest = {
        bidder: 'sublime',
        params: {
          zoneId: 456,
        }
      };

      const result = spec.interpretResponse({ body: responseWithAdvertiserDomains }, bidRequest);

      expect(Object.keys(result[0].meta)).to.include.members(['advertiserDomains']);
      expect(Object.keys(result[0].meta.advertiserDomains)).to.deep.equal([]);
    });
  });

  describe('onBidWon', function() {
    let sandbox;
    const bid = { foo: 'bar' };

    beforeEach(function () {
      sandbox = sinon.sandbox.create();
    });

    it('should trigger "bidwon" pixel', function () {
      sandbox.spy(utils, 'triggerPixel');
      spec.onBidWon(bid);
      const params = utils.parseUrl(utils.triggerPixel.args[0][0]).search;
      expect(params.e).to.equal('bidwon');
    });

    afterEach(function () {
      sandbox.restore();
    });
  })
});
