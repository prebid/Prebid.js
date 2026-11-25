import { expect } from 'chai';
import railuAnalytics, { sampleRate } from 'modules/railuAnalyticsAdapter.js';
import adapterManager from 'src/adapterManager.js';
import { EVENTS } from 'src/constants.js';
import { makeCollector, observation, slotOutcome } from 'libraries/railuUtils/analyticsUtils.js';
const events = require('src/events');

const AUCTION = 'auction-1';
const adUnits = [
  { code: 'banner-1', mediaTypes: { banner: { sizes: [[300, 250]] } }, bids: [{ bidder: 'railu' }, { bidder: 'other' }] },
  { code: 'video-1', mediaTypes: { video: { playerSize: [[640, 360]] } }, bids: [{ bidder: 'railu' }] },
];

function runAuction() {
  events.emit(EVENTS.AUCTION_INIT, { auctionId: AUCTION, adUnits });
  events.emit(EVENTS.BID_RESPONSE, { auctionId: AUCTION, adUnitCode: 'banner-1', bidderCode: 'railu', cpm: 2.5 });
  events.emit(EVENTS.BID_RESPONSE, { auctionId: AUCTION, adUnitCode: 'banner-1', bidderCode: 'other', cpm: 1.2 });
  events.emit(EVENTS.NO_BID, { auctionId: AUCTION, adUnitCode: 'video-1', bidder: 'railu' });
  events.emit(EVENTS.BID_WON, { auctionId: AUCTION, adUnitCode: 'banner-1', bidderCode: 'railu', cpm: 2.5, dealId: 'deal-1' });
  events.emit(EVENTS.AUCTION_END, { auctionId: AUCTION });
}

describe('railuAnalyticsAdapter', function () {
  let clock, beacon;

  let bg;
  beforeEach(function () {
    clock = sinon.useFakeTimers();
    // run Prebid's background tasks at once (scheduler.postTask / requestIdleCallback are not driven by fake timers)
    bg = [];
    if (window.scheduler && window.scheduler.postTask) bg.push(sinon.stub(window.scheduler, 'postTask').callsFake((t) => { t(); return Promise.resolve(); }));
    if (typeof window.requestIdleCallback === 'function') bg.push(sinon.stub(window, 'requestIdleCallback').callsFake((t) => { t(); return 1; }));
    beacon = sinon.stub(navigator, 'sendBeacon').returns(true);
    sinon.stub(events, 'getEvents').returns([]);
  });

  afterEach(function () {
    if (railuAnalytics.enabled) railuAnalytics.disableAnalytics(); // disabling a never-enabled adapter resets its enableAnalytics
    events.getEvents.restore();
    beacon.restore();
    bg.forEach((x) => x.restore());
    clock.restore();
  });

  it('registers as the railu analytics provider', function () {
    expect(adapterManager.getAnalyticsAdapter('railu').adapter).to.equal(railuAnalytics);
  });

  it('sends one observation per auction after it ends, with no user data', async function () {
    railuAnalytics.enableAnalytics({ provider: 'railu', options: { tid: 't_k3m9p2x7q4w8z6' } });
    runAuction();
    expect(beacon.called).to.equal(false, 'nothing is sent while the page renders');
    clock.tick(4000); // Prebid delivers queued events after a short debounce; the beacon goes 3 s after auctionEnd
    expect(beacon.calledOnce).to.equal(true);
    const [url, blob] = beacon.firstCall.args;
    expect(url).to.equal('https://api.railu.ai/v1/observe?tid=t_k3m9p2x7q4w8z6');
    const body = JSON.parse(await blob.text());
    expect(body).to.include({ v: 1, tid: 't_k3m9p2x7q4w8z6', sample: 1 });
    expect(body.slots).to.have.lengthOf(2);
    expect(body.slots[0]).to.deep.include({ code: 'banner-1', format: 'banner', sizes: ['300x250'], asked: 2, bids: 2, top_cpm: 2.5 });
    expect(body.slots[0].winner).to.deep.equal({ bidder: 'railu', cpm: 2.5, deal: 'deal-1' });
    expect(body.slots[1]).to.deep.include({ code: 'video-1', format: 'video', asked: 1, bids: 0, winner: null });
    expect(Object.keys(body).sort()).to.deep.equal(['domain', 'sample', 'slots', 'tid', 'v']);
  });

  it('reports nothing at sample 0', function () {
    railuAnalytics.enableAnalytics({ provider: 'railu', options: { tid: 't_x', sample: 0 } });
    runAuction();
    clock.tick(4000);
    expect(beacon.called).to.equal(false);
  });

  it('cancels a pending report when analytics is disabled', function () {
    railuAnalytics.enableAnalytics({ provider: 'railu', options: { tid: 't_x' } });
    runAuction();
    clock.tick(500);
    railuAnalytics.disableAnalytics();
    clock.tick(4000);
    expect(beacon.called).to.equal(false);
  });

  it('sends nothing without a tag ID', function () {
    railuAnalytics.enableAnalytics({ provider: 'railu', options: {} });
    runAuction();
    clock.tick(4000); // Prebid delivers queued events after a short debounce; the beacon goes 3 s after auctionEnd
    expect(beacon.called).to.equal(false);
  });

  it('uses the endpoint override', function () {
    railuAnalytics.enableAnalytics({ provider: 'railu', options: { tid: 't_x', endpoint: 'https://staging.example/v1/observe' } });
    runAuction();
    clock.tick(4000); // Prebid delivers queued events after a short debounce; the beacon goes 3 s after auctionEnd
    expect(beacon.firstCall.args[0]).to.equal('https://staging.example/v1/observe?tid=t_x');
  });
});

describe('railuAnalytics sampleRate', function () {
  it('keeps the rate as set: 0 is none, only an absent or invalid value is 1', function () {
    expect(sampleRate(0)).to.equal(0); expect(sampleRate(0.0005)).to.equal(0.0005); expect(sampleRate(2)).to.equal(1);
    expect(sampleRate(undefined)).to.equal(1); expect(sampleRate('x')).to.equal(1);
  });
});

describe('railuUtils analytics', function () {
  it('never revives an auction already reported, and stays bounded', function () {
    const c = makeCollector();
    c.on('auctionInit', { auctionId: 'a', adUnits: [{ code: 's1', mediaTypes: { banner: { sizes: [[300, 250]] } }, bids: [] }] });
    c.drop('a');
    c.on('bidWon', { auctionId: 'a', adUnitCode: 's1', bidderCode: 'railu', cpm: 1 });
    expect(c.auction('a')).to.equal(null);
    for (let i = 0; i < 50; i++) c.on('auctionInit', { auctionId: 'x' + i, adUnits: [] });
    expect(c.size()).to.be.at.most(20);
  });

  it('reports the format that sold on a multiformat slot', function () {
    const c = makeCollector();
    c.on('auctionInit', { auctionId: 'b', adUnits: [{ code: 's1', mediaTypes: { video: { playerSize: [[640, 360]] }, banner: { sizes: [[300, 250]] } }, bids: [{ bidder: 'railu' }] }] });
    c.on('bidResponse', { auctionId: 'b', adUnitCode: 's1', bidderCode: 'railu', cpm: 2, mediaType: 'banner' });
    c.on('bidWon', { auctionId: 'b', adUnitCode: 's1', bidderCode: 'railu', cpm: 2, mediaType: 'banner' });
    const slot = observation(c.auction('b'), {}).slots[0];
    expect(slot.format).to.equal('banner');
    expect(slot.formats).to.deep.equal(['video', 'banner']);
  });

  it('records what the ad server filled when Prebid had no winner', function () {
    const c = makeCollector();
    c.on('auctionInit', { auctionId: 'a', adUnits: [{ code: 's1', mediaTypes: { banner: { sizes: [[728, 90]] } }, bids: [{ bidder: 'railu' }] }] });
    c.on('auctionEnd', { auctionId: 'a' });
    c.rendered('s1', false);
    const obs = observation(c.auction('a'), { tid: 't', domain: 'Example.com' });
    expect(obs.domain).to.equal('example.com');
    expect(slotOutcome(obs.slots[0])).to.equal('ad_server');
    c.rendered('s1', true);
    expect(slotOutcome(observation(c.auction('a'), {}).slots[0])).to.equal('unsold');
  });
});
