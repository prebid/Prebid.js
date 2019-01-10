import adagioAnalyticsAdapter from 'modules/adagioAnalyticsAdapter';
import {
  expect
} from 'chai';
import {
  parse as parseURL
} from 'src/url';
let adapterManager = require('src/adapterManager').default;
let events = require('src/events');
let constants = require('src/constants.json');

describe('adagio analytics adapter', () => {
  let xhr;
  let requests;

  beforeEach(() => {
    xhr = sinon.useFakeXMLHttpRequest();
    requests = [];
    xhr.onCreate = request => requests.push(request);
    sinon.stub(events, 'getEvents').returns([]);
  });

  afterEach(() => {
    xhr.restore();
    events.getEvents.restore();
  });

  describe('track', () => {
    adapterManager.registerAnalyticsAdapter({
      code: 'adagio',
      adapter: adagioAnalyticsAdapter
    });

    beforeEach(() => {
      adapterManager.enableAnalytics({
        provider: 'adagio'
      });
    });

    afterEach(() => {
      adagioAnalyticsAdapter.disableAnalytics();
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

      expect(window.top.ADAGIO.queue).length(3);

      let o = window.top.ADAGIO.queue.shift();
      expect(o).to.not.be.undefined;
      expect(o.action).to.equal('pb-analytics-event');
      expect(o.ts).to.not.be.undefined;
      expect(o.data).to.not.be.undefined;
      expect(o.data).to.deep.equal({eventName: constants.EVENTS.BID_REQUESTED, args: bidRequest});

      o = window.top.ADAGIO.queue.shift();
      expect(o).to.not.be.undefined;
      expect(o.action).to.equal('pb-analytics-event');
      expect(o.ts).to.not.be.undefined;
      expect(o.data).to.not.be.undefined;
      expect(o.data).to.deep.equal({eventName: constants.EVENTS.BID_RESPONSE, args: bidResponse});

      o = window.top.ADAGIO.queue.shift();
      expect(o).to.not.be.undefined;
      expect(o.action).to.equal('pb-analytics-event');
      expect(o.ts).to.not.be.undefined;
      expect(o.data).to.not.be.undefined;
      expect(o.data).to.deep.equal({eventName: constants.EVENTS.AUCTION_END, args: {}});
    });
  });
});
