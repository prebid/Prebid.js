import { expect } from 'chai';
import railuAnalytics from 'modules/railuAnalyticsAdapter.js';
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

  beforeEach(function () {
    clock = sinon.useFakeTimers();
    beacon = sinon.stub(navigator, 'sendBeacon').returns(true);
    sinon.stub(events, 'getEvents').returns([]);
  });

  afterEach(function () {
    if (railuAnalytics.enabled) railuAnalytics.disableAnalytics(); // disabling a never-enabled adapter resets its enableAnalytics
    events.getEvents.restore();
    beacon.restore();
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

describe('railuUtils analytics', function () {
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
