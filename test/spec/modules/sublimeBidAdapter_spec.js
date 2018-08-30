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

  describe('interpretResponse', () => {
    let response = {
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
      let bidderRequest;
      let result = spec.interpretResponse({body: response}, {bidderRequest});
      expect(Object.keys(result[0]))
        .to
        .have
        .members(Object.keys(expectedResponse[0]));
    });
  });

  describe('getUserSyncs', () => {
    it('should return an empty array', () => {
      let syncs = spec.getUserSyncs();
      expect(syncs).to.be.an('array').that.is.empty;
    });
  });
});
