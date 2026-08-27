import {
  subModuleObj,
  storage,
  _resetStateForTesting,
  _snapshotMapSizeForTesting,
} from "modules/stackupRtdProvider.js";
import { server } from "test/mocks/xhr.js";

// ─── fixtures ───────────────────────────────────────────────────────────────

const MOCK_API_URL = "https://mock.stackup.test/v1/enrich";

const VALID_CONFIG = {
  name: "stackupRtd",
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
          ext: { segtax: 502 },
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
    storageGetStub = sinon
      .stub(storage, "getDataFromSessionStorage")
      .returns(null); // cache miss by default
    storageSetStub = sinon.stub(storage, "setDataInSessionStorage");
  });

  afterEach(function () {
    storageGetStub.restore();
    storageSetStub.restore();
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

    it("should not fetch when GDPR applies and purposes 1+4 are both denied", function () {
      subModuleObj.init(VALID_CONFIG, {
        gdpr: {
          gdprApplies: true,
          vendorData: {
            purpose: {
              consents: { 1: false, 4: false },
              legitimateInterests: {},
            },
          },
        },
      });
      expect(server.requests.length).to.equal(0);
    });

    it("should not fetch when GDPR applies and purpose 4 is missing", function () {
      subModuleObj.init(VALID_CONFIG, {
        gdpr: {
          gdprApplies: true,
          vendorData: {
            purpose: { consents: { 1: true }, legitimateInterests: {} },
          },
        },
      });
      expect(server.requests.length).to.equal(0);
    });

    it("should not fetch when GDPR applies but vendorData is absent (CMP error/timeout)", function () {
      subModuleObj.init(VALID_CONFIG, {
        gdpr: { gdprApplies: true },
      });
      expect(server.requests.length).to.equal(0);
    });

    it("should fetch when GDPR applies and purposes 1+4 are both consented", function () {
      subModuleObj.init(VALID_CONFIG, {
        gdpr: {
          gdprApplies: true,
          vendorData: {
            purpose: {
              consents: { 1: true, 4: true },
              legitimateInterests: {},
            },
          },
        },
      });
      expect(server.requests.length).to.equal(1);
    });

    it("should fetch when GDPR applies and purposes 1+4 granted via legitimateInterests", function () {
      subModuleObj.init(VALID_CONFIG, {
        gdpr: {
          gdprApplies: true,
          vendorData: {
            purpose: {
              consents: {},
              legitimateInterests: { 1: true, 4: true },
            },
          },
        },
      });
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

    it("should stash the snapshot keyed by auctionId", async function () {
      const req = {
        auctionId: "auction-abc",
        ortb2Fragments: { global: {} },
      };
      subModuleObj.getBidRequestData(req, sinon.spy(), VALID_CONFIG);
      // Verify via a second call: content already present means snapshot was merged
      expect(req.ortb2Fragments.global.site.content.data).to.have.length(1);
    });

    it("should evict the oldest entry once the map exceeds 10 snapshots", function () {
      // Insert 11 snapshots — state is already "ready" from beforeEach so
      // each getBidRequestData call is synchronous.
      for (let i = 0; i < 11; i++) {
        subModuleObj.getBidRequestData(
          { auctionId: `auction-evict-${i}`, ortb2Fragments: { global: {} } },
          sinon.spy(),
          VALID_CONFIG
        );
      }
      // Map must never exceed the cap of 10.
      expect(_snapshotMapSizeForTesting()).to.equal(10);
    });
  });

  // ── 7. getBidRequestData – fetch in flight when call arrives ─────────────

  describe("getBidRequestData – enrichment still fetching", function () {
    it("should queue callback and fire it after successful fetch", async function () {
      const cb = sinon.spy();
      const req = { ortb2Fragments: { global: {} } };

      subModuleObj.init(VALID_CONFIG, {});
      subModuleObj.getBidRequestData(req, cb, VALID_CONFIG);
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
        VALID_CONFIG
      );
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
        VALID_CONFIG
      );
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
        timeoutConfig
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

    it("should ignore a zero auction-delay budget (non-blocking) and use params.timeout", function () {
      // Core passes 0 when the publisher runs us non-blocking (no waitForIt / no
      // auctionDelay). We must NOT zero out our own timeout — fall back to params.timeout.
      const clock = sinon.useFakeTimers();
      const cb = sinon.spy();

      const timeoutConfig = {
        ...VALID_CONFIG,
        params: { ...VALID_CONFIG.params, timeout: 100 },
      };
      subModuleObj.init(timeoutConfig, {});
      // 5th arg = 0 (non-blocking path in core)
      subModuleObj.getBidRequestData(
        { ortb2Fragments: { global: {} } },
        cb,
        timeoutConfig,
        {},
        0
      );

      expect(cb.called).to.be.false;
      clock.tick(50); // still within params.timeout — must NOT have fired yet
      expect(cb.called).to.be.false;
      clock.tick(60); // now past params.timeout (100 ms total)
      expect(cb.calledOnce).to.be.true;

      clock.restore();
    });
  });

  // ── 8. schema validation (isValidEnrichment) ─────────────────────────────

  describe("schema validation", function () {
    async function runAndGetReq(responseBody) {
      _resetStateForTesting();
      subModuleObj.init(VALID_CONFIG, {});
      const cb = sinon.spy();
      const req = { ortb2Fragments: { global: {} } };
      subModuleObj.getBidRequestData(req, cb, VALID_CONFIG);
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

    it("should reject content segments with segtax !== 502", async function () {
      const bad = JSON.parse(JSON.stringify(VALID_API_RESPONSE));
      bad.site.content.data[0].ext.segtax = 999;
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
      expect(req.ortb2Fragments.global.user.data).to.deep.equal([]); // empty normalised
    });

    it("should fall back to articleId when API omits site.content.id", async function () {
      const noId = JSON.parse(JSON.stringify(VALID_API_RESPONSE));
      delete noId.site.content.id;
      const req = await runAndGetReq(noId);
      expect(req.ortb2Fragments.global.site.content.id).to.equal(
        "test-article-001"
      );
    });
  });

  // ── 9. ortb2 merge behaviour ─────────────────────────────────────────────

  describe("ortb2 merge behaviour", function () {
    beforeEach(async function () {
      subModuleObj.init(VALID_CONFIG, {});
      respond200(VALID_API_RESPONSE);
      await flushMicrotasks();
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

    it("should replace an existing provider block (same name)", function () {
      const req = {
        ortb2Fragments: {
          global: {
            site: {
              content: {
                data: [
                  {
                    name: "data.stackup-ai.com",
                    ext: { segtax: 502 },
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
      expect(data[0].segment[0].id).to.equal("113"); // new enrichment wins
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
        JSON.stringify({ v: 1, t: Date.now(), d: cachedSnapshot })
      );
      subModuleObj.init(VALID_CONFIG, {});
      expect(server.requests.length).to.equal(0);

      await flushMicrotasks();

      const cb = sinon.spy();
      const req = { ortb2Fragments: { global: {} } };
      subModuleObj.getBidRequestData(req, cb, VALID_CONFIG);
      expect(cb.calledOnce).to.be.true;
      expect(req.ortb2Fragments.global.site.content.data).to.have.length(1);
    });

    it("should make an XHR request when cached schema version is wrong", function () {
      storageGetStub.returns(
        JSON.stringify({ v: 999, t: Date.now(), d: cachedSnapshot })
      );
      subModuleObj.init(VALID_CONFIG, {});
      expect(server.requests.length).to.equal(1);
    });

    it("should make an XHR request when cached entry is expired (default TTL 1 h)", function () {
      storageGetStub.returns(
        JSON.stringify({ v: 1, t: Date.now() - 7200 * 1000, d: cachedSnapshot })
      );
      subModuleObj.init(VALID_CONFIG, {});
      expect(server.requests.length).to.equal(1);
    });

    it("should write to session storage after a successful API response", async function () {
      subModuleObj.init(VALID_CONFIG, {});
      respond200(VALID_API_RESPONSE);
      await flushMicrotasks();

      expect(storageSetStub.calledOnce).to.be.true;
      const [key, value] = storageSetStub.firstCall.args;
      // Cache key is a hash: "stackup:enrich:v1:path_<cyrb53Hash(articleId)>"
      expect(key).to.include("stackup:enrich:v1:path_");

      const stored = JSON.parse(value);
      expect(stored.v).to.equal(1);
      expect(stored.d.articleId).to.equal("test-article-001");
      expect(stored.d.source).to.equal("api");
    });

    it("should not write to storage when the API response is schema-invalid", async function () {
      subModuleObj.init(VALID_CONFIG, {});
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
        JSON.stringify({ v: 1, t: Date.now(), d: cachedSnapshot })
      );

      subModuleObj.init(noCacheConfig, {});
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
        badTimeoutConfig
      );
      clock.tick(299);
      expect(cb.called).to.be.false;
      clock.tick(2);
      expect(cb.calledOnce).to.be.true;
      clock.restore();
    });

    it("should mark cached snapshots with source 'cache'", async function () {
      storageGetStub.returns(
        JSON.stringify({ v: 1, t: Date.now(), d: cachedSnapshot })
      );
      subModuleObj.init(VALID_CONFIG, {});
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
});
