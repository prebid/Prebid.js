import * as utils from 'src/utils.js';
import adapterManager from 'src/adapterManager';
import ringieraxelspringerAnalyticsAdapter from 'modules/ringieraxelspringerAnalyticsAdapter';
import * as events from 'src/events.js';
import constants from 'src/constants';

const {
  EVENTS: { AUCTION_INIT, BID_REQUESTED, BID_RESPONSE, BID_TIMEOUT, BID_WON, NO_BID }
} = constants;

describe('ringieraxelspringerAnalyticsAdapter', function () {
  const scope = utils.getWindowSelf();
  let queue = [];

  beforeEach(() => {
    scope.ringieraxelspringerPrebidAnalytics = (handler, eventType, args) => {
      queue.push(args);
    };
    adapterManager.enableAnalytics({
      provider: 'ringieraxelspringer'
    });
    queue = []
  });

  afterEach(() => {
    ringieraxelspringerAnalyticsAdapter.disableAnalytics();
  });

  it('should forward all events to the queue', () => {
    // Given
    const args = 'my-args';

    // When
    events.emit(BID_REQUESTED, args);
    events.emit(BID_RESPONSE, args);
    events.emit(BID_TIMEOUT, args);
    events.emit(BID_WON, args);
    events.emit(NO_BID, args);

    // Then
    expect(queue.length).to.eql(5);
    queue.forEach(function (msg) {
      expect(msg).to.equal('my-args');
    })
  });
});
