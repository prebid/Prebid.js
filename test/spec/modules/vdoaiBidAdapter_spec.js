import {assert, expect} from 'chai';
import {spec} from 'modules/vdoaiBidAdapter.js';
import {newBidder} from 'src/adapters/bidderFactory.js';

const ENDPOINT_URL = 'https://prebid.vdo.ai/auction';

describe('vdoaiBidAdapter', function () {
  const adapter = newBidder(spec);
  describe('isBidRequestValid', function () {
    let bid = {
      'bidder': 'vdoai',
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
        'bidder': 'vdoai',
        'params': {
          placementId: 'testPlacementId'
        },
        'sizes': [
          [300, 250]
        ],
        'bidId': '23beaa6af6cdde',
        'bidderRequestId': '19c0c1efdf37e7',
        'auctionId': '61466567-d482-4a16-96f0-fe5f25ffbdf1',
        'mediaTypes': 'banner'
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
    });
    it('attaches source and version to endpoint URL as query params', function () {
      expect(request[0].url).to.equal(ENDPOINT_URL);
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
        'vdoCreative': '<html><h3>I am an ad</h3></html> ',
        'price': 4.2,
        'adid': '12345asdfg',
        'currency': 'EUR',
        'statusMessage': 'Bid available',
        'requestId': 'bidId123',
        'width': 300,
        'height': 250,
        'netRevenue': true,
        'adDomain': ['text.abc']
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
        'meta': {
          'advertiserDomains': ['text.abc']
        }
      }];
      let result = spec.interpretResponse(serverResponse, bidRequest[0]);
      expect(Object.keys(result)).to.deep.equal(Object.keys(expectedResponse));
      expect(result[0].meta.advertiserDomains).to.deep.equal(expectedResponse[0].meta.advertiserDomains);
    });

    it('handles instream video responses', function () {
      let serverResponse = {
        body: {
          'vdoCreative': '<!-- VAST Creative -->',
          'price': 4.2,
          'adid': '12345asdfg',
          'currency': 'EUR',
          'statusMessage': 'Bid available',
          'requestId': 'bidId123',
          'width': 300,
          'height': 250,
          'netRevenue': true,
          'mediaType': 'video'
        }
      };
      let bidRequest = [
        {
          'method': 'POST',
          'url': ENDPOINT_URL,
          'data': {
            'placementId': 'testPlacementId',
            'width': '300',
            'height': '200',
            'bidId': 'bidId123',
            'referer': 'www.example.com',
            'mediaType': 'video'
          }
        }
      ];

      let result = spec.interpretResponse(serverResponse, bidRequest[0]);
      expect(result[0]).to.have.property('vastXml');
      expect(result[0]).to.have.property('mediaType', 'video');
    });
  });
});
