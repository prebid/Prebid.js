import { expect } from 'chai';
import { spec } from 'modules/bidglassBidAdapter';
import { newBidder } from 'src/adapters/bidderFactory';

describe('Bid Glass Adapter', function () {
  const adapter = newBidder(spec);

  describe('isBidRequestValid', function () {
    let bid = {
      'bidder': 'bidglass',
      'params': {
        'adUnitId': '3'
      },
      'adUnitCode': 'bidglass-testunit',
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
      bid.params = {};
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });
  });

  describe('buildRequests', function () {
    const bidRequests = [{
      'bidder': 'bidglass',
      'params': {
        'adUnitId': '3'
      },
      'adUnitCode': 'bidglass-testunit',
      'sizes': [[300, 250], [300, 600]],
      'bidId': '30b31c1838de1e',
      'bidderRequestId': '22edbae2733bf6',
      'auctionId': '1d1a030790a475',
    }];

    const request = spec.buildRequests(bidRequests);

    it('sends bid request to our endpoint via POST', function () {
      expect(request.method).to.equal('POST');
    });

    it('sets withCredentials to false', function () {
      expect(request.options.withCredentials).to.equal(false);
    });
  });

  describe('interpretResponse', function () {
    let response;
    beforeEach(function () {
      response = {
        body: {
          'bidResponses': [{
            'ad': '<!-- Creative -->',
            'cpm': '0.01',
            'creativeId': '-1',
            'width': '300',
            'height': '250',
            'requestId': '30b31c1838de1e'
          }]
        }
      };
    });

    it('should get the correct bid response', function () {
      let expectedResponse = [{
        'requestId': '30b31c1838de1e',
        'cpm': 0.01,
        'width': 300,
        'height': 250,
        'creativeId': '-1',
        'dealId': null,
        'currency': 'USD',
        'mediaType': 'banner',
        'netRevenue': true,
        'ttl': 10,
        'ad': '<!-- Creative -->'
      }];

      let result = spec.interpretResponse(response);
      expect(Object.keys(result[0])).to.deep.equal(Object.keys(expectedResponse[0]));
    });

    it('handles empty bid response', function () {
      let response = {
        body: {
          'bidResponses': []
        }
      };
      let result = spec.interpretResponse(response);
      expect(result.length).to.equal(0);
    });
  });
});
