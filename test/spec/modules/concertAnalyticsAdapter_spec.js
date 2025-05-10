import concertAnalytics from 'modules/concertAnalyticsAdapter.js';
import { expect } from 'chai';
import {expectEvents} from '../../helpers/analytics.js';
import { EVENTS } from 'src/constants.js';

const sinon = require('sinon');
let adapterManager = require('src/adapterManager').default;
let events = require('src/events');

describe('ConcertAnalyticsAdapter', function() {
  let sandbox;
  let xhr;
  let requests;
  let clock;
  let timestamp = 1896134400;
  let auctionId = '9f894496-10fe-4652-863d-623462bf82b8';
  let timeout = 1000;

  before(function () {
    sandbox = sinon.createSandbox();
    xhr = sandbox.useFakeXMLHttpRequest();
    requests = [];

    xhr.onCreate = function (request) {
      requests.push(request);
    };
    clock = sandbox.useFakeTimers(1896134400);
  });

  after(function () {
    sandbox.restore();
  });

  describe('track', function() {
    beforeEach(function () {
      sandbox.stub(events, 'getEvents').returns([]);

      adapterManager.enableAnalytics({
        provider: 'concert'
      });
    });

    afterEach(function () {
      events.getEvents.restore();
      concertAnalytics.eventsStorage = [];
      concertAnalytics.disableAnalytics();
    });

    it('should catch all events', function() {
      sandbox.spy(concertAnalytics, 'track');
      expectEvents().to.beTrackedBy(concertAnalytics.track);
    });

    it('should report data for BID_RESPONSE, BID_WON events', function() {
      fireBidEvents(events);
      clock.tick(3000 + 1000);

      const eventsToReport = ['bidResponse', 'bidWon'];
      for (var i = 0; i < concertAnalytics.eventsStorage.length; i++) {
        expect(eventsToReport.indexOf(concertAnalytics.eventsStorage[i].event)).to.be.above(-1);
      }

      for (var i = 0; i < eventsToReport.length; i++) {
        expect(concertAnalytics.eventsStorage.some(function(event) {
          return event.event === eventsToReport[i]
        })).to.equal(true);
      }
    });

    it('should report data in the shape expected by analytics endpoint', function() {
      fireBidEvents(events);
      clock.tick(3000 + 1000);

      const requiredFields = ['event', 'concert_rid', 'adId', 'auctionId', 'creativeId', 'position', 'url', 'cpm', 'width', 'height', 'timeToRespond'];

      for (var i = 0; i < requiredFields.length; i++) {
        expect(concertAnalytics.eventsStorage[0]).to.have.property(requiredFields[i]);
      }
    });
  });

  const adUnits = [{
    code: 'desktop_leaderboard_variable',
    sizes: [[1030, 590]],
    mediaTypes: {
      banner: {
        sizes: [[1030, 590]]
      }
    },
    bids: [
      {
        bidder: 'concert',
        params: {
          partnerId: 'test_partner'
        }
      }
    ]
  }];

  const bidResponse = {
    'bidderCode': 'concert',
    'width': 1030,
    'height': 590,
    'statusMessage': 'Bid available',
    'adId': '642f13fe18ab7dc',
    'requestId': '4062fba2e039919',
    'mediaType': 'banner',
    'source': 'client',
    'cpm': 6,
    'ad': '<script>...</script>',
    'ttl': 360,
    'creativeId': '138308483085|62bac030-a5d3-11ea-b3be-55590c8153a5',
    'netRevenue': false,
    'currency': 'USD',
    'originalCpm': 6,
    'originalCurrency': 'USD',
    'auctionId': '9f894496-10fe-4652-863d-623462bf82b8',
    'responseTimestamp': 1591213790366,
    'requestTimestamp': 1591213790017,
    'bidder': 'concert',
    'adUnitCode': 'desktop_leaderboard_variable',
    'timeToRespond': 349,
    'status': 'rendered',
    'params': [
      {
        'partnerId': 'cst'
      }
    ]
  }

  const bidWon = {
    'adId': '642f13fe18ab7dc',
    'mediaType': 'banner',
    'requestId': '4062fba2e039919',
    'cpm': 6,
    'creativeId': '138308483085|62bac030-a5d3-11ea-b3be-55590c8153a5',
    'currency': 'USD',
    'netRevenue': false,
    'ttl': 360,
    'auctionId': '9f894496-10fe-4652-863d-623462bf82b8',
    'statusMessage': 'Bid available',
    'responseTimestamp': 1591213790366,
    'requestTimestamp': 1591213790017,
    'bidder': 'concert',
    'adUnitCode': 'desktop_leaderboard_variable',
    'sizes': [[1030, 590]],
    'size': [1030, 590]
  }

  function fireBidEvents(events) {
    events.emit(EVENTS.AUCTION_INIT, { timestamp, auctionId, timeout, adUnits });
    events.emit(EVENTS.BID_REQUESTED, { bidder: 'concert' });
    events.emit(EVENTS.BID_RESPONSE, bidResponse);
    events.emit(EVENTS.AUCTION_END, {});
    events.emit(EVENTS.BID_WON, bidWon);
  }
});
