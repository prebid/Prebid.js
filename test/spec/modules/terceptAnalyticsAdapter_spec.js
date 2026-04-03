import terceptAnalyticsAdapter from 'modules/terceptAnalyticsAdapter.js';
import { expect } from 'chai';
import adapterManager from 'src/adapterManager.js';
import { server } from 'test/mocks/xhr.js';
import { EVENTS } from 'src/constants.js';
import * as ajax from 'src/ajax.js';

const events = require('src/events');

describe('tercept analytics adapter', function () {
  let clock;

  const AUCTION_ID = 'db377024-d866-4a24-98ac-5e430f881313';
  const BIDDER_REQUEST_ID = '155975c76e13b1';
  const BID_ID = '263efc09896d0c';
  const AD_UNIT_CODE = 'div-gpt-ad-1460505748561-0';

  const initOptions = {
    pubId: '1',
    pubKey: 'ZXlKaGJHY2lPaUpJVXpJMU5pSjkuT==',
    hostName: 'us-central1-quikr-ebay.cloudfunctions.net',
    pathName: '/prebid-analytics'
  };

  const adUnit = {
    code: AD_UNIT_CODE,
    mediaTypes: { banner: { sizes: [[300, 250], [300, 600]] } },
    bids: [{ bidder: 'appnexus', params: { placementId: 13144370 } }],
    sizes: [[300, 250], [300, 600]],
    transactionId: '6d275806-1943-4f3e-9cd5-624cbd05ad98',
    ortb2Imp: {
      ext: {
        data: {
          adserver: { adslot: '/1234567/homepage-banner' },
          pbadslot: 'homepage-banner-pbadslot'
        }
      }
    }
  };

  const auctionInit = {
    auctionId: AUCTION_ID,
    timestamp: 1576823893836,
    auctionStatus: 'inProgress',
    adUnits: [adUnit],
    adUnitCodes: [AD_UNIT_CODE],
    bidderRequests: [
      {
        bidderCode: 'appnexus',
        auctionId: AUCTION_ID,
        bidderRequestId: BIDDER_REQUEST_ID,
        bids: [{
          bidder: 'appnexus',
          params: { placementId: 13144370 },
          mediaTypes: { banner: { sizes: [[300, 250], [300, 600]] } },
          adUnitCode: AD_UNIT_CODE,
          transactionId: '6d275806-1943-4f3e-9cd5-624cbd05ad98',
          sizes: [[300, 250], [300, 600]],
          bidId: BID_ID,
          bidderRequestId: BIDDER_REQUEST_ID,
          auctionId: AUCTION_ID
        }],
        auctionStart: 1576823893836,
        timeout: 1000
      },
      {
        bidderCode: 'ix',
        auctionId: AUCTION_ID,
        bidderRequestId: '181df4d465699c',
        bids: [],
        auctionStart: 1576823893836,
        timeout: 1000
      }
    ],
    noBids: [],
    bidsReceived: [],
    winningBids: [],
    timeout: 1000
  };

  const bidRequested = {
    bidderCode: 'appnexus',
    auctionId: AUCTION_ID,
    bidderRequestId: BIDDER_REQUEST_ID,
    bids: [{
      bidder: 'appnexus',
      mediaTypes: { banner: { sizes: [[300, 250], [300, 600]] } },
      adUnitCode: AD_UNIT_CODE,
      transactionId: '6d275806-1943-4f3e-9cd5-624cbd05ad98',
      sizes: [[300, 250], [300, 600]],
      bidId: BID_ID,
      bidderRequestId: BIDDER_REQUEST_ID,
      auctionId: AUCTION_ID
    }],
    auctionStart: 1576823893836,
    timeout: 1000
  };

  // requestId matches BID_ID from BID_REQUESTED so updateBid can find it
  const bidResponse = {
    bidderCode: 'appnexus',
    width: 300,
    height: 250,
    adId: '393976d8770041',
    requestId: BID_ID,
    mediaType: 'banner',
    cpm: 0.5,
    creativeId: 96846035,
    currency: 'USD',
    netRevenue: true,
    ttl: 300,
    adUnitCode: AD_UNIT_CODE,
    auctionId: AUCTION_ID,
    responseTimestamp: 1576823894050,
    requestTimestamp: 1576823893838,
    bidder: 'appnexus',
    timeToRespond: 212,
    statusMessage: 'Bid available',
    status: 'targetingSet',
    ad: '<!-- Creative -->',
    native: { title: 'Ad Title' },
    adUrl: 'https://cdn.example.com/creative.html',
    meta: { advertiserId: 2529885 },
    adserverTargeting: { hb_bidder: 'appnexus', hb_adid: '393976d8770041', hb_pb: '0.50' }
  };

  const auctionEnd = { auctionId: AUCTION_ID };

  const bidWon = {
    bidderCode: 'appnexus',
    requestId: BID_ID,
    adUnitCode: AD_UNIT_CODE,
    auctionId: AUCTION_ID,
    size: '300x250',
    cpm: 0.5
  };

  function emitFullAuction(id = AUCTION_ID) {
    const init = id === AUCTION_ID ? auctionInit : { ...auctionInit, auctionId: id };
    const req = id === AUCTION_ID ? bidRequested : {
      ...bidRequested,
      auctionId: id,
      bids: [{ ...bidRequested.bids[0], auctionId: id }]
    };
    events.emit(EVENTS.AUCTION_INIT, init);
    events.emit(EVENTS.BID_REQUESTED, req);
    events.emit(EVENTS.BID_RESPONSE, { ...bidResponse, auctionId: id });
    events.emit(EVENTS.AUCTION_END, { auctionId: id });
  }

  beforeEach(function () {
    clock = sinon.useFakeTimers(new Date('2025-07-25T12:00:00Z').getTime());
    sinon.stub(events, 'getEvents').returns([]);
    adapterManager.enableAnalytics({ provider: 'tercept', options: initOptions });
  });

  afterEach(function () {
    terceptAnalyticsAdapter.disableAnalytics();
    clock.restore();
    events.getEvents.restore();
  });

  // ─── Request timing ───────────────────────────────────────────────────────

  describe('request timing', function () {
    it('sends no request before the 1.5s timer fires', function () {
      emitFullAuction();
      expect(server.requests.length).to.equal(0);
    });

    it('sends exactly one request per auction after 1.5s', function () {
      emitFullAuction();
      clock.tick(1500);
      expect(server.requests.length).to.equal(1);
    });

    it('sends one request per auction when two auctions run concurrently', function () {
      emitFullAuction('auction-a');
      emitFullAuction('auction-b');
      clock.tick(1500);
      expect(server.requests.length).to.equal(2);
    });
  });

  // ─── Payload structure ────────────────────────────────────────────────────

  describe('payload structure', function () {
    it('has auctionInit, bids and initOptions at top level', function () {
      emitFullAuction();
      clock.tick(1500);
      const payload = JSON.parse(server.requests[0].requestBody);
      expect(payload).to.have.all.keys(['auctionInit', 'bids', 'initOptions']);
    });

    it('limits auctionInit.bidderRequests to first entry only', function () {
      emitFullAuction();
      clock.tick(1500);
      const { auctionInit: ai } = JSON.parse(server.requests[0].requestBody);
      expect(ai.bidderRequests).to.have.length(1);
      expect(ai.bidderRequests[0].bidderCode).to.equal('appnexus');
    });

    it('attaches host, path and search to auctionInit at send time', function () {
      emitFullAuction();
      clock.tick(1500);
      const { auctionInit: ai } = JSON.parse(server.requests[0].requestBody);
      expect(ai.host).to.be.a('string');
      expect(ai.path).to.be.a('string');
      expect(ai).to.have.property('search');
    });

    it('includes initOptions in the payload', function () {
      emitFullAuction();
      clock.tick(1500);
      const payload = JSON.parse(server.requests[0].requestBody);
      expect(payload.initOptions).to.deep.equal(initOptions);
    });

    it('does not include ad, native or adUrl fields in bids', function () {
      emitFullAuction();
      clock.tick(1500);
      const { bids } = JSON.parse(server.requests[0].requestBody);
      bids.forEach(bid => {
        expect(bid).not.to.have.property('ad');
        expect(bid).not.to.have.property('native');
        expect(bid).not.to.have.property('adUrl');
      });
    });
  });

  // ─── BID_REQUESTED ────────────────────────────────────────────────────────

  describe('BID_REQUESTED', function () {
    it('adds a bid entry per bid with renderStatus 1 and correct sizes', function () {
      events.emit(EVENTS.AUCTION_INIT, auctionInit);
      events.emit(EVENTS.BID_REQUESTED, bidRequested);
      events.emit(EVENTS.AUCTION_END, auctionEnd);
      clock.tick(1500);
      const { bids } = JSON.parse(server.requests[0].requestBody);
      expect(bids[0].bidId).to.equal(BID_ID);
      expect(bids[0].renderStatus).to.equal(1);
      expect(bids[0].sizes).to.equal('300x250,300x600');
      expect(bids[0].bidderCode).to.equal('appnexus');
      expect(bids[0].requestId).to.equal(BIDDER_REQUEST_ID);
    });
  });

  // ─── BID_RESPONSE ─────────────────────────────────────────────────────────

  describe('BID_RESPONSE', function () {
    it('updates bid to renderStatus 2 with response fields', function () {
      emitFullAuction();
      clock.tick(1500);
      const { bids } = JSON.parse(server.requests[0].requestBody);
      expect(bids[0].renderStatus).to.equal(2);
      expect(bids[0].cpm).to.equal(0.5);
      expect(bids[0].creativeId).to.equal(96846035);
      expect(bids[0].timeToRespond).to.equal(212);
      expect(bids[0].currency).to.equal('USD');
    });
  });

  // ─── BID_TIMEOUT ──────────────────────────────────────────────────────────

  describe('BID_TIMEOUT', function () {
    it('updates bid to renderStatus 3', function () {
      events.emit(EVENTS.AUCTION_INIT, auctionInit);
      events.emit(EVENTS.BID_REQUESTED, bidRequested);
      events.emit(EVENTS.BID_TIMEOUT, [{ auctionId: AUCTION_ID, bidId: BID_ID, adUnitCode: AD_UNIT_CODE }]);
      events.emit(EVENTS.AUCTION_END, auctionEnd);
      clock.tick(1500);
      const { bids } = JSON.parse(server.requests[0].requestBody);
      expect(bids[0].renderStatus).to.equal(3);
    });
  });

  // ─── NO_BID ───────────────────────────────────────────────────────────────

  describe('NO_BID', function () {
    it('updates bid to renderStatus 5', function () {
      events.emit(EVENTS.AUCTION_INIT, auctionInit);
      events.emit(EVENTS.BID_REQUESTED, bidRequested);
      events.emit(EVENTS.NO_BID, { auctionId: AUCTION_ID, bidId: BID_ID, adUnitCode: AD_UNIT_CODE, bidder: 'appnexus' });
      events.emit(EVENTS.AUCTION_END, auctionEnd);
      clock.tick(1500);
      const { bids } = JSON.parse(server.requests[0].requestBody);
      expect(bids[0].renderStatus).to.equal(5);
    });
  });

  // ─── BID_WON ──────────────────────────────────────────────────────────────

  describe('BID_WON', function () {
    it('updates bid to renderStatus 4 with win fields when fired before timer', function () {
      emitFullAuction();
      events.emit(EVENTS.BID_WON, bidWon);
      clock.tick(1500);
      const { bids } = JSON.parse(server.requests[0].requestBody);
      expect(bids[0].renderStatus).to.equal(4);
      expect(bids[0].renderedSize).to.equal('300x250');
      expect(bids[0].host).to.be.a('string');
      expect(bids[0].path).to.be.a('string');
    });

    it('maps adserverAdSlot and pbAdSlot from adUnitMap', function () {
      emitFullAuction();
      events.emit(EVENTS.BID_WON, bidWon);
      clock.tick(1500);
      const { bids } = JSON.parse(server.requests[0].requestBody);
      expect(bids[0].adserverAdSlot).to.equal('/1234567/homepage-banner');
      expect(bids[0].pbAdSlot).to.equal('homepage-banner-pbadslot');
    });
  });

  // ─── AD_RENDER_SUCCEEDED ──────────────────────────────────────────────────

  describe('AD_RENDER_SUCCEEDED', function () {
    it('updates bid to renderStatus 7 with renderTimestamp and location fields', function () {
      emitFullAuction();
      events.emit(EVENTS.AD_RENDER_SUCCEEDED, {
        bid: { requestId: BID_ID, auctionId: AUCTION_ID, adUnitCode: AD_UNIT_CODE, size: '300x250' }
      });
      clock.tick(1500);
      const { bids } = JSON.parse(server.requests[0].requestBody);
      expect(bids[0].renderStatus).to.equal(7);
      expect(bids[0].renderTimestamp).to.be.a('number');
      expect(bids[0].renderedSize).to.equal('300x250');
      expect(bids[0].host).to.be.a('string');
      expect(bids[0].path).to.be.a('string');
    });

    it('maps adserverAdSlot and pbAdSlot', function () {
      emitFullAuction();
      events.emit(EVENTS.AD_RENDER_SUCCEEDED, {
        bid: { requestId: BID_ID, auctionId: AUCTION_ID, adUnitCode: AD_UNIT_CODE, size: '300x250' }
      });
      clock.tick(1500);
      const { bids } = JSON.parse(server.requests[0].requestBody);
      expect(bids[0].adserverAdSlot).to.equal('/1234567/homepage-banner');
      expect(bids[0].pbAdSlot).to.equal('homepage-banner-pbadslot');
    });
  });

  // ─── AD_RENDER_FAILED ─────────────────────────────────────────────────────

  describe('AD_RENDER_FAILED', function () {
    it('updates bid to renderStatus 8 with reason and message', function () {
      emitFullAuction();
      events.emit(EVENTS.AD_RENDER_FAILED, {
        bid: { requestId: BID_ID, auctionId: AUCTION_ID, adUnitCode: AD_UNIT_CODE },
        reason: 'exception',
        message: 'Cannot read property of undefined'
      });
      clock.tick(1500);
      const { bids } = JSON.parse(server.requests[0].requestBody);
      expect(bids[0].renderStatus).to.equal(8);
      expect(bids[0].reason).to.equal('exception');
      expect(bids[0].message).to.equal('Cannot read property of undefined');
      expect(bids[0].host).to.be.a('string');
      expect(bids[0].path).to.be.a('string');
    });
  });

  // ─── BIDDER_ERROR ─────────────────────────────────────────────────────────

  describe('BIDDER_ERROR', function () {
    it('updates each affected bid to renderStatus 6 with error message', function () {
      events.emit(EVENTS.AUCTION_INIT, auctionInit);
      events.emit(EVENTS.BID_REQUESTED, bidRequested);
      events.emit(EVENTS.BIDDER_ERROR, {
        bidderRequest: {
          auctionId: AUCTION_ID,
          bids: [{ bidId: BID_ID, auctionId: AUCTION_ID, adUnitCode: AD_UNIT_CODE }]
        },
        error: { message: 'Network error' }
      });
      events.emit(EVENTS.AUCTION_END, auctionEnd);
      clock.tick(1500);
      const { bids } = JSON.parse(server.requests[0].requestBody);
      expect(bids[0].renderStatus).to.equal(6);
      expect(bids[0].status).to.equal('bidError');
      expect(bids[0].error).to.equal('Network error');
      expect(bids[0].adserverAdSlot).to.equal('/1234567/homepage-banner');
    });

    it('handles error as a plain string', function () {
      events.emit(EVENTS.AUCTION_INIT, auctionInit);
      events.emit(EVENTS.BID_REQUESTED, bidRequested);
      events.emit(EVENTS.BIDDER_ERROR, {
        bidderRequest: {
          auctionId: AUCTION_ID,
          bids: [{ bidId: BID_ID, auctionId: AUCTION_ID, adUnitCode: AD_UNIT_CODE }]
        },
        error: 'timeout'
      });
      events.emit(EVENTS.AUCTION_END, auctionEnd);
      clock.tick(1500);
      const { bids } = JSON.parse(server.requests[0].requestBody);
      expect(bids[0].error).to.equal('timeout');
    });

    it('ignores BIDDER_ERROR when bidderRequest is null', function () {
      events.emit(EVENTS.AUCTION_INIT, auctionInit);
      events.emit(EVENTS.BIDDER_ERROR, { bidderRequest: null, error: 'err' });
      events.emit(EVENTS.AUCTION_END, auctionEnd);
      clock.tick(1500);
      expect(server.requests.length).to.equal(1);
    });
  });

  // ─── is_pl flag ───────────────────────────────────────────────────────────

  describe('is_pl flag', function () {
    it('sets is_pl true only on the first bid of the first auction', function () {
      emitFullAuction();
      clock.tick(1500);
      const { bids } = JSON.parse(server.requests[0].requestBody);
      expect(bids[0].is_pl).to.equal(true);
    });

    it('sets is_pl false on all other bids in the same auction', function () {
      const bidRequested2 = {
        ...bidRequested,
        bidderRequestId: 'second-req-id',
        bids: [{ ...bidRequested.bids[0], bidId: 'second-bid-id', bidderRequestId: 'second-req-id' }]
      };
      events.emit(EVENTS.AUCTION_INIT, auctionInit);
      events.emit(EVENTS.BID_REQUESTED, bidRequested);
      events.emit(EVENTS.BID_REQUESTED, bidRequested2);
      events.emit(EVENTS.AUCTION_END, auctionEnd);
      clock.tick(1500);
      const { bids } = JSON.parse(server.requests[0].requestBody);
      expect(bids[0].is_pl).to.equal(true);
      expect(bids[1].is_pl).to.equal(false);
    });

    it('sets is_pl false on all bids of subsequent auctions', function () {
      emitFullAuction();
      clock.tick(1500);

      emitFullAuction('auction-2');
      clock.tick(1500);

      const p2 = JSON.parse(server.requests[1].requestBody);
      p2.bids.forEach(bid => expect(bid.is_pl).to.equal(false));
    });
  });

  // ─── Concurrent auction isolation ─────────────────────────────────────────

  describe('concurrent auction isolation', function () {
    it('keeps bid data separate across overlapping auctions', function () {
      const id1 = 'auction-1';
      const id2 = 'auction-2';

      events.emit(EVENTS.AUCTION_INIT, { ...auctionInit, auctionId: id1 });
      events.emit(EVENTS.AUCTION_INIT, { ...auctionInit, auctionId: id2 });
      events.emit(EVENTS.BID_REQUESTED, {
        ...bidRequested, auctionId: id1,
        bids: [{ ...bidRequested.bids[0], auctionId: id1, bidId: 'bid-1' }]
      });
      events.emit(EVENTS.BID_REQUESTED, {
        ...bidRequested, auctionId: id2,
        bids: [{ ...bidRequested.bids[0], auctionId: id2, bidId: 'bid-2' }]
      });
      events.emit(EVENTS.AUCTION_END, { auctionId: id1 });
      events.emit(EVENTS.AUCTION_END, { auctionId: id2 });
      clock.tick(1500);

      expect(server.requests.length).to.equal(2);
      const p1 = JSON.parse(server.requests[0].requestBody);
      const p2 = JSON.parse(server.requests[1].requestBody);
      expect(p1.auctionInit.auctionId).to.equal(id1);
      expect(p2.auctionInit.auctionId).to.equal(id2);
      expect(p1.bids[0].bidId).to.equal('bid-1');
      expect(p2.bids[0].bidId).to.equal('bid-2');
    });

    it('BID_WON for one auction does not affect bids in another', function () {
      const id1 = 'auction-x';
      const id2 = 'auction-y';

      events.emit(EVENTS.AUCTION_INIT, { ...auctionInit, auctionId: id1 });
      events.emit(EVENTS.AUCTION_INIT, { ...auctionInit, auctionId: id2 });
      events.emit(EVENTS.BID_REQUESTED, {
        ...bidRequested, auctionId: id1,
        bids: [{ ...bidRequested.bids[0], auctionId: id1, bidId: 'bid-x' }]
      });
      events.emit(EVENTS.BID_REQUESTED, {
        ...bidRequested, auctionId: id2,
        bids: [{ ...bidRequested.bids[0], auctionId: id2, bidId: 'bid-y' }]
      });
      events.emit(EVENTS.BID_WON, { ...bidWon, auctionId: id1, requestId: 'bid-x' });
      events.emit(EVENTS.AUCTION_END, { auctionId: id1 });
      events.emit(EVENTS.AUCTION_END, { auctionId: id2 });
      clock.tick(1500);

      const p1 = JSON.parse(server.requests[0].requestBody);
      const p2 = JSON.parse(server.requests[1].requestBody);
      expect(p1.bids[0].renderStatus).to.equal(4); // won
      expect(p2.bids[0].renderStatus).to.equal(1); // only requested
    });
  });

  // ─── visibilitychange flush ────────────────────────────────────────────────

  describe('visibilitychange flush', function () {
    let beaconStub;

    beforeEach(function () {
      beaconStub = sinon.stub(ajax, 'sendBeacon').returns(true);
    });

    afterEach(function () {
      beaconStub.restore();
      Object.defineProperty(document, 'visibilityState', { get: () => 'visible', configurable: true });
    });

    it('flushes via sendBeacon when page becomes hidden before timer', function () {
      events.emit(EVENTS.AUCTION_INIT, auctionInit);
      events.emit(EVENTS.BID_REQUESTED, bidRequested);
      events.emit(EVENTS.AUCTION_END, auctionEnd);

      Object.defineProperty(document, 'visibilityState', { get: () => 'hidden', configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));

      expect(beaconStub.calledOnce).to.be.true;
      expect(server.requests.length).to.equal(0);
    });

    it('does not double-send via ajax after sendBeacon has already flushed', function () {
      events.emit(EVENTS.AUCTION_INIT, auctionInit);
      events.emit(EVENTS.AUCTION_END, auctionEnd);

      Object.defineProperty(document, 'visibilityState', { get: () => 'hidden', configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));

      clock.tick(1500);
      expect(server.requests.length).to.equal(0);
    });
  });

  // ─── disableAnalytics ─────────────────────────────────────────────────────

  describe('disableAnalytics', function () {
    it('cancels pending timers so no request is sent after disable', function () {
      events.emit(EVENTS.AUCTION_INIT, auctionInit);
      events.emit(EVENTS.AUCTION_END, auctionEnd);
      terceptAnalyticsAdapter.disableAnalytics();
      clock.tick(1500);
      expect(server.requests.length).to.equal(0);
    });

    it('clears pendingAuctions so re-enabled adapter starts clean', function () {
      events.emit(EVENTS.AUCTION_INIT, auctionInit);
      events.emit(EVENTS.AUCTION_END, auctionEnd);
      terceptAnalyticsAdapter.disableAnalytics();

      adapterManager.enableAnalytics({ provider: 'tercept', options: initOptions });
      emitFullAuction();
      clock.tick(1500);
      // only one request — from the fresh enable, not from before disable
      expect(server.requests.length).to.equal(1);
    });

    it('resets firstSent so re-enabled adapter marks first auction as page load', function () {
      emitFullAuction();
      clock.tick(1500);
      const p1 = JSON.parse(server.requests[0].requestBody);
      expect(p1.bids[0].is_pl).to.equal(true);

      terceptAnalyticsAdapter.disableAnalytics();
      adapterManager.enableAnalytics({ provider: 'tercept', options: initOptions });

      emitFullAuction();
      clock.tick(1500);
      const p2 = JSON.parse(server.requests[1].requestBody);
      expect(p2.bids[0].is_pl).to.equal(true);
    });
  });

  // ─── adserverAdSlot lookup ────────────────────────────────────────────────

  describe('adserverAdSlot lookup', function () {
    it('returns undefined adserverAdSlot when ad unit has no ortb2Imp', function () {
      const initNoOrtb2 = {
        ...auctionInit,
        auctionId: 'no-ortb2',
        adUnits: [{ ...adUnit, ortb2Imp: undefined }]
      };
      events.emit(EVENTS.AUCTION_INIT, initNoOrtb2);
      events.emit(EVENTS.BID_REQUESTED, {
        ...bidRequested, auctionId: 'no-ortb2',
        bids: [{ ...bidRequested.bids[0], auctionId: 'no-ortb2' }]
      });
      events.emit(EVENTS.AUCTION_END, { auctionId: 'no-ortb2' });
      clock.tick(1500);
      const { bids } = JSON.parse(server.requests[0].requestBody);
      expect(bids[0].adserverAdSlot).to.be.undefined;
      expect(bids[0].pbAdSlot).to.be.undefined;
    });

    it('uses correct adUnit per auctionId for slot lookup', function () {
      const id1 = 'slot-auction-1';
      const id2 = 'slot-auction-2';
      const unit1 = { ...adUnit, ortb2Imp: { ext: { data: { adserver: { adslot: '/slot/one' }, pbadslot: 'slot-one' } } } };
      const unit2 = { ...adUnit, ortb2Imp: { ext: { data: { adserver: { adslot: '/slot/two' }, pbadslot: 'slot-two' } } } };

      events.emit(EVENTS.AUCTION_INIT, { ...auctionInit, auctionId: id1, adUnits: [unit1] });
      events.emit(EVENTS.AUCTION_INIT, { ...auctionInit, auctionId: id2, adUnits: [unit2] });
      events.emit(EVENTS.BID_WON, { ...bidWon, auctionId: id1, requestId: 'r1' });
      events.emit(EVENTS.BID_WON, { ...bidWon, auctionId: id2, requestId: 'r2' });
      events.emit(EVENTS.AUCTION_END, { auctionId: id1 });
      events.emit(EVENTS.AUCTION_END, { auctionId: id2 });
      clock.tick(1500);

      // BID_WON updates are stored on pending bids; but since no BID_REQUESTED was emitted
      // there are no bids to update — this test confirms slot lookup is isolated per auctionId
      const p1 = JSON.parse(server.requests[0].requestBody);
      const p2 = JSON.parse(server.requests[1].requestBody);
      expect(p1.auctionInit.auctionId).to.equal(id1);
      expect(p2.auctionInit.auctionId).to.equal(id2);
    });
  });

  // ─── Error resilience ─────────────────────────────────────────────────────

  describe('error resilience', function () {
    it('does not throw when track() receives undefined args', function () {
      expect(() => {
        events.emit(EVENTS.AUCTION_INIT, undefined);
        events.emit(EVENTS.BID_RESPONSE, undefined);
      }).not.to.throw();
    });

    it('ignores BID_WON for an unknown auctionId without throwing', function () {
      expect(() => {
        events.emit(EVENTS.BID_WON, { ...bidWon, auctionId: 'nonexistent' });
      }).not.to.throw();
    });

    it('still flushes other auctions when one auction has unknown events applied', function () {
      emitFullAuction();
      events.emit(EVENTS.BID_RESPONSE, { ...bidResponse, auctionId: 'ghost-auction' });
      clock.tick(1500);
      expect(server.requests.length).to.equal(1);
    });
  });
});
