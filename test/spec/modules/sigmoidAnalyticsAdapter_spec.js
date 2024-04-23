import sigmoidAnalytic from 'modules/sigmoidAnalyticsAdapter.js';
import {expect} from 'chai';
import {expectEvents} from '../../helpers/analytics.js';

let events = require('src/events');
let adapterManager = require('src/adapterManager').default;

describe('sigmoid Prebid Analytic', function () {
  after(function () {
    sigmoidAnalytic.disableAnalytics();
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
      adapterManager.registerAnalyticsAdapter({
        code: 'sigmoid',
        adapter: sigmoidAnalytic
      });

      adapterManager.enableAnalytics({
        provider: 'sigmoid',
        options: {
          publisherIds: ['test_sigmoid_prebid_analytid_publisher_id']
        }
      });

      expectEvents().to.beTrackedBy(sigmoidAnalytic.track);
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
