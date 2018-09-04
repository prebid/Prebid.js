import { expect } from 'chai';
import { spec } from 'modules/sublimeBidAdapter';
import { newBidder } from 'src/adapters/bidderFactory';

describe('Sublime Adapter', () => {
  const adapter = newBidder(spec);

  describe('inherited functions', () => {
    it('exists and is a function', () => {
      expect(adapter.callBids).to.exist.and.to.be.a('function');
    });
  });

  describe('isBidRequestValid', () => {
    let bid = {
      bidder: 'sublime',
      params: {
        zoneId: 24549,
        endpoint: '',
        sacHost: 'sac.ayads.co',
      },
    };

    it('should return true when required params found', () => {
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should return false when required params are not passed', () => {
      let bid = Object.assign({}, bid);
      bid.params = {};
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });
  });

  describe('buildRequests', () => {
    let bidRequests = [{
      bidder: 'sublime',
      adUnitCode: 'sublime_code',
      bidId: 'abc1234',
      sizes: [[1800, 1000], [640, 300]],
      requestId: 'xyz654',
      params: {
        zoneId: 14312,
        bidHost: 'pbjs.ayads.co.local',
        callbackName: 'myCallback'
      }
    }];

    let request = spec.buildRequests(bidRequests);

    it('should have a get method', () => {
      expect(request.method).to.equal('GET');
    });

    it('should contains a request id equals to the bid id', () => {
      expect(request.data.request_id).to.equal(bidRequests[0].bidId);
    });

    it('should have an url that contains bid keyword', () => {
      expect(request.url).to.match(/bid/);
    });

    it('should create a callback function', () => {
      expect(window[bidRequests[0].params.callbackName]).to.be.an('function');
    });
  });

  describe('buildRequests: default arguments', () => {
    let bidRequests = [{
      bidder: 'sublime',
      adUnitCode: 'sublime_code',
      bidId: 'abc1234',
      sizes: [[1800, 1000], [640, 300]],
      requestId: 'xyz654',
      params: {
        zoneId: 1
      }
    }];

    let request = spec.buildRequests(bidRequests);

    it('should have an url that match the default endpoint', () => {
      expect(request.url).to.equal('https://pbjs.ayads.co/bid');
    });

    it('should create a default callback function', () => {
      expect(window['sublime_prebid_callback']).to.be.an('function');
    });
  });

  describe('buildRequests: test callback', () => {
    let XMLHttpRequest = sinon.useFakeXMLHttpRequest();

    let bidRequests = [{
      bidder: 'sublime',
      adUnitCode: 'sublime_code',
      bidId: 'abc1234',
      sizes: [[1800, 1000], [640, 300]],
      requestId: 'xyz654',
      params: {
        zoneId: 1
      }
    }];

    spec.buildRequests(bidRequests);

    it('should execute a default callback function', () => {
      let response = {
        ad: '<h1>oh</h1>',
        cpm: 2
      };
      let actual = window['sublime_prebid_callback'](response);

      it('should query the notify url', () => {
        expect(actual.url).to.equal('https://pbjs.ayads.co/notify');
      });

      it('should send the correct headers', () => {
        expect(actual.requestHeaders).to.equal({
          'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8'
        });
      });

      it('should send the correct body', () => {
        expect(actual.requestBody).to.equal('notify=1&request_id=abc1234&ad=%3Ch1%3Eoh%3C%2Fh1%3E&cpm=2');
      });
    });
  });

  describe('interpretResponse', () => {
    let serverResponse = {
      'request_id': '3db3773286ee59',
      'cpm': 0.5,
      'ad': '<!-- Creative -->',
    };

    it('should get correct bid response', () => {
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
          referrer: '',
          ad: '',
        },
      ];
      let result = spec.interpretResponse({body: serverResponse});
      expect(Object.keys(result[0])).to.have.members(Object.keys(expectedResponse[0]));
    });

    it('should get empty bid responses', () => {
      let serverResponse = {};
      let result = spec.interpretResponse({body: serverResponse});
      expect(result).to.deep.equal([]);
    });
  });

  describe('getUserSyncs', () => {
    it('should return an empty array', () => {
      let syncs = spec.getUserSyncs();
      expect(syncs).to.be.an('array').that.is.empty;
    });
  });
});
