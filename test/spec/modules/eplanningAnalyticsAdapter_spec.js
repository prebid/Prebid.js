import eplAnalyticsAdapter from 'modules/eplanningAnalyticsAdapter.js';
import includes from 'core-js-pure/features/array/includes.js';
import { expect } from 'chai';
import { parseUrl } from 'src/utils.js';
import { server } from 'test/mocks/xhr.js';
let adapterManager = require('src/adapterManager').default;
let events = require('src/events');
let constants = require('src/constants.json');

describe('eplanning analytics adapter', function () {
  beforeEach(function () {
    sinon.stub(events, 'getEvents').returns([]);
  });

  afterEach(function () {
    events.getEvents.restore();
    eplAnalyticsAdapter.disableAnalytics();
  });

  describe('track', function () {
    it('builds and sends auction data', function () {
      sinon.spy(eplAnalyticsAdapter, 'track');

      let auctionTimestamp = 1496510254313;
      let pauctionId = '5018eb39-f900-4370-b71e-3bb5b48d324f';
      let initOptions = {
        host: 'https://ads.ar.e-planning.net/hba/1/',
        ci: '12345'
      };
      let pbidderCode = 'adapter';

      const bidRequest = {
        bidderCode: pbidderCode,
        auctionId: pauctionId,
        bidderRequestId: '1a6fc81528d0f6',
        bids: [{
          bidder: pbidderCode,
          placementCode: 'container-1',
          bidId: '208750227436c1',
          bidderRequestId: '1a6fc81528d0f6',
          auctionId: pauctionId,
          startTime: 1509369418389,
          sizes: [[300, 250]],
        }],
        auctionStart: 1509369418387,
        timeout: 3000,
        start: 1509369418389
      };

      const bidResponse = {
        bidderCode: pbidderCode,
        adId: '208750227436c1',
        cpm: 0.015,
        auctionId: pauctionId,
        responseTimestamp: 1509369418832,
        requestTimestamp: 1509369418389,
        bidder: pbidderCode,
        timeToRespond: 443,
        size: '300x250',
        width: 300,
        height: 250,
      };

      let bidTimeout = [
        {
          bidId: '208750227436c1',
          bidder: pbidderCode,
          auctionId: pauctionId
        }
      ];

      adapterManager.registerAnalyticsAdapter({
        code: 'eplanning',
        adapter: eplAnalyticsAdapter
      });

      adapterManager.enableAnalytics({
        provider: 'eplanning',
        options: initOptions
      });

      // Emit the events with the "real" arguments

      // Step 1: Send auction init event
      events.emit(constants.EVENTS.AUCTION_INIT, {
        auctionId: pauctionId,
        timestamp: auctionTimestamp
      });

      // Step 2: Send bid requested event
      events.emit(constants.EVENTS.BID_REQUESTED, bidRequest);

      // Step 3: Send bid response event
      events.emit(constants.EVENTS.BID_RESPONSE, bidResponse);

      // Step 4: Send bid time out event
      events.emit(constants.EVENTS.BID_TIMEOUT, bidTimeout);

      // Step 5: Send auction bid won event
      events.emit(constants.EVENTS.BID_WON, {
        adId: 'adIdData',
        ad: 'adContent',
        auctionId: pauctionId,
        width: 300,
        height: 250
      });

      // Step 6: Send auction end event
      events.emit(constants.EVENTS.AUCTION_END, {auctionId: pauctionId});

      // Step 7: Find the request data sent (filtering other hosts)
      let requests = server.requests.filter(req => {
        return req.url.indexOf(initOptions.host) > -1;
      });
      expect(requests.length).to.equal(1);

      expect(includes([initOptions.host + initOptions.ci], requests[0].url));
      expect(includes(['https://ads.ar.e-planning.net/hba/1/12345?d='], requests[0].url));

      let info = requests[0].url;
      let purl = parseUrl(info);
      let eplData = JSON.parse(decodeURIComponent(purl.search.d));

      // Step 8 check that 6 events were sent
      expect(eplData.length).to.equal(6);

      // Step 9 verify that we only receive the parameters we need
      let expectedEventValues = [
        // AUCTION INIT
        {ec: constants.EVENTS.AUCTION_INIT,
          p: {auctionId: pauctionId, time: auctionTimestamp}},
        // BID REQ
        {ec: constants.EVENTS.BID_REQUESTED,
          p: {auctionId: pauctionId, time: 1509369418389, bidder: pbidderCode, bids: [{time: 1509369418389, sizes: [[300, 250]], bidder: pbidderCode, placementCode: 'container-1', auctionId: pauctionId}]}},
        // BID RESP
        {ec: constants.EVENTS.BID_RESPONSE,
          p: {auctionId: pauctionId, bidder: pbidderCode, cpm: 0.015, size: '300x250', time: 1509369418832}},
        // BID T.O.
        {ec: constants.EVENTS.BID_TIMEOUT,
          p: [{auctionId: pauctionId, bidder: pbidderCode}]},
        // BID WON
        {ec: constants.EVENTS.BID_WON,
          p: {auctionId: pauctionId, size: '300x250'}},
        // AUCTION END
        {ec: constants.EVENTS.AUCTION_END,
          p: {auctionId: pauctionId}}
      ];

      for (let evid = 0; evid < eplData.length; evid++) {
        expect(eplData[evid]).to.deep.equal(expectedEventValues[evid]);
      }

      // Step 10 check that the host to send the ajax request is configurable via options
      expect(eplAnalyticsAdapter.context.host).to.equal(initOptions.host);

      // Step 11 verify that we received 6 events
      sinon.assert.callCount(eplAnalyticsAdapter.track, 6);
    });
  });
});
