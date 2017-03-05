let assert = require('assert');
let analytic = require('../../src/adapters/analytics/roxot');
let events = require('../../src/events');
let constants = require('../../src/constants.json');

describe('Roxot Prebid Analytic', function () {

  describe('enableAnalytics', function () {

    it('should catch all events', function () {
      let config = {options: { publisherIds : ['foo'] } };

      analytic.default.enableAnalytics(config);
      analytic.default.track(constants.EVENTS.AUCTION_INIT, {});
      analytic.default.track(constants.EVENTS.AUCTION_INIT, {});
      analytic.default.track(constants.EVENTS.BID_REQUESTED, {});
      analytic.default.track(constants.EVENTS.BID_WON, {});
      analytic.default.track(constants.EVENTS.AUCTION_END, {});
      analytic.default.track(constants.EVENTS.BID_WON, {});

    });
  });
});
