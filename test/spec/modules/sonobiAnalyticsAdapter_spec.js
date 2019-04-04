import sonobiAnalytics from 'modules/sonobiAnalyticsAdapter';
import {expect} from 'chai';
let events = require('src/events');
let adapterManager = require('src/adapterManager').default;
let constants = require('src/constants.json');

describe('Sonobi Prebid Analytic', function () {
  let xhr;
  let requests = [];
  var clock;

  describe('enableAnalytics', function () {
    beforeEach(function () {
      requests = [];
      xhr = sinon.useFakeXMLHttpRequest();
      xhr.onCreate = request => requests.push(request);
      sinon.stub(events, 'getEvents').returns([]);
      clock = sinon.useFakeTimers(Date.now());
    });

    afterEach(function () {
      xhr.restore();
      events.getEvents.restore();
      clock.restore();
    });

    after(function () {
      sonobiAnalytics.disableAnalytics();
    });

    it('should catch all events', function (done) {
      const initOptions = {
        pubId: 'A3B254F',
        siteId: '1234',
        delay: 100
      };

      sonobiAnalytics.enableAnalytics(initOptions)

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
      };

      // Step 1: Initialize adapter
      adapterManager.enableAnalytics({
        provider: 'sonobi',
        options: initOptions
      });

      // Step 2: Send init auction event
      events.emit(constants.EVENTS.AUCTION_INIT, {config: initOptions, auctionId: '13', timestamp: Date.now()});

      expect(sonobiAnalytics.initOptions).to.have.property('pubId', 'A3B254F');
      expect(sonobiAnalytics.initOptions).to.have.property('siteId', '1234');
      expect(sonobiAnalytics.initOptions).to.have.property('delay', 100);
      // Step 3: Send bid requested event
      events.emit(constants.EVENTS.BID_REQUESTED, { bids: [bid], auctionId: '13' });

      // Step 4: Send bid response event
      events.emit(constants.EVENTS.BID_RESPONSE, bid);

      // Step 5: Send bid won event
      events.emit(constants.EVENTS.BID_WON, bid);

      // Step 6: Send bid timeout event
      events.emit(constants.EVENTS.BID_TIMEOUT, {auctionId: '13'});

      // Step 7: Send auction end event
      events.emit(constants.EVENTS.AUCTION_END, {auctionId: '13', bidsReceived: [bid]});

      clock.tick(5000);
      expect(requests).to.have.length(1);
      expect(JSON.parse(requests[0].requestBody)).to.have.length(3)
      done();
    });
  });
});
