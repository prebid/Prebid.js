import pubperfAnalytics from 'modules/pubperfAnalyticsAdapter.js';
import {expect} from 'chai';
import {server} from 'test/mocks/xhr.js';
import {expectEvents, fireEvents} from '../../helpers/analytics.js';

let events = require('src/events');
let utils = require('src/utils.js');

describe('Pubperf Analytics Adapter', function() {
  describe('Prebid Manager Analytic tests', function() {
    beforeEach(function() {
      sinon.stub(events, 'getEvents').returns([]);
      sinon.stub(utils, 'logError');
    });

    afterEach(function() {
      events.getEvents.restore();
      utils.logError.restore();
    });

    it('should throw error, when pubperf_pbjs is not defined', function() {
      pubperfAnalytics.enableAnalytics({
        provider: 'pubperf'
      });

      fireEvents();
      expect(server.requests.length).to.equal(0);
      expect(utils.logError.called).to.equal(true);
    });

    it('track event without errors', function() {
      sinon.spy(pubperfAnalytics, 'track');

      window['pubperf_pbjs'] = function() {};

      pubperfAnalytics.enableAnalytics({
        provider: 'pubperf'
      });

      expectEvents().to.beTrackedBy(pubperfAnalytics.track);
    });
  });
});
