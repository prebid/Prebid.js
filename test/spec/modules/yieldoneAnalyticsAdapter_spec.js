import yieldoneAnalytics from 'modules/yieldoneAnalyticsAdapter';
import { targeting } from 'src/targeting';
import { expect } from 'chai';
let events = require('src/events');
let adapterManager = require('src/adapterManager').default;
let constants = require('src/constants.json');

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
          refererInfo: {referer: testReferrer},
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
          refererInfo: {referer: testReferrer},
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
          refererInfo: {referer: testReferrer},
          bids: [
            {
              adUnitCode: '0000',
              auctionId: auctionId,
              bidId: '12131',
              bidder: 'biddertest_3',
              mediaTypes: {banner: {sizes: [[300, 250], [336, 280]]}},
              params: {param_1: '111', param_2: '222'},
              sizes: [[300, 250], [336, 280]]
            }
          ]
        }
      ];

      const responses = [
        {
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
        }
      ];

      const winner = {
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

      const expectedEvents = [
        {
          eventType: constants.EVENTS.AUCTION_INIT,
          page: {url: testReferrer},
          params: {
            config: initOptions,
            auctionId: auctionId,
            pubId: initOptions.pubId
          }
        },
        {
          eventType: constants.EVENTS.BID_REQUESTED,
          page: {url: testReferrer},
          params: Object.assign({pubId: initOptions.pubId}, request[0])
        },
        {
          eventType: constants.EVENTS.BID_REQUESTED,
          page: {url: testReferrer},
          params: Object.assign({pubId: initOptions.pubId}, request[1])
        },
        {
          eventType: constants.EVENTS.BID_REQUESTED,
          page: {url: testReferrer},
          params: Object.assign({pubId: initOptions.pubId}, request[2])
        },
        {
          eventType: constants.EVENTS.BID_RESPONSE,
          page: {url: testReferrer},
          params: Object.assign({pubId: initOptions.pubId}, responses[0])
        },
        {
          eventType: constants.EVENTS.BID_RESPONSE,
          page: {url: testReferrer},
          params: Object.assign({pubId: initOptions.pubId}, responses[1])
        },
        {
          eventType: constants.EVENTS.BID_RESPONSE,
          page: {url: testReferrer},
          params: Object.assign({pubId: initOptions.pubId}, responses[2])
        },
        {
          eventType: constants.EVENTS.BID_TIMEOUT,
          page: {url: testReferrer},
          params: Object.assign({pubId: initOptions.pubId}, request[2])
        },
        {
          eventType: constants.EVENTS.AUCTION_END,
          page: {url: testReferrer},
          params: {
            auctionId: auctionId,
            pubId: initOptions.pubId,
            adServerTargeting: fakeTargeting
          }
        }
      ];

      const wonExpectedEvents = [
        {
          eventType: constants.EVENTS.BID_WON,
          page: {url: testReferrer},
          params: Object.assign({pubId: initOptions.pubId, adServerTargeting: fakeTargeting}, winner)
        }
      ];

      adapterManager.enableAnalytics({
        provider: 'yieldone',
        options: initOptions
      });

      events.emit(constants.EVENTS.AUCTION_INIT, {config: initOptions, auctionId: auctionId});

      events.emit(constants.EVENTS.BID_REQUESTED, request[0]);
      events.emit(constants.EVENTS.BID_REQUESTED, request[1]);
      events.emit(constants.EVENTS.BID_REQUESTED, request[2]);

      events.emit(constants.EVENTS.BID_RESPONSE, responses[0]);
      events.emit(constants.EVENTS.BID_RESPONSE, responses[1]);
      events.emit(constants.EVENTS.BID_RESPONSE, responses[2]);

      events.emit(constants.EVENTS.BID_TIMEOUT, [responses[3]]);

      events.emit(constants.EVENTS.AUCTION_END, {auctionId: auctionId});

      expect(yieldoneAnalytics.eventsStorage[auctionId]).to.deep.equal(expectedEvents);

      delete yieldoneAnalytics.eventsStorage[auctionId];

      setTimeout(function() {
        events.emit(constants.EVENTS.BID_WON, winner);

        sinon.assert.callCount(sendStatStub, 2);
        expect(yieldoneAnalytics.eventsStorage[auctionId]).to.deep.equal(wonExpectedEvents);

        delete yieldoneAnalytics.eventsStorage[auctionId];
        done();
      }, 1000);
    });
  });
});
