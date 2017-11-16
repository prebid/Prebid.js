import roxotAnalytic from 'modules/roxotAnalyticsAdapter';
import {assert} from 'chai';
import constants from 'src/constants.json'
import events from 'src/events'
import adaptermanager from 'src/adaptermanager'

let auctionStartEvent = {
  'timestamp': 1507811035953,
  'requestId': '0000-0000-0001',
};

let bidRequestedEvent = {
  'bidderCode': 'brealtime',
  'requestId': '0000-0000-0001',
  'bids': [
    {
      'bidder': 'brealtime',
      'placementCode': 'div-gpt-ad-1',
      'requestId': '0000-0000-0001',
    },
    {
      'bidder': 'brealtime',
      'placementCode': 'div-gpt-ad-2',
      'requestId': '0000-0000-0001',
    },
    {
      'bidder': 'brealtime',
      'placementCode': 'div-gpt-ad-3',
      'requestId': '0000-0000-0001',
    },
  ],
  'start': 1507811035954,
  'auctionStart': 1507811035953,
  'timeout': 2000
};
let bidAdjustmentEmpty = {
  'bidderCode': 'brealtime',
  'width': 0,
  'height': 0,
  'requestId': '0000-0000-0001',
  'cpm': 0,
  'adUnitCode': 'div-gpt-ad-1',
  'timeToRespond': 601
};
let bidAdjustmentNonEmpty = {
  'bidderCode': 'brealtime',
  'width': 100,
  'height': 100,
  'requestId': '0000-0000-0001',
  'cpm': 7,
  'adUnitCode': 'div-gpt-ad-1',
  'timeToRespond': 720
};
let bidAdjustmentWin = {
  'bidderCode': 'brealtime',
  'width': 100,
  'height': 300,
  'requestId': '0000-0000-0001',
  'cpm': 10,
  'adUnitCode': 'div-gpt-ad-3',
  'timeToRespond': 300
};
let bidWon = {
  'bidderCode': 'brealtime',
  'width': 100,
  'height': 300,
  'requestId': '0000-0000-0001',
  'cpm': 10,
  'adUnitCode': 'div-gpt-ad-3',
  'timeToRespond': 300
};
let bidAdjustmentAfterAuctionEnd = {
  'bidderCode': 'brealtime',
  'width': 200,
  'height': 200,
  'requestId': '0000-0000-0001',
  'cpm': 22,
  'bidder': 'brealtime',
  'adUnitCode': 'div-gpt-ad-1',
  'timeToRespond': 5601
};

adaptermanager.registerAnalyticsAdapter({
  code: 'roxot',
  adapter: roxotAnalytic
});

adaptermanager.enableAnalytics({
  provider: 'roxot',
  options: {
    publisherIds: ['000-001'],
    host: 'example.com',
  }
});

describe('Roxot Prebid Analytic', function () {
  describe('enableAnalytics', function () {
    beforeEach(() => {
      sinon.spy(roxotAnalytic.transport, 'send');

      events.emit(constants.EVENTS.AUCTION_INIT, auctionStartEvent);
      events.emit(constants.EVENTS.BID_REQUESTED, bidRequestedEvent);
      events.emit(constants.EVENTS.BID_ADJUSTMENT, bidAdjustmentEmpty);
      events.emit(constants.EVENTS.BID_ADJUSTMENT, bidAdjustmentNonEmpty);
      events.emit(constants.EVENTS.BID_ADJUSTMENT, bidAdjustmentNonEmpty);
      events.emit(constants.EVENTS.BID_ADJUSTMENT, bidAdjustmentWin);
      events.emit(constants.EVENTS.AUCTION_END);
      events.emit(constants.EVENTS.BID_ADJUSTMENT, bidAdjustmentAfterAuctionEnd);
      events.emit(constants.EVENTS.BID_WON, bidWon);
    });

    afterEach(() => {
      roxotAnalytic.transport.send.restore();
      roxotAnalytic.requestStack.clear();
    });

    it('should sent all events', function () {
      assert.equal(roxotAnalytic.transport.send.callCount, 3);
    });

    it('should contain all auction info', function () {
      let auctionEvent = roxotAnalytic.transport.send.getCall(0).args[0]['div-gpt-ad-1'];
      let extendData = auctionEvent.data;
      let auctionInfo = auctionEvent.auctionInfo;

      assert.equal(auctionEvent.eventType, 'AdUnitAuctionEvent');

      assert.equal(Object.keys(extendData.utmTagData).indexOf('utm_source') !== -1, true);
      assert.equal(Object.keys(extendData.utmTagData).indexOf('utm_medium') !== -1, true);
      assert.equal(Object.keys(extendData.utmTagData).indexOf('utm_campaign') !== -1, true);
      assert.equal(Object.keys(extendData.utmTagData).indexOf('utm_term') !== -1, true);
      assert.equal(Object.keys(extendData.utmTagData).indexOf('utm_content') !== -1, true);
      assert.equal(extendData.sessionId !== undefined, true);

      assert.equal(auctionInfo.publisherId, '000-001');
      assert.equal(auctionInfo.adUnitCode, 'div-gpt-ad-1');
      assert.equal(auctionInfo.host, 'example.com');

      assert.equal(Object.keys(auctionInfo.requestedBids).length, 1);
      assert.equal(auctionInfo.bids.length, 4);
    });

    it('should contain correct bid with price', function () {
      let auctionEvent = roxotAnalytic.transport.send.getCall(0).args[0];
      let nonEmptyBid = auctionEvent['div-gpt-ad-1'].auctionInfo.bids[1];

      assert.equal(nonEmptyBid.size, '100x100');
      assert.equal(nonEmptyBid.cpm, 7);
      assert.equal(nonEmptyBid.timeToRespond, 720);
      assert.equal(nonEmptyBid.bidder.bidderCode, 'brealtime');
      assert.equal(nonEmptyBid.bidder.source, '');
    });

    it('should sent BidAfterTimeout', function () {
      let bidAfterTimeoutEvent = roxotAnalytic.transport.send.getCall(1).args[0]['div-gpt-ad-1'];

      assert.equal(bidAfterTimeoutEvent.eventType, 'BidAfterTimeoutEvent');
      assert.equal(bidAfterTimeoutEvent.auctionInfo.bids.length, 4);
      assert.equal(bidAfterTimeoutEvent.data.cpm, 22);
      assert.equal(bidAfterTimeoutEvent.data.size, '200x200');
      assert.equal(bidAfterTimeoutEvent.data.adUnitCode, 'div-gpt-ad-1');
      assert.equal(bidAfterTimeoutEvent.data.timeToRespond, 5601);
      assert.equal(bidAfterTimeoutEvent.data.bidder.bidderCode, 'brealtime');
    });

    it('should send correct Impression', function () {
      let impressionEvent = roxotAnalytic.transport.send.getCall(2).args[0]['div-gpt-ad-3'];

      assert.equal(impressionEvent.eventType, 'AdUnitImpressionEvent');
      assert.equal(impressionEvent.auctionInfo.bids.length, 1);
      assert.equal(impressionEvent.data.cpm, 10);
      assert.equal(impressionEvent.data.size, '100x300');
      assert.equal(impressionEvent.data.adUnitCode, 'div-gpt-ad-3');
      assert.equal(impressionEvent.data.timeToRespond, 300);
      assert.equal(impressionEvent.data.bidder.bidderCode, 'brealtime');
    });
  });
});
