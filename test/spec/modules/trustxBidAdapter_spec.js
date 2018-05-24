import { expect } from 'chai';
import { spec } from 'modules/trustxBidAdapter';
import { newBidder } from 'src/adapters/bidderFactory';

describe('TrustXAdapter', function () {
  const adapter = newBidder(spec);

  describe('inherited functions', () => {
    it('exists and is a function', () => {
      expect(adapter.callBids).to.exist.and.to.be.a('function');
    });
  });

  describe('isBidRequestValid', () => {
    let bid = {
      'bidder': 'trustx',
      'params': {
        'uid': '44'
      },
      'adUnitCode': 'adunit-code',
      'sizes': [[300, 250], [300, 600]],
      'bidId': '30b31c1838de1e',
      'bidderRequestId': '22edbae2733bf6',
      'auctionId': '1d1a030790a475',
    };

    it('should return true when required params found', () => {
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should return false when required params are not passed', () => {
      let bid = Object.assign({}, bid);
      delete bid.params;
      bid.params = {
        'uid': 0
      };
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });
  });

  describe('buildRequests', () => {
    let bidRequests = [
      {
        'bidder': 'trustx',
        'params': {
          'uid': '43'
        },
        'adUnitCode': 'adunit-code-1',
        'sizes': [[300, 250], [300, 600]],
        'bidId': '30b31c1838de1e',
        'bidderRequestId': '22edbae2733bf6',
        'auctionId': '1d1a030790a475',
      },
      {
        'bidder': 'trustx',
        'params': {
          'uid': '43'
        },
        'adUnitCode': 'adunit-code-2',
        'sizes': [[728, 90]],
        'bidId': '3150ccb55da321',
        'bidderRequestId': '22edbae2733bf6',
        'auctionId': '1d1a030790a475',
      },
      {
        'bidder': 'trustx',
        'params': {
          'uid': '45'
        },
        'adUnitCode': 'adunit-code-1',
        'sizes': [[300, 250], [300, 600]],
        'bidId': '42dbe3a7168a6a',
        'bidderRequestId': '22edbae2733bf6',
        'auctionId': '1d1a030790a475',
      }
    ];

    it('should attach valid params to the tag', () => {
      const request = spec.buildRequests([bidRequests[0]]);
      const payload = request.data;
      expect(payload).to.be.an('object');
      expect(payload).to.have.property('u').that.is.a('string');
      expect(payload).to.have.property('pt', 'net');
      expect(payload).to.have.property('auids', '43');
      expect(payload).to.have.property('r', '22edbae2733bf6');
    });

    it('auids must not be duplicated', () => {
      const request = spec.buildRequests(bidRequests);
      const payload = request.data;
      expect(payload).to.be.an('object');
      expect(payload).to.have.property('u').that.is.a('string');
      expect(payload).to.have.property('pt', 'net');
      expect(payload).to.have.property('auids', '43,45');
      expect(payload).to.have.property('r', '22edbae2733bf6');
    });

    it('pt parameter must be "gross" if params.priceType === "gross"', () => {
      bidRequests[1].params.priceType = 'gross';
      const request = spec.buildRequests(bidRequests);
      const payload = request.data;
      expect(payload).to.be.an('object');
      expect(payload).to.have.property('u').that.is.a('string');
      expect(payload).to.have.property('pt', 'gross');
      expect(payload).to.have.property('auids', '43,45');
      expect(payload).to.have.property('r', '22edbae2733bf6');
      delete bidRequests[1].params.priceType;
    });

    it('pt parameter must be "net" or "gross"', () => {
      bidRequests[1].params.priceType = 'some';
      const request = spec.buildRequests(bidRequests);
      const payload = request.data;
      expect(payload).to.be.an('object');
      expect(payload).to.have.property('u').that.is.a('string');
      expect(payload).to.have.property('pt', 'net');
      expect(payload).to.have.property('auids', '43,45');
      expect(payload).to.have.property('r', '22edbae2733bf6');
      delete bidRequests[1].params.priceType;
    });

    it('if gdprConsent is present payload must have gdpr params', () => {
      const request = spec.buildRequests(bidRequests, {gdprConsent: {consentString: 'AAA', gdprApplies: true}});
      const payload = request.data;
      expect(payload).to.be.an('object');
      expect(payload).to.have.property('gdpr_consent', 'AAA');
      expect(payload).to.have.property('gdpr_applies', 1);
    });

    it('if gdprApplies is false gdpr_applies must be 0', () => {
      const request = spec.buildRequests(bidRequests, {gdprConsent: {consentString: 'AAA', gdprApplies: false}});
      const payload = request.data;
      expect(payload).to.be.an('object');
      expect(payload).to.have.property('gdpr_consent', 'AAA');
      expect(payload).to.have.property('gdpr_applies', 0);
    });

    it('if gdprApplies is undefined gdpr_applies must be 1', () => {
      const request = spec.buildRequests(bidRequests, {gdprConsent: {consentString: 'AAA'}});
      const payload = request.data;
      expect(payload).to.be.an('object');
      expect(payload).to.have.property('gdpr_consent', 'AAA');
      expect(payload).to.have.property('gdpr_applies', 1);
    });
  });

  describe('interpretResponse', () => {
    const responses = [
      {'bid': [{'price': 1.15, 'adm': '<div>test content 1</div>', 'auid': 43, 'h': 250, 'w': 300}], 'seat': '1'},
      {'bid': [{'price': 0.5, 'adm': '<div>test content 2</div>', 'auid': 44, 'h': 90, 'w': 728}], 'seat': '1'},
      {'bid': [{'price': 0, 'auid': 45, 'h': 250, 'w': 300}], 'seat': '1'},
      {'bid': [{'price': 0, 'adm': '<div>test content 4</div>', 'h': 250, 'w': 300}], 'seat': '1'},
      undefined,
      {'bid': [], 'seat': '1'},
      {'seat': '1'},
    ];

    it('should get correct bid response', () => {
      const bidRequests = [
        {
          'bidder': 'trustx',
          'params': {
            'uid': '43'
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
          'creativeId': 43,
          'dealId': undefined,
          'width': 300,
          'height': 250,
          'ad': '<div>test content 1</div>',
          'bidderCode': 'trustx',
          'currency': 'USD',
          'netRevenue': true,
          'ttl': 360,
        }
      ];

      const result = spec.interpretResponse({'body': {'seatbid': [responses[0]]}}, request);
      expect(result).to.deep.equal(expectedResponse);
    });

    it('should get correct multi bid response', () => {
      const bidRequests = [
        {
          'bidder': 'trustx',
          'params': {
            'uid': '43'
          },
          'adUnitCode': 'adunit-code-1',
          'sizes': [[300, 250], [300, 600]],
          'bidId': '300bfeb0d71a5b',
          'bidderRequestId': '2c2bb1972df9a',
          'auctionId': '1fa09aee5c8c99',
        },
        {
          'bidder': 'trustx',
          'params': {
            'uid': '44'
          },
          'adUnitCode': 'adunit-code-1',
          'sizes': [[300, 250], [300, 600]],
          'bidId': '4dff80cc4ee346',
          'bidderRequestId': '2c2bb1972df9a',
          'auctionId': '1fa09aee5c8c99',
        },
        {
          'bidder': 'trustx',
          'params': {
            'uid': '43'
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
          'creativeId': 43,
          'dealId': undefined,
          'width': 300,
          'height': 250,
          'ad': '<div>test content 1</div>',
          'bidderCode': 'trustx',
          'currency': 'USD',
          'netRevenue': true,
          'ttl': 360,
        },
        {
          'requestId': '5703af74d0472a',
          'cpm': 1.15,
          'creativeId': 43,
          'dealId': undefined,
          'width': 300,
          'height': 250,
          'ad': '<div>test content 1</div>',
          'bidderCode': 'trustx',
          'currency': 'USD',
          'netRevenue': true,
          'ttl': 360,
        },
        {
          'requestId': '4dff80cc4ee346',
          'cpm': 0.5,
          'creativeId': 44,
          'dealId': undefined,
          'width': 728,
          'height': 90,
          'ad': '<div>test content 2</div>',
          'bidderCode': 'trustx',
          'currency': 'USD',
          'netRevenue': true,
          'ttl': 360,
        }
      ];

      const result = spec.interpretResponse({'body': {'seatbid': [responses[0], responses[1]]}}, request);
      expect(result).to.deep.equal(expectedResponse);
    });

    it('handles wrong and nobid responses', () => {
      const bidRequests = [
        {
          'bidder': 'trustx',
          'params': {
            'uid': '45'
          },
          'adUnitCode': 'adunit-code-1',
          'sizes': [[300, 250], [300, 600]],
          'bidId': '300bfeb0d7190gf',
          'bidderRequestId': '2c2bb1972d23af',
          'auctionId': '1fa09aee5c84d34',
        },
        {
          'bidder': 'trustx',
          'params': {
            'uid': '46'
          },
          'adUnitCode': 'adunit-code-1',
          'sizes': [[300, 250], [300, 600]],
          'bidId': '300bfeb0d71321',
          'bidderRequestId': '2c2bb1972d23af',
          'auctionId': '1fa09aee5c84d34',
        },
        {
          'bidder': 'trustx',
          'params': {
            'uid': '50'
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
