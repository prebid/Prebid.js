import * as utils from 'src/utils.js';
import pubstackAnalytics from '../../../modules/pubstackAnalyticsAdapter.js';
import adapterManager from 'src/adapterManager';
import * as events from 'src/events';
import constants from 'src/constants.json'

describe('Pubstack Analytics Adapter', () => {
  const scope = utils.getWindowSelf();
  let queue = [];

  beforeEach(() => {
    scope.PubstackAnalytics = (...args) => queue.push(args);
    adapterManager.enableAnalytics({
      provider: 'pubstack'
    });
    queue = []
  });

  afterEach(() => {
    pubstackAnalytics.disableAnalytics();
  });

  it('should forward all events to the queue', () => {
    // Given
    const args = 'any-args'

    // When
    events.emit(constants.EVENTS.AUCTION_END, args)
    events.emit(constants.EVENTS.BID_REQUESTED, args)
    events.emit(constants.EVENTS.BID_ADJUSTMENT, args)
    events.emit(constants.EVENTS.BID_RESPONSE, args)
    events.emit(constants.EVENTS.BID_WON, args)
    events.emit(constants.EVENTS.NO_BID, args)

    // Then
    // 6 Pubstack events + 1 Clean.io event
    expect(queue.length).to.eql(7);
  });
});
