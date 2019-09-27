import prebidmanagerAnalytics from 'modules/prebidmanagerAnalyticsAdapter';
import {expect} from 'chai';
let events = require('src/events');
let constants = require('src/constants.json');

describe('Prebid Manager Analytics Adapter', function () {
  let xhr;
  let requests;

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

  before(function () {
    xhr = sinon.useFakeXMLHttpRequest();
    xhr.onCreate = request => requests.push(request);
  });

  after(function () {
    xhr.restore();
  });

  describe('Prebid Manager Analytic tests', function () {
    beforeEach(function () {
      requests = [];
      sinon.stub(events, 'getEvents').returns([]);
    });

    afterEach(function () {
      prebidmanagerAnalytics.disableAnalytics();
      events.getEvents.restore();
    });

    it('support custom endpoint', function () {
      let custom_url = 'custom url';
      prebidmanagerAnalytics.enableAnalytics({
        provider: 'prebidmanager',
        options: {
          url: custom_url,
          bundleId: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'
        }
      });

      expect(prebidmanagerAnalytics.getOptions().url).to.equal(custom_url);
    });

    it('bid won event', function() {
      xhr.onCreate = request => requests.push(request);
      let bundleId = 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx';
      prebidmanagerAnalytics.enableAnalytics({
        provider: 'prebidmanager',
        options: {
          bundleId: bundleId
        }
      });

      events.emit(constants.EVENTS.BID_WON, bidWonEvent);
      prebidmanagerAnalytics.flush();

      expect(requests.length).to.equal(1);
      expect(requests[0].url).to.equal('https://endpoint.prebidmanager.com/endpoint');
      expect(requests[0].requestBody.substring(0, 2)).to.equal('1:');

      const pmEvents = JSON.parse(requests[0].requestBody.substring(2));
      expect(pmEvents.pageViewId).to.exist;
      expect(pmEvents.bundleId).to.equal(bundleId);
      expect(pmEvents.ver).to.equal(1);
      expect(pmEvents.events.length).to.equal(2);
      expect(pmEvents.events[0].eventType).to.equal('pageView');
      expect(pmEvents.events[1].eventType).to.equal('bidWon');
      expect(pmEvents.events[1].ad).to.be.undefined;
      expect(pmEvents.events[1].adUrl).to.be.undefined;
    });

    it('track event without errors', function () {
      sinon.spy(prebidmanagerAnalytics, 'track');

      prebidmanagerAnalytics.enableAnalytics({
        provider: 'prebidmanager',
        options: {
          bundleId: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'
        }
      });

      events.emit(constants.EVENTS.AUCTION_INIT, {});
      events.emit(constants.EVENTS.BID_REQUESTED, {});
      events.emit(constants.EVENTS.BID_RESPONSE, {});
      events.emit(constants.EVENTS.BID_WON, {});
      events.emit(constants.EVENTS.AUCTION_END, {});
      events.emit(constants.EVENTS.BID_TIMEOUT, {});

      sinon.assert.callCount(prebidmanagerAnalytics.track, 6);
    });
  });
});
