import sigmoidAnalytic from 'modules/sigmoidAnalyticsAdapter';
import { expect } from 'chai';
let events = require('src/events');
let adaptermanager = require('src/adaptermanager');
let constants = require('src/constants.json');

describe('sigmoid Prebid Analytic', function () {
  let xhr;
  before(function () {
    xhr = sinon.useFakeXMLHttpRequest();
  })
  after(function () {
    sigmoidAnalytic.disableAnalytics();
    xhr.restore();
  });

  describe('enableAnalytics', function () {
    beforeEach(function () {
      sinon.spy(sigmoidAnalytic, 'track');
      sinon.stub(events, 'getEvents').returns([]);
    });

    afterEach(function () {
      sigmoidAnalytic.track.restore();
      events.getEvents.restore();
    });
    it('should catch all events', function () {
      adaptermanager.registerAnalyticsAdapter({
        code: 'sigmoid',
        adapter: sigmoidAnalytic
      });

      adaptermanager.enableAnalytics({
        provider: 'sigmoid',
        options: {
          publisherIds: ['test_sigmoid_prebid_analytid_publisher_id']
        }
      });

      events.emit(constants.EVENTS.AUCTION_INIT, {});
      events.emit(constants.EVENTS.AUCTION_END, {});
      events.emit(constants.EVENTS.BID_REQUESTED, {});
      events.emit(constants.EVENTS.BID_RESPONSE, {});
      events.emit(constants.EVENTS.BID_WON, {});

      sinon.assert.callCount(sigmoidAnalytic.track, 5);
    });
  });
  describe('build utm tag data', function () {
    beforeEach(function () {
      localStorage.setItem('sigmoid_analytics_utm_source', 'utm_source');
      localStorage.setItem('sigmoid_analytics_utm_medium', 'utm_medium');
      localStorage.setItem('sigmoid_analytics_utm_campaign', '');
      localStorage.setItem('sigmoid_analytics_utm_term', '');
      localStorage.setItem('sigmoid_analytics_utm_content', '');
      localStorage.setItem('sigmoid_analytics_utm_timeout', Date.now());
    });
    it('should build utm data from local storage', function () {
      let utmTagData = sigmoidAnalytic.buildUtmTagData();
      expect(utmTagData.utm_source).to.equal('utm_source');
      expect(utmTagData.utm_medium).to.equal('utm_medium');
      expect(utmTagData.utm_campaign).to.equal('');
      expect(utmTagData.utm_term).to.equal('');
      expect(utmTagData.utm_content).to.equal('');
    });
  });
});
