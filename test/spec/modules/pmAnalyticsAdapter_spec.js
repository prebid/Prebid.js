import pmAnalytics from 'modules/pmAnalyticsAdapter';
let events = require('src/events');
let constants = require('src/constants.json');

describe('Prebid Manager Analytics Adapter', function () {
  let xhr;

  before(function () {
    xhr = sinon.useFakeXMLHttpRequest();
  });

  after(function () {
    xhr.restore();
    pmAnalytics.disableAnalytics();
  });

  describe('enableAnalytics', function () {
    beforeEach(function () {
      sinon.stub(events, 'getEvents').returns([]);
    });

    afterEach(function () {
      events.getEvents.restore();
    });

    it('track event without errors', function () {
      pmAnalytics.enableAnalytics({
        provider: 'prebidmanager',
        options: {
          bundleId: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'
        }
      });

      sinon.spy(pmAnalytics, 'track');

      events.emit(constants.EVENTS.AUCTION_INIT, {});
      events.emit(constants.EVENTS.BID_REQUESTED, {});
      events.emit(constants.EVENTS.BID_RESPONSE, {});
      events.emit(constants.EVENTS.BID_WON, {});
      events.emit(constants.EVENTS.AUCTION_END, {});
      events.emit(constants.EVENTS.BID_TIMEOUT, {});
      events.emit(constants.EVENTS.NO_BID, {});
      events.emit(constants.EVENTS.BID_ADJUSTMENT, {});
      events.emit(constants.EVENTS.BIDDER_DONE, {});
      events.emit(constants.EVENTS.AD_RENDER_FAILED, {});

      sinon.assert.callCount(pmAnalytics.track, 10);
    });
  });
});
