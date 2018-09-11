import adagioAnalyticsAdapter from 'modules/adagioAnalyticsAdapter';
import {
  expect
} from 'chai';
import {
  parse as parseURL
} from 'src/url';
let adaptermanager = require('src/adaptermanager');
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
    adaptermanager.registerAnalyticsAdapter({
      code: 'adagio',
      adapter: adagioAnalyticsAdapter
    });

    beforeEach(() => {
      adaptermanager.enableAnalytics({
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

      expect(requests.length).to.equal(1);

      let expectedPayload = {
        pv_id: '_',
        siteId: '2',
        cat: 'IAB12,IAB12-2',
        pgtyp: 'article',
        dvc: '2',
        evt: 'auction_end'
      };
      let expectedParams = [{
        adu_id: 'div-1',
        plcmt: 'pave_top',
        bids: [{
          bidder: 'adagio',
          cpm: 6.2189757658226075,
          net_rev: 0,
          cur: '',
          ttr: 132,
          sts: 'Bid available',
          w: 300,
          h: 250
        }]}, {
        adu_id: 'div-2',
        plcmt: 'ban_top',
        bids: [
        ]
      }];

      let urlParams = parseURL(requests[0].url);
      let urlGlobalsParam = Object.assign({}, urlParams.search);
      delete urlGlobalsParam.b;
      expect(urlGlobalsParam).to.deep.equal(expectedPayload);
      expect(atob(urlParams.search.b)).to.deep.equal(JSON.stringify(expectedParams));
    });
  });
});
