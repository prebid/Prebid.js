import { expect } from 'chai';
import { spec } from 'modules/vertozBidAdapter';
import { newBidder } from 'src/adapters/bidderFactory';

const BASE_URI = '//hb.vrtzads.com/vzhbidder/bid?';

describe('VertozAdapter', function () {
  const adapter = newBidder(spec);

  describe('inherited functions', function () {
    it('exists and is a function', function () {
      expect(adapter.callBids).to.exist.and.to.be.a('function');
    });
  });

  describe('isBidRequestValid', function () {
    let bid = {
      'bidder': 'vertoz',
      'params': {
        'placementId': 'VZ-HB-B784382V6C6G3C'
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
        'placementId': 0
      };
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });
  });

  describe('buildRequests', function () {
    let bidRequests = [
      {
        'bidder': 'vertoz',
        'params': {
          'placementId': '10433394'
        },
        'adUnitCode': 'adunit-code',
        'sizes': [[300, 250], [300, 600]],
        'bidId': '30b31c1838de1e',
        'bidderRequestId': '22edbae2733bf6',
        'auctionId': '1d1a030790a475',
      }
    ];

    it('sends bid request to ENDPOINT via POST', function () {
      const request = spec.buildRequests(bidRequests)[0];
      expect(request.url).to.equal(BASE_URI);
      expect(request.method).to.equal('POST');
    });
  });

  describe('interpretResponse', function () {
    let response = {
      'vzhPlacementId': 'VZ-HB-B784382V6C6G3C',
      'bid': '76021e56-adaf-4114-b68d-ccacd1b3e551_1',
      'adWidth': '300',
      'adHeight': '250',
      'cpm': '0.16312590000000002',
      'ad': '<!-- Creative -->',
      'slotBidId': '44b3fcfd24aa93',
      'nurl': '<!-- Pixelurl -->',
      'statusText': 'Vertoz:Success'
    };

    it('should get correct bid response', function () {
      let expectedResponse = [
        {
          'requestId': '44b3fcfd24aa93',
          'cpm': 0.16312590000000002,
          'width': 300,
          'height': 250,
          'netRevenue': true,
          'mediaType': 'banner',
          'currency': 'USD',
          'dealId': null,
          'creativeId': null,
          'ttl': 300,
          'ad': '<!-- Creative -->'
        }
      ];
      let bidderRequest;
      let result = spec.interpretResponse({body: response});
      expect(Object.keys(result[0])).to.have.members(Object.keys(expectedResponse[0]));
      expect(result[0].cpm).to.not.equal(null);
    });

    it('handles nobid responses', function () {
      let response = {
        'vzhPlacementId': 'VZ-HB-I617046VBGE3EH',
        'slotBidId': 'f00412ac86b79',
        'statusText': 'NO_BIDS'
      };
      let bidderRequest;

      let result = spec.interpretResponse({body: response});
      expect(result.length).to.equal(0);
    });
  });
});
