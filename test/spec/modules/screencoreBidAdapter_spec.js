import { expect } from "chai";
import {
  createEndpoint,
  spec as adapter,
} from "modules/screencoreBidAdapter.js";
import { config } from "src/config.js";
import { BANNER, VIDEO, NATIVE } from "src/mediaTypes.js";
import sinon from "sinon";

const BID_TO_SSP = {
  bidId: "4s14670csep132",
  bidder: "screencore",
  adUnitCode: "div-gpt-ad-67890-0",
  transactionId: "bc8dd708-e538-4b19-a9ab-9058adbe9325",
  params: {
    sspPlacementId: "123",
  },
  mediaTypes: {
    banner: {
      sizes: [
        [300, 250],
        [300, 600],
      ],
      battr: [1, 3],
    },
  },
  ortb2Imp: {
    ext: {
      gpid: "8132965431",
      tid: "bc8dd708-e538-4b19-a9ab-9058adbe9325",
    },
  },
};

const VIDEO_BID_TO_SSP = {
  bidId: "kxm1ox1oij10j0",
  bidder: "screencore",
  adUnitCode: "video-ad-unit-ssp",
  transactionId: "8dfbb64c-d7ef-4afb-bc9a-b42c8a9a2499",
  params: {
    sspPlacementId: "392",
  },
  mediaTypes: {
    video: {
      playerSize: [[545, 307]],
      context: "instream",
      mimes: ["video/mp4", "application/javascript"],
      protocols: [2, 3, 5, 6],
      maxduration: 60,
      minduration: 0,
      startdelay: 0,
      linearity: 1,
      api: [2],
      placement: 1,
      battr: [1, 3],
    },
  },
  ortb2Imp: {
    ext: {
      tid: "8dfbb64c-d7ef-4afb-bc9a-b42c8a9a2499",
    },
  },
};

const NATIVE_BID_TO_SSP = {
  bidId: "010jd19n0ij119",
  bidder: "screencore",
  adUnitCode: "native-ad-unit",
  transactionId: "4886621d-7ac4-4952-a92d-1b3334bcc32b",
  params: {
    sspPlacementId: "890",
  },
  mediaTypes: {
    native: {
      title: { required: true },
      image: { required: true },
      sponsoredBy: { required: false },
    },
  },
};

const BIDDER_REQUEST = {
  refererInfo: {
    page: "https://www.example.com",
    ref: "https://www.referrer.com",
  },
  ortb2: {
    device: {
      w: 1920,
      h: 1080,
      language: "en",
    },
  },
};

const SSP_ORTB_RESPONSE = {
  body: {
    id: "test-request-id",
    cur: "USD",
    seatbid: [
      {
        seat: "screencore",
        bid: [
          {
            id: "1",
            impid: "4s14670csep132",
            price: 0.8,
            adm: '<iframe>console.log("hello world")</iframe>',
            crid: "12610997325162499419",
            w: 300,
            h: 250,
            mtype: 1,
            adomain: ["securepubads.g.doubleclick.net"],
          },
        ],
      },
    ],
  },
};

const SSP_VIDEO_ORTB_RESPONSE = {
  body: {
    id: "test-request-id",
    cur: "USD",
    seatbid: [
      {
        seat: "screencore",
        bid: [
          {
            id: "2",
            impid: "kxm1ox1oij10j0",
            price: 2,
            adm: '<VAST version="3.0"></VAST>',
            crid: "12610997325162499419",
            w: 545,
            h: 307,
            mtype: 2,
            adomain: ["screencore.io"],
          },
        ],
      },
    ],
  },
};

const SSP_US_ENDPOINT = "https://ssp-us.screencore.io/pbjs-bid?pId=123";
const SSP_EU_ENDPOINT = "https://ssp-eu.screencore.io/pbjs-bid?pId=123";
const SSP_APAC_ENDPOINT = "https://ssp-asia.screencore.io/pbjs-bid?pId=123";

describe("screencore bid adapter", function () {
  before(() => config.resetConfig());
  after(() => config.resetConfig());

  describe("validate spec", function () {
    it("should have isBidRequestValid as a function", function () {
      expect(adapter.isBidRequestValid).to.exist.and.to.be.a("function");
    });

    it("should have buildRequests as a function", function () {
      expect(adapter.buildRequests).to.exist.and.to.be.a("function");
    });

    it("should have interpretResponse as a function", function () {
      expect(adapter.interpretResponse).to.exist.and.to.be.a("function");
    });

    it("should have getUserSyncs as a function", function () {
      expect(adapter.getUserSyncs).to.exist.and.to.be.a("function");
    });

    it("should have code as a string", function () {
      expect(adapter.code).to.exist.and.to.be.a("string");
      expect(adapter.code).to.equal("screencore");
    });

    it("should have supportedMediaTypes with BANNER, VIDEO, NATIVE", function () {
      expect(adapter.supportedMediaTypes)
        .to.exist.and.to.be.an("array")
        .with.length(3);
      expect(adapter.supportedMediaTypes).to.contain.members([
        BANNER,
        VIDEO,
        NATIVE,
      ]);
    });

    it("should have gvlid", function () {
      expect(adapter.gvlid).to.exist.and.to.equal(1473);
    });
  });

  describe("validate bid requests", function () {
    it("should return false when sspPlacementId is missing", function () {
      const isValid = adapter.isBidRequestValid({
        bidId: "123",
        params: {},
        mediaTypes: { banner: { sizes: [[300, 250]] } },
      });
      expect(isValid).to.be.false;
    });

    it("should return false when params is missing entirely", function () {
      const isValid = adapter.isBidRequestValid({
        bidId: "123",
        mediaTypes: { banner: { sizes: [[300, 250]] } },
      });
      expect(isValid).to.be.false;
    });

    it("should return true when sspPlacementId is present with banner mediaType", function () {
      const isValid = adapter.isBidRequestValid({
        bidId: "123",
        params: { sspPlacementId: "test" },
        mediaTypes: { banner: { sizes: [[300, 250]] } },
      });
      expect(isValid).to.be.true;
    });

    it("should return true when sspPlacementId is present with video mediaType", function () {
      const isValid = adapter.isBidRequestValid({
        bidId: "123",
        params: { sspPlacementId: "test" },
        mediaTypes: { video: { playerSize: [[640, 480]] } },
      });
      expect(isValid).to.be.true;
    });

    it("should return true when sspPlacementId is present with native mediaType", function () {
      const isValid = adapter.isBidRequestValid({
        bidId: "123",
        params: { sspPlacementId: "test" },
        mediaTypes: { native: { title: { required: true } } },
      });
      expect(isValid).to.be.true;
    });
  });

  describe("build requests", function () {
    it("should return [] when there are no valid bid requests", function () {
      const requests = adapter.buildRequests([], BIDDER_REQUEST);
      expect(requests).to.deep.equal([]);
    });

    it("should build banner request", function () {
      const requests = adapter.buildRequests([BID_TO_SSP], BIDDER_REQUEST);
      expect(requests).to.exist;
      expect(requests.method).to.equal("POST");
      expect(requests.url).to.include("screencore.io/pbjs-bid");
      expect(requests.url).to.include("pId=123");
      expect(requests.data).to.exist;
    });

    it("should build video request", function () {
      const requests = adapter.buildRequests(
        [VIDEO_BID_TO_SSP],
        BIDDER_REQUEST,
      );
      expect(requests).to.exist;
      expect(requests.method).to.equal("POST");
      expect(requests.url).to.include("pId=392");
    });

    it("should build native request", function () {
      const requests = adapter.buildRequests(
        [NATIVE_BID_TO_SSP],
        BIDDER_REQUEST,
      );
      expect(requests).to.exist;
      expect(requests.method).to.equal("POST");
      expect(requests.url).to.include("pId=890");
    });
  });

  describe("getUserSyncs", function () {
    it("should return no syncs, ssp path does not support cookie sync", function () {
      const result = adapter.getUserSyncs({ iframeEnabled: true }, []);
      expect(result).to.be.an("array").that.is.empty;
    });
  });

  describe("interpret response", function () {
    it("should return empty array when body is missing", function () {
      const responses = adapter.interpretResponse({}, { data: {} });
      expect(responses).to.be.empty;
    });

    it("should interpret a banner ORTB response", function () {
      const request = adapter.buildRequests([BID_TO_SSP], BIDDER_REQUEST);
      const responses = adapter.interpretResponse(SSP_ORTB_RESPONSE, request);
      expect(responses).to.have.length(1);
      expect(responses[0].requestId).to.equal("4s14670csep132");
      expect(responses[0].cpm).to.equal(0.8);
      expect(responses[0].width).to.equal(300);
      expect(responses[0].height).to.equal(250);
      expect(responses[0].mediaType).to.equal(BANNER);
      expect(responses[0].currency).to.equal("USD");
    });

    it("should interpret a video ORTB response", function () {
      const request = adapter.buildRequests([VIDEO_BID_TO_SSP], BIDDER_REQUEST);
      const responses = adapter.interpretResponse(
        SSP_VIDEO_ORTB_RESPONSE,
        request,
      );
      expect(responses).to.have.length(1);
      expect(responses[0].requestId).to.equal("kxm1ox1oij10j0");
      expect(responses[0].cpm).to.equal(2);
      expect(responses[0].mediaType).to.equal(VIDEO);
    });
  });

  describe("createEndpoint region detection", function () {
    it("should return US endpoint for US timezone", function () {
      const stub = sinon.stub(Intl, "DateTimeFormat").returns({
        resolvedOptions: () => ({ timeZone: "America/New_York" }),
      });

      expect(createEndpoint({ sspPlacementId: "123" })).to.equal(
        SSP_US_ENDPOINT,
      );

      stub.restore();
    });

    it("should return EU endpoint for European timezone", function () {
      const stub = sinon.stub(Intl, "DateTimeFormat").returns({
        resolvedOptions: () => ({ timeZone: "Europe/London" }),
      });

      expect(createEndpoint({ sspPlacementId: "123" })).to.equal(
        SSP_EU_ENDPOINT,
      );

      stub.restore();
    });

    it("should return APAC endpoint for Asian timezone", function () {
      const stub = sinon.stub(Intl, "DateTimeFormat").returns({
        resolvedOptions: () => ({ timeZone: "Asia/Tokyo" }),
      });

      expect(createEndpoint({ sspPlacementId: "123" })).to.equal(
        SSP_APAC_ENDPOINT,
      );

      stub.restore();
    });

    it("should return US endpoint for US/ prefixed timezone", function () {
      const stub = sinon.stub(Intl, "DateTimeFormat").returns({
        resolvedOptions: () => ({ timeZone: "US/Eastern" }),
      });

      expect(createEndpoint({ sspPlacementId: "123" })).to.equal(
        SSP_US_ENDPOINT,
      );

      stub.restore();
    });

    it("should return US endpoint as default for an unrecognized timezone", function () {
      const stub = sinon.stub(Intl, "DateTimeFormat").returns({
        resolvedOptions: () => ({ timeZone: "UTC" }),
      });

      expect(createEndpoint({ sspPlacementId: "123" })).to.equal(
        SSP_US_ENDPOINT,
      );

      stub.restore();
    });

    it("should return US endpoint as default when timezone lookup throws", function () {
      const stub = sinon
        .stub(Intl, "DateTimeFormat")
        .throws(new Error("unsupported"));

      expect(createEndpoint({ sspPlacementId: "123" })).to.equal(
        SSP_US_ENDPOINT,
      );

      stub.restore();
    });

    it("should return undefined when sspPlacementId is missing", function () {
      expect(createEndpoint({})).to.be.undefined;
      expect(createEndpoint(undefined)).to.be.undefined;
    });
  });
});
