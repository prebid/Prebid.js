import {
  subModuleObj,
  storage,
  _resetStateForTesting,
  releaseWaitingAuction,
} from "modules/stackupRtdProvider.js";
import { getHook } from "src/hook.js";
import {
  getAuctionEnrichment,
  auctionEnrichmentCount,
} from "libraries/stackupUtils/enrichment.js";
import { server } from "test/mocks/xhr.js";
import {
  guardOrtb2Fragments,
  ortb2FragmentsGuardFactory,
  ortb2GuardFactory,
} from "libraries/objectGuard/ortbGuard.js";
import * as utils from "src/utils.js";
import { config } from "src/config.js";
import { gdprDataHandler } from "src/consentHandler.js";
import * as refererDetection from "src/refererDetection.js";

// ─── fixtures ───────────────────────────────────────────────────────────────

const MOCK_API_URL = "https://mock.stackup.test/v1/enrich";

// rtdModule's 5th getBidRequestData argument: the auctionDelay core waits for
// providers configured with waitForIt.
const AUCTION_DELAY = 1000;

const VALID_CONFIG = {
  name: "stackupRtd",
  waitForIt: true,
  params: {
    pubId: "test-pub-123",
    apiUrl: MOCK_API_URL,
    articleId: "test-article-001",
    articleIdMode: "explicit",
    timeout: 200,
  },
};

// Minimal valid API response matching RawEnrichmentResponse schema
const VALID_API_RESPONSE = {
  site: {
    content: {
      id: "test-article-001",
      title: "Test Article Title",
      data: [
        {
          name: "data.stackup-ai.com",
          ext: {
            segtax: 502,
            stackup: {
              taxonomy_version: "1.0",
              dimension: "content",
              source_tier: "enrichment",
            },
          },
          segment: [
            { id: "113", name: "Security", ext: { confidence: 0.95 } },
            { id: "79", name: "Mobile Devices", ext: { confidence: 0.9 } },
          ],
        },
      ],
      ext: {
        brand_safety: { garm_risk_level: "floor", categories: [] },
        emotion: {
          tone: "informative",
          mood: "Inform Me",
          intensity: "moderate",
        },
      },
    },
  },
  user: {
    data: [
      {
        name: "data.stackup-ai.com",
        ext: { segtax: 501 },
        segment: [{ id: "1", name: "25-34", ext: { confidence: 0.85 } }],
      },
    ],
  },
};

const DUAL_TAXONOMY_API_RESPONSE = {
  site: {
    cattax: 2,
    pagecat: ["IAB19-6"],
    content: {
      title: "Dual Taxonomy Article",
      data: [
        {
          name: "data.stackup-ai.com",
          ext: { segtax: 6 },
          segment: [{ id: "324" }, { id: "328" }],
        },
        {
          name: "data.stackup-ai.com",
          ext: { segtax: 9 },
          segment: [{ id: "602" }, { id: "607" }],
        },
        {
          name: "data.stackup-ai.com",
          segment: [{ id: "stackup:content:smartwatches" }],
        },
      ],
      ext: {
        stackup: {
          content_suitability: {
            framework: "garm",
            floor_violation: 0,
            risk: "low",
          },
        },
      },
    },
  },
  user: {
    data: [
      {
        name: "data.stackup-ai.com",
        ext: { segtax: 4 },
        segment: [{ id: "aud-1" }, { id: "aud-2" }],
      },
      {
        name: "data.stackup-ai.com",
        ext: { segtax: 501 },
        segment: [{ id: "stackup:interests:technology" }],
      },
      {
        name: "data.stackup-ai.com",
        segment: [{ id: "stackup:purchase_intent:smartwatch_researchers" }],
      },
    ],
  },
};

function respond200(body) {
  // Always respond to the most recently made request, not the first one.
  // This matters when a test resets state mid-run and makes a second XHR after
  // the beforeEach already consumed requests[0].
  server.requests[server.requests.length - 1].respond(
    200,
    { "Content-Type": "application/json" },
    JSON.stringify(body)
  );
}

// Drain the native Promise microtask queue deeply enough for the full
// fetchEnrichment settlement chain to complete.
//
// The rejection path has two hops:
//   hop 1 – fetchPromise .then() propagates the rejection
//   hop 2 – .catch() fires, updates state, drains pendingCallbacks
// Three awaits cover both success (1 hop) and error (2 hops) with a spare.
async function flushMicrotasks() {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

// ─── suite ──────────────────────────────────────────────────────────────────

describe("StackUp RTD Provider", function () {
  let storageGetStub;
  let storageSetStub;

  beforeEach(function () {
    server.reset();
    _resetStateForTesting();
    // no consent module unless a test enables one
    gdprDataHandler.reset();
    storageGetStub = sinon
      .stub(storage, "getDataFromSessionStorage")
      .returns(null); // cache miss by default
    storageSetStub = sinon.stub(storage, "setDataInSessionStorage");
  });

  afterEach(function () {
    storageGetStub.restore();
    storageSetStub.restore();
    gdprDataHandler.reset();
  });

  // ── 1. module structure ──────────────────────────────────────────────────

  describe("subModuleObj structure", function () {
    it("should have name 'stackupRtd'", function () {
      expect(subModuleObj.name).to.equal("stackupRtd");
    });

    it("should expose an init function", function () {
      expect(subModuleObj.init).to.be.a("function");
    });

    it("should expose a getBidRequestData function", function () {
      expect(subModuleObj.getBidRequestData).to.be.a("function");
    });
  });

  // ── 2. init – params validation ──────────────────────────────────────────

  describe("init – params validation", function () {
    it("should return false and not fetch when config is undefined", function () {
      expect(subModuleObj.init(undefined, {})).to.equal(false);
      expect(server.requests.length).to.equal(0);
    });

    it("should return false and not fetch when params is missing", function () {
      expect(subModuleObj.init({ name: "stackupRtd" }, {})).to.equal(false);
      expect(server.requests.length).to.equal(0);
    });

    it("should return false and not fetch when pubId is missing", function () {
      expect(
        subModuleObj.init(
          { name: "stackupRtd", params: { apiUrl: MOCK_API_URL } },
          {}
        )
      ).to.equal(false);
      expect(server.requests.length).to.equal(0);
    });

    it("should return false and not fetch when articleId cannot be resolved", function () {
      // articleIdMode:explicit with no articleId → resolveArticleId returns null → no fetch
      expect(
        subModuleObj.init(
          {
            name: "stackupRtd",
            params: {
              pubId: "test-pub",
              apiUrl: MOCK_API_URL,
              articleIdMode: "explicit",
            },
          },
          {}
        )
      ).to.equal(false);
      expect(server.requests.length).to.equal(0);
    });

    it("should return true and kick off a fetch with a valid config", function () {
      expect(subModuleObj.init(VALID_CONFIG, {})).to.equal(true);
      expect(server.requests.length).to.equal(1);
    });
  });

  // ── 3. init – request URL construction ───────────────────────────────────

  describe("init – request URL construction", function () {
    it("should include pubId in the request URL", function () {
      subModuleObj.init(VALID_CONFIG, {});
      expect(server.requests[0].url).to.include("pubId=test-pub-123");
    });

    it("should include articleId URL-encoded in the request URL", function () {
      subModuleObj.init(VALID_CONFIG, {});
      expect(server.requests[0].url).to.include("articleId=test-article-001");
    });

    it("should URL-encode special characters in articleId", function () {
      const config = {
        ...VALID_CONFIG,
        params: {
          ...VALID_CONFIG.params,
          articleId: "article/with spaces",
        },
      };
      subModuleObj.init(config, {});
      expect(server.requests[0].url).to.include(
        "articleId=article%2Fwith%20spaces"
      );
    });

    it("should use the custom apiUrl from params", function () {
      subModuleObj.init(VALID_CONFIG, {});
      expect(server.requests[0].url).to.include(MOCK_API_URL);
    });

    it("should not fetch when articleIdMode is 'explicit' but articleId is absent", function () {
      const config = {
        ...VALID_CONFIG,
        params: {
          ...VALID_CONFIG.params,
          articleId: undefined,
          articleIdMode: "explicit",
        },
      };
      subModuleObj.init(config, {});
      expect(server.requests.length).to.equal(0);
    });
  });

  // ── 4. init – GDPR consent ────────────────────────────────────────────────

  describe("init – GDPR consent", function () {
    it("should fetch when GDPR does not apply", function () {
      subModuleObj.init(VALID_CONFIG, { gdpr: { gdprApplies: false } });
      expect(server.requests.length).to.equal(1);
    });

    it("should fetch when there is no consent object at all", function () {
      subModuleObj.init(VALID_CONFIG, {});
      expect(server.requests.length).to.equal(1);
    });

    it("should fetch at init while the CMP has not answered yet", function () {
      gdprDataHandler.reset();
      gdprDataHandler.enable();
      try {
        subModuleObj.init(VALID_CONFIG, {});
        expect(server.requests.length).to.equal(1);
      } finally {
        gdprDataHandler.reset();
      }
    });

    it("should not fetch when GDPR applies, whatever the purposes", function () {
      // not on the GVL: the user cannot consent to StackUp as a vendor
      const purposeStates = [
        { consents: { 1: false, 4: false }, legitimateInterests: {} },
        { consents: { 1: true }, legitimateInterests: {} },
        { consents: { 1: true, 4: true }, legitimateInterests: {} },
        { consents: {}, legitimateInterests: { 1: true, 4: true } },
        undefined, // vendorData absent (CMP error/timeout)
      ];
      for (const purpose of purposeStates) {
        _resetStateForTesting();
        server.reset();
        const vendorData = purpose ? { purpose } : undefined;
        subModuleObj.init(VALID_CONFIG, { gdpr: { gdprApplies: true, vendorData } });
        expect(server.requests.length).to.equal(0);
      }
    });

    it("should fetch when the gdpr object has no gdprApplies", function () {
      subModuleObj.init(VALID_CONFIG, { gdpr: { consentString: "CP" } });
      expect(server.requests.length).to.equal(1);
    });
  });

  // ── 4b. init – COPPA ──────────────────────────────────────────────────────

  describe("init – COPPA", function () {
    it("should not fetch when COPPA is true", function () {
      subModuleObj.init(VALID_CONFIG, { coppa: true });
      expect(server.requests.length).to.equal(0);
    });

    it("should fetch when COPPA is false", function () {
      subModuleObj.init(VALID_CONFIG, { coppa: false });
      expect(server.requests.length).to.equal(1);
    });
  });

  // ── 4c. init – USP / CCPA ─────────────────────────────────────────────────

  describe("init – USP/CCPA", function () {
    // USP opt-out-of-sale does NOT block this module: the enrichment API
    // receives only a URL path + domain — no user identifiers are transmitted
    // or stored, so US sale-of-data opt-outs have no legal basis here.
    it("should still fetch when USP signals opt-out-of-sale (position 2 = Y)", function () {
      subModuleObj.init(VALID_CONFIG, { usp: "1YYN" });
      expect(server.requests.length).to.equal(1);
    });

    it("should fetch when USP does not signal opt-out-of-sale", function () {
      subModuleObj.init(VALID_CONFIG, { usp: "1YNN" });
      expect(server.requests.length).to.equal(1);
    });

    it("should fetch when USP string is absent", function () {
      subModuleObj.init(VALID_CONFIG, { usp: null });
      expect(server.requests.length).to.equal(1);
    });
  });

  // ── 4d. init – GPP ────────────────────────────────────────────────────────

  describe("init – GPP", function () {
    // GPP US-law sections do NOT block this module: only contextual page data
    // (URL path + domain) is sent to the API — no personal identifiers — so
    // US state privacy laws governing sale/sharing of personal data do not apply.
    it("should still fetch when GPP has active US-law sections (>= 5)", function () {
      subModuleObj.init(VALID_CONFIG, {
        gpp: { applicableSections: [6], gppString: "DBABMA~" },
      });
      expect(server.requests.length).to.equal(1);
    });

    it("should still fetch when GPP has multiple US-law sections", function () {
      subModuleObj.init(VALID_CONFIG, {
        gpp: { applicableSections: [5, 7, 8], gppString: "DBABMA~" },
      });
      expect(server.requests.length).to.equal(1);
    });

    it("should fetch when GPP has only the framework-applies sentinel (-1)", function () {
      subModuleObj.init(VALID_CONFIG, {
        gpp: { applicableSections: [-1], gppString: "" },
      });
      expect(server.requests.length).to.equal(1);
    });

    it("should fetch when GPP applicable sections array is empty", function () {
      subModuleObj.init(VALID_CONFIG, {
        gpp: { applicableSections: [], gppString: "" },
      });
      expect(server.requests.length).to.equal(1);
    });
  });

  // ── 5. getBidRequestData – error / idle state ─────────────────────────────

  describe("getBidRequestData – non-fetching states", function () {
    it("should call callback immediately when module is in idle state (never inited)", function () {
      const cb = sinon.spy();
      subModuleObj.getBidRequestData(
        { ortb2Fragments: { global: {} } },
        cb,
        VALID_CONFIG
      );
      expect(cb.calledOnce).to.be.true;
    });

    it("should call callback immediately when module is in error state", function () {
      subModuleObj.init({ name: "stackupRtd" }, {}); // → error (no pubId)
      const cb = sinon.spy();
      subModuleObj.getBidRequestData(
        { ortb2Fragments: { global: {} } },
        cb,
        VALID_CONFIG
      );
      expect(cb.calledOnce).to.be.true;
    });

    it("should never fire callback more than once", function () {
      const clock = sinon.useFakeTimers();
      const cb = sinon.spy();
      subModuleObj.getBidRequestData(
        { ortb2Fragments: { global: {} } },
        cb,
        VALID_CONFIG
      );
      // idle path already called it; advancing clock should not trigger a second call
      clock.tick(1000);
      expect(cb.callCount).to.equal(1);
      clock.restore();
    });
  });

  // ── 6. getBidRequestData – state already ready before call ────────────────

  describe("getBidRequestData – enrichment ready before call", function () {
    beforeEach(async function () {
      subModuleObj.init(VALID_CONFIG, {});
      respond200(VALID_API_RESPONSE);
      await flushMicrotasks(); // state transitions to "ready"
    });

    it("should call callback synchronously", function () {
      const cb = sinon.spy();
      subModuleObj.getBidRequestData(
        { ortb2Fragments: { global: {} } },
        cb,
        VALID_CONFIG
      );
      expect(cb.calledOnce).to.be.true;
    });

    it("should merge site content segments into ortb2Fragments", function () {
      const req = { ortb2Fragments: { global: {} } };
      subModuleObj.getBidRequestData(req, sinon.spy(), VALID_CONFIG);
      expect(req.ortb2Fragments.global.site.content.data).to.have.length(1);
      expect(req.ortb2Fragments.global.site.content.data[0].name).to.equal(
        "data.stackup-ai.com"
      );
    });

    it("should merge user segments into ortb2Fragments", function () {
      const req = { ortb2Fragments: { global: {} } };
      subModuleObj.getBidRequestData(req, sinon.spy(), VALID_CONFIG);
      expect(req.ortb2Fragments.global.user.data).to.have.length(1);
      expect(req.ortb2Fragments.global.user.data[0].name).to.equal(
        "data.stackup-ai.com"
      );
    });

    it("should populate site.content.id and title from enrichment", function () {
      const req = { ortb2Fragments: { global: {} } };
      subModuleObj.getBidRequestData(req, sinon.spy(), VALID_CONFIG);
      expect(req.ortb2Fragments.global.site.content.id).to.equal(
        "test-article-001"
      );
      expect(req.ortb2Fragments.global.site.content.title).to.equal(
        "Test Article Title"
      );
    });

    it("should record the merged snapshot under the request's auctionId", function () {
      const req = {
        auctionId: "auction-abc",
        ortb2Fragments: { global: {} },
      };
      subModuleObj.getBidRequestData(req, sinon.spy(), VALID_CONFIG);
      const record = getAuctionEnrichment("auction-abc");
      expect(record.status).to.equal("enriched");
      expect(record.enrichment.articleId).to.equal("test-article-001");
      expect(record.enrichment.source).to.equal("api");
    });

    it("should assign an auctionId when the request has none, and record under it", function () {
      const req = { ortb2Fragments: { global: {} } };
      subModuleObj.getBidRequestData(req, sinon.spy(), VALID_CONFIG);
      expect(req.auctionId).to.be.a("string").and.not.be.empty;
      expect(getAuctionEnrichment(req.auctionId).status).to.equal("enriched");
    });

    it("should keep only the 50 most recent auction records", function () {
      // state is already "ready" from beforeEach, so each call is synchronous
      for (let i = 0; i < 51; i++) {
        subModuleObj.getBidRequestData(
          { auctionId: `auction-evict-${i}`, ortb2Fragments: { global: {} } },
          sinon.spy(),
          VALID_CONFIG
        );
      }
      expect(auctionEnrichmentCount()).to.equal(50);
      expect(getAuctionEnrichment("auction-evict-0")).to.be.undefined;
      expect(getAuctionEnrichment("auction-evict-50").status).to.equal("enriched");
    });
  });

  describe("getBidRequestData – per-auction record for analytics", function () {
    it("should record 'unavailable' when the module is inert", function () {
      subModuleObj.getBidRequestData(
        { auctionId: "a-idle", ortb2Fragments: { global: {} } },
        sinon.spy(),
        VALID_CONFIG
      );
      expect(getAuctionEnrichment("a-idle")).to.eql({
        auctionId: "a-idle",
        status: "unavailable",
        enrichment: null,
      });
    });

    it("should record 'unavailable' when the fetch fails", async function () {
      subModuleObj.init(VALID_CONFIG, {});
      subModuleObj.getBidRequestData(
        { auctionId: "a-failed", ortb2Fragments: { global: {} } },
        sinon.spy(),
        VALID_CONFIG,
        {},
        AUCTION_DELAY
      );
      server.requests[0].respond(500, {}, "Server Error");
      await flushMicrotasks();
      expect(getAuctionEnrichment("a-failed").status).to.equal("unavailable");
    });

    it("should record 'timedOut' when the auction is released before the enrichment lands", function () {
      const clock = sinon.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
      try {
        subModuleObj.init(VALID_CONFIG, {});
        subModuleObj.getBidRequestData(
          { auctionId: "a-slow", ortb2Fragments: { global: {} } },
          sinon.spy(),
          VALID_CONFIG,
          {},
          50
        );
        expect(getAuctionEnrichment("a-slow")).to.be.undefined;
        clock.tick(60);
        expect(getAuctionEnrichment("a-slow")).to.eql({
          auctionId: "a-slow",
          status: "timedOut",
          enrichment: null,
        });
      } finally {
        clock.restore();
      }
    });

    it("should record 'noConsent' when the auction's consent denies enrichment", async function () {
      subModuleObj.init(VALID_CONFIG, {});
      respond200(VALID_API_RESPONSE);
      await flushMicrotasks();
      subModuleObj.getBidRequestData(
        { auctionId: "a-noconsent", ortb2Fragments: { global: {} } },
        sinon.spy(),
        VALID_CONFIG,
        { coppa: true }
      );
      expect(getAuctionEnrichment("a-noconsent").status).to.equal("noConsent");
    });

    it("should record 'error' when the merge fails", async function () {
      subModuleObj.init(VALID_CONFIG, {});
      respond200(VALID_API_RESPONSE);
      await flushMicrotasks();
      const fragments = {
        get global() {
          throw new Error("unreadable");
        },
      };
      const cb = sinon.spy();
      subModuleObj.getBidRequestData(
        { auctionId: "a-error", ortb2Fragments: fragments },
        cb,
        VALID_CONFIG
      );
      expect(cb.calledOnce).to.be.true;
      expect(getAuctionEnrichment("a-error").status).to.equal("error");
    });
  });

  // ── 7. getBidRequestData – fetch in flight when call arrives ─────────────

  describe("getBidRequestData – enrichment still fetching", function () {
    it("should queue callback and fire it after successful fetch", async function () {
      const cb = sinon.spy();
      const req = { ortb2Fragments: { global: {} } };

      subModuleObj.init(VALID_CONFIG, {});
      subModuleObj.getBidRequestData(req, cb, VALID_CONFIG, {}, AUCTION_DELAY);
      expect(cb.called).to.be.false; // not yet

      respond200(VALID_API_RESPONSE);
      await flushMicrotasks();

      expect(cb.calledOnce).to.be.true;
      expect(req.ortb2Fragments.global.site.content.data).to.have.length(1);
    });

    it("should fire callback (clean) when the fetch returns an error response", async function () {
      const cb = sinon.spy();
      subModuleObj.init(VALID_CONFIG, {});
      subModuleObj.getBidRequestData(
        { ortb2Fragments: { global: {} } },
        cb,
        VALID_CONFIG,
        {},
        AUCTION_DELAY
      );
      expect(cb.called).to.be.false;
      server.requests[0].respond(500, {}, "Server Error");
      await flushMicrotasks();

      expect(cb.calledOnce).to.be.true;
    });

    it("should fire callback (clean) when the fetch returns schema-invalid JSON", async function () {
      const cb = sinon.spy();
      subModuleObj.init(VALID_CONFIG, {});
      subModuleObj.getBidRequestData(
        { ortb2Fragments: { global: {} } },
        cb,
        VALID_CONFIG,
        {},
        AUCTION_DELAY
      );
      expect(cb.called).to.be.false;
      respond200({ site: {} }); // missing site.content → schema invalid
      await flushMicrotasks();

      expect(cb.calledOnce).to.be.true;
    });

    it("should fire callback via the timeout safety net when fetch never settles", function () {
      const clock = sinon.useFakeTimers();
      const cb = sinon.spy();

      const timeoutConfig = {
        ...VALID_CONFIG,
        params: { ...VALID_CONFIG.params, timeout: 100 },
      };
      subModuleObj.init(timeoutConfig, {});
      subModuleObj.getBidRequestData(
        { ortb2Fragments: { global: {} } },
        cb,
        timeoutConfig,
        {},
        AUCTION_DELAY
      );

      expect(cb.called).to.be.false;
      clock.tick(150); // advance past the 100 ms auction timeout
      expect(cb.calledOnce).to.be.true;

      clock.restore();
    });

    it("should respect an auction-delay budget smaller than params.timeout", function () {
      // Core passes auctionDelay (e.g. 50 ms) as the 5th argument when
      // the publisher configured waitForIt:true and auctionDelay > 0.
      // The safety net must fire at min(params.timeout, budget) = 50 ms.
      const clock = sinon.useFakeTimers();
      const cb = sinon.spy();

      const timeoutConfig = {
        ...VALID_CONFIG,
        params: { ...VALID_CONFIG.params, timeout: 300 },
      };
      subModuleObj.init(timeoutConfig, {});
      // 5th arg = 50 ms auction-delay budget from core
      subModuleObj.getBidRequestData(
        { ortb2Fragments: { global: {} } },
        cb,
        timeoutConfig,
        {},
        50
      );

      expect(cb.called).to.be.false;
      clock.tick(60); // past budget (50) but well under params.timeout (300)
      expect(cb.calledOnce).to.be.true;

      clock.restore();
    });

    it("should release the auction at once when core does not delay it", function () {
      // Core passes 0 when it does not delay auctions (no auctionDelay); the
      // auction starts without us, so waiting could only merge into an auction
      // whose bid requests are already built.
      const cb = sinon.spy();
      subModuleObj.init(VALID_CONFIG, {});
      subModuleObj.getBidRequestData(
        { auctionId: "a-nodelay", ortb2Fragments: { global: {} } },
        cb,
        VALID_CONFIG,
        {},
        0
      );
      expect(cb.calledOnce).to.be.true;
      expect(getAuctionEnrichment("a-nodelay").status).to.equal("timedOut");
    });

    it("should not wait without waitForIt, even when core delays the auction for other providers", async function () {
      const cb = sinon.spy();
      const req = { ortb2Fragments: { global: {} } };
      const nonBlocking = { ...VALID_CONFIG, waitForIt: false };
      subModuleObj.init(nonBlocking, {});
      subModuleObj.getBidRequestData(req, cb, nonBlocking, {}, AUCTION_DELAY);
      expect(cb.calledOnce).to.be.true;

      respond200(VALID_API_RESPONSE);
      await flushMicrotasks();
      // the auction went ahead without us: its ortb2 is left alone
      expect(req.ortb2Fragments.global).to.eql({});
    });

    it("should still enrich a non-delayed auction when the enrichment is already loaded", async function () {
      subModuleObj.init(VALID_CONFIG, {});
      respond200(VALID_API_RESPONSE);
      await flushMicrotasks();
      const req = { ortb2Fragments: { global: {} } };
      subModuleObj.getBidRequestData(req, sinon.spy(), { ...VALID_CONFIG, waitForIt: false }, {}, 0);
      expect(req.ortb2Fragments.global.site.content.data).to.have.length(1);
    });

    it("should wait the whole auctionDelay when params.timeout is longer", function () {
      const clock = sinon.useFakeTimers();
      try {
        const cb = sinon.spy();
        const slowConfig = {
          ...VALID_CONFIG,
          params: { ...VALID_CONFIG.params, timeout: 300 },
        };
        subModuleObj.init(slowConfig, {});
        subModuleObj.getBidRequestData(
          { ortb2Fragments: { global: {} } },
          cb,
          slowConfig,
          {},
          100
        );
        clock.tick(99);
        expect(cb.called).to.be.false;
        clock.tick(1);
        expect(cb.calledOnce).to.be.true;
      } finally {
        clock.restore();
      }
    });

    it("should register its release hook right after rtdModule's", function () {
      expect(
        getHook("startAuction").getHooks({ hook: releaseWaitingAuction }).length
      ).to.equal(1);
    });

    it("should release a waiting auction as soon as core lets it go", function () {
      const cb = sinon.spy();
      const next = sinon.spy();
      const req = { auctionId: "a-core", ortb2Fragments: { global: {} } };
      subModuleObj.init(VALID_CONFIG, {});
      subModuleObj.getBidRequestData(req, cb, VALID_CONFIG, {}, AUCTION_DELAY);
      expect(cb.called).to.be.false;

      // core's timer started before ours, so it lets the auction go first
      releaseWaitingAuction(next, req);
      expect(cb.calledOnce).to.be.true;
      expect(next.calledOnceWith(req)).to.be.true;
      expect(getAuctionEnrichment("a-core").status).to.equal("timedOut");
    });

    it("should not merge or record an enrichment that arrives after core released the auction", async function () {
      const cb = sinon.spy();
      const req = { auctionId: "a-late", ortb2Fragments: { global: {} } };
      subModuleObj.init(VALID_CONFIG, {});
      subModuleObj.getBidRequestData(req, cb, VALID_CONFIG, {}, AUCTION_DELAY);
      releaseWaitingAuction(sinon.spy(), req);

      respond200(VALID_API_RESPONSE);
      await flushMicrotasks();
      expect(cb.calledOnce).to.be.true;
      expect(req.ortb2Fragments.global).to.eql({});
      expect(getAuctionEnrichment("a-late").status).to.equal("timedOut");
    });

    it("should pass through auctions it is not holding", async function () {
      subModuleObj.init(VALID_CONFIG, {});
      respond200(VALID_API_RESPONSE);
      await flushMicrotasks();
      const cb = sinon.spy();
      const req = { auctionId: "a-done", ortb2Fragments: { global: {} } };
      subModuleObj.getBidRequestData(req, cb, VALID_CONFIG, {}, AUCTION_DELAY);
      expect(getAuctionEnrichment("a-done").status).to.equal("enriched");

      const next = sinon.spy();
      releaseWaitingAuction(next, req);
      releaseWaitingAuction(next, { auctionId: "a-unknown" });
      expect(next.calledTwice).to.be.true;
      expect(cb.calledOnce).to.be.true;
      expect(getAuctionEnrichment("a-done").status).to.equal("enriched");
      expect(getAuctionEnrichment("a-unknown")).to.be.undefined;
    });
  });

  // ── 8. schema validation (isValidEnrichment) ─────────────────────────────

  describe("schema validation", function () {
    async function runAndGetReq(responseBody) {
      _resetStateForTesting();
      subModuleObj.init(VALID_CONFIG, {});
      const cb = sinon.spy();
      const req = { ortb2Fragments: { global: {} } };
      subModuleObj.getBidRequestData(req, cb, VALID_CONFIG, {}, AUCTION_DELAY);
      respond200(responseBody);
      await flushMicrotasks();
      return req;
    }

    it("should reject a response where site.content is missing", async function () {
      const req = await runAndGetReq({ site: {} });
      expect(req.ortb2Fragments.global.site).to.be.undefined;
    });

    it("should reject a response where site.content.data is not an array", async function () {
      const bad = JSON.parse(JSON.stringify(VALID_API_RESPONSE));
      bad.site.content.data = "not-array";
      const req = await runAndGetReq(bad);
      expect(req.ortb2Fragments.global.site).to.be.undefined;
    });

    it("should reject content segments with an unsupported segtax", async function () {
      const bad = JSON.parse(JSON.stringify(VALID_API_RESPONSE));
      bad.site.content.data[0].ext.segtax = 999;
      const req = await runAndGetReq(bad);
      expect(req.ortb2Fragments.global.site).to.be.undefined;
    });

    it("should reject a response carrying a segtax 600 block", async function () {
      const legacy = JSON.parse(JSON.stringify(DUAL_TAXONOMY_API_RESPONSE));
      legacy.site.content.data.push({
        name: "example.com",
        ext: { segtax: 600 },
        segment: [{ id: "legacy" }],
      });
      const req = await runAndGetReq(legacy);
      expect(req.ortb2Fragments.global.site).to.be.undefined;
    });

    it("should accept dual taxonomy, standard audience, GARM, and untagged data", async function () {
      const req = await runAndGetReq(DUAL_TAXONOMY_API_RESPONSE);
      expect(req.ortb2Fragments.global.site.cattax).to.equal(2);
      expect(req.ortb2Fragments.global.site.pagecat).to.deep.equal([
        "IAB19-6",
      ]);
      expect(
        req.ortb2Fragments.global.site.content.data.map(
          (block) => block.ext?.segtax
        )
      ).to.deep.equal([6, 9, undefined]);
      expect(
        req.ortb2Fragments.global.user.data.map(
          (block) => block.ext?.segtax
        )
      ).to.deep.equal([4, 501, undefined]);
      expect(
        req.ortb2Fragments.global.site.content.ext.stackup.content_suitability
      ).to.deep.equal({
        framework: "garm",
        floor_violation: 0,
        risk: "low",
      });
    });

    it("should reject user data with an unsupported segtax", async function () {
      const bad = JSON.parse(JSON.stringify(DUAL_TAXONOMY_API_RESPONSE));
      bad.user.data[0].ext.segtax = 999;
      const req = await runAndGetReq(bad);
      expect(req.ortb2Fragments.global.site).to.be.undefined;
    });

    it("should reject content segments where segment is not an array", async function () {
      const bad = JSON.parse(JSON.stringify(VALID_API_RESPONSE));
      bad.site.content.data[0].segment = "not-array";
      const req = await runAndGetReq(bad);
      expect(req.ortb2Fragments.global.site).to.be.undefined;
    });

    it("should reject segments with confidence outside [0,1]", async function () {
      const bad = JSON.parse(JSON.stringify(VALID_API_RESPONSE));
      bad.site.content.data[0].segment[0].ext.confidence = 1.5;
      const req = await runAndGetReq(bad);
      expect(req.ortb2Fragments.global.site).to.be.undefined;
    });

    it("should accept a valid response with no user block (site-only enrichment)", async function () {
      const siteOnly = { ...VALID_API_RESPONSE, user: undefined };
      const req = await runAndGetReq(siteOnly);
      expect(req.ortb2Fragments.global.site.content.data).to.have.length(1);
      // nothing to add, so no user object is created
      expect(req.ortb2Fragments.global).to.not.have.property("user");
    });

    it("should not create site.content.id from the resolved path", async function () {
      const noId = JSON.parse(JSON.stringify(VALID_API_RESPONSE));
      delete noId.site.content.id;
      const req = await runAndGetReq(noId);
      expect(req.ortb2Fragments.global.site.content.id).to.be.undefined;
    });
  });

  // ── 9. ortb2 merge behaviour ─────────────────────────────────────────────

  describe("ortb2 merge behaviour", function () {
    beforeEach(async function () {
      subModuleObj.init(VALID_CONFIG, {});
      respond200(VALID_API_RESPONSE);
      await flushMicrotasks();
    });

    async function loadResponse(responseBody) {
      _resetStateForTesting();
      subModuleObj.init(VALID_CONFIG, {});
      respond200(responseBody);
      await flushMicrotasks();
    }

    async function loadDualTaxonomyResponse() {
      await loadResponse(DUAL_TAXONOMY_API_RESPONSE);
    }

    function dualTaxonomyResponseWithout(...fields) {
      const response = JSON.parse(JSON.stringify(DUAL_TAXONOMY_API_RESPONSE));
      for (const field of fields) delete response.site[field];
      return response;
    }

    it("should not add StackUp page categories to a publisher cattax", async function () {
      await loadDualTaxonomyResponse();
      const req = {
        ortb2Fragments: { global: { site: { cattax: 1, content: { data: [] } } } },
      };

      subModuleObj.getBidRequestData(req, sinon.spy(), VALID_CONFIG);

      expect(req.ortb2Fragments.global.site.cattax).to.equal(1);
      expect(req.ortb2Fragments.global.site.pagecat).to.be.undefined;
    });

    it("should not add a StackUp cattax to publisher page categories", async function () {
      await loadDualTaxonomyResponse();
      const req = {
        ortb2Fragments: {
          global: {
            site: { pagecat: ["IAB-publisher"], content: { data: [] } },
          },
        },
      };

      subModuleObj.getBidRequestData(req, sinon.spy(), VALID_CONFIG);

      expect(req.ortb2Fragments.global.site.cattax).to.be.undefined;
      expect(req.ortb2Fragments.global.site.pagecat).to.deep.equal([
        "IAB-publisher",
      ]);
    });

    it("should not add StackUp categories to a publisher site.cat", async function () {
      await loadDualTaxonomyResponse();
      const req = {
        ortb2Fragments: {
          global: { site: { cat: ["IAB1-1"], content: { data: [] } } },
        },
      };

      subModuleObj.getBidRequestData(req, sinon.spy(), VALID_CONFIG);

      // site.cattax governs cat[] too, so adopting it here would relabel the
      // publisher's ids under StackUp's taxonomy.
      expect(req.ortb2Fragments.global.site.cattax).to.be.undefined;
      expect(req.ortb2Fragments.global.site.pagecat).to.be.undefined;
      expect(req.ortb2Fragments.global.site.cat).to.deep.equal(["IAB1-1"]);
    });

    it("should not add StackUp categories to a publisher site.sectioncat", async function () {
      await loadDualTaxonomyResponse();
      const req = {
        ortb2Fragments: {
          global: { site: { sectioncat: ["IAB1-2"], content: { data: [] } } },
        },
      };

      subModuleObj.getBidRequestData(req, sinon.spy(), VALID_CONFIG);

      expect(req.ortb2Fragments.global.site.cattax).to.be.undefined;
      expect(req.ortb2Fragments.global.site.pagecat).to.be.undefined;
      expect(req.ortb2Fragments.global.site.sectioncat).to.deep.equal([
        "IAB1-2",
      ]);
    });

    it("should not copy page categories when the response omits cattax", async function () {
      await loadResponse(dualTaxonomyResponseWithout("cattax"));
      const req = { ortb2Fragments: { global: {} } };

      subModuleObj.getBidRequestData(req, sinon.spy(), VALID_CONFIG);

      // Unpaired pagecat would be read under the default taxonomy (1).
      expect(req.ortb2Fragments.global.site.pagecat).to.be.undefined;
      expect(req.ortb2Fragments.global.site.cattax).to.be.undefined;
    });

    it("should not copy a cattax when the response omits pagecat", async function () {
      await loadResponse(dualTaxonomyResponseWithout("pagecat"));
      const req = { ortb2Fragments: { global: {} } };

      subModuleObj.getBidRequestData(req, sinon.spy(), VALID_CONFIG);

      expect(req.ortb2Fragments.global.site.cattax).to.be.undefined;
      expect(req.ortb2Fragments.global.site.pagecat).to.be.undefined;
    });

    it("should not overwrite a publisher-supplied content id", function () {
      const req = {
        ortb2Fragments: {
          global: { site: { content: { id: "publisher-id", data: [] } } },
        },
      };
      subModuleObj.getBidRequestData(req, sinon.spy(), VALID_CONFIG);
      expect(req.ortb2Fragments.global.site.content.id).to.equal(
        "publisher-id"
      );
    });

    it("should append a new provider block when provider is absent from existing data", function () {
      const req = {
        ortb2Fragments: {
          global: {
            site: {
              content: {
                data: [
                  {
                    name: "other-provider.com",
                    ext: { segtax: 502 },
                    segment: [{ id: "x", name: "X" }],
                  },
                ],
              },
            },
          },
        },
      };
      subModuleObj.getBidRequestData(req, sinon.spy(), VALID_CONFIG);
      expect(req.ortb2Fragments.global.site.content.data).to.have.length(2);
    });

    it("should preserve non-conflicting ext metadata in a matching provider block", function () {
      const req = {
        ortb2Fragments: {
          global: {
            site: {
              content: {
                data: [
                  {
                    name: "data.stackup-ai.com",
                    ext: { segtax: 502, stackup: { dimension: "content" } },
                    segment: [{ id: "old", name: "Old Segment" }],
                  },
                ],
              },
            },
          },
        },
      };
      subModuleObj.getBidRequestData(req, sinon.spy(), VALID_CONFIG);
      const data = req.ortb2Fragments.global.site.content.data;
      expect(data).to.have.length(1);
      expect(data[0].segment.map((segment) => segment.id)).to.deep.equal([
        "old",
        "113",
        "79",
      ]);
      expect(data[0].ext).to.deep.equal({
        segtax: 502,
        stackup: {
          taxonomy_version: "1.0",
          dimension: "content",
          source_tier: "enrichment",
        },
      });
    });

    it("should merge by name plus segtax while preserving publisher-owned fields", async function () {
      _resetStateForTesting();
      subModuleObj.init(VALID_CONFIG, {});
      respond200(DUAL_TAXONOMY_API_RESPONSE);
      await flushMicrotasks();

      const req = {
        ortb2Fragments: {
          global: {
            site: {
              cattax: 1,
              pagecat: ["IAB-publisher"],
              content: {
                data: [
                  {
                    name: "data.stackup-ai.com",
                    ext: { segtax: 6 },
                    segment: [{ id: "324", value: "publisher-value" }],
                  },
                  {
                    name: "data.stackup-ai.com",
                    ext: { segtax: 9 },
                    segment: [{ id: "publisher-9" }],
                  },
                ],
                ext: {
                  stackup: { emotion: { tone: "publisher-tone" } },
                },
              },
            },
            user: {
              data: [
                {
                  name: "data.stackup-ai.com",
                  ext: { segtax: 4 },
                  segment: [{ id: "aud-1", value: "publisher-value" }],
                },
              ],
            },
          },
        },
      };

      subModuleObj.getBidRequestData(req, sinon.spy(), VALID_CONFIG);

      const global = req.ortb2Fragments.global;
      expect(global.site.cattax).to.equal(1);
      expect(global.site.pagecat).to.deep.equal(["IAB-publisher"]);
      expect(global.site.content.id).to.be.undefined;
      expect(global.site.content.data).to.have.length(3);
      const content6 = global.site.content.data.find(
        (block) => block.ext?.segtax === 6
      );
      const content9 = global.site.content.data.find(
        (block) => block.ext?.segtax === 9
      );
      expect(content6.segment.map((segment) => segment.id)).to.deep.equal([
        "324",
        "328",
      ]);
      expect(content6.segment[0].value).to.equal("publisher-value");
      expect(content9.segment.map((segment) => segment.id)).to.deep.equal([
        "publisher-9",
        "602",
        "607",
      ]);
      expect(
        global.site.content.ext.stackup.content_suitability
      ).to.deep.equal({
        framework: "garm",
        floor_violation: 0,
        risk: "low",
      });
      expect(global.site.content.ext.stackup.emotion).to.deep.equal({
        tone: "publisher-tone",
      });

      expect(global.user.data).to.have.length(3);
      const audience4 = global.user.data.find(
        (block) => block.ext?.segtax === 4
      );
      expect(audience4.segment.map((segment) => segment.id)).to.deep.equal([
        "aud-1",
        "aud-2",
      ]);
      expect(audience4.segment[0].value).to.equal("publisher-value");
    });

    it("should not overwrite publisher brand_safety ext", function () {
      const publisherBrandSafety = { garm_risk_level: "publisher-strict" };
      const req = {
        ortb2Fragments: {
          global: {
            site: {
              content: {
                ext: { brand_safety: publisherBrandSafety },
                data: [],
              },
            },
          },
        },
      };
      subModuleObj.getBidRequestData(req, sinon.spy(), VALID_CONFIG);
      expect(req.ortb2Fragments.global.site.content.ext.brand_safety).to.equal(
        publisherBrandSafety
      );
    });

    it("should merge brand_safety from enrichment when publisher has none", function () {
      const req = { ortb2Fragments: { global: {} } };
      subModuleObj.getBidRequestData(req, sinon.spy(), VALID_CONFIG);
      expect(
        req.ortb2Fragments.global.site.content.ext.brand_safety
      ).to.deep.equal({ garm_risk_level: "floor", categories: [] });
    });

    it("should merge emotion from enrichment when publisher has none", function () {
      const req = { ortb2Fragments: { global: {} } };
      subModuleObj.getBidRequestData(req, sinon.spy(), VALID_CONFIG);
      expect(req.ortb2Fragments.global.site.content.ext.emotion).to.deep.equal({
        tone: "informative",
        mood: "Inform Me",
        intensity: "moderate",
      });
    });

    it("should deduplicate segment ids keeping the higher-confidence entry", async function () {
      _resetStateForTesting();
      const dupResponse = JSON.parse(JSON.stringify(VALID_API_RESPONSE));
      dupResponse.site.content.data[0].segment = [
        { id: "113", name: "Security Low", ext: { confidence: 0.5 } },
        { id: "113", name: "Security High", ext: { confidence: 0.95 } },
      ];
      subModuleObj.init(VALID_CONFIG, {});
      respond200(dupResponse);
      await flushMicrotasks();

      const req = { ortb2Fragments: { global: {} } };
      subModuleObj.getBidRequestData(req, sinon.spy(), VALID_CONFIG);
      const segs = req.ortb2Fragments.global.site.content.data[0].segment;
      expect(segs).to.have.length(1);
      expect(segs[0].ext.confidence).to.equal(0.95);
    });
  });

  // ── 10. caching ───────────────────────────────────────────────────────────

  describe("caching", function () {
    // The session cache is only used at init when consent already says GDPR
    // doesn't apply; see "session cache and consent" for the other cases.
    const OUTSIDE_GDPR = { gdpr: { gdprApplies: false } };
    const cachedSnapshot = {
      articleId: "test-article-001",
      fetchedAt: Date.now(),
      source: "api",
      site: {
        content: {
          id: "test-article-001",
          title: "Cached Title",
          data: VALID_API_RESPONSE.site.content.data,
        },
      },
      user: { data: [] },
    };

    it("should not make an XHR request on a valid cache hit", async function () {
      storageGetStub.returns(
        JSON.stringify({ v: 3, t: Date.now(), d: cachedSnapshot })
      );
      subModuleObj.init(VALID_CONFIG, OUTSIDE_GDPR);
      expect(server.requests.length).to.equal(0);

      await flushMicrotasks();

      const cb = sinon.spy();
      const req = { ortb2Fragments: { global: {} } };
      subModuleObj.getBidRequestData(req, cb, VALID_CONFIG);
      expect(cb.calledOnce).to.be.true;
      expect(req.ortb2Fragments.global.site.content.data).to.have.length(1);
    });

    it("should ignore cache entries from the legacy schema version", function () {
      storageGetStub.returns(
        JSON.stringify({ v: 1, t: Date.now(), d: cachedSnapshot })
      );
      subModuleObj.init(VALID_CONFIG, OUTSIDE_GDPR);
      expect(server.requests.length).to.equal(1);
    });

    it("should fetch again instead of serving a snapshot cached before site.keywords and site.ext.data", function () {
      storageGetStub.returns(
        JSON.stringify({ v: 2, t: Date.now(), d: cachedSnapshot })
      );
      subModuleObj.init(VALID_CONFIG, OUTSIDE_GDPR);
      expect(server.requests.length).to.equal(1);
    });

    it("should merge site.keywords and site.ext.data from a cache hit", async function () {
      const withFpd = {
        ...cachedSnapshot,
        site: {
          ...cachedSnapshot.site,
          keywords: "football,section=sport",
          ext: { data: { site_name: "Example" } },
        },
      };
      storageGetStub.returns(JSON.stringify({ v: 3, t: Date.now(), d: withFpd }));
      subModuleObj.init(VALID_CONFIG, OUTSIDE_GDPR);
      expect(server.requests.length).to.equal(0);

      const req = { ortb2Fragments: { global: {} } };
      subModuleObj.getBidRequestData(req, sinon.spy(), VALID_CONFIG);
      expect(req.ortb2Fragments.global.site.keywords).to.equal("football,section=sport");
      expect(req.ortb2Fragments.global.site.ext.data).to.eql({ site_name: "Example" });
    });

    it("should fetch instead of using a cached entry with no user object", function () {
      const { user, ...withoutUser } = cachedSnapshot;
      storageGetStub.returns(
        JSON.stringify({ v: 3, t: Date.now(), d: withoutUser })
      );
      subModuleObj.init(VALID_CONFIG, OUTSIDE_GDPR);
      expect(server.requests.length).to.equal(1);
    });

    it("should fetch instead of using a cached entry with an invalid data block", function () {
      const bad = JSON.parse(JSON.stringify(cachedSnapshot));
      bad.site.content.data[0].ext.segtax = 999;
      storageGetStub.returns(JSON.stringify({ v: 3, t: Date.now(), d: bad }));
      subModuleObj.init(VALID_CONFIG, OUTSIDE_GDPR);
      expect(server.requests.length).to.equal(1);
    });

    it("should fetch instead of using a cached entry for another article", function () {
      storageGetStub.returns(
        JSON.stringify({
          v: 3,
          t: Date.now(),
          d: { ...cachedSnapshot, articleId: "other-article" },
        })
      );
      subModuleObj.init(VALID_CONFIG, OUTSIDE_GDPR);
      expect(server.requests.length).to.equal(1);
    });

    it("should fetch instead of throwing on a cached entry that is not valid JSON", function () {
      storageGetStub.returns("{not json");
      expect(subModuleObj.init(VALID_CONFIG, OUTSIDE_GDPR)).to.equal(true);
      expect(server.requests.length).to.equal(1);
    });

    it("should fetch instead of throwing when reading session storage throws", function () {
      storageGetStub.throws(new Error("SecurityError"));
      expect(subModuleObj.init(VALID_CONFIG, OUTSIDE_GDPR)).to.equal(true);
      expect(server.requests.length).to.equal(1);
    });

    it("should key debug-mode entries by the domain it asks the API about", async function () {
      const cachedUnder = async (params) => {
        _resetStateForTesting();
        subModuleObj.init({ ...VALID_CONFIG, params: { ...VALID_CONFIG.params, ...params } }, OUTSIDE_GDPR);
        const url = server.requests[server.requests.length - 1].url;
        respond200(VALID_API_RESPONSE);
        await flushMicrotasks();
        return { url, key: storageSetStub.lastCall.args[0] };
      };
      const plain = await cachedUnder({});
      const debug = await cachedUnder({ debug: true });
      const debugDomain = await cachedUnder({ debug: true, debugDomain: "other.example" });

      // without debugDomain, debug mode asks about the page's own domain
      expect(debug.url).to.equal(plain.url);
      expect(debug.key).to.equal(plain.key);
      expect(debugDomain.url).to.include("domain=other.example");
      expect(debugDomain.key).to.not.equal(plain.key);
    });

    it("should make an XHR request when cached entry is expired (default TTL 1 h)", function () {
      storageGetStub.returns(
        JSON.stringify({ v: 3, t: Date.now() - 7200 * 1000, d: cachedSnapshot })
      );
      subModuleObj.init(VALID_CONFIG, OUTSIDE_GDPR);
      expect(server.requests.length).to.equal(1);
    });

    it("should write to session storage after a successful API response", async function () {
      subModuleObj.init(VALID_CONFIG, OUTSIDE_GDPR);
      respond200(VALID_API_RESPONSE);
      await flushMicrotasks();

      expect(storageSetStub.calledOnce).to.be.true;
      const [key, value] = storageSetStub.firstCall.args;
      // Cache key is a hash: "stackup:enrich:v1:path_<cyrb53Hash(articleId)>"
      expect(key).to.include("stackup:enrich:v1:path_");

      const stored = JSON.parse(value);
      expect(stored.v).to.equal(3);
      expect(stored.d.articleId).to.equal("test-article-001");
      expect(stored.d.source).to.equal("api");
    });

    it("should not write to storage when the API response is schema-invalid", async function () {
      subModuleObj.init(VALID_CONFIG, OUTSIDE_GDPR);
      respond200({ site: {} }); // invalid schema
      await flushMicrotasks();

      expect(storageSetStub.called).to.be.false;
    });

    it("should skip cache read/write when params.cache.enabled is false", async function () {
      const noCacheConfig = {
        ...VALID_CONFIG,
        params: {
          ...VALID_CONFIG.params,
          cache: { enabled: false, ttlSeconds: 3600, storage: "session" },
        },
      };
      storageGetStub.returns(
        JSON.stringify({ v: 3, t: Date.now(), d: cachedSnapshot })
      );

      subModuleObj.init(noCacheConfig, OUTSIDE_GDPR);
      expect(storageGetStub.called).to.be.false;
      expect(server.requests.length).to.equal(1);

      respond200(VALID_API_RESPONSE);
      await flushMicrotasks();
      expect(storageSetStub.called).to.be.false;
    });

    it("should support params.cache.storage='memory' (no sessionStorage I/O)", async function () {
      const memoryCacheConfig = {
        ...VALID_CONFIG,
        params: {
          ...VALID_CONFIG.params,
          cache: { enabled: true, ttlSeconds: 3600, storage: "memory" },
        },
      };

      subModuleObj.init(memoryCacheConfig, {});
      expect(server.requests.length).to.equal(1);
      respond200(VALID_API_RESPONSE);
      await flushMicrotasks();
      // Verify API was called and result cached in memory, not sessionStorage
      expect(storageSetStub.called).to.be.false;
      expect(server.requests.length).to.equal(1);

      // Second init in same session hits in-memory cache (no new API call)
      const cb = sinon.spy();
      subModuleObj.getBidRequestData(
        { ortb2Fragments: { global: {} } },
        cb,
        memoryCacheConfig
      );
      expect(cb.calledOnce).to.be.true;
      // sessionStorage was never accessed
      expect(storageGetStub.called).to.be.false;
      // Still only one API request (cache hit)
      expect(server.requests.length).to.equal(1);
    });

    it("should use DEFAULT_TIMEOUT when params.timeout is invalid", function () {
      const clock = sinon.useFakeTimers();
      const cb = sinon.spy();
      const badTimeoutConfig = {
        ...VALID_CONFIG,
        params: { ...VALID_CONFIG.params, timeout: NaN },
      };
      subModuleObj.init(badTimeoutConfig, {});
      subModuleObj.getBidRequestData(
        { ortb2Fragments: { global: {} } },
        cb,
        badTimeoutConfig,
        {},
        AUCTION_DELAY
      );
      clock.tick(299);
      expect(cb.called).to.be.false;
      clock.tick(2);
      expect(cb.calledOnce).to.be.true;
      clock.restore();
    });

    it("should mark cached snapshots with source 'cache'", async function () {
      storageGetStub.returns(
        JSON.stringify({ v: 3, t: Date.now(), d: cachedSnapshot })
      );
      subModuleObj.init(VALID_CONFIG, OUTSIDE_GDPR);
      await flushMicrotasks();

      const cb = sinon.spy();
      const req = { ortb2Fragments: { global: {} } };
      subModuleObj.getBidRequestData(req, cb, VALID_CONFIG);
      // If we had access to the enrichment source we'd check it; here we verify it merges correctly
      expect(req.ortb2Fragments.global.site.content.title).to.equal(
        "Cached Title"
      );
    });
  });

  // ── regressions: running behind rtdModule's guarded ortb2Fragments ───────

  describe("session cache and consent", function () {
    // a consent module is on the page and the CMP has not answered at init;
    // the outer afterEach turns it off again
    beforeEach(function () {
      gdprDataHandler.enable();
    });

    const OUTSIDE_GDPR = { gdpr: { gdprApplies: false } };
    const GDPR = {
      gdpr: { gdprApplies: true, vendorData: { purpose: { consents: { 1: true, 4: true } } } },
    };
    // The CMP answers: consent management stores the answer, and rtdModule
    // passes the same to the auctions that follow.
    const cmpAnswers = (consent) => {
      gdprDataHandler.setConsentData(consent.gdpr);
      return consent;
    };
    const cachedEntry = () =>
      JSON.stringify({
        v: 3,
        t: Date.now(),
        d: {
          articleId: "test-article-001",
          fetchedAt: Date.now(),
          source: "api",
          site: { content: { title: "Cached Title", data: VALID_API_RESPONSE.site.content.data } },
          user: { data: [] },
        },
      });

    it("should neither read nor write sessionStorage before consent is known", async function () {
      storageGetStub.returns(cachedEntry());
      subModuleObj.init(VALID_CONFIG, {});
      expect(server.requests.length).to.equal(1);
      respond200(VALID_API_RESPONSE);
      await flushMicrotasks();
      expect(storageGetStub.called).to.be.false;
      expect(storageSetStub.called).to.be.false;
    });

    it("should neither read nor write sessionStorage while GDPR applies", async function () {
      storageGetStub.returns(cachedEntry());
      subModuleObj.init(VALID_CONFIG, {});
      respond200(VALID_API_RESPONSE);
      await flushMicrotasks();
      const req = { ortb2Fragments: { global: {} } };
      subModuleObj.getBidRequestData(req, sinon.spy(), VALID_CONFIG, cmpAnswers(GDPR));
      expect(req.ortb2Fragments.global).to.eql({});
      expect(storageGetStub.called).to.be.false;
      expect(storageSetStub.called).to.be.false;
    });

    it("should write the cache after the first auction whose consent says GDPR doesn't apply", async function () {
      subModuleObj.init(VALID_CONFIG, {});
      respond200(VALID_API_RESPONSE);
      await flushMicrotasks();
      expect(storageSetStub.called).to.be.false;

      const req = { ortb2Fragments: { global: {} } };
      subModuleObj.getBidRequestData(req, sinon.spy(), VALID_CONFIG, cmpAnswers(OUTSIDE_GDPR));
      expect(storageSetStub.calledOnce).to.be.true;
      expect(JSON.parse(storageSetStub.firstCall.args[1]).d.source).to.equal("api");
      expect(req.ortb2Fragments.global.site.content.data).to.have.length(1);

      subModuleObj.getBidRequestData({ ortb2Fragments: { global: {} } }, sinon.spy(), VALID_CONFIG, OUTSIDE_GDPR);
      expect(storageSetStub.calledOnce).to.be.true; // written once
    });

    it("should write the cache when the fetch lands after an auction allowed it", async function () {
      subModuleObj.init(VALID_CONFIG, {});
      // core is not waiting for us: the auction goes before the fetch lands
      subModuleObj.getBidRequestData({ ortb2Fragments: { global: {} } }, sinon.spy(), VALID_CONFIG, cmpAnswers(OUTSIDE_GDPR));
      expect(storageSetStub.called).to.be.false;
      respond200(VALID_API_RESPONSE);
      await flushMicrotasks();
      expect(storageSetStub.calledOnce).to.be.true;
    });

    it("should enrich the first auction from the cache when init could not read it", function () {
      storageGetStub.returns(cachedEntry());
      subModuleObj.init(VALID_CONFIG, {}); // consent not known yet: fetch, no cache read
      expect(server.requests.length).to.equal(1);

      const req = { ortb2Fragments: { global: {} } };
      const cb = sinon.spy();
      // core is not waiting for us: only a synchronous cache hit can enrich it
      subModuleObj.getBidRequestData(req, cb, VALID_CONFIG, cmpAnswers(OUTSIDE_GDPR), 0);
      expect(cb.calledOnce).to.be.true;
      expect(storageGetStub.calledOnce).to.be.true;
      expect(req.ortb2Fragments.global.site.content.title).to.equal("Cached Title");
    });

    it("should ignore the init fetch once the first auction finds the cache", async function () {
      storageGetStub.returns(cachedEntry());
      subModuleObj.init(VALID_CONFIG, {});
      subModuleObj.getBidRequestData({ ortb2Fragments: { global: {} } }, sinon.spy(), VALID_CONFIG, cmpAnswers(OUTSIDE_GDPR), 0);

      const late = JSON.parse(JSON.stringify(VALID_API_RESPONSE));
      late.site.content.title = "Late Title";
      try {
        respond200(late);
      } catch (e) {
        // the request is aborted
      }
      await flushMicrotasks();

      const req = { ortb2Fragments: { global: {} } };
      subModuleObj.getBidRequestData(req, sinon.spy(), VALID_CONFIG, OUTSIDE_GDPR, 0);
      expect(req.ortb2Fragments.global.site.content.title).to.equal("Cached Title");
      expect(storageSetStub.called).to.be.false;
    });

    it("should neither read nor write sessionStorage when consent management has no GDPR answer", async function () {
      // e.g. an unsupported cmpApi: consent management stores no consent and lets the auction go
      storageGetStub.returns(cachedEntry());
      subModuleObj.init(VALID_CONFIG, {});
      const noAnswer = cmpAnswers({ gdpr: null });
      subModuleObj.getBidRequestData({ ortb2Fragments: { global: {} } }, sinon.spy(), VALID_CONFIG, noAnswer);
      respond200(VALID_API_RESPONSE);
      await flushMicrotasks();

      const req = { ortb2Fragments: { global: {} } };
      subModuleObj.getBidRequestData(req, sinon.spy(), VALID_CONFIG, noAnswer);
      expect(req.ortb2Fragments.global.site.content.data).to.have.length(1); // still enriched
      expect(storageGetStub.called).to.be.false;
      expect(storageSetStub.called).to.be.false;
    });

    it("should not write the cache once the CMP says GDPR applies, though an earlier auction allowed it", async function () {
      subModuleObj.init(VALID_CONFIG, {});
      // e.g. defaultGdprScope: false after a CMP timeout; core is not waiting for us
      subModuleObj.getBidRequestData({ ortb2Fragments: { global: {} } }, sinon.spy(), VALID_CONFIG, cmpAnswers(OUTSIDE_GDPR));
      cmpAnswers(GDPR); // the CMP answers late, while the fetch is still in flight
      respond200(VALID_API_RESPONSE);
      await flushMicrotasks();
      expect(storageSetStub.called).to.be.false;
    });

    it("should read the cache at init on a page without a consent module", function () {
      gdprDataHandler.reset(); // no consent module: no GDPR signal will come
      storageGetStub.returns(cachedEntry());
      subModuleObj.init(VALID_CONFIG, {});
      expect(server.requests.length).to.equal(0);

      const req = { ortb2Fragments: { global: {} } };
      subModuleObj.getBidRequestData(req, sinon.spy(), VALID_CONFIG, {}, 0);
      expect(req.ortb2Fragments.global.site.content.title).to.equal("Cached Title");
    });
  });

  describe("getBidRequestData – guarded ortb2Fragments (as passed by rtdModule)", function () {
    let logErrorSpy;

    beforeEach(async function () {
      logErrorSpy = sinon.spy(utils, "logError");
      subModuleObj.init(VALID_CONFIG, {});
      respond200(VALID_API_RESPONSE);
      await flushMicrotasks();
    });

    afterEach(function () {
      logErrorSpy.restore();
    });

    it("should merge without reassigning the getter-only global fragment", function () {
      const fragments = { global: {}, bidder: {} };
      subModuleObj.getBidRequestData(
        { ortb2Fragments: guardOrtb2Fragments(fragments, {}) },
        sinon.spy(),
        VALID_CONFIG
      );
      expect(logErrorSpy.called).to.be.false;
      expect(fragments.global.site.content.data).to.have.length(1);
      expect(fragments.global.user.data).to.have.length(1);
    });

    it("should never assign ortb2Fragments.global, whatever the strictness of the build", function () {
      const global = {};
      const fragments = {
        get global() {
          return global;
        },
        set global(v) {
          throw new Error("global must not be reassigned");
        },
      };
      subModuleObj.getBidRequestData(
        { ortb2Fragments: fragments },
        sinon.spy(),
        VALID_CONFIG
      );
      expect(logErrorSpy.called).to.be.false;
      expect(global.site.content.data).to.have.length(1);
    });

    function guardDenying(...activities) {
      return ortb2FragmentsGuardFactory(
        ortb2GuardFactory((activity) => !activities.includes(activity))
      );
    }

    it("should merge site data and skip user data cleanly when enrichUfpd and transmitUfpd are denied", function () {
      const fragments = { global: {}, bidder: {} };
      subModuleObj.getBidRequestData(
        { ortb2Fragments: guardDenying("enrichUfpd", "transmitUfpd")(fragments, {}) },
        sinon.spy(),
        VALID_CONFIG
      );
      expect(logErrorSpy.called).to.be.false;
      expect(fragments.global.site.content.data).to.have.length(1);
      expect(fragments.global).to.not.have.property("user");
    });

    it("should not leave an empty user object behind when enrichUfpd is denied", function () {
      const fragments = { global: {}, bidder: {} };
      subModuleObj.getBidRequestData(
        { ortb2Fragments: guardDenying("enrichUfpd")(fragments, {}) },
        sinon.spy(),
        VALID_CONFIG
      );
      expect(logErrorSpy.called).to.be.false;
      expect(fragments.global.site.content.data).to.have.length(1);
      expect(fragments.global).to.not.have.property("user");
    });

    it("should keep the publisher's own user object when enrichUfpd is denied", function () {
      const publisherUser = { yob: 1990 };
      const fragments = { global: { user: publisherUser }, bidder: {} };
      subModuleObj.getBidRequestData(
        { ortb2Fragments: guardDenying("enrichUfpd")(fragments, {}) },
        sinon.spy(),
        VALID_CONFIG
      );
      expect(fragments.global.user).to.equal(publisherUser);
      expect(publisherUser).to.eql({ yob: 1990 });
    });

    it("should keep the publisher's user.data when enrichUfpd is denied", function () {
      const publisherData = [{ name: "publisher.com", segment: [{ id: "p1" }] }];
      const fragments = { global: { user: { data: publisherData } }, bidder: {} };
      subModuleObj.getBidRequestData(
        { ortb2Fragments: guardDenying("enrichUfpd")(fragments, {}) },
        sinon.spy(),
        VALID_CONFIG
      );
      expect(logErrorSpy.called).to.be.false;
      expect(fragments.global.user.data.map((b) => b.name)).to.eql(["publisher.com"]);
    });

    it("should not overwrite publisher user.data it cannot read when only transmitUfpd is denied", function () {
      const publisherData = [{ name: "publisher.com", segment: [{ id: "p1" }] }];
      const fragments = { global: { user: { data: publisherData } }, bidder: {} };
      subModuleObj.getBidRequestData(
        { ortb2Fragments: guardDenying("transmitUfpd")(fragments, {}) },
        sinon.spy(),
        VALID_CONFIG
      );
      expect(logErrorSpy.called).to.be.false;
      expect(fragments.global.user.data).to.equal(publisherData);
      expect(publisherData.map((b) => b.name)).to.eql(["publisher.com"]);
    });

    it("should leave user.data out of the auction's record when enrichUfpd keeps it out", function () {
      const fragments = { global: {}, bidder: {} };
      subModuleObj.getBidRequestData(
        { auctionId: "a-ufpd-denied", ortb2Fragments: guardDenying("enrichUfpd")(fragments, {}) },
        sinon.spy(),
        VALID_CONFIG
      );
      const record = getAuctionEnrichment("a-ufpd-denied");
      expect(record.status).to.equal("enriched");
      expect(record.enrichment.site.content.data).to.have.length(1);
      expect(record.enrichment.user.data).to.eql([]);
    });

    it("should leave user.data out of the auction's record when the publisher's user.data can't be read", function () {
      const fragments = {
        global: { user: { data: [{ name: "publisher.com", segment: [{ id: "p1" }] }] } },
        bidder: {},
      };
      subModuleObj.getBidRequestData(
        { auctionId: "a-transmit-denied", ortb2Fragments: guardDenying("transmitUfpd")(fragments, {}) },
        sinon.spy(),
        VALID_CONFIG
      );
      expect(getAuctionEnrichment("a-transmit-denied").enrichment.user.data).to.eql([]);
    });

    it("should merge into an empty publisher user.data when only transmitUfpd is denied", function () {
      // the guard lets an empty user.data through, then hides it once it holds data
      const fragments = { global: { user: { data: [] } }, bidder: {} };
      subModuleObj.getBidRequestData(
        { auctionId: "a-transmit-denied-empty", ortb2Fragments: guardDenying("transmitUfpd")(fragments, {}) },
        sinon.spy(),
        VALID_CONFIG
      );
      expect(logErrorSpy.called).to.be.false;
      expect(fragments.global.user.data).to.have.length(1);
      const record = getAuctionEnrichment("a-transmit-denied-empty");
      expect(record.status).to.equal("enriched");
      expect(record.enrichment.user.data).to.have.length(1);
    });

    it("should keep user.data in the auction's record when it was added", function () {
      const fragments = { global: {}, bidder: {} };
      subModuleObj.getBidRequestData(
        { auctionId: "a-ufpd-allowed", ortb2Fragments: guardOrtb2Fragments(fragments, {}) },
        sinon.spy(),
        VALID_CONFIG
      );
      expect(getAuctionEnrichment("a-ufpd-allowed").enrichment.user.data).to.have.length(1);
    });

    it("should merge into a publisher block whose segments are not all objects", function () {
      const publisherBlock = {
        name: "data.stackup-ai.com",
        ext: { segtax: 501 },
        segment: [null, { id: "p1" }],
      };
      const fragments = { global: { user: { data: [publisherBlock] } }, bidder: {} };
      subModuleObj.getBidRequestData(
        { auctionId: "a-null-segment", ortb2Fragments: guardOrtb2Fragments(fragments, {}) },
        sinon.spy(),
        VALID_CONFIG
      );
      expect(logErrorSpy.called).to.be.false;
      expect(getAuctionEnrichment("a-null-segment").status).to.equal("enriched");
      expect(fragments.global.user.data[0].segment.map((seg) => seg?.id)).to.eql([undefined, "p1", "1"]);
    });
  });

  describe("site.keywords and site.ext.data", function () {
    const FPD_RESPONSE = {
      ...VALID_API_RESPONSE,
      site: {
        ...VALID_API_RESPONSE.site,
        keywords: "football, transfers,section=sport,edition=uk",
        ext: {
          data: {
            site_name: "Example",
            topics: ["sports"],
            edition: "uk",
          },
        },
      },
    };

    async function mergeResponse(body, global = {}, ortb2Fragments) {
      subModuleObj.init(VALID_CONFIG, {});
      respond200(body);
      await flushMicrotasks();
      const fragments = ortb2Fragments ?? { global };
      subModuleObj.getBidRequestData({ ortb2Fragments: fragments }, sinon.spy(), VALID_CONFIG);
      return global;
    }

    it("should forward both fields when the publisher has set neither", async function () {
      const global = await mergeResponse(FPD_RESPONSE);
      expect(global.site.keywords).to.equal(
        "football,transfers,section=sport,edition=uk"
      );
      expect(global.site.ext.data).to.eql(FPD_RESPONSE.site.ext.data);
      expect(global.site.content.data).to.have.length(1);
    });

    it("should put the publisher's keywords first and not repeat a token", async function () {
      const global = await mergeResponse(FPD_RESPONSE, {
        site: { keywords: "transfers,local news" },
      });
      expect(global.site.keywords).to.equal(
        "transfers,local news,football,section=sport,edition=uk"
      );
    });

    it("should leave the publisher's keywords as they are when we add no new token", async function () {
      const global = await mergeResponse(
        { ...VALID_API_RESPONSE, site: { ...VALID_API_RESPONSE.site, keywords: "football" } },
        { site: { keywords: "football , sport" } }
      );
      expect(global.site.keywords).to.equal("football , sport");
    });

    it("should not touch publisher keywords that are not a string", async function () {
      const global = await mergeResponse(FPD_RESPONSE, {
        site: { keywords: ["publisher"] },
      });
      expect(global.site.keywords).to.eql(["publisher"]);
    });

    it("should keep the publisher's site.ext.data values and add only missing keys", async function () {
      const publisherData = { site_name: "Publisher's own", section: "sport" };
      const global = await mergeResponse(FPD_RESPONSE, {
        site: { ext: { data: publisherData, other: 1 } },
      });
      expect(global.site.ext.data).to.equal(publisherData);
      expect(publisherData).to.eql({
        site_name: "Publisher's own",
        section: "sport",
        topics: ["sports"],
        edition: "uk",
      });
      expect(global.site.ext.other).to.equal(1);
    });

    it("should not touch a publisher site.ext.data that is not an object", async function () {
      const global = await mergeResponse(FPD_RESPONSE, {
        site: { ext: { data: "publisher" } },
      });
      expect(global.site.ext.data).to.equal("publisher");
    });

    it("should ignore values of the wrong type and still merge the segments", async function () {
      const global = await mergeResponse({
        ...VALID_API_RESPONSE,
        site: { ...VALID_API_RESPONSE.site, keywords: 42, ext: { data: ["not", "an", "object"] } },
      });
      expect(global.site).to.not.have.property("keywords");
      expect(global.site).to.not.have.property("ext");
      expect(global.site.content.data).to.have.length(1);
    });

    it("should merge a response that carries only keywords and site.ext.data", async function () {
      const global = await mergeResponse({
        site: {
          keywords: "section=sport",
          ext: { data: { site_name: "Example" } },
          content: { data: [] },
        },
      });
      expect(global).to.eql({
        site: {
          keywords: "section=sport",
          ext: { data: { site_name: "Example" } },
        },
      });
    });

    it("should not add empty keywords or an empty site.ext.data", async function () {
      const global = await mergeResponse({
        site: { keywords: " , ", ext: { data: {} }, content: { data: [] } },
      });
      expect(global).to.eql({});
    });

    it("should merge both through a guard that denies user first-party data", async function () {
      // enrichUfpd / transmitUfpd protect user.* only: site.keywords and
      // site.ext.data describe the page, not the user.
      const fragments = { global: {}, bidder: {} };
      const guard = ortb2FragmentsGuardFactory(
        ortb2GuardFactory((activity) => !["enrichUfpd", "transmitUfpd"].includes(activity))
      );
      await mergeResponse(FPD_RESPONSE, fragments.global, guard(fragments, {}));
      expect(fragments.global.site.keywords).to.equal(
        "football,transfers,section=sport,edition=uk"
      );
      expect(fragments.global.site.ext.data).to.eql(FPD_RESPONSE.site.ext.data);
      expect(fragments.global).to.not.have.property("user");
    });

    it("should not add either field to an auction whose consent does not allow enrichment", async function () {
      subModuleObj.init(VALID_CONFIG, {});
      respond200(FPD_RESPONSE);
      await flushMicrotasks();
      const req = { ortb2Fragments: { global: {} } };
      subModuleObj.getBidRequestData(req, sinon.spy(), VALID_CONFIG, {
        gdpr: { gdprApplies: true, vendorData: { purpose: { consents: { 1: true } } } },
      });
      expect(req.ortb2Fragments.global).to.eql({});
    });
  });

  describe("getBidRequestData – nothing to add", function () {
    async function mergeResponse(body, global = {}) {
      subModuleObj.init(VALID_CONFIG, {});
      respond200(body);
      await flushMicrotasks();
      const req = { ortb2Fragments: { global } };
      subModuleObj.getBidRequestData(req, sinon.spy(), VALID_CONFIG);
      return req.ortb2Fragments.global;
    }

    it("should leave ortb2 untouched when the enrichment carries no data", async function () {
      const global = await mergeResponse({ site: { content: { data: [] } }, user: { data: [] } });
      expect(global).to.eql({});
    });

    it("should not add an empty site.content.data when only id/title come back", async function () {
      const global = await mergeResponse({
        site: { content: { title: "Only a title", data: [] } },
      });
      expect(global.site.content).to.eql({ title: "Only a title" });
      expect(global).to.not.have.property("user");
    });

    it("should write categories without creating site.content when there is no content", async function () {
      const global = await mergeResponse({
        site: { cattax: 2, pagecat: ["IAB19-6"], content: { data: [] } },
      });
      expect(global).to.eql({ site: { cattax: 2, pagecat: ["IAB19-6"] } });
    });

    it("should not touch the publisher's user object when there are no user segments", async function () {
      const publisherUser = { yob: 1990 };
      const global = await mergeResponse(
        { site: { content: { data: [] } } },
        { user: publisherUser }
      );
      expect(global.user).to.equal(publisherUser);
      expect(publisherUser).to.eql({ yob: 1990 });
    });
  });

  describe("single-page app navigation (articleIdMode: path)", function () {
    let refererStub;
    let page;
    const PATH_CONFIG = {
      ...VALID_CONFIG,
      params: { ...VALID_CONFIG.params, articleIdMode: "path", articleId: undefined },
    };
    const navigate = (path) => {
      page = `https://example.com${path}`;
    };
    const articleResponse = (title) => {
      const body = JSON.parse(JSON.stringify(VALID_API_RESPONSE));
      body.site.content.title = title;
      return body;
    };
    const respondTo = (request, body) =>
      request.respond(200, { "Content-Type": "application/json" }, JSON.stringify(body));
    const auction = (cfg = PATH_CONFIG, delay = AUCTION_DELAY) => {
      const req = { ortb2Fragments: { global: {} } };
      const cb = sinon.spy();
      subModuleObj.getBidRequestData(req, cb, cfg, {}, delay);
      return { req, cb };
    };

    beforeEach(function () {
      navigate("/news/a");
      refererStub = sinon
        .stub(refererDetection, "getRefererInfo")
        .callsFake(() => ({ page, domain: "example.com" }));
    });

    afterEach(function () {
      refererStub.restore();
    });

    it("should load and merge the new article after the URL changes", async function () {
      subModuleObj.init(PATH_CONFIG, {});
      respondTo(server.requests[0], articleResponse("Article A"));
      await flushMicrotasks();
      expect(auction().req.ortb2Fragments.global.site.content.title).to.equal("Article A");

      navigate("/news/b");
      const { req, cb } = auction();
      expect(server.requests).to.have.length(2);
      expect(server.requests[1].url).to.contain("articleId=%2Fnews%2Fb");
      expect(cb.called).to.be.false;

      respondTo(server.requests[1], articleResponse("Article B"));
      await flushMicrotasks();
      expect(cb.calledOnce).to.be.true;
      expect(req.ortb2Fragments.global.site.content.title).to.equal("Article B");
      expect(getAuctionEnrichment(req.auctionId).enrichment.articleId).to.equal("/news/b");
    });

    it("should release auctions still waiting for the previous article at once", async function () {
      subModuleObj.init(PATH_CONFIG, {});
      const first = auction();
      expect(first.cb.called).to.be.false;

      navigate("/news/b");
      auction();
      expect(first.cb.calledOnce).to.be.true;
      expect(getAuctionEnrichment(first.req.auctionId).status).to.equal("unavailable");
      expect(first.req.ortb2Fragments.global).to.eql({});
    });

    it("should ignore the previous article's fetch when it settles late", async function () {
      subModuleObj.init(PATH_CONFIG, {});
      const staleRequest = server.requests[0];
      navigate("/news/b");
      auction();
      respondTo(server.requests[1], articleResponse("Article B"));
      await flushMicrotasks();
      try {
        respondTo(staleRequest, articleResponse("Article A"));
      } catch (e) {
        // the superseded request may already be aborted
      }
      await flushMicrotasks();

      expect(auction().req.ortb2Fragments.global.site.content.title).to.equal("Article B");
    });

    it("should enrich at once, without a request, when returning to an article seen earlier", async function () {
      const memoryConfig = {
        ...PATH_CONFIG,
        params: { ...PATH_CONFIG.params, cache: { storage: "memory" } },
      };
      subModuleObj.init(memoryConfig, {});
      respondTo(server.requests[0], articleResponse("Article A"));
      await flushMicrotasks();
      navigate("/news/b");
      auction(memoryConfig);
      respondTo(server.requests[1], articleResponse("Article B"));
      await flushMicrotasks();

      navigate("/news/a");
      // core is not waiting for us (no auctionDelay): only a synchronous cache hit can enrich it
      const { req, cb } = auction(memoryConfig, 0);
      expect(cb.calledOnce).to.be.true;
      expect(server.requests).to.have.length(2);
      expect(req.ortb2Fragments.global.site.content.title).to.equal("Article A");
    });

    it("should keep each article in sessionStorage once an auction allows it, and reuse it on return", async function () {
      const stored = new Map();
      storageSetStub.callsFake((key, value) => stored.set(key, value));
      storageGetStub.callsFake((key) => stored.get(key) ?? null);
      gdprDataHandler.enable(); // a CMP is on the page; reset by the outer afterEach

      subModuleObj.init(PATH_CONFIG, {}); // consent not known yet
      respondTo(server.requests[0], articleResponse("Article A"));
      await flushMicrotasks();
      expect(stored.size).to.equal(0);

      gdprDataHandler.setConsentData({ gdprApplies: false }); // the CMP answers
      navigate("/news/b");
      auction(); // consent allows it: article A is saved before moving on
      expect(stored.size).to.equal(1);
      respondTo(server.requests[1], articleResponse("Article B"));
      await flushMicrotasks();
      expect(stored.size).to.equal(2);

      navigate("/news/a");
      // core is not waiting for us (no auctionDelay): only a synchronous cache hit can enrich it
      const { req, cb } = auction(PATH_CONFIG, 0);
      expect(cb.calledOnce).to.be.true;
      expect(server.requests).to.have.length(2);
      expect(req.ortb2Fragments.global.site.content.title).to.equal("Article A");
    });

    it("should keep at most 20 articles in the in-memory cache", async function () {
      const memoryConfig = {
        ...PATH_CONFIG,
        params: { ...PATH_CONFIG.params, cache: { storage: "memory" } },
      };
      navigate("/news/0");
      subModuleObj.init(memoryConfig, {});
      respondTo(server.requests[0], articleResponse("0"));
      await flushMicrotasks();
      for (let i = 1; i <= 20; i++) {
        navigate(`/news/${i}`);
        auction(memoryConfig);
        respondTo(server.requests[i], articleResponse(String(i)));
        await flushMicrotasks();
      }
      expect(server.requests).to.have.length(21);

      navigate("/news/20");
      auction(memoryConfig);
      navigate("/news/1");
      auction(memoryConfig);
      expect(server.requests).to.have.length(21); // both still cached

      navigate("/news/0");
      auction(memoryConfig);
      expect(server.requests).to.have.length(22); // the oldest was evicted
    });
  });

  describe("getBidRequestData – isolation between auctions", function () {
    it("should not let edits to one auction's ortb2 reach later auctions", async function () {
      subModuleObj.init(VALID_CONFIG, {});
      respond200(DUAL_TAXONOMY_API_RESPONSE);
      await flushMicrotasks();

      const first = { ortb2Fragments: { global: {} } };
      subModuleObj.getBidRequestData(first, sinon.spy(), VALID_CONFIG);
      const g1 = first.ortb2Fragments.global;
      // what a module or adapter running after us might do to this auction
      g1.site.pagecat.push("IAB9-1");
      g1.site.content.ext.otherVendor = { x: 1 };
      g1.site.content.data[0].segment[0].name = "mutated";
      g1.user.data[0].ext.addedBy = "other";

      const second = { ortb2Fragments: { global: {} } };
      subModuleObj.getBidRequestData(second, sinon.spy(), VALID_CONFIG);
      const g2 = second.ortb2Fragments.global;
      expect(g2.site.pagecat).to.eql(["IAB19-6"]);
      expect(g2.site.content.ext).to.not.have.property("otherVendor");
      expect(g2.site.content.data[0].segment[0]).to.not.have.property("name");
      expect(g2.user.data[0].ext).to.not.have.property("addedBy");
    });
  });

  describe("getBidRequestData – no avoidable waiting", function () {
    it("should release a consent-denied auction at once, even while the fetch is in flight", async function () {
      subModuleObj.init(VALID_CONFIG, {});
      const req = { auctionId: "a-denied", ortb2Fragments: { global: {} } };
      const cb = sinon.spy();
      subModuleObj.getBidRequestData(req, cb, VALID_CONFIG, { coppa: true }, 1000);
      expect(cb.calledOnce).to.be.true;
      expect(getAuctionEnrichment("a-denied").status).to.equal("noConsent");

      respond200(VALID_API_RESPONSE);
      await flushMicrotasks();
      expect(cb.calledOnce).to.be.true;
      expect(req.ortb2Fragments.global).to.eql({});
    });

    describe("when the publisher turns off ajax timeouts", function () {
      let clock;
      beforeEach(function () {
        config.setConfig({ disableAjaxTimeout: true });
        clock = sinon.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
      });
      afterEach(function () {
        clock.restore();
        config.resetConfig();
      });

      it("should still give up on a fetch that never settles", async function () {
        subModuleObj.init(VALID_CONFIG, {});
        clock.tick(3000);
        await flushMicrotasks();

        const cb = sinon.spy();
        subModuleObj.getBidRequestData(
          { auctionId: "a-after-hang", ortb2Fragments: { global: {} } },
          cb,
          VALID_CONFIG
        );
        expect(cb.calledOnce).to.be.true;
        expect(getAuctionEnrichment("a-after-hang").status).to.equal("unavailable");
      });
    });
  });

  describe("getBidRequestData – an auction that times out", function () {
    it("should not cancel the shared fetch, so later auctions are still enriched", async function () {
      const clock = sinon.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
      try {
        subModuleObj.init(VALID_CONFIG, {});
        const first = { ortb2Fragments: { global: {} } };
        const firstCb = sinon.spy();
        subModuleObj.getBidRequestData(first, firstCb, VALID_CONFIG, {}, 50);
        clock.tick(60);
        expect(firstCb.calledOnce).to.be.true;

        // the API answers after the first auction stopped waiting
        respond200(VALID_API_RESPONSE);
        await flushMicrotasks();

        expect(server.requests.length).to.equal(1);
        expect(storageSetStub.calledOnce).to.be.true;
        // the first auction is already under way: its ortb2 is left alone
        expect(first.ortb2Fragments.global).to.eql({});
        expect(firstCb.calledOnce).to.be.true;

        const second = { ortb2Fragments: { global: {} } };
        const secondCb = sinon.spy();
        subModuleObj.getBidRequestData(second, secondCb, VALID_CONFIG, {}, 50);
        expect(secondCb.calledOnce).to.be.true;
        expect(second.ortb2Fragments.global.site.content.data).to.have.length(1);
      } finally {
        clock.restore();
      }
    });
  });

  describe("getBidRequestData – consent known only at auction time", function () {
    const gdpr = (consents) => ({
      gdpr: {
        gdprApplies: true,
        vendorData: { purpose: { consents, legitimateInterests: { 1: true, 4: true } } },
      },
    });

    beforeEach(async function () {
      // init runs before the CMP has been queried: no consent data yet
      subModuleObj.init(VALID_CONFIG, {});
      respond200(VALID_API_RESPONSE);
      await flushMicrotasks();
    });

    it("should not merge when GDPR applies, whatever the purposes", function () {
      for (const consents of [{ 1: true }, {}, { 1: true, 4: true }]) {
        const req = { ortb2Fragments: { global: {} } };
        const cb = sinon.spy();
        subModuleObj.getBidRequestData(req, cb, VALID_CONFIG, gdpr(consents));
        expect(cb.calledOnce).to.be.true;
        expect(req.ortb2Fragments.global).to.eql({});
      }
    });

    it("should not merge when COPPA applies to the auction", function () {
      const req = { ortb2Fragments: { global: {} } };
      subModuleObj.getBidRequestData(req, sinon.spy(), VALID_CONFIG, { coppa: true });
      expect(req.ortb2Fragments.global).to.eql({});
    });

    it("should merge when the auction's gdpr object has no gdprApplies", function () {
      const req = { ortb2Fragments: { global: {} } };
      subModuleObj.getBidRequestData(req, sinon.spy(), VALID_CONFIG, {
        gdpr: { consentString: "CP" },
      });
      expect(req.ortb2Fragments.global.site.content.data).to.have.length(1);
    });

    it("should merge when the auction's consent says GDPR does not apply", function () {
      const req = { ortb2Fragments: { global: {} } };
      subModuleObj.getBidRequestData(req, sinon.spy(), VALID_CONFIG, {
        gdpr: { gdprApplies: false },
      });
      expect(req.ortb2Fragments.global.site.content.data).to.have.length(1);
    });
  });
});
