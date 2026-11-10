import { expect } from 'chai';
import xeAnalytics, { dep } from 'modules/xeAnalyticsAdapter.js';
import adapterManager from 'src/adapterManager.js';
import { EVENTS } from 'src/constants.js';
import * as events from 'src/events.js';

const ENDPOINT = 'https://pbjs.xe.works/analytics';
const PID = '6f1c3d2a-8b4e-4f5a-9c7d-1e2f3a4b5c6d';
const AUCTION = 'auction-1';

const bidRequest = (bidder, params, unit = 'top') => ({
  bidder,
  params,
  adUnitCode: unit,
  auctionId: AUCTION,
  bidId: `${bidder}-${unit}`,
  mediaTypes: { banner: { sizes: [[300, 250], [728, 90]] } },
  ortb2Imp: { ext: { gpid: '/1/top' } },
  floorData: { location: 'fetch', fetchStatus: 'success', floorProvider: 'xe', modelVersion: 'm1', skipped: false },
  userIdAsEids: [{ source: 'id5-sync.com', uids: [{ id: 'secret-id' }] }]
});

const bid = (bidder, cpm, extra = {}) => ({
  bidder,
  adapterCode: bidder,
  auctionId: AUCTION,
  adUnitCode: 'top',
  adId: `ad-${bidder}`,
  cpm,
  currency: 'USD',
  originalCpm: cpm * 2,
  originalCurrency: 'EUR',
  mediaType: 'banner',
  size: '300x250',
  timeToRespond: 120,
  dealId: bidder === 'appnexus' ? 'deal-1' : undefined,
  meta: { advertiserDomains: ['brand.com'], networkName: 'dsp-1' },
  floorData: { floorValue: 0.5, floorRule: 'banner|*', floorCurrency: 'USD' },
  ...extra
});

function init(id = AUCTION) {
  events.emit(EVENTS.AUCTION_INIT, {
    auctionId: id,
    timestamp: 1000,
    timeout: 1500,
    adUnits: [{ code: 'top', mediaTypes: { banner: { sizes: [300, 250] } }, ortb2Imp: { ext: { gpid: '/1/top' } }, bids: [{}] }]
  });
}

function request(bidder, params, extra = {}) {
  events.emit(EVENTS.BID_REQUESTED, {
    auctionId: AUCTION,
    bidderCode: bidder,
    bids: [bidRequest(bidder, params)],
    gdprConsent: { gdprApplies: true, consentString: 'CONSENT-STRING' },
    uspConsent: '1YNN',
    gppConsent: { gppString: 'GPP-STRING', applicableSections: [7, -1] },
    ortb2: {
      device: { devicetype: 4 },
      regs: { coppa: 1 },
      source: { ext: { schain: { ver: '1.0', nodes: [] } } },
      user: { ext: { eids: [{ source: 'pubcid.org', uids: [{ id: 'user-1' }] }] } }
    },
    ...extra
  });
}

function end(id = AUCTION) {
  events.emit(EVENTS.AUCTION_END, { auctionId: id, auctionEnd: 1900 });
}

function enable(options) {
  xeAnalytics.enableAnalytics({ provider: 'xe', options });
}

describe('xe analytics adapter', function () {
  let clock, ajax, beacon;

  const bodies = () => [
    ...ajax.getCalls().map(call => call.args[2]),
    ...beacon.getCalls().map(call => call.args[1])
  ];
  const sent = () => bodies().flatMap(body => JSON.parse(body));
  const sentOf = e => sent().filter(event => event.e === e);

  function fullAuction() {
    init();
    request('xe', { env: 'xe', pid: PID });
    request('appnexus', { placementId: 13144370 });
    request('rubicon', { accountId: 1, siteId: 2 });
    request('ix', { siteId: '3' });
    events.emit(EVENTS.BID_RESPONSE, bid('xe', 1.2));
    events.emit(EVENTS.BID_RESPONSE, bid('appnexus', 1.9));
    events.emit(EVENTS.BID_REJECTED, bid('ix', 0.3, { rejectionReason: 'Bid does not meet price floor' }));
    events.emit(EVENTS.NO_BID, bidRequest('rubicon', {}));
    events.emit(EVENTS.BIDDER_ERROR, { error: { status: 500 }, bidderRequest: { auctionId: AUCTION, bidderCode: 'rubicon' } });
    events.emit(EVENTS.BID_TIMEOUT, [bidRequest('ix', {})]);
    end();
  }

  beforeEach(function () {
    sinon.stub(events, 'getEvents').returns([]);
    ajax = sinon.stub(dep, 'ajax');
    beacon = sinon.stub(dep, 'sendBeacon').returns(true);
    clock = sinon.useFakeTimers({ now: 5000 });
  });

  afterEach(function () {
    xeAnalytics.disableAnalytics();
    events.getEvents.restore();
    ajax.restore();
    beacon.restore();
    clock.restore();
  });

  it('registers as "xe" with GVL id 1383', function () {
    const entry = adapterManager.getAnalyticsAdapter('xe');
    expect(entry.adapter).to.equal(xeAnalytics);
    expect(entry.gvlid).to.equal(1383);
  });

  it('sends one auction 3 s after auctionEnd, with the wins and renders of that window', function () {
    enable();
    fullAuction();
    events.emit(EVENTS.BID_WON, bid('appnexus', 1.9));
    events.emit(EVENTS.AD_RENDER_SUCCEEDED, { adId: 'ad-appnexus', bid: bid('appnexus', 1.9) });
    clock.tick(2999);
    expect(ajax.called).to.be.false;
    clock.tick(1);

    expect(ajax.calledOnce).to.be.true;
    const [url, , body, options] = ajax.firstCall.args;
    expect(url).to.equal(ENDPOINT);
    expect(options).to.eql({ method: 'POST', contentType: 'text/plain', keepalive: true });

    const [auction, won] = JSON.parse(body);
    expect(auction).to.deep.include({
      v: 2,
      e: 'auction',
      id: AUCTION,
      ts: 1000,
      end: 1900,
      timeout: 1500,
      dev: 4,
      gdpr: 1,
      gpp: [7],
      usp: 1,
      coppa: 1,
      schain: 1
    });
    expect(auction.eids).to.have.members(['pubcid.org', 'id5-sync.com']);
    expect(auction.units).to.eql([['top', 'banner', '300x250', '/1/top', 'fetch', 'success', 'xe', 'm1', 0]]);
    expect(auction.req).to.eql([
      ['top', 'xe', PID, 'banner'],
      ['top', 'appnexus', '', 'banner'],
      ['top', 'rubicon', '', 'banner'],
      ['top', 'ix', '', 'banner']
    ]);
    expect(auction.bids[1]).to.eql(['top', 'appnexus', 1.9, 'USD', 'banner', '300x250', 120, 1, 'appnexus', 3.8, 'EUR', 0.5, 'banner|*', 'USD', 'brand.com', 'dsp-1']);
    expect(auction.rej).to.eql([['top', 'ix', 0.3, 'USD', 'banner', '300x250', 120, 0, 'ix', 0.6, 'EUR', 0.5, 'banner|*', 'USD', 'brand.com', 'dsp-1', 'Bid does not meet price floor']]);
    expect(auction.nobid).to.eql([['top', 'rubicon']]);
    expect(auction.to).to.eql([['top', 'ix']]);
    expect(auction.err).to.eql([['rubicon', 500]]);
    expect(auction).to.not.have.property('smp');
    expect(won).to.deep.include({ v: 2, e: 'won', id: AUCTION, pid: PID, ours: 0, rendered: 1, viewable: 0 });
    expect(won.b.slice(0, 3)).to.eql(['top', 'appnexus', 1.9]);
  });

  it('sends no bidder params other than the XE placement id, and no ids or consent strings', function () {
    enable();
    fullAuction();
    clock.tick(3000);
    const body = bodies().join('');
    ['13144370', 'accountId', 'siteId', 'secret-id', 'user-1', 'CONSENT-STRING', 'GPP-STRING', '1YNN'].forEach(value => {
      expect(body).to.not.include(value);
    });
  });

  it('takes the pid from the bidders option and from aliases of the XE adapters', function () {
    const resolveAlias = sinon.stub(adapterManager, 'resolveAlias').callsFake(code => (code === 'mySsp' ? 'xe' : code));
    try {
      enable({ bidders: ['adipolo', 42] });
      init();
      request('mySsp', [{ pid: PID }]);
      request('adipolo', { placement: 'adipolo-unit' });
      request('appnexus', { pid: 'not-ours' });
      events.emit(EVENTS.BID_WON, bid('mySsp', 2));
      end();
      clock.tick(3000);
      const [auction, won] = sent();
      expect(auction.req.map(r => r[2])).to.eql([PID, 'adipolo-unit', '']);
      expect(won).to.deep.include({ pid: PID, ours: 1 });
    } finally {
      resolveAlias.restore();
    }
  });

  it('does not send auctions without an XE ad unit, nor their events', function () {
    enable();
    init();
    request('appnexus', { placementId: 1 });
    end();
    events.emit(EVENTS.BID_WON, bid('appnexus', 1));
    clock.tick(5000);
    events.emit(EVENTS.BID_VIEWABLE, bid('appnexus', 1));
    events.emit(EVENTS.BID_WON, bid('appnexus', 1, { auctionId: 'unknown' }));
    events.emit(EVENTS.AD_RENDER_FAILED, { reason: 'cannotFindAd', adId: 'x' });
    clock.tick(5000);
    expect(ajax.called).to.be.false;
  });

  it('batches the events that come after the auction was sent, each fact once', function () {
    enable();
    fullAuction();
    events.emit(EVENTS.BID_WON, bid('xe', 1.2));
    clock.tick(3000);
    expect(sentOf('won')[0]).to.deep.include({ ours: 1, rendered: 0, viewable: 0 });

    events.emit(EVENTS.AD_RENDER_SUCCEEDED, { adId: 'ad-xe', bid: bid('xe', 1.2) });
    events.emit(EVENTS.AD_RENDER_SUCCEEDED, { adId: 'ad-xe', bid: bid('xe', 1.2) });
    events.emit(EVENTS.BID_VIEWABLE, bid('xe', 1.2));
    events.emit(EVENTS.BID_VIEWABLE, bid('xe', 1.2));
    events.emit(EVENTS.STALE_RENDER, bid('xe', 1.2));
    events.emit(EVENTS.EXPIRED_RENDER, bid('xe', 1.2));
    events.emit(EVENTS.BROWSER_INTERVENTION, { adId: 'ad-xe', bid: bid('xe', 1.2), intervention: { body: { id: 'HeavyAdIntervention' } } });
    events.emit(EVENTS.AD_RENDER_FAILED, { reason: 'exception', adId: 'ad-xe', bid: bid('xe', 1.2) });
    events.emit(EVENTS.BILLABLE_EVENT, { vendor: 'xe', type: 'impression', adId: 'ad-xe' });
    events.emit(EVENTS.BILLABLE_EVENT, { vendor: 'other', type: 'impression' });
    expect(ajax.calledOnce).to.be.true;
    clock.tick(1000);

    expect(ajax.calledTwice).to.be.true;
    const batch = JSON.parse(ajax.secondCall.args[2]);
    expect(batch.map(event => event.e)).to.eql(['rendered', 'viewable', 'staleRender', 'expiredRender', 'intervention', 'renderFailed', 'billable']);
    expect(batch[0]).to.deep.include({ pid: PID, ours: 1, rendered: 1 });
    expect(batch[1]).to.deep.include({ viewable: 1 });
    expect(batch[4].reason).to.equal('HeavyAdIntervention');
    expect(batch[5].reason).to.equal('exception');
    expect(batch[6].reason).to.equal('xe:impression');
  });

  it('flushes ended auctions and late events with sendBeacon when the page is hidden', function () {
    let state = 'visible';
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => state });
    try {
      enable();
      fullAuction();
      init('auction-2');
      document.dispatchEvent(new Event('visibilitychange'));
      expect(beacon.called).to.be.false;

      state = 'hidden';
      document.dispatchEvent(new Event('visibilitychange'));
      expect(beacon.calledOnce).to.be.true;
      expect(beacon.firstCall.args[0]).to.equal(ENDPOINT);
      expect(sentOf('auction').map(a => a.id)).to.eql([AUCTION]);

      events.emit(EVENTS.BID_WON, bid('xe', 1.2));
      beacon.returns(false);
      window.dispatchEvent(new Event('pagehide'));
      expect(beacon.calledTwice).to.be.true;
      expect(ajax.calledOnce).to.be.true;
      expect(JSON.parse(ajax.firstCall.args[2])[0]).to.deep.include({ e: 'won', pid: PID });
      clock.tick(10000);
      expect(ajax.calledOnce).to.be.true;
    } finally {
      delete document.visibilityState;
    }
  });

  it('sends only the ad units with an XE placement and splits a large auction by ad unit under 64 KB', function () {
    enable();
    init();
    const units = Array.from({ length: 40 }, (_, i) => `unit-with-a-long-name-${i}`);
    events.emit(EVENTS.BID_REQUESTED, {
      auctionId: AUCTION,
      bidderCode: 'xe',
      bids: [...units.map(unit => bidRequest('xe', { pid: PID }, unit)), bidRequest('xe', {}, 'not-ours')]
    });
    units.forEach(unit => {
      for (let i = 0; i < 20; i++) events.emit(EVENTS.BID_RESPONSE, bid(`bidder${i}`, 1, { adUnitCode: unit }));
    });
    events.emit(EVENTS.BID_RESPONSE, bid('appnexus', 1, { adUnitCode: 'not-ours' }));
    end();
    events.emit(EVENTS.BID_WON, bid('xe', 1.2, { adUnitCode: units[0] }));
    clock.tick(3000);

    expect(ajax.callCount).to.be.greaterThan(1);
    bodies().forEach(body => expect(new TextEncoder().encode(body).length).to.be.at.most(60000));
    const parts = sentOf('auction');
    expect(parts.length).to.be.greaterThan(1);
    expect(parts.every(part => part.id === AUCTION)).to.be.true;
    expect(parts.flatMap(part => part.units.map(u => u[0]))).to.eql(units);
    expect(parts.reduce((n, part) => n + part.bids.length, 0)).to.equal(800);
    expect(sentOf('won')).to.have.length(1);
  });

  it('stops listening and drops pending data on disableAnalytics, and can be enabled again', function () {
    enable();
    fullAuction();
    xeAnalytics.disableAnalytics();
    clock.tick(5000);
    window.dispatchEvent(new Event('pagehide'));
    expect(ajax.called).to.be.false;
    expect(beacon.called).to.be.false;

    enable();
    fullAuction();
    clock.tick(3000);
    expect(sentOf('auction')).to.have.length(1);
  });

  it('reports the sampling rate it was enabled with', function () {
    sinon.stub(Math, 'random').returns(0.1);
    try {
      enable({ sampling: 0.25 });
    } finally {
      Math.random.restore();
    }
    fullAuction();
    clock.tick(3000);
    expect(sentOf('auction')[0].smp).to.equal(0.25);
  });

  it('falls back to the user agent device type and keeps going after a bad event', function () {
    enable();
    events.emit(EVENTS.BID_TIMEOUT, {});
    init();
    request('xe', { pid: PID }, { ortb2: {}, gdprConsent: undefined, uspConsent: undefined, gppConsent: undefined });
    end();
    clock.tick(3000);
    const [auction] = sent();
    expect([2, 4, 5]).to.include(auction.dev);
    expect(auction).to.deep.include({ gdpr: 0, usp: 0, coppa: 0, schain: 0, gpp: [] });
    expect(auction.eids).to.eql(['id5-sync.com']);
  });
});
