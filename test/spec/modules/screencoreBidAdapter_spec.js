import { expect } from "chai";
import {
  createEndpoint,
  getSspPlacementId,
  spec as adapter,
} from "modules/screencoreBidAdapter.js";
import { config } from "src/config.js";
import { setConfig as setCurrencyConfig } from "modules/currency.js";
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

const NATIVE_ORTB_REQUEST = {
  ver: "1.2",
  assets: [
    { id: 1, required: 1, title: { len: 80 } },
    { id: 2, required: 1, img: { type: 3, w: 300, h: 250 } },
  ],
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
    native: { ortb: NATIVE_ORTB_REQUEST },
  },
  nativeOrtbRequest: NATIVE_ORTB_REQUEST,
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

const SSP_NATIVE_ORTB_RESPONSE = {
  body: {
    id: "test-request-id",
    cur: "USD",
    seatbid: [
      {
        seat: "screencore",
        bid: [
          {
            id: "3",
            impid: "010jd19n0ij119",
            price: 1.2,
            adm: JSON.stringify({
              assets: [
                { id: 1, title: { text: "dummyText" } },
                {
                  id: 2,
                  img: { url: "https://example.com/image", w: 300, h: 250 },
                },
              ],
              link: { url: "https://example.com" },
            }),
            crid: "12610997325162499419",
            mtype: 4,
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

const copyBid = (bid, bidId, sspPlacementId) => ({
  ...bid,
  bidId,
  adUnitCode: `adunit-${bidId}`,
  params: { ...bid.params, sspPlacementId },
});

const deepCopy = (obj) => JSON.parse(JSON.stringify(obj));

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

    it("should return false when sspPlacementId is an empty string", function () {
      const isValid = adapter.isBidRequestValid({
        bidId: "123",
        params: { sspPlacementId: "" },
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

  describe("deprecated params (backward compatibility)", function () {
    const withParams = (params) => ({ ...BID_TO_SSP, params });

    it("should accept the deprecated placementId", function () {
      expect(adapter.isBidRequestValid(withParams({ placementId: "123" }))).to
        .be.true;
    });

    it("should accept the deprecated endpointId", function () {
      expect(adapter.isBidRequestValid(withParams({ endpointId: "123" }))).to.be
        .true;
    });

    it("should reject empty deprecated params", function () {
      expect(
        adapter.isBidRequestValid(
          withParams({ placementId: "", endpointId: "" }),
        ),
      ).to.be.false;
    });

    it("should prefer sspPlacementId over the deprecated params", function () {
      expect(
        getSspPlacementId({
          sspPlacementId: "new",
          placementId: "old",
          endpointId: "older",
        }),
      ).to.equal("new");
    });

    it("should prefer placementId over endpointId", function () {
      expect(
        getSspPlacementId({ placementId: "old", endpointId: "older" }),
      ).to.equal("old");
    });

    it("should return undefined when no placement param is set", function () {
      expect(getSspPlacementId({})).to.be.undefined;
      expect(getSspPlacementId(undefined)).to.be.undefined;
    });

    it("should translate placementId into the endpoint and imp.ext", function () {
      const [request] = adapter.buildRequests(
        [withParams({ placementId: "123" })],
        BIDDER_REQUEST,
      );
      expect(request.url).to.include("pId=123");
      expect(request.data.imp[0].ext.screencore).to.deep.equal({
        sspPlacementId: "123",
      });
    });

    it("should translate endpointId into the endpoint and imp.ext", function () {
      const [request] = adapter.buildRequests(
        [withParams({ endpointId: "456" })],
        BIDDER_REQUEST,
      );
      expect(request.url).to.include("pId=456");
      expect(request.data.imp[0].ext.screencore).to.deep.equal({
        sspPlacementId: "456",
      });
    });

    it("should build the endpoint from a deprecated param", function () {
      expect(createEndpoint({ placementId: "123" }, "ssp-eu")).to.equal(
        SSP_EU_ENDPOINT,
      );
    });
  });

  describe("build requests", function () {
    it("should return [] when there are no valid bid requests", function () {
      const requests = adapter.buildRequests([], BIDDER_REQUEST);
      expect(requests).to.deep.equal([]);
    });

    it("should build banner request", function () {
      const requests = adapter.buildRequests([BID_TO_SSP], BIDDER_REQUEST);
      expect(requests).to.be.an("array").with.lengthOf(1);
      expect(requests[0].method).to.equal("POST");
      expect(requests[0].url).to.include("screencore.io/pbjs-bid");
      expect(requests[0].url).to.include("pId=123");
      expect(requests[0].data.imp).to.have.lengthOf(1);
      expect(requests[0].data.imp[0].banner).to.exist;
      expect(requests[0].data.imp[0].ext.screencore).to.deep.equal({
        sspPlacementId: "123",
      });
    });

    it("should build video request", function () {
      const requests = adapter.buildRequests(
        [VIDEO_BID_TO_SSP],
        BIDDER_REQUEST,
      );
      expect(requests).to.have.lengthOf(1);
      expect(requests[0].method).to.equal("POST");
      expect(requests[0].url).to.include("pId=392");
    });

    if (FEATURES.VIDEO) {
      it("should build a video imp", function () {
        const requests = adapter.buildRequests(
          [VIDEO_BID_TO_SSP],
          BIDDER_REQUEST,
        );
        expect(requests[0].data.imp[0].video).to.exist;
      });
    }

    it("should build native request", function () {
      const requests = adapter.buildRequests(
        [NATIVE_BID_TO_SSP],
        BIDDER_REQUEST,
      );
      expect(requests).to.have.lengthOf(1);
      expect(requests[0].method).to.equal("POST");
      expect(requests[0].url).to.include("pId=890");
    });

    if (FEATURES.NATIVE) {
      it("should build a native imp", function () {
        const requests = adapter.buildRequests(
          [NATIVE_BID_TO_SSP],
          BIDDER_REQUEST,
        );
        expect(requests[0].data.imp[0].native).to.exist;
      });
    }

    it("should set default currency and test flag", function () {
      const requests = adapter.buildRequests([BID_TO_SSP], BIDDER_REQUEST);
      expect(requests[0].data.cur).to.deep.equal(["USD"]);
      expect(requests[0].data.test).to.equal(0);
    });

    it("should use currency from params when provided", function () {
      const bid = {
        ...BID_TO_SSP,
        params: { ...BID_TO_SSP.params, currency: "EUR" },
      };
      const requests = adapter.buildRequests([bid], BIDDER_REQUEST);
      expect(requests[0].data.cur).to.deep.equal(["EUR"]);
    });

    describe("with currency module enabled", function () {
      beforeEach(function () {
        setCurrencyConfig({
          adServerCurrency: "EUR",
          rates: { USD: { EUR: 0.9 } },
        });
      });
      afterEach(function () {
        setCurrencyConfig({});
      });

      it("should keep the ad server currency in request.cur", function () {
        const requests = adapter.buildRequests([BID_TO_SSP], BIDDER_REQUEST);
        expect(requests[0].data.cur).to.deep.equal(["EUR"]);
      });
    });

    describe("with debug config", function () {
      beforeEach(function () {
        sinon
          .stub(config, "getConfig")
          .callsFake((key) => (key === "debug" ? true : undefined));
      });
      afterEach(function () {
        config.getConfig.restore();
      });

      it("should set test flag to 1", function () {
        const requests = adapter.buildRequests([BID_TO_SSP], BIDDER_REQUEST);
        expect(requests[0].data.test).to.equal(1);
      });
    });

    describe("multiple bids", function () {
      it("should send one request per bid even with the same sspPlacementId", function () {
        const requests = adapter.buildRequests(
          [
            copyBid(BID_TO_SSP, "bid-1", "123"),
            copyBid(BID_TO_SSP, "bid-2", "123"),
          ],
          BIDDER_REQUEST,
        );

        expect(requests).to.have.lengthOf(2);
        requests.forEach((request, i) => {
          expect(request.url).to.include("pId=123");
          expect(request.data.imp).to.have.lengthOf(1);
          expect(request.data.imp[0].id).to.equal(`bid-${i + 1}`);
        });
      });

      it("should send distinct placements to their own pId", function () {
        const requests = adapter.buildRequests(
          [
            copyBid(BID_TO_SSP, "bid-1", "123"),
            copyBid(BID_TO_SSP, "bid-2", "456"),
          ],
          BIDDER_REQUEST,
        );

        expect(requests).to.have.lengthOf(2);

        expect(requests[0].url).to.include("pId=123");
        expect(requests[0].data.imp).to.have.lengthOf(1);
        expect(requests[0].data.imp[0].id).to.equal("bid-1");
        expect(requests[0].data.imp[0].ext.screencore.sspPlacementId).to.equal(
          "123",
        );

        expect(requests[1].url).to.include("pId=456");
        expect(requests[1].data.imp).to.have.lengthOf(1);
        expect(requests[1].data.imp[0].id).to.equal("bid-2");
        expect(requests[1].data.imp[0].ext.screencore.sspPlacementId).to.equal(
          "456",
        );
      });

      it("should keep bid order when placements repeat", function () {
        const requests = adapter.buildRequests(
          [
            copyBid(BID_TO_SSP, "bid-1", "123"),
            copyBid(BID_TO_SSP, "bid-2", "456"),
            copyBid(BID_TO_SSP, "bid-3", "123"),
          ],
          BIDDER_REQUEST,
        );

        expect(requests).to.have.lengthOf(3);
        expect(requests.map((r) => r.data.imp[0].id)).to.deep.equal([
          "bid-1",
          "bid-2",
          "bid-3",
        ]);
        expect(requests[0].url).to.include("pId=123");
        expect(requests[1].url).to.include("pId=456");
        expect(requests[2].url).to.include("pId=123");
      });
    });

    it("should keep existing imp.ext fields such as gpid and data", function () {
      const bid = {
        ...BID_TO_SSP,
        ortb2Imp: {
          ext: {
            gpid: "/1234/home#div-1",
            data: { pbadslot: "/1234/home#div-1" },
          },
        },
      };
      const [request] = adapter.buildRequests([bid], BIDDER_REQUEST);

      const impExt = request.data.imp[0].ext;
      expect(impExt.gpid).to.equal("/1234/home#div-1");
      expect(impExt.data).to.deep.equal({ pbadslot: "/1234/home#div-1" });
      expect(impExt.screencore).to.deep.equal({ sspPlacementId: "123" });
    });

    it("should send params.bidfloor with its currency", function () {
      const bid = {
        ...BID_TO_SSP,
        params: { ...BID_TO_SSP.params, bidfloor: 0.5 },
      };
      const [request] = adapter.buildRequests([bid], BIDDER_REQUEST);
      expect(request.data.imp[0].bidfloor).to.equal(0.5);
      expect(request.data.imp[0].bidfloorcur).to.equal("USD");
    });

    it("should use params.currency as the floor currency", function () {
      const bid = {
        ...BID_TO_SSP,
        params: { ...BID_TO_SSP.params, bidfloor: 0.5, currency: "EUR" },
      };
      const [request] = adapter.buildRequests([bid], BIDDER_REQUEST);
      expect(request.data.imp[0].bidfloor).to.equal(0.5);
      expect(request.data.imp[0].bidfloorcur).to.equal("EUR");
    });

    it("should not set a floor when params.bidfloor is missing", function () {
      const [request] = adapter.buildRequests([BID_TO_SSP], BIDDER_REQUEST);
      expect(request.data.imp[0].bidfloor).to.not.exist;
      expect(request.data.imp[0].bidfloorcur).to.not.exist;
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

    it("should return empty array when the request was not built by buildRequests", function () {
      const responses = adapter.interpretResponse(SSP_ORTB_RESPONSE, {
        data: { id: "x", imp: [{ id: "4s14670csep132" }] },
      });
      expect(responses).to.be.an("array").that.is.empty;
    });

    it("should interpret a banner ORTB response", function () {
      const [request] = adapter.buildRequests([BID_TO_SSP], BIDDER_REQUEST);
      const responses = adapter.interpretResponse(SSP_ORTB_RESPONSE, request);
      expect(responses).to.have.length(1);
      expect(responses[0].requestId).to.equal("4s14670csep132");
      expect(responses[0].cpm).to.equal(0.8);
      expect(responses[0].width).to.equal(300);
      expect(responses[0].height).to.equal(250);
      expect(responses[0].mediaType).to.equal(BANNER);
      expect(responses[0].currency).to.equal("USD");
      expect(responses[0].netRevenue).to.equal(true);
      expect(responses[0].ttl).to.equal(20);
    });

    it("should fall back to the requested currency when the response has no cur", function () {
      const bid = {
        ...BID_TO_SSP,
        params: { ...BID_TO_SSP.params, currency: "EUR" },
      };
      const [request] = adapter.buildRequests([bid], BIDDER_REQUEST);
      const response = deepCopy(SSP_ORTB_RESPONSE);
      delete response.body.cur;

      const responses = adapter.interpretResponse(response, request);
      expect(responses).to.have.length(1);
      expect(responses[0].currency).to.equal("EUR");
    });

    if (FEATURES.VIDEO) {
      it("should interpret a video ORTB response", function () {
        const [request] = adapter.buildRequests(
          [VIDEO_BID_TO_SSP],
          BIDDER_REQUEST,
        );
        const responses = adapter.interpretResponse(
          SSP_VIDEO_ORTB_RESPONSE,
          request,
        );
        expect(responses).to.have.length(1);
        expect(responses[0].requestId).to.equal("kxm1ox1oij10j0");
        expect(responses[0].cpm).to.equal(2);
        expect(responses[0].mediaType).to.equal(VIDEO);
        expect(responses[0].vastXml).to.equal('<VAST version="3.0"></VAST>');
      });
    }

    if (FEATURES.NATIVE) {
      it("should interpret a native ORTB response", function () {
        const [request] = adapter.buildRequests(
          [NATIVE_BID_TO_SSP],
          BIDDER_REQUEST,
        );
        const responses = adapter.interpretResponse(
          SSP_NATIVE_ORTB_RESPONSE,
          request,
        );
        expect(responses).to.have.length(1);
        expect(responses[0].requestId).to.equal("010jd19n0ij119");
        expect(responses[0].mediaType).to.equal(NATIVE);
        expect(responses[0].native.ortb.assets).to.have.lengthOf(2);
      });
    }

    it("should interpret each response of a split request against its own request", function () {
      const requests = adapter.buildRequests(
        [
          copyBid(BID_TO_SSP, "bid-1", "123"),
          copyBid(BID_TO_SSP, "bid-2", "456"),
        ],
        BIDDER_REQUEST,
      );

      const firstResponse = deepCopy(SSP_ORTB_RESPONSE);
      firstResponse.body.seatbid[0].bid[0].impid = "bid-1";
      firstResponse.body.seatbid[0].bid[0].price = 0.8;

      const secondResponse = deepCopy(SSP_ORTB_RESPONSE);
      secondResponse.body.seatbid[0].bid[0].impid = "bid-2";
      secondResponse.body.seatbid[0].bid[0].price = 1.5;

      const firstBids = adapter.interpretResponse(firstResponse, requests[0]);
      const secondBids = adapter.interpretResponse(secondResponse, requests[1]);

      expect(firstBids).to.have.lengthOf(1);
      expect(firstBids[0].requestId).to.equal("bid-1");
      expect(firstBids[0].cpm).to.equal(0.8);

      expect(secondBids).to.have.lengthOf(1);
      expect(secondBids[0].requestId).to.equal("bid-2");
      expect(secondBids[0].cpm).to.equal(1.5);
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

    it("should use the subdomain passed in instead of the timezone", function () {
      expect(createEndpoint({ sspPlacementId: "123" }, "ssp-eu")).to.equal(
        SSP_EU_ENDPOINT,
      );
    });

    it("should URL-encode sspPlacementId", function () {
      expect(createEndpoint({ sspPlacementId: "a b&c" })).to.include(
        "pId=a%20b%26c",
      );
    });

    it("should return undefined when sspPlacementId is missing", function () {
      expect(createEndpoint({})).to.be.undefined;
      expect(createEndpoint(undefined)).to.be.undefined;
    });
  });
});
