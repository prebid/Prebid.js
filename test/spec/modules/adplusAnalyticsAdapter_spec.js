import adplusAnalyticsAdapter from 'modules/adplusAnalyticsAdapter.js';
import { expect } from 'chai';
import adapterManager from 'src/adapterManager.js';
import { server } from 'test/mocks/xhr.js';
import { EVENTS } from 'src/constants.js';
import sinon from 'sinon';
import * as refererDetection from 'src/refererDetection.js';

let events = require('src/events');

describe('AdPlus analytics adapter', function () {
  let sandbox, clock;

  beforeEach(function () {
    sandbox = sinon.createSandbox();
    sandbox.spy(console, 'log');
    sandbox.stub(refererDetection, 'getRefererInfo').returns(mockRefererInfo);

    clock = sandbox.useFakeTimers();
    sandbox.stub(events, 'getEvents').returns([]);
    adapterManager.enableAnalytics({ provider: 'adplus' });
  });

  afterEach(function () {
    sandbox.restore();
    adplusAnalyticsAdapter.reset();
  });

  const auctionId = 'test-auction-123';

  const mockRefererInfo = {
    page: 'https://test-site.com/page.html',
    domain: 'test-site.com',
    ref: 'https://google.com'
  };

  const bidsReceived = [
    {
      bidderCode: 'adplus',
      auctionId,
      adUnitCode: 'adunit-1',
      cpm: 5,
      currency: 'USD',
      size: '300x250',
      width: 300,
      height: 250,
      creativeId: 'crea-1',
      originalCpm: 5.5,
      originalCurrency: 'EUR',
      timeToRespond: 120,
      netRevenue: true,
      dealId: null,
      adId: 'ad-id-1',
      adUnitId: 'ad-unit-id-1',
      requestId: 'request-id-1',
      instl: 0,
      mediaType: 'banner',
      transactionId: 'transaction-id-1'
    },
    {
      bidderCode: 'adplus',
      auctionId,
      adUnitCode: 'adunit-2',
      cpm: 7,
      currency: 'USD',
      size: '728x90',
      width: 728,
      height: 90,
      creativeId: 'crea-2',
      originalCpm: 7.5,
      originalCurrency: 'EUR',
      timeToRespond: 110,
      netRevenue: true,
      dealId: 'deal123',
      adId: 'ad-id-2',
      adUnitId: 'ad-unit-id-2',
      requestId: 'request-id-2',
      instl: 0,
      mediaType: 'banner',
      transactionId: 'transaction-id-2'
    }
  ];

  const bidWon1 = {
    auctionId,
    adUnitCode: 'adunit-1',
    bidderCode: 'adplus',
    cpm: 5,
    currency: 'USD',
    size: '300x250',
    width: 300,
    height: 250,
    creativeId: 'crea-1',
    originalCpm: 5.5,
    originalCurrency: 'EUR',
    timeToRespond: 120,
    netRevenue: true,
    dealId: null,
    adId: 'ad-id-1',
    adUnitId: 'ad-unit-id-1',
    requestId: 'request-id-1',
    instl: 0,
    mediaType: 'banner',
    transactionId: 'transaction-id-1'
  };

  const bidWon2 = {
    auctionId,
    adUnitCode: 'adunit-2',
    bidderCode: 'adplus',
    cpm: 7,
    currency: 'USD',
    size: '728x90',
    width: 728,
    height: 90,
    creativeId: 'crea-2',
    originalCpm: 7.5,
    originalCurrency: 'EUR',
    timeToRespond: 110,
    netRevenue: true,
    dealId: 'deal123',
    adId: 'ad-id-2',
    adUnitId: 'ad-unit-id-2',
    requestId: 'request-id-2',
    instl: 0,
    mediaType: 'banner',
    transactionId: 'transaction-id-2'
  };

  it('should store bids on AUCTION_END and not send immediately', function () {
    events.emit(EVENTS.AUCTION_END, {
      auctionId,
      bidsReceived
    });

    expect(server.requests.length).to.equal(0);

    const storedData = adplusAnalyticsAdapter.auctionBids[auctionId];
    expect(storedData).to.exist;
    expect(Object.keys(storedData)).to.have.length(2);
    expect(storedData['adunit-1'][0]).to.include({
      auctionId,
      adUnitCode: 'adunit-1',
      bidder: 'adplus',
      cpm: 5,
      currency: 'USD',
      originalCpm: 5.5,
      originalCurrency: 'EUR',
      adId: 'ad-id-1',
      adUnitId: 'ad-unit-id-1',
      requestId: 'request-id-1',
      instl: 0,
      mediaType: 'banner',
      transactionId: 'transaction-id-1'
    });
    expect(storedData['adunit-1'][0].adId).to.be.a('string');
    expect(storedData['adunit-1'][0].adUnitId).to.be.a('string');
    expect(storedData['adunit-1'][0].requestId).to.be.a('string');
    expect(storedData['adunit-1'][0].transactionId).to.be.a('string');
  });

  it('should batch BID_WON events and send after delay with retries', function (done) {
    // First, send AUCTION_END to prepare data
    events.emit(EVENTS.AUCTION_END, { auctionId, bidsReceived });

    // Emit first BID_WON - should send immediately
    events.emit(EVENTS.BID_WON, bidWon1);

    clock.tick(0);
    expect(server.requests.length).to.equal(1);

    // Fail first request, triggers retry after 200ms
    server.requests[0].respond(500, {}, 'Internal Server Error');
    clock.tick(200);

    expect(server.requests.length).to.equal(2);

    // Fail second (retry) request, triggers next retry
    server.requests[1].respond(500, {}, 'Internal Server Error');
    clock.tick(200);

    expect(server.requests.length).to.equal(3);

    // Succeed on third retry
    server.requests[2].respond(200, { 'Content-Type': 'application/json' }, JSON.stringify({ status: 'ok' }));

    // Now emit second BID_WON - queue is empty, should send immediately
    events.emit(EVENTS.BID_WON, bidWon2);

    // Should wait 200ms after emit.
    expect(server.requests.length).to.equal(3);

    // Sends the second BID_WON data after 200ms
    clock.tick(200);
    expect(server.requests.length).to.equal(4);

    // Succeed second BID_WON send
    server.requests[3].respond(200, { 'Content-Type': 'application/json' }, JSON.stringify({ status: 'ok' }));

    // Validate payloads
    const payload1 = JSON.parse(server.requests[0].requestBody);
    const payload2 = JSON.parse(server.requests[3].requestBody);

    expect(payload1).to.include({
      pageUrl: 'https://test-site.com/page.html',
      domain: 'test-site.com',
      referrer: 'https://google.com'
    });

    expect(payload2).to.include({
      pageUrl: 'https://test-site.com/page.html',
      domain: 'test-site.com',
      referrer: 'https://google.com'
    });

    expect(payload1.winningBid).to.include({
      auctionId,
      adUnitCode: 'adunit-1',
      bidder: 'adplus',
      cpm: 5,
      originalCpm: 5.5,
      originalCurrency: 'EUR',
      adId: 'ad-id-1',
      adUnitId: 'ad-unit-id-1',
      requestId: 'request-id-1',
      instl: 0,
      mediaType: 'banner',
      transactionId: 'transaction-id-1'
    });
    expect(payload1.winningBid.adId).to.be.a('string');
    expect(payload1.winningBid.adUnitId).to.be.a('string');
    expect(payload1.winningBid.requestId).to.be.a('string');
    expect(payload1.winningBid.transactionId).to.be.a('string');
    expect(payload1.allBids[0]).to.include({
      adId: 'ad-id-1',
      adUnitId: 'ad-unit-id-1',
      requestId: 'request-id-1',
      originalCpm: 5.5,
      originalCurrency: 'EUR',
      mediaType: 'banner',
      transactionId: 'transaction-id-1'
    });

    expect(payload2.winningBid).to.include({
      auctionId,
      adUnitCode: 'adunit-2',
      bidder: 'adplus',
      cpm: 7,
      originalCpm: 7.5,
      originalCurrency: 'EUR',
      adId: 'ad-id-2',
      adUnitId: 'ad-unit-id-2',
      requestId: 'request-id-2',
      instl: 0,
      mediaType: 'banner',
      transactionId: 'transaction-id-2'
    });
    expect(payload2.allBids[0]).to.include({
      adId: 'ad-id-2',
      adUnitId: 'ad-unit-id-2',
      requestId: 'request-id-2',
      originalCpm: 7.5,
      originalCurrency: 'EUR',
      mediaType: 'banner',
      transactionId: 'transaction-id-2'
    });

    done();
  });

  it('should skip BID_WON if no auction data available', function () {
    // Emit BID_WON without AUCTION_END first
    expect(() => events.emit(EVENTS.BID_WON, bidWon1)).to.not.throw();

    // No ajax call since no auctionData
    expect(server.requests.length).to.equal(0);
  });

  it('should not fall back to the page URL when referrer is unavailable', function () {
    refererDetection.getRefererInfo.restore();
    sandbox.stub(refererDetection, 'getRefererInfo').returns({
      page: 'https://test-site.com/page.html',
      domain: 'test-site.com',
      ref: ''
    });

    events.emit(EVENTS.AUCTION_END, { auctionId, bidsReceived });
    events.emit(EVENTS.BID_WON, bidWon1);

    clock.tick(0);

    const payload = JSON.parse(server.requests[0].requestBody);
    expect(payload.referrer).to.not.equal(payload.pageUrl);
  });
});
