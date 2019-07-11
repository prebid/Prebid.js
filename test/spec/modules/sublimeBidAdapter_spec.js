import { expect } from 'chai';
import { spec } from 'modules/sublimeBidAdapter';
import { newBidder } from 'src/adapters/bidderFactory';

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
        sacHost: 'sac.ayads.co',
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
          zoneId: 23651,
          callbackName: 'myCallback'
        }
      }, {
        bidder: 'sublime',
        adUnitCode: 'sublime_code_2',
        bidId: 'abc1234_2',
        sizes: [[1800, 1000], [640, 300]],
        requestId: 'xyz654_2',
        params: {
          zoneId: 23651,
          callbackName: 'myCallback'
        }
      }
    ];

    let bidderRequest = {
      gdprConsent: {
        consentString: 'EOHEIRCOUCOUIEHZIOEIU-TEST',
        gdprApplies: true
      }
    };

    let request = spec.buildRequests(bidRequests, bidderRequest);

    it('should have a get method', function() {
      expect(request.method).to.equal('GET');
    });

    it('should contains window.sublime.gdpr.injected', function() {
      expect(window.sublime).to.not.be.undefined;
      expect(window.sublime.gdpr).to.not.be.undefined;
      expect(window.sublime.gdpr.injected).to.eql({
        consentString: bidderRequest.gdprConsent.consentString,
        gdprApplies: bidderRequest.gdprConsent.gdprApplies
      });
    });

    it('should contains a request id equals to the bid id', function() {
      expect(request.data.request_id).to.equal(bidRequests[0].bidId);
    });

    it('should have an url that contains bid keyword', function() {
      expect(request.url).to.match(/bid/);
    });

    it('should create a callback function', function() {
      const params = bidRequests[0].params;
      expect(window[params.callbackName + '_' + params.zoneId]).to.be.an('function');
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
        zoneId: 23651
      }
    }];

    let request = spec.buildRequests(bidRequests);

    it('should have an url that match the default endpoint', function() {
      expect(request.url).to.equal('https://pbjs.sskzlabs.com/bid');
    });

    it('should create a default callback function', function() {
      expect(window['sublime_prebid_callback_23651']).to.be.an('function');
    });
  });

  describe('buildRequests: test callback', function() {
    let XMLHttpRequest = sinon.useFakeXMLHttpRequest();

    let bidRequests = [{
      bidder: 'sublime',
      adUnitCode: 'sublime_code',
      bidId: 'abc1234',
      sizes: [[1800, 1000], [640, 300]],
      requestId: 'xyz654',
      params: {
        zoneId: 23651
      }
    }];

    spec.buildRequests(bidRequests);

    it('should execute a default callback function', function() {
      let response = {
        ad: '<h1>oh</h1>',
        cpm: 2
      };
      let actual = window['sublime_prebid_callback_23651'](response);

      it('should query the notify url', function() {
        expect(actual.url).to.equal('https://pbjs.sskzlabs.com/notify');
      });

      it('should send the correct headers', function() {
        expect(actual.requestHeaders).to.equal({
          'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8'
        });
      });

      it('should send the correct body', function() {
        expect(actual.requestBody).to.equal('notify=1&request_id=abc1234&ad=%3Ch1%3Eoh%3C%2Fh1%3E&cpm=2');
      });
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

    it('should get empty bid responses', function() {
      let serverResponse = {};
      let result = spec.interpretResponse({body: serverResponse});
      expect(result).to.deep.equal([]);
    });
  });
});
