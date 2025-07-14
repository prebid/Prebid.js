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

    adapterManager.enableAnalytics({ provider: "datawrkzanalytics" });
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

    sinon.assert.calledOnce(fetchStub);

    const [url, options] = fetchStub.firstCall.args;
    expect(url).to.equal("http://18.142.162.26/analytics");
    expect(options.method).to.equal("POST");
    expect(options.headers["Content-Type"]).to.equal("application/json");

    const body = JSON.parse(options.body);
    expect(body.auctionId).to.equal(auctionId);
    expect(body.site).to.equal(window.location.hostname || "unknown");
    expect(body.adunits).to.be.an("array");
    expect(body.adunits[0].code).to.equal(adUnitCode);
    expect(body.adunits[0].bids[0].bidder).to.equal(bidder);
  });
});
