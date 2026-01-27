import { expect } from 'chai';
import { bidToTag, remapBidRequest, prepareBidRequests, createBid, parseResponseBody, getResponseSyncs, getUserSyncsFn, spec } from 'modules/bidmaticBidAdapter.js';
import { config } from 'src/config.js';
import { newBidder } from 'src/adapters/bidderFactory.js';
import { deepClone } from 'src/utils.js';
import { BANNER, VIDEO } from 'src/mediaTypes.js';

describe('bidmaticBidAdapter', function () {
  const adapter = newBidder(spec);
  const URL = 'https://adapter.bidmatic.io/bdm/auction';

  const DEFAULT_BID_REQUEST = {
    'bidder': 'bidmatic',
    'params': {
      'source': 123456
    },
    'mediaTypes': {
      'banner': {
        'sizes': [[300, 250], [300, 600]]
      }
    },
    'adUnitCode': 'test-div',
    'bidId': 'bid123456',
    'bidderRequestId': 'req123456',
    'auctionId': 'auct123456',
    'schain': { ver: '1.0' },
    'userId': { id1: 'value1' },
  };

  const VIDEO_BID_REQUEST = {
    'bidder': 'bidmatic',
    'params': {
      'source': 123456
    },
    'mediaTypes': {
      'video': {
        'playerSize': [[640, 480]]
      }
    },
    'adUnitCode': 'test-div-video',
    'bidId': 'bid123456-video',
    'bidderRequestId': 'req123456',
    'auctionId': 'auct123456',
  };

  const BID_RESPONSE = {
    'bids': [{
      'requestId': 'bid123456',
      'cmpId': 'creative123',
      'height': 250,
      'width': 300,
      'cpm': 0.5,
      'ad': '<div>test ad</div>',
      'cur': 'USD',
      'adomain': ['advertiser.com']
    }],
    'cookieURLs': ['https://sync.bidmatic.com/sync1', 'https://sync.bidmatic.com/sync2'],
    'cookieURLSTypes': ['iframe', 'image']
  };

  const VIDEO_BID_RESPONSE = {
    'bids': [{
      'requestId': 'bid123456-video',
      'cmpId': 'creative123',
      'height': 480,
      'width': 640,
      'cpm': 0.5,
      'vastUrl': 'https://vast.bidmatic.com/vast.xml',
      'cur': 'USD',
      'adomain': ['advertiser.com']
    }],
    'cookieURLs': ['https://sync.bidmatic.com/sync1']
  };

  const BID_REQUEST_PARAMS = {
    'bidderCode': 'bidmatic',
    'bidderRequestId': 'req123456',
    'auctionId': 'auct123456',
    'timeout': 1000,
    'refererInfo': {
      'page': 'https://example.com'
    },
    'bids': [DEFAULT_BID_REQUEST]
  };

  const CONSENTS_PARAMS = {
    'gdprConsent': {
      'gdprApplies': true,
      'consentString': 'CONSENT_STRING',
    },
    'gppConsent': {
      'gppString': 'GPP_STRING',
      'applicableSections': [1, 2, 3]
    },
    'uspConsent': 'USP_STRING',
    'ortb2': {
      'regs': {
        'coppa': 1,
        'gpp': 'GPP_FROM_ORTB2',
        'gpp_sid': [1, 2, 3],
        'ext': {
          'age_verification': { 'id': 'age123' }
        }
      }
    }
  };

  const BID_REQUEST_WITH_CONSENT = {
    ...BID_REQUEST_PARAMS,
    ...CONSENTS_PARAMS
  };

  describe('inherited functions', function () {
    it('exists and is a function', function () {
      expect(adapter.callBids).to.exist.and.to.be.a('function');
    });
  });

  describe('isBidRequestValid', function () {
    it('should return true when required params found', function () {
      expect(spec.isBidRequestValid(DEFAULT_BID_REQUEST)).to.equal(true);
    });

    it('should return false when source is not a number', function () {
      const bid = deepClone(DEFAULT_BID_REQUEST);
      bid.params.source = '123456';
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return false when params are missing', function () {
      const bid = deepClone(DEFAULT_BID_REQUEST);
      delete bid.params;
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });
  });

  describe('prepareBidRequests', function () {
    it('should prepare banner bid request correctly', function () {
      const result = prepareBidRequests(DEFAULT_BID_REQUEST);

      expect(result).includes({
        'CallbackId': 'bid123456',
        'Aid': 123456,
        'AdType': 'display',
        'PlacementId': 'test-div',
        'Sizes': '300x250,300x600',
      });
    });

    it('should prepare video bid request correctly', function () {
      const result = prepareBidRequests(VIDEO_BID_REQUEST);

      expect(result).includes({
        'CallbackId': 'bid123456-video',
        'Aid': 123456,
        'AdType': 'video',
        'PlacementId': 'test-div-video',
        'Sizes': '640x480',
      });
    });
  });

  describe('remapBidRequest', function () {
    it('should remap bid request with basic params', function () {
      const result = remapBidRequest([DEFAULT_BID_REQUEST], BID_REQUEST_PARAMS);

      expect(result).includes({
        'Domain': 'https://example.com',
        'Tmax': 1000,
        'Coppa': 0
      });
      expect(result.Schain).to.deep.equal({ ver: '1.0' });
      expect(result.UserIds).to.deep.equal({ id1: 'value1' });
    });

    it('should remap bid request with consent params', function () {
      const result = remapBidRequest([DEFAULT_BID_REQUEST], BID_REQUEST_WITH_CONSENT);

      expect(result).to.include({
        'Domain': 'https://example.com',
        'USP': 'USP_STRING',
        'GPP': 'GPP_STRING',
        'GPPSid': '1,2,3',
        'GDPRConsent': 'CONSENT_STRING',
        'GDPR': 1,
        'Coppa': 1
      });
      expect(result.AgeVerification).to.deep.equal({ id: 'age123' });
    });
  });

  describe('bidToTag', function () {
    it('should convert bid requests to tag format', function () {
      const { tag, bids } = bidToTag([DEFAULT_BID_REQUEST], BID_REQUEST_PARAMS);

      expect(tag).to.be.an('object');
      expect(bids).to.be.an('array');
      expect(bids.length).to.equal(1);
      expect(bids[0]).includes({
        'CallbackId': 'bid123456',
        'Aid': 123456,
        'AdType': 'display',
        'PlacementId': 'test-div',
        'Sizes': '300x250,300x600',
      });
    });
  });

  describe('buildRequests', function () {
    it('should build banner request correctly', function () {
      const requests = spec.buildRequests([DEFAULT_BID_REQUEST], BID_REQUEST_PARAMS);

      expect(requests).to.be.an('array');
      expect(requests.length).to.equal(1);
      expect(requests[0].url).to.equal(URL);
      expect(requests[0].method).to.equal('POST');
      expect(requests[0].data).to.have.property('BidRequests');
      expect(requests[0].data.BidRequests.length).to.equal(1);
    });

    it('should chunk bid requests according to adapter settings', function () {
      const sandbox = sinon.createSandbox();
      sandbox.stub(config, 'getConfig').returns({ chunkSize: 2 });

      const requests = spec.buildRequests([
        DEFAULT_BID_REQUEST,
        deepClone(DEFAULT_BID_REQUEST),
        deepClone(DEFAULT_BID_REQUEST)
      ], BID_REQUEST_PARAMS);

      expect(requests.length).to.equal(2);
      expect(requests[0].data.BidRequests.length).to.equal(2);
      expect(requests[1].data.BidRequests.length).to.equal(1);

      sandbox.restore();
    });
  });

  describe('createBid', function () {
    it('should create banner bid correctly', function () {
      const bid = createBid(BID_RESPONSE.bids[0], { mediaTypes: { banner: {} } });

      expect(bid).to.deep.include({
        requestId: 'bid123456',
        creativeId: 'creative123',
        height: 250,
        width: 300,
        cpm: 0.5,
        currency: 'USD',
        netRevenue: true,
        mediaType: BANNER,
        ttl: 300,
        ad: '<div>test ad</div>'
      });

      expect(bid.meta.advertiserDomains).to.deep.equal(['advertiser.com']);
    });

    it('should create video bid correctly', function () {
      const bid = createBid(VIDEO_BID_RESPONSE.bids[0], { mediaTypes: { video: {} } });

      expect(bid).to.deep.include({
        requestId: 'bid123456-video',
        creativeId: 'creative123',
        height: 480,
        width: 640,
        cpm: 0.5,
        currency: 'USD',
        netRevenue: true,
        mediaType: VIDEO,
        ttl: 300,
        vastUrl: 'https://vast.bidmatic.com/vast.xml'
      });
    });
  });

  describe('parseResponseBody', function () {
    it('should parse valid response', function () {
      const result = parseResponseBody(BID_RESPONSE, { bids: [DEFAULT_BID_REQUEST] });

      expect(result).to.be.an('array');
      expect(result.length).to.equal(1);
      expect(result[0]).to.have.property('requestId', 'bid123456');
    });

    it('should return empty array for invalid response', function () {
      const result = parseResponseBody({}, { bids: [DEFAULT_BID_REQUEST] });
      expect(result).to.be.an('array');
      expect(result.length).to.equal(0);
    });

    it('should return empty array when bid request does not match', function () {
      const result = parseResponseBody({
        bids: [{ requestId: 'non-matching-id' }]
      }, { bids: [DEFAULT_BID_REQUEST] });

      expect(result).to.be.an('array');
      expect(result.length).to.equal(0);
    });
  });

  describe('getResponseSyncs', function () {
    it('should return image syncs when pixels enabled', function () {
      const syncOptions = { pixelEnabled: true };
      const bid = {
        cookieURLSTypes: ['image'],
        cookieURLs: ['https://sync.bidmatic.com/pixel']
      };

      const result = getResponseSyncs(syncOptions, bid);

      expect(result).to.be.an('array');
      expect(result.length).to.equal(1);
      expect(result[0].type).to.equal('image');
      expect(result[0].url).to.equal('https://sync.bidmatic.com/pixel');
    });

    it('should return iframe syncs when iframes enabled', function () {
      const syncOptions = { iframeEnabled: true };
      const bid = {
        cookieURLSTypes: ['iframe'],
        cookieURLs: ['https://sync.bidmatic.com/iframe']
      };

      const result = getResponseSyncs(syncOptions, bid);

      expect(result).to.be.an('array');
      expect(result.length).to.equal(1);
      expect(result[0].type).to.equal('iframe');
      expect(result[0].url).to.equal('https://sync.bidmatic.com/iframe');
    });

    it('should not return syncs when already done', function () {
      const syncOptions = { iframeEnabled: true };
      const bid = {
        cookieURLSTypes: ['iframe'],
        cookieURLs: ['https://sync.bidmatic.com/sync-done']
      };

      let result = getResponseSyncs(syncOptions, bid);
      expect(result.length).to.equal(1);

      result = getResponseSyncs(syncOptions, bid);
      expect(result.length).to.equal(0);
    });

    it('should use default type image when type not specified', function () {
      const syncOptions = { pixelEnabled: true };
      const bid = {
        cookieURLs: ['https://sync.bidmatic.com/new-pixel']
      };

      const result = getResponseSyncs(syncOptions, bid);

      expect(result.length).to.equal(1);
      expect(result[0].type).to.equal('image');
    });
  });

  describe('getUserSyncsFn', function () {
    it('should return empty array when no syncs enabled', function () {
      const result = getUserSyncsFn({}, []);
      expect(result).to.be.undefined;
    });

    it('should return empty array for invalid responses', function () {
      const result = getUserSyncsFn({ pixelEnabled: true }, [{ body: null }]);
      expect(result).to.be.an('array');
      expect(result.length).to.equal(0);
    });

    it('should collect syncs from multiple responses', function () {
      const syncOptions = { pixelEnabled: true, iframeEnabled: true };
      const serverResponses = [
        { body: { cookieURLs: ['https://sync1.bidmatic.com/pixel'] } },
        { body: [
            { cookieURLs: ['https://sync2.bidmatic.com/iframe'], cookieURLSTypes: ['iframe'] }
          ]}
      ];

      const result = getUserSyncsFn(syncOptions, serverResponses);

      expect(result).to.be.an('array');
      expect(result.length).to.equal(2);
    });
  });

  describe('interpretResponse', function () {
    it('should interpret banner response correctly', function () {
      const result = spec.interpretResponse({ body: BID_RESPONSE }, { adapterRequest: { bids: [DEFAULT_BID_REQUEST] } });

      expect(result).to.be.an('array');
      expect(result.length).to.equal(1);
      expect(result[0].requestId).to.equal('bid123456');
      expect(result[0].mediaType).to.equal(BANNER);
    });

    it('should interpret video response correctly', function () {
      const result = spec.interpretResponse({ body: VIDEO_BID_RESPONSE }, { adapterRequest: { bids: [VIDEO_BID_REQUEST] } });

      expect(result).to.be.an('array');
      expect(result.length).to.equal(1);
      expect(result[0].requestId).to.equal('bid123456-video');
      expect(result[0].mediaType).to.equal(VIDEO);
    });

    it('should handle array of responses', function () {
      const result = spec.interpretResponse({ body: [BID_RESPONSE] }, { adapterRequest: { bids: [DEFAULT_BID_REQUEST] } });

      expect(result).to.be.an('array');
      expect(result.length).to.equal(1);
    });

    it('should return empty array for empty response', function () {
      const result = spec.interpretResponse({ body: { bids: [] } }, { adapterRequest: { bids: [DEFAULT_BID_REQUEST] } });
      expect(result).to.be.an('array');
      expect(result.length).to.equal(0);
    });
  });
});
