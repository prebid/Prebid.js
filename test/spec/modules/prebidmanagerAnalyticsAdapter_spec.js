import prebidmanagerAnalytics from 'modules/prebidmanagerAnalyticsAdapter';
let events = require('src/events');
let constants = require('src/constants.json');

describe('Prebid Manager Analytics Adapter', function () {
  let xhr;

  before(function () {
    xhr = sinon.useFakeXMLHttpRequest();
  });

  after(function () {
    xhr.restore();
    prebidmanagerAnalytics.disableAnalytics();
  });

  describe('enableAnalytics', function () {
    beforeEach(function () {
      sinon.stub(events, 'getEvents').returns([]);
    });

    afterEach(function () {
      events.getEvents.restore();
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
