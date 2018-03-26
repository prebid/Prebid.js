import { assert } from 'chai';
import events from 'src/events';
import CONSTANTS from 'src/constants.json';

const BID_REQUESTED = CONSTANTS.EVENTS.BID_REQUESTED;
const BID_RESPONSE = CONSTANTS.EVENTS.BID_RESPONSE;
const BID_WON = CONSTANTS.EVENTS.BID_WON;
const BID_TIMEOUT = CONSTANTS.EVENTS.BID_TIMEOUT;
const AD_RENDER_FAILED = CONSTANTS.EVENTS.AD_RENDER_FAILED;

const AnalyticsAdapter = require('src/AnalyticsAdapter').default;
const config = {
  url: 'http://localhost:9999/src/adapters/analytics/libraries/example.js',
  analyticsType: 'library',
  global: 'ExampleAnalyticsGlobalObject',
  handler: 'on'
};

window[config.global] = () => {};

describe(`
FEATURE: Analytics Adapters API
  SCENARIO: A publisher enables analytics
    GIVEN a global object \`window['testGlobal']\`
    AND an  \`example\` instance of \`AnalyticsAdapter\`\n`, () => {
  describe(`WHEN an event occurs that is to be tracked\n`, () => {
    const eventType = BID_REQUESTED;
    const args = { some: 'data' };
    const adapter = new AnalyticsAdapter(config);
    var spyTestGlobal = sinon.spy(window, config.global);

    adapter.track({ eventType, args });

    it(`THEN should call \`window.${config.global}\` function\n`, () => {
      assert.ok(spyTestGlobal.args[0][1] === eventType, `with expected event type\n`);
      assert.deepEqual(spyTestGlobal.args[0][2], args, `with expected event data\n`);
    });
    window[config.global].restore();
  });

  describe(`WHEN an event occurs before tracking library is available\n`, () => {
    const eventType = BID_RESPONSE;
    const args = { wat: 'wot' };
    const adapter = new AnalyticsAdapter(config);

    window[config.global] = null;
    events.emit(BID_RESPONSE, args);

    describe(`AND the adapter is then enabled\n`, () => {
      window[config.global] = () => {};

      var spyTestGlobal = sinon.spy(window, config.global);

      adapter.enableAnalytics();

      it(`THEN should queue the event first and then track it\n`, () => {
        assert.ok(spyTestGlobal.args[0][1] === eventType, `with expected event type\n`);
        assert.deepEqual(spyTestGlobal.args[0][2], args, `with expected event data\n`);
      });

      adapter.disableAnalytics();
      window[config.global].restore();
    });
  });

  describe(`WHEN an event occurs after enable analytics\n`, () => {
    var spyTestGlobal,
      adapter;

    beforeEach(() => {
      adapter = new AnalyticsAdapter(config);
      spyTestGlobal = sinon.spy(window, config.global);

      sinon.stub(events, 'getEvents').returns([]); // these tests shouldn't be affected by previous tests
    });

    afterEach(() => {
      adapter.disableAnalytics();
      window[config.global].restore();

      events.getEvents.restore();
    });

    it('SHOULD call global when a bidWon event occurs', () => {
      const eventType = BID_WON;
      const args = { more: 'info' };

      adapter.enableAnalytics();
      events.emit(eventType, args);

      assert.ok(spyTestGlobal.args[0][1] === eventType, `with expected event type\n`);
      assert.deepEqual(spyTestGlobal.args[0][2], args, `with expected event data\n`);
    });

    it('SHOULD call global when a adRenderFailed event occurs', () => {
      const eventType = AD_RENDER_FAILED;
      const args = { call: 'adRenderFailed' };

      adapter.enableAnalytics();
      events.emit(eventType, args);

      assert.ok(spyTestGlobal.args[0][1] === eventType, `with expected event type\n`);
      assert.deepEqual(spyTestGlobal.args[0][2], args, `with expected event data\n`);
    });

    it('SHOULD call global when a bidRequest event occurs', () => {
      const eventType = BID_REQUESTED;
      const args = { call: 'request' };

      adapter.enableAnalytics();
      events.emit(eventType, args);

      assert.ok(spyTestGlobal.args[0][1] === eventType, `with expected event type\n`);
      assert.deepEqual(spyTestGlobal.args[0][2], args, `with expected event data\n`);
    });

    it('SHOULD call global when a bidResponse event occurs', () => {
      const eventType = BID_RESPONSE;
      const args = { call: 'response' };

      adapter.enableAnalytics();
      events.emit(eventType, args);

      assert.ok(spyTestGlobal.args[0][1] === eventType, `with expected event type\n`);
      assert.deepEqual(spyTestGlobal.args[0][2], args, `with expected event data\n`);
    });

    it('SHOULD call global when a bidTimeout event occurs', () => {
      const eventType = BID_TIMEOUT;
      const args = { call: 'timeout' };

      adapter.enableAnalytics();
      events.emit(eventType, args);

      assert.ok(spyTestGlobal.args[0][1] === eventType, `with expected event type\n`);
      assert.deepEqual(spyTestGlobal.args[0][2], args, `with expected event data\n`);
    });

    it('SHOULD NOT call global again when adapter.enableAnalytics is called with previous timeout', () => {
      const eventType = BID_TIMEOUT;
      const args = { call: 'timeout' };

      events.emit(eventType, args);
      adapter.enableAnalytics();
      events.emit(eventType, args);

      assert(spyTestGlobal.calledOnce === true);
    });

    describe(`AND sampling is enabled\n`, () => {
      const eventType = BID_WON;
      const args = { more: 'info' };

      beforeEach(() => {
        sinon.stub(Math, 'random').returns(0.5);
      });

      afterEach(() => {
        Math.random.restore();
      });

      it(`THEN should enable analytics when random number is in sample range`, () => {
        adapter.enableAnalytics({
          options: {
            sampling: 0.75
          }
        });
        events.emit(eventType, args);

        assert(spyTestGlobal.called === true);
      });

      it(`THEN should disable analytics when random number is outside sample range`, () => {
        adapter.enableAnalytics({
          options: {
            sampling: 0.25
          }
        });
        events.emit(eventType, args);

        assert(spyTestGlobal.called === false);
      });
    });
  });
});
