import prebidmanagerAnalytics, {
  storage
} from 'modules/prebidmanagerAnalyticsAdapter.js';
import {expect} from 'chai';
import {server} from 'test/mocks/xhr.js';
import * as utils from 'src/utils.js';

let events = require('src/events');
let constants = require('src/constants.json');

describe('Prebid Manager Analytics Adapter', function () {
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

  describe('Prebid Manager Analytic tests', function () {
    beforeEach(function () {
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
      let bundleId = 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx';
      prebidmanagerAnalytics.enableAnalytics({
        provider: 'prebidmanager',
        options: {
          bundleId: bundleId
        }
      });

      events.emit(constants.EVENTS.BID_WON, bidWonEvent);
      prebidmanagerAnalytics.flush();

      expect(server.requests.length).to.equal(1);
      expect(server.requests[0].url).to.equal('https://endpoint.prebidmanager.com/endpoint');
      expect(server.requests[0].requestBody.substring(0, 2)).to.equal('1:');

      const pmEvents = JSON.parse(server.requests[0].requestBody.substring(2));
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

      // 6 Prebid Manager events + 1 Clean.io event
      sinon.assert.callCount(prebidmanagerAnalytics.track, 7);
    });
  });

  describe('build utm tag data', function () {
    let getDataFromLocalStorageStub;
    this.timeout(4000)
    beforeEach(function () {
      getDataFromLocalStorageStub = sinon.stub(storage, 'getDataFromLocalStorage');
      getDataFromLocalStorageStub.withArgs('pm_utm_source').returns('utm_source');
      getDataFromLocalStorageStub.withArgs('pm_utm_medium').returns('utm_medium');
      getDataFromLocalStorageStub.withArgs('pm_utm_campaign').returns('utm_camp');
      getDataFromLocalStorageStub.withArgs('pm_utm_term').returns('');
      getDataFromLocalStorageStub.withArgs('pm_utm_content').returns('');
    });
    afterEach(function () {
      getDataFromLocalStorageStub.restore();
      prebidmanagerAnalytics.disableAnalytics()
    });
    it('should build utm data from local storage', function () {
      prebidmanagerAnalytics.enableAnalytics({
        provider: 'prebidmanager',
        options: {
          bundleId: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'
        }
      });

      const pmEvents = JSON.parse(server.requests[0].requestBody.substring(2));

      expect(pmEvents.utmTags.utm_source).to.equal('utm_source');
      expect(pmEvents.utmTags.utm_medium).to.equal('utm_medium');
      expect(pmEvents.utmTags.utm_campaign).to.equal('utm_camp');
      expect(pmEvents.utmTags.utm_term).to.equal('');
      expect(pmEvents.utmTags.utm_content).to.equal('');
    });
  });

  describe('build page info', function () {
    afterEach(function () {
      prebidmanagerAnalytics.disableAnalytics()
    });
    it('should build page info', function () {
      prebidmanagerAnalytics.enableAnalytics({
        provider: 'prebidmanager',
        options: {
          bundleId: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'
        }
      });

      const pmEvents = JSON.parse(server.requests[0].requestBody.substring(2));

      expect(pmEvents.pageInfo.domain).to.equal(window.location.hostname);
      expect(pmEvents.pageInfo.referrerDomain).to.equal(utils.parseUrl(document.referrer).hostname);
    });
  });
});
