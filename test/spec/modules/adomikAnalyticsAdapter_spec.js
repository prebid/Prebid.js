import adomikAnalytics from 'modules/adomikAnalyticsAdapter';
let events = require('src/events');
let adaptermanager = require('src/adaptermanager');
let constants = require('src/constants.json');

describe('Adomik Prebid Analytic', function () {
  describe('enableAnalytics', function () {
    it('should catch all events', function () {
      sinon.spy(adomikAnalytics, 'track');

      adaptermanager.registerAnalyticsAdapter({
        code: 'adomik',
        adapter: adomikAnalytics
      });

      const options = {
        id: '123456',
        url: 'testurl'
      };

      adaptermanager.enableAnalytics({
        provider: 'adomik',
        options
      });

      const bid = {
        bidderCode: 'adomik_test_bid',
        width: 10,
        height: 10,
        statusMessage: 'Bid available',
        adId: '',
        requestId: '',
        responseTimestamp: 1496410856397,
        requestTimestamp: 1496410856295,
        cpm: 0,
        bidder: '',
        adUnitCode: '',
        timeToRespond: 100
      }

      events.emit(constants.EVENTS.AUCTION_INIT, {config: options, requestId: 'test-test-test', timeout: 3000});
      events.emit(constants.EVENTS.BID_REQUESTED, { bids: [bid] });
      events.emit(constants.EVENTS.BID_RESPONSE, bid);
      events.emit(constants.EVENTS.BID_WON, bid);
      events.emit(constants.EVENTS.BID_TIMEOUT, {});
      events.emit(constants.EVENTS.AUCTION_END, {});

      sinon.assert.callCount(adomikAnalytics.track, 6);
    });
  });
});
