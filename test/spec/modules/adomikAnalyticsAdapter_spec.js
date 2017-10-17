import adomikAnalytics from 'modules/adomikAnalyticsAdapter';
import {expect} from 'chai';
let events = require('src/events');
let adaptermanager = require('src/adaptermanager');
let constants = require('src/constants.json');

describe('Adomik Prebid Analytic', function () {
  describe('enableAnalytics', function () {
    beforeEach(() => {
      sinon.spy(adomikAnalytics, 'track');
      sinon.spy(adomikAnalytics, 'sendTypedEvent');
    });

    afterEach(() => {
      adomikAnalytics.track.restore();
      adomikAnalytics.sendTypedEvent.restore();
    });

    it('should catch all events', function (done) {
      adaptermanager.registerAnalyticsAdapter({
        code: 'adomik',
        adapter: adomikAnalytics
      });

      const initOptions = {
        id: '123456',
        url: 'testurl',
      };

      const bid = {
        bidderCode: 'adomik_test_bid',
        width: 10,
        height: 10,
        statusMessage: 'Bid available',
        adId: '1234',
        requestId: '',
        responseTimestamp: 1496410856397,
        requestTimestamp: 1496410856295,
        cpm: 0.1,
        bidder: 'biddertest',
        adUnitCode: '0000',
        timeToRespond: 100,
        placementCode: 'placementtest'
      }

      // Step 1: Initialize adapter
      adaptermanager.enableAnalytics({
        provider: 'adomik',
        options: initOptions
      });
      expect(adomikAnalytics.currentContext).to.deep.equal({
        uid: '123456',
        url: 'testurl',
        debug: undefined,
        id: '',
        timeouted: false,
        timeout: 0,
      });

      // Step 1: Send init auction event
      events.emit(constants.EVENTS.AUCTION_INIT, {config: initOptions, requestId: 'test-test-test', timeout: 3000});

      expect(adomikAnalytics.currentContext).to.deep.equal({
        uid: '123456',
        url: 'testurl',
        debug: undefined,
        id: 'test-test-test',
        timeouted: false,
        timeout: 3000,
      });

      // Step 2: Send bid requested event
      events.emit(constants.EVENTS.BID_REQUESTED, { bids: [bid] });

      expect(adomikAnalytics.bucketEvents.length).to.equal(1);
      expect(adomikAnalytics.bucketEvents[0]).to.deep.equal({
        type: 'request',
        event: {
          bidder: 'BIDDERTEST',
          placementCode: 'placementtest',
        }
      });

      // Step 3: Send bid response event
      events.emit(constants.EVENTS.BID_RESPONSE, bid);

      expect(adomikAnalytics.bucketEvents.length).to.equal(2);
      expect(adomikAnalytics.bucketEvents[1]).to.deep.equal({
        type: 'response',
        event: {
          bidder: 'ADOMIK_TEST_BID',
          placementCode: '0000',
          id: '1234',
          status: 'VALID',
          cpm: 0.1,
          size: {
            width: 10,
            height: 10
          },
          timeToRespond: 100,
          afterTimeout: false,
        }
      });

      // Step 4: Send bid won event
      events.emit(constants.EVENTS.BID_WON, bid);

      expect(adomikAnalytics.bucketEvents.length).to.equal(3);
      expect(adomikAnalytics.bucketEvents[2]).to.deep.equal({
        type: 'winner',
        event: {
          id: '1234',
          placementCode: '0000',
        }
      });

      // Step 5: Send bid timeout event
      events.emit(constants.EVENTS.BID_TIMEOUT, {});

      expect(adomikAnalytics.currentContext.timeouted).to.equal(true);

      // Step 6: Send auction end event
      var clock = sinon.useFakeTimers();
      events.emit(constants.EVENTS.AUCTION_END, {});

      setTimeout(function() {
        sinon.assert.callCount(adomikAnalytics.sendTypedEvent, 1);
        done();
      }, 3000);

      clock.tick(5000);
      clock.restore();

      sinon.assert.callCount(adomikAnalytics.track, 6);
    });
  });
});
