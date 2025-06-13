import { expect } from 'chai';
import { spec } from 'modules/sevioBidAdapter.js';

const ENDPOINT_URL = 'https://work.targetblankdev.com/prebid';

describe('sevioBidAdapter', function () {
  describe('isBidRequestValid', function () {
    let bid = {
      'bidder': 'sevio',
      'params': {
        zone: 'zoneId'
      },
      'mediaTypes': {
        'banner': {
          'sizes': [[728, 90]]
        }
      },
      'adUnitCode': 'adunit-code',
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
        'bidder': 'sevio',
        'params': {
          zone: 'zoneId'
        },
        'mediaTypes': {
          'banner': {
            'sizes': [[728, 90]]
          }
        },
        'bidId': '3e16f4cbbca2b',
        'bidderRequestId': '2d0e47e3ddc744',
        'auctionId': 'fb56cc83-bc64-4c44-a9b8-34fec672b592',
      },
      {
        'bidder': 'sevio',
        'params': {
          zone: 'zoneId'
        },
        'mediaTypes': {
          'banner': {
            'sizes': [[728, 90]]
          }
        },
        'adUnitCode': 'adunit-sevio-2nd',
        'bidId': '3a7e104573c543"',
        'bidderRequestId': '250799bbf223c6',
        'auctionId': '0b29430c-b25f-487a-b90c-68697a01f4e6',
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
          'zone': 'zoneId',
          'width': '728',
          'height': '90',
          'bidId': 'bidId123',
          'referer': 'www.example.com'
        }
      }
    ];
    let serverResponse = {
      body: {
        "bids": [
          {
            "requestId": "3e16f4cbbca2b",
            "cpm": 5.0,
            "currency": "EUR",
            "width": 728,
            "height": 90,
            "creativeId": "b38d1ea7-36ea-410a-801a-0673b8ed8201",
            "ad": "<html lang='en'><h3>I am an ad</h3></html>",
            "ttl": 300,
            "netRevenue": false,
            "mediaType": "BANNER",
            "meta": {
              "advertiserDomains": [
                "none.com"
              ]
            }
          }
        ],
        "userSyncs": [
          {
            "url": "https://example.com/dmp/profile/?pid=12718&sg=SEVIO_CGE",
            "type": "image"
          }
        ]
      }
    };
    it('should get the correct bid response', function () {
      let expectedResponse = [{
        'requestId': '3e16f4cbbca2b',
        'cpm': 5.0,
        'width': 728,
        'height': 90,
        'creativeId': 'b38d1ea7-36ea-410a-801a-0673b8ed8201',
        'currency': 'EUR',
        'netRevenue': true,
        'ttl': 3000,
        'ad': '<html lang="en"><h3>I am an ad</h3></html>',
        'mediaType': 'banner',
        'meta': {'advertiserDomains': ['none.com']}
      }];
      let result = spec.interpretResponse(serverResponse, bidRequest[0]);

      expect(Object.keys(result)).to.deep.equal(Object.keys(expectedResponse));
    });
  });
});
