import pianoDmpAnalytics from 'modules/pianoDmpAnalyticsAdapter.js';
import adapterManager from 'src/adapterManager';
import * as events from 'src/events';
import constants from 'src/constants.json';
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
        constants.EVENTS.AUCTION_INIT,
        constants.EVENTS.AUCTION_END,
        constants.EVENTS.BID_ADJUSTMENT,
        constants.EVENTS.BID_TIMEOUT,
        constants.EVENTS.BID_REQUESTED,
        constants.EVENTS.BID_RESPONSE,
        constants.EVENTS.NO_BID,
        constants.EVENTS.BID_WON,
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
