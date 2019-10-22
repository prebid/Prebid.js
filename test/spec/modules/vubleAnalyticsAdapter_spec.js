import vubleAnalytics from 'modules/vubleAnalyticsAdapter';
import { expect } from 'chai';
let events = require('src/events');
let adapterManager = require('src/adapterManager').default;
let constants = require('src/constants.json');

describe('Vuble Prebid Analytic', function () {
  let xhr;
  before(function () {
    xhr = sinon.useFakeXMLHttpRequest();
  });
  after(function () {
    vubleAnalytics.disableAnalytics();
    xhr.restore();
  });

  describe('enableAnalytics', function () {
    beforeEach(function () {
      sinon.spy(vubleAnalytics, 'track');
      sinon.stub(events, 'getEvents').returns([]);
    });

    afterEach(function () {
      vubleAnalytics.track.restore();
      events.getEvents.restore();
    });
    it('should catch all events', function () {
      adapterManager.registerAnalyticsAdapter({
        code: 'vuble',
        adapter: vubleAnalytics
      });

      adapterManager.enableAnalytics({
        provider: 'vuble',
        options: {
          pubId: 18,
          env: 'net'
        }
      });

      let auction_id = 'test';

      // Step 1: Auction init
      events.emit(constants.EVENTS.AUCTION_INIT, {
        auctionId: auction_id,
        timestamp: 1496510254313,
      });

      // Step 2: Bid request
      events.emit(constants.EVENTS.BID_REQUESTED, {
        auctionId: auction_id,
        auctionStart: 1509369418387,
        timeout: 3000,
        bids: [
          {
            bidder: 'vuble',
            params: {
              env: 'net',
              pubId: '3',
              zoneId: '12345',
              floorPrice: 5.50 // optional
            },
            sizes: [[640, 360]],
            mediaTypes: {
              video: {
                context: 'instream'
              }
            },
            bidId: 'abdc'
          },
          {
            bidder: 'vuble',
            params: {
              env: 'com',
              pubId: '8',
              zoneId: '2468',
              referrer: 'https://www.vuble.fr/'
            },
            sizes: '640x360',
            mediaTypes: {
              video: {
                context: 'outstream'
              }
            },
            bidId: 'efgh',
          },
        ],
      });

      // Step 3: Bid response
      events.emit(constants.EVENTS.BID_RESPONSE, {
        width: '640',
        height: '360',
        pub_id: '3',
        dealId: 'aDealId',
        zone_id: '12345',
        context: 'instream',
        floor_price: 5.5,
        url: 'https://www.vuble.tv/',
        env: 'net',
        bid_id: 'abdc'
      });

      // Step 4: Bid won
      events.emit(constants.EVENTS.BID_WON, {
        adId: 'adIdTestWin',
        ad: 'adContentTestWin',
        auctionId: auction_id,
        width: 640,
        height: 360
      });

      // Step 4: Auction end
      events.emit(constants.EVENTS.AUCTION_END, {
        auctionId: auction_id
      });

      // Step 5: Check if the number of call is good (5)
      sinon.assert.callCount(vubleAnalytics.track, 5);
    });
  });
});
