import sinon from 'sinon';
import {expect} from 'chai';
import {default as conversantAnalytics, CNVR_CONSTANTS, cnvrHelper} from 'modules/conversantAnalyticsAdapter';
import * as utils from 'src/utils.js';
import * as prebidGlobal from 'src/prebidGlobal';

import constants from 'src/constants.json'

let events = require('src/events');

describe('Conversant analytics adapter tests', function() {
  let sandbox; // sinon sandbox to make restoring all stubbed objects easier
  let xhr; // xhr stub from sinon for capturing data sent via ajax
  let clock; // clock stub from sinon to mock our cache cleanup interval

  const PREBID_VERSION = '1.2';
  const SITE_ID = 108060;

  let requests = [];
  const DATESTAMP = Date.now();

  const VALID_CONFIGURATION = {
    options: {
      site_id: SITE_ID
    }
  };

  const VALID_ALWAYS_SAMPLE_CONFIG = {
    options: {
      site_id: SITE_ID,
      cnvr_sampling: 1
    }
  };

  beforeEach(function () {
    sandbox = sinon.sandbox.create();
    sandbox.stub(events, 'getEvents').returns([]); // need to stub this otherwise unwanted events seem to get fired during testing
    xhr = sandbox.useFakeXMLHttpRequest(); // allows us to capture ajax requests
    xhr.onCreate = function (req) { requests.push(req); }; // save ajax requests in a private array for testing purposes
    let getGlobalStub = {
      version: PREBID_VERSION,
      getUserIds: function() { // userIdTargeting.js init() gets called on AUCTION_END so we need to mock this function.
        return {};
      }
    };
    sandbox.stub(prebidGlobal, 'getGlobal').returns(getGlobalStub); // getGlobal does not seem to be available in testing so need to mock it
    clock = sandbox.useFakeTimers(DATESTAMP); // to use sinon fake timers they MUST be created before the interval/timeout is created in the code you are testing.
  });

  afterEach(function () {
    sandbox.restore();
    requests = []; // clean up any requests in our ajax request capture array.
  });

  describe('Initialization Tests', function() {
    it('should log error if site id is not passed', function() {
      sandbox.stub(utils, 'logError');

      conversantAnalytics.enableAnalytics();
      expect(utils.logError.calledWith(CNVR_CONSTANTS.LOG_PREFIX + 'siteId is required.')).to.be.true;
      conversantAnalytics.disableAnalytics();
    });

    it('should not log error if valid config is passed', function() {
      sandbox.stub(utils, 'logError');
      sandbox.stub(utils, 'logInfo');

      conversantAnalytics.enableAnalytics(VALID_CONFIGURATION);
      expect(utils.logError.called).to.equal(false);
      expect(utils.logInfo.called).to.equal(true);
      expect(
        utils.logInfo.calledWith(
          CNVR_CONSTANTS.LOG_PREFIX + 'Conversant sample rate set to ' + CNVR_CONSTANTS.DEFAULT_SAMPLE_RATE
        )
      ).to.be.true;
      expect(
        utils.logInfo.calledWith(
          CNVR_CONSTANTS.LOG_PREFIX + 'Global sample rate set to 1'
        )
      ).to.be.true;
      conversantAnalytics.disableAnalytics();
    });

    it('should sample when sampling set to 1', function() {
      sandbox.stub(utils, 'logError');
      conversantAnalytics.enableAnalytics(VALID_ALWAYS_SAMPLE_CONFIG);
      expect(utils.logError.called).to.equal(false);
      expect(cnvrHelper.doSample).to.equal(true);
      conversantAnalytics.disableAnalytics();
    });

    it('should NOT sample when sampling set to 0', function() {
      sandbox.stub(utils, 'logError');
      const NEVER_SAMPLE_CONFIG = utils.deepClone(VALID_ALWAYS_SAMPLE_CONFIG);
      NEVER_SAMPLE_CONFIG['options'].cnvr_sampling = 0;
      conversantAnalytics.enableAnalytics(NEVER_SAMPLE_CONFIG);
      expect(utils.logError.called).to.equal(false);
      expect(cnvrHelper.doSample).to.equal(false);
      conversantAnalytics.disableAnalytics();
    });
  });

  describe('Helper Function Tests', function() {
    it('should cleanup up cache objects', function() {
      conversantAnalytics.enableAnalytics(VALID_CONFIGURATION);

      cnvrHelper.adIdLookup['keep'] = {timeReceived: DATESTAMP + 1};
      cnvrHelper.adIdLookup['delete'] = {timeReceived: DATESTAMP - CNVR_CONSTANTS.MAX_MILLISECONDS_IN_CACHE};

      cnvrHelper.timeoutCache['keep'] = {timeReceived: DATESTAMP + 1};
      cnvrHelper.timeoutCache['delete'] = {timeReceived: DATESTAMP - CNVR_CONSTANTS.MAX_MILLISECONDS_IN_CACHE};

      cnvrHelper.auctionIdTimestampCache['keep'] = {timeReceived: DATESTAMP + 1};
      cnvrHelper.auctionIdTimestampCache['delete'] = {timeReceived: DATESTAMP - CNVR_CONSTANTS.MAX_MILLISECONDS_IN_CACHE};

      expect(Object.keys(cnvrHelper.adIdLookup)).to.have.lengthOf(2);
      expect(Object.keys(cnvrHelper.timeoutCache)).to.have.lengthOf(2);
      expect(Object.keys(cnvrHelper.auctionIdTimestampCache)).to.have.lengthOf(2);

      clock.tick(CNVR_CONSTANTS.CACHE_CLEANUP_TIME_IN_MILLIS);
      expect(Object.keys(cnvrHelper.adIdLookup)).to.have.lengthOf(1);
      expect(Object.keys(cnvrHelper.timeoutCache)).to.have.lengthOf(1);
      expect(Object.keys(cnvrHelper.auctionIdTimestampCache)).to.have.lengthOf(1);

      conversantAnalytics.disableAnalytics();

      // After disable we should cleanup the cache
      expect(Object.keys(cnvrHelper.adIdLookup)).to.have.lengthOf(0);
      expect(Object.keys(cnvrHelper.timeoutCache)).to.have.lengthOf(0);
      expect(Object.keys(cnvrHelper.auctionIdTimestampCache)).to.have.lengthOf(0);
    });

    it('createBid() should return correct object', function() {
      const EVENT_CODE = 1;
      const TIME = 2;
      let bid = cnvrHelper.createBid(EVENT_CODE, 2);
      expect(bid).to.deep.equal({'eventCodes': [EVENT_CODE], 'timeToRespond': TIME});
    });

    it('createAdUnit() should return correct object', function() {
      let adUnit = cnvrHelper.createAdUnit();
      expect(adUnit).to.deep.equal({
        sizes: [],
        mediaTypes: [],
        bids: {}
      });
    });

    it('createAdSize() should return correct object', function() {
      let adSize = cnvrHelper.createAdSize(1, 2);
      expect(adSize).to.deep.equal({w: 1, h: 2});

      adSize = cnvrHelper.createAdSize();
      expect(adSize).to.deep.equal({w: -1, h: -1});

      adSize = cnvrHelper.createAdSize('foo', 'bar');
      expect(adSize).to.deep.equal({w: -1, h: -1});
    });

    it('getLookupKey() should return correct object', function() {
      let key = cnvrHelper.getLookupKey(undefined, undefined, undefined);
      expect(key).to.equal('undefined-undefined-undefined');

      key = cnvrHelper.getLookupKey('foo', 'bar', 'baz');
      expect(key).to.equal('foo-bar-baz');
    });

    it('createPayload() should return correct object', function() {
      const REQUEST_TYPE = 'foo';
      const AUCTION_ID = '124 abc';
      const myDate = Date.now();
      conversantAnalytics.enableAnalytics(VALID_ALWAYS_SAMPLE_CONFIG);

      let payload = cnvrHelper.createPayload(REQUEST_TYPE, AUCTION_ID, myDate);
      expect(payload).to.deep.equal({
        cnvrSampleRate: 1,
        globalSampleRate: 1,
        requestType: REQUEST_TYPE,
        auction: {
          auctionId: AUCTION_ID,
          auctionTimestamp: myDate,
          sid: VALID_ALWAYS_SAMPLE_CONFIG.options.site_id,
          preBidVersion: PREBID_VERSION
        },
        adUnits: {}
      });

      conversantAnalytics.disableAnalytics();
    });

    it('keyExistsAndIsObject() should return correct data', function() {
      let data = {
        a: [],
        b: 1,
        c: 'foo',
        d: function () { return true; },
        e: {}
      };
      expect(cnvrHelper.keyExistsAndIsObject(data, 'foobar')).to.be.false;
      expect(cnvrHelper.keyExistsAndIsObject(data, 'a')).to.be.false;
      expect(cnvrHelper.keyExistsAndIsObject(data, 'b')).to.be.false;
      expect(cnvrHelper.keyExistsAndIsObject(data, 'c')).to.be.false;
      expect(cnvrHelper.keyExistsAndIsObject(data, 'd')).to.be.false;
      expect(cnvrHelper.keyExistsAndIsObject(data, 'e')).to.be.true;
    });

    it('deduplicateArray() should return correct data', function () {
      let arrayOfObjects = [{w: 1, h: 2}, {w: 2, h: 3}, {w: 1, h: 2}];
      let array = [3, 2, 1, 1, 2, 3];
      let empty;
      let notArray = 3;
      let emptyArray = [];

      expect(JSON.stringify(cnvrHelper.deduplicateArray(array))).to.equal(JSON.stringify([3, 2, 1]));
      expect(JSON.stringify(cnvrHelper.deduplicateArray(arrayOfObjects))).to.equal(JSON.stringify([{w: 1, h: 2}, {w: 2, h: 3}]));
      expect(JSON.stringify(cnvrHelper.deduplicateArray(emptyArray))).to.equal(JSON.stringify([]));
      expect(cnvrHelper.deduplicateArray(empty)).to.be.undefined;
      expect(cnvrHelper.deduplicateArray(notArray)).to.equal(notArray);
    });

    it('getSampleRate() should return correct data', function () {
      let obj = {
        sampling: 1,
        cnvr_sampling: 0.5,
        too_big: 1.2,
        too_small: -1,
        string: 'foo',
        object: {},
      }
      const DEFAULT_VAL = 0.11;
      expect(cnvrHelper.getSampleRate(obj, 'sampling', DEFAULT_VAL)).to.equal(1);
      expect(cnvrHelper.getSampleRate(obj, 'cnvr_sampling', DEFAULT_VAL)).to.equal(0.5);
      expect(cnvrHelper.getSampleRate(obj, 'too_big', DEFAULT_VAL)).to.equal(DEFAULT_VAL);
      expect(cnvrHelper.getSampleRate(obj, 'string', DEFAULT_VAL)).to.equal(DEFAULT_VAL);
      expect(cnvrHelper.getSampleRate(obj, 'object', DEFAULT_VAL)).to.equal(DEFAULT_VAL);
      expect(cnvrHelper.getSampleRate(obj, 'not_a_key', DEFAULT_VAL)).to.equal(DEFAULT_VAL);
      expect(cnvrHelper.getSampleRate(obj, 'too_small', DEFAULT_VAL)).to.equal(0);
    });
  });

  describe('Bid Timeout Event Tests', function() {
    const BID_TIMEOUT_PAYLOAD = [{
      'bidId': '80882409358b8a8',
      'bidder': 'conversant',
      'adUnitCode': 'MedRect',
      'auctionId': 'afbd6e0b-e45b-46ab-87bf-c0bac0cb8881'
    }, {
      'bidId': '9da4c107a6f24c8',
      'bidder': 'conversant',
      'adUnitCode': 'Leaderboard',
      'auctionId': 'afbd6e0b-e45b-46ab-87bf-c0bac0cb8881'
    }];

    beforeEach(function () {
      conversantAnalytics.enableAnalytics(VALID_ALWAYS_SAMPLE_CONFIG);
    });

    afterEach(function () {
      conversantAnalytics.disableAnalytics();
    });

    it('should put both items in timeout cache', function() {
      expect(Object.keys(cnvrHelper.timeoutCache)).to.have.lengthOf(0);
      events.emit(constants.EVENTS.BID_TIMEOUT, BID_TIMEOUT_PAYLOAD);
      expect(Object.keys(cnvrHelper.timeoutCache)).to.have.lengthOf(2);

      BID_TIMEOUT_PAYLOAD.forEach(timeoutBid => {
        const key = cnvrHelper.getLookupKey(timeoutBid.auctionId, timeoutBid.adUnitCode, timeoutBid.bidder);
        expect(cnvrHelper.timeoutCache[key].timeReceived).to.not.be.undefined;
      });
      expect(requests).to.have.lengthOf(0);
    });
  });

  describe('Render Failed Tests', function() {
    const RENDER_FAILED_PAYLOAD = {
      reason: 'reason',
      message: 'value',
      adId: '57e03aeafd83a68'
    };

    const RENDER_FAILED_PAYLOAD_NO_ADID = {
      reason: 'reason',
      message: 'value'
    };

    beforeEach(function () {
      conversantAnalytics.enableAnalytics(VALID_ALWAYS_SAMPLE_CONFIG);
    });

    afterEach(function () {
      conversantAnalytics.disableAnalytics();
    });

    it('should empty adIdLookup and send data', function() {
      cnvrHelper.adIdLookup[RENDER_FAILED_PAYLOAD.adId] = {
        bidderCode: 'bidderCode',
        adUnitCode: 'adUnitCode',
        auctionId: 'auctionId',
        timeReceived: Date.now()
      };

      expect(Object.keys(cnvrHelper.adIdLookup)).to.have.lengthOf(1);
      events.emit(constants.EVENTS.AD_RENDER_FAILED, RENDER_FAILED_PAYLOAD);
      expect(Object.keys(cnvrHelper.adIdLookup)).to.have.lengthOf(0); // object should be removed
      expect(requests).to.have.lengthOf(1);
      const data = JSON.parse(requests[0].requestBody);

      expect(data.auction.auctionId).to.equal('auctionId');
      expect(data.auction.preBidVersion).to.equal(PREBID_VERSION);
      expect(data.auction.sid).to.equal(SITE_ID);
      expect(data.adUnits['adUnitCode'].bids['bidderCode'][0].eventCodes.includes(CNVR_CONSTANTS.RENDER_FAILED)).to.be.true;
      expect(data.adUnits['adUnitCode'].bids['bidderCode'][0].message).to.have.lengthOf.above(0);
    });

    it('should not send data if no adId', function() {
      cnvrHelper.adIdLookup[RENDER_FAILED_PAYLOAD.adId] = {
        bidderCode: 'bidderCode',
        adUnitCode: 'adUnitCode',
        auctionId: 'auctionId',
        timeReceived: Date.now()
      };

      expect(Object.keys(cnvrHelper.adIdLookup)).to.have.lengthOf(1);
      events.emit(constants.EVENTS.AD_RENDER_FAILED, RENDER_FAILED_PAYLOAD_NO_ADID);
      expect(requests).to.have.lengthOf(0);
      expect(Object.keys(cnvrHelper.adIdLookup)).to.have.lengthOf(1); // same object in cache as before... no change
      expect(cnvrHelper.adIdLookup[RENDER_FAILED_PAYLOAD.adId]).to.not.be.undefined;
    });

    it('should not send data if bad data in lookup', function() {
      cnvrHelper.adIdLookup[RENDER_FAILED_PAYLOAD.adId] = {
        bidderCode: 'bidderCode',
        auctionId: 'auctionId',
        timeReceived: Date.now()
      };
      expect(requests).to.have.lengthOf(0);
      expect(Object.keys(cnvrHelper.adIdLookup)).to.have.lengthOf(1);
      events.emit(constants.EVENTS.AD_RENDER_FAILED, RENDER_FAILED_PAYLOAD);
      expect(Object.keys(cnvrHelper.adIdLookup)).to.have.lengthOf(0); // object should be removed but no call made to send data
      expect(requests).to.have.lengthOf(0);
    });
  });

  describe('Bid Won Tests', function() {
    const GOOD_BID_WON_ARGS = {
      bidderCode: 'conversant',
      width: 300,
      height: 250,
      statusMessage: 'Bid available',
      adId: '57e03aeafd83a68',
      requestId: '2c2a5485a076898',
      mediaType: 'banner',
      source: 'client',
      currency: 'USD',
      cpm: 4,
      creativeId: '29123_55016759',
      ttl: 300,
      netRevenue: true,
      ad: '<foobar add goes here />',
      originalCpm: 0.04,
      originalCurrency: 'USD',
      auctionId: '85e1bf44-4035-4e24-bd3c-b1ba367fe294',
      responseTimestamp: 1583851418626,
      requestTimestamp: 1583851418292,
      bidder: 'conversant',
      adUnitCode: 'div-gpt-ad-1460505748561-0',
      timeToRespond: 334,
      pbLg: '4.00',
      pbMg: '4.00',
      pbHg: '4.00',
      pbAg: '4.00',
      pbDg: '4.00',
      pbCg: '',
      size: '300x250',
      adserverTargeting: {
        hb_bidder: 'conversant',
        hb_adid: '57e03aeafd83a68',
        hb_pb: '4.00',
        hb_size: '300x250',
        hb_source: 'client',
        hb_format: 'banner'
      },
      status: 'rendered',
      params: [
        {
          site_id: '108060'
        }
      ]
    };

    // no adUnitCode, auctionId or bidderCode will cause a failure
    const BAD_BID_WON_ARGS = {
      bidderCode: 'conversant',
      width: 300,
      height: 250,
      statusMessage: 'Bid available',
      adId: '57e03aeafd83a68',
      requestId: '2c2a5485a076898',
      mediaType: 'banner',
      source: 'client',
      currency: 'USD',
      cpm: 4,
      originalCpm: 0.04,
      originalCurrency: 'USD',
      bidder: 'conversant',
      adUnitCode: 'div-gpt-ad-1460505748561-0',
      size: '300x250',
      status: 'rendered',
      params: [
        {
          site_id: '108060'
        }
      ]
    };

    beforeEach(function () {
      conversantAnalytics.enableAnalytics(VALID_ALWAYS_SAMPLE_CONFIG);
    });

    afterEach(function () {
      conversantAnalytics.disableAnalytics();
    });

    it('should not send data or put a record in adIdLookup when bad data provided', function() {
      expect(requests).to.have.lengthOf(0);
      expect(Object.keys(cnvrHelper.adIdLookup)).to.have.lengthOf(0);
      events.emit(constants.EVENTS.BID_WON, BAD_BID_WON_ARGS);
      expect(requests).to.have.lengthOf(0);
      expect(Object.keys(cnvrHelper.adIdLookup)).to.have.lengthOf(0);
    });

    it('should send data and put a record in adIdLookup', function() {
      const myAuctionStart = Date.now();
      cnvrHelper.auctionIdTimestampCache[GOOD_BID_WON_ARGS.auctionId] = {timeReceived: myAuctionStart};

      expect(requests).to.have.lengthOf(0);
      expect(Object.keys(cnvrHelper.adIdLookup)).to.have.lengthOf(0);
      events.emit(constants.EVENTS.BID_WON, GOOD_BID_WON_ARGS);

      // Check that adIdLookup was set correctly
      expect(Object.keys(cnvrHelper.adIdLookup)).to.have.lengthOf(1);
      expect(cnvrHelper.adIdLookup[GOOD_BID_WON_ARGS.adId].auctionId).to.equal(GOOD_BID_WON_ARGS.auctionId);
      expect(cnvrHelper.adIdLookup[GOOD_BID_WON_ARGS.adId].adUnitCode).to.equal(GOOD_BID_WON_ARGS.adUnitCode);
      expect(cnvrHelper.adIdLookup[GOOD_BID_WON_ARGS.adId].bidderCode).to.equal(GOOD_BID_WON_ARGS.bidderCode);
      expect(cnvrHelper.adIdLookup[GOOD_BID_WON_ARGS.adId].timeReceived).to.not.be.undefined;

      expect(requests).to.have.lengthOf(1);
      const data = JSON.parse(requests[0].requestBody);
      expect(data.requestType).to.equal('bid_won');
      expect(data.auction.auctionId).to.equal(GOOD_BID_WON_ARGS.auctionId);
      expect(data.auction.preBidVersion).to.equal(PREBID_VERSION);
      expect(data.auction.sid).to.equal(VALID_ALWAYS_SAMPLE_CONFIG.options.site_id);
      expect(data.auction.auctionTimestamp).to.equal(myAuctionStart);

      expect(typeof data.adUnits).to.equal('object');
      expect(Object.keys(data.adUnits)).to.have.lengthOf(1);

      expect(Object.keys(data.adUnits[GOOD_BID_WON_ARGS.adUnitCode].bids)).to.have.lengthOf(1);
      expect(data.adUnits[GOOD_BID_WON_ARGS.adUnitCode].bids[GOOD_BID_WON_ARGS.bidderCode][0].eventCodes.includes(CNVR_CONSTANTS.WIN)).to.be.true;
      expect(data.adUnits[GOOD_BID_WON_ARGS.adUnitCode].bids[GOOD_BID_WON_ARGS.bidderCode][0].cpm).to.equal(GOOD_BID_WON_ARGS.cpm);
      expect(data.adUnits[GOOD_BID_WON_ARGS.adUnitCode].bids[GOOD_BID_WON_ARGS.bidderCode][0].originalCpm).to.equal(GOOD_BID_WON_ARGS.originalCpm);
      expect(data.adUnits[GOOD_BID_WON_ARGS.adUnitCode].bids[GOOD_BID_WON_ARGS.bidderCode][0].currency).to.equal(GOOD_BID_WON_ARGS.currency);
      expect(data.adUnits[GOOD_BID_WON_ARGS.adUnitCode].bids[GOOD_BID_WON_ARGS.bidderCode][0].timeToRespond).to.equal(GOOD_BID_WON_ARGS.timeToRespond);
      expect(data.adUnits[GOOD_BID_WON_ARGS.adUnitCode].bids[GOOD_BID_WON_ARGS.bidderCode][0].adSize.w).to.equal(GOOD_BID_WON_ARGS.width);
      expect(data.adUnits[GOOD_BID_WON_ARGS.adUnitCode].bids[GOOD_BID_WON_ARGS.bidderCode][0].adSize.h).to.equal(GOOD_BID_WON_ARGS.height);
    });
  });

  describe('Auction End Tests', function() {
    const AUCTION_END_PAYLOAD = {
      auctionId: '85e1bf44-4035-4e24-bd3c-b1ba367fe294',
      timestamp: 1583851418288,
      auctionEnd: 1583851418628,
      auctionStatus: 'completed',
      adUnits: [
        {
          code: 'div-gpt-ad-1460505748561-0',
          mediaTypes: {
            banner: {
              sizes: [
                [300, 250],
                [100, 200]
              ]
            }
          },
          bids: [
            {
              bidder: 'appnexus',
              params: {
                placementId: 13144370
              }
            },
            {
              bidder: 'conversant',
              params: {
                site_id: '108060'
              }
            }
          ],
          sizes: [
            [300, 250],
            [100, 200]
          ],
          transactionId: '5fa8a7d7-2a73-4d1c-b73a-ff9f5b53ba17'
        },
        {
          code: 'div-gpt-ad-1460505748561-0',
          mediaTypes: {
            banner: {
              sizes: [
                [300, 250],
                [100, 200]
              ]
            },
            video: {
              playerSize: [
                [300, 250],
                [600, 400]
              ]
            }
          },
          sizes: [
            [300, 250],
            [100, 200],
            [600, 400]
          ],
          bids: [
            {
              bidder: 'appnexus',
              params: {
                placementId: 13144370
              }
            },
            {
              bidder: 'conversant',
              params: {
                site_id: '108060'
              }
            }
          ],
          transactionId: '5fa8a7d7-2a73-4d1c-b73a-ff9f5b53ba18'
        },
        {
          code: 'div-gpt-ad-1460505748561-1',
          mediaTypes: {
            native: {
              type: 'image'
            }
          },
          bids: [
            {
              bidder: 'appnexus',
              params: {
                placementId: 13144371
              }
            }
          ],
          transactionId: '5fa8a7d7-2a73-4d1c-b73a-ff9f5b53ba10'
        }
      ],
      adUnitCodes: [
        'div-gpt-ad-1460505748561-0'
      ],
      bidderRequests: [
        {
          bidderCode: 'conversant',
          auctionId: '85e1bf44-4035-4e24-bd3c-b1ba367fe294',
          bidderRequestId: '13f16db358d4c58',
          bids: [
            {
              bidder: 'conversant',
              params: {
                site_id: '108060'
              },
              mediaTypes: {
                banner: {
                  sizes: [
                    [
                      300,
                      250
                    ]
                  ]
                }
              },
              adUnitCode: 'div-gpt-ad-1460505748561-0',
              transactionId: '5fa8a7d7-2a73-4d1c-b73a-ff9f5b53ba17',
              sizes: [
                [
                  300,
                  250
                ]
              ],
              bidId: '2c2a5485a076898',
              bidderRequestId: '13f16db358d4c58',
              auctionId: '85e1bf44-4035-4e24-bd3c-b1ba367fe294',
              src: 'client',
              bidRequestsCount: 1,
              bidderRequestsCount: 1,
              bidderWinsCount: 0
            }
          ],
          auctionStart: 1583851418288,
          timeout: 3000,
          refererInfo: {
            referer: 'http://localhost:9999/integrationExamples/gpt/hello_analytics1.html',
            reachedTop: true,
            numIframes: 0,
            stack: [
              'http://localhost:9999/integrationExamples/gpt/hello_analytics1.html'
            ]
          },
          start: 1583851418292
        },
        {
          bidderCode: 'appnexus',
          auctionId: '85e1bf44-4035-4e24-bd3c-b1ba367fe294',
          bidderRequestId: '3e8179f67f31b98',
          bids: [
            {
              bidder: 'appnexus',
              params: {
                placementId: 13144370
              },
              mediaTypes: {
                banner: {
                  sizes: [
                    [
                      300,
                      250
                    ]
                  ]
                }
              },
              adUnitCode: 'div-gpt-ad-1460505748561-0',
              transactionId: '5fa8a7d7-2a73-4d1c-b73a-ff9f5b53ba17',
              sizes: [
                [
                  300,
                  250
                ]
              ],
              bidId: '40a1d3ac6b79668',
              bidderRequestId: '3e8179f67f31b98',
              auctionId: '85e1bf44-4035-4e24-bd3c-b1ba367fe294',
              src: 'client',
              bidRequestsCount: 1,
              bidderRequestsCount: 1,
              bidderWinsCount: 0
            },
            {
              bidder: 'appnexus',
              params: {
                placementId: 13144370
              },
              mediaTypes: {
                native: {
                  type: 'image'
                }
              },
              adUnitCode: 'div-gpt-ad-1460505748561-1',
              transactionId: '5fa8a7d7-2a73-4d1c-b73a-ff9f5b53ba17',
              sizes: [],
              bidId: '40a1d3ac6b79668',
              bidderRequestId: '3e8179f67f31b98',
              auctionId: '85e1bf44-4035-4e24-bd3c-b1ba367fe294',
              src: 'client',
              bidRequestsCount: 1,
              bidderRequestsCount: 1,
              bidderWinsCount: 0
            }
          ],
          auctionStart: 1583851418288,
          timeout: 3000,
          refererInfo: {
            referer: 'http://localhost:9999/integrationExamples/gpt/hello_analytics1.html',
            reachedTop: true,
            numIframes: 0,
            stack: [
              'http://localhost:9999/integrationExamples/gpt/hello_analytics1.html'
            ]
          },
          start: 1583851418295
        }
      ],
      noBids: [
        {
          bidder: 'appnexus',
          params: {
            placementId: 13144370
          },
          mediaTypes: {
            banner: {
              sizes: [
                [
                  300,
                  250
                ]
              ]
            }
          },
          adUnitCode: 'div-gpt-ad-1460505748561-0',
          transactionId: '5fa8a7d7-2a73-4d1c-b73a-ff9f5b53ba17',
          sizes: [
            [
              300,
              250
            ]
          ],
          bidId: '40a1d3ac6b79668',
          bidderRequestId: '3e8179f67f31b98',
          auctionId: '85e1bf44-4035-4e24-bd3c-b1ba367fe294',
          src: 'client',
          bidRequestsCount: 1,
          bidderRequestsCount: 1,
          bidderWinsCount: 0
        }
      ],
      bidsReceived: [
        {
          bidderCode: 'conversant',
          width: 300,
          height: 250,
          statusMessage: 'Bid available',
          adId: '57e03aeafd83a68',
          requestId: '2c2a5485a076898',
          mediaType: 'banner',
          source: 'client',
          currency: 'USD',
          cpm: 4,
          creativeId: '29123_55016759',
          ttl: 300,
          netRevenue: true,
          ad: '<foobar add goes here />',
          originalCpm: 0.04,
          originalCurrency: 'USD',
          auctionId: '85e1bf44-4035-4e24-bd3c-b1ba367fe294',
          responseTimestamp: 1583851418626,
          requestTimestamp: 1583851418292,
          bidder: 'conversant',
          adUnitCode: 'div-gpt-ad-1460505748561-0',
          timeToRespond: 334,
          pbLg: '4.00',
          pbMg: '4.00',
          pbHg: '4.00',
          pbAg: '4.00',
          pbDg: '4.00',
          pbCg: '',
          size: '300x250',
          adserverTargeting: {
            hb_bidder: 'conversant',
            hb_adid: '57e03aeafd83a68',
            hb_pb: '4.00',
            hb_size: '300x250',
            hb_source: 'client',
            hb_format: 'banner'
          }
        }, {
          bidderCode: 'conversant',
          height: 100,
          statusMessage: 'Bid available',
          width: 200,
          adId: '57e03aeafd83a68',
          requestId: '2c2a5485a076898',
          mediaType: 'banner',
          source: 'client',
          currency: 'USD',
          cpm: 4,
          creativeId: '29123_55016759',
          ttl: 300,
          netRevenue: true,
          ad: '<foobar add goes here />',
          originalCpm: 0.04,
          originalCurrency: 'USD',
          auctionId: '85e1bf44-4035-4e24-bd3c-b1ba367fe294',
          responseTimestamp: 1583851418626,
          requestTimestamp: 1583851418292,
          bidder: 'conversant',
          adUnitCode: 'div-gpt-ad-1460505748561-0',
          timeToRespond: 334,
          pbLg: '4.00',
          pbMg: '4.00',
          pbHg: '4.00',
          pbAg: '4.00',
          pbDg: '4.00',
          pbCg: '',
          size: '100x200',
          adserverTargeting: {
            hb_bidder: 'conversant',
            hb_adid: '57e03aeafd83a68',
            hb_pb: '4.00',
            hb_size: '300x250',
            hb_source: 'client',
            hb_format: 'banner'
          }
        }, {
          bidderCode: 'appnexus',
          statusMessage: 'Bid available',
          adId: '57e03aeafd83a68',
          requestId: '2c2a5485a076898',
          mediaType: 'native',
          source: 'client',
          currency: 'USD',
          cpm: 4,
          creativeId: '29123_55016759',
          ttl: 300,
          netRevenue: true,
          ad: '<foobar add goes here />',
          originalCpm: 0.04,
          originalCurrency: 'USD',
          auctionId: '85e1bf44-4035-4e24-bd3c-b1ba367fe294',
          responseTimestamp: 1583851418626,
          requestTimestamp: 1583851418292,
          bidder: 'appnexus',
          adUnitCode: 'div-gpt-ad-1460505748561-1',
          timeToRespond: 334,
          pbLg: '4.00',
          pbMg: '4.00',
          pbHg: '4.00',
          pbAg: '4.00',
          pbDg: '4.00',
          pbCg: '',
          adserverTargeting: {
            hb_bidder: 'appnexus',
            hb_adid: '57e03aeafd83a68',
            hb_pb: '4.00',
            hb_size: '300x250',
            hb_source: 'client',
            hb_format: 'banner'
          }
        }
      ],
      winningBids: [],
      timeout: 3000
    };

    beforeEach(function () {
      conversantAnalytics.enableAnalytics(VALID_ALWAYS_SAMPLE_CONFIG);
    });

    afterEach(function () {
      conversantAnalytics.disableAnalytics();
    });

    it('should not do anything when auction id doesnt exist', function() {
      sandbox.stub(utils, 'logError');

      let BAD_ARGS = JSON.parse(JSON.stringify(AUCTION_END_PAYLOAD));
      delete BAD_ARGS.auctionId;
      expect(requests).to.have.lengthOf(0);
      events.emit(constants.EVENTS.AUCTION_END, BAD_ARGS);
      expect(requests).to.have.lengthOf(0);
      expect(
        utils.logError.calledWith(
          CNVR_CONSTANTS.LOG_PREFIX + 'onAuctionEnd(): No auctionId in args supplied so unable to process event.'
        )
      ).to.be.true;
    });

    it('should send the expected data', function() {
      sandbox.stub(utils, 'logError');
      sandbox.stub(utils, 'logWarn'); /* .callsFake((arg, arg1, arg2) => { //debugging stuff
        console.error(arg);
        if (arg1) console.error(arg1);
        if (arg2) console.error(arg2);
      }); */
      expect(requests).to.have.lengthOf(0);
      const AUCTION_ID = AUCTION_END_PAYLOAD.auctionId;
      const AD_UNIT_CODE = AUCTION_END_PAYLOAD.adUnits[0].code;
      const AD_UNIT_CODE_NATIVE = AUCTION_END_PAYLOAD.adUnits[2].code;
      const timeoutKey = cnvrHelper.getLookupKey(AUCTION_ID, AD_UNIT_CODE, 'appnexus');
      cnvrHelper.timeoutCache[timeoutKey] = { timeReceived: Date.now() };
      expect(Object.keys(cnvrHelper.timeoutCache)).to.have.lengthOf(1);
      expect(utils.logError.called).to.equal(false);
      expect(Object.keys(cnvrHelper.auctionIdTimestampCache)).to.have.lengthOf(0);

      events.emit(constants.EVENTS.AUCTION_END, AUCTION_END_PAYLOAD);
      expect(utils.logError.called).to.equal(false);
      expect(requests).to.have.lengthOf(1);
      expect(Object.keys(cnvrHelper.timeoutCache)).to.have.lengthOf(0);
      expect(Object.keys(cnvrHelper.auctionIdTimestampCache)).to.have.lengthOf(1);
      expect(cnvrHelper.auctionIdTimestampCache[AUCTION_END_PAYLOAD.auctionId].timeReceived).to.equal(AUCTION_END_PAYLOAD.timestamp);

      const data = JSON.parse(requests[0].requestBody);
      expect(data.requestType).to.equal('auction_end');
      expect(data.auction.auctionId).to.equal(AUCTION_ID);
      expect(data.auction.preBidVersion).to.equal(PREBID_VERSION);
      expect(data.auction.sid).to.equal(VALID_ALWAYS_SAMPLE_CONFIG.options.site_id);

      expect(Object.keys(data.adUnits)).to.have.lengthOf(2);

      expect(data.adUnits[AD_UNIT_CODE].sizes).to.have.lengthOf(3);
      expect(data.adUnits[AD_UNIT_CODE].sizes[0].w).to.equal(300);
      expect(data.adUnits[AD_UNIT_CODE].sizes[0].h).to.equal(250);
      expect(data.adUnits[AD_UNIT_CODE].sizes[1].w).to.equal(100);
      expect(data.adUnits[AD_UNIT_CODE].sizes[1].h).to.equal(200);
      expect(data.adUnits[AD_UNIT_CODE].sizes[2].w).to.equal(600);
      expect(data.adUnits[AD_UNIT_CODE].sizes[2].h).to.equal(400);

      expect(data.adUnits[AD_UNIT_CODE].mediaTypes).to.have.lengthOf(2);
      expect(data.adUnits[AD_UNIT_CODE].mediaTypes[0]).to.equal('banner');
      expect(data.adUnits[AD_UNIT_CODE].mediaTypes[1]).to.equal('video');

      expect(data.adUnits[AD_UNIT_CODE_NATIVE].mediaTypes).to.have.lengthOf(1);
      expect(data.adUnits[AD_UNIT_CODE_NATIVE].mediaTypes[0]).to.equal('native');
      expect(data.adUnits[AD_UNIT_CODE_NATIVE].sizes).to.have.lengthOf(0);

      expect(Object.keys(data.adUnits[AD_UNIT_CODE].bids)).to.have.lengthOf(2);
      const cnvrBidsArray = data.adUnits[AD_UNIT_CODE].bids['conversant'];
      // testing multiple bids from same bidder
      expect(cnvrBidsArray).to.have.lengthOf(2);
      expect(cnvrBidsArray[0].eventCodes.includes(CNVR_CONSTANTS.BID)).to.be.true;
      expect(cnvrBidsArray[0].cpm).to.equal(4);
      expect(cnvrBidsArray[0].originalCpm).to.equal(0.04);
      expect(cnvrBidsArray[0].currency).to.equal('USD');
      expect(cnvrBidsArray[0].timeToRespond).to.equal(334);
      expect(cnvrBidsArray[0].adSize.w).to.equal(300);
      expect(cnvrBidsArray[0].adSize.h).to.equal(250);
      expect(cnvrBidsArray[0].mediaType).to.equal('banner');
      // 2nd bid different size
      expect(cnvrBidsArray[1].eventCodes.includes(CNVR_CONSTANTS.BID)).to.be.true;
      expect(cnvrBidsArray[1].cpm).to.equal(4);
      expect(cnvrBidsArray[1].originalCpm).to.equal(0.04);
      expect(cnvrBidsArray[1].currency).to.equal('USD');
      expect(cnvrBidsArray[1].timeToRespond).to.equal(334);
      expect(cnvrBidsArray[1].adSize.w).to.equal(200);
      expect(cnvrBidsArray[1].adSize.h).to.equal(100);
      expect(cnvrBidsArray[1].mediaType).to.equal('banner');

      const apnBidsArray = data.adUnits[AD_UNIT_CODE].bids['appnexus'];
      expect(apnBidsArray).to.have.lengthOf(2);
      let apnBid = apnBidsArray[0];
      expect(apnBid.originalCpm).to.be.undefined;
      expect(apnBid.eventCodes.includes(CNVR_CONSTANTS.TIMEOUT)).to.be.true;
      expect(apnBid.cpm).to.be.undefined;
      expect(apnBid.currency).to.be.undefined;
      expect(apnBid.timeToRespond).to.equal(3000);
      expect(apnBid.adSize).to.be.undefined;
      expect(apnBid.mediaType).to.be.undefined;
      apnBid = apnBidsArray[1];
      expect(apnBid.originalCpm).to.be.undefined;
      expect(apnBid.eventCodes.includes(CNVR_CONSTANTS.NO_BID)).to.be.true;
      expect(apnBid.cpm).to.be.undefined;
      expect(apnBid.currency).to.be.undefined;
      expect(apnBid.timeToRespond).to.equal(0);
      expect(apnBid.adSize).to.be.undefined;
      expect(apnBid.mediaType).to.be.undefined;

      expect(Object.keys(data.adUnits[AD_UNIT_CODE_NATIVE].bids)).to.have.lengthOf(1);
      const apnNativeBidsArray = data.adUnits[AD_UNIT_CODE_NATIVE].bids['appnexus'];
      expect(apnNativeBidsArray).to.have.lengthOf(1);
      const apnNativeBid = apnNativeBidsArray[0];
      expect(apnNativeBid.eventCodes.includes(CNVR_CONSTANTS.BID)).to.be.true;
      expect(apnNativeBid.cpm).to.equal(4);
      expect(apnNativeBid.originalCpm).to.equal(0.04);
      expect(apnNativeBid.currency).to.equal('USD');
      expect(apnNativeBid.timeToRespond).to.equal(334);
      expect(apnNativeBid.adSize.w).to.be.undefined;
      expect(apnNativeBid.adSize.h).to.be.undefined;
      expect(apnNativeBid.mediaType).to.equal('native');
    });
  });
});
