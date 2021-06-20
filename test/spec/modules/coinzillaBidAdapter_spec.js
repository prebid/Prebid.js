import {assert, expect} from 'chai';
import {spec} from 'modules/coinzillaBidAdapter.js';
import {newBidder} from 'src/adapters/bidderFactory.js';

const ENDPOINT_URL = 'https://request.czilladx.com/serve/request.php';

describe('coinzillaBidAdapter', function () {
  const adapter = newBidder(spec);
  describe('isBidRequestValid', function () {
    let bid = {
      'bidder': 'coinzilla',
      'params': {
        placementId: 'testPlacementId'
      },
      'adUnitCode': 'adunit-code',
      'sizes': [
        [300, 250]
      ],
      'bidId': '1234asdf1234',
      'bidderRequestId': '1234asdf1234asdf',
      'auctionId': '61466567-d482-4a16-96f0-fe5f25ffbdf120'
    };
    it('should return true where required params found', function () {
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });
  });
  describe('buildRequests', function () {
    let bidRequests = [
      {
        'bidder': 'coinzilla',
        'params': {
          placementId: 'testPlacementId'
        },
        'sizes': [
          [300, 250]
        ],
        'bidId': '23beaa6af6cdde',
        'bidderRequestId': '19c0c1efdf37e7',
        'auctionId': '61466567-d482-4a16-96f0-fe5f25ffbdf1',
      },
      {
        'bidder': 'coinzilla',
        'params': {
          placementId: 'testPlacementId'
        },
        'adUnitCode': 'adunit-code2',
        'sizes': [
          [300, 250]
        ],
        'bidId': '382091349b149f"',
        'bidderRequestId': '1f9c98192de251',
        'auctionId': '61466567-d482-4a16-96f0-fe5f25ffbdf1',
      }
    ];

    let bidderRequests = {
      'refererInfo': {
        'numIframes': 0,
        'reachedTop': true,
        'referer': 'https://example.com',
        'stack': ['https://example.com']
      }
    };

    const request = spec.buildRequests(bidRequests, bidderRequests);
    it('sends bid request to our endpoint via POST', function () {
      expect(request[0].method).to.equal('POST');
      expect(request[1].method).to.equal('POST');
    });
    it('attaches source and version to endpoint URL as query params', function () {
      expect(request[0].url).to.equal(ENDPOINT_URL);
      expect(request[1].url).to.equal(ENDPOINT_URL);
    });
  });

  describe('interpretResponse', function () {
    let bidRequest = [
      {
        'method': 'POST',
        'url': ENDPOINT_URL,
        'data': {
          'placementId': 'testPlacementId',
          'width': '300',
          'height': '200',
          'bidId': 'bidId123',
          'referer': 'www.example.com'
        }
      }
    ];
    let serverResponse = {
      body: {
        'ad': '<html><h3>I am an ad</h3></html> ',
        'cpm': 4.2,
        'creativeId': '12345asdfg',
        'currency': 'EUR',
        'statusMessage': 'Bid available',
        'requestId': 'bidId123',
        'width': 300,
        'height': 250,
        'netRevenue': true,
        'mediaType': 'banner',
        'advertiserDomain': ['none.com']
      }
    };
    it('should get the correct bid response', function () {
      let expectedResponse = [{
        'requestId': 'bidId123',
        'cpm': 4.2,
        'width': 300,
        'height': 250,
        'creativeId': '12345asdfg',
        'currency': 'EUR',
        'netRevenue': true,
        'ttl': 3000,
        'ad': '<html><h3>I am an ad</h3></html>',
        'mediaType': 'banner',
        'meta': {'advertiserDomains': ['none.com']}
      }];
      let result = spec.interpretResponse(serverResponse, bidRequest[0]);
      expect(Object.keys(result)).to.deep.equal(Object.keys(expectedResponse));
    });
  });
});
