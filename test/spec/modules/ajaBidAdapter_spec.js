import { spec } from 'modules/ajaBidAdapter';
import { newBidder } from 'src/adapters/bidderFactory';

const ENDPOINT = '//ad.as.amanad.adtdp.com/v2/prebid';

describe('AjaAdapter', function () {
  const adapter = newBidder(spec);

  describe('isBidRequestValid', function () {
    let bid = {
      'bidder': 'aja',
      'params': {
        'asi': '123456'
      },
      'adUnitCode': 'adunit',
      'sizes': [[300, 250]],
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
        'asi': 0
      };
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });
  });

  describe('buildRequests', function () {
    let bidRequests = [
      {
        'bidder': 'aja',
        'params': {
          'asi': '123456'
        },
        'adUnitCode': 'adunit',
        'sizes': [[300, 250]],
        'bidId': '30b31c1838de1e',
        'bidderRequestId': '22edbae2733bf6',
        'auctionId': '1d1a030790a475',
      }
    ];

    it('sends bid request to ENDPOINT via GET', function () {
      const requests = spec.buildRequests(bidRequests);
      expect(requests[0].url).to.equal(ENDPOINT);
      expect(requests[0].method).to.equal('GET');
    });
  });
  describe('interpretResponse', function () {
    let response = {
      'is_ad_return': true,
      'ad': {
        'ad_type': 1,
        'prebid_id': '51ef8751f9aead',
        'price': 12.34,
        'currency': 'USD',
        'creative_id': '123abc',
        'banner': {
          'w': 300,
          'h': 250,
          'tag': '<div></div>',
          'imps': [
            '//as.amanad.adtdp.com/v1/imp'
          ]
        }
      },
      'syncs': [
        'https://example.com'
      ]
    };

    it('should get correct banner bid response', function () {
      let expectedResponse = [
        {
          'requestId': '51ef8751f9aead',
          'cpm': 12.34,
          'creativeId': '123abc',
          'dealId': undefined,
          'width': 300,
          'height': 250,
          'ad': '<div></div>',
          'mediaType': 'banner',
          'currency': 'USD',
          'ttl': 300,
          'netRevenue': true
        }
      ];

      let bidderRequest;
      let result = spec.interpretResponse({ body: response }, {bidderRequest});
      expect(Object.keys(result[0])).to.have.members(Object.keys(expectedResponse[0]));
    });

    it('handles video responses', function () {
      let response = {
        'is_ad_return': true,
        'ad': {
          'ad_type': 3,
          'prebid_id': '51ef8751f9aead',
          'price': 12.34,
          'currency': 'JPY',
          'creative_id': '123abc',
          'video': {
            'w': 300,
            'h': 250,
            'vtag': '<VAST></VAST>',
            'purl': 'http://cdn/player',
            'progress': true,
            'loop': false,
            'inread': false
          }
        },
        'syncs': [
          'https://example.com'
        ]
      };

      let bidderRequest;
      let result = spec.interpretResponse({ body: response }, {bidderRequest});
      expect(result[0]).to.have.property('vastXml');
      expect(result[0]).to.have.property('renderer');
      expect(result[0]).to.have.property('mediaType', 'video');
    });

    it('handles nobid responses', function () {
      let response = {
        'is_ad_return': false,
        'ad': {}
      };

      let bidderRequest;
      let result = spec.interpretResponse({ body: response }, {bidderRequest});
      expect(result.length).to.equal(0);
    });
  });

  describe('getUserSyncs', function () {
    const bidResponse1 = {
      body: {
        'is_ad_return': true,
        'ad': { /* ad body */ },
        'syncs': [
          'https://example.test/1'
        ]
      }
    };

    const bidResponse2 = {
      body: {
        'is_ad_return': true,
        'ad': { /* ad body */ },
        'syncs': [
          'https://example.test/2'
        ]
      }
    };

    it('should use a sync url from first response', function () {
      const syncs = spec.getUserSyncs({ pixelEnabled: true }, [bidResponse1, bidResponse2]);
      expect(syncs).to.deep.equal([
        {
          type: 'image',
          url: 'https://example.test/1'
        }
      ]);
    });

    it('handle empty response (e.g. timeout)', function () {
      const syncs = spec.getUserSyncs({ pixelEnabled: true }, []);
      expect(syncs).to.deep.equal([]);
    });

    it('returns empty syncs when not enabled', function () {
      const syncs = spec.getUserSyncs({ pixelEnabled: false }, [bidResponse1]);
      expect(syncs).to.deep.equal([]);
    });
  });
});
