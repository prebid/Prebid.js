// jshint esversion: 6, es3: false, node: true
import {assert, expect} from 'chai';
import {spec} from 'modules/seedingAllianceBidAdapter.js';
import { NATIVE } from 'src/mediaTypes.js';
import { config } from 'src/config.js';

describe('SeedingAlliance adapter', function () {
  let serverResponse, bidRequest, bidResponses;
  let bid = {
    'bidder': 'seedingAlliance',
    'params': {
      'adUnitId': '1hq8'
    }
  };

  describe('isBidRequestValid', function () {
    it('should return true when required params found', function () {
      assert(spec.isBidRequestValid(bid));
    });

    it('should return false when AdUnitId is not set', function () {
      delete bid.params.adUnitId;
      assert.isFalse(spec.isBidRequestValid(bid));
    });
  });

  describe('buildRequests', function () {
    it('should send request with correct structure', function () {
      let validBidRequests = [{
        bidId: 'bidId',
        params: {}
      }];

      let request = spec.buildRequests(validBidRequests, { refererInfo: { referer: 'page' } });

      assert.equal(request.method, 'POST');
      assert.ok(request.data);
    });

    it('should have default request structure', function () {
      let keys = 'site,cur,imp,regs'.split(',');
      let validBidRequests = [{
        bidId: 'bidId',
        params: {}
      }];
      let request = JSON.parse(spec.buildRequests(validBidRequests, { refererInfo: { referer: 'page' } }).data);
      let data = Object.keys(request);

      assert.deepEqual(keys, data);
    });

    it('Verify the auction ID', function () {
      let validBidRequests = [{
        bidId: 'bidId',
        params: {},
        auctionId: 'auctionId'
      }];
      let request = JSON.parse(spec.buildRequests(validBidRequests, { refererInfo: { referer: 'page' }, auctionId: validBidRequests[0].auctionId }).data);

      assert.equal(request.id, validBidRequests[0].auctionId);
    });

    it('Verify the site url', function () {
      let siteUrl = 'https://www.yourdomain.tld/your-directory/';
      let validBidRequests = [{
        bidId: 'bidId',
        params: {
          url: siteUrl
        }
      }];
      let request = JSON.parse(spec.buildRequests(validBidRequests, { refererInfo: { referer: 'page' } }).data);

      assert.equal(request.site.page, siteUrl);
    });

    it('Verify native asset ids', function () {
      let validBidRequests = [{
        bidId: 'bidId',
        params: {},
        nativeParams: {
          body: {
            required: true,
            len: 350
          },
          image: {
            required: true
          },
          title: {
            required: true
          },
          sponsoredBy: {
            required: true
          },
          cta: {
            required: true
          },
          icon: {
            required: true
          }
        }
      }];

      let assets = JSON.parse(spec.buildRequests(validBidRequests, { refererInfo: { referer: 'page' } }).data).imp[0].native.request.assets;

      assert.equal(assets[0].id, 1);
      assert.equal(assets[1].id, 3);
      assert.equal(assets[2].id, 0);
      assert.equal(assets[3].id, 2);
      assert.equal(assets[4].id, 4);
      assert.equal(assets[5].id, 5);
    });
  });

  describe('interpretResponse', function () {
    const goodNativeResponse = {
      body: {
        cur: 'EUR',
        id: '4b516b80-886e-4ec0-82ae-9209e6d625fb',
        seatbid: [
          {
          	seat: 'seedingAlliance',
          	bid: [{
              adm: {
            	native: {
            		assets: [
            			{id: 0, title: {text: 'this is a title'}}
            		],
            		imptrackers: ['https://domain.for/imp/tracker?price=${AUCTION_PRICE}'],
            		link: {
            			clicktrackers: ['https://domain.for/imp/tracker?price=${AUCTION_PRICE}'],
            			url: 'https://domain.for/ad/'
            		}
            	}
              },
              impid: 1,
              price: 0.55
            }]
          }
        ]
      }
    };

    const goodBannerResponse = {
      body: {
        cur: 'EUR',
        id: 'b4516b80-886e-4ec0-82ae-9209e6d625fb',
        seatbid: [
          {
          	seat: 'seedingAlliance',
          	bid: [{
              adm: '<iframe src="https://domain.tld/cds/delivery?wp=0.90"></iframe>',
              impid: 1,
              price: 0.90,
              h: 250,
              w: 300
            }]
          }
        ]
      }
    };

    const badResponse = { body: {
      cur: 'EUR',
      id: '4b516b80-886e-4ec0-82ae-9209e6d625fb',
      seatbid: []
    }};

    const bidNativeRequest = {
      data: {},
      bidRequests: [{bidId: 'bidId1', nativeParams: {title: {required: true, len: 800}}}]
    };

    const bidBannerRequest = {
      data: {},
      bidRequests: [{bidId: 'bidId1', sizes: [300, 250]}]
    };

    it('should return null if body is missing or empty', function () {
      const result = spec.interpretResponse(badResponse, bidNativeRequest);
      assert.equal(result.length, 0);

      delete badResponse.body

      const result1 = spec.interpretResponse(badResponse, bidNativeRequest);
      assert.equal(result.length, 0);
    });

    it('should return the correct params', function () {
      const resultNative = spec.interpretResponse(goodNativeResponse, bidNativeRequest);
      const bidNative = goodNativeResponse.body.seatbid[0].bid[0];

      assert.deepEqual(resultNative[0].bidderCode, 'seedingAlliance');
      assert.deepEqual(resultNative[0].currency, goodNativeResponse.body.cur);
      assert.deepEqual(resultNative[0].requestId, bidNativeRequest.bidRequests[0].bidId);
      assert.deepEqual(resultNative[0].cpm, bidNative.price);
      assert.deepEqual(resultNative[0].creativeId, bidNative.crid);
      assert.deepEqual(resultNative[0].mediaType, 'native');

      const resultBanner = spec.interpretResponse(goodBannerResponse, bidBannerRequest);

      assert.deepEqual(resultBanner[0].bidderCode, 'seedingAlliance');
      assert.deepEqual(resultBanner[0].mediaType, 'banner');
      assert.deepEqual(resultBanner[0].width, bidBannerRequest.bidRequests[0].sizes[0]);
      assert.deepEqual(resultBanner[0].height, bidBannerRequest.bidRequests[0].sizes[1]);
    });

    it('should return the correct native tracking links', function () {
      const result = spec.interpretResponse(goodNativeResponse, bidNativeRequest);
      const bid = goodNativeResponse.body.seatbid[0].bid[0];
      const regExpPrice = new RegExp('price=' + bid.price);

      result[0].native.clickTrackers.forEach(function (clickTracker) {
        assert.ok(clickTracker.search(regExpPrice) > -1);
      });

      result[0].native.impressionTrackers.forEach(function (impTracker) {
        assert.ok(impTracker.search(regExpPrice) > -1);
      });
    });

    it('should return the correct banner content', function () {
      const result = spec.interpretResponse(goodBannerResponse, bidBannerRequest);
      const bid = goodBannerResponse.body.seatbid[0].bid[0];
      const regExpContent = new RegExp('<iframe.+?' + bid.price + '.+?</iframe>');

      assert.ok(result[0].ad.search(regExpContent) > -1);
    });
  });
});
