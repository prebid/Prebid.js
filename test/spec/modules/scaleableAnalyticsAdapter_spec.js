import scaleableAnalytics from 'modules/scaleableAnalyticsAdapter';
import { expect } from 'chai';
import events from 'src/events';
import CONSTANTS from 'src/constants.json';
import adapterManager from 'src/adapterManager';

const BID_TIMEOUT = CONSTANTS.EVENTS.BID_TIMEOUT;
const AUCTION_INIT = CONSTANTS.EVENTS.AUCTION_INIT;
const BID_RESPONSE = CONSTANTS.EVENTS.BID_RESPONSE;
const BID_WON = CONSTANTS.EVENTS.BID_WON;
const AUCTION_END = CONSTANTS.EVENTS.AUCTION_END;

describe('Scaleable Analytics Adapter', function() {
  const MOCK_DATA = {
    adUnitCode: '12345',
    site: '5c4fab7a829e955d6c265e72',
    bidResponse: {
      adUnitCode: '12345',
      bidderCode: 'test-code',
      cpm: 3.14,
      timeToRespond: 285
    },
    bidTimeout: [
      {
        adUnitCode: '67890',
        bidder: 'test-code'
      }
    ]
  };

  MOCK_DATA.expectedBidResponse = {
    event: 'bids',
    bids: [{
      code: MOCK_DATA.bidResponse.bidderCode,
      cpm: MOCK_DATA.bidResponse.cpm,
      ttr: MOCK_DATA.bidResponse.timeToRespond
    }],
    adunit: MOCK_DATA.adUnitCode,
    site: MOCK_DATA.site
  };

  MOCK_DATA.expectedBidTimeout = {
    event: 'bids',
    bids: [],
    timeouts: [MOCK_DATA.bidTimeout[0].bidder],
    adunit: MOCK_DATA.bidTimeout[0].adUnitCode,
    site: MOCK_DATA.site
  };

  let xhr;
  let requests;

  before(function() {
    xhr = sinon.useFakeXMLHttpRequest();
    xhr.onCreate = request => requests.push(request);
  });

  after(function() {
    xhr.restore();
  });

  describe('Event Handling', function() {
    beforeEach(function() {
      requests = [];
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
        adUnitCodes: [MOCK_DATA.adUnitCode]
      });

      const result = JSON.parse(requests[0].requestBody);
      expect(result).to.deep.equal({
        event: 'request',
        site: MOCK_DATA.site,
        adunit: MOCK_DATA.adUnitCode
      });

      done();
    });

    it('should handle the bid response event', function() {
      events.emit(BID_RESPONSE, MOCK_DATA.bidResponse);

      const actual = scaleableAnalytics.getAuctionData();

      expect(actual[MOCK_DATA.adUnitCode]).to.deep.equal(MOCK_DATA.expectedBidResponse);
    });

    it('should handle the bid timeout event', function() {
      events.emit(BID_TIMEOUT, MOCK_DATA.bidTimeout);

      const actual = scaleableAnalytics.getAuctionData();

      expect(actual[MOCK_DATA.bidTimeout[0].adUnitCode]).to.deep.equal(MOCK_DATA.expectedBidTimeout);
    });

    it('should handle the bid won event', function(done) {
      events.emit(BID_WON, MOCK_DATA.bidResponse);

      const result = JSON.parse(requests[0].requestBody);
      expect(result).to.deep.equal({
        adunit: MOCK_DATA.adUnitCode,
        code: MOCK_DATA.bidResponse.bidderCode,
        cpm: MOCK_DATA.bidResponse.cpm,
        ttr: MOCK_DATA.bidResponse.timeToRespond,
        event: 'win',
        site: MOCK_DATA.site
      });

      done();
    });

    it('should handle the auction end event', function(done) {
      events.emit(AUCTION_END, {});

      const result = JSON.parse(requests[0].requestBody);
      expect(result).to.deep.equal(MOCK_DATA.expectedBidResponse);

      done();
    });
  });
});
