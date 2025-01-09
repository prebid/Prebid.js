import {expect} from 'chai';
import * as events from 'src/events.js';
import { EVENTS } from 'src/constants.js';
import {server} from 'test/mocks/xhr.js';
import {disableAjaxForAnalytics, enableAjaxForAnalytics} from '../mocks/analyticsStub.js';
import {clearEvents} from 'src/events.js';
import {
  DEFAULT_EXCLUDE_EVENTS,
  DEFAULT_INCLUDE_EVENTS,
  setDebounceDelay
} from '../../libraries/analyticsAdapter/AnalyticsAdapter.js';
import {config} from 'src/config.js';

const BID_WON = EVENTS.BID_WON;
const NO_BID = EVENTS.NO_BID;

const AnalyticsAdapter = require('libraries/analyticsAdapter/AnalyticsAdapter.js').default;
const adapterConfig = {
  url: 'https://localhost:9999/endpoint',
  analyticsType: 'endpoint'
};

describe(`
FEATURE: Analytics Adapters API
  SCENARIO: A publisher enables analytics
    AND an  \`example\` instance of \`AnalyticsAdapter\`\n`, () => {
  let adapter;

  before(enableAjaxForAnalytics);
  after(disableAjaxForAnalytics);

  beforeEach(function () {
    adapter = new AnalyticsAdapter(adapterConfig);
  });

  afterEach(function () {
    adapter.disableAnalytics();
    clearEvents();
  });

  it('should track enable status in `enabled`', () => {
    expect(adapter.enabled).to.equal(false);
    adapter.enableAnalytics();
    expect(adapter.enabled).to.equal(true);
    adapter.disableAnalytics();
    expect(adapter.enabled).to.equal(false);
  });

  it(`SHOULD call the endpoint WHEN an event occurs that is to be tracked`, function () {
    const eventType = BID_WON;
    const args = {some: 'data'};

    adapter.track({eventType, args});

    let result = JSON.parse(server.requests[0].requestBody);
    sinon.assert.match(result, {args: {some: 'data'}, eventType})
  });

  it(`SHOULD queue the event first and then track it WHEN an event occurs before tracking library is available`, function () {
    const eventType = BID_WON;
    const args = {wat: 'wot'};

    events.emit(eventType, args);
    adapter.enableAnalytics();

    // As now AUCTION_DEBUG is triggered for WARNINGS too, the BID_RESPONSE goes last in the array
    const index = server.requests.length - 1;
    let result = JSON.parse(server.requests[index].requestBody);
    sinon.assert.match(result, {eventType, args: {wat: 'wot'}})
  });

  describe('analyticsLabels', () => {
    let analyticsLabels;
    beforeEach(() => {
      analyticsLabels = {
        experiment_1: 'group_a',
        experiment_2: 'group_b'
      }
      config.setConfig({
        analyticsLabels
      })
    })

    it('should be attached to payloads (type: endpoint)', () => {
      events.emit(BID_WON, {foo: 'bar'});
      adapter.enableAnalytics();
      server.requests
        .map(req => JSON.parse(req.requestBody))
        .forEach(payload => sinon.assert.match(payload, {labels: analyticsLabels, args: sinon.match({analyticsLabels})}))
    });

    it('should be attached payloads (type: bundle)', () => {
      adapter = new AnalyticsAdapter({
        analyticsType: 'bundle',
        global: 'analytics'
      })
      window.analytics = sinon.stub();
      try {
        events.emit(BID_WON, {foo: 'bar'})
        adapter.enableAnalytics();
        sinon.assert.calledWith(window.analytics, sinon.match.any, BID_WON, sinon.match({analyticsLabels}))
      } finally {
        delete window.analytics;
      }
    });

    it('should be passed to custom track', () => {
      Object.assign(adapter, {
        track: sinon.stub()
      });
      events.emit(BID_WON, {foo: 'bar'});
      adapter.enableAnalytics();
      sinon.assert.calledWith(adapter.track, sinon.match({
        eventType: BID_WON,
        args: sinon.match({analyticsLabels}),
        labels: analyticsLabels
      }))
    })

    it('should not override the "analyticsLabels" property an event payload may have', () => {
      adapter.track = sinon.stub();
      events.emit(BID_WON, {analyticsLabels: 'not these ones'});
      adapter.enableAnalytics();
      sinon.assert.calledWith(adapter.track, sinon.match({
        args: {analyticsLabels: 'not these ones'}
      }));
    });

    it('should not modify event payloads when there are no labels', () => {
      config.resetConfig();
      adapter.track = sinon.stub();
      events.emit(BID_WON, {'foo': 'bar'});
      adapter.enableAnalytics();
      sinon.assert.calledWith(adapter.track, {
        labels: {},
        args: {foo: 'bar'},
        eventType: BID_WON
      })
    })
  })

  describe('event filters', () => {
    function fireEvents() {
      events.emit(BID_WON, {});
      events.emit(NO_BID, {});
    }
    function getEvents(ev) {
      return server.requests
        .map(r => JSON.parse(r.requestBody))
        .filter(r => r.eventType === ev)
    }

    Object.entries({
      'whitelist includeEvents': {
        includeEvents: [BID_WON]
      },
      'blacklist excludeEvents': {
        excludeEvents: [NO_BID]
      },
      'give precedence to exclude over include': {
        includeEvents: [BID_WON, NO_BID],
        excludeEvents: [NO_BID]
      }
    }).forEach(([t, config]) => {
      it(`should ${t}`, () => {
        fireEvents();
        adapter.enableAnalytics(config);
        expect(getEvents(BID_WON).length).to.eql(1);
        expect(getEvents(NO_BID).length).to.eql(0);
        fireEvents();
        expect(getEvents(BID_WON).length).to.eql(2);
        expect(getEvents(NO_BID).length).to.eql(0);
      })
    })
  })

  it('should prevent infinite loops when track triggers other events', () => {
    let i = 0;
    adapter.track = ((orig) => {
      return function (event) {
        i++;
        orig.call(this, event);
        events.emit(BID_WON, {})
      }
    })(adapter.track);
    adapter.enableAnalytics(adapterConfig);
    events.emit(BID_WON, {});
    expect(i >= 100).to.eql(false);
  })

  describe(`WHEN an event occurs after enable analytics\n`, function () {
    beforeEach(function () {
      sinon.stub(events, 'getEvents').returns([]); // these tests shouldn't be affected by previous tests
    });

    afterEach(function () {
      events.getEvents.restore();
    });

    Object.values(DEFAULT_INCLUDE_EVENTS).forEach(eventType => {
      it(`SHOULD call global when a ${eventType} event occurs`, () => {
        const args = {more: 'info'};

        adapter.enableAnalytics();
        events.emit(eventType, args);

        let result = JSON.parse(server.requests[server.requests.length - 1].requestBody);
        sinon.assert.match(result, {
          eventType,
          args: {
            more: 'info'
          },
        });
      });
    });

    it('SHOULD NOT call global again when adapter.enableAnalytics is called with previous timeout', function () {
      const eventType = BID_WON;
      const args = {call: 'timeout'};

      events.emit(eventType, args);
      adapter.enableAnalytics();
      events.emit(eventType, args);

      expect(server.requests.length).to.equal(1);
    });

    describe(`AND sampling is enabled\n`, function () {
      const eventType = BID_WON;
      const args = {more: 'info'};

      beforeEach(function () {
        sinon.stub(Math, 'random').returns(0.5);
      });

      afterEach(function () {
        Math.random.restore();
      });

      it(`THEN should enable analytics when random number is in sample range`, function () {
        adapter.enableAnalytics({
          options: {
            sampling: 0.75
          }
        });
        events.emit(eventType, args);

        expect(server.requests.length).to.equal(1);
        let result = JSON.parse(server.requests[0].requestBody);
        sinon.assert.match(result, {args: {more: 'info'}, eventType: 'bidWon'})
      });

      it(`THEN should disable analytics when random number is outside sample range`, function () {
        adapter.enableAnalytics({
          options: {
            sampling: 0.25
          }
        });
        events.emit(eventType, args);

        expect(server.requests.length).to.equal(0);
      });
    });
  });
});

describe('Analytics asynchronous event tracking', () => {
  before(() => {
    setDebounceDelay(100);
  });
  after(() => {
    setDebounceDelay(0);
  });

  let adapter, clock;

  beforeEach(() => {
    clock = sinon.useFakeTimers();
    adapter = new AnalyticsAdapter(adapterConfig);
    adapter.track = sinon.stub();
    adapter.enableAnalytics({});
  });

  afterEach(() => {
    clock.restore();
  })

  it('does not call track as long as events are coming', () => {
    events.emit(BID_WON, {i: 0});
    sinon.assert.notCalled(adapter.track);
    clock.tick(10);
    events.emit(BID_WON, {i: 1});
    sinon.assert.notCalled(adapter.track);
    clock.tick(10);
    sinon.assert.notCalled(adapter.track);
    clock.tick(100);
    sinon.assert.calledTwice(adapter.track);
    sinon.assert.calledWith(adapter.track.firstCall, sinon.match({eventType: BID_WON, args: {i: 0}}));
    sinon.assert.calledWith(adapter.track.secondCall, sinon.match({eventType: BID_WON, args: {i: 1}}));
  });
})
