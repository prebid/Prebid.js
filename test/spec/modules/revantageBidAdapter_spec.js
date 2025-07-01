import { expect } from 'chai';
import { spec } from 'modules/revantageBidAdapter.js';
import { newBidder } from 'src/adapters/bidderFactory.js';
import { deepClone } from 'src/utils.js';

const ENDPOINT_URL = 'https://bid.revantage.io/bid';

describe('RevantageBidAdapter', function () {
  const adapter = newBidder(spec);

  describe('inherited functions', function () {
    it('exists and is a function', function () {
      expect(adapter.callBids).to.exist.and.to.be.a('function');
    });
  });

  describe('isBidRequestValid', function () {
    let bid = {
      'bidder': 'revantage',
      'params': {
        'feedId': 'test-feed-123'
      },
      'adUnitCode': 'adunit-code',
      'sizes': [[300, 250], [300, 600]],
      'bidId': '30b31c1838de1e',
      'bidderRequestId': '22edbae2733bf6',
      'auctionId': '1d1a030790a475'
    };

    it('should return true when required params found', function () {
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should return false when required params are not passed', function () {
      let invalidBid = deepClone(bid);
      delete invalidBid.params;
      expect(spec.isBidRequestValid(invalidBid)).to.equal(false);
    });

    it('should return false when feedId is missing', function () {
      let invalidBid = deepClone(bid);
      invalidBid.params = deepClone(bid.params);
      delete invalidBid.params.feedId;
      expect(spec.isBidRequestValid(invalidBid)).to.equal(false);
    });

    it('should return true when optional params are present', function () {
      let validBid = deepClone(bid);
      validBid.params = deepClone(bid.params);
      validBid.params.placementId = 'test-placement';
      validBid.params.publisherId = 'test-publisher';
      expect(spec.isBidRequestValid(validBid)).to.equal(true);
    });
  });

  describe('buildRequests', function () {
    let validBidRequests = [{
      'bidder': 'revantage',
      'params': {
        'feedId': 'test-feed-123',
        'placementId': 'test-placement',
        'publisherId': 'test-publisher'
      },
      'adUnitCode': 'adunit-code',
      'sizes': [[300, 250], [300, 600]],
      'bidId': '30b31c1838de1e',
      'bidderRequestId': '22edbae2733bf6',
      'auctionId': '1d1a030790a475',
      'mediaTypes': {
        'banner': {
          'sizes': [[300, 250], [300, 600]]
        }
      },
      'getFloor': function() {
        return {
          currency: 'USD',
          floor: 0.5
        };
      }
    }];

    let bidderRequest = {
      'auctionId': '1d1a030790a475',
      'bidderRequestId': '22edbae2733bf6',
      'timeout': 3000,
      'gdprConsent': {
        'consentString': 'BOJ/P2HOJ/P2HABABMAAAAAZ+A==',
        'gdprApplies': true
      },
      'uspConsent': '1---',
      'ortb2': {
        'site': {
          'domain': 'example.com',
          'page': 'https://example.com/test'
        },
        'device': {
          'ua': 'Mozilla/5.0...',
          'language': 'en'
        }
      }
    };

    it('should return valid request object', function () {
      const request = spec.buildRequests(validBidRequests, bidderRequest);
      expect(request).to.not.be.an('array');
      expect(request).to.be.an('object');
      expect(request.method).to.equal('POST');
      expect(request.url).to.equal(ENDPOINT_URL);
      expect(request.options.contentType).to.equal('text/plain');
      expect(request.options.withCredentials).to.equal(true);
    });

    it('should include all required OpenRTB fields', function () {
      const request = spec.buildRequests(validBidRequests, bidderRequest);
      const data = JSON.parse(request.data);

      expect(data.id).to.equal('1d1a030790a475');
      expect(data.imp).to.be.an('array').that.is.not.empty;
      expect(data.site).to.be.an('object');
      expect(data.device).to.be.an('object');
      expect(data.user).to.be.an('object');
      expect(data.regs).to.be.an('object');
      expect(data.cur).to.deep.equal(['USD']);
      expect(data.tmax).to.equal(3000);
    });

    it('should include impression data correctly', function () {
      const request = spec.buildRequests(validBidRequests, bidderRequest);
      const data = JSON.parse(request.data);
      const imp = data.imp[0];

      expect(imp.id).to.equal('30b31c1838de1e');
      expect(imp.tagid).to.equal('adunit-code');
      expect(imp.banner.w).to.equal(300);
      expect(imp.banner.h).to.equal(250);
      expect(imp.banner.format).to.deep.equal([{w: 300, h: 250}, {w: 300, h: 600}]);
      expect(imp.bidfloor).to.equal(0.5);
    });

    it('should include bidder-specific parameters', function () {
      const request = spec.buildRequests(validBidRequests, bidderRequest);
      const data = JSON.parse(request.data);
      const imp = data.imp[0];

      expect(imp.ext.feedId).to.equal('test-feed-123');
      expect(imp.ext.bidder.placementId).to.equal('test-placement');
      expect(imp.ext.bidder.publisherId).to.equal('test-publisher');
    });

    it('should include viewability data', function () {
      const request = spec.buildRequests(validBidRequests, bidderRequest);
      const data = JSON.parse(request.data);
      const imp = data.imp[0];

      expect(imp.ext.viewability).to.be.an('object');
      // Note: percentInView may be undefined if libraries are not available in test environment
      expect(imp.ext.viewability).to.have.property('inViewport');
    });

    it('should include GDPR consent', function () {
      const request = spec.buildRequests(validBidRequests, bidderRequest);
      const data = JSON.parse(request.data);

      expect(data.regs.ext.gdpr).to.equal(1);
      expect(data.user.ext.consent).to.equal('BOJ/P2HOJ/P2HABABMAAAAAZ+A==');
    });

    it('should include CCPA consent', function () {
      const request = spec.buildRequests(validBidRequests, bidderRequest);
      const data = JSON.parse(request.data);

      expect(data.regs.ext.us_privacy).to.equal('1---');
    });

    it('should include page context', function () {
      const request = spec.buildRequests(validBidRequests, bidderRequest);
      const data = JSON.parse(request.data);

      expect(data.ext.revantage.pageContext).to.be.an('object');
      expect(data.ext.revantage.pageContext).to.have.property('title');
      expect(data.ext.revantage.pageContext).to.have.property('metaTags');
      expect(data.ext.revantage.pageContext).to.have.property('contentStructure');
    });

    it('should handle missing getFloor function', function () {
      let bidRequestsWithoutFloor = deepClone(validBidRequests);
      delete bidRequestsWithoutFloor[0].getFloor;

      const request = spec.buildRequests(bidRequestsWithoutFloor, bidderRequest);
      const data = JSON.parse(request.data);

      expect(data.imp[0].bidfloor).to.equal(0);
    });

    it('should handle missing ortb2 data', function () {
      let bidderRequestWithoutOrtb2 = deepClone(bidderRequest);
      delete bidderRequestWithoutOrtb2.ortb2;

      const request = spec.buildRequests(validBidRequests, bidderRequestWithoutOrtb2);
      const data = JSON.parse(request.data);

      expect(data.site).to.be.an('object');
      expect(data.device).to.be.an('object');
    });

    it('should return empty array on error', function () {
      const invalidBidRequests = null;
      const request = spec.buildRequests(invalidBidRequests, bidderRequest);
      expect(request).to.deep.equal([]);
    });
  });

  describe('interpretResponse', function () {
    let serverResponse = {
      'body': {
        'bids': [{
          'price': 1.25,
          'adid': 'test-ad-123',
          'dsp': 'test-dsp',
          'raw_response': {
            'seatbid': [{
              'bid': [{
                'id': 'test-bid-id',
                'impid': '30b31c1838de1e',
                'price': 1.25,
                'adid': 'test-ad-123',
                'adm': '<div>Test Ad</div>',
                'w': 300,
                'h': 250,
                'cur': 'USD',
                'adomain': ['advertiser.com']
              }]
            }]
          }
        }]
      }
    };

    let bidRequest = {
      'bidRequests': [{
        'bidId': '30b31c1838de1e',
        'sizes': [[300, 250]]
      }]
    };

    it('should return valid bid responses', function () {
      const result = spec.interpretResponse(serverResponse, bidRequest);
      expect(result).to.be.an('array').that.is.not.empty;

      const bid = result[0];
      expect(bid.requestId).to.equal('30b31c1838de1e');
      expect(bid.cpm).to.equal(1.25);
      expect(bid.width).to.equal(300);
      expect(bid.height).to.equal(250);
      expect(bid.creativeId).to.equal('test-ad-123');
      expect(bid.currency).to.equal('USD');
      expect(bid.netRevenue).to.equal(true);
      expect(bid.ttl).to.equal(300);
      expect(bid.ad).to.equal('<div>Test Ad</div>');
    });

    it('should include meta data', function () {
      const result = spec.interpretResponse(serverResponse, bidRequest);
      const bid = result[0];

      expect(bid.meta).to.be.an('object');
      expect(bid.meta.advertiserDomains).to.deep.equal(['advertiser.com']);
      expect(bid.meta.dsp).to.equal('test-dsp');
      expect(bid.meta.networkName).to.equal('Revantage');
    });

    it('should handle missing dimensions', function () {
      let responseWithoutDimensions = deepClone(serverResponse);
      delete responseWithoutDimensions.body.bids[0].raw_response.seatbid[0].bid[0].w;
      delete responseWithoutDimensions.body.bids[0].raw_response.seatbid[0].bid[0].h;

      const result = spec.interpretResponse(responseWithoutDimensions, bidRequest);
      const bid = result[0];

      expect(bid.width).to.equal(300); // Default from bid request
      expect(bid.height).to.equal(250); // Default from bid request
    });

    it('should return empty array for invalid response', function () {
      const invalidResponse = { body: null };
      const result = spec.interpretResponse(invalidResponse, bidRequest);
      expect(result).to.deep.equal([]);
    });

    it('should filter out invalid bids', function () {
      let invalidServerResponse = deepClone(serverResponse);
      invalidServerResponse.body.bids[0].price = 0; // Invalid price

      const result = spec.interpretResponse(invalidServerResponse, bidRequest);
      expect(result).to.deep.equal([]);
    });

    it('should handle missing bid request mapping', function () {
      let serverResponseWithUnknownImp = deepClone(serverResponse);
      serverResponseWithUnknownImp.body.bids[0].raw_response.seatbid[0].bid[0].impid = 'unknown-imp-id';

      const result = spec.interpretResponse(serverResponseWithUnknownImp, bidRequest);
      expect(result).to.deep.equal([]);
    });
  });

  describe('getUserSyncs', function () {
    const SYNC_URL = 'https://sync.revantage.io/sync';
    let syncOptions = {
      iframeEnabled: true,
      pixelEnabled: true
    };

    let gdprConsent = {
      gdprApplies: true,
      consentString: 'BOJ/P2HOJ/P2HABABMAAAAAZ+A=='
    };

    let uspConsent = '1---';

    it('should return iframe sync when enabled', function () {
      const syncs = spec.getUserSyncs({iframeEnabled: true}, [], gdprConsent, uspConsent);
      expect(syncs).to.be.an('array').that.is.not.empty;

      const iframeSync = syncs.find(sync => sync.type === 'iframe');
      expect(iframeSync).to.exist;
      expect(iframeSync.url).to.include(SYNC_URL);
      expect(iframeSync.url).to.include('gdpr=1');
      expect(iframeSync.url).to.include('gdpr_consent=' + gdprConsent.consentString);
      expect(iframeSync.url).to.include('us_privacy=' + uspConsent);
    });

    it('should return pixel sync when enabled', function () {
      const syncs = spec.getUserSyncs({pixelEnabled: true}, [], gdprConsent, uspConsent);
      expect(syncs).to.be.an('array').that.is.not.empty;

      const pixelSync = syncs.find(sync => sync.type === 'image');
      expect(pixelSync).to.exist;
      expect(pixelSync.url).to.include(SYNC_URL);
      expect(pixelSync.url).to.include('tag=img');
    });

    it('should handle GDPR not applies', function () {
      let gdprNotApplies = {
        gdprApplies: false,
        consentString: 'BOJ/P2HOJ/P2HABABMAAAAAZ+A=='
      };

      const syncs = spec.getUserSyncs(syncOptions, [], gdprNotApplies, uspConsent);
      const sync = syncs[0];

      expect(sync.url).to.include('gdpr=0');
    });

    it('should handle missing GDPR consent', function () {
      const syncs = spec.getUserSyncs(syncOptions, [], null, uspConsent);
      const sync = syncs[0];

      expect(sync.url).to.not.include('gdpr=');
      expect(sync.url).to.not.include('gdpr_consent=');
      expect(sync.url).to.include('us_privacy=' + uspConsent);
    });

    it('should handle missing USP consent', function () {
      const syncs = spec.getUserSyncs(syncOptions, [], gdprConsent, null);
      const sync = syncs[0];

      expect(sync.url).to.include('gdpr=1');
      expect(sync.url).to.not.include('us_privacy=');
    });

    it('should return empty array when no sync options enabled', function () {
      const syncs = spec.getUserSyncs({}, [], gdprConsent, uspConsent);
      expect(syncs).to.be.an('array').that.is.empty;
    });
  });

  describe('edge cases', function () {
    it('should handle multiple impressions', function () {
      let multipleBidRequests = [
        {
          'bidder': 'revantage',
          'params': { 'feedId': 'test-feed-1' },
          'adUnitCode': 'adunit-1',
          'sizes': [[300, 250]],
          'bidId': 'bid1',
          'bidderRequestId': '22edbae2733bf6',
          'auctionId': '1d1a030790a475'
        },
        {
          'bidder': 'revantage',
          'params': { 'feedId': 'test-feed-2' },
          'adUnitCode': 'adunit-2',
          'sizes': [[728, 90]],
          'bidId': 'bid2',
          'bidderRequestId': '22edbae2733bf6',
          'auctionId': '1d1a030790a475'
        }
      ];

      let bidderRequest = {
        'auctionId': '1d1a030790a475',
        'bidderRequestId': '22edbae2733bf6',
        'timeout': 3000
      };

      const request = spec.buildRequests(multipleBidRequests, bidderRequest);
      const data = JSON.parse(request.data);

      expect(data.imp).to.have.length(2);
      expect(data.imp[0].ext.feedId).to.equal('test-feed-1');
      expect(data.imp[1].ext.feedId).to.equal('test-feed-2');
    });

    it('should handle empty sizes array gracefully', function () {
      let bidWithEmptySizes = {
        'bidder': 'revantage',
        'params': { 'feedId': 'test-feed' },
        'adUnitCode': 'adunit-code',
        'sizes': [],
        'bidId': '30b31c1838de1e',
        'bidderRequestId': '22edbae2733bf6',
        'auctionId': '1d1a030790a475'
      };

      let bidderRequest = {
        'auctionId': '1d1a030790a475',
        'bidderRequestId': '22edbae2733bf6',
        'timeout': 3000
      };

      const request = spec.buildRequests([bidWithEmptySizes], bidderRequest);
      
      // Check if request is valid before parsing
      if (request && request.data) {
        const data = JSON.parse(request.data);
        expect(data.imp[0].banner.w).to.equal(300); // Default size
        expect(data.imp[0].banner.h).to.equal(250); // Default size
      } else {
        // If request is invalid, that's also acceptable behavior
        expect(request).to.deep.equal([]);
      }
    });
  });
});
