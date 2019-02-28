import sonobiAnalytics from 'modules/sonobiAnalyticsAdapter';
import {expect} from 'chai';
let events = require('src/events');
let adapterManager = require('src/adapterManager').default;
let constants = require('src/constants.json');

describe('Sonobi Prebid Analytic', function () {
  let sendDataStub;
  let xhr;
  let requests = [];
  describe('enableAnalytics', function () {
    beforeEach(function () {
		requests = [];
      // sendDataStub = sinon.stub(sonobiAnalytics, 'sendData');
      xhr = sinon.useFakeXMLHttpRequest();
      xhr.onCreate = request => requests.push(request);
      sinon.stub(events, 'getEvents').returns([]);
    });

    afterEach(function () {
    xhr.restore();
      events.getEvents.restore();
    });

    after(function () {
      sonobiAnalytics.disableAnalytics();
    });

    it('should catch all events', function (done) {
      adapterManager.registerAnalyticsAdapter({
        code: 'sonobi',
        adapter: sonobiAnalytics
      });

      const initOptions = {
        pubId: 'A3B254F',
        siteId: '1234',
        delay: 100
      };

      const bid = {
        bidderCode: 'sonobi_test_bid',
        width: 300,
        height: 250,
        statusMessage: 'Bid available',
        adId: '1234',
        auctionId: '13',
        responseTimestamp: 1496410856397,
        requestTimestamp: 1496410856295,
        cpm: 1.13,
        bidder: 'sonobi',
        adUnitCode: 'dom-sample-id',
        timeToRespond: 100,
        placementCode: 'placementtest'
      }

      // Step 1: Initialize adapter
      adapterManager.enableAnalytics({
        provider: 'sonobi',
        options: initOptions
      });

      // Step 2: Send init auction event
      events.emit(constants.EVENTS.AUCTION_INIT, {config: initOptions, auctionId: '13'});

      expect(sonobiAnalytics.initOptions).to.have.property('pubId', 'A3B254F');
      expect(sonobiAnalytics.initOptions).to.have.property('siteId', '1234');
      expect(sonobiAnalytics.initOptions).to.have.property('delay', 100);
      // Step 3: Send bid requested event
      events.emit(constants.EVENTS.BID_REQUESTED, { bids: [bid] });

      // Step 4: Send bid response event
      events.emit(constants.EVENTS.BID_RESPONSE, bid);

      // expect(sonobiAnalytics.bucketEvents.length).to.equal(2);

      // Step 5: Send bid won event
      events.emit(constants.EVENTS.BID_WON, bid);

      // expect(sonobiAnalytics.bucketEvents.length).to.equal(2);

      // Step 6: Send bid timeout event
      events.emit(constants.EVENTS.BID_TIMEOUT, {auctionId: '13'});

      // expect(sonobiAnalytics.currentContext.timeouted).to.equal(true);

      // Step 7: Send auction end event
      var clock = sinon.useFakeTimers();
      events.emit(constants.EVENTS.AUCTION_END, {auctionId: '13', bidsReceived: [bid]});

      setTimeout(function() {
        expect(requests).to.have.length(3);
        done();
      }, 3000);

      clock.tick(5000);
      clock.restore();
    });
  });
});
