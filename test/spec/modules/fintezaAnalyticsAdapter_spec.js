import fntzAnalyticsAdapter from 'modules/fintezaAnalyticsAdapter.js';
import { expect } from 'chai';
import { parseUrl } from 'src/utils.js';
import { server } from 'test/mocks/xhr.js';
import { EVENTS } from 'src/constants.js';

const adapterManager = require('src/adapterManager').default;
const events = require('src/events');

function setCookie(name, value, expires) {
  document.cookie = name + '=' + value +
    '; path=/' +
    (expires ? ('; expires=' + expires.toUTCString()) : '') +
    '; SameSite=Lax';
}

describe('finteza analytics adapter', function () {
  const clientId = 'fntz-client-32145';
  const uniqCookie = '5045380421580287382';

  beforeEach(function () {
    setCookie('_fz_uniq', uniqCookie);
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
        bidResponseTimeTrack: 'Bid Response Time %bidder%',
        bidResponsePriceTrack: 'Bid Response Price %bidder%',
        bidTimeoutTrack: 'Bid Timeout %Bidder%',
        bidWonTrack: 'Bid Won %BIDDER%',
      }
    });
  });

  afterEach(function () {
    setCookie('_fz_uniq', '', new Date(0));
    events.getEvents.restore();
    fntzAnalyticsAdapter.track.restore();
    fntzAnalyticsAdapter.disableAnalytics();
  });

  describe('track', () => {
    describe('bid request', () => {
      it('builds and sends request data', function () {
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
        events.emit(EVENTS.BID_REQUESTED, bidRequest);

        const reqs = server.requests.filter(req => req.url.startsWith('https://content.mql5.com'));
        expect(reqs.length).to.eql(1);

        expect(reqs[0].method).to.equal('GET');
        expect(reqs[0].withCredentials).to.equal(true);

        const url = parseUrl(reqs[0].url);

        expect(url.protocol).to.equal('https');
        expect(url.hostname).to.equal('content.mql5.com');
        expect(url.pathname).to.equal('/tr');
        expect(url.search.id).to.equal(clientId);
        expect(url.search.fz_uniq).to.equal(uniqCookie);
        expect(decodeURIComponent(url.search.event)).to.equal(`Bid Request ${bidderCode.toUpperCase()}`);
        sinon.assert.calledWith(fntzAnalyticsAdapter.track, sinon.match({
          eventType: EVENTS.BID_REQUESTED
        }));
      });
    });

    describe('bid response', () => {
      it('builds and sends response data', function () {
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
        events.emit(EVENTS.BID_RESPONSE, bidResponse);
        const reqs = server.requests.filter(req => req.url.startsWith('https://content.mql5.com'));
        expect(reqs.length).to.equal(2);
        expect(reqs[0].method).to.equal('GET');
        expect(reqs[0].withCredentials).to.equal(true);

        let url = parseUrl(reqs[0].url);

        expect(url.protocol).to.equal('https');
        expect(url.hostname).to.equal('content.mql5.com');
        expect(url.pathname).to.equal('/tr');
        expect(url.search.id).to.equal(clientId);
        expect(url.search.fz_uniq).to.equal(uniqCookie);
        expect(decodeURIComponent(url.search.event)).to.equal(`Bid Response Price ${bidderCode.toLowerCase()}`);
        expect(url.search.value).to.equal(String(cpm));
        expect(url.search.unit).to.equal('usd');

        expect(reqs[1].method).to.equal('GET');
        expect(reqs[1].withCredentials).to.equal(true);

        url = parseUrl(reqs[1].url);

        expect(url.protocol).to.equal('https');
        expect(url.hostname).to.equal('content.mql5.com');
        expect(url.pathname).to.equal('/tr');
        expect(url.search.id).to.equal(clientId);
        expect(url.search.fz_uniq).to.equal(uniqCookie);
        expect(decodeURIComponent(url.search.event)).to.equal(`Bid Response Time ${bidderCode.toLowerCase()}`);
        expect(url.search.value).to.equal(String(timeToRespond));
        expect(url.search.unit).to.equal('ms');

        sinon.assert.calledWith(fntzAnalyticsAdapter.track, sinon.match({
          eventType: EVENTS.BID_RESPONSE
        }));
      });
    });

    describe('bid won', () => {
      it('builds and sends bid won data', function () {
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
        events.emit(EVENTS.BID_WON, bidWon);

        const reqs = server.requests.filter((req) => req.url.startsWith('https://content.mql5.com'));
        expect(reqs[0].method).to.equal('GET');
        expect(reqs[0].withCredentials).to.equal(true);

        expect(reqs.length).to.equal(1);

        const url = parseUrl(reqs[0].url);

        expect(url.protocol).to.equal('https');
        expect(url.hostname).to.equal('content.mql5.com');
        expect(url.pathname).to.equal('/tr');
        expect(url.search.id).to.equal(clientId);
        expect(url.search.fz_uniq).to.equal(uniqCookie);
        expect(decodeURIComponent(url.search.event)).to.equal(`Bid Won ${bidderCode.toUpperCase()}`);
        expect(url.search.value).to.equal(String(cpm));
        expect(url.search.unit).to.equal('usd');

        sinon.assert.calledWith(fntzAnalyticsAdapter.track, sinon.match({eventType: EVENTS.BID_WON}))
      });
    });

    describe('bid timeout', () => {
      it('builds and sends timeout data', function () {
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
        events.emit(EVENTS.BID_TIMEOUT, bidTimeout);

        expect(server.requests[0].method).to.equal('GET');
        expect(server.requests[0].withCredentials).to.equal(true);

        expect(server.requests.length).to.equal(1);

        const url = parseUrl(server.requests[0].url);

        expect(url.protocol).to.equal('https');
        expect(url.hostname).to.equal('content.mql5.com');
        expect(url.pathname).to.equal('/tr');
        expect(url.search.id).to.equal(clientId);
        expect(url.search.fz_uniq).to.equal(uniqCookie);
        expect(decodeURIComponent(url.search.event)).to.equal(`Bid Timeout Bidder789`);
        expect(url.search.value).to.equal(String(timeout));
        expect(url.search.unit).to.equal('ms');

        sinon.assert.callCount(fntzAnalyticsAdapter.track, 1);
      });
    });
  });
});
