import adomikAnalytics from 'modules/adomikAnalyticsAdapter.js';
import {expect} from 'chai';
let events = require('src/events');
let adapterManager = require('src/adapterManager').default;
let constants = require('src/constants.json');

describe('Adomik Prebid Analytic', function () {
  let sendEventStub;
  let sendWonEventStub;
  let clock;
  before(function () {
    clock = sinon.useFakeTimers();
  });
  after(function () {
    clock.restore();
  });

  describe('enableAnalytics', function () {
    beforeEach(function () {
      sinon.spy(adomikAnalytics, 'track');
      sendEventStub = sinon.stub(adomikAnalytics, 'sendTypedEvent');
      sendWonEventStub = sinon.stub(adomikAnalytics, 'sendWonEvent');
      sinon.stub(events, 'getEvents').returns([]);
    });

    afterEach(function () {
      adomikAnalytics.track.restore();
      sendEventStub.restore();
      sendWonEventStub.restore();
      events.getEvents.restore();
    });

    after(function () {
      adomikAnalytics.disableAnalytics();
    });

    it('should catch all events', function (done) {
      adapterManager.registerAnalyticsAdapter({
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
        auctionId: '',
        responseTimestamp: 1496410856397,
        requestTimestamp: 1496410856295,
        cpm: 0.1,
        bidder: 'biddertest',
        adUnitCode: '0000',
        timeToRespond: 100,
        placementCode: 'placementtest'
      }

      // Step 1: Initialize adapter
      adapterManager.enableAnalytics({
        provider: 'adomik',
        options: initOptions
      });
      expect(adomikAnalytics.currentContext).to.deep.equal({
        uid: '123456',
        url: 'testurl',
        id: '',
        timeouted: false
      });

      // Step 2: Send init auction event
      events.emit(constants.EVENTS.AUCTION_INIT, {config: initOptions, auctionId: 'test-test-test'});

      expect(adomikAnalytics.currentContext).to.deep.equal({
        uid: '123456',
        url: 'testurl',
        id: 'test-test-test',
        timeouted: false
      });

      // Step 3: Send bid requested event
      events.emit(constants.EVENTS.BID_REQUESTED, { bids: [bid] });

      expect(adomikAnalytics.bucketEvents.length).to.equal(1);
      expect(adomikAnalytics.bucketEvents[0]).to.deep.equal({
        type: 'request',
        event: {
          bidder: 'BIDDERTEST',
          placementCode: 'placementtest',
        }
      });

      // Step 4: Send bid response event
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

      // Step 5: Send bid won event
      events.emit(constants.EVENTS.BID_WON, bid);

      expect(adomikAnalytics.bucketEvents.length).to.equal(2);

      // Step 6: Send bid timeout event
      events.emit(constants.EVENTS.BID_TIMEOUT, {});

      expect(adomikAnalytics.currentContext.timeouted).to.equal(true);

      // Step 7: Send auction end event
      events.emit(constants.EVENTS.AUCTION_END, {});

      setTimeout(function() {
        sinon.assert.callCount(sendEventStub, 1);
        sinon.assert.callCount(sendWonEventStub, 1);
        done();
      }, 3000);

      clock.tick(5000);

      sinon.assert.callCount(adomikAnalytics.track, 6);
    });
  });
});
