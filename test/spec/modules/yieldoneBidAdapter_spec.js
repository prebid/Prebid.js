import { expect } from 'chai';
import { spec } from 'modules/yieldoneBidAdapter';
import { newBidder } from 'src/adapters/bidderFactory';

const ENDPOINT = '//y.one.impact-ad.jp/h_bid';

describe('yieldoneBidAdapter', function() {
  const adapter = newBidder(spec);

  describe('isBidRequestValid', function () {
    let bid = {
      'bidder': 'yieldone',
      'params': {
        placementId: '44082'
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
        'bidder': 'yieldone',
        'params': {
          placementId: '44082'
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
        'bidder': 'yieldone',
        'params': {
          placementId: '44337'
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

    it('sends bid request to our endpoint via GET', function () {
      expect(request[0].method).to.equal('GET');
      expect(request[1].method).to.equal('GET');
    });

    it('attaches source and version to endpoint URL as query params', function () {
      expect(request[0].url).to.equal(ENDPOINT);
      expect(request[1].url).to.equal(ENDPOINT);
    });
  });

  describe('interpretResponse', function () {
    let bidRequest = [
      {
        'method': 'GET',
        'url': '//y.one.impact-ad.jp/h_bid',
        'data': {
          'v': 'hb1',
          'p': '44082',
          'w': '300',
          'h': '250',
          'cb': 12892917383,
          'r': 'http%3A%2F%2Flocalhost%3A9876%2F%3Fid%3D74552836',
          'uid': '23beaa6af6cdde',
          't': 'i'
        }
      }
    ];

    let serverResponse = {
      body: {
        'adTag': '<!-- adtag -->',
        'cpm': 0.0536616,
        'crid': '2494768',
        'statusMessage': 'Bid available',
        'uid': '23beaa6af6cdde',
        'width': 300,
        'height': 250
      }
    };

    it('should get the correct bid response', function () {
      let expectedResponse = [{
        'requestId': '23beaa6af6cdde',
        'cpm': 53.6616,
        'width': 300,
        'height': 250,
        'creativeId': '2494768',
        'dealId': '',
        'currency': 'JPY',
        'netRevenue': true,
        'ttl': 3000,
        'referrer': '',
        'ad': '<!-- adtag -->'
      }];
      let result = spec.interpretResponse(serverResponse, bidRequest[0]);
      expect(Object.keys(result)).to.deep.equal(Object.keys(expectedResponse));
    });

    it('handles empty bid response', function () {
      let response = {
        body: {
          'uid': '2c0b634db95a01',
          'height': 0,
          'crid': '',
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
