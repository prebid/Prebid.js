import * as utils from 'src/utils';
import { config } from 'src/config';
import * as videoCache from 'src/videoCache';
import * as auction from 'src/auction';
import { ADPOD } from 'src/mediaTypes';

import { callPrebidCacheHook, checkAdUnitSetupHook, checkVideoBidSetupHook, adpodSetConfig, sortByPricePerSecond } from 'modules/adpod';

let expect = require('chai').expect;

describe('adpod.js', function () {
  let logErrorStub;
  let logWarnStub;
  let logInfoStub;

  describe('callPrebidCacheHook', function () {
    let callbackResult;
    let clock;
    let addBidToAuctionStub;
    let doCallbacksIfTimedoutStub;
    let storeStub;
    let afterBidAddedSpy;
    let auctionBids = [];

    let callbackFn = function() {
      callbackResult = true;
    };

    let auctionInstance = {
      getAuctionStatus: function() {
        return auction.AUCTION_IN_PROGRESS;
      }
    }

    const fakeStoreFn = function(bids, callback) {
      let payload = [];
      bids.forEach(bid => payload.push({uuid: bid.customCacheKey}));
      callback(null, payload);
    };

    beforeEach(function() {
      callbackResult = null;
      afterBidAddedSpy = sinon.spy();
      storeStub = sinon.stub(videoCache, 'store');
      logWarnStub = sinon.stub(utils, 'logWarn');
      logInfoStub = sinon.stub(utils, 'logInfo');
      addBidToAuctionStub = sinon.stub(auction, 'addBidToAuction').callsFake(function (auctionInstance, bid) {
        auctionBids.push(bid);
      });
      doCallbacksIfTimedoutStub = sinon.stub(auction, 'doCallbacksIfTimedout');
      clock = sinon.useFakeTimers();
      config.setConfig({
        cache: {
          url: 'https://prebid.adnxs.com/pbc/v1/cache'
        }
      });
    });

    afterEach(function() {
      storeStub.restore();
      logWarnStub.restore();
      logInfoStub.restore();
      addBidToAuctionStub.restore();
      doCallbacksIfTimedoutStub.restore();
      clock.restore();
      config.resetConfig();
      auctionBids = [];
    })

    it('should redirect back to the original function if bid is not an adpod video', function () {
      let bid = {
        adId: 'testAdId_123',
        mediaType: 'video'
      };

      let bidderRequest = {
        adUnitCode: 'adUnit_123',
        mediaTypes: {
          video: {
            context: 'outstream'
          }
        }
      }

      callPrebidCacheHook(callbackFn, auctionInstance, bid, function () {}, bidderRequest);
      expect(callbackResult).to.equal(true);
    });

    it('should immediately add the adpod bid to auction if adpod.deferCaching in config is true', function() {
      config.setConfig({
        adpod: {
          deferCaching: true,
          brandCategoryExclusion: true
        }
      });

      let bidResponse1 = {
        adId: 'adId01277',
        auctionId: 'no_defer_123',
        mediaType: 'video',
        cpm: 5,
        pbMg: '5.00',
        adserverTargeting: {
          hb_pb: '5.00'
        },
        meta: {
          adServerCatId: 'test'
        },
        video: {
          context: ADPOD,
          durationSeconds: 15,
          durationBucket: 15
        }
      };

      let bidResponse2 = {
        adId: 'adId46547',
        auctionId: 'no_defer_123',
        mediaType: 'video',
        cpm: 12,
        pbMg: '12.00',
        adserverTargeting: {
          hb_pb: '12.00'
        },
        meta: {
          adServerCatId: 'value'
        },
        video: {
          context: ADPOD,
          durationSeconds: 15,
          durationBucket: 15
        }
      };

      let bidderRequest = {
        adUnitCode: 'adpod_1',
        auctionId: 'no_defer_123',
        mediaTypes: {
          video: {
            context: ADPOD,
            playerSize: [300, 300],
            adPodDurationSec: 300,
            durationRangeSec: [15, 30, 45],
            requireExactDuration: false
          }
        },
      };

      callPrebidCacheHook(callbackFn, auctionInstance, bidResponse1, afterBidAddedSpy, bidderRequest);
      callPrebidCacheHook(callbackFn, auctionInstance, bidResponse2, afterBidAddedSpy, bidderRequest);

      // check if bid adsereverTargeting is setup
      expect(callbackResult).to.be.null;
      expect(storeStub.called).to.equal(false);
      expect(afterBidAddedSpy.calledTwice).to.equal(true);
      expect(auctionBids.length).to.equal(2);
      expect(auctionBids[0].adId).to.equal(bidResponse1.adId);
      expect(auctionBids[0].customCacheKey).to.exist.and.to.match(/^5\.00_test_15s_.*/);
      expect(auctionBids[0].adserverTargeting.hb_pb_cat_dur).to.equal('5.00_test_15s');
      expect(auctionBids[0].adserverTargeting.hb_cache_id).to.exist;
      expect(auctionBids[0].videoCacheKey).to.exist.and.to.equal(auctionBids[0].adserverTargeting.hb_cache_id)
      expect(auctionBids[1].adId).to.equal(bidResponse2.adId);
      expect(auctionBids[1].customCacheKey).to.exist.and.to.match(/^12\.00_value_15s_.*/);
      expect(auctionBids[1].adserverTargeting.hb_pb_cat_dur).to.equal('12.00_value_15s');
      expect(auctionBids[1].adserverTargeting.hb_cache_id).to.exist;
      expect(auctionBids[1].adserverTargeting.hb_cache_id).to.equal(auctionBids[0].adserverTargeting.hb_cache_id);
      expect(auctionBids[1].videoCacheKey).to.exist.and.to.equal(auctionBids[0].adserverTargeting.hb_cache_id);
    });

    it('should send prebid cache call once bid queue is full', function () {
      storeStub.callsFake(fakeStoreFn);

      config.setConfig({
        adpod: {
          bidQueueSizeLimit: 2,
          deferCaching: false,
          brandCategoryExclusion: true
        }
      });

      let bidResponse1 = {
        adId: 'adId123',
        auctionId: 'full_abc123',
        mediaType: 'video',
        cpm: 10,
        pbMg: '10.00',
        adserverTargeting: {
          hb_pb: '10.00'
        },
        meta: {
          adServerCatId: 'airline'
        },
        video: {
          context: ADPOD,
          durationSeconds: 20,
          durationBucket: 30
        }
      };
      let bidResponse2 = {
        adId: 'adId234',
        auctionId: 'full_abc123',
        mediaType: 'video',
        cpm: 15,
        pbMg: '15.00',
        adserverTargeting: {
          hb_pb: '15.00'
        },
        meta: {
          adServerCatId: 'airline'
        },
        video: {
          context: ADPOD,
          durationSeconds: 25,
          durationBucket: 30
        }
      };
      let bidderRequest = {
        adUnitCode: 'adpod_1',
        auctionId: 'full_abc123',
        mediaTypes: {
          video: {
            context: ADPOD,
            playerSize: [300, 300],
            adPodDurationSec: 120,
            durationRangeSec: [15, 30],
            requireExactDuration: false
          }
        }
      };

      callPrebidCacheHook(callbackFn, auctionInstance, bidResponse1, afterBidAddedSpy, bidderRequest);
      callPrebidCacheHook(callbackFn, auctionInstance, bidResponse2, afterBidAddedSpy, bidderRequest);

      expect(callbackResult).to.be.null;
      expect(afterBidAddedSpy.calledTwice).to.equal(true);
      expect(auctionBids.length).to.equal(2);
      expect(auctionBids[0].adId).to.equal('adId123');
      expect(auctionBids[0].customCacheKey).to.exist.and.to.match(/^10\.00_airline_30s_.*/);
      expect(auctionBids[0].adserverTargeting.hb_pb_cat_dur).to.equal('10.00_airline_30s');
      expect(auctionBids[0].adserverTargeting.hb_cache_id).to.exist;
      expect(auctionBids[0].videoCacheKey).to.exist.and.to.equal(auctionBids[0].adserverTargeting.hb_cache_id)
      expect(auctionBids[1].adId).to.equal('adId234');
      expect(auctionBids[1].customCacheKey).to.exist.and.to.match(/^15\.00_airline_30s_.*/);
      expect(auctionBids[1].adserverTargeting.hb_pb_cat_dur).to.equal('15.00_airline_30s');
      expect(auctionBids[1].adserverTargeting.hb_cache_id).to.exist;
      expect(auctionBids[1].videoCacheKey).to.exist.and.to.equal(auctionBids[0].adserverTargeting.hb_cache_id)
    });

    it('should send prebid cache call after set period of time (even if queue is not full)', function () {
      storeStub.callsFake(fakeStoreFn);

      config.setConfig({
        adpod: {
          bidQueueSizeLimit: 2,
          bidQueueTimeDelay: 30,
          deferCaching: false,
          brandCategoryExclusion: true
        }
      });

      let bidResponse = {
        adId: 'adId234',
        auctionId: 'timer_abc234',
        mediaType: 'video',
        cpm: 15,
        pbMg: '15.00',
        adserverTargeting: {
          hb_pb: '15.00'
        },
        meta: {
          adServerCatId: 'airline'
        },
        video: {
          context: ADPOD,
          durationSeconds: 30,
          durationBucket: 30
        }
      };
      let bidderRequest = {
        adUnitCode: 'adpod_2',
        auctionId: 'timer_abc234',
        mediaTypes: {
          video: {
            context: ADPOD,
            playerSize: [300, 300],
            adPodDurationSec: 120,
            durationRangeSec: [15, 30],
            requireExactDuration: true
          }
        }
      };

      callPrebidCacheHook(callbackFn, auctionInstance, bidResponse, afterBidAddedSpy, bidderRequest);
      clock.tick(31);

      expect(callbackResult).to.be.null;
      expect(afterBidAddedSpy.calledOnce).to.equal(true);
      expect(auctionBids.length).to.equal(1);
      expect(auctionBids[0].adId).to.equal('adId234');
      expect(auctionBids[0].customCacheKey).to.exist.and.to.match(/^15\.00_airline_30s_.*/);
      expect(auctionBids[0].adserverTargeting.hb_pb_cat_dur).to.equal('15.00_airline_30s');
      expect(auctionBids[0].adserverTargeting.hb_cache_id).to.exist;
      expect(auctionBids[0].videoCacheKey).to.exist.and.to.equal(auctionBids[0].adserverTargeting.hb_cache_id)
    });

    it('should execute multiple prebid cache calls when number of bids exceeds queue size', function () {
      storeStub.callsFake(fakeStoreFn);

      config.setConfig({
        adpod: {
          bidQueueSizeLimit: 2,
          bidQueueTimeDelay: 30,
          deferCaching: false,
          brandCategoryExclusion: true
        }
      });

      let bidResponse1 = {
        adId: 'multi_ad1',
        auctionId: 'multi_call_abc345',
        mediaType: 'video',
        cpm: 15,
        pbMg: '15.00',
        adserverTargeting: {
          hb_pb: '15.00'
        },
        meta: {
          adServerCatId: 'airline'
        },
        video: {
          context: ADPOD,
          durationSeconds: 15,
          durationBucket: 15
        }
      };
      let bidResponse2 = {
        adId: 'multi_ad2',
        auctionId: 'multi_call_abc345',
        mediaType: 'video',
        cpm: 15,
        pbMg: '15.00',
        adserverTargeting: {
          hb_pb: '15.00'
        },
        meta: {
          adServerCatId: 'news'
        },
        video: {
          context: ADPOD,
          durationSeconds: 15,
          durationBucket: 15
        }
      };
      let bidResponse3 = {
        adId: 'multi_ad3',
        auctionId: 'multi_call_abc345',
        mediaType: 'video',
        cpm: 10,
        pbMg: '10.00',
        adserverTargeting: {
          hb_pb: '10.00'
        },
        meta: {
          adServerCatId: 'sports'
        },
        video: {
          context: ADPOD,
          durationSeconds: 15,
          durationBucket: 15
        }
      };

      let bidderRequest = {
        adUnitCode: 'adpod_3',
        auctionId: 'multi_call_abc345',
        mediaTypes: {
          video: {
            context: ADPOD,
            playerSize: [300, 300],
            adPodDurationSec: 45,
            durationRangeSec: [15, 30],
            requireExactDuration: false
          }
        }
      };

      callPrebidCacheHook(callbackFn, auctionInstance, bidResponse1, afterBidAddedSpy, bidderRequest);
      callPrebidCacheHook(callbackFn, auctionInstance, bidResponse2, afterBidAddedSpy, bidderRequest);
      callPrebidCacheHook(callbackFn, auctionInstance, bidResponse3, afterBidAddedSpy, bidderRequest);
      clock.next();

      expect(callbackResult).to.be.null;
      expect(afterBidAddedSpy.calledThrice).to.equal(true);
      expect(storeStub.calledTwice).to.equal(true);
      expect(auctionBids.length).to.equal(3);
      expect(auctionBids[0].adId).to.equal('multi_ad1');
      expect(auctionBids[0].customCacheKey).to.exist.and.to.match(/^15\.00_airline_15s_.*/);
      expect(auctionBids[0].adserverTargeting.hb_pb_cat_dur).to.equal('15.00_airline_15s');
      expect(auctionBids[0].adserverTargeting.hb_cache_id).to.exist;
      expect(auctionBids[0].videoCacheKey).to.exist.and.to.equal(auctionBids[0].adserverTargeting.hb_cache_id)
      expect(auctionBids[1].adId).to.equal('multi_ad2');
      expect(auctionBids[1].customCacheKey).to.exist.and.to.match(/^15\.00_news_15s_.*/);
      expect(auctionBids[1].adserverTargeting.hb_pb_cat_dur).to.equal('15.00_news_15s');
      expect(auctionBids[1].adserverTargeting.hb_cache_id).to.exist.and.to.equal(auctionBids[0].adserverTargeting.hb_cache_id);
      expect(auctionBids[1].videoCacheKey).to.exist.and.to.equal(auctionBids[0].adserverTargeting.hb_cache_id)
      expect(auctionBids[2].adId).to.equal('multi_ad3');
      expect(auctionBids[2].customCacheKey).to.exist.and.to.match(/^10\.00_sports_15s_.*/);
      expect(auctionBids[2].adserverTargeting.hb_pb_cat_dur).to.equal('10.00_sports_15s');
      expect(auctionBids[2].adserverTargeting.hb_cache_id).to.exist.and.to.equal(auctionBids[0].adserverTargeting.hb_cache_id);
      expect(auctionBids[2].videoCacheKey).to.exist.and.to.equal(auctionBids[0].adserverTargeting.hb_cache_id)
    });

    it('should cache the bids with a shortened custom key when adpod.brandCategoryExclusion is false', function() {
      storeStub.callsFake(fakeStoreFn);

      config.setConfig({
        adpod: {
          bidQueueSizeLimit: 2,
          bidQueueTimeDelay: 30,
          deferCaching: false,
          brandCategoryExclusion: false
        }
      });

      let bidResponse1 = {
        adId: 'nocat_ad1',
        auctionId: 'no_category_abc345',
        mediaType: 'video',
        cpm: 10,
        pbMg: '10.00',
        adserverTargeting: {
          hb_pb: '10.00'
        },
        meta: {
          adServerCatId: undefined
        },
        video: {
          context: ADPOD,
          durationSeconds: 15,
          durationBucket: 15
        }
      };
      let bidResponse2 = {
        adId: 'nocat_ad2',
        auctionId: 'no_category_abc345',
        mediaType: 'video',
        cpm: 15,
        pbMg: '15.00',
        adserverTargeting: {
          hb_pb: '15.00'
        },
        meta: {
          adServerCatId: undefined
        },
        video: {
          context: ADPOD,
          durationSeconds: 15,
          durationBucket: 15
        }
      };

      let bidderRequest = {
        adUnitCode: 'adpod_4',
        auctionId: 'no_category_abc345',
        mediaTypes: {
          video: {
            context: ADPOD,
            playerSize: [300, 300],
            adPodDurationSec: 45,
            durationRangeSec: [15, 30],
            requireExactDuration: false
          }
        }
      };

      callPrebidCacheHook(callbackFn, auctionInstance, bidResponse1, afterBidAddedSpy, bidderRequest);
      callPrebidCacheHook(callbackFn, auctionInstance, bidResponse2, afterBidAddedSpy, bidderRequest);

      expect(callbackResult).to.be.null;
      expect(afterBidAddedSpy.calledTwice).to.equal(true);
      expect(storeStub.calledOnce).to.equal(true);
      expect(auctionBids.length).to.equal(2);
      expect(auctionBids[0].adId).to.equal('nocat_ad1');
      expect(auctionBids[0].customCacheKey).to.exist.and.to.match(/^10\.00_15s_.*/);
      expect(auctionBids[0].adserverTargeting.hb_pb_cat_dur).to.equal('10.00_15s');
      expect(auctionBids[0].adserverTargeting.hb_cache_id).to.exist;
      expect(auctionBids[0].videoCacheKey).to.exist.and.to.equal(auctionBids[0].adserverTargeting.hb_cache_id)
      expect(auctionBids[1].adId).to.equal('nocat_ad2');
      expect(auctionBids[1].customCacheKey).to.exist.and.to.match(/^15\.00_15s_.*/);
      expect(auctionBids[1].adserverTargeting.hb_pb_cat_dur).to.equal('15.00_15s');
      expect(auctionBids[1].adserverTargeting.hb_cache_id).to.exist.and.to.equal(auctionBids[0].adserverTargeting.hb_cache_id);
      expect(auctionBids[1].videoCacheKey).to.exist.and.to.equal(auctionBids[0].adserverTargeting.hb_cache_id)
    });

    it('should not add bid to auction when config adpod.brandCategoryExclusion is true but bid is missing adServerCatId', function() {
      storeStub.callsFake(fakeStoreFn);

      config.setConfig({
        adpod: {
          bidQueueSizeLimit: 2,
          bidQueueTimeDelay: 30,
          deferCaching: false,
          brandCategoryExclusion: true
        }
      });

      let bidResponse1 = {
        adId: 'missingCat_ad1',
        auctionId: 'missing_category_abc345',
        mediaType: 'video',
        cpm: 10,
        meta: {
          adServerCatId: undefined
        },
        video: {
          context: ADPOD,
          durationSeconds: 15,
          durationBucket: 15
        }
      };

      let bidderRequest = {
        adUnitCode: 'adpod_5',
        auctionId: 'missing_category_abc345',
        mediaTypes: {
          video: {
            context: ADPOD,
            playerSize: [300, 300],
            adPodDurationSec: 45,
            durationRangeSec: [15, 30],
            requireExactDuration: false
          }
        }
      };

      callPrebidCacheHook(callbackFn, auctionInstance, bidResponse1, afterBidAddedSpy, bidderRequest);

      expect(callbackResult).to.be.null;
      expect(afterBidAddedSpy.calledOnce).to.equal(true);
      expect(storeStub.called).to.equal(false);
      expect(logWarnStub.calledOnce).to.equal(true);
      expect(auctionBids.length).to.equal(0);
    });

    it('should not add bid to auction when Prebid Cache detects an existing key', function () {
      storeStub.callsFake(function(bids, callback) {
        let payload = [];
        bids.forEach(bid => payload.push({uuid: bid.customCacheKey}));

        // fake a duplicate bid response from PBC (sets an empty string for the uuid)
        payload[1].uuid = '';
        callback(null, payload);
      });

      config.setConfig({
        adpod: {
          bidQueueSizeLimit: 2,
          deferCaching: false,
          brandCategoryExclusion: true
        }
      });

      let bidResponse1 = {
        adId: 'dup_ad_1',
        auctionId: 'duplicate_def123',
        mediaType: 'video',
        cpm: 5,
        pbMg: '5.00',
        adserverTargeting: {
          hb_pb: '5.00'
        },
        meta: {
          adServerCatId: 'tech'
        },
        video: {
          context: ADPOD,
          durationSeconds: 45,
          durationBucket: 45
        }
      };
      let bidResponse2 = {
        adId: 'dup_ad_2',
        auctionId: 'duplicate_def123',
        mediaType: 'video',
        cpm: 5,
        pbMg: '5.00',
        adserverTargeting: {
          hb_pb: '5.00'
        },
        meta: {
          adServerCatId: 'tech'
        },
        video: {
          context: ADPOD,
          durationSeconds: 45,
          durationBucket: 45
        }
      };
      let bidderRequest = {
        adUnitCode: 'adpod_4',
        auctionId: 'duplicate_def123',
        mediaTypes: {
          video: {
            context: ADPOD,
            playerSize: [300, 300],
            adPodDurationSec: 120,
            durationRangeSec: [15, 30, 45],
            requireExactDuration: false
          }
        }
      };

      callPrebidCacheHook(callbackFn, auctionInstance, bidResponse1, afterBidAddedSpy, bidderRequest);
      callPrebidCacheHook(callbackFn, auctionInstance, bidResponse2, afterBidAddedSpy, bidderRequest);

      expect(callbackResult).to.be.null;
      expect(afterBidAddedSpy.calledTwice).to.equal(true);
      expect(storeStub.calledOnce).to.equal(true);
      expect(logInfoStub.calledOnce).to.equal(true);
      expect(auctionBids.length).to.equal(1);
      expect(auctionBids[0].adId).to.equal('dup_ad_1');
      expect(auctionBids[0].customCacheKey).to.exist.and.to.match(/^5\.00_tech_45s_.*/);
      expect(auctionBids[0].adserverTargeting.hb_pb_cat_dur).to.equal('5.00_tech_45s');
      expect(auctionBids[0].adserverTargeting.hb_cache_id).to.exist;
      expect(auctionBids[0].videoCacheKey).to.exist.and.to.equal(auctionBids[0].adserverTargeting.hb_cache_id)
    });

    it('should not add bids to auction if PBC returns an error', function() {
      storeStub.callsFake(function(bids, callback) {
        let payload = [];
        let errmsg = 'invalid json';

        callback(errmsg, payload);
      });

      config.setConfig({
        adpod: {
          bidQueueSizeLimit: 2,
          deferCaching: false,
          brandCategoryExclusion: true
        }
      });

      let bidResponse1 = {
        adId: 'err_ad_1',
        auctionId: 'error_xyz123',
        mediaType: 'video',
        cpm: 5,
        meta: {
          adServerCatId: 'tech'
        },
        video: {
          context: ADPOD,
          durationSeconds: 30,
          durationBucket: 30
        }
      };
      let bidResponse2 = {
        adId: 'err_ad_2',
        auctionId: 'error_xyz123',
        mediaType: 'video',
        cpm: 5,
        meta: {
          adServerCatId: 'tech'
        },
        video: {
          context: ADPOD,
          durationSeconds: 30,
          durationBucket: 30
        }
      };
      let bidderRequest = {
        adUnitCode: 'adpod_5',
        auctionId: 'error_xyz123',
        mediaTypes: {
          video: {
            context: ADPOD,
            playerSize: [300, 300],
            adPodDurationSec: 120,
            durationRangeSec: [15, 30, 45],
            requireExactDuration: false
          }
        }
      };

      callPrebidCacheHook(callbackFn, auctionInstance, bidResponse1, afterBidAddedSpy, bidderRequest);
      callPrebidCacheHook(callbackFn, auctionInstance, bidResponse2, afterBidAddedSpy, bidderRequest);

      expect(doCallbacksIfTimedoutStub.calledTwice).to.equal(true);
      expect(logWarnStub.calledOnce).to.equal(true);
      expect(auctionBids.length).to.equal(0);
    });

    it('should use bid.adserverTargeting.hb_pb when custom price granularity is configured', function() {
      storeStub.callsFake(fakeStoreFn);

      const customConfigObject = {
        'buckets': [{
          'precision': 2, // default is 2 if omitted - means 2.1234 rounded to 2 decimal places = 2.12
          'min': 0,
          'max': 5,
          'increment': 0.01 // from $0 to $5, 1-cent increments
        },
        {
          'precision': 2,
          'min': 5,
          'max': 8,
          'increment': 0.05 // from $5 to $8, round down to the previous 5-cent increment
        },
        {
          'precision': 2,
          'min': 8,
          'max': 40,
          'increment': 0.5 // from $8 to $40, round down to the previous 50-cent increment
        }]
      };
      config.setConfig({
        priceGranularity: customConfigObject,
        adpod: {
          brandCategoryExclusion: true
        }
      });

      let bidResponse1 = {
        adId: 'cat_ad1',
        auctionId: 'test_category_abc345',
        mediaType: 'video',
        cpm: 15,
        pbAg: '15.00',
        pbCg: '15.00',
        pbDg: '15.00',
        pbHg: '15.00',
        pbLg: '5.00',
        pbMg: '15.00',
        adserverTargeting: {
          hb_pb: '15.00',
        },
        meta: {
          adServerCatId: 'test'
        },
        video: {
          context: ADPOD,
          durationSeconds: 15,
          durationBucket: 15
        }
      };

      let bidderRequest = {
        adUnitCode: 'adpod_5',
        auctionId: 'test_category_abc345',
        mediaTypes: {
          video: {
            context: ADPOD,
            playerSize: [300, 300],
            adPodDurationSec: 45,
            durationRangeSec: [15, 30],
            requireExactDuration: false
          }
        }
      };

      callPrebidCacheHook(callbackFn, auctionInstance, bidResponse1, afterBidAddedSpy, bidderRequest);

      expect(callbackResult).to.be.null;
      expect(afterBidAddedSpy.calledOnce).to.equal(true);
      expect(storeStub.called).to.equal(false);
      expect(auctionBids.length).to.equal(1);
    });
  });

  describe('checkAdUnitSetupHook', function () {
    let results;
    let callbackFn = function (adUnits) {
      results = adUnits;
    };

    beforeEach(function () {
      logWarnStub = sinon.stub(utils, 'logWarn');
      results = null;
    });

    afterEach(function() {
      utils.logWarn.restore();
    });

    it('removes an incorrectly setup adpod adunit - required fields are missing', function() {
      let adUnits = [{
        code: 'test1',
        mediaTypes: {
          video: {
            context: ADPOD
          }
        }
      }, {
        code: 'test2',
        mediaTypes: {
          video: {
            context: 'instream'
          }
        }
      }];

      checkAdUnitSetupHook(callbackFn, adUnits);

      expect(results).to.deep.equal([{
        code: 'test2',
        mediaTypes: {
          video: {
            context: 'instream'
          }
        }
      }]);
      expect(logWarnStub.calledOnce).to.equal(true);
    });

    it('removes an incorrectly setup adpod adunit - required fields are using invalid values', function() {
      let adUnits = [{
        code: 'test1',
        mediaTypes: {
          video: {
            context: ADPOD,
            durationRangeSec: [-5, 15, 30, 45],
            adPodDurationSec: 300
          }
        }
      }];

      checkAdUnitSetupHook(callbackFn, adUnits);

      expect(results).to.deep.equal([]);
      expect(logWarnStub.calledOnce).to.equal(true);

      adUnits[0].mediaTypes.video.durationRangeSec = [15, 30, 45];
      adUnits[0].mediaTypes.video.adPodDurationSec = 0;

      checkAdUnitSetupHook(callbackFn, adUnits);

      expect(results).to.deep.equal([]);
      expect(logWarnStub.calledTwice).to.equal(true);
    });

    it('removes an incorrectly setup adpod adunit - attempting to use multi-format adUnit', function() {
      let adUnits = [{
        code: 'multi_test1',
        mediaTypes: {
          banner: {
            sizes: [[300, 250], [300, 600]]
          },
          video: {
            context: 'adpod',
            playerSize: [300, 250],
            durationRangeSec: [15, 30, 45],
            adPodDurationSec: 300
          }
        }
      }];

      checkAdUnitSetupHook(callbackFn, adUnits);

      expect(results).to.deep.equal([]);
      expect(logWarnStub.calledOnce).to.equal(true);
    });

    it('accepts mixed set of adunits', function() {
      let adUnits = [{
        code: 'test3',
        mediaTypes: {
          video: {
            context: ADPOD,
            playerSize: [300, 300],
            adPodDurationSec: 360,
            durationRangeSec: [15, 30, 45],
            requireExactDuration: true
          }
        }
      }, {
        code: 'test4',
        mediaTypes: {
          banner: {
            sizes: [[300, 250]]
          }
        }
      }];

      checkAdUnitSetupHook(callbackFn, adUnits);

      expect(results).to.deep.equal(adUnits);
      expect(logWarnStub.called).to.equal(false);
    });
  });

  describe('checkVideoBidSetupHook', function () {
    let callbackResult;
    let bailResult;
    const callbackFn = {
      call: function(context, bid) {
        callbackResult = bid;
      },
      bail: function(result) {
        bailResult = result;
      }
    }
    const adpodTestBid = {
      video: {
        context: ADPOD,
        durationSeconds: 15,
        durationBucket: 15
      },
      meta: {
        iabSubCatId: 'testCategory_123'
      },
      vastXml: '<VAST>test XML here</VAST>'
    };
    const bidderRequestNoExact = {
      mediaTypes: {
        video: {
          context: ADPOD,
          playerSize: [300, 400],
          durationRangeSec: [15, 45],
          requireExactDuration: false,
          adPodDurationSec: 300
        }
      }
    };
    const bidderRequestWithExact = {
      mediaTypes: {
        video: {
          context: ADPOD,
          playerSize: [300, 400],
          durationRangeSec: [15, 30, 45, 60],
          requireExactDuration: true,
          adPodDurationSec: 300
        }
      }
    };

    beforeEach(function() {
      callbackResult = null;
      bailResult = null;
      config.setConfig({
        cache: {
          url: 'http://test.cache.url/endpoint'
        },
        adpod: {
          brandCategoryExclusion: true
        }
      });
      logWarnStub = sinon.stub(utils, 'logWarn');
      logErrorStub = sinon.stub(utils, 'logError');
    });

    afterEach(function() {
      config.resetConfig();
      logWarnStub.restore();
      logErrorStub.restore();
    })

    it('redirects to original function for non-adpod type video bids', function() {
      let bannerTestBid = {
        mediaType: 'video'
      };
      checkVideoBidSetupHook(callbackFn, bannerTestBid, {}, {}, 'instream');
      expect(callbackResult).to.deep.equal(bannerTestBid);
      expect(bailResult).to.be.null;
      expect(logErrorStub.called).to.equal(false);
    });

    it('returns true when adpod bid is properly setup', function() {
      config.setConfig({
        cache: {
          url: 'http://test.cache.url/endpoint'
        },
        adpod: {
          brandCategoryExclusion: false
        }
      });

      let goodBid = utils.deepClone(adpodTestBid);
      goodBid.meta.iabSubCatId = undefined;
      checkVideoBidSetupHook(callbackFn, goodBid, bidderRequestNoExact, {}, ADPOD);
      expect(callbackResult).to.be.null;
      expect(bailResult).to.equal(true);
      expect(logErrorStub.called).to.equal(false);
    });

    it('returns true when adpod bid is missing iab category while brandCategoryExclusion in config is false', function() {
      let goodBid = utils.deepClone(adpodTestBid);
      checkVideoBidSetupHook(callbackFn, goodBid, bidderRequestNoExact, {}, ADPOD);
      expect(callbackResult).to.be.null;
      expect(bailResult).to.equal(true);
      expect(logErrorStub.called).to.equal(false);
    });

    it('returns false when a required property from an adpod bid is missing', function() {
      function testInvalidAdpodBid(badTestBid, shouldErrorBeLogged) {
        checkVideoBidSetupHook(callbackFn, badTestBid, bidderRequestNoExact, {}, ADPOD);
        expect(callbackResult).to.be.null;
        expect(bailResult).to.equal(false);
        expect(logErrorStub.called).to.equal(shouldErrorBeLogged);
      }

      let noCatBid = utils.deepClone(adpodTestBid);
      noCatBid.meta.iabSubCatId = undefined;
      testInvalidAdpodBid(noCatBid, false);

      let noContextBid = utils.deepClone(adpodTestBid);
      delete noContextBid.video.context;
      testInvalidAdpodBid(noContextBid, false);

      let wrongContextBid = utils.deepClone(adpodTestBid);
      wrongContextBid.video.context = 'instream';
      testInvalidAdpodBid(wrongContextBid, false);

      let noDurationBid = utils.deepClone(adpodTestBid);
      delete noDurationBid.video.durationSeconds;
      testInvalidAdpodBid(noDurationBid, false);

      config.resetConfig();
      let noCacheUrlBid = utils.deepClone(adpodTestBid);
      testInvalidAdpodBid(noCacheUrlBid, true);
    });

    describe('checkBidDuration', function() {
      const basicBid = {
        video: {
          context: ADPOD,
          durationSeconds: 30
        },
        meta: {
          iabSubCatId: 'testCategory_123'
        },
        vastXml: '<VAST/>'
      };

      it('when requireExactDuration is true', function() {
        let goodBid = utils.deepClone(basicBid);
        checkVideoBidSetupHook(callbackFn, goodBid, bidderRequestWithExact, {}, ADPOD);

        expect(callbackResult).to.be.null;
        expect(goodBid.video.durationBucket).to.equal(30);
        expect(bailResult).to.equal(true);
        expect(logWarnStub.called).to.equal(false);

        let badBid = utils.deepClone(basicBid);
        badBid.video.durationSeconds = 14;
        checkVideoBidSetupHook(callbackFn, badBid, bidderRequestWithExact, {}, ADPOD);

        expect(callbackResult).to.be.null;
        expect(badBid.video.durationBucket).to.be.undefined;
        expect(bailResult).to.equal(false);
        expect(logWarnStub.calledOnce).to.equal(true);
      });

      it('when requireExactDuration is false and bids are bucketed properly', function() {
        function testRoundingForGoodBId(bid, bucketValue) {
          checkVideoBidSetupHook(callbackFn, bid, bidderRequestNoExact, {}, ADPOD);
          expect(callbackResult).to.be.null;
          expect(bid.video.durationBucket).to.equal(bucketValue);
          expect(bailResult).to.equal(true);
          expect(logWarnStub.called).to.equal(false);
        }

        let goodBid45 = utils.deepClone(basicBid);
        goodBid45.video.durationSeconds = 45;
        testRoundingForGoodBId(goodBid45, 45);

        let goodBid30 = utils.deepClone(basicBid);
        goodBid30.video.durationSeconds = 30;
        testRoundingForGoodBId(goodBid30, 45);

        let goodBid10 = utils.deepClone(basicBid);
        goodBid10.video.durationSeconds = 10;
        testRoundingForGoodBId(goodBid10, 15);

        let goodBid16 = utils.deepClone(basicBid);
        goodBid16.video.durationSeconds = 16;
        testRoundingForGoodBId(goodBid16, 15);

        let goodBid47 = utils.deepClone(basicBid);
        goodBid47.video.durationSeconds = 47;
        testRoundingForGoodBId(goodBid47, 45);
      });

      it('when requireExactDuration is false and bid duration exceeds listed buckets', function() {
        function testRoundingForBadBid(bid) {
          checkVideoBidSetupHook(callbackFn, bid, bidderRequestNoExact, {}, ADPOD);
          expect(callbackResult).to.be.null;
          expect(bid.video.durationBucket).to.be.undefined;
          expect(bailResult).to.equal(false);
          expect(logWarnStub.called).to.equal(true);
        }

        let badBid100 = utils.deepClone(basicBid);
        badBid100.video.durationSeconds = 100;
        testRoundingForBadBid(badBid100);

        let badBid48 = utils.deepClone(basicBid);
        badBid48.video.durationSeconds = 48;
        testRoundingForBadBid(badBid48);
      });
    });
  });

  describe('adpodSetConfig', function () {
    let logWarnStub;
    beforeEach(function() {
      logWarnStub = sinon.stub(utils, 'logWarn');
    });

    afterEach(function () {
      logWarnStub.restore();
    });

    it('should log a warning when values other than numbers are used in setConfig', function() {
      adpodSetConfig({
        bidQueueSizeLimit: '2',
        bidQueueTimeDelay: '50'
      });
      expect(logWarnStub.calledTwice).to.equal(true);
    });

    it('should log a warning when numbers less than or equal to zero are used in setConfig', function() {
      adpodSetConfig({
        bidQueueSizeLimit: 0,
        bidQueueTimeDelay: -2
      });
      expect(logWarnStub.calledTwice).to.equal(true);
    });

    it('should not log any warning when using a valid config', function() {
      adpodSetConfig({
        bidQueueSizeLimit: 10
      });
      expect(logWarnStub.called).to.equal(false);

      adpodSetConfig({
        bidQueueTimeDelay: 100,
        bidQueueSizeLimit: 20
      });
      expect(logWarnStub.called).to.equal(false);
    })
  });

  describe('adpod utils', function() {
    it('should sort bids array', function() {
      let bids = [{
        cpm: 10.12345,
        adserverTargeting: {
          hb_pb: '10.00',
        },
        video: {
          durationBucket: 15
        }
      }, {
        cpm: 15,
        adserverTargeting: {
          hb_pb: '15.00',
        },
        video: {
          durationBucket: 15
        }
      }, {
        cpm: 15.00,
        adserverTargeting: {
          hb_pb: '15.00',
        },
        video: {
          durationBucket: 30
        }
      }, {
        cpm: 5.45,
        adserverTargeting: {
          hb_pb: '5.00',
        },
        video: {
          durationBucket: 5
        }
      }, {
        cpm: 20.1234567,
        adserverTargeting: {
          hb_pb: '20.10',
        },
        video: {
          durationBucket: 60
        }
      }]
      bids.sort(sortByPricePerSecond);
      let sortedBids = [{
        cpm: 15,
        adserverTargeting: {
          hb_pb: '15.00',
        },
        video: {
          durationBucket: 15
        }
      }, {
        cpm: 5.45,
        adserverTargeting: {
          hb_pb: '5.00',
        },
        video: {
          durationBucket: 5
        }
      }, {
        cpm: 10.12345,
        adserverTargeting: {
          hb_pb: '10.00',
        },
        video: {
          durationBucket: 15
        }
      }, {
        cpm: 15.00,
        adserverTargeting: {
          hb_pb: '15.00',
        },
        video: {
          durationBucket: 30
        }
      }, {
        cpm: 20.1234567,
        adserverTargeting: {
          hb_pb: '20.10',
        },
        video: {
          durationBucket: 60
        }
      }]
      expect(bids).to.include.deep.ordered.members(sortedBids);
    });
  })
});
