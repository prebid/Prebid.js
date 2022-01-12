import relevantAnalytics from '../../../modules/relevantAnalyticsAdapter.js';
import adapterManager from 'src/adapterManager';
import * as events from 'src/events';
import constants from 'src/constants.json'
import { expect } from 'chai';

describe('Relevant Analytics Adapter', () => {
  beforeEach(() => {
    adapterManager.enableAnalytics({
      provider: 'relevant'
    });
  });

  afterEach(() => {
    relevantAnalytics.disableAnalytics();
  });

  it('should pass all events to the global array', () => {
    // Given
    const testEvents = [
      { ev: constants.EVENTS.AUCTION_INIT, args: { test: 1 } },
      { ev: constants.EVENTS.BID_REQUESTED, args: { test: 2 } },
    ];

    // When
    testEvents.forEach(({ ev, args }) => (
      events.emit(ev, args)
    ));

    // Then
    const eventQueue = (window.relevantDigital || {}).pbEventLog;
    expect(eventQueue).to.be.an('array');
    expect(eventQueue.length).to.be.at.least(testEvents.length);

    // The last events should be our test events
    const myEvents = eventQueue.slice(-testEvents.length);
    testEvents.forEach(({ ev, args }, idx) => {
      const actualEvent = myEvents[idx];
      expect(actualEvent.ev).to.eql(ev);
      expect(actualEvent.args).to.eql(args);
    });
  });
});
