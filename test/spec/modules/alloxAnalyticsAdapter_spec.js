import alloxAnalyticsAdapter, { storage, STORAGE_KEY } from 'modules/alloxAnalyticsAdapter.js';
import { expect } from 'chai';
import adapterManager from 'src/adapterManager.js';
import { EVENTS } from 'src/constants.js';
import * as utils from 'src/utils.js';

let events = require('src/events');
let sinon = require('sinon');

describe('allox analytics adapter', function () {
  let adUnitId = '9361d2b7-38da-4900-9713-0bc765f7b36b';
  let mockTrackers = {
    [adUnitId]: {
      trackers: [
        {
          type: 1,
          url: 'https://alxl-s.allox-s.allox.d2c.ne.jp/529833ce55314b19e8796116/imp',
          method: 'GET'
        },
        {
          type: 1,
          url: 'https://alxl-s.allox-s.allox.d2c.ne.jp/prebid/imp',
          method: 'GET'
        },
        {
          type: 101,
          url: 'https://alxl-s.allox-s.allox.d2c.ne.jp/529833ce55314b19e8796116/lose_101',
          method: 'GET'
        },
        {
          type: 102,
          url: 'https://alxl-s.allox-s.allox.d2c.ne.jp/xdp/v1/notify/lose_102?wprice=${ALLOX:AUCTION_PRICE}&wcur=${ALLOX:AUCTION_CURRENCY}',
          method: 'GET'
        }
      ],
      lurl: 'https://alxl-s.allox-s.allox.d2c.ne.jp/xdp/v1/notify/lose?wprice=${ALLOX:AUCTION_PRICE}&wcur=${ALLOX:AUCTION_CURRENCY}',
      date: 1736236376718
    }
  };
  let wonBid;
  let triggerPixelStub;
  let replaceMacro = (url) => {
    return url.replace('${ALLOX:AUCTION_PRICE}', wonBid.originalCpm).replace('${ALLOX:AUCTION_CURRENCY}', wonBid.originalCurrency);
  };

  before(function () {
    storage.setDataInLocalStorage(STORAGE_KEY, JSON.stringify(mockTrackers));
  });

  beforeEach(function () {
    wonBid = {
      'adId': '11a0ac97879de06',
      'adUnitId': adUnitId,
      'mediaType': 'banner',
      'requestId': '10feb9ccd60c8e9',
      'cpm': 20,
      'creativeId': '529833ce55314b19e8796116_1385706446',
      'currency': 'JPY',
      'netRevenue': true,
      'ttl': 300,
      'auctionId': '1e221e41-c811-462b-8def-fea6ecc4d5eb',
      'statusMessage': 'Bid available',
      'responseTimestamp': 1736988970347,
      'requestTimestamp': 1736988970123,
      'bidder': 'allox',
      'adUnitCode': 'banner-test',
      'timeToRespond': 218,
      'size': '300x250',
      'status': 'rendered',
      'trackers': mockTrackers[adUnitId].trackers,
      'originalCpm': 20,
      'originalCurrency': 'JPY',
      'lurl': 'https://alxl-s.allox-s.allox.d2c.ne.jp/xdp/v1/notify/lose?wprice=${ALLOX:AUCTION_PRICE}&wcur=${ALLOX:AUCTION_CURRENCY}',
    };
    adapterManager.enableAnalytics({
      provider: 'allox'
    });
    sinon.stub(events, 'getEvents').returns([]);
    sinon.spy(alloxAnalyticsAdapter, 'onBidWon');
    triggerPixelStub = sinon.stub(utils, 'triggerPixel');
  });

  afterEach(function () {
    utils.triggerPixel.restore();
    events.getEvents.restore();
    alloxAnalyticsAdapter.onBidWon.restore();
    alloxAnalyticsAdapter.disableAnalytics();
  });

  describe('allox bid adapter with bid response', function () {
    describe('win allox', function() {
      it('should fire tracker type 101 url on bid won', function() {
        events.emit(EVENTS.BID_WON, wonBid);
        const type101Tracker = mockTrackers[adUnitId].trackers.find(tracker => tracker.type === 101);
        expect(triggerPixelStub.args[0]).to.include(type101Tracker.url);
        expect(triggerPixelStub.callCount).to.equal(1);
      });
    });

    describe('lose allox', function() {
      it('should fire allox bid response lurl on bid won', function() {
        wonBid.bidder = 'otherBidder';
        events.emit(EVENTS.BID_WON, wonBid);
        const lurl = replaceMacro(wonBid.lurl);
        expect(triggerPixelStub.args[0]).to.include(lurl);
        expect(triggerPixelStub.callCount).to.equal(2);
      });

      it('should fire tracker type 102 url on bid won', function() {
        wonBid.bidder = 'otherBidder';
        events.emit(EVENTS.BID_WON, wonBid);
        const type102Tracker = mockTrackers[adUnitId].trackers.find(tracker => tracker.type === 102);
        const lurl = replaceMacro(type102Tracker.url);
        expect(triggerPixelStub.args[1]).to.include(lurl);
        expect(triggerPixelStub.callCount).to.equal(2);
      });
    });
  });

  describe('allox bid adapter without bid response', function () {
    describe('lose allox', function() {
      it('should fire tracker type 102 url on bid won', function() {
        wonBid.bidder = 'otherBidder';
        events.emit(EVENTS.BID_WON, wonBid);
        const type102Tracker = mockTrackers[adUnitId].trackers.find(tracker => tracker.type === 102);
        const lurl = replaceMacro(type102Tracker.url);
        expect(triggerPixelStub.args[1]).to.include(lurl);
        expect(triggerPixelStub.callCount).to.equal(2);
      });
    });
  });
});
