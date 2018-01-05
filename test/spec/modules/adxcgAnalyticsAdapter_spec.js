import adxcgAnalyticsAdapter from 'modules/adxcgAnalyticsAdapter';
import { expect } from 'chai';
let adaptermanager = require('src/adaptermanager');
let events = require('src/events');
let constants = require('src/constants.json');

describe('adxcg analytics adapter', () => {
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
    it('builds and sends auction data', () => {
      let auctionTimestamp = 1496510254313;
      let initOptions = {
        publisherId: '42'
      };
      let bidRequest = {
        auctionId: 'requestIdData'
      };
      let bidResponse = {
        adId: 'adIdData',
        ad: 'adContent'
      };

      let bidTimeoutArgsV1 = [
        {
          bidId: '2baa51527bd015',
          bidder: 'bidderOne',
          adUnitCode: '/19968336/header-bid-tag-0',
          auctionId: '66529d4c-8998-47c2-ab3e-5b953490b98f'
        },
        {
          bidId: '6fe3b4c2c23092',
          bidder: 'bidderTwo',
          adUnitCode: '/19968336/header-bid-tag-0',
          auctionId: '66529d4c-8998-47c2-ab3e-5b953490b98f'
        }
      ];

      adaptermanager.registerAnalyticsAdapter({
        code: 'adxcg',
        adapter: adxcgAnalyticsAdapter
      });

      adaptermanager.enableAnalytics({
        provider: 'adxcg',
        options: initOptions
      });

      // Step 1: Send auction init event
      events.emit(constants.EVENTS.AUCTION_INIT, {
        timestamp: auctionTimestamp
      });

      // Step 2: Send bid requested event
      events.emit(constants.EVENTS.BID_REQUESTED, bidRequest);

      // Step 3: Send bid response event
      events.emit(constants.EVENTS.BID_RESPONSE, bidResponse);

      // Step 4: Send bid time out event
      events.emit(constants.EVENTS.BID_TIMEOUT, bidTimeoutArgsV1);

      // Step 5: Send auction end event
      events.emit(constants.EVENTS.AUCTION_END, {});

      expect(requests.length).to.equal(1);

      let auctionEventData = JSON.parse(requests[0].requestBody);

      expect(auctionEventData.bidRequests.length).to.equal(1);
      expect(auctionEventData.bidRequests[0]).to.deep.equal(bidRequest);

      expect(auctionEventData.bidResponses.length).to.equal(1);
      expect(auctionEventData.bidResponses[0].adId).to.equal(bidResponse.adId);
      expect(auctionEventData.bidResponses[0]).to.not.have.property('ad');

      expect(auctionEventData.initOptions).to.deep.equal(initOptions);

      expect(auctionEventData.auctionTimestamp).to.equal(auctionTimestamp);

      expect(auctionEventData.bidTimeout).to.deep.equal(['bidderOne', 'bidderTwo']);

      // Step 6: Send auction bid won event
      events.emit(constants.EVENTS.BID_WON, {
        adId: 'adIdData',
        ad: 'adContent'
      });

      expect(requests.length).to.equal(2);

      let winEventData = JSON.parse(requests[1].requestBody);

      expect(winEventData.bidWon.adId).to.equal(bidResponse.adId);
      expect(winEventData.bidWon).to.not.have.property('ad');
      expect(winEventData.initOptions).to.deep.equal(initOptions);
      expect(winEventData.auctionTimestamp).to.equal(auctionTimestamp);
    });
  });
});
