import { expect } from 'chai';
import { spec } from 'modules/gridBidAdapter';
import { newBidder } from 'src/adapters/bidderFactory';

describe('TheMediaGrid Adapter', function () {
  const adapter = newBidder(spec);

  describe('inherited functions', function () {
    it('exists and is a function', function () {
      expect(adapter.callBids).to.exist.and.to.be.a('function');
    });
  });

  describe('isBidRequestValid', function () {
    let bid = {
      'bidder': 'grid',
      'params': {
        'uid': '1'
      },
      'adUnitCode': 'adunit-code',
      'sizes': [[300, 250], [300, 600]],
      'bidId': '30b31c1838de1e',
      'bidderRequestId': '22edbae2733bf6',
      'auctionId': '1d1a030790a475',
    };

    it('should return true when required params found', function () {
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should return false when required params are not passed', function () {
      let bid = Object.assign({}, bid);
      delete bid.params;
      bid.params = {
        'uid': 0
      };
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });
  });

  describe('buildRequests', function () {
    function parseRequest(url) {
      const res = {};
      url.split('&').forEach((it) => {
        const couple = it.split('=');
        res[couple[0]] = decodeURIComponent(couple[1]);
      });
      return res;
    }
    let bidRequests = [
      {
        'bidder': 'grid',
        'params': {
          'uid': '1'
        },
        'adUnitCode': 'adunit-code-1',
        'sizes': [[300, 250], [300, 600]],
        'bidId': '30b31c1838de1e',
        'bidderRequestId': '22edbae2733bf6',
        'auctionId': '1d1a030790a475',
      },
      {
        'bidder': 'grid',
        'params': {
          'uid': '1'
        },
        'adUnitCode': 'adunit-code-2',
        'sizes': [[728, 90]],
        'bidId': '3150ccb55da321',
        'bidderRequestId': '22edbae2733bf6',
        'auctionId': '1d1a030790a475',
      },
      {
        'bidder': 'grid',
        'params': {
          'uid': '2'
        },
        'adUnitCode': 'adunit-code-1',
        'sizes': [[300, 250], [300, 600]],
        'bidId': '42dbe3a7168a6a',
        'bidderRequestId': '22edbae2733bf6',
        'auctionId': '1d1a030790a475',
      }
    ];

    it('should attach valid params to the tag', function () {
      const request = spec.buildRequests([bidRequests[0]]);
      expect(request.data).to.be.an('string');
      const payload = parseRequest(request.data);
      expect(payload).to.have.property('u').that.is.a('string');
      expect(payload).to.have.property('auids', '1');
      expect(payload).to.have.property('r', '22edbae2733bf6');
    });

    it('auids must not be duplicated', function () {
      const request = spec.buildRequests(bidRequests);
      expect(request.data).to.be.an('string');
      const payload = parseRequest(request.data);
      expect(payload).to.have.property('u').that.is.a('string');
      expect(payload).to.have.property('auids', '1,2');
      expect(payload).to.have.property('r', '22edbae2733bf6');
    });

    it('if gdprConsent is present payload must have gdpr params', function () {
      const request = spec.buildRequests(bidRequests, {gdprConsent: {consentString: 'AAA', gdprApplies: true}});
      expect(request.data).to.be.an('string');
      const payload = parseRequest(request.data);
      expect(payload).to.have.property('gdpr_consent', 'AAA');
      expect(payload).to.have.property('gdpr_applies', '1');
    });

    it('if gdprApplies is false gdpr_applies must be 0', function () {
      const request = spec.buildRequests(bidRequests, {gdprConsent: {consentString: 'AAA', gdprApplies: false}});
      expect(request.data).to.be.an('string');
      const payload = parseRequest(request.data);
      expect(payload).to.have.property('gdpr_consent', 'AAA');
      expect(payload).to.have.property('gdpr_applies', '0');
    });

    it('if gdprApplies is undefined gdpr_applies must be 1', function () {
      const request = spec.buildRequests(bidRequests, {gdprConsent: {consentString: 'AAA'}});
      expect(request.data).to.be.an('string');
      const payload = parseRequest(request.data);
      expect(payload).to.have.property('gdpr_consent', 'AAA');
      expect(payload).to.have.property('gdpr_applies', '1');
    });
  });

  describe('interpretResponse', function () {
    const responses = [
      {'bid': [{'price': 1.15, 'adm': '<div>test content 1</div>', 'auid': 1, 'h': 250, 'w': 300}], 'seat': '1'},
      {'bid': [{'price': 0.5, 'adm': '<div>test content 2</div>', 'auid': 2, 'h': 90, 'w': 728}], 'seat': '1'},
      {'bid': [{'price': 0, 'auid': 3, 'h': 250, 'w': 300}], 'seat': '1'},
      {'bid': [{'price': 0, 'adm': '<div>test content 4</div>', 'h': 250, 'w': 300}], 'seat': '1'},
      undefined,
      {'bid': [], 'seat': '1'},
      {'seat': '1'},
    ];

    it('should get correct bid response', function () {
      const bidRequests = [
        {
          'bidder': 'grid',
          'params': {
            'uid': '1'
          },
          'adUnitCode': 'adunit-code-1',
          'sizes': [[300, 250], [300, 600]],
          'bidId': '659423fff799cb',
          'bidderRequestId': '5f2009617a7c0a',
          'auctionId': '1cbd2feafe5e8b',
        }
      ];
      const request = spec.buildRequests(bidRequests);
      const expectedResponse = [
        {
          'requestId': '659423fff799cb',
          'cpm': 1.15,
          'creativeId': 1,
          'dealId': undefined,
          'width': 300,
          'height': 250,
          'ad': '<div>test content 1</div>',
          'bidderCode': 'grid',
          'currency': 'USD',
          'netRevenue': false,
          'ttl': 360,
        }
      ];

      const result = spec.interpretResponse({'body': {'seatbid': [responses[0]]}}, request);
      expect(result).to.deep.equal(expectedResponse);
    });

    it('should get correct multi bid response', function () {
      const bidRequests = [
        {
          'bidder': 'grid',
          'params': {
            'uid': '1'
          },
          'adUnitCode': 'adunit-code-1',
          'sizes': [[300, 250], [300, 600]],
          'bidId': '300bfeb0d71a5b',
          'bidderRequestId': '2c2bb1972df9a',
          'auctionId': '1fa09aee5c8c99',
        },
        {
          'bidder': 'grid',
          'params': {
            'uid': '2'
          },
          'adUnitCode': 'adunit-code-1',
          'sizes': [[300, 250], [300, 600]],
          'bidId': '4dff80cc4ee346',
          'bidderRequestId': '2c2bb1972df9a',
          'auctionId': '1fa09aee5c8c99',
        },
        {
          'bidder': 'grid',
          'params': {
            'uid': '1'
          },
          'adUnitCode': 'adunit-code-2',
          'sizes': [[728, 90]],
          'bidId': '5703af74d0472a',
          'bidderRequestId': '2c2bb1972df9a',
          'auctionId': '1fa09aee5c8c99',
        }
      ];
      const request = spec.buildRequests(bidRequests);
      const expectedResponse = [
        {
          'requestId': '300bfeb0d71a5b',
          'cpm': 1.15,
          'creativeId': 1,
          'dealId': undefined,
          'width': 300,
          'height': 250,
          'ad': '<div>test content 1</div>',
          'bidderCode': 'grid',
          'currency': 'USD',
          'netRevenue': false,
          'ttl': 360,
        },
        {
          'requestId': '5703af74d0472a',
          'cpm': 1.15,
          'creativeId': 1,
          'dealId': undefined,
          'width': 300,
          'height': 250,
          'ad': '<div>test content 1</div>',
          'bidderCode': 'grid',
          'currency': 'USD',
          'netRevenue': false,
          'ttl': 360,
        },
        {
          'requestId': '4dff80cc4ee346',
          'cpm': 0.5,
          'creativeId': 2,
          'dealId': undefined,
          'width': 728,
          'height': 90,
          'ad': '<div>test content 2</div>',
          'bidderCode': 'grid',
          'currency': 'USD',
          'netRevenue': false,
          'ttl': 360,
        }
      ];

      const result = spec.interpretResponse({'body': {'seatbid': [responses[0], responses[1]]}}, request);
      expect(result).to.deep.equal(expectedResponse);
    });

    it('handles wrong and nobid responses', function () {
      const bidRequests = [
        {
          'bidder': 'grid',
          'params': {
            'uid': '3'
          },
          'adUnitCode': 'adunit-code-1',
          'sizes': [[300, 250], [300, 600]],
          'bidId': '300bfeb0d7190gf',
          'bidderRequestId': '2c2bb1972d23af',
          'auctionId': '1fa09aee5c84d34',
        },
        {
          'bidder': 'grid',
          'params': {
            'uid': '4'
          },
          'adUnitCode': 'adunit-code-1',
          'sizes': [[300, 250], [300, 600]],
          'bidId': '300bfeb0d71321',
          'bidderRequestId': '2c2bb1972d23af',
          'auctionId': '1fa09aee5c84d34',
        },
        {
          'bidder': 'grid',
          'params': {
            'uid': '5'
          },
          'adUnitCode': 'adunit-code-2',
          'sizes': [[728, 90]],
          'bidId': '300bfeb0d7183bb',
          'bidderRequestId': '2c2bb1972d23af',
          'auctionId': '1fa09aee5c84d34',
        }
      ];
      const request = spec.buildRequests(bidRequests);
      const result = spec.interpretResponse({'body': {'seatbid': responses.slice(2)}}, request);
      expect(result.length).to.equal(0);
    });
  });
});
