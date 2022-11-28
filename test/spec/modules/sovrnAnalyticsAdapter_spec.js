import sovrnAnalyticsAdapter from '../../../modules/sovrnAnalyticsAdapter.js';
import { expect } from 'chai';
import {config} from 'src/config.js';
import adaptermanager from 'src/adapterManager.js';
import { server } from 'test/mocks/xhr.js';
var assert = require('assert');

let events = require('src/events');
let constants = require('src/constants.json');

/**
 * Emit analytics events
 * @param {array} eventArr - array of objects to define the events that will fire
 *    @param {object} eventObj - key is eventType, value is event
 * @param {string} auctionId - the auction id to attached to the events
 */
function emitEvent(eventType, event, auctionId) {
  event.auctionId = auctionId;
  events.emit(constants.EVENTS[eventType], event);
}

let auctionStartTimestamp = Date.now();
let timeout = 3000;
let auctionInit = {
  timestamp: auctionStartTimestamp,
  timeout: timeout
};
let bidderCode = 'sovrn';
let bidderRequestId = '123bri';
let adUnitCode = 'div';
let adUnitCode2 = 'div2';
let bidId = 'bidid';
let bidId2 = 'bidid2';
let tId = '7aafa3ee-a80a-46d7-a4a0-cbcba463d97a';
let tId2 = '99dca3ee-a80a-46d7-a4a0-cbcba463d97e';
let bidRequested = {
  auctionStart: auctionStartTimestamp,
  bidderCode: bidderCode,
  bidderRequestId: bidderRequestId,
  bids: [
    {
      adUnitCode: adUnitCode,
      bidId: bidId,
      bidder: bidderCode,
      bidderRequestId: '10340af0c7dc72',
      sizes: [[300, 250]],
      startTime: auctionStartTimestamp + 100,
      transactionId: tId
    },
    {
      adUnitCode: adUnitCode2,
      bidId: bidId2,
      bidder: bidderCode,
      bidderRequestId: '10340af0c7dc72',
      sizes: [[300, 250]],
      startTime: auctionStartTimestamp + 100,
      transactionId: tId2
    }
  ],
  doneCbCallCount: 1,
  start: auctionStartTimestamp,
  timeout: timeout
};
let bidResponse = {
  bidderCode: bidderCode,
  width: 300,
  height: 250,
  statusMessage: 'Bid available',
  adId: '3870e27a5752fb',
  mediaType: 'banner',
  source: 'client',
  requestId: bidId,
  cpm: 0.8584999918937682,
  creativeId: 'cridprebidrtb',
  dealId: null,
  currency: 'USD',
  netRevenue: true,
  ad: '<div>divvy mcdiv</div>',
  ttl: 60000,
  responseTimestamp: auctionStartTimestamp + 150,
  requestTimestamp: auctionStartTimestamp + 100,
  bidder: bidderCode,
  adUnitCode: adUnitCode,
  timeToRespond: 50,
  pbLg: '0.50',
  pbMg: '0.80',
  pbHg: '0.85',
  pbAg: '0.85',
  pbDg: '0.85',
  pbCg: '',
  size: '300x250',
  adserverTargeting: {
    hb_bidder: bidderCode,
    hb_adid: '3870e27a5752fb',
    hb_pb: '0.85'
  },
  status: 'rendered'
};

let bidResponse2 = {
  bidderCode: bidderCode,
  width: 300,
  height: 250,
  statusMessage: 'Bid available',
  adId: '9999e27a5752fb',
  mediaType: 'banner',
  source: 'client',
  requestId: bidId2,
  cpm: 0.12,
  creativeId: 'cridprebidrtb',
  dealId: null,
  currency: 'USD',
  netRevenue: true,
  ad: '<div>divvy mcdiv</div>',
  ttl: 60000,
  responseTimestamp: auctionStartTimestamp + 150,
  requestTimestamp: auctionStartTimestamp + 100,
  bidder: bidderCode,
  adUnitCode: adUnitCode2,
  timeToRespond: 50,
  pbLg: '0.10',
  pbMg: '0.10',
  pbHg: '0.10',
  pbAg: '0.10',
  pbDg: '0.10',
  pbCg: '',
  size: '300x250',
  adserverTargeting: {
    hb_bidder: bidderCode,
    hb_adid: '9999e27a5752fb',
    hb_pb: '0.10'
  },
  status: 'rendered'
};
let bidAdjustment = {};
for (var k in bidResponse) bidAdjustment[k] = bidResponse[k];
bidAdjustment.cpm = 0.8;
let bidAdjustmentNoMatchingRequest = {
  bidderCode: 'not-sovrn',
  width: 300,
  height: 250,
  statusMessage: 'Bid available',
  adId: '1',
  mediaType: 'banner',
  source: 'client',
  requestId: '1',
  cpm: 0.10,
  creativeId: '',
  dealId: null,
  currency: 'USD',
  netRevenue: true,
  ad: '<div>divvy mcdiv</div>',
  ttl: 60000,
  responseTimestamp: auctionStartTimestamp + 150,
  requestTimestamp: auctionStartTimestamp + 100,
  bidder: 'not-sovrn',
  adUnitCode: '',
  timeToRespond: 50,
  pbLg: '0.00',
  pbMg: '0.10',
  pbHg: '0.10',
  pbAg: '0.10',
  pbDg: '0.10',
  pbCg: '',
  size: '300x250',
  adserverTargeting: {
    hb_bidder: 'not-sovrn',
    hb_adid: '1',
    hb_pb: '0.10'
  },
};
let bidResponseNoMatchingRequest = bidAdjustmentNoMatchingRequest;

describe('Sovrn Analytics Adapter', function () {
  beforeEach(() => {
    sinon.stub(events, 'getEvents').returns([]);
  });
  afterEach(() => {
    events.getEvents.restore();
  });

  describe('enableAnalytics ', function () {
    beforeEach(() => {
      sinon.spy(sovrnAnalyticsAdapter, 'track');
    });
    afterEach(() => {
      sovrnAnalyticsAdapter.disableAnalytics();
      sovrnAnalyticsAdapter.track.restore();
    });

    it('should catch all events if affiliate id present', function () {
      adaptermanager.enableAnalytics({
        provider: 'sovrn',
        options: {
          sovrnId: 123
        }
      });

      events.emit(constants.EVENTS.AUCTION_INIT, {});
      events.emit(constants.EVENTS.AUCTION_END, {});
      events.emit(constants.EVENTS.BID_REQUESTED, {});
      events.emit(constants.EVENTS.BID_RESPONSE, {});
      events.emit(constants.EVENTS.BID_WON, {});

      // 5 SovrnAnalytics events + 1 Clean.io event
      sinon.assert.callCount(sovrnAnalyticsAdapter.track, 6);
    });

    it('should catch no events if no affiliate id', function () {
      adaptermanager.enableAnalytics({
        provider: 'sovrn',
        options: {
        }
      });

      events.emit(constants.EVENTS.AUCTION_INIT, {});
      events.emit(constants.EVENTS.AUCTION_END, {});
      events.emit(constants.EVENTS.BID_REQUESTED, {});
      events.emit(constants.EVENTS.BID_RESPONSE, {});
      events.emit(constants.EVENTS.BID_WON, {});

      sinon.assert.callCount(sovrnAnalyticsAdapter.track, 0);
    });
  });

  describe('sovrnAnalyticsAdapter ', function() {
    beforeEach(() => {
      sovrnAnalyticsAdapter.enableAnalytics({
        provider: 'sovrn',
        options: {
          sovrnId: 123
        }
      });
      sinon.spy(sovrnAnalyticsAdapter, 'track');
    });
    afterEach(() => {
      sovrnAnalyticsAdapter.disableAnalytics();
      sovrnAnalyticsAdapter.track.restore();
    });
    it('should have correct type', function () {
      assert.equal(sovrnAnalyticsAdapter.getAdapterType(), 'endpoint')
    })
  });

  describe('auction data collector ', function() {
    beforeEach(() => {
      sovrnAnalyticsAdapter.enableAnalytics({
        provider: 'sovrn',
        options: {
          sovrnId: 123
        }
      });
      sinon.spy(sovrnAnalyticsAdapter, 'track');
    });
    afterEach(() => {
      sovrnAnalyticsAdapter.disableAnalytics();
      sovrnAnalyticsAdapter.track.restore();
    });
    it('should create auctiondata record from init ', function () {
      let auctionId = '123.123.123.123';
      emitEvent('AUCTION_INIT', auctionInit, auctionId);

      let auctionData = sovrnAnalyticsAdapter.getAuctions();
      let currentAuction = auctionData[auctionId];
      assert(currentAuction);
      let expectedTimeOutData = {
        buffer: config.getConfig('timeoutBuffer'),
        bidder: config.getConfig('bidderTimeout'),
      };
      expect(currentAuction.auction.timeouts).to.deep.equal(expectedTimeOutData);
      assert.equal(currentAuction.auction.payload, 'auction');
      assert.equal(currentAuction.auction.priceGranularity, config.getConfig('priceGranularity'))
      assert.equal(currentAuction.auction.auctionId, auctionId);
      assert.equal(currentAuction.auction.sovrnId, 123);
    });
    it('should create a bidrequest object ', function() {
      let auctionId = '234.234.234.234';
      emitEvent('AUCTION_INIT', auctionInit, auctionId);
      emitEvent('BID_REQUESTED', bidRequested, auctionId);

      let auctionData = sovrnAnalyticsAdapter.getAuctions();
      let currentAuction = auctionData[auctionId];
      assert(currentAuction);
      let requests = currentAuction.auction.requests;
      assert(requests);
      assert.equal(requests.length, 1);
      assert.equal(requests[0].bidderCode, bidderCode);
      assert.equal(requests[0].bidderRequestId, bidderRequestId);
      assert.equal(requests[0].timeout, timeout);
      let bids = requests[0].bids;
      assert(bids);
      assert.equal(bids.length, 2);
      assert.equal(bids[0].bidId, bidId);
      assert.equal(bids[0].bidder, bidderCode);
      assert.equal(bids[0].transactionId, tId);
      assert.equal(bids[0].sizes.length, 1);
      assert.equal(bids[0].sizes[0][0], 300);
      assert.equal(bids[0].sizes[0][1], 250);
      expect(requests[0]).to.not.have.property('doneCbCallCount');
      expect(requests[0]).to.not.have.property('auctionId');
    });
    it('should add results to the bid with response ', function () {
      let auctionId = '345.345.345.345';
      emitEvent('AUCTION_INIT', auctionInit, auctionId);
      emitEvent('BID_REQUESTED', bidRequested, auctionId);
      emitEvent('BID_RESPONSE', bidResponse, auctionId);

      let auctionData = sovrnAnalyticsAdapter.getAuctions();
      let currentAuction = auctionData[auctionId];
      let returnedBid = currentAuction.auction.requests[0].bids[0];
      assert.equal(returnedBid.bidId, bidId);
      assert.equal(returnedBid.bidder, bidderCode);
      assert.equal(returnedBid.transactionId, tId);
      assert.equal(returnedBid.sizes.length, 1);
      assert.equal(returnedBid.sizes[0][0], 300);
      assert.equal(returnedBid.sizes[0][1], 250);
      assert.equal(returnedBid.adserverTargeting.hb_adid, '3870e27a5752fb');
      assert.equal(returnedBid.adserverTargeting.hb_bidder, bidderCode);
      assert.equal(returnedBid.adserverTargeting.hb_pb, '0.85');
      assert.equal(returnedBid.cpm, 0.8584999918937682);
    });
    it('should add new unsynced bid if no request exists for response ', function () {
      let auctionId = '456.456.456.456';
      emitEvent('AUCTION_INIT', auctionInit, auctionId);
      emitEvent('BID_REQUESTED', bidRequested, auctionId);
      emitEvent('BID_RESPONSE', bidResponseNoMatchingRequest, auctionId);

      let auctionData = sovrnAnalyticsAdapter.getAuctions();
      let currentAuction = auctionData[auctionId];
      let requests = currentAuction.auction.requests;
      assert(requests);
      assert.equal(requests.length, 1);
      let bidRequest = requests[0].bids[0];
      expect(bidRequest).to.not.have.property('adserverTargeting');
      expect(bidRequest).to.not.have.property('cpm');
      expect(currentAuction.auction.unsynced[0]).to.deep.equal(bidResponseNoMatchingRequest);
    });
    it('should adjust the bid ', function () {
      let auctionId = '567.567.567.567';
      emitEvent('AUCTION_INIT', auctionInit, auctionId);
      emitEvent('BID_REQUESTED', bidRequested, auctionId);
      emitEvent('BID_ADJUSTMENT', bidResponse, auctionId);
      emitEvent('BID_RESPONSE', bidAdjustment, auctionId);

      let auctionData = sovrnAnalyticsAdapter.getAuctions();
      let currentAuction = auctionData[auctionId];
      let returnedBid = currentAuction.auction.requests[0].bids[0];
      assert.equal(returnedBid.cpm, 0.8);
      assert.equal(returnedBid.originalValues.cpm, 0.8584999918937682);
    });
  });
  describe('auction data send ', function() {
    let expectedPostBody = {
      sovrnId: 123,
      auctionId: '678.678.678.678',
      payload: 'auction',
      priceGranularity: 'medium',
    };
    let expectedRequests = {
      bidderCode: 'sovrn',
      bidderRequestId: '123bri',
      timeout: 3000
    };
    let expectedBids = {
      adUnitCode: 'div',
      bidId: 'bidid',
      bidder: 'sovrn',
      bidderRequestId: '10340af0c7dc72',
      transactionId: '7aafa3ee-a80a-46d7-a4a0-cbcba463d97a',
      width: 300,
      height: 250,
      statusMessage: 'Bid available',
      adId: '3870e27a5752fb',
      mediaType: 'banner',
      source: 'client',
      cpm: 0.8584999918937682,
      creativeId: 'cridprebidrtb',
      dealId: null,
      currency: 'USD',
      netRevenue: true,
      ttl: 60000,
      timeToRespond: 50,
      size: '300x250',
      status: 'rendered',
      isAuctionWinner: true
    };
    let SecondAdUnitExpectedBids = {
      adUnitCode: 'div2',
      bidId: 'bidid2',
      bidder: 'sovrn',
      bidderRequestId: '10340af0c7dc72',
      transactionId: '99dca3ee-a80a-46d7-a4a0-cbcba463d97e',
      width: 300,
      height: 250,
      statusMessage: 'Bid available',
      adId: '9999e27a5752fb',
      mediaType: 'banner',
      source: 'client',
      cpm: 0.12,
      creativeId: 'cridprebidrtb',
      dealId: null,
      currency: 'USD',
      netRevenue: true,
      ttl: 60000,
      timeToRespond: 50,
      size: '300x250',
      status: 'rendered',
      isAuctionWinner: true
    };
    let expectedAdServerTargeting = {
      hb_bidder: 'sovrn',
      hb_adid: '3870e27a5752fb',
      hb_pb: '0.85'
    };
    beforeEach(() => {
      sovrnAnalyticsAdapter.enableAnalytics({
        provider: 'sovrn',
        options: {
          sovrnId: 123
        }
      });
      sinon.spy(sovrnAnalyticsAdapter, 'track');
    });
    afterEach(() => {
      sovrnAnalyticsAdapter.disableAnalytics();
      sovrnAnalyticsAdapter.track.restore();
    });
    it('should send auction data ', function () {
      let auctionId = '678.678.678.678';
      emitEvent('AUCTION_INIT', auctionInit, auctionId);
      emitEvent('BID_REQUESTED', bidRequested, auctionId);
      emitEvent('BID_RESPONSE', bidResponse, auctionId);
      emitEvent('BID_RESPONSE', bidResponse2, auctionId)
      emitEvent('AUCTION_END', {}, auctionId);
      let requestBody = JSON.parse(server.requests[0].requestBody);
      let requestsFromRequestBody = requestBody.requests[0];
      let bidsFromRequests = requestsFromRequestBody.bids[0];
      expect(requestBody).to.deep.include(expectedPostBody);
      expect(requestBody.timeouts).to.deep.equal({buffer: 400, bidder: 3000});
      expect(requestsFromRequestBody).to.deep.include(expectedRequests);
      expect(bidsFromRequests).to.deep.include(expectedBids);
      let bidsFromRequests2 = requestsFromRequestBody.bids[1];
      expect(bidsFromRequests2).to.deep.include(SecondAdUnitExpectedBids);
      expect(bidsFromRequests.adserverTargeting).to.deep.include(expectedAdServerTargeting);
    });
  });
  describe('bid won data send ', function() {
    let auctionId = '789.789.789.789';
    let creativeId = 'cridprebidrtb';
    let requestId = 'requestId69';
    let bidWonEvent = {
      ad: 'html',
      adId: 'adId',
      adUnitCode: adUnitCode,
      auctionId: auctionId,
      bidder: bidderCode,
      bidderCode: bidderCode,
      cpm: 1.01,
      creativeId: creativeId,
      currency: 'USD',
      height: 250,
      mediaType: 'banner',
      requestId: requestId,
      size: '300x250',
      source: 'client',
      status: 'rendered',
      statusMessage: 'Bid available',
      timeToRespond: 421,
      ttl: 60,
      width: 300
    };
    let expectedBidWonBody = {
      sovrnId: 123,
      payload: 'winner'
    };
    let expectedWinningBid = {
      bidderCode: bidderCode,
      width: 300,
      height: 250,
      statusMessage: 'Bid available',
      adId: 'adId',
      mediaType: 'banner',
      source: 'client',
      requestId: requestId,
      cpm: 1.01,
      creativeId: creativeId,
      currency: 'USD',
      ttl: 60,
      auctionId: auctionId,
      bidder: bidderCode,
      adUnitCode: adUnitCode,
      timeToRespond: 421,
      size: '300x250',
    };
    beforeEach(() => {
      sovrnAnalyticsAdapter.enableAnalytics({
        provider: 'sovrn',
        options: {
          sovrnId: 123
        }
      });
      sinon.spy(sovrnAnalyticsAdapter, 'track');
    });
    afterEach(() => {
      sovrnAnalyticsAdapter.disableAnalytics();
      sovrnAnalyticsAdapter.track.restore();
    });
    it('should send bid won data ', function () {
      emitEvent('AUCTION_INIT', auctionInit, auctionId);
      emitEvent('BID_WON', bidWonEvent, auctionId);
      let requestBody = JSON.parse(server.requests[0].requestBody);
      expect(requestBody).to.deep.include(expectedBidWonBody);
      expect(requestBody.winningBid).to.deep.include(expectedWinningBid);
    });
  });
  describe('Error Tracking', function() {
    beforeEach(() => {
      sovrnAnalyticsAdapter.enableAnalytics({
        provider: 'sovrn',
        options: {
          sovrnId: 123
        }
      });
      sinon.spy(sovrnAnalyticsAdapter, 'track');
    });
    afterEach(() => {
      sovrnAnalyticsAdapter.disableAnalytics()
      sovrnAnalyticsAdapter.track.restore()
    });
    it('should send an error message when a bid is received for a closed auction', function() {
      let auctionId = '678.678.678.678';
      emitEvent('AUCTION_INIT', auctionInit, auctionId)
      emitEvent('BID_REQUESTED', bidRequested, auctionId)
      emitEvent('AUCTION_END', {}, auctionId)
      server.requests[0].respond(200)
      emitEvent('BID_RESPONSE', bidResponse, auctionId)
      let requestBody = JSON.parse(server.requests[1].requestBody)
      expect(requestBody.payload).to.equal('error')
      expect(requestBody.message).to.include('Event Received after Auction Close Auction Id')
    })
  })
})
