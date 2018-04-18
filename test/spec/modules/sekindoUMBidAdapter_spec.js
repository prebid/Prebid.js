import { expect } from 'chai';
import { spec } from 'modules/sekindoUMBidAdapter';
import { newBidder } from 'src/adapters/bidderFactory';

describe('sekindoUMAdapter', () => {
  const adapter = newBidder(spec);

  const bannerParams = {
    'spaceId': '14071'
  };

  const videoParams = {
    'spaceId': '14071',
    'video': {
      playerWidth: 300,
      playerHeight: 250,
      vid_vastType: 2 // optional
    }
  };

  var bidRequests = {
    'bidder': 'sekindoUM',
    'params': bannerParams,
    'adUnitCode': 'adunit-code',
    'sizes': [[300, 250], [300, 600]],
    'bidId': '30b31c1838de1e',
    'bidderRequestId': '22edbae2733bf6',
    'auctionId': '1d1a030790a475',
    'mediaType': 'banner'
  };

  describe('inherited functions', () => {
    it('exists and is a function', () => {
      expect(adapter.callBids).to.exist.and.to.be.a('function');
    });
  });

  describe('isBidRequestValid', () => {
    it('should return true when required params found', () => {
      bidRequests.mediaType = 'banner';
      bidRequests.params = bannerParams;
      expect(spec.isBidRequestValid(bidRequests)).to.equal(true);
    });

    it('should return false when required video params are missing', () => {
      bidRequests.mediaType = 'video';
      bidRequests.params = bannerParams;
      expect(spec.isBidRequestValid(bidRequests)).to.equal(false);
    });

    it('should return true when required Video params found', () => {
      bidRequests.mediaType = 'video';
      bidRequests.params = videoParams;
      expect(spec.isBidRequestValid(bidRequests)).to.equal(true);
    });
  });

  describe('buildRequests', () => {
    it('banner data should be a query string and method = GET', () => {
      bidRequests.mediaType = 'banner';
      bidRequests.params = bannerParams;
      const request = spec.buildRequests([bidRequests]);
      expect(request[0].data).to.be.a('string');
      expect(request[0].method).to.equal('GET');
    });

    it('video data should be a query string and method = GET', () => {
      bidRequests.mediaType = 'video';
      bidRequests.params = videoParams;
      const request = spec.buildRequests([bidRequests]);
      expect(request[0].data).to.be.a('string');
      expect(request[0].method).to.equal('GET');
    });
  });

  describe('interpretResponse', () => {
    it('banner should get correct bid response', () => {
      let response = {
        'headers': function(header) {
          return 'dummy header';
        },
        'body': {'id': '30b31c1838de1e', 'bidderCode': 'sekindoUM', 'cpm': 2.1951, 'width': 300, 'height': 250, 'ad': '<h1>sekindo creative<\/h1>', 'ttl': 36000, 'creativeId': '323774', 'netRevenue': true, 'currency': 'USD'}
      };

      bidRequests.mediaType = 'banner';
      bidRequests.params = bannerParams;
      let expectedResponse = [
        {
          'requestId': '30b31c1838de1e',
          'bidderCode': 'sekindoUM',
          'cpm': 2.1951,
          'width': 300,
          'height': 250,
          'creativeId': '323774',
          'currency': 'USD',
          'netRevenue': true,
          'ttl': 36000,
          'ad': '<h1>sekindo creative</h1>'
        }
      ];
      let result = spec.interpretResponse(response, bidRequests);
      expect(Object.keys(result[0])).to.deep.equal(Object.keys(expectedResponse[0]));
    });

    it('vastXml video should get correct bid response', () => {
      let response = {
        'headers': function(header) {
          return 'dummy header';
        },
        'body': {'id': '30b31c1838de1e', 'bidderCode': 'sekindoUM', 'cpm': 2.1951, 'width': 300, 'height': 250, 'vastXml': '<vast/>', 'ttl': 36000, 'creativeId': '323774', 'netRevenue': true, 'currency': 'USD'}
      };

      bidRequests.mediaType = 'video';
      bidRequests.params = videoParams;
      let expectedResponse = [
        {
          'requestId': '30b31c1838de1e',
          'bidderCode': 'sekindoUM',
          'cpm': 2.1951,
          'width': 300,
          'height': 250,
          'creativeId': '323774',
          'currency': 'USD',
          'netRevenue': true,
          'ttl': 36000,
          'vastXml': '<vast/>'
        }
      ];
      let result = spec.interpretResponse(response, bidRequests);
      expect(Object.keys(result[0])).to.deep.equal(Object.keys(expectedResponse[0]));
    });

    it('vastUrl video should get correct bid response', () => {
      let response = {
        'headers': function(header) {
          return 'dummy header';
        },
        'body': {'id': '30b31c1838de1e', 'bidderCode': 'sekindoUM', 'cpm': 2.1951, 'width': 300, 'height': 250, 'vastUrl': '//vastUrl', 'ttl': 36000, 'creativeId': '323774', 'netRevenue': true, 'currency': 'USD'}
      };
      bidRequests.mediaType = 'video';
      bidRequests.params = videoParams;
      let expectedResponse = [
        {
          'requestId': '30b31c1838de1e',
          'bidderCode': 'sekindoUM',
          'cpm': 2.1951,
          'width': 300,
          'height': 250,
          'creativeId': '323774',
          'currency': 'USD',
          'netRevenue': true,
          'ttl': 36000,
          'vastUrl': '//vastUrl'
        }
      ];
      let result = spec.interpretResponse(response, bidRequests);
      expect(Object.keys(result[0])).to.deep.equal(Object.keys(expectedResponse[0]));
    });
  });
});
