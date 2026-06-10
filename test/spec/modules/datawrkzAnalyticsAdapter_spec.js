import analyticsAdapter from "modules/datawrkzAnalyticsAdapter.js";
import adapterManager from "src/adapterManager.js";
import { EVENTS } from "src/constants.js";

const {
  AUCTION_INIT,
  BID_REQUESTED,
  BID_RESPONSE,
  BID_TIMEOUT,
  BID_WON,
  AUCTION_END,
  AD_RENDER_SUCCEEDED,
  AD_RENDER_FAILED
} = EVENTS;

describe("DatawrkzAnalyticsAdapter", function () {
  let sandbox;
  let fetchStub;

  const auctionId = "auction_123";
  const adUnitCode = "div-gpt-ad-001";
  const bidder = "appnexus";

  beforeEach(function () {
    sandbox = sinon.createSandbox();
    fetchStub = sandbox.stub(window, "fetch");

    adapterManager.enableAnalytics({
      provider: "datawrkzanalytics",
      options: {
        publisherId: "testPublisher",
        apiKey: "testApiKey"
      }
    });
  });

  afterEach(function () {
    sandbox.restore();
    analyticsAdapter.disableAnalytics();
  });

  it("should track AUCTION_INIT", function () {
    analyticsAdapter.track({ eventType: AUCTION_INIT, args: { auctionId } });
  });

  it("should track BID_REQUESTED", function () {
    analyticsAdapter.track({ eventType: AUCTION_INIT, args: { auctionId } });

    analyticsAdapter.track({
      eventType: BID_REQUESTED,
      args: { auctionId, bids: [{ adUnitCode, bidder }] },
    });
  });

  it("should track BID_RESPONSE", function () {
    analyticsAdapter.track({ eventType: AUCTION_INIT, args: { auctionId } });

    analyticsAdapter.track({
      eventType: BID_REQUESTED,
      args: { auctionId, bids: [{ adUnitCode, bidder }] },
    });

    analyticsAdapter.track({
      eventType: BID_RESPONSE,
      args: {
        auctionId,
        adUnitCode,
        bidder,
        cpm: 1.2,
        currency: "USD",
        timeToRespond: 120,
      },
    });
  });

  it("should track BID_TIMEOUT", function () {
    analyticsAdapter.track({ eventType: AUCTION_INIT, args: { auctionId } });

    analyticsAdapter.track({
      eventType: BID_REQUESTED,
      args: { auctionId, bids: [{ adUnitCode, bidder }] },
    });

    analyticsAdapter.track({
      eventType: BID_TIMEOUT,
      args: { auctionId, adUnitCode, bidder },
    });
  });

  it("should track BID_WON", function () {
    analyticsAdapter.track({ eventType: AUCTION_INIT, args: { auctionId } });

    analyticsAdapter.track({
      eventType: BID_REQUESTED,
      args: { auctionId, bids: [{ adUnitCode, bidder }] },
    });

    analyticsAdapter.track({
      eventType: BID_WON,
      args: { auctionId, adUnitCode, bidder, cpm: 2.5 },
    });
  });

  it("should send data on AUCTION_END", function () {
    const clock = sinon.useFakeTimers();

    analyticsAdapter.track({ eventType: AUCTION_INIT, args: { auctionId } });
    analyticsAdapter.track({
      eventType: BID_REQUESTED,
      args: { auctionId, bids: [{ adUnitCode, bidder }] },
    });
    analyticsAdapter.track({
      eventType: BID_RESPONSE,
      args: {
        auctionId,
        adUnitCode,
        bidder,
        cpm: 1.5,
        currency: "USD",
        timeToRespond: 300,
      },
    });
    analyticsAdapter.track({ eventType: AUCTION_END, args: { auctionId } });

    clock.tick(2000); // Fast-forward time by 2 seconds

    sinon.assert.calledOnce(fetchStub);

    const [url, options] = fetchStub.firstCall.args;
    expect(url).to.equal("https://prebid-api.highr.ai/analytics");
    expect(options.method).to.equal("POST");
    expect(options.headers["Content-Type"]).to.equal("application/json");

    const body = JSON.parse(options.body);
    expect(body.publisherId).to.equal("testPublisher");
    expect(body.apiKey).to.equal("testApiKey");
    expect(body.auctionId).to.equal(auctionId);
    expect(body.adunits[0].code).to.equal(adUnitCode);
    expect(body.adunits[0].bids[0].bidder).to.equal(bidder);

    clock.restore();
  });

  it("should send AD_RENDER_SUCCEEDED event", function () {
    analyticsAdapter.track({
      eventType: AD_RENDER_SUCCEEDED,
      args: {
        bid: { adId: "ad123", bidderCode: bidder, cpm: 2.0 },
        adId: "ad123",
        doc: "<html></html>"
      }
    });

    sinon.assert.calledOnce(fetchStub);
    const [url, options] = fetchStub.firstCall.args;
    const payload = JSON.parse(options.body);

    expect(payload.eventType).to.equal(AD_RENDER_SUCCEEDED);
    expect(payload.publisherId).to.equal("testPublisher");
    expect(payload.apiKey).to.equal("testApiKey");
    expect(payload.bidderCode).to.equal("appnexus");
    expect(payload.successDoc).to.be.a("string");
    expect(payload.failureReason).to.be.null;
    expect(payload.failureMessage).to.be.null;
  });

  it("should send AD_RENDER_FAILED event", function () {
    analyticsAdapter.track({
      eventType: AD_RENDER_FAILED,
      args: {
        bid: { adId: "ad124", bidderCode: bidder, cpm: 1.5 },
        adId: "ad124",
        reason: "network",
        message: "Render failed due to network error"
      }
    });

    sinon.assert.calledOnce(fetchStub);
    const [url, options] = fetchStub.firstCall.args;
    const payload = JSON.parse(options.body);

    expect(payload.eventType).to.equal(AD_RENDER_FAILED);
    expect(payload.publisherId).to.equal("testPublisher");
    expect(payload.apiKey).to.equal("testApiKey");
    expect(payload.bidderCode).to.equal("appnexus");
    expect(payload.successDoc).to.be.null;
    expect(payload.failureReason).to.equal("network");
    expect(payload.failureMessage).to.equal("Render failed due to network error");
  });
});
