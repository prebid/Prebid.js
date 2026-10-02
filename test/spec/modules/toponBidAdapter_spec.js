import { expect } from "chai";
import { spec } from "modules/toponBidAdapter.js";
import * as utils from "src/utils.js";
const USER_SYNC_URL = "https://pb.anyrtb.com/pb/page/prebidUserSyncs.html";
const USER_SYNC_IMG_URL = "https://cm.anyrtb.com/cm/sdk_sync";

describe("TopOn Adapter", function () {
  const PREBID_VERSION = "$prebid.version$";
  const BIDDER_CODE = "topon";

  let bannerBid = {
    bidder: BIDDER_CODE,
    params: {
      pubid: "pub-uuid",
    },
    mediaTypes: {
      banner: {
        sizes: [[300, 250]],
      },
    },
  };

  const validBidRequests = [bannerBid];
  const bidderRequest = {
    bids: [bannerBid],
  };

  const bannerResponse = {
    bid: [
      {
        id: "6e976fc683e543d892160ee7d6f057d8",
        impid: "1fabbf3c-b5e4-4b7d-9956-8112f92c1076",
        price: 7.906274762781043,
        nurl: "https://127.0.0.1:1381/prebid_tk?...",
        burl: "https://127.0.0.1:1381/prebid_tk?...",
        lurl: "https://127.0.0.1:1381/prebid_tk?...",
        adm: `<div style="background:#eef;padding:10px;text-align:center;">✅ TopOn Mock Ad<br />300x250 🚫</div>`,
        adid: "Ad538d326a-47f1-4c22-80f0-67684a713898",
        cid: "110",
        crid: "Creative32666aba-b5d3-4074-9ad1-d1702e9ba22b",
        exp: 1800,
        ext: {},
        mtype: 1,
      },
    ],
  };

  const response = {
    body: {
      cur: "USD",
      id: "aa2653ff-bd37-4fef-8085-2e444347af8c",
      seatbid: [bannerResponse],
    },
  };

  it("should properly expose spec attributes", function () {
    expect(spec.code).to.equal(BIDDER_CODE);
    expect(spec.supportedMediaTypes).to.exist.and.to.be.an("array");
    expect(spec.isBidRequestValid).to.be.a("function");
    expect(spec.buildRequests).to.be.a("function");
    expect(spec.interpretResponse).to.be.a("function");
  });

  describe("Bid validations", () => {
    it("should return true if publisherId is present in params", () => {
      const isValid = spec.isBidRequestValid(validBidRequests[0]);
      expect(isValid).to.equal(true);
    });

    it("should return false if publisherId is missing", () => {
      const bid = utils.deepClone(validBidRequests[0]);
      delete bid.params.pubid;
      const isValid = spec.isBidRequestValid(bid);
      expect(isValid).to.equal(false);
    });

    it("should return false if publisherId is not of type string", () => {
      const bid = utils.deepClone(validBidRequests[0]);
      bid.params.pubid = 10000;
      const isValid = spec.isBidRequestValid(bid);
      expect(isValid).to.equal(false);
    });
  });

  describe("Requests", () => {
    it("should correctly build an ORTB Bid Request", () => {
      const request = spec.buildRequests(validBidRequests, bidderRequest);

      expect(request).to.be.an("object");
      expect(request.method).to.equal("POST");
      expect(request.data).to.exist;
      expect(request.data).to.be.an("object");
      expect(request.data.id).to.be.an("string");
      expect(request.data.id).to.not.be.empty;
    });

    it("should include prebid flag in request", () => {
      const request = spec.buildRequests(validBidRequests, bidderRequest);

      expect(request.data.ext).to.have.property("prebid");
      expect(request.data.ext.prebid).to.have.property("channel");
      expect(request.data.ext.prebid.channel).to.deep.equal({
        version: PREBID_VERSION,
        source: "pbjs",
      });
      expect(request.data.source.ext.prebid).to.equal(1);
    });
  });

  describe("Response", () => {
    it("should parse banner adm and set bidResponse.ad, width, and height", () => {
      const request = spec.buildRequests(validBidRequests, bidderRequest);
      response.body.seatbid[0].bid[0].impid = request.data.imp[0].id;
      const bidResponses = spec.interpretResponse(response, request);

      expect(bidResponses).to.be.an("array");
      expect(bidResponses[0]).to.exist;
      expect(bidResponses[0].ad).to.exist;
      expect(bidResponses[0].mediaType).to.equal("banner");
      expect(bidResponses[0].width).to.equal(300);
      expect(bidResponses[0].height).to.equal(250);
    });
  });

  describe("GetUserSyncs", function () {
    it("should return correct sync URLs when iframeEnabled is true", function () {
      const syncOptions = {
        iframeEnabled: true,
        pixelEnabled: true,
      };

      spec.buildRequests(validBidRequests, bidderRequest);
      const result = spec.getUserSyncs(syncOptions, [], {});

      expect(result).to.be.an("array");
      expect(result[0].type).to.equal("iframe");
      expect(result[0].url).to.include(USER_SYNC_URL);
      expect(result[0].url).to.include("pubid=tpnpub-uuid");
    });

    it("should return correct sync URLs when pixelEnabled is true", function () {
      const syncOptions = {
        iframeEnabled: false,
        pixelEnabled: true,
      };

      spec.buildRequests(validBidRequests, bidderRequest);
      const result = spec.getUserSyncs(syncOptions, [], {});

      expect(result).to.be.an("array");
      expect(result[0].type).to.equal("image");
      expect(result[0].url).to.include(USER_SYNC_IMG_URL);
      expect(result[0].url).to.include("pubid=tpnpub-uuid");
    });

    it("should respect gdpr consent data", function () {
      const gdprConsent = {
        gdprApplies: true,
        consentString: "test-consent-string",
      };

      spec.buildRequests(validBidRequests, bidderRequest);
      const result = spec.getUserSyncs(
        { iframeEnabled: true },
        [],
        gdprConsent
      );
      expect(result[0].url).to.include("gdpr=1");
      expect(result[0].url).to.include("consent=test-consent-string");
    });

    it("should handle US Privacy consent", function () {
      const uspConsent = "1YNN";

      spec.buildRequests(validBidRequests, bidderRequest);
      const result = spec.getUserSyncs(
        { iframeEnabled: true },
        [],
        {},
        uspConsent
      );

      expect(result[0].url).to.include("us_privacy=1YNN");
    });

    it("should handle GPP", function () {
      const gppConsent = {
        applicableSections: [7],
        gppString: "test-consent-string",
      };

      spec.buildRequests(validBidRequests, bidderRequest);
      const result = spec.getUserSyncs(
        { iframeEnabled: true },
        [],
        {},
        "",
        gppConsent
      );

      expect(result[0].url).to.include("gpp=test-consent-string");
      expect(result[0].url).to.include("gpp_sid=7");
    });

    it("should return empty array when sync is not enabled", function () {
      const syncOptions = {
        iframeEnabled: false,
        pixelEnabled: false,
      };

      const result = spec.getUserSyncs(syncOptions, [], {});

      expect(result).to.be.an("array").that.is.empty;
    });
  });
});
