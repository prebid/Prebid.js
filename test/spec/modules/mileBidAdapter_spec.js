import { expect } from 'chai';
import { spec, siteIdTracker, publisherIdTracker } from 'modules/mileBidAdapter.js';
import { BANNER } from 'src/mediaTypes.js';
import * as ajax from 'src/ajax.js';
import * as utils from 'src/utils.js';

describe('mileBidAdapter', function () {
  describe('isBidRequestValid', function () {
    let bid;

    beforeEach(function () {
      bid = {
        bidder: 'mile',
        params: {
          placementId: '12345',
          siteId: 'site123',
          publisherId: 'pub456'
        },
        mediaTypes: {
          banner: {
            sizes: [[300, 250]]
          }
        }
      };
    });

    it('should return true when all required params are present', function () {
      expect(spec.isBidRequestValid(bid)).to.be.true;
    });

    it('should return false when placementId is missing', function () {
      delete bid.params.placementId;
      expect(spec.isBidRequestValid(bid)).to.be.false;
    });

    it('should return false when siteId is missing', function () {
      delete bid.params.siteId;
      expect(spec.isBidRequestValid(bid)).to.be.false;
    });

    it('should return false when publisherId is missing', function () {
      delete bid.params.publisherId;
      expect(spec.isBidRequestValid(bid)).to.be.false;
    });

    it('should return false when params is missing', function () {
      delete bid.params;
      expect(spec.isBidRequestValid(bid)).to.be.false;
    });

    it('should return false when params is null', function () {
      bid.params = null;
      expect(spec.isBidRequestValid(bid)).to.be.false;
    });
  });

  describe('buildRequests', function () {
    let validBidRequests, bidderRequest;

    beforeEach(function () {
      validBidRequests = [{
        bidder: 'mile',
        params: {
          placementId: '12345',
          siteId: 'site123',
          publisherId: 'pub456'
        },
        mediaTypes: {
          banner: {
            sizes: [[300, 250], [728, 90]]
          }
        },
        adUnitCode: 'test-ad-unit',
        bidId: 'bid123',
        ortb2Imp: {
          ext: {
            gpid: '/test/ad/unit'
          }
        }
      }];

      bidderRequest = {
        bidderCode: 'mile',
        bidderRequestId: 'bidderReq123',
        auctionId: 'auction123',
        timeout: 3000,
        refererInfo: {
          page: 'https://example.com/page',
          domain: 'example.com',
          ref: 'https://google.com'
        },
        ortb2: {
          source: {
            tid: 'transaction123'
          }
        }
      };
    });

    it('should return a valid server request object', function () {
      const request = spec.buildRequests(validBidRequests, bidderRequest);

      expect(request).to.be.an('object');
      expect(request.method).to.equal('POST');
      expect(request.url).to.equal('https://pbs.atmtd.com/mile/v1/request');
      expect(request.data).to.be.an('object');
    });

    it('should build OpenRTB 2.5 compliant request', function () {
      const request = spec.buildRequests(validBidRequests, bidderRequest);
      const data = request.data;

      expect(data.id).to.equal('bidderReq123');
      expect(data.imp).to.be.an('array').with.lengthOf(1);
      expect(data.tmax).to.equal(3000);
      expect(data.cur).to.deep.equal(['USD']);
      expect(data.site).to.be.an('object');
      expect(data.device).to.be.an('object');
      expect(data.source).to.be.an('object');
    });

    it('should include imp object with correct structure', function () {
      const request = spec.buildRequests(validBidRequests, bidderRequest);
      const imp = request.data.imp[0];

      expect(imp.id).to.equal('bid123');
      expect(imp.tagid).to.equal('12345');
      expect(imp.secure).to.equal(1);
      expect(imp.banner).to.be.an('object');
      expect(imp.banner.format).to.be.an('array').with.lengthOf(2);
      expect(imp.banner.format[0]).to.deep.equal({ w: 300, h: 250 });
      expect(imp.banner.format[1]).to.deep.equal({ w: 728, h: 90 });
    });

    it('should include ext fields in imp object', function () {
      const request = spec.buildRequests(validBidRequests, bidderRequest);
      const imp = request.data.imp[0];

      expect(imp.ext.adUnitCode).to.equal('test-ad-unit');
      expect(imp.ext.placementId).to.equal('12345');
      expect(imp.ext.gpid).to.equal('/test/ad/unit');
    });

    it('should include site object with publisher info', function () {
      const request = spec.buildRequests(validBidRequests, bidderRequest);
      const site = request.data.site;

      expect(site.id).to.equal('site123');
      expect(site.page).to.equal('https://example.com/page');
      expect(site.domain).to.equal('example.com');
      expect(site.ref).to.equal('https://google.com');
      expect(site.publisher.id).to.equal('pub456');
    });

    it('should include device object', function () {
      const request = spec.buildRequests(validBidRequests, bidderRequest);
      const device = request.data.device;

      expect(device.ua).to.be.a('string');
      expect(device.language).to.be.a('string');
      expect(device.dnt).to.be.a('number');
    });

    it('should include source object with tid', function () {
      const request = spec.buildRequests(validBidRequests, bidderRequest);
      const source = request.data.source;

      expect(source.tid).to.equal('transaction123');
    });

    it('should include bidfloor when floor price is available', function () {
      validBidRequests[0].getFloor = function() {
        return { floor: 0.5, currency: 'USD' };
      };

      const request = spec.buildRequests(validBidRequests, bidderRequest);
      const imp = request.data.imp[0];

      expect(imp.bidfloor).to.equal(0.5);
      expect(imp.bidfloorcur).to.equal('USD');
    });

    it('should include GDPR consent when present', function () {
      bidderRequest.gdprConsent = {
        gdprApplies: true,
        consentString: 'consent-string-123'
      };

      const request = spec.buildRequests(validBidRequests, bidderRequest);

      expect(request.data.regs.ext.gdpr).to.equal(1);
      expect(request.data.user.ext.consent).to.equal('consent-string-123');
    });

    it('should include US Privacy consent when present', function () {
      bidderRequest.uspConsent = '1YNN';

      const request = spec.buildRequests(validBidRequests, bidderRequest);

      expect(request.data.regs.ext.us_privacy).to.equal('1YNN');
    });

    it('should include GPP consent when present', function () {
      bidderRequest.gppConsent = {
        gppString: 'gpp-string-123',
        applicableSections: [1, 2, 3]
      };

      const request = spec.buildRequests(validBidRequests, bidderRequest);

      expect(request.data.regs.gpp).to.equal('gpp-string-123');
      expect(request.data.regs.gpp_sid).to.deep.equal([1, 2, 3]);
    });

    it('should include user EIDs when present', function () {
      validBidRequests[0].userIdAsEids = [
        {
          source: 'pubcid.org',
          uids: [{ id: 'user-id-123' }]
        }
      ];

      const request = spec.buildRequests(validBidRequests, bidderRequest);

      expect(request.data.user.ext.eids).to.be.an('array').with.lengthOf(1);
      expect(request.data.user.ext.eids[0].source).to.equal('pubcid.org');
    });

    it('should include supply chain when present', function () {
      validBidRequests[0].ortb2 = {
        source: {
          ext: {
            schain: {
              ver: '1.0',
              complete: 1,
              nodes: []
            }
          }
        }
      };

      const request = spec.buildRequests(validBidRequests, bidderRequest);

      expect(request.data.source.ext.schain).to.be.an('object');
      expect(request.data.source.ext.schain.ver).to.equal('1.0');
    });

    it('should handle multiple bid requests with same siteId and publisherId', function () {
      const secondBid = {
        ...validBidRequests[0],
        bidId: 'bid456',
        params: {
          placementId: '67890',
          siteId: 'site123',
          publisherId: 'pub456'
        }
      };

      const request = spec.buildRequests([validBidRequests[0], secondBid], bidderRequest);

      expect(request.data.imp).to.be.an('array').with.lengthOf(2);
      expect(request.data.imp[0].id).to.equal('bid123');
      expect(request.data.imp[1].id).to.equal('bid456');
    });

    it('should reject bids with different siteId', function () {
      const firstBid = {
        bidder: 'mile',
        params: {
          placementId: '12345',
          siteId: 'site123',
          publisherId: 'pub456'
        },
        mediaTypes: {
          banner: {
            sizes: [[300, 250]]
          }
        }
      };

      const secondBid = {
        bidder: 'mile',
        params: {
          placementId: '67890',
          siteId: 'differentSite', // Different siteId
          publisherId: 'pub456'
        },
        mediaTypes: {
          banner: {
            sizes: [[300, 250]]
          }
        }
      };

      // First bid should be valid
      expect(spec.isBidRequestValid(firstBid)).to.be.true;

      // Second bid should be rejected due to siteId mismatch
      expect(spec.isBidRequestValid(secondBid)).to.be.false;
    });

    it('should reject bids with different publisherId', function () {
      const firstBid = {
        bidder: 'mile',
        params: {
          placementId: '12345',
          siteId: 'site123',
          publisherId: 'pub456'
        },
        mediaTypes: {
          banner: {
            sizes: [[300, 250]]
          }
        }
      };

      const secondBid = {
        bidder: 'mile',
        params: {
          placementId: '67890',
          siteId: 'site123',
          publisherId: 'differentPub'
        },
        mediaTypes: {
          banner: {
            sizes: [[300, 250]]
          }
        }
      };

      // First bid should be valid
      expect(spec.isBidRequestValid(firstBid)).to.be.true;

      // Second bid should be rejected due to publisherId mismatch
      expect(spec.isBidRequestValid(secondBid)).to.be.false;
    });
  });

  describe('interpretResponse', function () {
    let serverResponse;

    beforeEach(function () {
      serverResponse = {
        body: {
          cur: 'USD',
          bids: [
            {
              requestId: 'bid123',
              cpm: 1.5,
              width: 300,
              height: 250,
              ad: '<div>test ad</div>',
              creativeId: 'creative123',
              ttl: 300,
              nurl: 'https://example.com/win?price=${AUCTION_PRICE}',
              adomain: ['advertiser.com'],
              upstreamBidder: 'upstreamBidder'
            }
          ]
        }
      };
    });

    it('should return an array of bid responses', function () {
      const bids = spec.interpretResponse(serverResponse);

      expect(bids).to.be.an('array').with.lengthOf(1);
    });

    it('should parse bid response correctly', function () {
      const bids = spec.interpretResponse(serverResponse);
      const bid = bids[0];

      expect(bid.requestId).to.equal('bid123');
      expect(bid.cpm).to.equal(1.5);
      expect(bid.width).to.equal(300);
      expect(bid.height).to.equal(250);
      expect(bid.ad).to.equal('<div>test ad</div>');
      expect(bid.creativeId).to.equal('creative123');
      expect(bid.currency).to.equal('USD');
      expect(bid.ttl).to.equal(300);
      expect(bid.netRevenue).to.be.true;
      expect(bid.mediaType).to.equal(BANNER);
      expect(bid.upstreamBidder).to.equal('upstreamBidder');
    });

    it('should include nurl in bid response', function () {
      const bids = spec.interpretResponse(serverResponse);
      const bid = bids[0];

      expect(bid.nurl).to.equal('https://example.com/win?price=${AUCTION_PRICE}');
    });

    it('should include meta.advertiserDomains', function () {
      const bids = spec.interpretResponse(serverResponse);
      const bid = bids[0];

      expect(bid.meta.advertiserDomains).to.deep.equal(['advertiser.com']);
    });

    it('should handle empty response', function () {
      const bids = spec.interpretResponse({ body: null });

      expect(bids).to.be.an('array').with.lengthOf(0);
    });

    it('should handle response with no bids', function () {
      serverResponse.body.bids = [];
      const bids = spec.interpretResponse(serverResponse);

      expect(bids).to.be.an('array').with.lengthOf(0);
    });

    it('should handle alternative field names (w/h instead of width/height)', function () {
      serverResponse.body.bids[0] = {
        requestId: 'bid123',
        cpm: 1.5,
        w: 728,
        h: 90,
        ad: '<div>test ad</div>'
      };

      const bids = spec.interpretResponse(serverResponse);
      const bid = bids[0];

      expect(bid.width).to.equal(728);
      expect(bid.height).to.equal(90);
    });

    it('should use default currency if not specified', function () {
      delete serverResponse.body.cur;
      const bids = spec.interpretResponse(serverResponse);

      expect(bids[0].currency).to.equal('USD');
    });
  });

  describe('getUserSyncs', function () {
    let syncOptions, serverResponses, gdprConsent, uspConsent, gppConsent;

    beforeEach(function () {
      syncOptions = {
        iframeEnabled: true,
        pixelEnabled: true
      };
      serverResponses = [];
    });

    it('should return iframe sync when enabled', function () {
      const syncs = spec.getUserSyncs(syncOptions, serverResponses);

      expect(syncs).to.be.an('array').with.lengthOf(1);
      expect(syncs[0].type).to.equal('iframe');
      expect(syncs[0].url).to.include('https://scripts.atmtd.com/user-sync/load-cookie.html');
    });

    it('should not return syncs when iframe is disabled', function () {
      syncOptions.iframeEnabled = false;
      const syncs = spec.getUserSyncs(syncOptions, serverResponses);

      expect(syncs).to.be.an('array').with.lengthOf(0);
    });

    it('should include GDPR consent params', function () {
      gdprConsent = {
        gdprApplies: true,
        consentString: 'consent-string-123'
      };

      const syncs = spec.getUserSyncs(syncOptions, serverResponses, gdprConsent);

      expect(syncs[0].url).to.include('gdpr=1');
      expect(syncs[0].url).to.include('gdpr_consent=consent-string-123');
    });

    it('should include US Privacy consent param', function () {
      uspConsent = '1YNN';

      const syncs = spec.getUserSyncs(syncOptions, serverResponses, null, uspConsent);

      expect(syncs[0].url).to.include('us_privacy=1YNN');
    });

    it('should include GPP consent params', function () {
      gppConsent = {
        gppString: 'gpp-string-123',
        applicableSections: [1, 2, 3]
      };

      const syncs = spec.getUserSyncs(syncOptions, serverResponses, null, null, gppConsent);

      expect(syncs[0].url).to.include('gpp=gpp-string-123');
      expect(syncs[0].url).to.include('gpp_sid=1%2C2%2C3');
    });

    it('should include all consent params when present', function () {
      gdprConsent = { gdprApplies: true, consentString: 'gdpr-consent' };
      uspConsent = '1YNN';
      gppConsent = { gppString: 'gpp-string', applicableSections: [1] };

      const syncs = spec.getUserSyncs(syncOptions, serverResponses, gdprConsent, uspConsent, gppConsent);

      expect(syncs[0].url).to.include('gdpr=1');
      expect(syncs[0].url).to.include('us_privacy=1YNN');
      expect(syncs[0].url).to.include('gpp=gpp-string');
    });
  });

  describe('onBidWon', function () {
    let bid, ajaxStub;

    beforeEach(function () {
      bid = {
        bidder: 'mile',
        adUnitCode: 'test-ad-unit',
        requestId: 'bid123',
        cpm: 1.5,
        width: 300,
        height: 250,
        nurl: 'https://example.com/win',
        upstreamBidder: 'upstreamBidder'
      };

      ajaxStub = sinon.stub(ajax, 'ajax');
    });

    afterEach(function () {
      ajaxStub.restore();
    });

    it('should call ajax with win notification endpoint', function () {
      spec.onBidWon(bid);

      expect(ajaxStub.calledTwice).to.be.true;

      // First call to notification endpoint
      const firstCall = ajaxStub.getCall(0);
      expect(firstCall.args[0]).to.equal('https://e01.atmtd.com/bidanalytics-event/json');

      // Second call to nurl
      const secondCall = ajaxStub.getCall(1);
      expect(secondCall.args[0]).to.equal('https://example.com/win');
    });

    it('should send correct win notification data', function () {
      spec.onBidWon(bid);

      const firstCall = ajaxStub.getCall(0);
      const notificationData = JSON.parse(firstCall.args[2])[0];

      expect(notificationData.adUnitCode).to.equal('test-ad-unit');
      expect(notificationData.metaData.impressionID[0]).to.equal('bid123');
      expect(notificationData.metaData.upstreamBidder[0]).to.equal('upstreamBidder');
      expect(notificationData.cpm).to.equal(1.5);
      expect(notificationData.winningSize).to.equal('300x250');
      expect(notificationData.eventType).to.equal('mile-bidder-win-notify');
      expect(notificationData.timestamp).to.be.a('number');
    });

    it('should call nurl with GET request', function () {
      spec.onBidWon(bid);

      const secondCall = ajaxStub.getCall(1);
      const options = secondCall.args[3];

      expect(options.method).to.equal('GET');
    });
  });

  describe('onTimeout', function () {
    let timeoutData, ajaxStub;

    beforeEach(function () {
      timeoutData = [
        {
          bidder: 'mile',
          bidId: 'bid123',
          adUnitCode: 'test-ad-unit-1',
          timeout: 3000,
          params: {
            placementId: '12345',
            siteId: 'site123',
            publisherId: 'pub456'
          }
        },
        {
          bidder: 'mile',
          bidId: 'bid456',
          adUnitCode: 'test-ad-unit-2',
          timeout: 3000,
          params: {
            placementId: '67890',
            siteId: 'site123',
            publisherId: 'pub456'
          }
        }
      ];

      ajaxStub = sinon.stub(ajax, 'ajax');
    });

    afterEach(function () {
      ajaxStub.restore();
    });

    it('should call ajax for each timed out bid', function () {
      spec.onTimeout(timeoutData);

      expect(ajaxStub.callCount).to.equal(1);
    });

    it('should send correct timeout notification data', function () {
      spec.onTimeout(timeoutData);

      const firstCall = ajaxStub.getCall(0);
      expect(firstCall.args[0]).to.equal('https://e01.atmtd.com/bidanalytics-event/json');

      const notificationData = JSON.parse(firstCall.args[2])[0];
      expect(notificationData.adUnitCode).to.equal('test-ad-unit-1');
      expect(notificationData.metaData.impressionID[0]).to.equal('bid123');
      expect(notificationData.metaData.configuredTimeout[0]).to.equal('3000');
      expect(notificationData.eventType).to.equal('mile-bidder-timeout');
      expect(notificationData.timestamp).to.be.a('number');
    });

    it('should handle single timeout', function () {
      spec.onTimeout([timeoutData[0]]);

      expect(ajaxStub.calledOnce).to.be.true;
    });

    it('should handle empty timeout array', function () {
      spec.onTimeout([]);

      expect(ajaxStub.called).to.be.false;
    });
  });

  describe('adapter specification', function () {
    it('should have correct bidder code', function () {
      expect(spec.code).to.equal('mile');
    });

    it('should support BANNER media type', function () {
      expect(spec.supportedMediaTypes).to.be.an('array');
      expect(spec.supportedMediaTypes).to.include(BANNER);
    });

    it('should have required adapter functions', function () {
      expect(spec.isBidRequestValid).to.be.a('function');
      expect(spec.buildRequests).to.be.a('function');
      expect(spec.interpretResponse).to.be.a('function');
      expect(spec.getUserSyncs).to.be.a('function');
      expect(spec.onBidWon).to.be.a('function');
      expect(spec.onTimeout).to.be.a('function');
    });
  });
});
