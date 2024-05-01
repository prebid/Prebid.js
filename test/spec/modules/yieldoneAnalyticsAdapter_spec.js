import yieldoneAnalytics from 'modules/yieldoneAnalyticsAdapter.js';
import { targeting } from 'src/targeting.js';
import { expect } from 'chai';
import _ from 'lodash';
import { EVENTS } from 'src/constants.js';

let events = require('src/events');
let adapterManager = require('src/adapterManager').default;

describe('Yieldone Prebid Analytic', function () {
  let sendStatStub;
  let getAllTargetingStub;
  const fakeTargeting = {
    '0000': {'someId': 'someValue'}
  };

  describe('enableAnalytics', function () {
    beforeEach(function () {
      sendStatStub = sinon.stub(yieldoneAnalytics, 'sendStat');
      getAllTargetingStub = sinon.stub(targeting, 'getAllTargeting').returns(fakeTargeting);
      sinon.stub(events, 'getEvents').returns([]);
    });

    afterEach(function () {
      sendStatStub.restore();
      getAllTargetingStub.restore();
      events.getEvents.restore();
    });

    after(function () {
      yieldoneAnalytics.disableAnalytics();
    });

    it('should catch all events', function (done) {
      adapterManager.registerAnalyticsAdapter({
        code: 'yieldone',
        adapter: yieldoneAnalytics
      });

      const initOptions = {
        pubId: '123456'
      };

      const auctionId = 'test-test-test';
      const testReferrer = 'http://test';

      const request = [
        {
          bidderCode: 'biddertest_1',
          auctionId: auctionId,
          refererInfo: {page: testReferrer},
          bids: [
            {
              adUnitCode: '0000',
              auctionId: auctionId,
              bidId: '1234',
              bidder: 'biddertest_1',
              mediaTypes: {banner: {sizes: [[300, 250], [336, 280]]}},
              params: {param1: '111', param2: '222'},
              sizes: [[300, 250], [336, 280]]
            },
            {
              adUnitCode: '0000',
              auctionId: auctionId,
              bidId: '5678',
              bidder: 'biddertest_1',
              mediaTypes: {banner: {sizes: [[300, 250], [336, 280]]}},
              params: {param1: '222', param2: '222'},
              sizes: [[300, 250], [336, 280]]
            }
          ]
        },
        {
          bidderCode: 'biddertest_2',
          auctionId: auctionId,
          refererInfo: {page: testReferrer},
          bids: [
            {
              adUnitCode: '0000',
              auctionId: auctionId,
              bidId: '91011',
              bidder: 'biddertest_2',
              mediaTypes: {banner: {sizes: [[300, 250], [336, 280]]}},
              params: {paramA: '111', paramB: '222'},
              sizes: [[300, 250], [336, 280]]
            }
          ]
        },
        {
          bidderCode: 'biddertest_3',
          auctionId: auctionId,
          refererInfo: {page: testReferrer},
          bids: [
            {
              adUnitCode: '0000',
              auctionId: auctionId,
              bidId: '12131',
              bidder: 'biddertest_3',
              mediaTypes: {banner: {sizes: [[300, 250], [336, 280]]}},
              params: {param_1: '111', param_2: '222'},
              sizes: [[300, 250], [336, 280]]
            },
            {
              adUnitCode: '0000',
              auctionId: auctionId,
              bidId: '14151',
              bidder: 'biddertest_3',
              mediaTypes: {banner: {sizes: [[300, 250], [336, 280]]}},
              params: {param_1: '333', param_2: '222'},
              sizes: [[300, 250], [336, 280]]
            }
          ]
        }
      ];

      const responses = [
        {
          ad: 'test ad content 1',
          width: 300,
          height: 250,
          statusMessage: 'Bid available',
          bidId: '1234',
          auctionId: auctionId,
          cpm: 0.1,
          bidder: 'biddertest_1',
          adUnitCode: '0000',
          timeToRespond: 100
        },
        {
          ad: 'test ad content 2',
          width: 336,
          height: 280,
          statusMessage: 'Bid available',
          bidId: '5678',
          auctionId: auctionId,
          cpm: 0.2,
          bidder: 'biddertest_1',
          adUnitCode: '0000',
          timeToRespond: 100
        },
        {
          ad: 'test ad content 3',
          width: 300,
          height: 250,
          statusMessage: 'Bid available',
          bidId: '91011',
          auctionId: auctionId,
          cpm: 0.3,
          bidder: 'biddertest_2',
          adUnitCode: '0000',
          timeToRespond: 100
        },
        {
          bidId: '12131',
          auctionId: auctionId,
          bidder: 'biddertest_3'
        },
        {
          bidId: '14151',
          auctionId: auctionId,
          bidder: 'biddertest_3'
        }
      ];

      const winner = {
        ad: 'test ad content 3',
        width: 300,
        height: 250,
        statusMessage: 'Bid available',
        bidId: '91011',
        auctionId: auctionId,
        cpm: 0.3,
        bidder: 'biddertest_2',
        adUnitCode: '0000',
        timeToRespond: 100
      };

      const auctionEnd = {
        auctionId: auctionId,
        bidsReceived: responses.slice(0, 3)
      };

      const preparedResponses = responses.map((resp) => {
        const res = Object.assign({}, resp);
        delete res.ad;
        return res;
      });

      const expectedEvents = [
        {
          eventType: EVENTS.AUCTION_INIT,
          params: {
            config: initOptions,
            auctionId: auctionId
          }
        },
        {
          eventType: EVENTS.BID_REQUESTED,
          params: Object.assign(request[0])
        },
        {
          eventType: EVENTS.BID_REQUESTED,
          params: Object.assign(request[1])
        },
        {
          eventType: EVENTS.BID_REQUESTED,
          params: Object.assign(request[2])
        },
        {
          eventType: EVENTS.BID_RESPONSE,
          params: Object.assign(preparedResponses[0])
        },
        {
          eventType: EVENTS.BID_RESPONSE,
          params: Object.assign(preparedResponses[1])
        },
        {
          eventType: EVENTS.BID_RESPONSE,
          params: Object.assign(preparedResponses[2])
        },
        {
          eventType: EVENTS.BID_TIMEOUT,
          params: Object.assign(request[2])
        }
      ];
      const expectedResult = {
        pubId: initOptions.pubId,
        page: {url: testReferrer},
        wrapper_version: '$prebid.version$',
        events: sinon.match(evs => {
          return !expectedEvents.some((expectedEvent) => evs.find(ev => _.isEqual(ev, expectedEvent)) === -1)
        })
      };

      const preparedWinnerParams = Object.assign({adServerTargeting: fakeTargeting}, winner);
      delete preparedWinnerParams.ad;
      const wonExpectedEvents = [
        {
          eventType: EVENTS.BID_WON,
          params: preparedWinnerParams
        }
      ];
      const wonExpectedResult = {
        pubId: initOptions.pubId,
        page: {url: testReferrer},
        wrapper_version: '$prebid.version$',
        events: wonExpectedEvents
      };

      adapterManager.enableAnalytics({
        provider: 'yieldone',
        options: initOptions
      });

      events.emit(EVENTS.AUCTION_INIT, { config: initOptions, auctionId: auctionId });

      events.emit(EVENTS.BID_REQUESTED, request[0]);
      events.emit(EVENTS.BID_REQUESTED, request[1]);
      events.emit(EVENTS.BID_REQUESTED, request[2]);

      events.emit(EVENTS.BID_RESPONSE, responses[0]);
      events.emit(EVENTS.BID_RESPONSE, responses[1]);
      events.emit(EVENTS.BID_RESPONSE, responses[2]);

      events.emit(EVENTS.BID_TIMEOUT, [responses[3], responses[4]]);

      events.emit(EVENTS.AUCTION_END, auctionEnd);

      sinon.assert.match(yieldoneAnalytics.eventsStorage[auctionId], expectedResult);

      delete yieldoneAnalytics.eventsStorage[auctionId];

      setTimeout(function() {
        events.emit(EVENTS.BID_WON, winner);

        sinon.assert.callCount(sendStatStub, 2)
        const billableEventIndex = yieldoneAnalytics.eventsStorage[auctionId].events.findIndex(event => event.eventType === EVENTS.BILLABLE_EVENT);
        if (billableEventIndex > -1) {
          yieldoneAnalytics.eventsStorage[auctionId].events.splice(billableEventIndex, 1);
        }
        expect(yieldoneAnalytics.eventsStorage[auctionId]).to.deep.equal(wonExpectedResult);

        delete yieldoneAnalytics.eventsStorage[auctionId];
        done();
      }, 1000);
    });
  });
});
