import adomikAnalytics from 'modules/adomikAnalyticsAdapter.js';
import { expect } from 'chai';

let events = require('src/events');
let adapterManager = require('src/adapterManager').default;
let constants = require('src/constants.json');

describe('Adomik Prebid Analytic', function () {
  let sendEventStub;
  let sendWonEventStub;
  let clock;

  beforeEach(function () {
    clock = sinon.useFakeTimers();
    sinon.spy(adomikAnalytics, 'track');
    sendEventStub = sinon.stub(adomikAnalytics, 'sendTypedEvent');
    sendWonEventStub = sinon.stub(adomikAnalytics, 'sendWonEvent');
    sinon.stub(events, 'getEvents').returns([]);
    adomikAnalytics.currentContext = undefined;

    adapterManager.registerAnalyticsAdapter({
      code: 'adomik',
      adapter: adomikAnalytics
    });
  });

  afterEach(function () {
    adomikAnalytics.disableAnalytics();
    clock.restore();
    adomikAnalytics.track.restore();
    sendEventStub.restore();
    sendWonEventStub.restore();
    events.getEvents.restore();
  });

  describe('adomikAnalytics.enableAnalytics', function () {
    it('should catch all events', function (done) {
      const initOptions = {
        id: '123456',
        url: 'testurl'
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
        sampling: undefined,
        id: '',
        timeouted: false
      });

      // Step 2: Send init auction event
      events.emit(constants.EVENTS.AUCTION_INIT, {config: initOptions, auctionId: 'test-test-test'});

      expect(adomikAnalytics.currentContext).to.deep.equal({
        uid: '123456',
        url: 'testurl',
        sampling: undefined,
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
          placementCode: '0000',
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

    describe('when sampling is undefined', function () {
      beforeEach(function() {
        adapterManager.enableAnalytics({
          provider: 'adomik',
          options: { id: '123456', url: 'testurl' }
        });
      });

      it('is enabled', function () {
        expect(adomikAnalytics.currentContext).is.not.null;
      });
    });

    describe('when sampling is 0', function () {
      beforeEach(function() {
        adapterManager.enableAnalytics({
          provider: 'adomik',
          options: { id: '123456', url: 'testurl', sampling: 0 }
        });
      });

      it('is disabled', function () {
        expect(adomikAnalytics.currentContext).to.equal(undefined);
      });
    });

    describe('when sampling is 1', function () {
      beforeEach(function() {
        adapterManager.enableAnalytics({
          provider: 'adomik',
          options: { id: '123456', url: 'testurl', sampling: 1 }
        });
      });

      it('is enabled', function () {
        expect(adomikAnalytics.currentContext).is.not.null;
      });
    });

    describe('when options is not defined', function () {
      beforeEach(function() {
        adapterManager.enableAnalytics({ provider: 'adomik' });
      });

      it('is disabled', function () {
        expect(adomikAnalytics.currentContext).to.equal(undefined);
      });
    });

    describe('when id is not defined in options', function () {
      beforeEach(function() {
        adapterManager.enableAnalytics({ provider: 'adomik', url: 'xxx' });
      });

      it('is disabled', function () {
        expect(adomikAnalytics.currentContext).to.equal(undefined);
      });
    });

    describe('when url is not defined in options', function () {
      beforeEach(function() {
        adapterManager.enableAnalytics({ provider: 'adomik', id: 'xxx' });
      });

      it('is disabled', function () {
        expect(adomikAnalytics.currentContext).to.equal(undefined);
      });
    });
  });

  describe('adomikAnalytics.getKeyValues', function () {
    it('returns [undefined, undefined]', function () {
      let [testId, testValue] = adomikAnalytics.getKeyValues()
      expect(testId).to.equal(undefined);
      expect(testValue).to.equal(undefined);
    });

    describe('when test is in scope', function () {
      beforeEach(function () {
        sessionStorage.setItem(window.location.hostname + '_AdomikTestInScope', true);
      });

      it('returns [undefined, undefined]', function () {
        let [testId, testValue] = adomikAnalytics.getKeyValues()
        expect(testId).to.equal(undefined);
        expect(testValue).to.equal(undefined);
      });

      describe('when key values are defined', function () {
        beforeEach(function () {
          sessionStorage.setItem(window.location.hostname + '_AdomikTest', '{"testId":"12345","testOptionLabel":"1000"}');
        });

        it('returns key values', function () {
          let [testId, testValue] = adomikAnalytics.getKeyValues()
          expect(testId).to.equal('12345');
          expect(testValue).to.equal('1000');
        });

        describe('when preventTest is on', function () {
          beforeEach(function () {
            sessionStorage.setItem(window.location.hostname + '_NoAdomikTest', true);
          });

          it('returns [undefined, undefined]', function () {
            let [testId, testValue] = adomikAnalytics.getKeyValues()
            expect(testId).to.equal(undefined);
            expect(testValue).to.equal(undefined);
          });
        });
      });
    });
  });
});
