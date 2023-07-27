import adagioAnalyticsAdapter from 'modules/adagioAnalyticsAdapter.js';
import { expect } from 'chai';
import * as utils from 'src/utils.js';

let adapterManager = require('src/adapterManager').default;
let events = require('src/events');
let constants = require('src/constants.json');

describe('adagio analytics adapter', () => {
  let sandbox;
  let adagioQueuePushSpy;

  beforeEach(() => {
    sandbox = sinon.createSandbox();

    sandbox.stub(events, 'getEvents').returns([]);

    const w = utils.getWindowTop();

    adapterManager.registerAnalyticsAdapter({
      code: 'adagio',
      adapter: adagioAnalyticsAdapter
    });

    w.ADAGIO = w.ADAGIO || {};
    w.ADAGIO.queue = w.ADAGIO.queue || [];

    adagioQueuePushSpy = sandbox.spy(w.ADAGIO.queue, 'push');
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('track', () => {
    beforeEach(() => {
      adapterManager.enableAnalytics({
        provider: 'adagio'
      });
    });

    afterEach(() => {
      adagioAnalyticsAdapter.disableAnalytics();
    });

    it('builds and sends auction data', () => {
      const w = utils.getWindowTop();

      let bidRequest = {
        bids: [{
          adUnitCode: 'div-1',
          params: {
            features: {
              siteId: '2',
              placement: 'pave_top',
              pagetype: 'article',
              category: 'IAB12,IAB12-2',
              device: '2',
            }
          }
        }, {
          adUnitCode: 'div-2',
          params: {
            features: {
              siteId: '2',
              placement: 'ban_top',
              pagetype: 'article',
              category: 'IAB12,IAB12-2',
              device: '2',
            }
          },
        }],
      };
      let bidResponse = {
        bidderCode: 'adagio',
        width: 300,
        height: 250,
        statusMessage: 'Bid available',
        cpm: 6.2189757658226075,
        currency: '',
        netRevenue: false,
        adUnitCode: 'div-1',
        timeToRespond: 132,
      };

      const testEvents = {
        [constants.EVENTS.BID_REQUESTED]: bidRequest,
        [constants.EVENTS.BID_RESPONSE]: bidResponse,
        [constants.EVENTS.AUCTION_END]: {}
      };

      // Step 1-3: Send events
      Object.entries(testEvents).forEach(([ev, payload]) => events.emit(ev, payload));

      function eventItem(eventName, args) {
        return sinon.match({
          action: 'pb-analytics-event',
          ts: sinon.match((val) => val !== undefined),
          data: {
            eventName,
            args
          }
        })
      }

      Object.entries(testEvents).forEach(([ev, payload]) => sinon.assert.calledWith(adagioQueuePushSpy, eventItem(ev, payload)));
    });
  });

  describe('no track', () => {
    beforeEach(() => {
      sandbox.stub(utils, 'getWindowTop').throws();

      adapterManager.enableAnalytics({
        provider: 'adagio'
      });
    });

    afterEach(() => {
      adagioAnalyticsAdapter.disableAnalytics();
      sandbox.restore();
    });

    it('builds and sends auction data', () => {
      let bidRequest = {
        bids: [{
          adUnitCode: 'div-1',
          params: {
            features: {
              siteId: '2',
              placement: 'pave_top',
              pagetype: 'article',
              category: 'IAB12,IAB12-2',
              device: '2',
            }
          }
        }, {
          adUnitCode: 'div-2',
          params: {
            features: {
              siteId: '2',
              placement: 'ban_top',
              pagetype: 'article',
              category: 'IAB12,IAB12-2',
              device: '2',
            }
          },
        }],
      };
      let bidResponse = {
        bidderCode: 'adagio',
        width: 300,
        height: 250,
        statusMessage: 'Bid available',
        cpm: 6.2189757658226075,
        currency: '',
        netRevenue: false,
        adUnitCode: 'div-1',
        timeToRespond: 132,
      };

      // Step 1: Send bid requested event
      events.emit(constants.EVENTS.BID_REQUESTED, bidRequest);

      // Step 2: Send bid response event
      events.emit(constants.EVENTS.BID_RESPONSE, bidResponse);

      // Step 3: Send auction end event
      events.emit(constants.EVENTS.AUCTION_END, {});

      utils.getWindowTop.restore();

      sandbox.assert.callCount(adagioQueuePushSpy, 0);
    });
  });
});
