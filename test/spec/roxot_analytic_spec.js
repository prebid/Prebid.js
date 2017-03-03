let assert = require('assert');
let analytic = require('../../src/adapters/analytics/roxot');
let events = require('../../src/events');
let constants = require('../../src/constants.json');

describe('Roxot Prebid Analytic', function () {

  describe('enableAnalytics', function () {

    it('should catch all events', function () {
      let config = {options: { publisherIds : ['foo'] } };
      console.log(analytic);
      console.log(analytic.default.enableAnalytics);
      analytic.default.enableAnalytics(config);
      analytic.default.track(constants.EVENTS.AUCTION_INIT, {});

      events.emit(constants.EVENTS.AUCTION_INIT, {});
      events.emit(constants.EVENTS.BID_REQUESTED, {});
      events.emit(constants.EVENTS.BID_WON, {});
      events.emit(constants.EVENTS.AUCTION_END, {});
      events.emit(constants.EVENTS.BID_WON, {});
    });
  });
});
