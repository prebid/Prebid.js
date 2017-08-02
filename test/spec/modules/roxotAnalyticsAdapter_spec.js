import roxotAnalyticFactory from 'modules/roxotAnalyticsAdapter';
import { newEvents } from 'src/events';

let constants = require('src/constants.json');

describe('Roxot Prebid Analytic', function () {
  describe('enableAnalytics', function () {
    it('should catch all events', function () {
      const events = newEvents();
      const roxotAnalytic = roxotAnalyticFactory({
        events: events,
      });
      sinon.spy(roxotAnalytic, 'track');

      roxotAnalytic.enableAnalytics({
        provider: 'roxot',
        options: {
          publisherIds: ['test_roxot_prebid_analytid_publisher_id']
        }
      });

      events.emit(constants.EVENTS.AUCTION_INIT, {});
      events.emit(constants.EVENTS.AUCTION_END, {});
      events.emit(constants.EVENTS.BID_REQUESTED, {});
      events.emit(constants.EVENTS.BID_RESPONSE, {});
      events.emit(constants.EVENTS.BID_WON, {});

      sinon.assert.callCount(roxotAnalytic.track, 5);
    });
  });
});
