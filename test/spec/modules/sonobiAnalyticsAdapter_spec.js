import sonobiAnalytics, {DEFAULT_EVENT_URL} from 'modules/sonobiAnalyticsAdapter.js';
import {expect} from 'chai';
import {server} from 'test/mocks/xhr.js';
import { EVENTS } from 'src/constants.js';

let events = require('src/events');
let adapterManager = require('src/adapterManager').default;

describe('Sonobi Prebid Analytic', function () {
  var clock;

  describe('enableAnalytics', function () {
    beforeEach(function () {
      sinon.stub(events, 'getEvents').returns([]);
      clock = sinon.useFakeTimers(Date.now());
    });

    afterEach(function () {
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
      events.emit(EVENTS.AUCTION_INIT, { config: initOptions, auctionId: '13', timestamp: Date.now() });

      expect(sonobiAnalytics.initOptions).to.have.property('pubId', 'A3B254F');
      expect(sonobiAnalytics.initOptions).to.have.property('siteId', '1234');
      expect(sonobiAnalytics.initOptions).to.have.property('delay', 100);
      // Step 3: Send bid requested event
      events.emit(EVENTS.BID_REQUESTED, { bids: [bid], auctionId: '13' });

      // Step 4: Send bid response event
      events.emit(EVENTS.BID_RESPONSE, bid);

      // Step 5: Send bid won event
      events.emit(EVENTS.BID_WON, bid);

      // Step 6: Send bid timeout event
      events.emit(EVENTS.BID_TIMEOUT, { auctionId: '13' });

      // Step 7: Send auction end event
      events.emit(EVENTS.AUCTION_END, { auctionId: '13', bidsReceived: [bid] });

      clock.tick(5000);
      const req = server.requests.find(req => req.url.indexOf(DEFAULT_EVENT_URL) !== -1);
      expect(JSON.parse(req.requestBody)).to.have.length(3)
      done();
    });
  });
});
