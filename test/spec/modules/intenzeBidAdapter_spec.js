import { expect } from "chai";
import { spec } from "modules/intenzeBidAdapter";
import { config } from "src/config.js";

const EXCHANGE_URL_PATTERN = (accountId) =>
  new RegExp(
    `^https://(lb-east|n2|lb-apac)\\.intenze\\.co/\\?pass=${accountId}&integration=prebidjs$`,
  );
const SSP_URL_PATTERN = (placementId) =>
  new RegExp(
    `^https://(us-east-ssp|eu-ssp|apac-ssp)\\.intenze\\.co/pbjs-serve\\?placementId=${placementId}$`,
  );

const BANNER_MEDIA_TYPES = {
  banner: {
    sizes: [
      [300, 250],
      [300, 600],
    ],
  },
};

const VIDEO_MEDIA_TYPES = {
  video: {
    context: "instream",
    playerSize: [[640, 480]],
    w: 640,
    h: 480,
    mimes: ["video/mp4"],
    protocols: [2, 3],
    minduration: 0,
    maxduration: 60,
    linearity: 1,
    api: [1, 2],
  },
};

const NATIVE_ORTB_REQUEST = {
  ver: "1.2",
  assets: [
    { id: 1, required: 1, title: { len: 80 } },
    { id: 2, required: 1, img: { type: 3, w: 300, h: 250 } },
  ],
};

const makeBid = ({
  bidId,
  params,
  mediaTypes = BANNER_MEDIA_TYPES,
  adUnitCode = `adunit-${bidId}`,
  extra = {},
}) => ({
  bidder: "intenze",
  bidId,
  adUnitCode,
  auctionId: "auction-1",
  bidderRequestId: "bidder-request-1",
  transactionId: `transaction-${bidId}`,
  mediaTypes,
  params,
  ...extra,
});

const makeNativeBid = (bidId, params) =>
  makeBid({
    bidId,
    params,
    mediaTypes: { native: { ortb: NATIVE_ORTB_REQUEST } },
    extra: { nativeOrtbRequest: NATIVE_ORTB_REQUEST },
  });

const makeBidderRequest = (bids) => ({
  bidderCode: "intenze",
  auctionId: "auction-1",
  bidderRequestId: "bidder-request-1",
  bids,
  refererInfo: {
    page: "https://test.com",
    domain: "test.com",
    ref: "",
  },
  ortb2: {},
  timeout: 1000,
});

const buildRequests = (bids) =>
  spec.buildRequests(bids, makeBidderRequest(bids));

const makeResponse = (
  impid,
  { mtype = 1, adm = "<div>admcode</div>", cur = "USD", price = 5 } = {},
) => ({
  id: "response-id",
  cur,
  seatbid: [
    {
      bid: [
        {
          id: `bid-${impid}`,
          impid,
          price,
          w: 300,
          h: 250,
          adomain: ["example.com"],
          adm,
          crid: "crid",
          mtype,
        },
      ],
    },
  ],
});

describe("IntenzeAdapter", function () {
  describe("isBidRequestValid", function () {
    it("returns true when only placementId is provided", function () {
      const bid = makeBid({ bidId: "1", params: { placementId: "25" } });
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it("returns true when only accountId is provided", function () {
      const bid = makeBid({
        bidId: "1",
        params: { accountId: "test-account" },
      });
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it("returns false when both accountId and placementId are provided", function () {
      const bid = makeBid({
        bidId: "1",
        params: { accountId: "test-account", placementId: "25" },
      });
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it("returns false when neither accountId nor placementId is provided", function () {
      const bid = makeBid({ bidId: "1", params: { IncorrectParam: 0 } });
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it("returns false when params are empty strings", function () {
      const bid = makeBid({
        bidId: "1",
        params: { accountId: "", placementId: "" },
      });
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it("returns false when params are missing", function () {
      const bid = makeBid({ bidId: "1", params: undefined });
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });
  });

  describe("buildRequests", function () {
    it("returns an empty array when there are no bids", function () {
      expect(spec.buildRequests([], makeBidderRequest([]))).to.deep.equal([]);
    });

    describe("banner with placementId", function () {
      let requests;
      before(function () {
        requests = buildRequests([
          makeBid({ bidId: "bid-1", params: { placementId: "25" } }),
        ]);
      });

      it("returns a single POST request", function () {
        expect(requests).to.be.an("array").with.lengthOf(1);
        expect(requests[0].method).to.equal("POST");
      });

      it("sends the request to the SSP endpoint", function () {
        expect(requests[0].url).to.match(SSP_URL_PATTERN("25"));
      });

      it("builds a valid ORTB request with one banner imp", function () {
        const { data } = requests[0];
        expect(data).to.be.an("object");
        expect(data.id).to.exist;
        expect(data.imp).to.be.an("array").with.lengthOf(1);
        expect(data.imp[0].id).to.equal("bid-1");
        expect(data.imp[0].banner).to.exist;
      });

      it("passes bidder params in imp.ext", function () {
        expect(requests[0].data.imp[0].ext.intenze).to.deep.equal({
          placementId: "25",
        });
      });

      it("sets default currency and test flag", function () {
        expect(requests[0].data.cur).to.deep.equal(["USD"]);
        expect(requests[0].data.test).to.equal(0);
      });
    });

    describe("banner with accountId", function () {
      let requests;
      before(function () {
        requests = buildRequests([
          makeBid({ bidId: "bid-1", params: { accountId: "test-account" } }),
        ]);
      });

      it("sends the request to the exchange endpoint", function () {
        expect(requests).to.have.lengthOf(1);
        expect(requests[0].url).to.match(EXCHANGE_URL_PATTERN("test-account"));
      });

      it("passes bidder params in imp.ext", function () {
        expect(requests[0].data.imp[0].ext.intenze).to.deep.equal({
          accountId: "test-account",
        });
      });
    });

    if (FEATURES.VIDEO) {
      it("builds a video imp", function () {
        const requests = buildRequests([
          makeBid({
            bidId: "bid-1",
            params: { placementId: "25" },
            mediaTypes: VIDEO_MEDIA_TYPES,
          }),
        ]);

        expect(requests).to.have.lengthOf(1);
        expect(requests[0].data.imp[0].video).to.exist;
        expect(requests[0].data.imp[0].video.mimes).to.deep.equal([
          "video/mp4",
        ]);
      });
    }

    if (FEATURES.NATIVE) {
      it("builds a native imp", function () {
        const requests = buildRequests([
          makeNativeBid("bid-1", { placementId: "25" }),
        ]);

        expect(requests).to.have.lengthOf(1);
        expect(requests[0].data.imp[0].native).to.exist;
      });
    }

    it("URL-encodes params in the endpoint", function () {
      const requests = buildRequests([
        makeBid({ bidId: "bid-1", params: { placementId: "a b&c" } }),
      ]);

      expect(requests[0].url).to.include("placementId=a%20b%26c");
    });

    it("uses currency from params when provided", function () {
      const requests = buildRequests([
        makeBid({
          bidId: "bid-1",
          params: { placementId: "25", currency: "EUR" },
        }),
      ]);

      expect(requests[0].data.cur).to.deep.equal(["EUR"]);
    });

    describe("multiple bids", function () {
      it("groups bids with the same params into one request", function () {
        const requests = buildRequests([
          makeBid({ bidId: "bid-1", params: { accountId: "test-account" } }),
          makeBid({ bidId: "bid-2", params: { accountId: "test-account" } }),
        ]);

        expect(requests).to.have.lengthOf(1);
        expect(requests[0].url).to.match(EXCHANGE_URL_PATTERN("test-account"));
        expect(requests[0].data.imp.map((imp) => imp.id)).to.deep.equal([
          "bid-1",
          "bid-2",
        ]);
      });

      it("splits bids with accountId and placementId into exchange and SSP requests", function () {
        const requests = buildRequests([
          makeBid({ bidId: "bid-1", params: { accountId: "test-account" } }),
          makeBid({ bidId: "bid-2", params: { placementId: "25" } }),
        ]);

        expect(requests).to.have.lengthOf(2);

        expect(requests[0].url).to.match(EXCHANGE_URL_PATTERN("test-account"));
        expect(requests[0].data.imp).to.have.lengthOf(1);
        expect(requests[0].data.imp[0].id).to.equal("bid-1");

        expect(requests[1].url).to.match(SSP_URL_PATTERN("25"));
        expect(requests[1].data.imp).to.have.lengthOf(1);
        expect(requests[1].data.imp[0].id).to.equal("bid-2");
      });

      it("splits bids with different placementIds into separate SSP requests", function () {
        const requests = buildRequests([
          makeBid({ bidId: "bid-1", params: { placementId: "25" } }),
          makeBid({ bidId: "bid-2", params: { placementId: "26" } }),
        ]);

        expect(requests).to.have.lengthOf(2);
        expect(requests[0].url).to.match(SSP_URL_PATTERN("25"));
        expect(requests[0].data.imp[0].id).to.equal("bid-1");
        expect(requests[1].url).to.match(SSP_URL_PATTERN("26"));
        expect(requests[1].data.imp[0].id).to.equal("bid-2");
      });

      it("keeps grouped bids together when params repeat out of order", function () {
        const requests = buildRequests([
          makeBid({ bidId: "bid-1", params: { placementId: "25" } }),
          makeBid({ bidId: "bid-2", params: { accountId: "test-account" } }),
          makeBid({ bidId: "bid-3", params: { placementId: "25" } }),
        ]);

        expect(requests).to.have.lengthOf(2);
        expect(requests[0].url).to.match(SSP_URL_PATTERN("25"));
        expect(requests[0].data.imp.map((imp) => imp.id)).to.deep.equal([
          "bid-1",
          "bid-3",
        ]);
        expect(requests[1].url).to.match(EXCHANGE_URL_PATTERN("test-account"));
        expect(requests[1].data.imp.map((imp) => imp.id)).to.deep.equal([
          "bid-2",
        ]);
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

      it("sets test flag to 1", function () {
        const requests = buildRequests([
          makeBid({ bidId: "bid-1", params: { placementId: "25" } }),
        ]);
        expect(requests[0].data.test).to.equal(1);
      });
    });
  });

  describe("interpretResponse", function () {
    it("returns an empty array for a null response", function () {
      expect(spec.interpretResponse(null)).to.be.an("array").that.is.empty;
    });

    it("returns an empty array for an empty body", function () {
      expect(spec.interpretResponse({ body: null })).to.be.an("array").that.is
        .empty;
    });

    it("returns an empty array when the request was not built by buildRequests", function () {
      const fakeRequest = { data: { id: "x", imp: [{ id: "bid-1" }] } };
      const bids = spec.interpretResponse(
        { body: makeResponse("bid-1") },
        fakeRequest,
      );
      expect(bids).to.be.an("array").that.is.empty;
    });

    it("interprets a banner response", function () {
      const [request] = buildRequests([
        makeBid({ bidId: "bid-1", params: { placementId: "25" } }),
      ]);

      const bids = spec.interpretResponse(
        { body: makeResponse("bid-1") },
        request,
      );

      expect(bids).to.have.lengthOf(1);
      expect(bids[0].requestId).to.equal("bid-1");
      expect(bids[0].cpm).to.equal(5);
      expect(bids[0].currency).to.equal("USD");
      expect(bids[0].mediaType).to.equal("banner");
      expect(bids[0].ad).to.equal("<div>admcode</div>");
      expect(bids[0].netRevenue).to.equal(true);
      expect(bids[0].ttl).to.equal(20);
      expect(bids[0].meta.advertiserDomains).to.deep.equal(["example.com"]);
    });

    if (FEATURES.VIDEO) {
      it("interprets a video response", function () {
        const [request] = buildRequests([
          makeBid({
            bidId: "bid-1",
            params: { placementId: "25" },
            mediaTypes: VIDEO_MEDIA_TYPES,
          }),
        ]);

        const vast = "<VAST version='3.0'></VAST>";
        const bids = spec.interpretResponse(
          { body: makeResponse("bid-1", { mtype: 2, adm: vast }) },
          request,
        );

        expect(bids).to.have.lengthOf(1);
        expect(bids[0].mediaType).to.equal("video");
        expect(bids[0].vastXml).to.equal(vast);
      });
    }

    if (FEATURES.NATIVE) {
      it("interprets a native response", function () {
        const [request] = buildRequests([
          makeNativeBid("bid-1", { placementId: "25" }),
        ]);

        const nativeAdm = JSON.stringify({
          assets: [
            { id: 1, title: { text: "dummyText" } },
            {
              id: 2,
              img: { url: "https://example.com/image", w: 300, h: 250 },
            },
          ],
          link: { url: "https://example.com" },
          imptrackers: ["https://tracker.com"],
        });

        const bids = spec.interpretResponse(
          { body: makeResponse("bid-1", { mtype: 4, adm: nativeAdm }) },
          request,
        );

        expect(bids).to.have.lengthOf(1);
        expect(bids[0].mediaType).to.equal("native");
        expect(bids[0].native.ortb.assets).to.have.lengthOf(2);
      });
    }

    it("interprets each response of a split request against its own request", function () {
      const requests = buildRequests([
        makeBid({ bidId: "bid-1", params: { accountId: "test-account" } }),
        makeBid({ bidId: "bid-2", params: { placementId: "25" } }),
      ]);

      const exchangeBids = spec.interpretResponse(
        { body: makeResponse("bid-1", { price: 3.5 }) },
        requests[0],
      );
      const sspBids = spec.interpretResponse(
        { body: makeResponse("bid-2", { price: 2.1 }) },
        requests[1],
      );

      expect(exchangeBids).to.have.lengthOf(1);
      expect(exchangeBids[0].requestId).to.equal("bid-1");
      expect(exchangeBids[0].cpm).to.equal(3.5);

      expect(sspBids).to.have.lengthOf(1);
      expect(sspBids[0].requestId).to.equal("bid-2");
      expect(sspBids[0].cpm).to.equal(2.1);
    });
  });
});
