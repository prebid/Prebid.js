import {
  __testing__,
  getTargetingFromRuntime,
  init,
  loadRuntimeScript,
  mileRtdSubmodule,
  onAuctionInitEvent,
  onBidResponseEvent,
  setSlotTargeting,
} from "modules/mileRtdProvider.js";
import { loadExternalScriptStub } from "test/mocks/adloaderStub.js";

describe("mile RTD provider", function () {
  let sandbox;

  function flushPromises() {
    return new Promise((resolve) => setTimeout(resolve, 0));
  }

  function createMockSlot({ elementId, adUnitPath } = {}) {
    return {
      getSlotElementId: sandbox.stub().returns(elementId),
      getAdUnitPath: sandbox.stub().returns(adUnitPath),
      setTargeting: sandbox.spy(),
    };
  }

  beforeEach(function () {
    sandbox = sinon.createSandbox();
    __testing__.setModuleParams({});
    delete window.mileRtdRuntime;
    delete window.customRuntimeGlobal;
    delete window.mileRtdRuntimeUtils;
    delete window.googletag;
  });

  afterEach(function () {
    sandbox.restore();
    __testing__.setModuleParams({});
    delete window.mileRtdRuntime;
    delete window.customRuntimeGlobal;
    delete window.mileRtdRuntimeUtils;
    delete window.googletag;
  });

  describe("mileRtdSubmodule", function () {
    it("registers with expected name", function () {
      expect(mileRtdSubmodule.name).to.equal("mile");
    });
  });

  describe("init / runtime loading", function () {
    it("returns true and does not load script when runtimeScriptUrl is missing", function () {
      expect(init({ params: {} })).to.equal(true);
      expect(loadExternalScriptStub.called).to.equal(false);
    });

    it("loads runtime script only once when loadRuntimeScript is called repeatedly", async function () {
      __testing__.setModuleParams({
        runtimeScriptUrl: "https://cdn.example.com/mile-runtime.js",
      });

      await Promise.all([loadRuntimeScript(), loadRuntimeScript()]);
      expect(loadExternalScriptStub.calledOnce).to.equal(true);
      expect(loadExternalScriptStub.firstCall.args[0]).to.equal(
        "https://cdn.example.com/mile-runtime.js",
      );
    });

    it("init loads runtime script when runtimeScriptUrl is provided", function () {
      init({
        params: {
          runtimeScriptUrl: "https://cdn.example.com/mile-runtime.js",
        },
      });

      expect(loadExternalScriptStub.calledOnce).to.equal(true);
      expect(loadExternalScriptStub.firstCall.args[0]).to.equal(
        "https://cdn.example.com/mile-runtime.js",
      );
    });
  });

  describe("getTargetingFromRuntime", function () {
    it("resolves null when runtime global is missing", async function () {
      const result = await getTargetingFromRuntime({ adUnitCodes: ["ad-1"] });
      expect(result).to.equal(null);
    });

    it("uses default runtime global when available", async function () {
      const runtimeResult = { "div-gpt-ad-1": "segment_a" };
      const runtimeStub = sandbox.stub().returns(runtimeResult);
      window.mileRtdRuntime = {
        getMileTargetingByAdUnit: runtimeStub,
      };

      const snapshot = { adUnitCodes: ["ad-1"] };
      const context = { mode: "auctionInit" };
      const result = await getTargetingFromRuntime(snapshot, context);

      expect(result).to.deep.equal(runtimeResult);
      expect(runtimeStub.calledOnceWith(snapshot, context)).to.equal(true);
    });

    it("uses custom runtime global name when configured", async function () {
      __testing__.setModuleParams({ runtimeGlobalName: "customRuntimeGlobal" });
      const runtimeResult = { "div-gpt-ad-2": "segment_b" };
      window.customRuntimeGlobal = {
        getMileTargetingByAdUnit: sandbox.stub().returns(runtimeResult),
      };

      const result = await getTargetingFromRuntime({ adUnitCodes: ["ad-2"] });
      expect(result).to.deep.equal(runtimeResult);
    });

    it("resolves null when runtime function throws", async function () {
      window.mileRtdRuntime = {
        getMileTargetingByAdUnit: sandbox
          .stub()
          .throws(new Error("runtime failed")),
      };

      const result = await getTargetingFromRuntime({ adUnitCodes: ["ad-1"] });
      expect(result).to.equal(null);
    });
  });

  describe("setSlotTargeting", function () {
    it("returns false when GPT is unavailable", function () {
      const result = setSlotTargeting({ "div-gpt-ad-1": "value-1" }, null);
      expect(result).to.equal(false);
    });

    it("sets mile_rtd targeting by slot element id and ad unit path", function () {
      const slotWithElementId = createMockSlot({
        elementId: "div-gpt-ad-1",
        adUnitPath: "/123/home/top",
      });
      const slotWithPathFallback = createMockSlot({
        elementId: "unknown-slot",
        adUnitPath: "/123/home/path-only",
      });
      const slotWithoutMatch = createMockSlot({
        elementId: "unknown-2",
        adUnitPath: "/123/home/no-match",
      });

      const googletag = {
        cmd: {
          push: (fn) => fn(),
        },
        pubads: sandbox.stub().returns({
          getSlots: sandbox
            .stub()
            .returns([
              slotWithElementId,
              slotWithPathFallback,
              slotWithoutMatch,
            ]),
        }),
      };

      const result = setSlotTargeting(
        {
          "div-gpt-ad-1": "segment_a",
          "/123/home/path-only": "segment_b",
        },
        googletag,
      );

      expect(result).to.equal(true);
      expect(
        slotWithElementId.setTargeting.calledOnceWith("mile_rtd", "segment_a"),
      ).to.equal(true);
      expect(
        slotWithPathFallback.setTargeting.calledOnceWith(
          "mile_rtd",
          "segment_b",
        ),
      ).to.equal(true);
      expect(slotWithoutMatch.setTargeting.called).to.equal(false);
    });
  });

  describe("onAuctionInitEvent", function () {
    it("applies runtime targeting even when flooring is not enforced", async function () {
      const runtimeStub = sandbox
        .stub()
        .returns({ "div-gpt-ad-1": "segment_a" });
      window.mileRtdRuntime = { getMileTargetingByAdUnit: runtimeStub };

      onAuctionInitEvent({
        adUnitCodes: ["ad-1"],
        bidderRequests: [
          { bids: [{ floorData: { enforcements: { enforceJS: false } } }] },
        ],
      });
      await flushPromises();

      expect(runtimeStub.called).to.equal(true);
    });

    it("extracts snapshot and applies targeting when flooring is enforced", async function () {
      const runtimeStub = sandbox
        .stub()
        .returns({ "div-gpt-ad-1": "segment_a" });
      const slot = createMockSlot({
        elementId: "div-gpt-ad-1",
        adUnitPath: "/123/home/top",
      });
      window.mileRtdRuntime = { getMileTargetingByAdUnit: runtimeStub };
      window.mileRtdRuntimeUtils = {
        extractAuctionSnapshot: sandbox
          .stub()
          .returns({ adUnitCodes: ["ad-1"] }),
      };
      window.googletag = {
        cmd: { push: (fn) => fn() },
        pubads: sandbox
          .stub()
          .returns({ getSlots: sandbox.stub().returns([slot]) }),
      };

      onAuctionInitEvent({
        adUnitCodes: ["ad-1"],
        bidderRequests: [
          { bids: [{ floorData: { enforcements: { enforceJS: true } } }] },
        ],
      });
      await flushPromises();

      expect(
        window.mileRtdRuntimeUtils.extractAuctionSnapshot.calledOnce,
      ).to.equal(true);
      expect(runtimeStub.calledOnce).to.equal(true);
      expect(runtimeStub.firstCall.args[1]).to.deep.equal({
        mode: "auctionInit",
      });
      expect(
        slot.setTargeting.calledOnceWith("mile_rtd", "segment_a"),
      ).to.equal(true);
    });
  });

  describe("onBidResponseEvent", function () {
    it("does nothing when bidResponse lacks adUnitCode", async function () {
      const runtimeStub = sandbox.stub().returns({});
      window.mileRtdRuntime = { getMileTargetingByAdUnit: runtimeStub };

      onBidResponseEvent(
        {},
        {},
        {},
        {
          adUnitCodes: ["ad-1"],
          bidderRequests: [
            { bids: [{ floorData: { enforcements: { enforceJS: true } } }] },
          ],
        },
      );
      await flushPromises();

      expect(runtimeStub.called).to.equal(false);
    });

    it("applies runtime targeting even when flooring is not enforced", async function () {
      const runtimeStub = sandbox.stub().returns({});
      window.mileRtdRuntime = { getMileTargetingByAdUnit: runtimeStub };

      onBidResponseEvent(
        { adUnitCode: "ad-1" },
        {},
        {},
        {
          adUnitCodes: ["ad-1"],
          bidderRequests: [
            { bids: [{ floorData: { enforcements: { enforceJS: false } } }] },
          ],
        },
      );
      await flushPromises();

      expect(runtimeStub.called).to.equal(true);
    });

    it("adds adUnitCode to snapshot and calls runtime with bidResponse context", async function () {
      const runtimeStub = sandbox.stub().returns({});
      window.mileRtdRuntime = { getMileTargetingByAdUnit: runtimeStub };
      window.mileRtdRuntimeUtils = {
        extractAuctionSnapshot: sandbox
          .stub()
          .returns({ adUnitCodes: ["ad-1"] }),
      };

      const bidResponse = { adUnitCode: "ad-2", requestId: "request-1" };
      onBidResponseEvent(
        bidResponse,
        {},
        {},
        {
          adUnitCodes: ["ad-1"],
          bidderRequests: [
            { bids: [{ floorData: { enforcements: { enforceJS: true } } }] },
          ],
        },
      );
      await flushPromises();

      expect(runtimeStub.calledOnce).to.equal(true);
      const [snapshot, context] = runtimeStub.firstCall.args;
      expect(snapshot.adUnitCodes).to.deep.equal(["ad-1", "ad-2"]);
      expect(context.mode).to.equal("bidResponse");
      expect(context.bidResponse).to.equal(bidResponse);
    });
  });
});
