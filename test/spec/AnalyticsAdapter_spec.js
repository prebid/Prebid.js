import { expect } from 'chai';
import events from 'src/events';
import CONSTANTS from 'src/constants.json';

const BID_REQUESTED = CONSTANTS.EVENTS.BID_REQUESTED;
const BID_RESPONSE = CONSTANTS.EVENTS.BID_RESPONSE;
const BID_WON = CONSTANTS.EVENTS.BID_WON;
const BID_TIMEOUT = CONSTANTS.EVENTS.BID_TIMEOUT;
const AD_RENDER_FAILED = CONSTANTS.EVENTS.AD_RENDER_FAILED;

const AnalyticsAdapter = require('src/AnalyticsAdapter').default;
const config = {
  url: 'http://localhost:9999/endpoint',
  analyticsType: 'endpoint'
};

describe(`
FEATURE: Analytics Adapters API
  SCENARIO: A publisher enables analytics
    AND an  \`example\` instance of \`AnalyticsAdapter\`\n`, () => {
  let xhr;
  let requests;
  let adapter;

  beforeEach(() => {
    xhr = sinon.useFakeXMLHttpRequest();
    requests = [];
    xhr.onCreate = (request) => requests.push(request);
    adapter = new AnalyticsAdapter(config);
  });

  afterEach(() => {
    xhr.restore();
    adapter.disableAnalytics();
  });

  it(`SHOULD call the endpoint WHEN an event occurs that is to be tracked`, () => {
    const eventType = BID_REQUESTED;
    const args = { some: 'data' };

    adapter.track({ eventType, args });

    let result = JSON.parse(requests[0].requestBody);
    expect(result).to.deep.equal({args: {some: 'data'}, eventType: 'bidRequested'});
  });

  it(`SHOULD queue the event first and then track it WHEN an event occurs before tracking library is available`, () => {
    const eventType = BID_RESPONSE;
    const args = { wat: 'wot' };

    events.emit(eventType, args);
    adapter.enableAnalytics();

    let result = JSON.parse(requests[0].requestBody);
    expect(result).to.deep.equal({args: {wat: 'wot'}, eventType: 'bidResponse'});
  });

  describe(`WHEN an event occurs after enable analytics\n`, () => {
    beforeEach(() => {
      sinon.stub(events, 'getEvents').returns([]); // these tests shouldn't be affected by previous tests
    });

    afterEach(() => {
      events.getEvents.restore();
    });

    it('SHOULD call global when a bidWon event occurs', () => {
      const eventType = BID_WON;
      const args = { more: 'info' };

      adapter.enableAnalytics();
      events.emit(eventType, args);

      let result = JSON.parse(requests[0].requestBody);
      expect(result).to.deep.equal({args: {more: 'info'}, eventType: 'bidWon'});
    });

    it('SHOULD call global when a adRenderFailed event occurs', () => {
      const eventType = AD_RENDER_FAILED;
      const args = { call: 'adRenderFailed' };

      adapter.enableAnalytics();
      events.emit(eventType, args);

      let result = JSON.parse(requests[0].requestBody);
      expect(result).to.deep.equal({args: {call: 'adRenderFailed'}, eventType: 'adRenderFailed'});
    });

    it('SHOULD call global when a bidRequest event occurs', () => {
      const eventType = BID_REQUESTED;
      const args = { call: 'request' };

      adapter.enableAnalytics();
      events.emit(eventType, args);

      let result = JSON.parse(requests[0].requestBody);
      expect(result).to.deep.equal({args: {call: 'request'}, eventType: 'bidRequested'});
    });

    it('SHOULD call global when a bidResponse event occurs', () => {
      const eventType = BID_RESPONSE;
      const args = { call: 'response' };

      adapter.enableAnalytics();
      events.emit(eventType, args);

      let result = JSON.parse(requests[0].requestBody);
      expect(result).to.deep.equal({args: {call: 'response'}, eventType: 'bidResponse'});
    });

    it('SHOULD call global when a bidTimeout event occurs', () => {
      const eventType = BID_TIMEOUT;
      const args = { call: 'timeout' };

      adapter.enableAnalytics();
      events.emit(eventType, args);

      let result = JSON.parse(requests[0].requestBody);
      expect(result).to.deep.equal({args: {call: 'timeout'}, eventType: 'bidTimeout'});
    });

    it('SHOULD NOT call global again when adapter.enableAnalytics is called with previous timeout', () => {
      const eventType = BID_TIMEOUT;
      const args = { call: 'timeout' };

      events.emit(eventType, args);
      adapter.enableAnalytics();
      events.emit(eventType, args);

      expect(requests.length).to.equal(1);
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

        expect(requests.length).to.equal(1);
        let result = JSON.parse(requests[0].requestBody);
        expect(result).to.deep.equal({args: {more: 'info'}, eventType: 'bidWon'});
      });

      it(`THEN should disable analytics when random number is outside sample range`, () => {
        adapter.enableAnalytics({
          options: {
            sampling: 0.25
          }
        });
        events.emit(eventType, args);

        expect(requests.length).to.equal(0);
      });
    });
  });
});
