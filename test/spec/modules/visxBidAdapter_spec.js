import { expect } from 'chai';
import { spec } from 'modules/visxBidAdapter';
import { config } from 'src/config';
import { newBidder } from 'src/adapters/bidderFactory';

describe('VisxAdapter', function () {
  const adapter = newBidder(spec);

  describe('inherited functions', () => {
    it('exists and is a function', () => {
      expect(adapter.callBids).to.exist.and.to.be.a('function');
    });
  });

  describe('isBidRequestValid', () => {
    let bid = {
      'bidder': 'visx',
      'params': {
        'uid': '903536'
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
        'bidder': 'visx',
        'params': {
          'uid': '903535'
        },
        'adUnitCode': 'adunit-code-1',
        'sizes': [[300, 250], [300, 600]],
        'bidId': '30b31c1838de1e',
        'bidderRequestId': '22edbae2733bf6',
        'auctionId': '1d1a030790a475',
      },
      {
        'bidder': 'visx',
        'params': {
          'uid': '903535'
        },
        'adUnitCode': 'adunit-code-2',
        'sizes': [[728, 90]],
        'bidId': '3150ccb55da321',
        'bidderRequestId': '22edbae2733bf6',
        'auctionId': '1d1a030790a475',
      },
      {
        'bidder': 'visx',
        'params': {
          'uid': '903536'
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
      expect(payload).to.have.property('auids', '903535');
      expect(payload).to.have.property('r', '22edbae2733bf6');
      expect(payload).to.have.property('cur', 'EUR');
    });

    it('auids must not be duplicated', () => {
      const request = spec.buildRequests(bidRequests);
      const payload = request.data;
      expect(payload).to.be.an('object');
      expect(payload).to.have.property('u').that.is.a('string');
      expect(payload).to.have.property('pt', 'net');
      expect(payload).to.have.property('auids', '903535,903536');
      expect(payload).to.have.property('r', '22edbae2733bf6');
      expect(payload).to.have.property('cur', 'EUR');
    });

    it('pt parameter must be "gross" if params.priceType === "gross"', () => {
      bidRequests[1].params.priceType = 'gross';
      const request = spec.buildRequests(bidRequests);
      const payload = request.data;
      expect(payload).to.be.an('object');
      expect(payload).to.have.property('u').that.is.a('string');
      expect(payload).to.have.property('pt', 'gross');
      expect(payload).to.have.property('auids', '903535,903536');
      expect(payload).to.have.property('r', '22edbae2733bf6');
      expect(payload).to.have.property('cur', 'EUR');
      delete bidRequests[1].params.priceType;
    });

    it('pt parameter must be "net" or "gross"', () => {
      bidRequests[1].params.priceType = 'some';
      const request = spec.buildRequests(bidRequests);
      const payload = request.data;
      expect(payload).to.be.an('object');
      expect(payload).to.have.property('u').that.is.a('string');
      expect(payload).to.have.property('pt', 'net');
      expect(payload).to.have.property('auids', '903535,903536');
      expect(payload).to.have.property('r', '22edbae2733bf6');
      expect(payload).to.have.property('cur', 'EUR');
      delete bidRequests[1].params.priceType;
    });
    it('should add currency from currency.bidderCurrencyDefault', () => {
      const getConfigStub = sinon.stub(config, 'getConfig').callsFake(
        arg => arg === 'currency.bidderCurrencyDefault.visx' ? 'JPY' : 'USD');
      const request = spec.buildRequests(bidRequests);
      const payload = request.data;
      expect(payload).to.be.an('object');
      expect(payload).to.have.property('u').that.is.a('string');
      expect(payload).to.have.property('pt', 'net');
      expect(payload).to.have.property('auids', '903535,903536');
      expect(payload).to.have.property('r', '22edbae2733bf6');
      expect(payload).to.have.property('cur', 'JPY');
      getConfigStub.restore();
    });
    it('should add currency from currency.adServerCurrency', () => {
      const getConfigStub = sinon.stub(config, 'getConfig').callsFake(
        arg => arg === 'currency.bidderCurrencyDefault.visx' ? '' : 'USD');
      const request = spec.buildRequests(bidRequests);
      const payload = request.data;
      expect(payload).to.be.an('object');
      expect(payload).to.have.property('u').that.is.a('string');
      expect(payload).to.have.property('pt', 'net');
      expect(payload).to.have.property('auids', '903535,903536');
      expect(payload).to.have.property('r', '22edbae2733bf6');
      expect(payload).to.have.property('cur', 'USD');
      getConfigStub.restore();
    });
  });

  describe('interpretResponse', () => {
    const responses = [
      {'bid': [{'price': 1.15, 'adm': '<div>test content 1</div>', 'auid': 903535, 'h': 250, 'w': 300}], 'seat': '1'},
      {'bid': [{'price': 0.5, 'adm': '<div>test content 2</div>', 'auid': 903536, 'h': 90, 'w': 728}], 'seat': '1'},
      {'bid': [{'price': 0, 'auid': 903536, 'h': 250, 'w': 300}], 'seat': '1'},
      {'bid': [{'price': 0, 'adm': '<div>test content 4</div>', 'h': 250, 'w': 300}], 'seat': '1'},
      undefined,
      {'bid': [], 'seat': '1'},
      {'seat': '1'},
    ];

    it('should get correct bid response', () => {
      const bidRequests = [
        {
          'bidder': 'visx',
          'params': {
            'uid': '903535'
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
          'creativeId': 903535,
          'dealId': undefined,
          'width': 300,
          'height': 250,
          'ad': '<div>test content 1</div>',
          'currency': 'EUR',
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
          'bidder': 'visx',
          'params': {
            'uid': '903535'
          },
          'adUnitCode': 'adunit-code-1',
          'sizes': [[300, 250], [300, 600]],
          'bidId': '300bfeb0d71a5b',
          'bidderRequestId': '2c2bb1972df9a',
          'auctionId': '1fa09aee5c8c99',
        },
        {
          'bidder': 'visx',
          'params': {
            'uid': '903536'
          },
          'adUnitCode': 'adunit-code-1',
          'sizes': [[300, 250], [300, 600]],
          'bidId': '4dff80cc4ee346',
          'bidderRequestId': '2c2bb1972df9a',
          'auctionId': '1fa09aee5c8c99',
        },
        {
          'bidder': 'visx',
          'params': {
            'uid': '903535'
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
          'creativeId': 903535,
          'dealId': undefined,
          'width': 300,
          'height': 250,
          'ad': '<div>test content 1</div>',
          'currency': 'EUR',
          'netRevenue': true,
          'ttl': 360,
        },
        {
          'requestId': '5703af74d0472a',
          'cpm': 1.15,
          'creativeId': 903535,
          'dealId': undefined,
          'width': 300,
          'height': 250,
          'ad': '<div>test content 1</div>',
          'currency': 'EUR',
          'netRevenue': true,
          'ttl': 360,
        },
        {
          'requestId': '4dff80cc4ee346',
          'cpm': 0.5,
          'creativeId': 903536,
          'dealId': undefined,
          'width': 728,
          'height': 90,
          'ad': '<div>test content 2</div>',
          'currency': 'EUR',
          'netRevenue': true,
          'ttl': 360,
        }
      ];

      const result = spec.interpretResponse({'body': {'seatbid': [responses[0], responses[1]]}}, request);
      expect(result).to.deep.equal(expectedResponse);
    });

    it('should return right currency', () => {
      const bidRequests = [
        {
          'bidder': 'visx',
          'params': {
            'uid': '903535'
          },
          'adUnitCode': 'adunit-code-1',
          'sizes': [[300, 250], [300, 600]],
          'bidId': '659423fff799cb',
          'bidderRequestId': '5f2009617a7c0a',
          'auctionId': '1cbd2feafe5e8b',
        }
      ];
      const getConfigStub = sinon.stub(config, 'getConfig').returns('JPY');
      const request = spec.buildRequests(bidRequests);
      const expectedResponse = [
        {
          'requestId': '659423fff799cb',
          'cpm': 1.15,
          'creativeId': 903535,
          'dealId': undefined,
          'width': 300,
          'height': 250,
          'ad': '<div>test content 1</div>',
          'currency': 'JPY',
          'netRevenue': true,
          'ttl': 360,
        }
      ];

      const result = spec.interpretResponse({'body': {'seatbid': [responses[0]]}}, request);
      expect(result).to.deep.equal(expectedResponse);
      getConfigStub.restore();
    });

    it('handles wrong and nobid responses', () => {
      const bidRequests = [
        {
          'bidder': 'visx',
          'params': {
            'uid': '903536'
          },
          'adUnitCode': 'adunit-code-1',
          'sizes': [[300, 250], [300, 600]],
          'bidId': '300bfeb0d7190gf',
          'bidderRequestId': '2c2bb1972d23af',
          'auctionId': '1fa09aee5c84d34',
        },
        {
          'bidder': 'visx',
          'params': {
            'uid': '903538'
          },
          'adUnitCode': 'adunit-code-1',
          'sizes': [[300, 250], [300, 600]],
          'bidId': '300bfeb0d71321',
          'bidderRequestId': '2c2bb1972d23af',
          'auctionId': '1fa09aee5c84d34',
        },
        {
          'bidder': 'visx',
          'params': {
            'uid': '903539'
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
