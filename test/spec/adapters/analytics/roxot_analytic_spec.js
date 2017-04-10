import roxotAnalytic from 'src/adapters/analytics/roxot';
let events = require('../../../../src/events');
let adaptermanager = require('../../../../src/adaptermanager');
let constants = require('../../../../src/constants.json');

describe('Roxot Prebid Analytic', function () {

  describe('enableAnalytics', function () {


    it('should catch all events', function () {
      sinon.spy(roxotAnalytic, 'track');

      adaptermanager.registerAnalyticsAdapter({
        code: 'roxot',
        adapter: roxotAnalytic
      });

      adaptermanager.enableAnalytics({
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
