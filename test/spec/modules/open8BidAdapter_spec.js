import { spec } from 'modules/open8BidAdapter.js';
import { newBidder } from 'src/adapters/bidderFactory.js';

const ENDPOINT = 'https://as.vt.open8.com/v1/control/prebid';

describe('Open8Adapter', function() {
  const adapter = newBidder(spec);

  describe('isBidRequestValid', function() {
    let bid = {
      'bidder': 'open8',
      'params': {
        'slotKey': 'slotkey1234'
      },
      'adUnitCode': 'adunit',
      'sizes': [[300, 250]],
      'bidId': 'bidid1234',
      'bidderRequestId': 'requestid1234',
      'auctionId': 'auctionid1234',
    };

    it('should return true when required params found', function() {
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should return false when required params are not passed', function() {
      bid.params = {
        ' slotKey': 0
      };
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });
  });

  describe('buildRequests', function() {
    let bidRequests = [
      {
        'bidder': 'open8',
        'params': {
          'slotKey': 'slotkey1234'
        },
        'adUnitCode': 'adunit',
        'sizes': [[300, 250]],
        'bidId': 'bidid1234',
        'bidderRequestId': 'requestid1234',
        'auctionId': 'auctionid1234',
      }
    ];

    it('sends bid request to ENDPOINT via GET', function() {
      const requests = spec.buildRequests(bidRequests);
      expect(requests[0].url).to.equal(ENDPOINT);
      expect(requests[0].method).to.equal('GET');
    });
  });
  describe('interpretResponse', function() {
    const bannerResponse = {
      slotKey: 'slotkey1234',
      userId: 'userid1234',
      impId: 'impid1234',
      media: 'TEST_MEDIA',
      nurl: 'https://example/win',
      isAdReturn: true,
      syncPixels: ['https://example/sync/pixel.gif'],
      syncIFs: [],
      ad: {
        bidId: 'TEST_BID_ID',
        price: 1234.56,
        creativeId: 'creativeid1234',
        dealId: 'TEST_DEAL_ID',
        currency: 'JPY',
        ds: 876,
        spd: 1234,
        fa: 5678,
        pr: 'pr1234',
        mr: 'mr1234',
        nurl: 'https://example/win',
        adType: 2,
        banner: {
          w: 300,
          h: 250,
          adm: '<div></div>',
          imps: ['https://example.com/imp']
        }
      }
    };
    const videoResponse = {
      slotKey: 'slotkey1234',
      userId: 'userid1234',
      impId: 'impid1234',
      media: 'TEST_MEDIA',
      isAdReturn: true,
      syncPixels: ['https://example/sync/pixel.gif'],
      syncIFs: [],
      ad: {
        bidId: 'TEST_BID_ID',
        price: 1234.56,
        creativeId: 'creativeid1234',
        dealId: 'TEST_DEAL_ID',
        currency: 'JPY',
        ds: 876,
        spd: 1234,
        fa: 5678,
        pr: 'pr1234',
        mr: 'mr1234',
        nurl: 'https://example/win',
        adType: 1,
        video: {
          purl: 'https://playerexample.js',
          vastXml: '<VAST></VAST>',
          w: 320,
          h: 180
        },
      }
    };

    it('should get correct banner bid response', function() {
      let expectedResponse = [{
        'slotKey': 'slotkey1234',
        'userId': 'userid1234',
        'impId': 'impid1234',
        'media': 'TEST_MEDIA',
        'ds': 876,
        'spd': 1234,
        'fa': 5678,
        'pr': 'pr1234',
        'mr': 'mr1234',
        'nurl': 'https://example/win',
        'requestId': 'requestid1234',
        'cpm': 1234.56,
        'creativeId': 'creativeid1234',
        'dealId': 'TEST_DEAL_ID',
        'width': 300,
        'height': 250,
        'ad': "<div></div><img src='https://example/sync/pixel.gif' />",
        'mediaType': 'banner',
        'currency': 'JPY',
        'ttl': 360,
        'netRevenue': true
      }];

      let bidderRequest;
      let result = spec.interpretResponse({ body: bannerResponse }, { bidderRequest });
      expect(Object.keys(result[0])).to.have.members(Object.keys(expectedResponse[0]));
    });

    it('handles video responses', function() {
      let expectedResponse = [{
        'slotKey': 'slotkey1234',
        'userId': 'userid1234',
        'impId': 'impid1234',
        'media': 'TEST_MEDIA',
        'ds': 876,
        'spd': 1234,
        'fa': 5678,
        'pr': 'pr1234',
        'mr': 'mr1234',
        'nurl': 'https://example/win',
        'requestId': 'requestid1234',
        'cpm': 1234.56,
        'creativeId': 'creativeid1234',
        'dealId': 'TEST_DEAL_ID',
        'width': 320,
        'height': 180,
        'vastXml': '<VAST></VAST>',
        'mediaType': 'video',
        'renderer': {},
        'adResponse': {},
        'currency': 'JPY',
        'ttl': 360,
        'netRevenue': true
      }];

      let bidderRequest;
      let result = spec.interpretResponse({ body: videoResponse }, { bidderRequest });
      expect(Object.keys(result[0])).to.have.members(Object.keys(expectedResponse[0]));
    });

    it('handles nobid responses', function() {
      let response = {
        isAdReturn: false,
        'ad': {}
      };

      let bidderRequest;
      let result = spec.interpretResponse({ body: response }, { bidderRequest });
      expect(result.length).to.equal(0);
    });
  });

  describe('getUserSyncs', function() {
    const imgResponse1 = {
      body: {
        'isAdReturn': true,
        'ad': { /* ad body */ },
        'syncPixels': [
          'https://example.test/1'
        ]
      }
    };

    const imgResponse2 = {
      body: {
        'isAdReturn': true,
        'ad': { /* ad body */ },
        'syncPixels': [
          'https://example.test/2'
        ]
      }
    };

    const ifResponse = {
      body: {
        'isAdReturn': true,
        'ad': { /* ad body */ },
        'syncIFs': [
          'https://example.test/3'
        ]
      }
    };

    it('should use a sync img url from first response', function() {
      const syncs = spec.getUserSyncs({ pixelEnabled: true }, [imgResponse1, imgResponse2, ifResponse]);
      expect(syncs).to.deep.equal([
        {
          type: 'image',
          url: 'https://example.test/1'
        }
      ]);
    });

    it('handle ifs response', function() {
      const syncs = spec.getUserSyncs({ iframeEnabled: true }, [ifResponse]);
      expect(syncs).to.deep.equal([
        {
          type: 'iframe',
          url: 'https://example.test/3'
        }
      ]);
    });

    it('handle empty response (e.g. timeout)', function() {
      const syncs = spec.getUserSyncs({ pixelEnabled: true }, []);
      expect(syncs).to.deep.equal([]);
    });

    it('returns empty syncs when not enabled', function() {
      const syncs = spec.getUserSyncs({ pixelEnabled: false }, [imgResponse1]);
      expect(syncs).to.deep.equal([]);
    });
  });
});
