import {expect} from 'chai';
import {spec} from 'modules/pubxBidAdapter.js';
import {newBidder} from 'src/adapters/bidderFactory.js';

describe('pubxAdapter', function () {
  const adapter = newBidder(spec);
  const ENDPOINT = 'https://api.primecaster.net/adlogue/api/slot/bid';

  describe('inherited functions', function () {
    it('exists and is a function', function () {
      expect(adapter.callBids).to.exist.and.to.be.a('function');
    });
  });

  describe('isBidRequestValid', function () {
    const bid = {
      bidder: 'pubx',
      params: {
        sid: '12345abc'
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

  describe('buildRequests', function () {
    const bidRequests = [
      {
        id: '26c1ee0038ac11',
        params: {
          sid: '12345abc'
        }
      }
    ];

    const data = {
      banner: {
        sid: '12345abc'
      }
    };

    it('sends bid request to ENDPOINT via GET', function () {
      const request = spec.buildRequests(bidRequests)[0];
      expect(request.url).to.equal(ENDPOINT);
      expect(request.method).to.equal('GET');
    });

    it('should attach params to the banner request', function () {
      const request = spec.buildRequests(bidRequests)[0];
      expect(request.data).to.deep.equal(data.banner);
    });
  });

  describe('interpretResponse', function () {
    const serverResponse = {
      body: {
        TTL: 300,
        adm: '<div>some creative</div>',
        cid: 'TKmB',
        cpm: 500,
        currency: 'JPY',
        height: 250,
        width: 300,
      }
    }

    const bidRequests = [
      {
        id: '26c1ee0038ac11',
        params: {
          sid: '12345abc'
        }
      }
    ];

    const bidResponses = [
      {
        requestId: '26c1ee0038ac11',
        cpm: 500,
        currency: 'JPY',
        width: 300,
        height: 250,
        creativeId: 'TKmB',
        netRevenue: true,
        ttl: 300,
        ad: '<div>some creative</div>'
      }
    ];
    it('should return empty array when required param is empty', function () {
      const serverResponseWithCidEmpty = {
        body: {
          TTL: 300,
          adm: '<div>some creative</div>',
          cid: '',
          cpm: '',
          currency: 'JPY',
          height: 250,
          width: 300,
        }
      }
      const result = spec.interpretResponse(serverResponseWithCidEmpty, bidRequests[0]);
      expect(result).to.be.empty;
    });
    it('handles banner responses', function () {
      const result = spec.interpretResponse(serverResponse, bidRequests[0])[0];
      expect(result.requestId).to.equal(bidResponses[0].requestId);
      expect(result.width).to.equal(bidResponses[0].width);
      expect(result.height).to.equal(bidResponses[0].height);
      expect(result.creativeId).to.equal(bidResponses[0].creativeId);
      expect(result.currency).to.equal(bidResponses[0].currency);
      expect(result.netRevenue).to.equal(bidResponses[0].netRevenue);
      expect(result.ttl).to.equal(bidResponses[0].ttl);
      expect(result.ad).to.equal(bidResponses[0].ad);
    });
  });
});
