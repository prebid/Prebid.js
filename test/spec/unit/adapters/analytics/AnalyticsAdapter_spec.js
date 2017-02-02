import { assert } from 'chai';
import adaptermanager from '../../../../../src/adaptermanager';
import events from '../../../../../src/events';
import CONSTANTS from '../../../../../src/constants.json';

const BID_REQUESTED = CONSTANTS.EVENTS.BID_REQUESTED;
const BID_RESPONSE = CONSTANTS.EVENTS.BID_RESPONSE;
const BID_WON = CONSTANTS.EVENTS.BID_WON;
const BID_TIMEOUT = CONSTANTS.EVENTS.BID_TIMEOUT;
const AnalyticsAdapter = require('../../../../../src/adapters/analytics/AnalyticsAdapter').default;
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

        adaptermanager.registerAnalyticsAdapter(adapter, 'adapter');
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
        adaptermanager.registerAnalyticsAdapter(adapter, 'adapter');
        events.emit(BID_RESPONSE, args);

        describe(`AND the adapter is then enabled\n`, () => {
          window[config.global] = () => {};

          var spyTestGlobal = sinon.spy(window, config.global);

          adapter.enableAnalytics();

          it(`THEN should queue the event first and then track it\n`, () => {
            assert.ok(spyTestGlobal.args[0][1] === eventType, `with expected event type\n`);
            assert.deepEqual(spyTestGlobal.args[0][2], args, `with expected event data\n`);
          });
          window[config.global].restore();
        });
      });

    describe(`WHEN an event occurs after enable analytics\n`, () => {
        const eventType = BID_WON;
        const args = { more: 'info' };
        const adapter = new AnalyticsAdapter(config);
        var spyTestGlobal = sinon.spy(window, config.global);

        adaptermanager.registerAnalyticsAdapter(adapter, 'adapter');
        adapter.enableAnalytics();
        events.emit(eventType, args);

        it(`THEN should call \`window.${config.global}\` function\n`, () => {
          assert.ok(spyTestGlobal.args[2][1] === eventType, `with expected event type\n`);
          assert.deepEqual(spyTestGlobal.args[2][2], args, `with expected event data\n`);
        });
        window[config.global].restore();
      });

      describe(`WHEN a bidRequest event occurs\n`, () => {
        const eventType = BID_REQUESTED;
        const args = { call: 'request' };
        const adapter = new AnalyticsAdapter(config);
        var spyTestGlobal = sinon.spy(window, config.global);

        adaptermanager.registerAnalyticsAdapter(adapter, 'adapter');
        adapter.enableAnalytics();
        events.emit(eventType, args);

        it(`THEN should call \`window.${config.global}\` function\n`, () => {
          assert.ok(spyTestGlobal.args[3][1] === eventType, `with expected event type\n`);
          assert.deepEqual(spyTestGlobal.args[3][2], args, `with expected event data\n`);
        });
        window[config.global].restore();
      });

      describe(`WHEN a bidResponse event occurs\n`, () => {
        const eventType = BID_RESPONSE;
        const args = { call: 'response' };
        const adapter = new AnalyticsAdapter(config);
        var spyTestGlobal = sinon.spy(window, config.global);

        adaptermanager.registerAnalyticsAdapter(adapter, 'adapter');
        adapter.enableAnalytics();
        events.emit(eventType, args);

        it(`THEN should call \`window.${config.global}\` function\n`, () => {
          assert.ok(spyTestGlobal.args[4][1] === eventType, `with expected event type\n`);
          assert.deepEqual(spyTestGlobal.args[4][2], args, `with expected event data\n`);
        });
        window[config.global].restore();
      });

      describe(`WHEN a bidTimeout event occurs\n`, () => {
        const eventType = BID_TIMEOUT;
        const args = { call: 'timeout' };
        const adapter = new AnalyticsAdapter(config);
        var spyTestGlobal = sinon.spy(window, config.global);

        adaptermanager.registerAnalyticsAdapter(adapter, 'adapter');
        adapter.enableAnalytics();
        events.emit(eventType, args);

        it(`THEN should call \`window.${config.global}\` function\n`, () => {
          assert.ok(spyTestGlobal.args[5][1] === eventType, `with expected event type\n`);
          assert.deepEqual(spyTestGlobal.args[5][2], args, `with expected event data\n`);
        });
        window[config.global].restore();
      });

      describe(`WHEN adapter.enableAnalytics is called twice\n`, () => {
        const eventType = BID_TIMEOUT;
        const args = { call: 'timeout' };
        const adapter = new AnalyticsAdapter(config);
        var spyTestGlobal = sinon.spy(window, config.global);

        adaptermanager.registerAnalyticsAdapter(adapter, 'adapter');
        adapter.enableAnalytics();
        events.emit(eventType, args);

        it(`THEN should call \`window.${config.global}\` function\n`, () => {
          assert.ok(spyTestGlobal.args[5][1] === eventType, `with expected event type\n`);
          assert.deepEqual(spyTestGlobal.args[5][2], args, `with expected event data\n`);
        });
        window[config.global].restore();
      });
    });
