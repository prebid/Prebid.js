import { expect } from 'chai';
import { spec } from 'modules/colombiaBidAdapter';
import { newBidder } from 'src/adapters/bidderFactory';

const HOST_NAME = document.location.protocol + '//' + window.location.host;
const ENDPOINT = 'https://ade.clmbtech.com/cde/prebid.htm';

describe('colombiaBidAdapter', function() {
  const adapter = newBidder(spec);

  describe('isBidRequestValid', function () {
    let bid = {
      'bidder': 'colombia',
      'params': {
        placementId: '307466'
      },
      'adUnitCode': 'adunit-code',
      'sizes': [
        [300, 250]
      ],
      'bidId': '23beaa6af6cdde',
      'bidderRequestId': '19c0c1efdf37e7',
      'auctionId': '61466567-d482-4a16-96f0-fe5f25ffbdf1',
    };

    it('should return true when required params found', function () {
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should return false when placementId not passed correctly', function () {
      bid.params.placementId = '';
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return false when require params are not passed', function () {
      let bid = Object.assign({}, bid);
      bid.params = {};
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });
  });

  describe('buildRequests', function () {
    let bidRequests = [
      {
        'bidder': 'colombia',
        'params': {
          placementId: '307466'
        },
        'adUnitCode': 'adunit-code1',
        'sizes': [
          [300, 250]
        ],
        'bidId': '23beaa6af6cdde',
        'bidderRequestId': '19c0c1efdf37e7',
        'auctionId': '61466567-d482-4a16-96f0-fe5f25ffbdf1',
      },
      {
        'bidder': 'colombia',
        'params': {
          placementId: '307466'
        },
        'adUnitCode': 'adunit-code2',
        'sizes': [
          [300, 250]
        ],
        'bidId': '382091349b149f"',
        'bidderRequestId': '"1f9c98192de251"',
        'auctionId': '61466567-d482-4a16-96f0-fe5f25ffbdf1',
      }
    ];

    const request = spec.buildRequests(bidRequests);

    it('sends bid request to our endpoint via POST', function () {
      expect(request[0].method).to.equal('POST');
      expect(request[1].method).to.equal('POST');
    });

    it('attaches source and version to endpoint URL as query params', function () {
      expect(request[0].url).to.equal(ENDPOINT);
      expect(request[1].url).to.equal(ENDPOINT);
    });
  });

  describe('interpretResponse', function () {
    let bidRequest = [
      {
        'method': 'POST',
        'url': 'https://ade.clmbtech.com/cde/prebid.htm',
        'data': {
          'v': 'hb1',
          'p': '307466',
          'w': '300',
          'h': '250',
          'cb': 12892917383,
          'r': 'http%3A%2F%2Flocalhost%3A9876%2F%3Fid%3D74552836',
          'uid': '23beaa6af6cdde',
          't': 'i',
        }
      }
    ];

    let serverResponse = {
      body: {
        'ad': '<div>This is test case for colombia adapter</div> ',
        'cpm': 3.14,
        'creativeId': '6b958110-612c-4b03-b6a9-7436c9f746dc-1sk24',
        'currency': 'USD',
        'uid': '23beaa6af6cdde',
        'width': 728,
        'height': 90,
        'netRevenue': true,
        'ttl': 600,
        'dealid': '',
        'referrer': 'http%3A%2F%2Flocalhost%3A9876%2F%3Fid%3D74552836'
      }
    };

    it('should get the correct bid response', function () {
      let expectedResponse = [{
        'requestId': '23beaa6af6cdde',
        'cpm': 3.14,
        'width': 728,
        'height': 90,
        'creativeId': '6b958110-612c-4b03-b6a9-7436c9f746dc-1sk24',
        'dealId': '',
        'currency': 'USD',
        'netRevenue': true,
        'ttl': 300,
        'referrer': 'http%3A%2F%2Flocalhost%3A9876%2F%3Fid%3D74552836',
        'ad': '<div>This is test case for colombia adapter</div>'
      }];
      let result = spec.interpretResponse(serverResponse, bidRequest[0]);
      expect(Object.keys(result[0])).to.deep.equal(Object.keys(expectedResponse[0]));
    });

    it('handles empty bid response', function () {
      let response = {
        body: {
          'uid': '23beaa6af6cdde',
          'height': 0,
          'creativeId': '',
          'statusMessage': 'Bid returned empty or error response',
          'width': 0,
          'cpm': 0
        }
      };
      let result = spec.interpretResponse(response, bidRequest[0]);
      expect(result.length).to.equal(0);
    });
  });
});
