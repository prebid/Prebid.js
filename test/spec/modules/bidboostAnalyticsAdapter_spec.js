import { expect } from 'chai';
import sinon from 'sinon';
import adapterManager from 'src/adapterManager.js';
import { EVENTS } from 'src/constants.js';
import * as events from 'src/events.js';
import { getWindowSelf } from 'src/utils.js';
import * as utils from 'src/utils.js';
import bidboostAnalyticsAdapter from 'modules/bidboostAnalyticsAdapter.js';
import { setPredictorSnapshotForAuction } from 'src/bidboostShared.js';
import { server } from 'test/mocks/xhr.js';

describe('bidboostAnalyticsAdapter', function () {
  let sandbox;
  let clock;
  let beaconPayloads;
  let window;
  let navigator;
  let logErrorStub;

  beforeEach(function () {
    sandbox = sinon.createSandbox();
    window = getWindowSelf();
    navigator = window.navigator;
    clock = sandbox.useFakeTimers();
    beaconPayloads = [];

    sandbox.stub(navigator, 'sendBeacon').callsFake((url, body) => {
      beaconPayloads.push({ url, body });
      return true;
    });
    logErrorStub = sandbox.stub(utils, 'logError');

    server.requests.length = 0;
    server.respondWith('POST', /https:\/\/collect\.bidboost\.net\/auction\?id=.*/, [200, {}, '']);
  });

  afterEach(function () {
    bidboostAnalyticsAdapter.disableAnalytics();
    sandbox.restore();
  });

  it('registers adapter under "bidboost" code', function () {
    expect(adapterManager.analyticsRegistry.bidboost).to.exist;
  });

  it('posts collector payload on auction end using RTD snapshot', function () {
    adapterManager.enableAnalytics({
      provider: 'bidboost',
      options: {
        client: 'client-code',
        site: 'site-code',
        collectorUrl: 'https://collect.bidboost.net',
        analyticsBatchWindowMs: 10
      },
      includeEvents: [EVENTS.BID_REQUESTED, EVENTS.AUCTION_END]
    });

    setPredictorSnapshotForAuction('auc-1', {
      v: 1,
      g: 4,
      b: 1400,
      t: 1,
      fa: 1,
      m: { ad_1: 'top_slot' }
    });

    events.emit(EVENTS.BID_REQUESTED, {
      auctionId: 'auc-1',
      bidderCode: 'appnexus',
      src: 'client',
      bids: [{
        adUnitCode: 'ad_1',
        bidder: 'appnexus',
        userId: { uid2: 'id' }
      }]
    });

    events.emit(EVENTS.AUCTION_END, {
      auctionId: 'auc-1',
      timestamp: 1000,
      auctionEnd: 1600,
      bidsRejected: [],
      noBids: [{
        adUnitCode: 'ad_1',
        bidder: 'rubicon'
      }],
      bidsReceived: [{
        adUnitCode: 'ad_1',
        bidderCode: 'appnexus',
        bidder: 'appnexus',
        mediaType: 'banner',
        responseTimestamp: 1300,
        requestTimestamp: 1000,
        cpm: 1.2,
        currency: 'USD'
      }],
      bidderRequests: [{
        bidderCode: 'appnexus',
        bids: [{ adUnitCode: 'ad_1' }]
      }, {
        bidderCode: 'rubicon',
        bids: [{ adUnitCode: 'ad_1' }]
      }]
    });

    clock.tick(20);

    const payload = beaconPayloads[0]?.body;
    expect(payload).to.exist;

    const request = JSON.parse(payload);
    expect(request.c).to.equal('client-code');
    expect(request.s).to.equal('site-code');
    expect(request.g).to.equal(4);
    expect(request.bt).to.equal(1400);
    expect(request.fa).to.equal(1);
    expect(request.na).to.equal(1);
    expect(request.pl[0].c).to.equal('top_slot');
    expect(request.pl[0].b.length).to.equal(2);
  });

  it('drops events when required analytics options are missing', function () {
    adapterManager.enableAnalytics({
      provider: 'bidboost',
      options: {},
      includeEvents: [EVENTS.BID_REQUESTED, EVENTS.AUCTION_END]
    });

    events.emit(EVENTS.BID_REQUESTED, {
      auctionId: 'auc-missing',
      bidderCode: 'appnexus',
      src: 'client',
      bids: [{ adUnitCode: 'ad_1', bidder: 'appnexus' }]
    });

    events.emit(EVENTS.AUCTION_END, {
      auctionId: 'auc-missing',
      timestamp: 1,
      auctionEnd: 2,
      bidsRejected: [],
      noBids: [],
      bidsReceived: [],
      bidderRequests: []
    });

    clock.tick(20);
    expect(beaconPayloads).to.have.length(0);
    expect(server.requests).to.have.length(0);
  });

  it('posts a filled impression payload when ad renders', function () {
    adapterManager.enableAnalytics({
      provider: 'bidboost',
      options: {
        client: 'client-code',
        site: 'site-code',
        collectorUrl: 'https://collect.bidboost.net',
        analyticsBatchWindowMs: 50
      },
      includeEvents: [EVENTS.BID_REQUESTED, EVENTS.AD_RENDER_SUCCEEDED]
    });

    events.emit(EVENTS.AD_RENDER_SUCCEEDED, {
      bid: {
        auctionId: 'auc-render',
        adUnitCode: 'ad_1',
        bidderCode: 'appnexus',
        mediaType: 'banner',
        responseTimestamp: 1300,
        requestTimestamp: 1000,
        cpm: 1.3,
        currency: 'USD'
      }
    });

    const request = JSON.parse(beaconPayloads[0].body);
    expect(request.na).to.equal(0);
    expect(request.pl[0].b[0].s).to.equal(4);
  });

  it('flushes pending collector payload on visibilitychange with ajax fallback', function () {
    navigator.sendBeacon.returns(false);

    adapterManager.enableAnalytics({
      provider: 'bidboost',
      options: {
        client: 'client-code',
        site: 'site-code',
        collectorUrl: 'https://collect.bidboost.net',
        analyticsBatchWindowMs: 1000
      },
      includeEvents: [EVENTS.BID_REQUESTED, EVENTS.AUCTION_END]
    });

    events.emit(EVENTS.BID_REQUESTED, {
      auctionId: 'auc-visibility',
      bidderCode: 'appnexus',
      src: 'client',
      bids: [{ adUnitCode: 'ad_1', bidder: 'appnexus' }]
    });

    events.emit(EVENTS.AUCTION_END, {
      auctionId: 'auc-visibility',
      timestamp: 100,
      auctionEnd: 300,
      bidsRejected: [],
      noBids: [],
      bidsReceived: [{
        adUnitCode: 'ad_1',
        bidderCode: 'appnexus',
        bidder: 'appnexus',
        mediaType: 'banner',
        responseTimestamp: 180,
        requestTimestamp: 100,
        cpm: 1,
        currency: 'USD'
      }],
      bidderRequests: [{ bidderCode: 'appnexus', bids: [{ adUnitCode: 'ad_1' }] }]
    });

    Object.defineProperty(window.document, 'visibilityState', { value: 'hidden', configurable: true });
    window.dispatchEvent(new window.Event('visibilitychange'));
    server.respond();

    expect(server.requests.length).to.be.greaterThan(0);
    expect(server.requests[server.requests.length - 1].url).to.match(/collect\.bidboost\.net\/auction\?id=/);
    expect(beaconPayloads).to.have.length(0);
  });

  it('posts a heartbeat payload on pagehide while auction is running', function () {
    adapterManager.enableAnalytics({
      provider: 'bidboost',
      options: {
        client: 'client-code',
        site: 'site-code',
        collectorUrl: 'https://collect.bidboost.net'
      },
      includeEvents: [EVENTS.BID_REQUESTED]
    });

    events.emit(EVENTS.BID_REQUESTED, {
      auctionId: 'auc-pagehide',
      bidderCode: 'appnexus',
      src: 'client',
      bids: [{ adUnitCode: 'ad_1', bidder: 'appnexus' }]
    });

    window.dispatchEvent(new window.Event('pagehide'));

    const request = JSON.parse(beaconPayloads[0].body);
    expect(request.c).to.equal('client-code');
    expect(request.na).to.equal(1);
    expect(request.pl).to.have.length(0);
  });

  it('drops whole auction analytics payload when bid currency is unsupported', function () {
    adapterManager.enableAnalytics({
      provider: 'bidboost',
      options: {
        client: 'client-code',
        site: 'site-code',
        collectorUrl: 'https://collect.bidboost.net',
        analyticsBatchWindowMs: 10
      },
      includeEvents: [EVENTS.BID_REQUESTED, EVENTS.AUCTION_END, EVENTS.AD_RENDER_SUCCEEDED]
    });
    const initialRequestCount = server.requests.length;

    events.emit(EVENTS.BID_REQUESTED, {
      auctionId: 'auc-unsupported-currency',
      bidderCode: 'appnexus',
      src: 'client',
      bids: [{ adUnitCode: 'ad_1', bidder: 'appnexus' }]
    });

    events.emit(EVENTS.AUCTION_END, {
      auctionId: 'auc-unsupported-currency',
      timestamp: 1000,
      auctionEnd: 1400,
      bidsRejected: [],
      noBids: [],
      bidsReceived: [{
        adUnitCode: 'ad_1',
        bidderCode: 'appnexus',
        bidder: 'appnexus',
        mediaType: 'banner',
        responseTimestamp: 1200,
        requestTimestamp: 1000,
        cpm: 1.1,
        currency: 'CAD'
      }],
      bidderRequests: [{ bidderCode: 'appnexus', bids: [{ adUnitCode: 'ad_1' }] }]
    });

    events.emit(EVENTS.AD_RENDER_SUCCEEDED, {
      bid: {
        auctionId: 'auc-unsupported-currency',
        adUnitCode: 'ad_1',
        bidderCode: 'appnexus',
        mediaType: 'banner',
        responseTimestamp: 1300,
        requestTimestamp: 1000,
        cpm: 1.3,
        currency: 'CAD'
      }
    });

    clock.tick(20);

    expect(logErrorStub.called).to.equal(true);
    expect(server.requests.length).to.equal(initialRequestCount);
  });
});
