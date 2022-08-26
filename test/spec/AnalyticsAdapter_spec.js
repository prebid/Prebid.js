import { expect } from 'chai';
import * as events from 'src/events.js';
import CONSTANTS from 'src/constants.json';
import { server } from 'test/mocks/xhr.js';
import {disableAjaxForAnalytics, enableAjaxForAnalytics} from '../mocks/analyticsStub.js';

const REQUEST_BIDS = CONSTANTS.EVENTS.REQUEST_BIDS;
const BID_REQUESTED = CONSTANTS.EVENTS.BID_REQUESTED;
const BID_RESPONSE = CONSTANTS.EVENTS.BID_RESPONSE;
const BID_WON = CONSTANTS.EVENTS.BID_WON;
const BID_TIMEOUT = CONSTANTS.EVENTS.BID_TIMEOUT;
const AD_RENDER_FAILED = CONSTANTS.EVENTS.AD_RENDER_FAILED;
const AD_RENDER_SUCCEEDED = CONSTANTS.EVENTS.AD_RENDER_SUCCEEDED;
const AUCTION_DEBUG = CONSTANTS.EVENTS.AUCTION_DEBUG;
const ADD_AD_UNITS = CONSTANTS.EVENTS.ADD_AD_UNITS;

const AnalyticsAdapter = require('src/AnalyticsAdapter').default;
const config = {
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
    adapter = new AnalyticsAdapter(config);
  });

  afterEach(function () {
    adapter.disableAnalytics();
  });

  it('should track enable status in `enabled`', () => {
    expect(adapter.enabled).to.equal(false);
    adapter.enableAnalytics();
    expect(adapter.enabled).to.equal(true);
    adapter.disableAnalytics();
    expect(adapter.enabled).to.equal(false);
  })

  it(`SHOULD call the endpoint WHEN an event occurs that is to be tracked`, function () {
    const eventType = BID_REQUESTED;
    const args = { some: 'data' };

    adapter.track({ eventType, args });

    let result = JSON.parse(server.requests[0].requestBody);
    expect(result).to.deep.equal({args: {some: 'data'}, eventType: 'bidRequested'});
  });

  it(`SHOULD queue the event first and then track it WHEN an event occurs before tracking library is available`, function () {
    const eventType = BID_RESPONSE;
    const args = { wat: 'wot' };

    events.emit(eventType, args);
    adapter.enableAnalytics();

    // As now AUCTION_DEBUG is triggered for WARNINGS too, the BID_RESPONSE goes last in the array
    const index = server.requests.length - 1;
    let result = JSON.parse(server.requests[index].requestBody);
    expect(result).to.deep.equal({eventType: 'bidResponse', args: {wat: 'wot'}});
  });

  describe(`WHEN an event occurs after enable analytics\n`, function () {
    beforeEach(function () {
      sinon.stub(events, 'getEvents').returns([]); // these tests shouldn't be affected by previous tests
    });

    afterEach(function () {
      events.getEvents.restore();
    });

    it('SHOULD call global when a bidWon event occurs', function () {
      const eventType = BID_WON;
      const args = { more: 'info' };

      adapter.enableAnalytics();
      events.emit(eventType, args);

      let result = JSON.parse(server.requests[0].requestBody);
      expect(result).to.deep.equal({args: {more: 'info'}, eventType: 'bidWon'});
    });

    it('SHOULD call global when a adRenderFailed event occurs', function () {
      const eventType = AD_RENDER_FAILED;
      const args = { call: 'adRenderFailed' };

      adapter.enableAnalytics();
      events.emit(eventType, args);

      let result = JSON.parse(server.requests[0].requestBody);
      expect(result).to.deep.equal({args: {call: 'adRenderFailed'}, eventType: 'adRenderFailed'});
    });

    it('SHOULD call global when a adRenderSucceeded event occurs', function () {
      const eventType = AD_RENDER_SUCCEEDED;
      const args = { call: 'adRenderSucceeded' };

      adapter.enableAnalytics();
      events.emit(eventType, args);

      let result = JSON.parse(server.requests[0].requestBody);
      expect(result).to.deep.equal({args: {call: 'adRenderSucceeded'}, eventType: 'adRenderSucceeded'});
    });

    it('SHOULD call global when an auction debug event occurs', function () {
      const eventType = AUCTION_DEBUG;
      const args = { call: 'auctionDebug' };

      adapter.enableAnalytics();
      events.emit(eventType, args);

      let result = JSON.parse(server.requests[0].requestBody);
      expect(result).to.deep.equal({args: {call: 'auctionDebug'}, eventType: 'auctionDebug'});
    });

    it('SHOULD call global when an addAdUnits event occurs', function () {
      const eventType = ADD_AD_UNITS;
      const args = { call: 'addAdUnits' };

      adapter.enableAnalytics();
      events.emit(eventType, args);

      let result = JSON.parse(server.requests[0].requestBody);
      expect(result).to.deep.equal({args: {call: 'addAdUnits'}, eventType: 'addAdUnits'});
    });

    it('SHOULD call global when a requestBids event occurs', function () {
      const eventType = REQUEST_BIDS;
      const args = { call: 'request' };

      adapter.enableAnalytics();
      events.emit(eventType, args);

      let result = JSON.parse(server.requests[0].requestBody);
      expect(result).to.deep.equal({args: {call: 'request'}, eventType: 'requestBids'});
    });

    it('SHOULD call global when a bidRequest event occurs', function () {
      const eventType = BID_REQUESTED;
      const args = { call: 'request' };

      adapter.enableAnalytics();
      events.emit(eventType, args);

      let result = JSON.parse(server.requests[0].requestBody);
      expect(result).to.deep.equal({args: {call: 'request'}, eventType: 'bidRequested'});
    });

    it('SHOULD call global when a bidResponse event occurs', function () {
      const eventType = BID_RESPONSE;
      const args = { call: 'response' };

      adapter.enableAnalytics();
      events.emit(eventType, args);

      let result = JSON.parse(server.requests[0].requestBody);
      expect(result).to.deep.equal({args: {call: 'response'}, eventType: 'bidResponse'});
    });

    it('SHOULD call global when a bidTimeout event occurs', function () {
      const eventType = BID_TIMEOUT;
      const args = { call: 'timeout' };

      adapter.enableAnalytics();
      events.emit(eventType, args);

      let result = JSON.parse(server.requests[0].requestBody);
      expect(result).to.deep.equal({args: {call: 'timeout'}, eventType: 'bidTimeout'});
    });

    it('SHOULD NOT call global again when adapter.enableAnalytics is called with previous timeout', function () {
      const eventType = BID_TIMEOUT;
      const args = { call: 'timeout' };

      events.emit(eventType, args);
      adapter.enableAnalytics();
      events.emit(eventType, args);

      expect(server.requests.length).to.equal(1);
    });

    describe(`AND sampling is enabled\n`, function () {
      const eventType = BID_WON;
      const args = { more: 'info' };

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
        expect(result).to.deep.equal({args: {more: 'info'}, eventType: 'bidWon'});
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
