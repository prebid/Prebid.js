import {expect} from 'chai';
import atsAnalyticsAdapter from '../../../modules/atsAnalyticsAdapter';
import includes from 'core-js/library/fn/array/includes';
import {parse as parseURL} from '../../../src/url';
let adapterManager = require('src/adapterManager').default;
let events = require('src/events');
let constants = require('src/constants.json');

describe('ats analytics adapter', function () {
  let xhr;
  let requests;

  beforeEach(function () {
    xhr = sinon.useFakeXMLHttpRequest();
    requests = [];
    xhr.onCreate = request => { requests.push(request) };
    sinon.stub(events, 'getEvents').returns([]);
  });

  afterEach(function () {
    xhr.restore();
    events.getEvents.restore();
    atsAnalyticsAdapter.disableAnalytics();
  });

  describe('track', function () {
    it('builds and sends auction data', function () { /* sinon.spy(atsAnalyticsAdapter, 'track');

      let auctionTimestamp = 1496510254313;
      let pauctionId = '5018eb39-f900-4370-b71e-3bb5b48d324f';
      let pbidderCode = 'adapter';

      let initOptions = {
        pid: '12345',
        host: 'https://7j71m9ig80.execute-api.us-east-1.amazonaws.com/dev',
      };

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
        code: 'atsAnalytics',
        adapter: atsAnalyticsAdapter
      });

      adapterManager.enableAnalytics({
        provider: 'atsAnalytics',
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
      requests = requests.filter(req => {
        return req.url.indexOf(initOptions.host) > -1;
      });

      expect(requests.length).to.equal(1);

      expect(includes([initOptions.host + initOptions.pid], requests[0].url));
      expect(includes(['https://7j71m9ig80.execute-api.us-east-1.amazonaws.com/dev'], requests[0].url));

      let info = requests[0].url;
      let purl = parseURL(info);
      let atsData = JSON.parse(decodeURIComponent(purl.search.d));

      // Step 8 check that 6 events were sent
      expect(atsData.length).to.equal(6);

      // Step 10 check that the host to send the ajax request is configurable via options
      expect(atsAnalyticsAdapter.context.host).to.equal(initOptions.host);
      // check that pid is define in config
      expect(atsAnalyticsAdapter.context.pid).to.equal(initOptions.pid); */
    })
  })
})
