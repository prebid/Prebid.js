// test/spec/modules/adclusterBidAdapter_spec.js

import { expect } from "chai";
import { spec } from "modules/adclusterBidAdapter.js"; // adjust path if needed
import { BANNER, VIDEO } from "src/mediaTypes.js";

const BIDDER_CODE = "adcluster";
const ENDPOINT = "https://core.adcluster.com.tr/bid";

describe("adclusterBidAdapter", function () {
  // ---------- Test Fixtures (immutable) ----------
  const baseBid = Object.freeze({
    bidder: BIDDER_CODE,
    bidId: "2f5d",
    bidderRequestId: "breq-1",
    auctionId: "auc-1",
    transactionId: "txn-1",
    adUnitCode: "div-1",
    adUnitId: "adunit-1",
    params: { unitId: "61884b5c-9420-4f15-871f-2dcc2fa1cff5" },
  });

  const gdprConsent = Object.freeze({
    gdprApplies: true,
    consentString: "BOJ/P2HOJ/P2HABABMAAAAAZ+A==",
  });

  const uspConsent = "1---";
  const gpp = "DBABLA..";
  const gppSid = [7, 8];

  const bidderRequestBase = Object.freeze({
    auctionId: "auc-1",
    bidderCode: BIDDER_CODE,
    bidderRequestId: "breq-1",
    auctionStart: 1111111111111,
    timeout: 2000,
    start: 1111111111112,
    ortb2: { regs: { gpp, gpp_sid: gppSid } },
    gdprConsent,
    uspConsent,
  });

  // helpers return fresh objects to avoid cross-test mutation
  function mkBidBanner(extra = {}) {
    return {
      ...baseBid,
      mediaTypes: {
        banner: {
          sizes: [
            [300, 250],
            [300, 600],
          ],
        },
      },
      getFloor: ({ mediaType }) => {
        if (mediaType === "banner") return { currency: "USD", floor: 0.5 };
        return { currency: "USD", floor: 0.0 };
      },
      userIdAsEids: [
        { source: "example.com", uids: [{ id: "abc", atype: 1 }] },
      ],
      ortb2: {
        source: { ext: { schain: { ver: "1.0", complete: 1, nodes: [] } } },
      },
      ...extra,
    };
  }

  function mkBidVideo(extra = {}) {
    return {
      ...baseBid,
      mediaTypes: {
        video: {
          context: "instream",
          playerSize: [640, 360],
          minduration: 5,
          maxduration: 30,
        },
      },
      getFloor: ({ mediaType, size }) => {
        if (mediaType === "video" && Array.isArray(size)) {
          return { currency: "USD", floor: 1.2 };
        }
        return { currency: "USD", floor: 0.0 };
      },
      userIdAsEids: [
        { source: "example.com", uids: [{ id: "xyz", atype: 1 }] },
      ],
      ortb2: {
        source: { ext: { schain: { ver: "1.0", complete: 1, nodes: [] } } },
      },
      ...extra,
    };
  }

  describe("isBidRequestValid", function () {
    it("returns true when params.unitId is present", function () {
      // Arrange
      const bid = { ...baseBid };

      // Act
      const valid = spec.isBidRequestValid(bid);

      // Assert
      expect(valid).to.equal(true);
    });

    it("returns false when params.unitId is missing", function () {
      // Arrange
      const bid = { ...baseBid, params: {} };

      // Act
      const valid = spec.isBidRequestValid(bid);

      // Assert
      expect(valid).to.equal(false);
    });

    it("returns false when params is undefined", function () {
      // Arrange
      const bid = { ...baseBid, params: undefined };

      // Act
      const valid = spec.isBidRequestValid(bid);

      // Assert
      expect(valid).to.equal(false);
    });
  });

  describe("buildRequests", function () {
    it("builds a POST request with JSON body to the right endpoint", function () {
      // Arrange
      const br = { ...bidderRequestBase };
      const bids = [mkBidBanner(), mkBidVideo()];

      // Act
      const req = spec.buildRequests(bids, br);

      // Assert
      expect(req.method).to.equal("POST");
      expect(req.url).to.equal(ENDPOINT);
      expect(req.options).to.deep.equal({ contentType: "text/plain" });
      expect(req.data).to.be.an("object");
      expect(req.data.bidderCode).to.equal(BIDDER_CODE);
      expect(req.data.auctionId).to.equal(br.auctionId);
      expect(req.data.bids).to.be.an("array").with.length(2);
    });

    it("includes privacy signals (GDPR, USP, GPP) when present", function () {
      // Arrange
      const br = { ...bidderRequestBase };
      const bids = [mkBidBanner()];

      // Act
      const req = spec.buildRequests(bids, br);

      // Assert
      const { regs, user } = req.data;
      expect(regs).to.be.an("object");
      expect(regs.ext.gdpr).to.equal(1);
      expect(user.ext.consent).to.equal(gdprConsent.consentString);
      expect(regs.ext.us_privacy).to.equal(uspConsent);
      expect(regs.ext.gpp).to.equal(gpp);
      expect(regs.ext.gppSid).to.deep.equal(gppSid);
    });

    it("omits privacy fields when not provided", function () {
      // Arrange
      const minimalBR = {
        auctionId: "auc-2",
        bidderCode: BIDDER_CODE,
        bidderRequestId: "breq-2",
        auctionStart: 1,
        timeout: 1000,
        start: 2,
      };
      const bids = [mkBidBanner()];

      // Act
      const req = spec.buildRequests(bids, minimalBR);

      // Assert
      // regs.ext should exist but contain no privacy flags
      expect(req.data.regs).to.be.an("object");
      expect(req.data.regs.ext).to.deep.equal({});
      // user.ext.consent must be undefined when no GDPR
      expect(req.data.user).to.be.an("object");
      expect(req.data.user.ext).to.be.an("object");
      expect(req.data.user.ext.consent).to.be.undefined;
      // allow eids to be present (they come from bids)
      // don't assert deep-equality on user.ext, just ensure no privacy fields
      expect(req.data.user.ext.gdpr).to.be.undefined;
    });

    it("passes userIdAsEids and schain when provided", function () {
      // Arrange
      const br = { ...bidderRequestBase };
      const bids = [mkBidBanner()];

      // Act
      const req = spec.buildRequests(bids, br);

      // Assert
      expect(req.data.user.ext.eids).to.be.an("array").with.length(1);
      expect(req.data.source.ext.schain).to.be.an("object");
    });

    it("sets banner dimensions from first size and includes floors ext", function () {
      // Arrange
      const br = { ...bidderRequestBase };
      const bids = [mkBidBanner()];

      // Act
      const req = spec.buildRequests(bids, br);

      // Assert
      const imp = req.data.bids[0];
      expect(imp.width).to.equal(300);
      expect(imp.height).to.equal(250);
      expect(imp.ext).to.have.property("floors");
      expect(imp.ext.floors.banner).to.equal(0.5);
    });

    it("sets video sizes from playerSize and includes video floors", function () {
      // Arrange
      const br = { ...bidderRequestBase };
      const bids = [mkBidVideo()];

      // Act
      const req = spec.buildRequests(bids, br);

      // Assert
      const imp = req.data.bids[0];
      expect(imp.width).to.equal(640);
      expect(imp.height).to.equal(360);
      expect(imp.video).to.be.an("object");
      expect(imp.video.minduration).to.equal(5);
      expect(imp.video.maxduration).to.equal(30);
      expect(imp.video.ext.context).to.equal("instream");
      expect(imp.video.ext.floor).to.equal(1.2);
      expect(imp.ext.floors.video).to.equal(1.2);
    });

    it("gracefully handles missing getFloor", function () {
      // Arrange
      const br = { ...bidderRequestBase };
      const bids = [mkBidBanner({ getFloor: undefined })];

      // Act
      const req = spec.buildRequests(bids, br);

      // Assert
      expect(req.data.bids[0].ext.floors.banner).to.equal(null);
    });

    it("passes previewMediaId when provided", function () {
      // Arrange
      const br = { ...bidderRequestBase };
      const bids = [
        mkBidVideo({ params: { unitId: "x", previewMediaId: "media-123" } }),
      ];

      // Act
      const req = spec.buildRequests(bids, br);

      // Assert
      expect(req.data.bids[0].params.previewMediaId).to.equal("media-123");
    });
  });

  describe("interpretResponse", function () {
    it("returns empty array when body is missing or not an array", function () {
      // Arrange
      const missing = { body: null };
      const notArray = { body: {} };

      // Act
      const out1 = spec.interpretResponse(missing);
      const out2 = spec.interpretResponse(notArray);

      // Assert
      expect(out1).to.deep.equal([]);
      expect(out2).to.deep.equal([]);
    });

    it("maps banner responses to Prebid bids", function () {
      // Arrange
      const serverBody = [
        {
          requestId: "2f5d",
          cpm: 1.23,
          currency: "USD",
          width: 300,
          height: 250,
          creativeId: "cr-1",
          ttl: 300,
          netRevenue: true,
          mediaType: "banner",
          ad: "<div>creative</div>",
          meta: { advertiserDomains: ["advertiser.com"] },
        },
      ];

      // Act
      const out = spec.interpretResponse({ body: serverBody });

      // Assert
      expect(out).to.have.length(1);
      const b = out[0];
      expect(b.requestId).to.equal("2f5d");
      expect(b.cpm).to.equal(1.23);
      expect(b.mediaType).to.equal(BANNER);
      expect(b.ad).to.be.a("string");
      expect(b.meta.advertiserDomains).to.deep.equal(["advertiser.com"]);
    });

    it("maps video responses to Prebid bids (vastUrl)", function () {
      // Arrange
      const serverBody = [
        {
          requestId: "vid-1",
          cpm: 2.5,
          currency: "USD",
          width: 640,
          height: 360,
          creativeId: "cr-v",
          ttl: 300,
          netRevenue: true,
          mediaType: "video",
          ad: "https://vast.tag/url.xml",
          meta: { advertiserDomains: ["brand.com"] }, // mediaType hint optional
        },
      ];

      // Act
      const out = spec.interpretResponse({ body: serverBody });

      // Assert
      expect(out).to.have.length(1);
      const b = out[0];
      expect(b.requestId).to.equal("vid-1");
      expect(b.mediaType).to.equal(VIDEO);
      expect(b.vastUrl).to.equal("https://vast.tag/url.xml");
      expect(b.ad).to.be.undefined;
    });

    it("handles missing meta.advertiserDomains safely", function () {
      // Arrange
      const serverBody = [
        {
          requestId: "2f5d",
          cpm: 0.2,
          currency: "USD",
          width: 300,
          height: 250,
          creativeId: "cr-2",
          ttl: 120,
          netRevenue: true,
          ad: "<div/>",
          meta: {},
        },
      ];

      // Act
      const out = spec.interpretResponse({ body: serverBody });

      // Assert
      expect(out[0].meta.advertiserDomains).to.deep.equal([]);
    });

    it("supports multiple mixed responses", function () {
      // Arrange
      const serverBody = [
        {
          requestId: "b-1",
          cpm: 0.8,
          currency: "USD",
          width: 300,
          height: 250,
          creativeId: "cr-b",
          ttl: 300,
          netRevenue: true,
          ad: "<div>banner</div>",
          mediaType: "banner",
          meta: { advertiserDomains: [] },
        },
        {
          requestId: "v-1",
          cpm: 3.1,
          currency: "USD",
          width: 640,
          height: 360,
          creativeId: "cr-v",
          ttl: 300,
          netRevenue: true,
          mediaType: "video",
          ad: "https://vast.example/vast.xml",
          meta: { advertiserDomains: ["x.com"] },
        },
      ];

      // Act
      const out = spec.interpretResponse({ body: serverBody });

      // Assert
      expect(out).to.have.length(2);
      const [b, v] = out;
      expect(b.mediaType).to.equal(BANNER);
      expect(v.mediaType).to.equal(VIDEO);
      expect(v.vastUrl).to.match(/^https:\/\/vast\.example/);
    });
  });
});
