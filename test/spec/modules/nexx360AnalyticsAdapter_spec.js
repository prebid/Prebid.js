import nexx360AnalyticsAdapter from 'modules/nexx360AnalyticsAdapter.js';
import { expect } from 'chai';
import { server } from 'test/mocks/xhr.js';
import { EVENTS } from 'src/constants.js';
import sinon from 'sinon';
import adapterManager from 'src/adapterManager.js';
import 'modules/nexx360BidAdapter.js';

const events = require('src/events');

const ENDPOINT = 'http://localhost:8052';
const PUBLISHER_ID = 'pub-1';

// The adapter POSTs a raw JSON array to `${endpoint}/events`. (Before the sampling
// refactor it also fires a GET `${endpoint}/config`.) Select only the /events POSTs
// so these assertions hold both before and after the refactor.
function eventPosts() {
  return server.requests
    .filter((r) => /\/events$/.test(r.url))
    .map((r) => JSON.parse(r.requestBody));
}

// The adapter flushes an auction one tick after AUCTION_END (see flushAuctionEvents), so tests
// end an auction and then advance the fake clock.
let clock;
function endAuction(auctionId) {
  events.emit(EVENTS.AUCTION_END, { auctionId });
  clock.tick(0);
}

const SERVER_AUCTION = {
  auctionId: 'srv-1',
  timestamp: 1700000000000,
  totalImpressions: 1,
  totalSspsCalled: 2,
  totalBidsReceived: 1,
  totalTimeouts: 0,
  totalErrors: 0,
  auctionTimeMs: 80,
  impressions: [{
    impId: 'imp-1',
    adUnitCode: 'div-1',
    totalSsps: 2,
    bidsReceived: 1,
    timeouts: 0,
    errors: 0,
    auctionTimeMs: 80,
    winner: { ssp: 'appnexus', cpm: 1.5, currency: 'USD' },
    bids: [
      { ssp: 'appnexus', status: 'bid', cpm: 1.5, currency: 'USD', size: '300x250' },
      { ssp: 'rubicon', status: 'noBid' },
    ],
  }],
};

function enable(options = {}) {
  nexx360AnalyticsAdapter.enableAnalytics({
    provider: 'nexx360',
    options: { publisherId: PUBLISHER_ID, endpoint: ENDPOINT, ...options },
  });
}

describe('Nexx360 Analytics Adapter', function () {
  beforeEach(function () {
    sinon.stub(events, 'getEvents').returns([]);
    clock = sinon.useFakeTimers();
  });

  afterEach(function () {
    nexx360AnalyticsAdapter.disableAnalytics();
    events.getEvents.restore();
    clock.restore();
  });

  it('buffers auction-scoped events and flushes them once on AUCTION_END', function () {
    enable();
    const auctionId = 'auction-batch';

    events.emit(EVENTS.AUCTION_INIT, {
      auctionId,
      timeout: 1000,
      adUnits: [{ code: 'div-1', bids: [{ bidder: 'appnexus' }, { bidder: 'rubicon' }] }],
    });
    events.emit(EVENTS.BID_REQUESTED, {
      auctionId,
      bidderCode: 'appnexus',
      bids: [{ bidder: 'appnexus', adUnitCode: 'div-1', bidId: 'b1', sizes: [[300, 250]] }],
    });
    events.emit(EVENTS.BID_RESPONSE, {
      auctionId,
      bidderCode: 'appnexus',
      adUnitCode: 'div-1',
      cpm: 1.23,
      currency: 'USD',
      width: 300,
      height: 250,
      timeToRespond: 140,
      requestId: 'req-1',
      statusMessage: 'Bid available',
    });

    // Nothing is sent until the auction ends.
    expect(eventPosts().length).to.equal(0);

    endAuction(auctionId);

    const posts = eventPosts();
    expect(posts.length).to.equal(1);
    const batch = posts[0];
    const types = batch.map((e) => e.eventType);
    expect(types).to.include.members(['auctionInit', 'bidRequested', 'bidResponse']);
    batch.forEach((e) => expect(e.auctionId).to.equal(auctionId));

    // A direct bidder resolves to identical client/full SSP.
    const response = batch.find((e) => e.eventType === 'bidResponse');
    expect(response.clientSsp).to.equal('appnexus');
    expect(response.fullSsp).to.equal('appnexus');
    // A non-nexx360 (direct) bidder is a client-side connection.
    expect(response.connectionType).to.equal('client');
  });

  it('stamps abTestLabel from config onto every event when set', function () {
    enable({ abTestLabel: 'variantA' });
    const auctionId = 'auction-ab';

    events.emit(EVENTS.AUCTION_INIT, { auctionId, timeout: 1000, adUnits: [] });
    endAuction(auctionId);

    const posts = eventPosts();
    expect(posts.length).to.equal(1);
    posts[0].forEach((e) => expect(e.abTestLabel).to.equal('variantA'));
  });

  it('omits abTestLabel when not configured', function () {
    enable();
    const auctionId = 'auction-no-ab';

    events.emit(EVENTS.AUCTION_INIT, { auctionId, timeout: 1000, adUnits: [] });
    endAuction(auctionId);

    const posts = eventPosts();
    expect(posts.length).to.equal(1);
    posts[0].forEach((e) => expect(e).to.not.have.property('abTestLabel'));
  });

  it('sends bidWon immediately as its own request', function () {
    enable();
    events.emit(EVENTS.BID_WON, {
      auctionId: 'auction-won',
      bidderCode: 'appnexus',
      adUnitCode: 'div-1',
      cpm: 2.0,
      currency: 'USD',
      width: 300,
      height: 250,
      requestId: 'req-2',
    });

    const posts = eventPosts();
    expect(posts.length).to.equal(1);
    expect(posts[0].length).to.equal(1);
    expect(posts[0][0].eventType).to.equal('bidWon');
    expect(posts[0][0].cpm).to.equal(2.0);
  });

  it('sends adRenderSucceeded and adRenderFailed immediately (failure carries reason)', function () {
    enable();
    events.emit(EVENTS.AD_RENDER_SUCCEEDED, {
      bid: { auctionId: 'a-r', bidder: 'appnexus', adUnitCode: 'div-1', cpm: 1, adId: 'ad-1' },
    });
    events.emit(EVENTS.AD_RENDER_FAILED, {
      reason: 'no creative',
      bid: { auctionId: 'a-r', bidder: 'appnexus', adUnitCode: 'div-2' },
    });

    const posts = eventPosts();
    expect(posts.length).to.equal(2);
    expect(posts[0][0].eventType).to.equal('adRenderSucceeded');
    expect(posts[1][0].eventType).to.equal('adRenderFailed');
    expect(posts[1][0].reason).to.equal('no creative');
  });

  it('defers the AUCTION_END flush by one tick', function () {
    enable();
    const auctionId = 'auction-deferred';
    events.emit(EVENTS.AUCTION_INIT, { auctionId, timeout: 1000, adUnits: [] });
    events.emit(EVENTS.AUCTION_END, { auctionId });
    expect(eventPosts().length).to.equal(0);
    clock.tick(0);
    expect(eventPosts().length).to.equal(1);
  });

  it('adds the serverAuction from a BIDDER_DONE emitted right after AUCTION_END to the batch', function () {
    // Prebid emits BIDDER_DONE after the done() call that can end the auction, so the last bidder
    // to answer reaches us after AUCTION_END, in the same tick.
    enable();
    const auctionId = 'auction-server';
    events.emit(EVENTS.AUCTION_INIT, { auctionId, timeout: 1000, adUnits: [] });
    events.emit(EVENTS.AUCTION_END, { auctionId });
    events.emit(EVENTS.BIDDER_DONE, { auctionId, bidderCode: 'nexx360', serverAuctionData: SERVER_AUCTION });
    clock.tick(0);

    const posts = eventPosts();
    expect(posts.length).to.equal(1);
    const serverEvent = posts[0].find((e) => e.eventType === 'serverAuction');
    expect(serverEvent, 'serverAuction event present').to.exist;
    expect(serverEvent.auctionId).to.equal(auctionId);
    expect(serverEvent.serverAuctionId).to.equal('srv-1');
    expect(serverEvent.totalImpressions).to.equal(1);
    expect(serverEvent.impressions[0].bids.length).to.equal(2);
    expect(serverEvent.connectionType).to.equal('nexx360');
  });

  it('reports the serverAuction of a response that had no bids', function () {
    enable();
    const auctionId = 'auction-server-nobid';
    events.emit(EVENTS.AUCTION_INIT, { auctionId, timeout: 1000, adUnits: [] });
    events.emit(EVENTS.BIDDER_DONE, {
      auctionId,
      bidderCode: 'nexx360',
      serverAuctionData: { ...SERVER_AUCTION, totalBidsReceived: 0 },
    });
    endAuction(auctionId);

    const batch = eventPosts()[0];
    expect(batch.filter((e) => e.eventType === 'bidResponse')).to.deep.equal([]);
    expect(batch.find((e) => e.eventType === 'serverAuction').totalBidsReceived).to.equal(0);
  });

  it('reports the serverAuction whatever the bidder code (e.g. the mtc bid adapter)', function () {
    enable();
    const auctionId = 'auction-server-mtc';
    events.emit(EVENTS.AUCTION_INIT, { auctionId, timeout: 1000, adUnits: [] });
    events.emit(EVENTS.BIDDER_DONE, { auctionId, bidderCode: 'mtc', serverAuctionData: SERVER_AUCTION });
    endAuction(auctionId);

    expect(eventPosts()[0].find((e) => e.eventType === 'serverAuction')).to.exist;
  });

  it('sends a serverAuction that arrives after the batch was sent on its own', function () {
    enable();
    const auctionId = 'auction-server-late';
    events.emit(EVENTS.AUCTION_INIT, { auctionId, timeout: 1000, adUnits: [] });
    endAuction(auctionId);
    events.emit(EVENTS.BIDDER_DONE, { auctionId, bidderCode: 'nexx360', serverAuctionData: SERVER_AUCTION });

    const posts = eventPosts();
    expect(posts.length).to.equal(2);
    expect(posts[1].length).to.equal(1);
    expect(posts[1][0].eventType).to.equal('serverAuction');
    expect(posts[1][0].auctionId).to.equal(auctionId);
  });

  it('sends a late serverAuction on its own after the auction cache was cleaned up', function () {
    enable();
    const auctionId = 'auction-server-cleaned';
    events.emit(EVENTS.AUCTION_INIT, { auctionId, timeout: 1000, adUnits: [] });
    endAuction(auctionId);
    clock.tick(60000);
    events.emit(EVENTS.BIDDER_DONE, { auctionId, bidderCode: 'nexx360', serverAuctionData: SERVER_AUCTION });

    const posts = eventPosts();
    expect(posts.length).to.equal(2);
    expect(posts[1][0].eventType).to.equal('serverAuction');
  });

  it('reports one serverAuction per bidder request when two nexx360 bidders share an auction', function () {
    enable();
    const auctionId = 'auction-server-two';
    events.emit(EVENTS.AUCTION_INIT, { auctionId, timeout: 1000, adUnits: [] });
    events.emit(EVENTS.BIDDER_DONE, { auctionId, bidderCode: 'nexx360', serverAuctionData: SERVER_AUCTION });
    events.emit(EVENTS.BIDDER_DONE, {
      auctionId,
      bidderCode: 'revenuemaker',
      serverAuctionData: { ...SERVER_AUCTION, auctionId: 'srv-2' },
    });
    endAuction(auctionId);

    const ids = eventPosts()[0].filter((e) => e.eventType === 'serverAuction').map((e) => e.serverAuctionId);
    expect(ids).to.have.members(['srv-1', 'srv-2']);
  });

  it('adds no serverAuction for a BIDDER_DONE without server data', function () {
    enable();
    const auctionId = 'auction-server-none';
    events.emit(EVENTS.AUCTION_INIT, { auctionId, timeout: 1000, adUnits: [] });
    events.emit(EVENTS.BIDDER_DONE, { auctionId, bidderCode: 'appnexus' });
    endAuction(auctionId);
    events.emit(EVENTS.BIDDER_DONE, { auctionId, bidderCode: 'nexx360' });

    expect(eventPosts().flat().find((e) => e.eventType === 'serverAuction')).to.equal(undefined);
  });

  it('no longer builds a serverAuction from bidResponse server data', function () {
    enable();
    const auctionId = 'auction-server-bidresponse';
    events.emit(EVENTS.AUCTION_INIT, { auctionId, timeout: 1000, adUnits: [] });
    events.emit(EVENTS.BID_RESPONSE, {
      auctionId, bidderCode: 'nexx360', adUnitCode: 'd', cpm: 1, currency: 'USD', requestId: 'r', serverAuctionData: SERVER_AUCTION,
    });
    endAuction(auctionId);

    const batch = eventPosts()[0];
    expect(batch.find((e) => e.eventType === 'serverAuction')).to.equal(undefined);
    batch.forEach((e) => expect(e).to.not.have.property('serverAuctionData'));
  });

  it('resolves nexx360 bidResponses to the underlying SSP and a nexx360 connection', function () {
    enable();
    const auctionId = 'auction-nexx360-resp';
    events.emit(EVENTS.AUCTION_INIT, { auctionId, timeout: 1000, adUnits: [] });
    events.emit(EVENTS.BID_RESPONSE, {
      auctionId, bidderCode: 'nexx360', meta: { demandSource: 'rubicon' }, adUnitCode: 'd', cpm: 1, currency: 'USD', requestId: 'r',
    });
    endAuction(auctionId);

    const response = eventPosts()[0].find((e) => e.eventType === 'bidResponse');
    expect(response.clientSsp).to.equal('nexx360');
    expect(response.fullSsp).to.equal('rubicon');
    expect(response.connectionType).to.equal('nexx360');
  });

  it('treats a publisher alias of nexx360 as nexx360', function () {
    adapterManager.aliasBidAdapter('nexx360', 'n360pubalias');
    enable();
    const auctionId = 'auction-alias';
    events.emit(EVENTS.AUCTION_INIT, { auctionId, timeout: 1000, adUnits: [] });
    events.emit(EVENTS.BID_REQUESTED, {
      auctionId,
      bidderCode: 'n360pubalias',
      bids: [{ bidder: 'n360pubalias', adUnitCode: 'd', bidId: 'b1', sizes: [[300, 250]] }],
    });
    events.emit(EVENTS.BID_RESPONSE, {
      auctionId, bidderCode: 'n360pubalias', meta: { demandSource: 'rubicon' }, adUnitCode: 'd', cpm: 1, currency: 'USD', requestId: 'r',
    });
    endAuction(auctionId);

    const batch = eventPosts()[0];
    expect(batch.find((e) => e.eventType === 'bidRequested').connectionType).to.equal('nexx360');
    const response = batch.find((e) => e.eventType === 'bidResponse');
    expect(response.clientSsp).to.equal('n360pubalias');
    expect(response.fullSsp).to.equal('rubicon');
    expect(response.connectionType).to.equal('nexx360');
  });

  it('treats a built-in alias of nexx360 as nexx360', function () {
    enable();
    const auctionId = 'auction-builtin-alias';
    events.emit(EVENTS.AUCTION_INIT, { auctionId, timeout: 1000, adUnits: [] });
    events.emit(EVENTS.BID_RESPONSE, {
      auctionId, bidderCode: 'revenuemaker', meta: { demandSource: 'pubmatic' }, adUnitCode: 'd', cpm: 1, currency: 'USD', requestId: 'r',
    });
    endAuction(auctionId);

    const response = eventPosts()[0].find((e) => e.eventType === 'bidResponse');
    expect(response.fullSsp).to.equal('pubmatic');
    expect(response.connectionType).to.equal('nexx360');
  });

  it('keeps meta.demandSource of a non-nexx360 bidder out of fullSsp', function () {
    enable();
    const auctionId = 'auction-other-demandsource';
    events.emit(EVENTS.AUCTION_INIT, { auctionId, timeout: 1000, adUnits: [] });
    events.emit(EVENTS.BID_RESPONSE, {
      auctionId, bidderCode: 'appnexus', meta: { demandSource: 'somedsp' }, adUnitCode: 'd', cpm: 1, currency: 'USD', requestId: 'r',
    });
    endAuction(auctionId);

    const response = eventPosts()[0].find((e) => e.eventType === 'bidResponse');
    expect(response.fullSsp).to.equal('appnexus');
    expect(response.connectionType).to.equal('client');
  });

  it('sends a bidResponse that arrives after the batch was sent on its own', function () {
    enable();
    const auctionId = 'auction-late-bid';
    events.emit(EVENTS.AUCTION_INIT, { auctionId, timeout: 1000, adUnits: [] });
    endAuction(auctionId);
    events.emit(EVENTS.BID_RESPONSE, {
      auctionId, bidderCode: 'appnexus', adUnitCode: 'd', cpm: 1, currency: 'USD', requestId: 'r', timeToRespond: 1010,
    });

    const posts = eventPosts();
    expect(posts.length).to.equal(2);
    expect(posts[1].length).to.equal(1);
    expect(posts[1][0].eventType).to.equal('bidResponse');
    expect(posts[1][0].timeToRespond).to.equal(1010);
  });

  it('does not drop auctions (every auction produces output)', function () {
    enable();
    const n = 5;
    for (let i = 0; i < n; i++) {
      const auctionId = `auction-${i}`;
      events.emit(EVENTS.AUCTION_INIT, { auctionId, timeout: 1000, adUnits: [] });
      endAuction(auctionId);
    }
    const posts = eventPosts();
    expect(posts.length).to.equal(n);
    posts.forEach((batch) => {
      expect(batch.some((e) => e.eventType === 'auctionInit')).to.equal(true);
    });
  });

  it('captures id solutions from auctionInit bidderRequests', function () {
    enable();
    const auctionId = 'auction-eids';
    events.emit(EVENTS.AUCTION_INIT, {
      auctionId,
      timeout: 1000,
      adUnits: [{
        code: 'div-1',
        ortb2Imp: { ext: { gpid: '/12345/div-1' } },
        bids: [{ bidder: 'nexx360' }],
      }],
      bidderRequests: [{
        ortb2: {
          user: {
            ext: {
              eids: [
                { source: 'id5-sync.com', uids: [{ id: 'x' }] },
                { source: 'first-id.fr', uids: [{ id: 'y' }] },
                { source: 'uidapi.com', uids: [{ id: 'z' }] },
                { source: 'liveramp.com', uids: [{ id: 'w' }] },
              ]
            }
          }
        },
      }],
    });
    endAuction(auctionId);

    const init = eventPosts()[0].find((e) => e.eventType === 'auctionInit');
    expect(init.idSolutions).to.deep.equal({ id5: true, firstId: true, euid2: true, liveramp: true });
    expect(init.adUnits[0].gpid).to.equal('/12345/div-1');
    expect(init).to.have.property('refreshIndex');
  });

  it('records bidTimeout events in the auction batch', function () {
    enable();
    const auctionId = 'auction-timeout';
    events.emit(EVENTS.AUCTION_INIT, { auctionId, timeout: 1000, adUnits: [] });
    events.emit(EVENTS.BID_TIMEOUT, [
      {
        auctionId,
        bidder: 'appnexus',
        adUnitCode: 'div-1',
        bidId: 'b1',
        sizes: [[300, 250]],
        ortb2Imp: { ext: { gpid: '/12345/div-1' } },
      },
    ]);
    endAuction(auctionId);

    const timeout = eventPosts()[0].find((e) => e.eventType === 'bidTimeout');
    expect(timeout, 'bidTimeout event present').to.exist;
    expect(timeout.bids[0].bidder).to.equal('appnexus');
    expect(timeout.bids[0].gpid).to.equal('/12345/div-1');
    expect(timeout.bids[0].sizes).to.deep.equal(['300x250']);
  });

  it('normalizes the single-size (flat) sizes form', function () {
    enable();
    const auctionId = 'auction-flatsize';
    events.emit(EVENTS.AUCTION_INIT, { auctionId, timeout: 1000, adUnits: [] });
    // Prebid's single-size form is a flat tuple, e.g. [300, 250] (not [[300, 250]]).
    events.emit(EVENTS.BID_REQUESTED, {
      auctionId,
      bidderCode: 'appnexus',
      bids: [{ bidder: 'appnexus', adUnitCode: 'div-1', bidId: 'b1', sizes: [300, 250] }],
    });
    endAuction(auctionId);

    const requested = eventPosts()[0].find((e) => e.eventType === 'bidRequested');
    expect(requested.bids[0].sizes).to.deep.equal(['300x250']);
  });

  it('includes floorData on bid responses when present', function () {
    enable();
    const auctionId = 'auction-floor';
    events.emit(EVENTS.AUCTION_INIT, { auctionId, timeout: 1000, adUnits: [] });
    events.emit(EVENTS.BID_RESPONSE, {
      auctionId,
      bidderCode: 'appnexus',
      adUnitCode: 'div-1',
      cpm: 1.5,
      currency: 'USD',
      width: 300,
      height: 250,
      requestId: 'req-1',
      floorData: {
        floorValue: 0.5,
        floorRule: 'banner|300x250',
        floorCurrency: 'USD',
        cpmAfterAdjustments: 1.5,
      },
    });
    endAuction(auctionId);

    const response = eventPosts()[0].find((e) => e.eventType === 'bidResponse');
    expect(response.floorData).to.deep.equal({
      floorValue: 0.5,
      floorRule: 'banner|300x250',
      floorCurrency: 'USD',
      cpmAfterAdjustments: 1.5,
    });
    expect(response.size).to.equal('300x250');
  });

  it('handles auctionInit with no adUnits and empty / non-matching eids', function () {
    enable();

    // empty eids -> idSolutions undefined; no adUnits key -> falls back to []
    events.emit(EVENTS.AUCTION_INIT, {
      auctionId: 'a-empty',
      timeout: 1000,
      bidderRequests: [{ ortb2: { user: { ext: { eids: [] } } } }],
    });
    endAuction('a-empty');

    // eids present but none matching known sources -> idSolutions undefined;
    // an adUnit without bids -> bids falls back to []
    events.emit(EVENTS.AUCTION_INIT, {
      auctionId: 'a-unknown',
      timeout: 1000,
      adUnits: [{ code: 'd1' }],
      bidderRequests: [{ ortb2: { user: { ext: { eids: [{ source: 'unknown.com', uids: [{ id: '1' }] }] } } } }],
    });
    endAuction('a-unknown');

    const inits = eventPosts().flat().filter((e) => e.eventType === 'auctionInit');
    const empty = inits.find((e) => e.auctionId === 'a-empty');
    const unknown = inits.find((e) => e.auctionId === 'a-unknown');
    expect(empty.idSolutions).to.equal(undefined);
    expect(empty.adUnits).to.deep.equal([]);
    expect(unknown.idSolutions).to.equal(undefined);
    expect(unknown.adUnits[0].bids).to.deep.equal([]);
  });

  it('handles bidRequested without bids and bidTimeout without sizes', function () {
    enable();
    const auctionId = 'a-minimal';
    events.emit(EVENTS.AUCTION_INIT, { auctionId, timeout: 1000, adUnits: [] });
    events.emit(EVENTS.BID_REQUESTED, { auctionId, bidderCode: 'appnexus' });
    events.emit(EVENTS.BID_TIMEOUT, [{ auctionId, bidder: 'appnexus', adUnitCode: 'd', bidId: 'b' }]);
    endAuction(auctionId);

    const batch = eventPosts().flat();
    expect(batch.find((e) => e.eventType === 'bidRequested').bids).to.deep.equal([]);
    expect(batch.find((e) => e.eventType === 'bidTimeout').bids[0].sizes).to.deep.equal([]);
  });

  it('falls back to args.bidder and to empty bidder codes', function () {
    enable();
    const auctionId = 'a-fallback';
    events.emit(EVENTS.AUCTION_INIT, { auctionId, timeout: 1000, adUnits: [] });
    // bidResponse via args.bidder (no bidderCode); and with neither set
    events.emit(EVENTS.BID_RESPONSE, {
      auctionId, bidder: 'rubicon', adUnitCode: 'd', cpm: 1, currency: 'USD', requestId: 'r1',
    });
    events.emit(EVENTS.BID_RESPONSE, {
      auctionId, adUnitCode: 'd2', cpm: 1, currency: 'USD', requestId: 'r2',
    });
    // bidWon via args.bidder; and with neither set
    events.emit(EVENTS.BID_WON, {
      auctionId, bidder: 'rubicon', adUnitCode: 'd', cpm: 1, currency: 'USD', requestId: 'r3',
    });
    events.emit(EVENTS.BID_WON, {
      auctionId, adUnitCode: 'd', cpm: 1, currency: 'USD', requestId: 'r4',
    });
    endAuction(auctionId);

    const all = eventPosts().flat();
    const responses = all.filter((e) => e.eventType === 'bidResponse');
    const wons = all.filter((e) => e.eventType === 'bidWon');
    expect(responses.some((r) => r.clientSsp === 'rubicon')).to.equal(true);
    expect(responses.some((r) => r.clientSsp === '')).to.equal(true);
    expect(wons.some((w) => w.clientSsp === 'rubicon')).to.equal(true);
    expect(wons.some((w) => w.clientSsp === '')).to.equal(true);
  });

  it('handles adRender events with missing bid fields', function () {
    enable();
    // no bid object at all -> bid={}, auctionId='unknown', empty bidder code
    events.emit(EVENTS.AD_RENDER_SUCCEEDED, {});
    // bid with bidderCode only (no bidder)
    events.emit(EVENTS.AD_RENDER_SUCCEEDED, { bid: { bidderCode: 'appnexus', adUnitCode: 'd' } });

    const rendered = eventPosts().flat().filter((e) => e.eventType === 'adRenderSucceeded');
    expect(rendered.length).to.equal(2);
    expect(rendered[0].auctionId).to.equal('unknown');
    expect(rendered[0].clientSsp).to.equal('');
    expect(rendered[1].clientSsp).to.equal('appnexus');
  });

  it('does not add a serverAuction event when the bidResponse carries no server data', function () {
    enable();
    const auctionId = 'a-noserver';
    events.emit(EVENTS.AUCTION_INIT, { auctionId, timeout: 1000, adUnits: [] });
    events.emit(EVENTS.BID_RESPONSE, {
      auctionId, bidderCode: 'nexx360', adUnitCode: 'd', cpm: 1, currency: 'USD', requestId: 'r',
    });
    endAuction(auctionId);
    expect(eventPosts().flat().find((e) => e.eventType === 'serverAuction')).to.equal(undefined);
  });

  it('ignores unknown event types and swallows errors thrown while building events', function () {
    enable();
    // Unknown event type hits the switch default branch.
    expect(() => nexx360AnalyticsAdapter.track({ eventType: 'unknownEvent', args: {} })).to.not.throw();
    // Malformed args make a builder throw; the adapter must catch and not rethrow.
    expect(() => nexx360AnalyticsAdapter.track({ eventType: EVENTS.BID_TIMEOUT, args: 5 })).to.not.throw();
  });

  it('invokes the ajax success and error callbacks', function () {
    enable();
    const isEventsReq = (r) => /\/events$/.test(r.url);

    // Success: resolve the immediate bidWon POST with a 200.
    events.emit(EVENTS.BID_WON, {
      auctionId: 'won-ok',
      bidderCode: 'appnexus',
      adUnitCode: 'div-1',
      cpm: 1,
      currency: 'USD',
      requestId: 'r1',
    });
    server.requests.filter(isEventsReq).forEach((r) => r.respond(200, {}, ''));

    // Error: fail the next POST at the network level.
    events.emit(EVENTS.BID_WON, {
      auctionId: 'won-err',
      bidderCode: 'appnexus',
      adUnitCode: 'div-1',
      cpm: 1,
      currency: 'USD',
      requestId: 'r2',
    });
    server.requests
      .filter((r) => isEventsReq(r) && r.readyState !== XMLHttpRequest.DONE)
      .forEach((r) => r.error());

    expect(server.requests.filter(isEventsReq).length).to.equal(2);
  });

  it('defaults to the production endpoint when none is configured', function () {
    // enableAnalytics without an explicit endpoint should fall back to DEFAULT_ENDPOINT.
    nexx360AnalyticsAdapter.enableAnalytics({
      provider: 'nexx360',
      options: { publisherId: PUBLISHER_ID },
    });
    const auctionId = 'auction-default-endpoint';
    events.emit(EVENTS.AUCTION_INIT, { auctionId, timeout: 1000, adUnits: [] });
    endAuction(auctionId);

    const eventsReqs = server.requests.filter((r) => /\/events$/.test(r.url));
    expect(eventsReqs.length).to.equal(1);
    expect(eventsReqs[0].url).to.equal('https://monitoring.nexx360.io/events');
  });

  // Kept last on purpose: enabling without publisherId does not delegate to the base
  // adapter, so its enable/disable swap would otherwise leave enableAnalytics pointing
  // at the base _enable and break subsequent tests.
  it('does not enable (no requests) when publisherId is missing', function () {
    enable({ publisherId: undefined });
    expect(eventPosts().length).to.equal(0);
  });
});
