import advRedAnalytics from 'modules/advRedAnalyticsAdapter.js';
import {expect} from 'chai';
import {server} from 'test/mocks/xhr.js';
import {expectEvents} from '../../helpers/analytics.js';
import { EVENTS } from 'src/constants.js';
import sinon from 'sinon';

let events = require('src/events');

describe('AdvRed Analytics Adapter', function () {
  let bidWonEvent = {
    'bidderCode': 'appnexus',
    'width': 300,
    'height': 250,
    'adId': '1ebb82ec35375e',
    'mediaType': 'banner',
    'cpm': 0.5,
    'requestId': '1582271863760569973',
    'creative_id': '96846035',
    'creativeId': '96846035',
    'ttl': 60,
    'currency': 'USD',
    'netRevenue': true,
    'auctionId': '9c7b70b9-b6ab-4439-9e71-b7b382797c18',
    'responseTimestamp': 1537521629657,
    'requestTimestamp': 1537521629331,
    'bidder': 'appnexus',
    'adUnitCode': 'div-gpt-ad-1460505748561-0',
    'timeToRespond': 326,
    'size': '300x250',
    'status': 'rendered',
    'eventType': 'bidWon',
    'ad': 'some ad',
    'adUrl': 'ad url'
  };

  describe('AdvRed Analytic tests', function () {
    beforeEach(function () {
      sinon.stub(events, 'getEvents').returns([]);
    });

    afterEach(function () {
      advRedAnalytics.disableAnalytics();
      events.getEvents.restore();
    });

    it('support custom endpoint', function () {
      let custom_endpoint = 'custom url';
      advRedAnalytics.enableAnalytics({
        provider: 'advRed',
        options: {
          url: custom_endpoint,
          publisherId: '1234567890'
        }
      });

      expect(advRedAnalytics.getOptions().url).to.equal(custom_endpoint);
    });

    it('bid won event', function() {
      let publisherId = '1234567890';
      advRedAnalytics.enableAnalytics({
        provider: 'advRed',
        options: {
          publisherId: publisherId
        }
      });

      events.emit(EVENTS.BID_WON, bidWonEvent);
      advRedAnalytics.sendEvents();

      expect(server.requests.length).to.equal(1);
      expect(server.requests[0].url).to.equal('https://api.adv.red/api/event');

      const message = JSON.parse(server.requests[0].requestBody);
      expect(message.pwId).to.exist;
      expect(message.publisherId).to.equal(publisherId);
      expect(message.events.length).to.equal(1);
      expect(message.events[0].eventType).to.equal('bidWon');
      expect(message.events[0].ad).to.be.undefined;
      expect(message.events[0].adUrl).to.be.undefined;
    });

    it('track event', function () {
      sinon.spy(advRedAnalytics, 'track');

      advRedAnalytics.enableAnalytics({
        provider: 'advRed',
        options: {
          publisherId: '1234567890'
        }
      });

      expectEvents().to.beTrackedBy(advRedAnalytics.track);
    });
  });

  describe('pageUrl detection', function () {
    afterEach(function () {
      advRedAnalytics.disableAnalytics()
    });
    it('check pageUrl property', function () {
      advRedAnalytics.enableAnalytics({
        provider: 'advRed',
        options: {
          publisherId: '1234567890'
        }
      });

      const message = JSON.parse(server.requests[0].requestBody);
      expect(message.pageUrl).to.equal(window.top.location.href);
    });
  });
});
