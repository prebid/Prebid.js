import scaleableAnalytics from 'modules/scaleableAnalyticsAdapter.js';
import { expect } from 'chai';
import * as events from 'src/events.js';
import { EVENTS } from 'src/constants.js';
import { server } from 'test/mocks/xhr.js';

const BID_TIMEOUT = EVENTS.BID_TIMEOUT;
const AUCTION_INIT = EVENTS.AUCTION_INIT;
const BID_WON = EVENTS.BID_WON;
const AUCTION_END = EVENTS.AUCTION_END;

describe('Scaleable Analytics Adapter', function() {
  const bidsReceivedObj = {
    adUnitCode: '12345',
    bidderCode: 'test-code',
    cpm: 3.14,
    currency: 'USD',
    dealId: null,
    mediaType: 'banner',
    timeToRespond: 285,
    size: '300x250'
  };

  const MOCK_DATA = {
    adUnitCode: '12345',
    auctionEnd: {
      bidsReceived: [bidsReceivedObj]
    },
    bidderRequests: [{
      bids: [{
        adUnitCode: '12345',
        bidder: 'test-code',
        params: {
          test: 'value'
        }
      }]
    }],
    site: '5c4fab7a829e955d6c265e72',
    bidResponse: {
      adUnitCode: '12345',
      bidderCode: 'test-code',
      cpm: 3.14,
      timeToRespond: 285,
      params: [{
        test: 'value'
      }]
    },
    bidTimeout: [
      {
        adUnitCode: '67890',
        bidder: 'test-code'
      }
    ]
  };

  const bidObj = MOCK_DATA.bidderRequests[0].bids[0];

  const expectedBidRequests = [{bidder: 'scaleable_adunit_request'}].concat([
    {
      bidder: bidObj.bidder,
      params: bidObj.params
    }
  ]);

  MOCK_DATA.expectedRequestResponse = {
    event: 'request',
    site: MOCK_DATA.site,
    adunits: [{
      code: bidObj.adUnitCode,
      bidRequests: expectedBidRequests
    }]
  }

  MOCK_DATA.expectedBidTimeout = {
    [MOCK_DATA.bidTimeout[0].adUnitCode]: [{
      timeouts: 1,
      bidder: MOCK_DATA.bidTimeout[0].bidder
    }]
  };

  MOCK_DATA.expectedAuctionEndResponse = {
    event: 'bids',
    site: MOCK_DATA.site,
    adunits: [{
      code: MOCK_DATA.auctionEnd.bidsReceived[0].adUnitCode,
      bidData: [{
        bidder: bidsReceivedObj.bidderCode,
        cpm: bidsReceivedObj.cpm,
        currency: bidsReceivedObj.currency,
        dealId: bidsReceivedObj.dealId,
        type: bidsReceivedObj.mediaType,
        ttr: bidsReceivedObj.timeToRespond,
        size: bidsReceivedObj.size
      }]
    },
    {
      bidData: MOCK_DATA.expectedBidTimeout[MOCK_DATA.bidTimeout[0].adUnitCode],
      code: MOCK_DATA.bidTimeout[0].adUnitCode
    }]
  }

  describe('Event Handling', function() {
    beforeEach(function() {
      sinon.stub(events, 'getEvents').returns([]);

      scaleableAnalytics.enableAnalytics({
        provider: 'scaleable',
        options: {
          site: MOCK_DATA.site
        }
      });
    });

    afterEach(function() {
      events.getEvents.restore();
      scaleableAnalytics.disableAnalytics();
    });

    it('should handle the auction init event', function(done) {
      events.emit(AUCTION_INIT, {
        adUnitCodes: [MOCK_DATA.adUnitCode],
        bidderRequests: MOCK_DATA.bidderRequests
      });

      const result = JSON.parse(server.requests[0].requestBody);
      expect(result).to.deep.equal(MOCK_DATA.expectedRequestResponse);

      done();
    });

    it('should handle the bid timeout event', function() {
      events.emit(BID_TIMEOUT, MOCK_DATA.bidTimeout);

      const actual = scaleableAnalytics.getAuctionData();

      expect(actual).to.deep.equal(MOCK_DATA.expectedBidTimeout);
    });

    it('should handle the bid won event', function(done) {
      events.emit(BID_WON, MOCK_DATA.bidResponse);

      const result = JSON.parse(server.requests[0].requestBody);
      expect(result).to.deep.equal({
        adunit: MOCK_DATA.adUnitCode,
        code: MOCK_DATA.bidResponse.bidderCode,
        cpm: MOCK_DATA.bidResponse.cpm,
        ttr: MOCK_DATA.bidResponse.timeToRespond,
        params: MOCK_DATA.bidResponse.params,
        event: 'win',
        site: MOCK_DATA.site
      });

      done();
    });

    it('should handle the auction end event', function(done) {
      events.emit(AUCTION_END, MOCK_DATA.auctionEnd);

      const result = JSON.parse(server.requests[0].requestBody);
      expect(result).to.deep.equal(MOCK_DATA.expectedAuctionEndResponse);

      done();
    });
  });
});
