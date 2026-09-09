// This file is the upstream prebid/Prebid.js submission spec: browser-safe
// (karma/mocha/chai — describe/it/beforeEach/afterEach are runner globals,
// both under Prebid's karma-mocha and under the in-repo vitest with
// `globals: true`), no node imports, no vitest imports. `pnpm
// export-upstream` emits it with only the two stub imports below rewritten
// to Prebid's webpack-alias form (`modules/…`, `src/…`). Repo-only tests
// (golden fixture, export invariants) live in adswagBidAdapter_repo_spec.js,
// which also pins THIS file's upstream-safety.
import { expect } from "chai";

import { dep, spec, storage } from "modules/adswagBidAdapter.js";
import { config } from "src/config.js";

// Everything below lives in ONE outer describe: mocha attaches file-scope
// hooks to the ROOT suite, so a bare beforeEach here would run before every
// test of every OTHER module in Prebid's bundled karma run (and its
// config.resetConfig() wrecked sibling suites that configure in before()).
// The outer describe scopes the hook to this adapter's tests only.
describe("adswagBidAdapter", () => {
  // No adapter-side default in the in-repo module: this is the explicit
  // test-config endpoint every test in this file relies on unless it is
  // specifically exercising endpoint resolution (the "endpoint configuration"
  // describe block below). In the exported upstream artifact the hardcoded
  // production DEFAULT_ENDPOINT exists, but this explicit setConfig takes
  // precedence over it, so the suite is valid against both variants. The
  // host must live under adswag.ai: the upstream variant honors endpoint
  // overrides only on Adswag-operated hosts (endpoint domains are not
  // variable — review checklist), and this suite runs against both variants.
  const TEST_ENDPOINT = "https://bid.test.adswag.ai/prebid/bid";

  // --- helpers ---------------------------------------------------------------

  function makeBid(overrides = {}) {
    return {
      bidder: "adswag",
      bidId: "bid-1",
      adUnitCode: "div-ad-300x250-2",
      mediaTypes: { banner: { sizes: [[300, 250], [300, 600]] } },
      ortb2Imp: { ext: { gpid: "/pub-nl-news-1/sport#div-ad-300x250-2" } },
      params: { publisherId: "pub-nl-news-1" },
      ...overrides,
    };
  }

  function makeVideoBid(videoOverrides = {}, bidOverrides = {}) {
    return makeBid({
      bidId: "bid-v1",
      adUnitCode: "div-video-player",
      mediaTypes: {
        video: {
          context: "instream",
          playerSize: [[640, 480]],
          mimes: ["video/mp4", "video/webm"],
          minduration: 5,
          maxduration: 30,
          protocols: [2, 3, 7, 8],
          ...videoOverrides,
        },
      },
      ortb2Imp: { ext: { gpid: "/pub-nl-news-1/video#player" } },
      ...bidOverrides,
    });
  }

  // Feature-gated suites: FEATURES.* is a compile-time constant in real
  // Prebid builds (the babel plugin replaces the member expression with a
  // boolean literal), so runtime toggling is impossible there. Suites that
  // need a flag register conditionally — the upstream convention for
  // feature-dependent adapter tests (Prebid's test pipeline forbids
  // describe.skip, so the disabled case must not register at all). The
  // disabled-path behavior is covered by the repo-only companion suite
  // (adswagBidAdapter_repo_spec.js), whose stub env reads FEATURES at
  // runtime and can toggle it.
  const describeIfAudio = FEATURES.AUDIO ? describe : () => {};

  function makeAudioBid(audioOverrides = {}, bidOverrides = {}) {
    return makeBid({
      bidId: "bid-a1",
      adUnitCode: "div-audio-slot",
      mediaTypes: {
        audio: {
          mimes: ["audio/mpeg", "audio/mp4"],
          minduration: 10,
          maxduration: 30,
          protocols: [2, 3, 7, 8],
          ...audioOverrides,
        },
      },
      ortb2Imp: { ext: { gpid: "/pub-nl-news-1/audio#slot" } },
      ...bidOverrides,
    });
  }

  function makeBidderRequest(overrides = {}) {
    return {
      bidderRequestId: "req-abc",
      timeout: 300,
      refererInfo: { page: "https://nlnews.example.nl/sport", domain: "nlnews.example.nl" },
      ortb2: {},
      ...overrides,
    };
  }

  function parseRequest(serverRequests) {
    return JSON.parse(serverRequests[0].data);
  }

  beforeEach(() => {
    config.resetConfig();
    // Explicit config endpoint, matching how a real dev/test integration must
    // configure the adapter when there is no built-in default. Tests
    // exercising resolution itself override/unset this.
    config.setConfig({ adswag: { endpoint: TEST_ENDPOINT } });
  });

  // --- spec object shape -----------------------------------------------------

  describe("adswagBidAdapter spec object", () => {
    it("registers the adswag bidder code and the served media types", () => {
      expect(spec.code).to.equal("adswag");
      // Native is deliberately absent (owner decision 2026-08-10): a media
      // type is declared only when its documented test unit consistently
      // returns creatives, per Prebid's submission checklist. Native returns
      // as a follow-up when platform-side serving ships.
      // AUDIO rides the FEATURES.AUDIO build flag: audio-less builds must
      // not advertise audio support (the gate matches validation/imp
      // building). supportedMediaTypes is fixed at module load, so assert
      // against the flag's load-time value.
      const expected = FEATURES.AUDIO
        ? ["banner", "video", "audio"]
        : ["banner", "video"];
      expect(spec.supportedMediaTypes).to.deep.equal(expected);
    });

    it("declares the TCF device-storage disclosure URL", () => {
      // Consumed by Prebid's metadata pipeline; must match the JSON the GVL
      // vendor-1417 entry declares (adswag_uuid localStorage+cookie, aswg_uid).
      expect(spec.disclosureURL).to.equal(
        "https://content.adswag.ai/iab/vendorjson.json",
      );
    });

    it("declares the IAB TCF vendor id (GVL 1417)", () => {
      // Prebid core may block bidders without a gvlid when GDPR applies —
      // launch-relevant for an EU-only platform, not cosmetic.
      expect(spec.gvlid).to.equal(1417);
    });

    it("exposes the required spec functions", () => {
      for (const fn of ["isBidRequestValid", "buildRequests", "interpretResponse"]) {
        expect(typeof spec[fn]).to.equal("function");
      }
    });
  });

  // --- isBidRequestValid -----------------------------------------------------

  describe("isBidRequestValid", () => {
    const cases = [
      ["valid: publisherId + banner sizes", makeBid(), true],
      ["missing publisherId", makeBid({ params: {} }), false],
      ["empty publisherId", makeBid({ params: { publisherId: "  " } }), false],
      ["non-string publisherId", makeBid({ params: { publisherId: 123 } }), false],
      [
        "no sizes at all",
        makeBid({ mediaTypes: { banner: {} }, sizes: undefined }),
        false,
      ],
      [
        "sizes only via bid.sizes",
        makeBid({ mediaTypes: {}, sizes: [[728, 90]] }),
        true,
      ],
      ["null bid (fail-open)", null, false],
      ["undefined bid (fail-open)", undefined, false],
    ];

    cases.forEach(([name, bid, expected]) => {
      it(`${name} → ${expected}`, () => {
        expect(spec.isBidRequestValid(bid)).to.equal(expected);
      });
    });

    const videoCases = [
      ["video: mimes + playerSize", makeVideoBid(), true],
      [
        "video: mimes without playerSize (lenient)",
        makeVideoBid({ playerSize: undefined }),
        true,
      ],
      [
        "video: playerSize as flat [w,h]",
        makeVideoBid({ playerSize: [640, 360] }),
        true,
      ],
      ["video: no mimes → invalid", makeVideoBid({ mimes: undefined }), false],
      ["video: empty mimes → invalid", makeVideoBid({ mimes: [] }), false],
      [
        "video: mimes supplied via params.video override",
        makeVideoBid(
          { mimes: undefined },
          { params: { publisherId: "p", video: { mimes: ["video/mp4"] } } },
        ),
        true,
      ],
      ["video: outstream context", makeVideoBid({ context: "outstream" }), true],
      [
        "video: missing publisherId still invalid",
        makeVideoBid({}, { params: {} }),
        false,
      ],
      [
        "mixed unit: valid banner + broken video → still valid",
        makeBid({
          mediaTypes: {
            banner: { sizes: [[300, 250]] },
            video: { context: "instream" }, // no mimes
          },
        }),
        true,
      ],
      [
        "mixed unit: broken banner + valid video → still valid",
        makeBid({
          mediaTypes: {
            banner: {},
            video: { mimes: ["video/mp4"], playerSize: [[640, 480]] },
          },
          sizes: undefined,
        }),
        true,
      ],
    ];

    videoCases.forEach(([name, bid, expected]) => {
      it(`${name} → ${expected}`, () => {
        expect(spec.isBidRequestValid(bid)).to.equal(expected);
      });
    });
  });

  // --- buildRequests ---------------------------------------------------------

  describe("buildRequests", () => {
    it("produces one POST to the configured endpoint", () => {
      const reqs = spec.buildRequests([makeBid()], makeBidderRequest());
      expect(reqs).to.have.lengthOf(1);
      expect(reqs[0].method).to.equal("POST");
      expect(reqs[0].url).to.equal(TEST_ENDPOINT);
    });

    // withCredentials is consent-conditional (credentials ride only with
    // identity consent) — asserted per
    // permutation in the "identity consent gate" table below.

    it("honors a per-bid endpoint override", () => {
      const url = "https://per-bid.test.adswag.ai/prebid/bid";
      const reqs = spec.buildRequests(
        [makeBid({ params: { publisherId: "p", endpoint: url } })],
        makeBidderRequest(),
      );
      expect(reqs[0].url).to.equal(url);
    });

    it("honors a global config endpoint override", () => {
      const url = "https://cfg.test.adswag.ai/prebid/bid";
      config.setConfig({ adswag: { endpoint: url } });
      const reqs = spec.buildRequests([makeBid()], makeBidderRequest());
      expect(reqs[0].url).to.equal(url);
    });

    it("maps the imp shape the server reads (id, banner.format, gpid, adunitcode, cur)", () => {
      const body = parseRequest(spec.buildRequests([makeBid()], makeBidderRequest()));
      expect(body.cur).to.deep.equal(["EUR"]);
      expect(body.imp).to.have.lengthOf(1);
      const imp = body.imp[0];
      expect(imp.id).to.equal("bid-1");
      expect(imp.banner.format).to.deep.equal([{ w: 300, h: 250 }, { w: 300, h: 600 }]);
      expect(imp.banner.w).to.equal(300);
      expect(imp.banner.h).to.equal(250);
      expect(imp.ext.gpid).to.equal("/pub-nl-news-1/sport#div-ad-300x250-2");
      expect(imp.ext.data.adunitcode).to.equal("div-ad-300x250-2");
      expect(body.site.publisher.id).to.equal("pub-nl-news-1");
      expect(body.site.page).to.equal("https://nlnews.example.nl/sport");
      expect(body.tmax).to.equal(300);
    });

    it("carries an explicit placementId override into imp.ext.adswag", () => {
      const body = parseRequest(
        spec.buildRequests(
          [makeBid({ params: { publisherId: "p", placementId: "plc-x" } })],
          makeBidderRequest(),
        ),
      );
      expect(body.imp[0].ext.adswag).to.deep.equal({ placement_id: "plc-x" });
    });

    it("reads a floor from getFloor (Prebid floors module)", () => {
      const bid = makeBid({
        getFloor: () => ({ floor: 0.62, currency: "EUR" }),
      });
      const body = parseRequest(spec.buildRequests([bid], makeBidderRequest()));
      expect(body.imp[0].bidfloor).to.equal(0.62);
      expect(body.imp[0].bidfloorcur).to.equal("EUR");
    });

    it("forwards the floors-module floor verbatim — never re-rounded", () => {
      // The Price Floors module deliberately rounds UP, to four decimals.
      // Re-rounding to two here would hand the endpoint 1.33 for a 1.3334
      // floor: a lower floor than the publisher configured, admitting bids
      // the floor exists to reject.
      const bid = makeBid({ getFloor: () => ({ floor: 1.3334, currency: "EUR" }) });
      const body = parseRequest(spec.buildRequests([bid], makeBidderRequest()));
      expect(body.imp[0].bidfloor).to.equal(1.3334);
    });

    it("falls back to params.bidFloor when getFloor is absent", () => {
      const bid = makeBid({ params: { publisherId: "p", bidFloor: 1.25 } });
      const body = parseRequest(spec.buildRequests([bid], makeBidderRequest()));
      expect(body.imp[0].bidfloor).to.equal(1.25);
      expect(body.imp[0].bidfloorcur).to.equal("EUR");
    });

    it("forwards a static params.bidFloor verbatim too", () => {
      const bid = makeBid({ params: { publisherId: "p", bidFloor: 0.4567 } });
      const body = parseRequest(spec.buildRequests([bid], makeBidderRequest()));
      expect(body.imp[0].bidfloor).to.equal(0.4567);
    });

    it("fails open when getFloor throws — no floor, still builds the imp", () => {
      const bid = makeBid({
        getFloor: () => {
          throw new Error("floors module error");
        },
      });
      const body = parseRequest(spec.buildRequests([bid], makeBidderRequest()));
      expect(body.imp[0].bidfloor).to.be.undefined;
      expect(body.imp[0].id).to.equal("bid-1");
    });

    it("forwards TCF consent to user.ext.consent and both regs.gdpr locations", () => {
      const bidderRequest = makeBidderRequest({
        gdprConsent: { gdprApplies: true, consentString: "CONSENT-STRING" },
      });
      const body = parseRequest(spec.buildRequests([makeBid()], bidderRequest));
      expect(body.user.ext.consent).to.equal("CONSENT-STRING");
      expect(body.regs.gdpr).to.equal(1);
      expect(body.regs.ext.gdpr).to.equal(1);
    });

    it("sets regs.gdpr = 0 when gdpr does not apply", () => {
      const bidderRequest = makeBidderRequest({
        gdprConsent: { gdprApplies: false, consentString: "" },
      });
      const body = parseRequest(spec.buildRequests([makeBid()], bidderRequest));
      expect(body.regs.gdpr).to.equal(0);
      expect(body.regs.ext.gdpr).to.equal(0);
    });

    it("forwards GPP consent to regs.gpp / regs.gpp_sid", () => {
      const bidderRequest = makeBidderRequest({
        gppConsent: { gppString: "GPP-STRING", applicableSections: [2, 6] },
      });
      const body = parseRequest(spec.buildRequests([makeBid()], bidderRequest));
      expect(body.regs.gpp).to.equal("GPP-STRING");
      expect(body.regs.gpp_sid).to.deep.equal([2, 6]);
    });

    it("forwards the supply chain from ortb2.source.ext.schain", () => {
      const schain = {
        complete: 1,
        ver: "1.0",
        nodes: [{ asi: "nlnews.example.nl", sid: "pub-nl-news-1", hp: 1 }],
      };
      const bidderRequest = makeBidderRequest({
        ortb2: { source: { ext: { schain } } },
      });
      const body = parseRequest(spec.buildRequests([makeBid()], bidderRequest));
      expect(body.source.ext.schain).to.deep.equal(schain);
    });

    it("ignores the legacy bid.schain location (upstream conformance)", () => {
      // Prebid review checklist: adapters cannot accept an schain parameter;
      // the conventional ortb2 location is the only read.
      const schain = { complete: 1, ver: "1.0", nodes: [] };
      const body = parseRequest(
        spec.buildRequests([makeBid({ schain })], makeBidderRequest()),
      );
      expect(body.source?.ext?.schain).to.be.undefined;
    });

    it("never forwards user identifiers when GDPR applies without a vendor-1417 grant", () => {
      const bidderRequest = makeBidderRequest({
        gdprConsent: { gdprApplies: true, consentString: "C" },
        ortb2: {
          user: { eids: [{ source: "example.com", uids: [{ id: "abc" }] }] },
        },
      });
      const body = parseRequest(spec.buildRequests([makeBid()], bidderRequest));
      expect(body.user.ext.consent).to.equal("C");
      expect(body.user.eids).to.be.undefined;
    });

    it("returns [] when there are no valid bids", () => {
      expect(spec.buildRequests([], makeBidderRequest())).to.deep.equal([]);
      expect(spec.buildRequests(null, null)).to.deep.equal([]);
    });

    it("fails open to [] when an internal error is thrown", () => {
      const exploding = makeBid();
      Object.defineProperty(exploding, "bidId", {
        get() {
          throw new Error("boom");
        },
      });
      expect(spec.buildRequests([exploding], makeBidderRequest())).to.deep.equal([]);
    });

    it("forwards ortb2.source.tid and ortb2Imp.ext.tid", () => {
      const bidderRequest = makeBidderRequest({
        ortb2: { source: { tid: "auction-tid-1" } },
      });
      const bid = makeBid({
        ortb2Imp: { ext: { gpid: "/g", tid: "imp-tid-1" } },
      });
      const body = parseRequest(spec.buildRequests([bid], bidderRequest));
      expect(body.source.tid).to.equal("auction-tid-1");
      expect(body.imp[0].ext.tid).to.equal("imp-tid-1");
    });

    it("handles absent transaction ids cleanly (deprecated fields never read)", () => {
      const body = parseRequest(spec.buildRequests([makeBid()], makeBidderRequest()));
      expect(body.source).to.be.undefined;
      expect(body.imp[0].ext.tid).to.be.undefined;
    });
  });

  // --- request grouping: endpoint + publisher attribution ---------------------
  //
  // site.publisher.id and the POST url are REQUEST-level, so bids are grouped
  // by (resolved endpoint, publisherId) and each group gets its own request.
  // A page carrying ad units of two different publisher accounts must not
  // report — and pay — every impression under whichever one came first.

  describe("buildRequests grouping", () => {
    function twoPublisherBids() {
      return [
        makeBid({
          bidId: "bid-pub-a",
          adUnitCode: "div-a",
          params: { publisherId: "pub-a" },
        }),
        makeBid({
          bidId: "bid-pub-b",
          adUnitCode: "div-b",
          params: { publisherId: "pub-b" },
        }),
      ];
    }

    it("emits one request per publisherId, each carrying only its own imps", () => {
      const reqs = spec.buildRequests(twoPublisherBids(), makeBidderRequest());
      expect(reqs).to.have.lengthOf(2);
      const bodies = reqs.map((r) => JSON.parse(r.data));

      // The money-relevant assertion: each publisher's impressions are sent
      // under that publisher's own account.
      expect(bodies[0].site.publisher.id).to.equal("pub-a");
      expect(bodies[1].site.publisher.id).to.equal("pub-b");

      // Disjoint imps — no impression appears in more than one request.
      expect(bodies[0].imp.map((i) => i.id)).to.deep.equal(["bid-pub-a"]);
      expect(bodies[1].imp.map((i) => i.id)).to.deep.equal(["bid-pub-b"]);
    });

    it("gives every group a unique request id (bidderRequestId is not reused)", () => {
      const bodies = spec
        .buildRequests(twoPublisherBids(), makeBidderRequest())
        .map((r) => JSON.parse(r.data));
      // First group keeps the id Prebid gave us; the rest get fresh UUIDs.
      expect(bodies[0].id).to.equal("req-abc");
      expect(bodies[1].id).to.be.a("string").and.not.equal("");
      expect(bodies[1].id).to.not.equal(bodies[0].id);
    });

    it("keeps request-level fields on every group (consent, schain, tid, tmax, device)", () => {
      const schain = {
        complete: 1,
        ver: "1.0",
        nodes: [{ asi: "nlnews.example.nl", sid: "s", hp: 1 }],
      };
      const bidderRequest = makeBidderRequest({
        gdprConsent: { gdprApplies: true, consentString: "TC" },
        ortb2: {
          source: { tid: "auction-tid-1", ext: { schain } },
          device: { ua: "UA/1.0" },
        },
      });
      const bodies = spec
        .buildRequests(twoPublisherBids(), bidderRequest)
        .map((r) => JSON.parse(r.data));
      expect(bodies).to.have.lengthOf(2);
      bodies.forEach((body) => {
        expect(body.user.ext.consent).to.equal("TC");
        expect(body.regs.gdpr).to.equal(1);
        expect(body.source.ext.schain).to.deep.equal(schain);
        // The shared auction correlator across the groups' differing ids.
        expect(body.source.tid).to.equal("auction-tid-1");
        expect(body.device.ua).to.equal("UA/1.0");
        expect(body.tmax).to.equal(300);
        expect(body.cur).to.deep.equal(["EUR"]);
      });
    });

    it("keeps ad units of the SAME publisher in one request", () => {
      const bids = [
        makeBid({ bidId: "bid-1", adUnitCode: "div-1" }),
        makeBid({ bidId: "bid-2", adUnitCode: "div-2" }),
      ];
      const reqs = spec.buildRequests(bids, makeBidderRequest());
      expect(reqs).to.have.lengthOf(1);
      expect(JSON.parse(reqs[0].data).imp.map((i) => i.id)).to.deep.equal([
        "bid-1",
        "bid-2",
      ]);
    });

    it("splits on a differing endpoint too, and posts each group to its own url", () => {
      const other = "https://bid.other.adswag.ai/prebid/bid";
      const bids = [
        makeBid({ bidId: "bid-default" }),
        makeBid({
          bidId: "bid-override",
          adUnitCode: "div-override",
          params: { publisherId: "pub-nl-news-1", endpoint: other },
        }),
      ];
      const reqs = spec.buildRequests(bids, makeBidderRequest());
      expect(reqs).to.have.lengthOf(2);
      expect(reqs.map((r) => r.url)).to.deep.equal([TEST_ENDPOINT, other]);
      expect(reqs.map((r) => JSON.parse(r.data).imp[0].id)).to.deep.equal([
        "bid-default",
        "bid-override",
      ]);
    });

    it("carries only the group's own bids in the client-side meta array", () => {
      const bids = [
        makeBid({ bidId: "bid-pub-a", adUnitCode: "div-a", params: { publisherId: "pub-a" } }),
        makeVideoBid({}, {
          bidId: "bid-pub-b-video",
          adUnitCode: "div-b",
          params: { publisherId: "pub-b" },
        }),
      ];
      const reqs = spec.buildRequests(bids, makeBidderRequest());
      expect(reqs.map((r) => r.bidRequests.map((m) => m.bidId))).to.deep.equal([
        ["bid-pub-a"],
        ["bid-pub-b-video"],
      ]);
      // Per-group meta is what interpretResponse resolves media types from.
      expect(reqs[0].bidRequests[0].hasBanner).to.equal(true);
      expect(reqs[0].bidRequests[0].hasVideo).to.equal(false);
      expect(reqs[1].bidRequests[0].hasVideo).to.equal(true);
      expect(reqs[1].bidRequests[0].videoSize).to.deep.equal([640, 480]);
    });

    it("interpretResponse resolves each group's bids against that group's request", () => {
      const bids = [
        makeBid({ bidId: "bid-pub-a", adUnitCode: "div-a", params: { publisherId: "pub-a" } }),
        makeVideoBid({}, {
          bidId: "bid-pub-b-video",
          adUnitCode: "div-b",
          params: { publisherId: "pub-b" },
        }),
      ];
      const reqs = spec.buildRequests(bids, makeBidderRequest());

      const banner = spec.interpretResponse(
        {
          body: {
            cur: "EUR",
            seatbid: [
              { bid: [{ impid: "bid-pub-a", price: 1.5, crid: "c1", adm: "<div>ad</div>" }] },
            ],
          },
        },
        reqs[0],
      );
      expect(banner[0].mediaType).to.equal("banner");
      expect([banner[0].width, banner[0].height]).to.deep.equal([300, 250]);

      const video = spec.interpretResponse(
        {
          body: {
            cur: "EUR",
            seatbid: [
              {
                bid: [
                  {
                    impid: "bid-pub-b-video",
                    price: 2.5,
                    crid: "c2",
                    adm: "<VAST version=\"4.2\"></VAST>",
                  },
                ],
              },
            ],
          },
        },
        reqs[1],
      );
      expect(video[0].mediaType).to.equal("video");
      expect([video[0].width, video[0].height]).to.deep.equal([640, 480]);
    });
  });

  // --- endpoint configuration -------------------------------------------------
  //
  // Endpoint resolution: params.endpoint > setConfig({adswag:{endpoint}}) >
  // DEFAULT_ENDPOINT. The block between the markers below is variant-specific
  // and swapped by the export script alongside the module's endpoint constant:
  // the in-repo build has no default (unconfigured ⇒ fail-open no-bid),
  // while the upstream prebid/Prebid.js artifact hardcodes the
  // production endpoint (Module Rule 9).

  describe("endpoint configuration", () => {
    // These tests are generated by the Adswag release tooling; the
    // self-distributed variant of this suite asserts the inverse (no built-in
    // default ⇒ an unconfigured adapter must no-bid).
    it("uses the built-in production endpoint when nothing is configured", () => {
      config.resetConfig();
      const reqs = spec.buildRequests([makeBid()], makeBidderRequest());
      expect(reqs[0].url).to.equal("https://bid.adswag.ai/prebid/bid");
    });

    it("falls back to the built-in endpoint on a whitespace-only global config endpoint", () => {
      config.resetConfig();
      config.setConfig({ adswag: { endpoint: "   " } });
      const reqs = spec.buildRequests([makeBid()], makeBidderRequest());
      expect(reqs[0].url).to.equal("https://bid.adswag.ai/prebid/bid");
    });

    it("falls back to the built-in endpoint on a whitespace-only per-bid endpoint param", () => {
      config.resetConfig();
      const bid = makeBid({ params: { publisherId: "p", endpoint: "  " } });
      const reqs = spec.buildRequests([bid], makeBidderRequest());
      expect(reqs[0].url).to.equal("https://bid.adswag.ai/prebid/bid");
    });

    it("ignores an endpoint override off the adswag.ai domain (endpoint domains are not variable)", () => {
      config.resetConfig();
      const bid = makeBid({
        params: { publisherId: "p", endpoint: "https://collector.example.com/prebid/bid" },
      });
      const reqs = spec.buildRequests([bid], makeBidderRequest());
      expect(reqs[0].url).to.equal("https://bid.adswag.ai/prebid/bid");
    });

    it("ignores a global config endpoint off the adswag.ai domain", () => {
      config.resetConfig();
      config.setConfig({ adswag: { endpoint: "https://collector.example.com/prebid/bid" } });
      const reqs = spec.buildRequests([makeBid()], makeBidderRequest());
      expect(reqs[0].url).to.equal("https://bid.adswag.ai/prebid/bid");
    });

    it("honors an endpoint override on an adswag.ai host (Adswag dev/staging integrations)", () => {
      config.resetConfig();
      config.setConfig({ adswag: { endpoint: "https://bid.dev.adswag.ai/prebid/bid" } });
      const reqs = spec.buildRequests([makeBid()], makeBidderRequest());
      expect(reqs[0].url).to.equal("https://bid.dev.adswag.ai/prebid/bid");
    });

    it("an ignored off-domain override does not split the batch (both bids ride the built-in endpoint)", () => {
      // With a built-in default the endpoint always resolves, so an ignored
      // override leaves both ad units in the same publisher/endpoint group.
      config.resetConfig();
      const bids = [
        makeBid({ bidId: "bid-1" }),
        makeBid({
          bidId: "bid-2",
          adUnitCode: "div-2",
          params: { publisherId: "pub-nl-news-1", endpoint: "https://collector.example.com/prebid/bid" },
        }),
      ];
      const reqs = spec.buildRequests(bids, makeBidderRequest());
      expect(reqs).to.have.lengthOf(1);
      expect(reqs[0].url).to.equal("https://bid.adswag.ai/prebid/bid");
      expect(JSON.parse(reqs[0].data).imp.map((i) => i.id)).to.deep.equal(["bid-1", "bid-2"]);
    });

    it("a per-bid endpoint override wins over a global config endpoint", () => {
      // beforeEach already set adswag.endpoint = TEST_ENDPOINT globally.
      const url = "https://per-bid.test.adswag.ai/prebid/bid";
      const bid = makeBid({ params: { publisherId: "p", endpoint: url } });
      const reqs = spec.buildRequests([bid], makeBidderRequest());
      expect(reqs[0].url).to.equal(url);
    });
  });

  // --- identity waterfall (consent-gated, graduated 2026-07-13) ---------------

  function fullConsent(
    vendorData = {
      vendor: { consents: { 1417: true } },
      purpose: { consents: { 1: true } },
    },
  ) {
    return { gdprApplies: true, consentString: "TC-FULL", vendorData };
  }

  const EID_A = { source: "id-a.example", uids: [{ id: "a-1", atype: 1 }] };
  const EID_B = { source: "id-b.example", uids: [{ id: "b-1", atype: 1 }] };

  // Patches the module's exported StorageManager for the duration of fn.
  // This is the only cross-environment seam: swapping window is impossible in
  // a real browser (window is a getter-only self reference), and Prebid's
  // real manager routes through core activity controls — patching the
  // manager's own methods works identically against both.
  function withStorage(overrides, fn) {
    const patched = Object.keys(overrides);
    const prev = {};
    patched.forEach((k) => {
      prev[k] = storage[k];
      storage[k] = overrides[k];
    });
    try {
      return fn();
    } finally {
      patched.forEach((k) => {
        storage[k] = prev[k];
      });
    }
  }

  function makeFakeLocalStorage() {
    const store = new Map();
    return {
      setItem: (k, v) => store.set(k, String(v)),
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      removeItem: (k) => store.delete(k),
      store,
    };
  }

  function makeFakeCookieDocument() {
    const jar = new Map();
    const writes = [];
    return {
      get cookie() {
        return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
      },
      set cookie(str) {
        writes.push(str);
        // browsers trim whitespace around the value, so does this jar
        const pair = str.split(";")[0];
        const i = pair.indexOf("=");
        jar.set(pair.slice(0, i).trim(), pair.slice(i + 1).trim());
      },
      jar,
      writes,
    };
  }

  // StorageManager overrides backed by a fake localStorage (cookies off).
  function localStorageOnlyManager(ls) {
    return {
      localStorageIsEnabled: () => true,
      getDataFromLocalStorage: (k) => ls.getItem(k),
      setDataInLocalStorage: (k, v) => ls.setItem(k, v),
      cookiesAreEnabled: () => false,
      getCookie: () => null,
      setCookie: () => {},
    };
  }

  // StorageManager overrides backed by a fake cookie jar (localStorage off).
  // Same cookie-string format as the real manager (`value ;expires=...`).
  function cookieOnlyManager(doc) {
    return {
      localStorageIsEnabled: () => false,
      getDataFromLocalStorage: () => null,
      setDataInLocalStorage: () => {},
      cookiesAreEnabled: () => true,
      getCookie: (name) => {
        const m = doc.cookie.match(
          "(^|;)\\s*" + name + "\\s*=\\s*([^;]*)\\s*(;|$)",
        );
        return m ? decodeURIComponent(m[2]) : null;
      },
      setCookie: (key, value, expires, sameSite, domain) => {
        doc.cookie =
          `${key}=${encodeURIComponent(value)}` +
          (expires ? ` ;expires=${expires}` : "") +
          "; path=/" +
          (domain ? ` ;domain=${encodeURIComponent(domain)}` : "") +
          (sameSite ? `; SameSite=${sameSite}` : "");
      },
    };
  }

  describe("identity consent gate (vendor 1417)", () => {
    // permutation → [eids attach, withCredentials]
    const cases = [
      ["no gdprConsent at all", undefined, true],
      ["gdprApplies false", { gdprApplies: false }, true],
      ["gdprApplies undefined", { consentString: "C" }, true],
      ["gdpr on + vendor 1417 + purpose 1", fullConsent(), true],
      [
        "gdpr on + vendor 1417 denied",
        fullConsent({ vendor: { consents: { 1417: false } } }),
        false,
      ],
      ["gdpr on + missing vendorData", fullConsent(null), false],
      ["gdpr on + vendorData not an object", fullConsent("garbage"), false],
      ["gdpr on + empty vendorData", fullConsent({}), false],
      [
        "gdpr on + malformed vendor block",
        fullConsent({ vendor: "broken", purpose: { consents: { 1: true } } }),
        false,
      ],
    ];

    cases.forEach(([name, gdprConsent, permitted]) => {
      it(`${name} → identity permitted: ${permitted}`, () => {
        const bid = makeBid({ userIdAsEids: [EID_A] });
        const reqs = spec.buildRequests([bid], makeBidderRequest({ gdprConsent }));
        // layer 3: credentialed transport tracks the same gate
        expect(reqs[0].options).to.deep.equal({ withCredentials: permitted });
        expect(parseRequest(reqs).user?.eids).to.deep.equal(
          permitted ? [EID_A] : undefined,
        );
      });
    });
  });

  describe("eids forwarding (layer 1)", () => {
    it("merges userIdAsEids with publisher eids from ortb2, deduped by (source, uids[0].id)", () => {
      const bid = makeBid({ userIdAsEids: [EID_A, EID_B] });
      const bidderRequest = makeBidderRequest({
        gdprConsent: fullConsent(),
        ortb2: {
          user: {
            eids: [EID_B, { source: "id-c.example", uids: [{ id: "c-1" }] }],
            ext: { eids: [EID_A] },
          },
        },
      });
      const body = parseRequest(spec.buildRequests([bid], bidderRequest));
      expect(body.user.eids).to.deep.equal([
        EID_A,
        EID_B,
        { source: "id-c.example", uids: [{ id: "c-1" }] },
      ]);
    });

    it("skips malformed eids (no source, empty uids, missing id) without throwing", () => {
      const bid = makeBid({
        userIdAsEids: [
          { uids: [{ id: "no-source" }] },
          { source: "id-a.example", uids: [] },
          { source: "id-a.example", uids: [{ id: "  " }] },
          "not-an-object",
          EID_A,
        ],
      });
      const body = parseRequest(
        spec.buildRequests([bid], makeBidderRequest({ gdprConsent: fullConsent() })),
      );
      expect(body.user.eids).to.deep.equal([EID_A]);
    });
  });

  describe("first-party UUID (layer 2)", () => {
    const UUID_RE = /^[0-9a-f-]{36}$/;

    function adswagEid(body) {
      // eid source adswag.ai — owner decision 2026-08-06 (matches the
      // endpoint + maintainer-contact domain family; frozen at submission).
      return (body.user?.eids || []).find((e) => e.source === "adswag.ai");
    }

    function build(bidderRequest = makeBidderRequest({ gdprConsent: fullConsent() })) {
      return parseRequest(spec.buildRequests([makeBid()], bidderRequest));
    }

    it("mints, persists (localStorage) and reuses adswag_uuid across auctions; reads a pre-existing one", () => {
      const localStorage = makeFakeLocalStorage();
      withStorage(localStorageOnlyManager(localStorage), () => {
        const first = adswagEid(build());
        expect(first.uids).to.have.lengthOf(1);
        expect(first.uids[0].id).to.match(UUID_RE);
        expect(first.uids[0].atype).to.equal(1);
        expect(localStorage.store.get("adswag_uuid")).to.equal(first.uids[0].id);
        expect(adswagEid(build()).uids[0].id).to.equal(first.uids[0].id);
        localStorage.setItem("adswag_uuid", "existing-uuid");
        expect(adswagEid(build()).uids[0].id).to.equal("existing-uuid");
      });
    });

    it("falls back to a 365d first-party cookie when localStorage is unavailable", () => {
      const document = makeFakeCookieDocument();
      withStorage(cookieOnlyManager(document), () => {
        const id = adswagEid(build()).uids[0].id;
        expect(document.jar.get("adswag_uuid")).to.equal(id);
        const write = document.writes[0];
        const expires = new Date(write.match(/expires=([^;]+)/)[1]).getTime();
        expect(expires - Date.now()).to.be.greaterThan(364 * 86400000);
        expect(expires - Date.now()).to.be.lessThan(366 * 86400000);
        // reuse on the next auction — no second mint
        expect(adswagEid(build()).uids[0].id).to.equal(id);
      });
    });

    it("purpose-1 denial: identity attaches, but no storage read/write and no adswag.ai eid", () => {
      const gdprConsent = fullConsent({
        vendor: { consents: { 1417: true } },
        purpose: { consents: { 1: false } },
      });
      // Record every data read/write — the purpose-1 gate must keep the
      // adapter from touching storage at all (enabled-probes tolerated).
      const calls = [];
      withStorage(
        {
          localStorageIsEnabled: () => true,
          cookiesAreEnabled: () => true,
          getDataFromLocalStorage: (k) => {
            calls.push(["get", k]);
            return null;
          },
          setDataInLocalStorage: (k, v) => {
            calls.push(["set", k, v]);
          },
          getCookie: (k) => {
            calls.push(["getCookie", k]);
            return null;
          },
          setCookie: (...args) => {
            calls.push(["setCookie", ...args]);
          },
        },
        () => {
          const bid = makeBid({ userIdAsEids: [EID_A] });
          const reqs = spec.buildRequests([bid], makeBidderRequest({ gdprConsent }));
          expect(reqs[0].options.withCredentials).to.equal(true); // layer 3 still on
          const body = parseRequest(reqs);
          expect(body.user.eids).to.deep.equal([EID_A]); // layer 1 still on
          expect(adswagEid(body)).to.be.undefined; // layer 2 off
          expect(calls).to.deep.equal([]); // no storage read or write
        },
      );
    });

    it("fails open when storage is unavailable or throws — no eid, no error, auction proceeds", () => {
      // all storage reported unavailable
      withStorage(
        {
          localStorageIsEnabled: () => false,
          cookiesAreEnabled: () => false,
          getDataFromLocalStorage: () => null,
          setDataInLocalStorage: () => {},
          getCookie: () => null,
          setCookie: () => {},
        },
        () => {
          const body = build();
          expect(adswagEid(body)).to.be.undefined;
          expect(body.imp).to.have.lengthOf(1);
        },
      );
      // every storage access throws
      const boom = () => {
        throw new Error("storage blocked");
      };
      withStorage(
        {
          localStorageIsEnabled: boom,
          cookiesAreEnabled: boom,
          getDataFromLocalStorage: boom,
          setDataInLocalStorage: boom,
          getCookie: boom,
          setCookie: boom,
        },
        () => {
          const body = build();
          expect(adswagEid(body)).to.be.undefined;
          expect(body.imp).to.have.lengthOf(1);
        },
      );
    });
  });

  // --- buildRequests: video ----------------------------------------------------

  describe("buildRequests video", () => {
    function videoImp(videoOverrides = {}, bidOverrides = {}) {
      const reqs = spec.buildRequests(
        [makeVideoBid(videoOverrides, bidOverrides)],
        makeBidderRequest(),
      );
      return parseRequest(reqs).imp[0];
    }

    it("maps the imp.video shape the server's OpenRTB video model reads", () => {
      const imp = videoImp();
      expect(imp.id).to.equal("bid-v1");
      expect(imp.banner).to.be.undefined;
      expect(imp.video).to.deep.equal({
        mimes: ["video/mp4", "video/webm"],
        minduration: 5,
        maxduration: 30,
        protocols: [2, 3, 7, 8],
        w: 640,
        h: 480,
        plcmt: 1, // instream
      });
    });

    it("maps playerSize as flat [w,h]", () => {
      const imp = videoImp({ playerSize: [640, 360] });
      expect(imp.video.w).to.equal(640);
      expect(imp.video.h).to.equal(360);
    });

    it("omits w/h when playerSize is absent", () => {
      const imp = videoImp({ playerSize: undefined });
      expect(imp.video.w).to.be.undefined;
      expect(imp.video.h).to.be.undefined;
    });

    it("maps context outstream → plcmt 4 (standalone; the server maps 2 and 4 to outstream)", () => {
      expect(videoImp({ context: "outstream" }).video.plcmt).to.equal(4);
    });

    it("prefers an explicit plcmt over the context-derived one", () => {
      expect(videoImp({ context: "outstream", plcmt: 2 }).video.plcmt).to.equal(2);
    });

    it("carries linearity, skip and skipafter", () => {
      const imp = videoImp({ linearity: 1, skip: 1, skipafter: 5 });
      expect(imp.video.linearity).to.equal(1);
      expect(imp.video.skip).to.equal(1);
      expect(imp.video.skipafter).to.equal(5);
    });

    it("carries skip: 0 (explicitly not skippable)", () => {
      expect(videoImp({ skip: 0 }).video.skip).to.equal(0);
    });

    it("lets params.video override the ad unit (Prebid 4.0 convention)", () => {
      const imp = videoImp(
        {},
        {
          params: {
            publisherId: "p",
            video: { maxduration: 15, protocols: [3] },
          },
        },
      );
      expect(imp.video.maxduration).to.equal(15);
      expect(imp.video.protocols).to.deep.equal([3]);
      expect(imp.video.mimes).to.deep.equal(["video/mp4", "video/webm"]); // ad unit kept
    });

    it("reads but never emits params the server has no field for (read broadly, emit narrowly)", () => {
      const imp = videoImp({
        startdelay: 0,
        placement: 1, // legacy 2.5 field
        minbitrate: 300,
        maxbitrate: 1500,
        delivery: [2],
        playbackmethod: [1],
        api: [2, 7],
      });
      for (const dropped of [
        "startdelay",
        "placement",
        "minbitrate",
        "maxbitrate",
        "delivery",
        "playbackmethod",
        "api",
      ]) {
        expect(imp.video[dropped]).to.be.undefined;
      }
      expect(imp.video.mimes).to.deep.equal(["video/mp4", "video/webm"]);
    });

    it("emits one imp with BOTH banner and video for a mixed unit", () => {
      const bid = makeBid({
        mediaTypes: {
          banner: { sizes: [[300, 250]] },
          video: { context: "instream", mimes: ["video/mp4"], playerSize: [[640, 480]] },
        },
      });
      const body = parseRequest(spec.buildRequests([bid], makeBidderRequest()));
      expect(body.imp).to.have.lengthOf(1);
      expect(body.imp[0].banner.format).to.deep.equal([{ w: 300, h: 250 }]);
      expect(body.imp[0].video.mimes).to.deep.equal(["video/mp4"]);
    });

    it("drops only the broken video object from a mixed unit (banner still sent)", () => {
      const bid = makeBid({
        mediaTypes: {
          banner: { sizes: [[300, 250]] },
          video: { context: "instream" }, // no mimes → invalid video
        },
      });
      const body = parseRequest(spec.buildRequests([bid], makeBidderRequest()));
      expect(body.imp[0].banner).to.not.be.undefined;
      expect(body.imp[0].video).to.be.undefined;
    });

    it("resolves a video floor via getFloor with mediaType video and the playerSize", () => {
      const calls = [];
      const bid = makeVideoBid(
        {},
        {
          getFloor(args) {
            calls.push(args);
            return { floor: 2.5, currency: "EUR" };
          },
        },
      );
      const body = parseRequest(spec.buildRequests([bid], makeBidderRequest()));
      expect(body.imp[0].bidfloor).to.equal(2.5);
      expect(calls[0].mediaType).to.equal("video");
      // Size-keyed video floor rules must match: the floors module is
      // queried with the player size, not the (absent) banner sizes.
      expect(calls[0].size).to.deep.equal([640, 480]);
    });
  });

  // --- banner sizes vs. core's `sizes` alias ---------------------------------

  // Core does not hand an adapter the ad unit as the publisher wrote it: it
  // sets `bid.sizes` to
  //   mediaTypes.banner.sizes || mediaTypes.video.playerSize || []
  // (src/adapterManager.ts), so on a video-only unit the alias holds the PLAYER
  // size. Every other fixture in this file hand-builds bids and therefore never
  // carries that alias — which is exactly how an adapter reading `bid.sizes`
  // unconditionally passed a full spec suite while fabricating a banner format
  // on video-only units in the browser, taking the canonical Prebid video setup
  // to a channel-mismatch no-bid. These fixtures reproduce core's output.
  describe("buildRequests banner sizes vs. core's sizes alias", () => {
    // As core emits a video-only unit: playerSize copied into bid.sizes.
    function coreShapedVideoBid(overrides = {}) {
      return makeBid({
        bidId: "bid-v1",
        adUnitCode: "div-video-player",
        mediaTypes: {
          video: {
            context: "instream",
            playerSize: [[640, 360]],
            mimes: ["video/mp4"],
          },
        },
        sizes: [[640, 360]],
        ...overrides,
      });
    }

    it("emits no banner on a video-only unit whose sizes alias holds the player size", () => {
      const reqs = spec.buildRequests([coreShapedVideoBid()], makeBidderRequest());
      const imp = parseRequest(reqs).imp[0];
      expect(imp.banner).to.be.undefined;
      expect(imp.video.w).to.equal(640);
      expect(imp.video.h).to.equal(360);
    });

    it("marks the retained meta video-only, so interpretResponse resolves the channel correctly", () => {
      const reqs = spec.buildRequests([coreShapedVideoBid()], makeBidderRequest());
      expect(reqs[0].bidRequests[0].hasBanner).to.equal(false);
      expect(reqs[0].bidRequests[0].hasVideo).to.equal(true);
    });

    it("keeps the floor query video-keyed instead of falling into the mixed '*' bucket", () => {
      const calls = [];
      const bid = coreShapedVideoBid({
        getFloor(args) {
          calls.push(args);
          return { floor: 2.5, currency: "EUR" };
        },
      });
      parseRequest(spec.buildRequests([bid], makeBidderRequest()));
      expect(calls[0].mediaType).to.equal("video");
      expect(calls[0].size).to.deep.equal([640, 360]);
    });

    it("never fabricates a banner on an audio unit carrying a stale sizes alias", () => {
      const bid = makeBid({
        bidId: "bid-a1",
        adUnitCode: "div-audio-slot",
        mediaTypes: { audio: { mimes: ["audio/mpeg"] } },
        sizes: [[640, 360]],
      });
      const reqs = spec.buildRequests([bid], makeBidderRequest());
      // Assert on whatever was emitted rather than assuming a request exists:
      // in an audio-less build the unit has nothing biddable left once the
      // alias can no longer stand in for a banner, so it is dropped outright.
      // Either way no banner is invented, which is the whole claim.
      const imps = reqs.flatMap((r) => JSON.parse(r.data).imp);
      expect(imps.some((imp) => imp.banner)).to.equal(false);
      if (FEATURES.AUDIO) {
        expect(imps).to.have.lengthOf(1);
        expect(imps[0].audio).to.not.be.undefined;
      } else {
        expect(reqs).to.have.lengthOf(0);
      }
    });

    it("still emits both formats on a mixed banner+video unit (the alias is the banner sizes there)", () => {
      const bid = makeBid({
        mediaTypes: {
          banner: { sizes: [[300, 250]] },
          video: {
            context: "outstream",
            playerSize: [[640, 360]],
            mimes: ["video/mp4"],
          },
        },
        sizes: [[300, 250]],
      });
      const imp = parseRequest(spec.buildRequests([bid], makeBidderRequest())).imp[0];
      expect(imp.banner.format).to.deep.equal([{ w: 300, h: 250 }]);
      expect(imp.video.w).to.equal(640);
    });

    it("still honors a bare sizes array on a unit that declares no media type at all", () => {
      // The legacy shape the alias fallback exists for — no mediaTypes, so
      // nothing else could have written `sizes`.
      const bid = makeBid({ mediaTypes: {}, sizes: [[728, 90]] });
      const imp = parseRequest(spec.buildRequests([bid], makeBidderRequest())).imp[0];
      expect(imp.banner.format).to.deep.equal([{ w: 728, h: 90 }]);
    });
  });

  // --- interpretResponse -----------------------------------------------------

  function serverRequestFor(bids) {
    return spec.buildRequests(bids, makeBidderRequest())[0];
  }

  function bidResponse(bidOverrides = {}) {
    return {
      body: {
        id: "req-abc",
        cur: "EUR",
        seatbid: [
          {
            seat: "adswag",
            bid: [
              {
                id: "req-abc-1",
                impid: "bid-1",
                price: 1.5,
                crid: "cr-99",
                adomain: ["advertiser.example"],
                ext: {
                  adswag: { serve_url: "https://serve.adswag.nl/s?rid=req-abc" },
                  dsa: { behalf: "Advertiser BV" },
                },
                ...bidOverrides,
              },
            ],
          },
        ],
      },
    };
  }

  describe("interpretResponse", () => {
    it("treats an empty 200 body as no-bid", () => {
      const req = serverRequestFor([makeBid()]);
      expect(spec.interpretResponse({ body: "" }, req)).to.deep.equal([]);
      expect(spec.interpretResponse({ body: undefined }, req)).to.deep.equal([]);
      expect(spec.interpretResponse({}, req)).to.deep.equal([]);
      expect(spec.interpretResponse(undefined, req)).to.deep.equal([]);
    });

    it("maps a display bid (serve_url → adUrl, size backfilled, DSA meta)", () => {
      const req = serverRequestFor([makeBid()]);
      const bids = spec.interpretResponse(bidResponse(), req);
      expect(bids).to.have.lengthOf(1);
      const b = bids[0];
      expect(b.requestId).to.equal("bid-1");
      expect(b.cpm).to.equal(1.5);
      expect(b.currency).to.equal("EUR");
      expect(b.creativeId).to.equal("cr-99");
      expect(b.netRevenue).to.equal(true);
      expect(b.ttl).to.equal(300);
      // Required by core's BaseBidResponse; the auction recomputes it, the
      // adapter emits the documented default (= cpm).
      expect(b.desirability).to.equal(1.5);
      expect(b.mediaType).to.equal("banner");
      expect(b.adUrl).to.equal("https://serve.adswag.nl/s?rid=req-abc");
      expect(b.ad).to.be.undefined;
      expect(b.width).to.equal(300);
      expect(b.height).to.equal(250);
      expect(b.meta.advertiserDomains).to.deep.equal(["advertiser.example"]);
      expect(b.meta.advertiserName).to.equal("Advertiser BV");
    });

    it("prefers the response's explicit w/h over the requested-size backfill (multi-size win)", () => {
      // A multi-size impression (300x250 primary + 300x600) where the server
      // declares it chose the SECOND size: the emitted bid must carry the
      // server's dimensions, not the backfilled primary.
      const bid = makeBid({
        mediaTypes: { banner: { sizes: [[300, 250], [300, 600]] } },
      });
      const req = serverRequestFor([bid]);
      const bids = spec.interpretResponse(bidResponse({ w: 300, h: 600 }), req);
      expect(bids[0].width).to.equal(300);
      expect(bids[0].height).to.equal(600);
    });

    it("ignores malformed response dimensions and backfills the requested size", () => {
      const req = serverRequestFor([makeBid()]);
      const bids = spec.interpretResponse(bidResponse({ w: 0, h: -1 }), req);
      expect(bids[0].width).to.equal(300);
      expect(bids[0].height).to.equal(250);
    });

    it("prefers adm when the server ever returns markup", () => {
      const req = serverRequestFor([makeBid()]);
      const resp = bidResponse({ adm: "<div>ad</div>" });
      const bids = spec.interpretResponse(resp, req);
      expect(bids[0].ad).to.equal("<div>ad</div>");
      expect(bids[0].adUrl).to.be.undefined;
    });

    it("skips a bid with neither adm nor serve_url", () => {
      const req = serverRequestFor([makeBid()]);
      const resp = bidResponse({ ext: {} });
      expect(spec.interpretResponse(resp, req)).to.deep.equal([]);
    });

    it("skips a non-positive price", () => {
      const req = serverRequestFor([makeBid()]);
      expect(spec.interpretResponse(bidResponse({ price: 0 }), req)).to.deep.equal([]);
      expect(spec.interpretResponse(bidResponse({ price: -1 }), req)).to.deep.equal([]);
    });

    it("fails open to [] on malformed JSON", () => {
      const req = serverRequestFor([makeBid()]);
      expect(spec.interpretResponse({ body: "{not json" }, req)).to.deep.equal([]);
    });

    it("fails open to [] with no seatbid", () => {
      const req = serverRequestFor([makeBid()]);
      expect(spec.interpretResponse({ body: { id: "x" } }, req)).to.deep.equal([]);
    });

    it("fails open to [] when body access throws", () => {
      const req = serverRequestFor([makeBid()]);
      const exploding = {};
      Object.defineProperty(exploding, "body", {
        get() {
          throw new Error("boom");
        },
      });
      expect(spec.interpretResponse(exploding, req)).to.deep.equal([]);
    });

    it("maps meta.dsa from bid.ext.dsa (accept-if-present)", () => {
      const req = serverRequestFor([makeBid()]);
      const resp = bidResponse({
        ext: {
          adswag: { serve_url: "https://serve.adswag.nl/s?rid=req-abc" },
          dsa: { behalf: "Advertiser BV", paid: "Payer BV" },
        },
      });
      const bids = spec.interpretResponse(resp, req);
      expect(bids[0].meta.dsa).to.deep.equal({ behalf: "Advertiser BV", paid: "Payer BV" });
      expect(bids[0].meta.advertiserName).to.equal("Advertiser BV");
    });

    it("carries the server-minted win-notice burl onto the Prebid bid", () => {
      // Display wins are observable ONLY via this burl (the display markup
      // fetch publishes no win notice) — dropping it here reintroduces a "0%
      // win rate next to tens of thousands of impressions" reporting bug.
      const req = serverRequestFor([makeBid()]);
      const burl = "https://ads.dev.adswag.ai/v1/win?rid=req-abc&sc=x&sig=y&p=${AUCTION_PRICE}";
      const bids = spec.interpretResponse(bidResponse({ burl }), req);
      expect(bids[0].burl).to.equal(burl);
    });

    it("omits burl when the server sent none (VAST-channel wins ride the adm fetch)", () => {
      const req = serverRequestFor([makeBid()]);
      const bids = spec.interpretResponse(bidResponse(), req);
      expect(bids[0].burl).to.be.undefined;
    });
  });

  // --- interpretResponse: video -----------------------------------------------

  const VAST_WRAPPER =
    '<?xml version="1.0" encoding="UTF-8"?><VAST version="4.2"><Ad id="req-abc">' +
    "<Wrapper><AdSystem>Adswag</AdSystem><VASTAdTagURI><![CDATA[" +
    "https://serve.adswag.nl/s?rid=req-abc&sc=x&sig=y" +
    "]]></VASTAdTagURI></Wrapper></Ad></VAST>";

  describe("interpretResponse video", () => {
    function videoResponse(bidOverrides = {}) {
      return bidResponse({ impid: "bid-v1", adm: VAST_WRAPPER, ...bidOverrides });
    }

    it("maps a video bid (adm → vastXml, mediaType video, playerSize backfill)", () => {
      const req = serverRequestFor([makeVideoBid()]);
      const bids = spec.interpretResponse(videoResponse(), req);
      expect(bids).to.have.lengthOf(1);
      const b = bids[0];
      expect(b.requestId).to.equal("bid-v1");
      expect(b.mediaType).to.equal("video");
      expect(b.vastXml).to.equal(VAST_WRAPPER);
      expect(b.vastUrl).to.be.undefined;
      expect(b.ad).to.be.undefined;
      expect(b.adUrl).to.be.undefined;
      expect(b.width).to.equal(640);
      expect(b.height).to.equal(480);
    });

    it("falls back to vastUrl from ext.adswag.serve_url when adm is absent", () => {
      const req = serverRequestFor([makeVideoBid()]);
      const bids = spec.interpretResponse(videoResponse({ adm: undefined }), req);
      expect(bids).to.have.lengthOf(1);
      expect(bids[0].mediaType).to.equal("video");
      expect(bids[0].vastUrl).to.equal("https://serve.adswag.nl/s?rid=req-abc");
      expect(bids[0].vastXml).to.be.undefined;
    });

    it("resolves a mixed banner+video unit to video when adm is VAST", () => {
      const mixed = makeBid({
        bidId: "bid-v1",
        mediaTypes: {
          banner: { sizes: [[300, 250]] },
          video: { context: "instream", mimes: ["video/mp4"], playerSize: [[640, 480]] },
        },
      });
      const req = serverRequestFor([mixed]);
      const bids = spec.interpretResponse(videoResponse(), req);
      expect(bids[0].mediaType).to.equal("video");
      expect(bids[0].vastXml).to.equal(VAST_WRAPPER);
      expect(bids[0].width).to.equal(640);
      expect(bids[0].height).to.equal(480);
    });

    it("resolves a mixed unit to banner when only a serve URL comes back", () => {
      const mixed = makeBid({
        bidId: "bid-v1",
        mediaTypes: {
          banner: { sizes: [[300, 250]] },
          video: { context: "instream", mimes: ["video/mp4"], playerSize: [[640, 480]] },
        },
      });
      const req = serverRequestFor([mixed]);
      const bids = spec.interpretResponse(videoResponse({ adm: undefined }), req);
      expect(bids[0].mediaType).to.equal("banner");
      expect(bids[0].adUrl).to.equal("https://serve.adswag.nl/s?rid=req-abc");
      expect(bids[0].width).to.equal(300);
      expect(bids[0].height).to.equal(250);
    });

    it("skips a video bid with neither adm nor serve_url", () => {
      const req = serverRequestFor([makeVideoBid()]);
      const resp = videoResponse({ adm: undefined, ext: {} });
      expect(spec.interpretResponse(resp, req)).to.deep.equal([]);
    });
  });

  // --- outstream renderer ------------------------------------------------------
  // Outstream video is the one case where the winning bid has no player to
  // land in: the adapter supplies one, unless the publisher brought its own.

  describe("outstream renderer", () => {
    const RENDERER_URL = "https://player.adswag.ai/outstream/v1/renderer.js";

    function outstreamBid(bidOverrides = {}) {
      return makeVideoBid({ context: "outstream" }, bidOverrides);
    }

    function winning(bid) {
      const req = spec.buildRequests([bid], makeBidderRequest())[0];
      return spec.interpretResponse(
        bidResponse({ impid: "bid-v1", adm: VAST_WRAPPER }),
        req,
      )[0];
    }

    // A publisher renderer as core sees it: url + render, per Renderer.js's
    // own validity check.
    const publisherRenderer = (extra = {}) => ({
      url: "https://publisher.example/their-player.js",
      render: () => {},
      ...extra,
    });

    it("attaches a renderer to an outstream video win", () => {
      const bid = winning(outstreamBid());
      expect(bid.mediaType).to.equal("video");
      expect(bid.renderer).to.exist;
      // A repointable channel alias, never a version pin: this file ships in
      // Prebid's release train, so a player fix must not need an upstream PR.
      expect(bid.renderer.url).to.equal(RENDERER_URL);
      expect(bid.renderer.adUnitCode).to.equal("div-video-player");
      expect(bid.renderer.id).to.equal("bid-v1");
      expect(bid.renderer.loaded).to.equal(false);
    });

    it("attaches no renderer to instream video — the page owns that player", () => {
      const bid = winning(makeVideoBid());
      expect(bid.mediaType).to.equal("video");
      expect(bid.renderer).to.be.undefined;
    });

    it("attaches no renderer to a banner win", () => {
      const req = spec.buildRequests([makeBid()], makeBidderRequest())[0];
      const bid = spec.interpretResponse(bidResponse(), req)[0];
      expect(bid.mediaType).to.equal("banner");
      expect(bid.renderer).to.be.undefined;
    });

    it("respects a publisher renderer on mediaTypes.video", () => {
      const bid = winning(
        makeVideoBid(
          { context: "outstream", renderer: publisherRenderer() },
          {},
        ),
      );
      expect(bid.renderer).to.be.undefined;
    });

    it("respects a publisher renderer on the ad unit", () => {
      const bid = winning(outstreamBid({ renderer: publisherRenderer() }));
      expect(bid.renderer).to.be.undefined;
    });

    it("still attaches when the publisher renderer is backupOnly", () => {
      // backupOnly means "use the bidder's, fall back to mine" — core resolves
      // the same precedence, so declining to attach would defeat the flag.
      const bid = winning(
        outstreamBid({ renderer: publisherRenderer({ backupOnly: true }) }),
      );
      expect(bid.renderer).to.exist;
      expect(bid.renderer.url).to.equal(RENDERER_URL);
    });

    it("hands the bid to the loaded bootstrap's render entry point", () => {
      const bid = winning(outstreamBid());
      const calls = [];
      // The document core resolved for this bid; reading the API off its own
      // window (never a global) is what keeps this test identical in karma.
      const doc = {
        defaultView: {
          adswagOutstream: { render: (b, d) => calls.push([b, d]) },
        },
      };
      // Simulate core having loaded the external script: the renderer then
      // runs the queued render immediately instead of fetching anything.
      bid.renderer.loaded = true;
      bid.renderer.renderNow = true;

      bid.renderer.render(bid, doc);

      expect(calls).to.have.lengthOf(1);
      expect(calls[0][0]).to.equal(bid);
      expect(calls[0][0].vastXml).to.equal(VAST_WRAPPER);
      expect(calls[0][1]).to.equal(doc);
    });

    it("degrades quietly when the bootstrap loaded without its API", () => {
      const bid = winning(outstreamBid());
      bid.renderer.loaded = true;
      bid.renderer.renderNow = true;
      expect(() => bid.renderer.render(bid, { defaultView: {} })).to.not.throw();
    });
  });

  // --- native (deliberately NOT supported) -------------------------------------
  // Owner decision 2026-08-10: Prebid's submission checklist requires every
  // declared media type's documented test unit to consistently return test
  // creatives; the platform cannot serve native yet, so the adapter neither
  // declares nor requests it. These tests pin the drop: native units are
  // ignored (fail-open), mixed units keep their other media types. Native
  // support returns as a follow-up PR when platform-side serving ships.

  describe("native is not requested", () => {
    const NATIVE_ORTB_REQUEST = {
      assets: [{ id: 1, required: 1, title: { len: 90 } }],
    };

    function makeNativeBid(bidOverrides = {}) {
      return makeBid({
        bidId: "bid-n1",
        adUnitCode: "div-native-1",
        mediaTypes: { native: {} },
        nativeOrtbRequest: NATIVE_ORTB_REQUEST,
        ...bidOverrides,
      });
    }

    it("a native-only unit is invalid (nothing requestable)", () => {
      expect(spec.isBidRequestValid(makeNativeBid())).to.equal(false);
    });

    it("a mixed banner+native unit bids banner only — no imp.native", () => {
      const mixed = makeNativeBid({
        mediaTypes: { banner: { sizes: [[300, 250]] }, native: {} },
      });
      expect(spec.isBidRequestValid(mixed)).to.equal(true);
      const body = parseRequest(spec.buildRequests([mixed], makeBidderRequest()));
      expect(body.imp).to.have.lengthOf(1);
      expect(body.imp[0].banner).to.not.be.undefined;
      expect(body.imp[0].native).to.be.undefined;
    });
  });

  // --- lifecycle callbacks --------------------------------------------------

  // --- audio (FEATURES.AUDIO; served as its own channel) -----------------------

  describeIfAudio("audio media type", () => {
    it("a valid audio-only unit is biddable; mimes is the only hard requirement", () => {
      expect(spec.isBidRequestValid(makeAudioBid())).to.equal(true);
      expect(spec.isBidRequestValid(makeAudioBid({ mimes: [] }))).to.equal(false);
      expect(spec.isBidRequestValid(makeAudioBid({ mimes: undefined }))).to.equal(false);
    });

    it("builds imp.audio with exactly the fields the server's OpenRTB audio model accepts", () => {
      const reqs = spec.buildRequests(
        [
          makeAudioBid({
            minbitrate: 128,
            maxbitrate: 192,
            feed: 3,
            // read-but-dropped params (no field on the server's model / not emitted)
            startdelay: 5,
            api: [7],
            delivery: [2],
          }),
        ],
        makeBidderRequest(),
      );
      const imp = parseRequest(reqs).imp[0];
      expect(imp.audio).to.deep.equal({
        mimes: ["audio/mpeg", "audio/mp4"],
        minduration: 10,
        maxduration: 30,
        protocols: [2, 3, 7, 8],
        minbitrate: 128,
        maxbitrate: 192,
        feed: 3,
      });
      expect(imp.banner).to.be.undefined;
    });

    it("resolves an audio floor via getFloor with mediaType audio and size '*' (audio is sizeless)", () => {
      const calls = [];
      const bid = makeAudioBid(
        {},
        {
          getFloor(args) {
            calls.push(args);
            return { floor: 1.1, currency: "EUR" };
          },
        },
      );
      const body = parseRequest(spec.buildRequests([bid], makeBidderRequest()));
      expect(body.imp[0].bidfloor).to.equal(1.1);
      expect(calls[0].mediaType).to.equal("audio");
      expect(calls[0].size).to.equal("*");
    });

    it("accepts audio expressed as ortb2Imp.audio on a video-typed unit", () => {
      const bid = makeVideoBid(
        {},
        { ortb2Imp: { audio: { mimes: ["audio/mpeg"], maxduration: 20 } } },
      );
      const imp = parseRequest(
        spec.buildRequests([bid], makeBidderRequest()),
      ).imp[0];
      expect(imp.video).to.not.be.undefined;
      expect(imp.audio).to.deep.equal({ mimes: ["audio/mpeg"], maxduration: 20 });
    });

    it("a mixed banner+audio unit keeps banner when the audio object is broken", () => {
      const bid = makeBid({
        mediaTypes: {
          banner: { sizes: [[300, 250]] },
          audio: { mimes: [] },
        },
      });
      expect(spec.isBidRequestValid(bid)).to.equal(true);
      const imp = parseRequest(
        spec.buildRequests([bid], makeBidderRequest()),
      ).imp[0];
      expect(imp.banner).to.not.be.undefined;
      expect(imp.audio).to.be.undefined;
    });

    // FEATURES.AUDIO-off behavior: repo-only companion suite (the flag is a
    // compile-time constant in real Prebid builds).

    it("maps a VAST response on an audio-only imp to mediaType audio (vastXml)", () => {
      const reqs = spec.buildRequests([makeAudioBid()], makeBidderRequest());
      const vast = '<VAST version="4.2"><Ad><InLine/></Ad></VAST>';
      const bids = spec.interpretResponse(
        {
          body: {
            cur: "EUR",
            seatbid: [{ bid: [{ impid: "bid-a1", price: 4.2, adm: vast, crid: "cr-a" }] }],
          },
        },
        reqs[0],
      );
      expect(bids).to.have.lengthOf(1);
      expect(bids[0].mediaType).to.equal("audio");
      expect(bids[0].vastXml).to.equal(vast);
      expect(bids[0].width).to.be.undefined;
      expect(bids[0].height).to.be.undefined;
    });

    it("maps a serve-url-only response on an audio-only imp to vastUrl", () => {
      const reqs = spec.buildRequests([makeAudioBid()], makeBidderRequest());
      const bids = spec.interpretResponse(
        {
          body: {
            seatbid: [
              {
                bid: [
                  {
                    impid: "bid-a1",
                    price: 2.1,
                    ext: { adswag: { serve_url: "https://ads.adswag.ai/v1/vast?rid=r" } },
                  },
                ],
              },
            ],
          },
        },
        reqs[0],
      );
      expect(bids[0].mediaType).to.equal("audio");
      expect(bids[0].vastUrl).to.equal("https://ads.adswag.ai/v1/vast?rid=r");
    });

    it("audio outranks video on a mixed VAST win (mirrors the server's channel precedence)", () => {
      // The server normalizes one channel per imp with banner > audio > video
      // precedence — an audio+video imp competes as audio, so
      // a VAST win on it is an audio bid.
      const bid = makeVideoBid(
        {},
        {
          bidId: "bid-av1",
          mediaTypes: {
            video: { context: "instream", playerSize: [[640, 480]], mimes: ["video/mp4"] },
            audio: { mimes: ["audio/mpeg"] },
          },
        },
      );
      const reqs = spec.buildRequests([bid], makeBidderRequest());
      const bids = spec.interpretResponse(
        {
          body: {
            seatbid: [
              {
                bid: [
                  {
                    impid: "bid-av1",
                    price: 3.0,
                    adm: '<VAST version="4.2"></VAST>',
                  },
                ],
              },
            ],
          },
        },
        reqs[0],
      );
      expect(bids[0].mediaType).to.equal("audio");
    });
  });

  describe("lifecycle callbacks", () => {
    // Win notices go through the adapter's dep.ajax indirection (keepalive
    // GET) — swap it for a recorder here and restore the real transport
    // after, so no global is touched in the bundled karma run.
    let fired;
    let realAjax;
    beforeEach(() => {
      fired = [];
      realAjax = dep.ajax;
      dep.ajax = (url, _cb, _data, options) => {
        fired.push({ url, options });
      };
    });
    afterEach(() => {
      dep.ajax = realAjax;
    });

    it("onBidWon fires the burl with ${AUCTION_PRICE} expanded to the CPM, as a keepalive GET", () => {
      // The win-notice fire that makes display wins observable (the server's
      // win-notice endpoint). Prebid core substitutes no ORTB macros
      // in burl for client adapters — the adapter must. keepalive keeps the
      // fire alive through page teardown/navigation.
      spec.onBidWon({
        cpm: 1.5,
        burl: "https://ads.dev.adswag.ai/v1/win?sc=x&sig=y&p=${AUCTION_PRICE}",
      });
      expect(fired.length).to.equal(1);
      expect(fired[0].url).to.equal("https://ads.dev.adswag.ai/v1/win?sc=x&sig=y&p=1.5");
      expect(fired[0].options).to.deep.equal({ method: "GET", keepalive: true });
    });

    it("onBidWon expands EVERY ${AUCTION_PRICE} occurrence in the burl", () => {
      spec.onBidWon({
        cpm: 2.5,
        burl: "https://x.example/v1/win?p=${AUCTION_PRICE}&echo=${AUCTION_PRICE}",
      });
      expect(fired.length).to.equal(1);
      expect(fired[0].url).to.equal("https://x.example/v1/win?p=2.5&echo=2.5");
    });

    it("onBidWon leaves the price slot empty on a malformed cpm (the server falls back to the signed bid price)", () => {
      spec.onBidWon({ cpm: NaN, burl: "https://x.example/v1/win?p=${AUCTION_PRICE}" });
      expect(fired.length).to.equal(1);
      expect(fired[0].url).to.equal("https://x.example/v1/win?p=");
    });

    it("onBidWon without a burl fires nothing and never throws", () => {
      expect(() => spec.onBidWon({})).to.not.throw();
      expect(() => spec.onBidWon(undefined)).to.not.throw();
      expect(fired).to.deep.equal([]);
    });

    it("onBidWon / onTimeout never throw (transport throws)", () => {
      dep.ajax = () => {
        throw new Error("network layer exploded");
      };
      expect(() =>
        spec.onBidWon({ cpm: 1, burl: "https://x.example/v1/win?p=${AUCTION_PRICE}" }),
      ).to.not.throw();
      expect(() => spec.onTimeout([])).to.not.throw();
      expect(() => spec.onTimeout(undefined)).to.not.throw();
    });
  });

  // --- user syncs (stable contract, owner decision 2026-08-06) ----------------
  //
  // One frozen iframe/pixel URL pair on ev.adswag.ai; everything behind them
  // is server-side behavior (launching as consent-validating no-ops).

  describe("getUserSyncs", () => {
    const IFRAME_URL = "https://ev.adswag.ai/sync/iframe";
    const PIXEL_URL = "https://ev.adswag.ai/sync/pixel";
    const consented = {
      gdprApplies: true,
      consentString: "TCSTRING",
      vendorData: { vendor: { consents: { 1417: true } } },
    };

    it("registers the iframe sync when the publisher enables iframes", () => {
      const syncs = spec.getUserSyncs({ iframeEnabled: true }, [], consented);
      expect(syncs).to.deep.equal([
        { type: "iframe", url: `${IFRAME_URL}?gdpr=1&gdpr_consent=TCSTRING` },
      ]);
    });

    it("falls back to the image pixel when only pixels are enabled", () => {
      const syncs = spec.getUserSyncs(
        { iframeEnabled: false, pixelEnabled: true },
        [],
        consented,
      );
      expect(syncs).to.deep.equal([
        { type: "image", url: `${PIXEL_URL}?gdpr=1&gdpr_consent=TCSTRING` },
      ]);
    });

    it("prefers iframe when the publisher enables both", () => {
      const syncs = spec.getUserSyncs(
        { iframeEnabled: true, pixelEnabled: true },
        [],
        consented,
      );
      expect(syncs).to.have.lengthOf(1);
      expect(syncs[0].type).to.equal("iframe");
    });

    it("registers nothing when the publisher disables syncing", () => {
      expect(spec.getUserSyncs({}, [], consented)).to.deep.equal([]);
      expect(spec.getUserSyncs(undefined, [], consented)).to.deep.equal([]);
    });

    it("GDPR without a TC string: no sync (consentless = no identifier surface)", () => {
      const syncs = spec.getUserSyncs(
        { iframeEnabled: true },
        [],
        { gdprApplies: true },
      );
      expect(syncs).to.deep.equal([]);
    });

    it("GDPR without a vendor-1417 grant: no sync", () => {
      const syncs = spec.getUserSyncs({ iframeEnabled: true }, [], {
        gdprApplies: true,
        consentString: "TCSTRING",
        vendorData: { vendor: { consents: { 1417: false } } },
      });
      expect(syncs).to.deep.equal([]);
    });

    it("outside GDPR scope: syncs without gdpr params", () => {
      const syncs = spec.getUserSyncs({ iframeEnabled: true }, []);
      expect(syncs).to.deep.equal([{ type: "iframe", url: IFRAME_URL }]);
    });

    it("appends gdpr, usp and gpp consent params via the shared sync helper", () => {
      // TC / GPP strings are URL-safe by construction (base64url); the shared
      // userSyncUtils helper forwards them unencoded, like every adapter
      // using it.
      const syncs = spec.getUserSyncs(
        { pixelEnabled: true },
        [],
        { gdprApplies: false, consentString: "CQABCDTCSTRING" },
        "1YNN",
        { gppString: "DBABMA~CQABCD", applicableSections: [2, 6] },
      );
      expect(syncs[0].url).to.equal(
        `${PIXEL_URL}?gdpr=0&gdpr_consent=CQABCDTCSTRING` +
          `&us_privacy=1YNN&gpp=DBABMA~CQABCD&gpp_sid=2,6`,
      );
    });

    it("fails open to [] on malformed inputs", () => {
      const throwing = {};
      Object.defineProperty(throwing, "iframeEnabled", {
        get() {
          throw new Error("boom");
        },
      });
      expect(spec.getUserSyncs(throwing, [], consented)).to.deep.equal([]);
    });
  });

  // Repo-only suites (upstream export invariant, golden-fixture contract
  // fidelity) live in adswagBidAdapter_repo_spec.js — they depend on node and
  // this repo's fixtures and are never exported upstream.
});
