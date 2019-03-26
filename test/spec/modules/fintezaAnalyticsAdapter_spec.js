import fntzAnalyticsAdapter from 'modules/fintezaAnalyticsAdapter';
import includes from 'core-js/library/fn/array/includes';
import { expect } from 'chai';
import { parse as parseURL } from 'src/url';
let adapterManager = require('src/adapterManager').default;
let events = require('src/events');
let constants = require('src/constants.json');

describe('finteza analytics adapter', function () {
  const clientId = 'fntz-client-32145';

  let xhr;
  let requests;

  beforeEach(function () {
    xhr = sinon.useFakeXMLHttpRequest();
    requests = [];
    xhr.onCreate = request => { requests.push(request) };
    sinon.stub(events, 'getEvents').returns([]);
    sinon.spy(fntzAnalyticsAdapter, 'track');

    adapterManager.registerAnalyticsAdapter({
      code: 'finteza',
      adapter: fntzAnalyticsAdapter
    });

    adapterManager.enableAnalytics({
      provider: 'finteza',
      options: {
        id: clientId, // Client ID (required)
        bidRequestTrack: 'Bid Request %BIDDER%',
        bidResponseTrack: 'Bid Response %bidder%',
        bidTimeoutTrack: 'Bid Timeout %Bidder%',
        bidWonTrack: 'Bid Won %BIDDER%',
      }
    });
  });

  afterEach(function () {
    xhr.restore();
    events.getEvents.restore();
    fntzAnalyticsAdapter.track.restore();
    fntzAnalyticsAdapter.disableAnalytics();
  });

  describe('track', () => {
    describe('bid request', () => {
      it('builds and sends data', function () {
        const bidderCode = 'Bidder789';
        const pauctionId = '5018eb39-f900-4370-b71e-3bb5b48d324f';

        const bidRequest = {
          bidderCode: bidderCode,
          auctionId: pauctionId,
          bidderRequestId: '1a6fc81528d0f6',
          bids: [{
            bidder: bidderCode,
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

        // Emit the events with the "real" arguments
        events.emit(constants.EVENTS.BID_REQUESTED, bidRequest);

        expect(requests.length).to.equal(1);

        expect(requests[0].method).to.equal('GET');

        const url = parseURL(requests[0].url);

        expect(url.protocol).to.equal('https');
        expect(url.hostname).to.equal('content.mql5.com');
        expect(url.pathname).to.equal('/tr');
        expect(url.search.id).to.equal(clientId);
        expect(decodeURIComponent(url.search.event)).to.equal(`Bid Request ${bidderCode.toUpperCase()}`);

        sinon.assert.callCount(fntzAnalyticsAdapter.track, 1);
      });
    });

    describe('bid response', () => {
      it('builds and sends data', function () {
        const bidderCode = 'Bidder789';
        const pauctionId = '5018eb39-f900-4370-b71e-3bb5b48d324f';

        const timeToRespond = 443;
        const cpm = 0.015;

        const bidResponse = {
          bidderCode: bidderCode,
          adId: '208750227436c1',
          cpm: cpm,
          auctionId: pauctionId,
          responseTimestamp: 1509369418832,
          requestTimestamp: 1509369418389,
          bidder: bidderCode,
          timeToRespond: timeToRespond,
          size: '300x250',
          width: 300,
          height: 250,
        };

        // Emit the events with the "real" arguments
        events.emit(constants.EVENTS.BID_RESPONSE, bidResponse);

        expect(requests.length).to.equal(1);

        expect(requests[0].method).to.equal('GET');

        const url = parseURL(requests[0].url);

        expect(url.protocol).to.equal('https');
        expect(url.hostname).to.equal('content.mql5.com');
        expect(url.pathname).to.equal('/tr');
        expect(url.search.id).to.equal(clientId);
        expect(decodeURIComponent(url.search.event)).to.equal(`Bid Response ${bidderCode.toLowerCase()}`);
        expect(url.search.c1_value).to.equal(String(timeToRespond));
        expect(url.search.c1_unit).to.equal('ms');
        expect(url.search.c2_value).to.equal(String(cpm));
        expect(url.search.c2_unit).to.equal('usd');

        sinon.assert.callCount(fntzAnalyticsAdapter.track, 1);
      });
    });

    describe('bid won', () => {
      it('builds and sends data', function () {
        const bidderCode = 'Bidder789';
        const pauctionId = '5018eb39-f900-4370-b71e-3bb5b48d324f';

        const cpm = 0.015;

        const bidWon = {
          bidderCode: bidderCode,
          cpm: cpm,
          adId: 'adIdData',
          ad: 'adContent',
          auctionId: pauctionId,
          width: 300,
          height: 250
        }

        // Emit the events with the "real" arguments
        events.emit(constants.EVENTS.BID_WON, bidWon);

        expect(requests.length).to.equal(1);

        expect(requests[0].method).to.equal('GET');

        const url = parseURL(requests[0].url);

        expect(url.protocol).to.equal('https');
        expect(url.hostname).to.equal('content.mql5.com');
        expect(url.pathname).to.equal('/tr');
        expect(url.search.id).to.equal(clientId);
        expect(decodeURIComponent(url.search.event)).to.equal(`Bid Won ${bidderCode.toUpperCase()}`);
        expect(url.search.c1_value).to.equal(String(cpm));
        expect(url.search.c1_unit).to.equal('usd');

        sinon.assert.callCount(fntzAnalyticsAdapter.track, 1);
      });
    });

    describe('bid timeout', () => {
      it('builds and sends data', function () {
        const bidderCode = 'biDDer789';
        const pauctionId = '5018eb39-f900-4370-b71e-3bb5b48d324f';

        const timeout = 2540;

        const bidTimeout = [
          {
            bidId: '208750227436c1',
            bidder: bidderCode,
            auctionId: pauctionId,
            timeout: timeout,
          }
        ];

        // Emit the events with the "real" arguments
        events.emit(constants.EVENTS.BID_TIMEOUT, bidTimeout);

        expect(requests.length).to.equal(1);

        expect(requests[0].method).to.equal('GET');

        const url = parseURL(requests[0].url);

        expect(url.protocol).to.equal('https');
        expect(url.hostname).to.equal('content.mql5.com');
        expect(url.pathname).to.equal('/tr');
        expect(url.search.id).to.equal(clientId);
        expect(decodeURIComponent(url.search.event)).to.equal(`Bid Timeout Bidder789`);
        expect(url.search.c1_value).to.equal(String(timeout));
        expect(url.search.c1_unit).to.equal('ms');

        sinon.assert.callCount(fntzAnalyticsAdapter.track, 1);
      });
    });
  });
});
