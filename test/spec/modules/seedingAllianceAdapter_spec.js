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
      let keys = 'site,device,cur,imp,user'.split(',');
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

    it('Verify the device', function () {
      let validBidRequests = [{
        bidId: 'bidId',
        params: {}
      }];
      let request = JSON.parse(spec.buildRequests(validBidRequests, { refererInfo: { referer: 'page' } }).data);

      assert.equal(request.device.ua, navigator.userAgent);
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
    const goodResponse = {
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
    const badResponse = { body: {
      cur: 'EUR',
      id: '4b516b80-886e-4ec0-82ae-9209e6d625fb',
      seatbid: []
    }};

    const bidRequest = {
      data: {},
      bids: [{ bidId: 'bidId1' }]
    };

    it('should return null if body is missing or empty', function () {
      const result = spec.interpretResponse(badResponse, bidRequest);
      assert.equal(result.length, 0);

      delete badResponse.body

      const result1 = spec.interpretResponse(badResponse, bidRequest);
      assert.equal(result.length, 0);
    });

    it('should return the correct params', function () {
      const result = spec.interpretResponse(goodResponse, bidRequest);
      const bid = goodResponse.body.seatbid[0].bid[0];

      assert.deepEqual(result[0].currency, goodResponse.body.cur);
      assert.deepEqual(result[0].requestId, bidRequest.bids[0].bidId);
      assert.deepEqual(result[0].cpm, bid.price);
      assert.deepEqual(result[0].creativeId, bid.crid);
      assert.deepEqual(result[0].mediaType, 'native');
      assert.deepEqual(result[0].bidderCode, 'seedingAlliance');
    });

    it('should return the correct tracking links', function () {
      const result = spec.interpretResponse(goodResponse, bidRequest);
      const bid = goodResponse.body.seatbid[0].bid[0];
      const regExpPrice = new RegExp('price=' + bid.price);

      result[0].native.clickTrackers.forEach(function (clickTracker) {
        	assert.ok(clickTracker.search(regExpPrice) > -1);
      });

      result[0].native.impressionTrackers.forEach(function (impTracker) {
        	assert.ok(impTracker.search(regExpPrice) > -1);
      });
    });
  });
});
