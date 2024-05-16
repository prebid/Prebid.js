import pianoDmpAnalytics from 'modules/pianoDmpAnalyticsAdapter.js';
import adapterManager from 'src/adapterManager';
import * as events from 'src/events';
import { EVENTS } from 'src/constants.js';
import { expect } from 'chai';

describe('Piano DMP Analytics Adapter', () => {
  let sandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();

    sandbox.stub(events, 'getEvents').returns([]);
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('track', () => {
    beforeEach(() => {
      adapterManager.enableAnalytics({
        provider: 'pianoDmp',
      });
    });

    afterEach(() => {
      delete window.cX;
      pianoDmpAnalytics.disableAnalytics();
    });

    it('should pass events to call queue', () => {
      const eventsList = [
        EVENTS.AUCTION_INIT,
        EVENTS.AUCTION_END,
        EVENTS.BID_ADJUSTMENT,
        EVENTS.BID_TIMEOUT,
        EVENTS.BID_REQUESTED,
        EVENTS.BID_RESPONSE,
        EVENTS.NO_BID,
        EVENTS.BID_WON,
      ];

      // Given
      const testEvents = eventsList.map((event) => ({
        event,
        args: { test: event },
      }));

      // When
      testEvents.forEach(({ event, args }) => events.emit(event, args));

      // Then
      const callQueue = (window.cX || {}).callQueue;

      testEvents.forEach(({event, args}) => {
        const [method, params] = callQueue.filter(item => item[1].eventType === event)[0];
        expect(method).to.equal('prebid');
        expect(params.params).to.deep.equal(args);
      })
    });
  });
});
