import { assert, expect } from "chai";
import {
  createAuctionSpec,
  enrollGameraUnits,
  publisherHostname
} from "libraries/gameraBidder/auction.js";

import { spec } from 'modules/gameraBidAdapter.js';
import { config } from 'src/config.js';

import { normalizePrebidVideo, interpretGameraResponse } from 'libraries/gameraBidder/response.js';
const test = it;
const consent = () => ({
  gdprApplies: true,
  consentString: "fixture-grant",
  vendorData: { vendor: { consents: { 1447: true } } }
});
const bid = () => ({
  bidId: "bid",
  adUnitCode: "slot",
  mediaTypes: { banner: { sizes: [[300, 250]] } }
});
const request = () => ({
  bidderRequestId: "request",
  auctionId: "auction",
  timeout: 500,
  gdprConsent: consent(),
  refererInfo: { page: "https://news.publisher.test/story" }
});
function fixture(options = {}) {
  const config = { gameraEnabled: "custom", ...options.config };
  const errors = [];
  const spec = createAuctionSpec({
    ...options,
    getConfig: (key) => config[key],
    logError: (message) => errors.push(message)
  });
  return {
    spec,
    config,
    errors,
    build: (bids = [bid()], req = request()) => spec.buildRequests(bids, req)
  };
}
function response(req, session) {
  const body = JSON.parse(req.data);
  return {
    body: {
      bidder_request_id: body.bidder_request_id,
      ...(session ? { session } : {}),
      bids: body.bids.map((b) => ({
        bid_id: b.bid_id,
        cpm_micros: 2000000,
        currency: "USD",
        net_revenue: false,
        width: 300,
        height: 250,
        creative_id: "creative",
        ttl: 30,
        advertiser_domains: ["advertiser.test"],
        ad_url: "https://bidder.rapidedge.io/v1/prebid/render?cap=fixture"
      }))
    }
  };
}
test("standalone adapter requests bids without tracker, SDK, credentials, or fabricated observations", () => {
  const f = fixture();
  const req = f.build();
  const body = JSON.parse(req.data);
  assert.strictEqual(req.url, "https://bidder.rapidedge.io/v1/prebid/auction");
  assert.strictEqual(body.publisher_hostname, "news.publisher.test");
  assert.strictEqual(body.bids[0].gamera_placement_id, "prebid:slot");
  assert.strictEqual(body.bids[0].context_source, "prebid");
  assert.strictEqual(body.bids[0].context, undefined);
  assert.strictEqual(body.bids[0].placement_context, undefined);
  assert.strictEqual(body.session_id, undefined);
  assert.strictEqual(f.spec.interpretResponse(response(req), req)[0].requestId, "bid");
});
test("publisher modes and consent are both required, including unknown GDPR scope", () => {
  for (const mode of [undefined, true, false, "true", "ALL", ""]) {
    const f = fixture({ config: { gameraEnabled: mode } });
    assert.strictEqual(f.spec.isBidRequestValid(bid()), false);
    assert.deepEqual(f.build(), []);
  }
  for (const gdprConsent of [
    undefined,
    {},
    { ...consent(), consentString: "" },
    { ...consent(), vendorData: {} }
  ]) {
    assert.deepEqual(fixture().build([bid()], { ...request(), gdprConsent }), []);
  }
  assert.ok(fixture().build([bid()], { ...request(), gdprConsent: { gdprApplies: false } }).data);
});
test("all mode enrolls every unit without modifying publisher arrays or duplicating Gamera", () => {
  const units = [
    { code: "banner", bids: [{ bidder: "other" }] },
    { code: "video", mediaTypes: { video: {} }, bids: [] },
    { code: "native", mediaTypes: { native: {} }, bids: [] },
    { code: "existing", bids: [{ bidder: "gamera", params: { custom: 1 } }] }
  ];
  const before = JSON.stringify(units);
  const next = enrollGameraUnits(units, "all");
  assert.strictEqual(JSON.stringify(units), before);
  for (const unit of next) assert.strictEqual(unit.bids.filter((b) => b.bidder === "gamera").length, 1);
  assert.strictEqual(enrollGameraUnits(units, "custom"), units);
  assert.strictEqual(enrollGameraUnits(units, undefined), units);
});
test("explicit hostname takes priority and is locked despite later changes/removal", () => {
  const f = fixture({
    config: { gameraPublisher: "Publisher.Test" },
    getPublisherHostname: () => "metadata.test"
  });
  const first = f.build();
  assert.strictEqual(JSON.parse(first.data).publisher_hostname, "publisher.test");
  f.config.gameraPublisher = "another.test";
  assert.strictEqual(JSON.parse(f.build().data).publisher_hostname, "publisher.test");
  delete f.config.gameraPublisher;
  assert.strictEqual(JSON.parse(f.build().data).publisher_hostname, "publisher.test");
  assert.ok(f.errors.length >= 2);
  assert.strictEqual(f.spec.interpretResponse(response(first), first).length, 1);
});
test("invalid explicit account cannot fall back to metadata or page", () => {
  for (const value of [
    "",
    "https://publisher.test",
    "publisher.test/path",
    null,
    42,
    " publisher.test",
    "a..test"
  ]) {
    assert.deepEqual(
      fixture({
        config: { gameraPublisher: value },
        getPublisherHostname: () => "metadata.test"
      }).build(),
      []
    );
  }
  assert.strictEqual(publisherHostname("my.site.com"), "my.site.com");
  assert.strictEqual(
    JSON.parse(fixture({ getPublisherHostname: () => "metadata.test" }).build().data)
      .publisher_hostname,
    "metadata.test"
  );
});
test("current data bridge wins; RTD and identity-only existing RTD provide fallback without copying arbitrary data", () => {
  const now = 100000;
  const enriched = {
    schema_version: 1,
    observed_at_ms: now,
    gamera_placement_id: "from-rtd",
    context: { visible: true, engagement: 0.3, scroll_depth: 0.4 },
    secret: "private"
  };
  const b = {
    ...bid(),
    ortb2Imp: { ext: { data: { gameraBidder: enriched, gameraPlacementId: "existing-rtd" } } }
  };
  const read = (f) => JSON.parse(f.build([b]).data).bids[0];
  assert.strictEqual(read(fixture({ clock: () => now })).context_source, "rtd");
  assert.strictEqual(read(fixture({ clock: () => now })).gamera_placement_id, "from-rtd");
  assert.strictEqual(
    read(
      fixture({
        clock: () => now,
        getContext: () => ({ ...enriched, gamera_placement_id: "from-tracker" })
      })
    ).gamera_placement_id,
    "from-tracker"
  );
  assert.strictEqual(read(fixture({ clock: () => now + 40000 })).gamera_placement_id, "existing-rtd");
  assert.strictEqual(read(fixture({ clock: () => now + 40000 })).context, undefined);
  assert.ok(!JSON.stringify(read(fixture({ clock: () => now }))).includes("private"));
});
test("disable/re-enable and consent changes reject stale responses and reset sessions", () => {
  const f = fixture();
  const req = f.build();
  f.config.gameraEnabled = false;
  assert.deepEqual(f.spec.interpretResponse(response(req), req), []);
  f.config.gameraEnabled = "all";
  assert.deepEqual(f.spec.interpretResponse(response(req), req), []);
  const second = f.build();
  f.build([bid()], { ...request(), gdprConsent: undefined });
  assert.deepEqual(f.spec.interpretResponse(response(second), second), []);
});
test("session returned by server is reused for subsequent requests and optional telemetry", () => {
  const sessions = [];
  const f = fixture({ onSession: (...args) => sessions.push(args) });
  const req = f.build();
  const session = {
    session_id: "session",
    token: "token",
    ws_url: "wss://bidder.rapidedge.io/ws"
  };
  f.spec.interpretResponse(response(req, session), req);
  const body = JSON.parse(f.build().data);
  assert.strictEqual(body.session_id, "session");
  assert.strictEqual(body.session_token, "token");
  assert.strictEqual(sessions[0][1], "news.publisher.test");
});
test("independent factory instances never share publisher accounts or sessions", () => {
  const a = fixture({ config: { gameraPublisher: "a.test" } });
  const b = fixture({ config: { gameraPublisher: "b.test" } });
  const req = a.build();
  a.spec.interpretResponse(response(req, { session_id: "a", token: "token" }), req);
  assert.strictEqual(JSON.parse(b.build().data).publisher_hostname, "b.test");
  assert.strictEqual(JSON.parse(b.build().data).session_id, undefined);
});
test("all mode includes ad units without a bids array", () => {
  const unit = { code: "empty", mediaTypes: { banner: { sizes: [[300, 250]] } } };
  assert.deepEqual(enrollGameraUnits([unit], "all")[0].bids, [{ bidder: "gamera", params: {} }]);
  assert.strictEqual(unit.bids, undefined);
});
test("prior context is bounded and optional callback failure cannot discard a bid", () => {
  const f = fixture({
    clock: () => 1000,
    getContext: () => ({
      schema_version: 1,
      observed_at_ms: 1000,
      prior_context: { page_path: "/story", device_type: "mobile", secret: "drop" }
    }),
    onSession: () => {
      throw Error("telemetry unavailable");
    }
  });
  const req = f.build();
  assert.deepEqual(JSON.parse(req.data).prior_context, {
    page_path: "/story",
    device_type: "mobile"
  });
  assert.strictEqual(
    f.spec.interpretResponse(response(req, { session_id: "session", token: "token" }), req)
      .length,
    1
  );
});
test("concurrent initial responses cannot mix telemetry sessions", () => {
  const f = fixture();
  const first = f.build();
  const second = f.build();
  assert.strictEqual(
    f.spec.interpretResponse(response(first, { session_id: "first", token: "one" }), first)
      .length,
    1
  );
  assert.deepEqual(
    f.spec.interpretResponse(response(second, { session_id: "second", token: "two" }), second),
    []
  );
  assert.strictEqual(JSON.parse(f.build().data).session_id, "first");
});
test("expired session is cleared on an authenticated request error; account stays locked", () => {
  const f = fixture();
  const req = f.build();
  f.spec.interpretResponse(response(req, { session_id: "old", token: "expired" }), req);
  f.build();
  f.spec.onBidderError({ error: { status: 401 }, bidderRequest: { bidderRequestId: "request" } });
  const body = JSON.parse(f.build().data);
  assert.strictEqual(body.session_id, undefined);
  assert.strictEqual(body.publisher_hostname, "news.publisher.test");
});

test("bundled adapter follows explicit bids regardless of injected-adapter setting", () => {
  const f = fixture({ bundled: true, config: { gameraEnabled: undefined } });
  for (const mode of [undefined, false, "all", "custom"]) {
    f.config.gameraEnabled = mode;
    assert.ok(f.build().data);
  }
  const denied = request();
  denied.gdprConsent.vendorData.vendor.consents[1447] = false;
  assert.deepEqual(f.build([bid()], denied), []);
});

test("test demand requires an explicit boolean on each ad unit", () => {
  const f = fixture({ bundled: true });
  const candidates = [undefined, false, "true", true].map((value, index) => ({
    ...bid(), bidId: `bid-${index}`, params: { test: value }
  }));
  const sent = JSON.parse(f.build(candidates).data).bids;
  assert.deepEqual(sent.map(value => value.test), [undefined, undefined, undefined, true]);
});

describe('Gamera bundled adapter', function () {
  afterEach(function () { config.resetConfig(); });
  it('registers Gamera and supports banner and video', function () {
    expect(spec.code).to.equal('gamera');
    expect(spec.gvlid).to.equal(1447);
    expect(spec.supportedMediaTypes).to.deep.equal(['banner', 'video']);
  });
  it('requires neither the tracker nor gameraEnabled', function () {
    const bid = { bidId: 'banner', adUnitCode: 'slot', mediaTypes: { banner: { sizes: [[300, 250]] } } };
    const request = { bidderRequestId: 'request', auctionId: 'auction', gdprConsent: { gdprApplies: false }, refererInfo: { page: 'https://publisher.test/' } };
    expect(spec.isBidRequestValid(bid)).to.equal(true);
    const result = spec.buildRequests([bid], request);
    expect(result.url).to.equal('https://bidder.rapidedge.io/v1/prebid/auction');
    expect(JSON.parse(result.data).bids).to.have.length(1);
    config.setConfig({ gameraEnabled: false });
    expect(spec.buildRequests([bid], request).data).to.be.a('string');
    config.setConfig({ gameraPublisher: 'changed.test' });
    expect(JSON.parse(spec.buildRequests([bid], request).data).publisher_hostname).to.equal('publisher.test');
  });
});

describe('Gamera media and creative validation', function () {
  const video = () => ({ context: 'instream', playerSize: [[640, 360]], mimes: ['video/mp4'], protocols: [13], minduration: 1, maxduration: 30, linearity: 1 });
  const request = (media) => ({ url: 'https://bidder.rapidedge.io/v1/prebid/auction', data: JSON.stringify({ bidder_request_id: 'request', bids: [{ bid_id: 'bid', media_types: media }] }) });
  const banner = () => ({ bid_id: 'bid', cpm_micros: 2000000, currency: 'USD', net_revenue: false, width: 300, height: 250, creative_id: 'creative', ttl: 30, advertiser_domains: ['advertiser.test'], ad_url: 'https://bidder.rapidedge.io/v1/prebid/render?cap=a&x="<tag>"' });
  const response = (bids) => ({ body: { bidder_request_id: 'request', bids } });
  it('normalizes instream video and rejects unsupported players and protocols', function () {
    expect(normalizePrebidVideo(video()).player_size).to.deep.equal([640, 360]);
    expect(normalizePrebidVideo({ ...video(), playerSize: [640, 360] }).protocols).to.deep.equal([13]);
    for (const change of [{ context: 'outstream' }, { playerSize: [0, 360] }, { mimes: [] }, { protocols: [7] }, { maxduration: 301 }, { linearity: 2 }]) {
      expect(normalizePrebidVideo({ ...video(), ...change })).to.equal(undefined);
    }
  });
  it('maps banner prices, escapes creative URLs and rejects invalid or repeated bids', function () {
    const req = request({ banner: { sizes: [[300, 250]] } });
    const bids = interpretGameraResponse(response([banner(), banner()]), req);
    expect(bids).to.have.length(1);
    expect(bids[0].cpm).to.equal(2);
    expect(bids[0].ad).to.include('&amp;x=&quot;&lt;tag&gt;&quot;');
    for (const change of [{ bid_id: 'unknown' }, { width: 728 }, { currency: 'EUR' }, { net_revenue: true }, { ttl: 31 }, { cpm_micros: NaN }, { ad_url: 'https://evil.test/v1/prebid/render' }, { ad_url: 'invalid' }, { ad_url: null }, { media_type: 'native' }]) {
      expect(interpretGameraResponse(response([{ ...banner(), ...change }]), req)).to.deep.equal([]);
    }
    expect(interpretGameraResponse(response([banner()]), { ...req, data: 'broken' })).to.deep.equal([]);
    expect(interpretGameraResponse({ body: null }, req)).to.deep.equal([]);
  });
  it('returns VAST only for supported, requested video with a matching duration and URL', function () {
    const req = request({ video: normalizePrebidVideo(video()) });
    const bid = { ...banner(), media_type: 'video', vast_url: 'https://bidder.rapidedge.io/v1/prebid/vast?cap=test', protocol: 13, duration_seconds: 4, width: 640, height: 360 };
    const result = interpretGameraResponse(response([bid]), req)[0];
    expect(result.mediaType).to.equal('video');
    expect(result.vastUrl).to.equal(bid.vast_url);
    expect(result.ad).to.equal(undefined);
    for (const change of [{ protocol: 7 }, { duration_seconds: 31 }, { vast_url: 'https://bidder.rapidedge.io/v1/prebid/render' }]) {
      expect(interpretGameraResponse(response([{ ...bid, ...change }]), req)).to.deep.equal([]);
    }
  });
  it('runs bundled response and consent callbacks without an optional tracker', function () {
    const bid = { bidId: 'bid', adUnitCode: 'slot', mediaTypes: { banner: { sizes: [[300, 250]] } } };
    const req = spec.buildRequests([bid], { bidderRequestId: 'request', auctionId: 'auction', gdprConsent: { gdprApplies: false }, refererInfo: { page: 'https://publisher.test/' } });
    expect(spec.interpretResponse({ body: { ...response([banner()]).body, session: { session_id: 'session', token: 'token' } } }, req)).to.have.length(1);
    expect(spec.buildRequests([bid], { gdprConsent: { gdprApplies: true } })).to.deep.equal([]);
  });
});
