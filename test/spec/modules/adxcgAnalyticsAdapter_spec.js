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
  });

  afterEach(() => {
    xhr.restore();
  });

  describe('track', () => {
    it('builds and sends auction data', () => {
      let auctionTimestamp = 42;
      let initOptions = {
        publisherId: '42'
      };
      let bidRequest = {
        requestId: 'requestIdData'
      };
      let bidResponse = {
        adId: 'adIdData',
        ad: 'adContent'
      };

      adaptermanager.registerAnalyticsAdapter({
        code: 'adxcg',
        adapter: adxcgAnalyticsAdapter
      });

      adaptermanager.enableAnalytics({
        provider: 'adxcg',
        options: initOptions
      });

      events.emit(constants.EVENTS.AUCTION_INIT, {
        timestamp: auctionTimestamp
      });
      events.emit(constants.EVENTS.BID_REQUESTED, bidRequest);
      events.emit(constants.EVENTS.BID_RESPONSE, bidResponse);
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
