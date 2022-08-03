import { expect } from 'chai';
import { spec } from 'modules/kueezBidAdapter.js';
import { newBidder } from 'src/adapters/bidderFactory.js';
import { config } from 'src/config.js';
import { BANNER, VIDEO } from '../../../src/mediaTypes.js';
import * as utils from 'src/utils.js';

const ENDPOINT = 'https://hb.kueezssp.com/hb-kz-multi';
const TEST_ENDPOINT = 'https://hb.kueezssp.com/hb-multi-kz-test';
const TTL = 360;
/* eslint no-console: ["error", { allow: ["log", "warn", "error"] }] */

describe('kueezBidAdapter', function () {
  const adapter = newBidder(spec);

  describe('inherited functions', function () {
    it('exists and is a function', function () {
      expect(adapter.callBids).to.exist.and.to.be.a('function');
    });
  });

  describe('isBidRequestValid', function () {
    const bid = {
      'bidder': spec.code,
      'adUnitCode': 'adunit-code',
      'sizes': [['640', '480']],
      'params': {
        'org': 'test-publisher-id'
      }
    };

    it('should return true when required params are passed', function () {
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should return false when required params are not found', function () {
      const newBid = Object.assign({}, bid);
      delete newBid.params;
      newBid.params = {
        'org': null
      };
      expect(spec.isBidRequestValid(newBid)).to.equal(false);
    });
  });

  describe('buildRequests', function () {
    const bidRequests = [
      {
        'bidder': spec.code,
        'adUnitCode': 'adunit-code',
        'sizes': [[640, 480]],
        'params': {
          'org': 'test-publisher-id'
        },
        'bidId': '5wfg9887sd5478',
        'loop': 1,
        'bidderRequestId': 'op87952ewq8567',
        'auctionId': '87se98rt-5789-8735-2546-t98yh5678231',
        'mediaTypes': {
          'video': {
            'playerSize': [[640, 480]],
            'context': 'instream'
          }
        },
        'vastXml': '"<VAST version=\\\"2.0\\\">...</VAST>"'
      },
      {
        'bidder': spec.code,
        'adUnitCode': 'adunit-code',
        'sizes': [[300, 250]],
        'params': {
          'org': 'test-publisher-id'
        },
        'bidId': '5wfg9887sd5478',
        'loop': 1,
        'bidderRequestId': 'op87952ewq8567',
        'auctionId': '87se98rt-5789-8735-2546-t98yh5678231',
        'mediaTypes': {
          'banner': {
          }
        },
        'ad': '"<img src=\"https://...\"/>"'
      }
    ];

    const testModeBidRequests = [
      {
        'bidder': spec.code,
        'adUnitCode': 'adunit-code',
        'sizes': [[640, 480]],
        'params': {
          'org': 'test-publisher-id',
          'testMode': true
        },
        'bidId': '5wfg9887sd5478',
        'loop': 2,
        'bidderRequestId': 'op87952ewq8567',
        'auctionId': '87se98rt-5789-8735-2546-t98yh5678231',
      }
    ];

    const bidderRequest = {
      bidderCode: 'kueez',
    }
    const placementId = '12345678';

    it('sends the placementId to ENDPOINT via POST', function () {
      bidRequests[0].params.placementId = placementId;
      const request = spec.buildRequests(bidRequests, bidderRequest);
      expect(request.data.bids[0].placementId).to.equal(placementId);
    });

    it('sends bid request to ENDPOINT via POST', function () {
      const request = spec.buildRequests(bidRequests, bidderRequest);
      expect(request.url).to.equal(ENDPOINT);
      expect(request.method).to.equal('POST');
    });

    it('sends bid request to TEST ENDPOINT via POST', function () {
      const request = spec.buildRequests(testModeBidRequests, bidderRequest);
      expect(request.url).to.equal(TEST_ENDPOINT);
      expect(request.method).to.equal('POST');
    });

    it('should send the correct bid Id', function () {
      const request = spec.buildRequests(bidRequests, bidderRequest);
      expect(request.data.bids[0].bidId).to.equal('5wfg9887sd5478');
    });

    it('should send the correct sizes array', function () {
      const request = spec.buildRequests(bidRequests, bidderRequest);
      expect(request.data.bids[0].sizes).to.be.an('array');
      expect(request.data.bids[0].sizes).to.equal(bidRequests[0].sizes)
      expect(request.data.bids[1].sizes).to.be.an('array');
      expect(request.data.bids[1].sizes).to.equal(bidRequests[1].sizes)
    });

    it('should send the correct media type', function () {
      const request = spec.buildRequests(bidRequests, bidderRequest);
      expect(request.data.bids[0].mediaType).to.equal(VIDEO)
      expect(request.data.bids[1].mediaType).to.equal(BANNER)
    });

    it('should respect syncEnabled option', function() {
      config.setConfig({
        userSync: {
          syncEnabled: false,
          filterSettings: {
            all: {
              bidders: '*',
              filter: 'include'
            }
          }
        }
      });
      const request = spec.buildRequests(bidRequests, bidderRequest);
      expect(request.data.params).to.be.an('object');
      expect(request.data.params).to.not.have.property('cs_method');
    });

    it('should respect "iframe" filter settings', function () {
      config.setConfig({
        userSync: {
          syncEnabled: true,
          filterSettings: {
            iframe: {
              bidders: [spec.code],
              filter: 'include'
            }
          }
        }
      });
      const request = spec.buildRequests(bidRequests, bidderRequest);
      expect(request.data.params).to.be.an('object');
      expect(request.data.params).to.have.property('cs_method', 'iframe');
    });

    it('should respect "all" filter settings', function () {
      config.setConfig({
        userSync: {
          syncEnabled: true,
          filterSettings: {
            all: {
              bidders: [spec.code],
              filter: 'include'
            }
          }
        }
      });
      const request = spec.buildRequests(bidRequests, bidderRequest);
      expect(request.data.params).to.be.an('object');
      expect(request.data.params).to.have.property('cs_method', 'iframe');
    });

    it('should send the pixel user sync param if userSync is enabled and no "iframe" or "all" configs are present', function () {
      config.resetConfig();
      config.setConfig({
        userSync: {
          syncEnabled: true,
        }
      });
      const request = spec.buildRequests(bidRequests, bidderRequest);
      expect(request.data.params).to.be.an('object');
      expect(request.data.params).to.have.property('cs_method', 'pixel');
    });

    it('should respect total exclusion', function() {
      config.setConfig({
        userSync: {
          syncEnabled: true,
          filterSettings: {
            image: {
              bidders: [spec.code],
              filter: 'exclude'
            },
            iframe: {
              bidders: [spec.code],
              filter: 'exclude'
            }
          }
        }
      });
      const request = spec.buildRequests(bidRequests, bidderRequest);
      expect(request.data.params).to.be.an('object');
      expect(request.data.params).to.not.have.property('cs_method');
    });

    it('should have us_privacy param if usPrivacy is available in the bidRequest', function () {
      const bidderRequestWithUSP = Object.assign({uspConsent: '1YNN'}, bidderRequest);
      const request = spec.buildRequests(bidRequests, bidderRequestWithUSP);
      expect(request.data.params).to.be.an('object');
      expect(request.data.params).to.have.property('us_privacy', '1YNN');
    });

    it('should have an empty us_privacy param if usPrivacy is missing in the bidRequest', function () {
      const request = spec.buildRequests(bidRequests, bidderRequest);
      expect(request.data.params).to.be.an('object');
      expect(request.data.params).to.not.have.property('us_privacy');
    });

    it('should not send the gdpr param if gdprApplies is false in the bidRequest', function () {
      const bidderRequestWithGDPR = Object.assign({gdprConsent: {gdprApplies: false}}, bidderRequest);
      const request = spec.buildRequests(bidRequests, bidderRequestWithGDPR);
      expect(request.data.params).to.be.an('object');
      expect(request.data.params).to.not.have.property('gdpr');
      expect(request.data.params).to.not.have.property('gdpr_consent');
    });

    it('should send the gdpr param if gdprApplies is true in the bidRequest', function () {
      const bidderRequestWithGDPR = Object.assign({gdprConsent: {gdprApplies: true, consentString: 'test-consent-string'}}, bidderRequest);
      const request = spec.buildRequests(bidRequests, bidderRequestWithGDPR);
      expect(request.data.params).to.be.an('object');
      expect(request.data.params).to.have.property('gdpr', true);
      expect(request.data.params).to.have.property('gdpr_consent', 'test-consent-string');
    });

    it('should have schain param if it is available in the bidRequest', () => {
      const schain = {
        ver: '1.0',
        complete: 1,
        nodes: [{ asi: 'indirectseller.com', sid: '00001', hp: 1 }],
      };
      bidRequests[0].schain = schain;
      const request = spec.buildRequests(bidRequests, bidderRequest);
      expect(request.data.params).to.be.an('object');
      expect(request.data.params).to.have.property('schain', '1.0,1!indirectseller.com,00001,1,,,');
    });

    it('should set flooPrice to getFloor.floor value if it is greater than params.floorPrice', function() {
      const bid = utils.deepClone(bidRequests[0]);
      bid.getFloor = () => {
        return {
          currency: 'USD',
          floor: 3.32
        }
      }
      bid.params.floorPrice = 0.64;
      const request = spec.buildRequests([bid], bidderRequest);
      expect(request.data.bids[0]).to.be.an('object');
      expect(request.data.bids[0]).to.have.property('floorPrice', 3.32);
    });

    it('should set floorPrice to params.floorPrice value if it is greater than getFloor.floor', function() {
      const bid = utils.deepClone(bidRequests[0]);
      bid.getFloor = () => {
        return {
          currency: 'USD',
          floor: 0.8
        }
      }
      bid.params.floorPrice = 1.5;
      const request = spec.buildRequests([bid], bidderRequest);
      expect(request.data.bids[0]).to.be.an('object');
      expect(request.data.bids[0]).to.have.property('floorPrice', 1.5);
    });
  });

  describe('interpretResponse', function () {
    const response = {
      params: {
        currency: 'USD',
        netRevenue: true,
      },
      bids: [{
        cpm: 12.5,
        vastXml: '<VAST version="3.0"></VAST>',
        width: 640,
        height: 480,
        requestId: '21e12606d47ba7',
        adomain: ['abc.com'],
        mediaType: VIDEO
      },
      {
        cpm: 12.5,
        ad: '"<img src=\"https://...\"/>"',
        width: 300,
        height: 250,
        requestId: '21e12606d47ba7',
        adomain: ['abc.com'],
        mediaType: BANNER
      }]
    };

    const expectedVideoResponse = {
      cpm: 12.5,
      creativeId: '21e12606d47ba7',
      currency: 'USD',
      height: 480,
      mediaType: VIDEO,
      meta: {
        mediaType: VIDEO,
        advertiserDomains: ['abc.com']
      },
      netRevenue: true,
      nurl: 'http://example.com/win/1234',
      requestId: '21e12606d47ba7',
      ttl: TTL,
      width: 640,
      vastXml: '<VAST version="3.0"></VAST>'
    };

    const expectedBannerResponse = {
      cpm: 12.5,
      creativeId: '21e12606d47ba7',
      currency: 'USD',
      height: 480,
      mediaType: BANNER,
      meta: {
        mediaType: BANNER,
        advertiserDomains: ['abc.com']
      },
      netRevenue: true,
      nurl: 'http://example.com/win/1234',
      requestId: '21e12606d47ba7',
      ttl: TTL,
      width: 640,
      ad: '"<img src=\"https://...\"/>"'
    };

    it('should get correct bid response', function () {
      const result = spec.interpretResponse({ body: response });
      expect(Object.keys(result[0])).to.deep.equal(Object.keys(expectedVideoResponse));
      expect(Object.keys(result[1])).to.deep.equal(Object.keys(expectedBannerResponse));
    });

    it('video type should have vastXml key', function () {
      const result = spec.interpretResponse({ body: response });
      expect(result[0].vastXml).to.equal(expectedVideoResponse.vastXml)
    });

    it('banner type should have ad key', function () {
      const result = spec.interpretResponse({ body: response });
      expect(result[1].ad).to.equal(expectedBannerResponse.ad)
    });
  })

  describe('getUserSyncs', function() {
    const imageSyncResponse = {
      body: {
        params: {
          userSyncPixels: [
            'https://image-sync-url.test/1',
            'https://image-sync-url.test/2',
            'https://image-sync-url.test/3'
          ]
        }
      }
    };

    const iframeSyncResponse = {
      body: {
        params: {
          userSyncURL: 'https://iframe-sync-url.test'
        }
      }
    };

    it('should register all img urls from the response', function() {
      const syncs = spec.getUserSyncs({ pixelEnabled: true }, [imageSyncResponse]);
      expect(syncs).to.deep.equal([
        {
          type: 'image',
          url: 'https://image-sync-url.test/1'
        },
        {
          type: 'image',
          url: 'https://image-sync-url.test/2'
        },
        {
          type: 'image',
          url: 'https://image-sync-url.test/3'
        }
      ]);
    });

    it('should register the iframe url from the response', function() {
      const syncs = spec.getUserSyncs({ iframeEnabled: true }, [iframeSyncResponse]);
      expect(syncs).to.deep.equal([
        {
          type: 'iframe',
          url: 'https://iframe-sync-url.test'
        }
      ]);
    });

    it('should register both image and iframe urls from the responses', function() {
      const syncs = spec.getUserSyncs({ pixelEnabled: true, iframeEnabled: true }, [iframeSyncResponse, imageSyncResponse]);
      expect(syncs).to.deep.equal([
        {
          type: 'iframe',
          url: 'https://iframe-sync-url.test'
        },
        {
          type: 'image',
          url: 'https://image-sync-url.test/1'
        },
        {
          type: 'image',
          url: 'https://image-sync-url.test/2'
        },
        {
          type: 'image',
          url: 'https://image-sync-url.test/3'
        }
      ]);
    });

    it('should handle an empty response', function() {
      const syncs = spec.getUserSyncs({ iframeEnabled: true }, []);
      expect(syncs).to.deep.equal([]);
    });

    it('should handle when user syncs are disabled', function() {
      const syncs = spec.getUserSyncs({ pixelEnabled: false }, [imageSyncResponse]);
      expect(syncs).to.deep.equal([]);
    });
  })

  describe('onBidWon', function() {
    beforeEach(function() {
      sinon.stub(utils, 'triggerPixel');
    });
    afterEach(function() {
      utils.triggerPixel.restore();
    });

    it('Should trigger pixel if bid nurl', function() {
      const bid = {
        'bidder': spec.code,
        'adUnitCode': 'adunit-code',
        'sizes': [['640', '480']],
        'nurl': 'http://example.com/win/1234',
        'params': {
          'org': 'test-publisher-id'
        }
      };

      spec.onBidWon(bid);
      expect(utils.triggerPixel.callCount).to.equal(1)
    })
  })
});
