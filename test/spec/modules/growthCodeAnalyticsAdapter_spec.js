import adapterManager from '../../../src/adapterManager.js';
import growthCodeAnalyticsAdapter, { storage } from '../../../modules/growthCodeAnalyticsAdapter.js';
import { expect } from 'chai';
import * as events from '../../../src/events.js';
import { EVENTS } from '../../../src/constants.js';
import { generateUUID } from '../../../src/utils.js';
import { server } from '../../mocks/xhr.js';

// Matches the adapter's default ENDPOINT_URL (no options.url override is used in these tests).
const ENDPOINT_HOST = 'analytics.gcprivacy.com';

describe('growthCode analytics adapter', () => {
  let requestCountBefore;

  beforeEach(() => {
    requestCountBefore = server.requests.length;
    sinon.stub(events, 'getEvents').returns([]);
    storage.setDataInLocalStorage('gcid', 'test-gcid-123');
    growthCodeAnalyticsAdapter.enableAnalytics({
      provider: 'growthCodeAnalytics',
      options: { pid: 'TEST01' }
    });
  });

  afterEach(() => {
    ['gcid', 'gcABbucket', 'gc_bucket', 'gc_test', 'gc_h1', 'gc_h3', 'gc_hs'].forEach(k => storage.removeDataFromLocalStorage(k));
    storage.setCookie('gc_session_id', '', 'Thu, 01 Jan 1970 00:00:01 GMT');
    growthCodeAnalyticsAdapter.disableAnalytics();
    events.getEvents.restore();
  });

  function bidWon(overrides = {}) {
    events.emit(EVENTS.BID_WON, Object.assign({
      auctionId: generateUUID(),
      bidderCode: 'appnexus',
      cpm: 1.0,
      currency: 'USD',
      adUnitCode: 'div-1',
      adId: generateUUID(),
      meta: {}
    }, overrides));
  }

  // Requests made by *this* test only, scoped to the growthCode analytics endpoint.
  // server.requests is a single array shared across the whole karma run (populated via
  // the global dep.fetch mock in test/mocks/xhr.js), so we diff against the count
  // captured in beforeEach rather than asserting on the raw array.
  function ownRequests() {
    return server.requests.slice(requestCountBefore).filter(r => r.url.indexOf(ENDPOINT_HOST) > -1);
  }

  function lastBody() {
    const reqs = ownRequests();
    return JSON.parse(reqs[reqs.length - 1].requestBody);
  }

  it('registers itself with the adapter manager', () => {
    const adapter = adapterManager.getAnalyticsAdapter('growthCodeAnalytics');
    expect(adapter).to.exist;
    expect(adapter.adapter).to.equal(growthCodeAnalyticsAdapter);
  });

  it('tolerates undefined or empty config', () => {
    growthCodeAnalyticsAdapter.enableAnalytics(undefined);
    growthCodeAnalyticsAdapter.enableAnalytics({});
  });

  it('sends bid won events with the correct AnalyticsPayload structure', () => {
    const bid = {
      auctionId: generateUUID(),
      bidderCode: 'appnexus',
      currency: 'USD',
      cpm: 1.50,
      adUnitCode: 'div-gpt-ad-1',
      adId: 'abc123',
      responseTimestamp: 1700000000000,
      userIdAsEids: [{ source: 'growthcode.io', uids: [{ id: 'gc-uid-1' }] }],
      meta: { advertiserDomains: ['example.com'] }
    };
    bidWon(bid);

    expect(ownRequests().length).to.be.greaterThan(0);
    const req = ownRequests().pop();
    const body = JSON.parse(req.requestBody);

    expect(req.url).to.include('gcid=test-gcid-123');
    expect(req.url).to.include('pid=TEST01');

    expect(body.analytics_source).to.equal('prebid_module');
    expect(body.gc_session_id).to.be.a('string');
    expect(body.gc_event_id).to.be.a('string');
    expect(body.ssp_count).to.equal(1);
    expect(body.eids).to.deep.equal(['growthcode.io']);
    expect(body.live_intent).to.equal(false);

    expect(body.events).to.have.length(1);
    const e = body.events[0];
    expect(e.event).to.equal('winningBid');
    expect(e.bidder).to.equal('appnexus');
    expect(e.currency).to.equal('USD');
    expect(e.cpm).to.equal(1.50);
    expect(e.auction_id).to.equal(bid.auctionId);
    expect(e.ad_unit_code).to.equal('div-gpt-ad-1');
    expect(e.ad_id).to.equal('abc123');
    expect(e.advertiser_domains).to.deep.equal(['example.com']);
    expect(e.timestamp).to.equal(bid.responseTimestamp);
    expect(e).to.not.have.property('_eids');
    expect(e).to.not.have.property('time_stamp');
  });

  it('fires bid won even when trackEvents is not configured', () => {
    bidWon();
    expect(ownRequests().length).to.equal(1);
  });

  it('sets live_intent true when liveintent.com is in eids', () => {
    bidWon({ userIdAsEids: [{ source: 'liveintent.com' }, { source: 'growthcode.io' }] });
    const body = lastBody();
    expect(body.live_intent).to.equal(true);
    expect(body.ssp_count).to.equal(2);
  });

  it('sets have_hem true when HEM keys are in localStorage', () => {
    storage.setDataInLocalStorage('gc_h1', 'md5hash');
    storage.setDataInLocalStorage('gc_h3', 'sha256hash');
    bidWon({ bidderCode: 'rubicon', cpm: 2.0 });
    expect(lastBody().have_hem).to.equal(true);
  });

  it('resolves bucket_id: prefers gc_bucket, falls back to legacy gcABbucket', () => {
    storage.setDataInLocalStorage('gcABbucket', 'legacy-bucket');
    bidWon();
    expect(lastBody().bucket_id).to.equal('legacy-bucket');

    storage.setDataInLocalStorage('gc_bucket', 'S_active');
    bidWon();
    expect(lastBody().bucket_id).to.equal('S_active');
  });

  it('resolves gctest from the gc_test localStorage key, defaulting to false', () => {
    bidWon();
    expect(lastBody().gctest).to.equal(false);

    storage.setDataInLocalStorage('gc_test', 'true');
    bidWon();
    expect(lastBody().gctest).to.equal(true);
  });

  it('resolves gc_session_id from the sync pixel cookie, falling back to a generated id', () => {
    bidWon();
    expect(lastBody().gc_session_id).to.be.a('string').with.length.greaterThan(0);

    storage.setCookie('gc_session_id', 'pixel-session-abc');
    bidWon();
    expect(lastBody().gc_session_id).to.equal('pixel-session-abc');
  });

  it('does not send a request when gcid is missing', () => {
    storage.removeDataFromLocalStorage('gcid');
    bidWon();
    expect(ownRequests().length).to.equal(0);
  });

  it('also sends legacy batch when bidWon is included in trackEvents config', () => {
    growthCodeAnalyticsAdapter.disableAnalytics();
    growthCodeAnalyticsAdapter.enableAnalytics({
      provider: 'growthCodeAnalytics',
      options: { pid: 'TEST01', trackEvents: ['bidWon'] }
    });
    bidWon();

    // enriched call (logBidWonToServer) + legacy batch call (logToServer)
    const reqs = ownRequests();
    expect(reqs.length).to.equal(2);
    const legacyCall = reqs.find(r => !r.url.includes('?gcid='));
    expect(legacyCall).to.exist;
    expect(JSON.parse(legacyCall.requestBody).events).to.be.an('array').with.lengthOf(1);
  });

  it('does not send requests for non-bidWon events when trackEvents is empty', () => {
    events.emit(EVENTS.AUCTION_END, { auctionId: generateUUID() });
    events.emit(EVENTS.BID_RESPONSE, { bidderCode: 'appnexus', cpm: 1.0 });
    events.emit(EVENTS.AUCTION_INIT, { auctionId: generateUUID() });
    expect(ownRequests().length).to.equal(0);
  });

  it('handles missing meta.advertiserDomains gracefully', () => {
    bidWon({ meta: null });
    expect(lastBody().events[0].advertiser_domains).to.deep.equal([]);
  });
});
