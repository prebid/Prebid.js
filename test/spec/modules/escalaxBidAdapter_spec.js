import { expect } from "chai";
import { spec } from "modules/escalaxBidAdapter";
import "modules/priceFloors.js";
import { newBidder } from "src/adapters/bidderFactory";
import { config } from "../../../src/config.js";
import { addFPDToBidderRequest } from "../../helpers/fpd.js";

import "src/prebid.js";
import { setConfig as setCurrencyConfig } from "modules/currency.js";
import "modules/userId/index.js";
import "modules/multibid/index.js";

import "modules/consentManagementTcf.js";
import "modules/consentManagementUsp.js";

const EXCHANGE_URL_PATTERN = (sourceId, accountId) =>
  new RegExp(
    `^https://bidder_(us|eu|apac)\\.escalax\\.io/bid\\?type=pjs&partner=${sourceId}&token=${accountId}$`,
  );
const SSP_URL_PATTERN = (placementId) =>
  new RegExp(
    `^https://s-(us|eu|as)\\.escalax\\.io/pbb\\?placementId=${placementId}$`,
  );

const SIMPLE_BID_REQUEST = {
  bidder: "escalax",
  params: {
    sourceId: "sourceId",
    accountId: "accountId",
  },
  mediaTypes: {
    banner: {
      sizes: [
        [320, 250],
        [300, 600],
      ],
    },
  },
  adUnitCode: "div-gpt-ad-1234567890123-0",
  transactionId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  bidId: "abcdef1234567890",
  bidderRequestId: "1234567890abcdef",
  auctionId: "abcdef1234567890",
};

const BANNER_BID_REQUEST = {
  bidder: "escalax",
  params: {
    sourceId: "sourceId",
    accountId: "accountId",
  },
  mediaTypes: {
    banner: {
      sizes: [
        [300, 250],
        [300, 600],
      ],
    },
  },
  adUnitCode: "/adunit-code/test-path",
  bidId: "test-bid-id-1",
  bidderRequestId: "test-bid-request-1",
  auctionId: "test-auction-1",
  transactionId: "test-transactionId-1",
  timeout: 1000,
};

const VIDEO_BID_REQUEST = {
  bidId: "test-bid-id-2",
  mediaTypes: {
    video: {
      context: "instream",
      playerSize: [400, 300],
      w: 400,
      h: 300,
      mimes: ["video/mp4"],
      minduration: 5,
      maxduration: 10,
      startdelay: 0,
      skip: 1,
      minbitrate: 200,
      protocols: [1, 2, 4],
    },
  },
  bidder: "escalax",
  params: {
    sourceId: "123",
    accountId: "123",
  },
  adUnitCode: "/adunit-code/test-path",
  bidderRequestId: "test-bid-request-1",
  auctionId: "test-auction-1",
  transactionId: "test-transactionId-1",
  timeout: 1000,
};

const NATIVE_ORTB_REQUEST = {
  ver: "1.2",
  assets: [
    { id: 1, required: 1, title: { len: 80 } },
    { id: 2, required: 1, img: { type: 3, w: 300, h: 250 } },
  ],
};

const NATIVE_BID_REQUEST = {
  bidder: "escalax",
  params: {
    sourceId: "sourceId",
    accountId: "accountId",
  },
  mediaTypes: {
    native: { ortb: NATIVE_ORTB_REQUEST },
  },
  nativeOrtbRequest: NATIVE_ORTB_REQUEST,
  adUnitCode: "/adunit-code/native-test-path",
  bidId: "test-native-bid-id-1",
  bidderRequestId: "test-bid-request-1",
  auctionId: "test-auction-1",
  transactionId: "test-transactionId-1",
  timeout: 1000,
};

const SSP_BANNER_BID_REQUEST = {
  bidder: "escalax",
  params: {
    supplyPlacementId: "sp1",
  },
  mediaTypes: {
    banner: {
      sizes: [
        [300, 250],
        [300, 600],
      ],
    },
  },
  adUnitCode: "/adunit-code/ssp-test-path",
  bidId: "test-ssp-bid-id-1",
  bidderRequestId: "test-ssp-bid-request-1",
  auctionId: "test-ssp-auction-1",
  transactionId: "test-ssp-transactionId-1",
  timeout: 1000,
};

const SSP_NATIVE_BID_REQUEST = {
  bidder: "escalax",
  params: {
    supplyPlacementId: "sp2",
  },
  mediaTypes: {
    native: { ortb: NATIVE_ORTB_REQUEST },
  },
  nativeOrtbRequest: NATIVE_ORTB_REQUEST,
  adUnitCode: "/adunit-code/ssp-native-test-path",
  bidId: "test-ssp-bid-id-2",
  bidderRequestId: "test-ssp-bid-request-2",
  auctionId: "test-ssp-auction-2",
  transactionId: "test-ssp-transactionId-2",
  timeout: 1000,
};

const MIXED_PARAMS_BID_REQUEST = {
  bidder: "escalax",
  params: {
    sourceId: "sourceId",
    accountId: "accountId",
    supplyPlacementId: "sp1",
  },
  mediaTypes: {
    banner: {
      sizes: [[300, 250]],
    },
  },
  adUnitCode: "/adunit-code/mixed-test-path",
  bidId: "test-mixed-bid-id-1",
  bidderRequestId: "test-mixed-bid-request-1",
  auctionId: "test-mixed-auction-1",
  transactionId: "test-mixed-transactionId-1",
  timeout: 1000,
};

const bidderRequest = {
  refererInfo: {
    page: "https://publisher.com/home",
    ref: "https://referrer",
  },
};

const gdprConsent = {
  apiVersion: 2,
  consentString: "CONSENT",
  vendorData: { purpose: { consents: { 1: true } } },
  gdprApplies: true,
  addtlConsent: "1~1.35.41.101",
};

const withParams = (bid, bidId, params) => ({
  ...bid,
  bidId,
  adUnitCode: `adunit-${bidId}`,
  params,
});

const makeResponse = (
  impid,
  { mtype = 1, adm = "<div>admcode</div>", cur = "USD", price = 5 } = {},
) => {
  const body = {
    id: "response-id",
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
            crid: "creative0",
            mtype,
          },
        ],
      },
    ],
  };
  if (cur) body.cur = cur;
  return { body };
};

const buildRequests = async (bids, extra = {}) =>
  spec.buildRequests(
    bids,
    await addFPDToBidderRequest({ ...bidderRequest, ...extra }),
  );

describe("escalaxAdapter", function () {
  const adapter = newBidder(spec);
  describe("inherited functions", function () {
    it("exists and is a function", function () {
      expect(adapter.callBids).to.exist.and.to.be.a("function");
    });
  });

  describe("with user privacy regulations", function () {
    it('should send the Coppa "required" flag set to "1" in the request', async function () {
      sinon.stub(config, "getConfig").withArgs("coppa").returns(true);
      try {
        const [serverRequest] = await buildRequests([SIMPLE_BID_REQUEST]);
        expect(serverRequest.data.regs.coppa).to.equal(1);
      } finally {
        config.getConfig.restore();
      }
    });

    it("should send the GDPR Consent data in the request", async function () {
      const [serverRequest] = await buildRequests([SIMPLE_BID_REQUEST], {
        gdprConsent,
      });
      expect(serverRequest.data.regs.ext.gdpr).to.exist.and.to.equal(1);
      expect(serverRequest.data.user.ext.consent).to.equal("CONSENT");
    });

    it("should send the CCPA data in the request", async function () {
      const [serverRequest] = await buildRequests([SIMPLE_BID_REQUEST], {
        uspConsent: "1YYY",
      });
      expect(serverRequest.data.regs.ext.us_privacy).to.equal("1YYY");
    });
  });

  describe("isBidRequestValid", function () {
    it("should return true when required exchange params found", function () {
      expect(spec.isBidRequestValid(BANNER_BID_REQUEST)).to.equal(true);
    });

    it("should return false when sourceId/accountId is missing", function () {
      const localbid = { ...BANNER_BID_REQUEST, params: {} };
      expect(spec.isBidRequestValid(localbid)).to.equal(false);
    });

    it("should return false when only accountId is provided", function () {
      const localbid = {
        ...BANNER_BID_REQUEST,
        params: { accountId: "accountId" },
      };
      expect(spec.isBidRequestValid(localbid)).to.equal(false);
    });

    it("should return false when only sourceId is provided", function () {
      const localbid = {
        ...BANNER_BID_REQUEST,
        params: { sourceId: "sourceId" },
      };
      expect(spec.isBidRequestValid(localbid)).to.equal(false);
    });

    it("should return true when supplyPlacementId is present", function () {
      expect(spec.isBidRequestValid(SSP_BANNER_BID_REQUEST)).to.equal(true);
    });

    it("should return false when supplyPlacementId is empty", function () {
      const localbid = {
        ...SSP_BANNER_BID_REQUEST,
        params: { supplyPlacementId: "" },
      };
      expect(spec.isBidRequestValid(localbid)).to.equal(false);
    });

    it("should return false when both exchange and ssp params are provided together", function () {
      expect(spec.isBidRequestValid(MIXED_PARAMS_BID_REQUEST)).to.equal(false);
    });

    it("should return false when accountId is mixed with supplyPlacementId", function () {
      const localbid = {
        ...SSP_BANNER_BID_REQUEST,
        params: { accountId: "accountId", supplyPlacementId: "sp1" },
      };
      expect(spec.isBidRequestValid(localbid)).to.equal(false);
    });

    it("should return false when sourceId is mixed with supplyPlacementId", function () {
      const localbid = {
        ...SSP_BANNER_BID_REQUEST,
        params: { sourceId: "sourceId", supplyPlacementId: "sp1" },
      };
      expect(spec.isBidRequestValid(localbid)).to.equal(false);
    });

    it("should return false when params are missing", function () {
      const localbid = { ...BANNER_BID_REQUEST };
      delete localbid.params;
      expect(spec.isBidRequestValid(localbid)).to.equal(false);
    });
  });

  describe("build request", function () {
    it("should return an empty array when no bid requests", async function () {
      const requests = await buildRequests([]);
      expect(requests).to.be.an("array").that.is.empty;
    });

    it("should return a valid bid request object", async function () {
      const requests = await buildRequests([SIMPLE_BID_REQUEST]);
      expect(requests).to.be.an("array").with.lengthOf(1);

      const [request] = requests;
      expect(request.data).to.be.an("object");
      expect(request.method).to.equal("POST");
      expect(request.url).to.be.a("string").and.not.equal("");

      expect(request.data.site).to.have.property("page");
      expect(request.data.site).to.have.property("domain");
      expect(request.data).to.have.property("id");
      expect(request.data).to.have.property("imp");
      expect(request.data).to.have.property("device");
    });

    it("should return a valid bid BANNER request object", async function () {
      const [request] = await buildRequests([BANNER_BID_REQUEST]);
      expect(request.data.imp[0].banner).to.exist;
      expect(request.data.imp[0].banner.format[0].w).to.be.an("number");
      expect(request.data.imp[0].banner.format[0].h).to.be.an("number");
    });

    if (FEATURES.VIDEO) {
      it("should return a valid bid VIDEO request object", async function () {
        const [request] = await buildRequests([VIDEO_BID_REQUEST]);
        expect(request.data.imp[0].video).to.exist;
        expect(request.data.imp[0].video.w).to.be.an("number");
        expect(request.data.imp[0].video.h).to.be.an("number");
      });
    }

    if (FEATURES.NATIVE) {
      it("should return a valid bid NATIVE request object", async function () {
        const [request] = await buildRequests([NATIVE_BID_REQUEST]);
        expect(request.data.imp[0].native).to.exist;
      });

      it("should return a valid ssp NATIVE request object", async function () {
        const [request] = await buildRequests([SSP_NATIVE_BID_REQUEST]);
        expect(request.url).to.match(SSP_URL_PATTERN("sp2"));
        expect(request.data.imp[0].native).to.exist;
      });
    }

    it("should route to the exchange endpoint and send sourceId/accountId in imp.ext for exchange bids", async function () {
      const [request] = await buildRequests([BANNER_BID_REQUEST]);
      expect(request.url).to.match(
        EXCHANGE_URL_PATTERN("sourceId", "accountId"),
      );

      const impExt = request.data.imp[0].ext.escalax;
      expect(impExt.sourceId).to.equal("sourceId");
      expect(impExt.accountId).to.equal("accountId");
      expect(impExt.supplyPlacementId).to.not.exist;
    });

    it("should route to the ssp endpoint and send supplyPlacementId in imp.ext for ssp bids", async function () {
      const [request] = await buildRequests([SSP_BANNER_BID_REQUEST]);
      expect(request.url).to.match(SSP_URL_PATTERN("sp1"));

      const impExt = request.data.imp[0].ext.escalax;
      expect(impExt.supplyPlacementId).to.equal("sp1");
      expect(impExt.sourceId).to.not.exist;
      expect(impExt.accountId).to.not.exist;
    });

    it("should return a valid ssp BANNER request object", async function () {
      const [request] = await buildRequests([SSP_BANNER_BID_REQUEST]);
      expect(request.data.imp[0].banner).to.exist;
      expect(request.data.imp[0].banner.format[0].w).to.be.an("number");
      expect(request.data.imp[0].banner.format[0].h).to.be.an("number");
    });

    it("should keep existing imp.ext fields such as gpid and data", async function () {
      const [request] = await buildRequests([
        {
          ...BANNER_BID_REQUEST,
          ortb2Imp: {
            ext: {
              gpid: "/1234/home#div-1",
              data: { pbadslot: "/1234/home#div-1" },
            },
          },
        },
      ]);

      const impExt = request.data.imp[0].ext;
      expect(impExt.gpid).to.equal("/1234/home#div-1");
      expect(impExt.data).to.deep.equal({ pbadslot: "/1234/home#div-1" });
      expect(impExt.escalax).to.deep.equal({
        sourceId: "sourceId",
        accountId: "accountId",
      });
    });

    it("should send params.bidfloor with its currency", async function () {
      const [request] = await buildRequests([
        withParams(BANNER_BID_REQUEST, "bid-1", {
          sourceId: "sourceId",
          accountId: "accountId",
          bidfloor: 0.5,
        }),
      ]);
      expect(request.data.imp[0].bidfloor).to.equal(0.5);
      expect(request.data.imp[0].bidfloorcur).to.equal("USD");
    });

    it("should use params.currency as the floor currency", async function () {
      const [request] = await buildRequests([
        withParams(BANNER_BID_REQUEST, "bid-1", {
          sourceId: "sourceId",
          accountId: "accountId",
          bidfloor: 0.5,
          currency: "EUR",
        }),
      ]);
      expect(request.data.imp[0].bidfloor).to.equal(0.5);
      expect(request.data.imp[0].bidfloorcur).to.equal("EUR");
    });

    it("should not set a floor when params.bidfloor is missing", async function () {
      const [request] = await buildRequests([BANNER_BID_REQUEST]);
      expect(request.data.imp[0].bidfloor).to.not.exist;
      expect(request.data.imp[0].bidfloorcur).to.not.exist;
    });

    it("should URL-encode params in the endpoint", async function () {
      const [request] = await buildRequests([
        withParams(SSP_BANNER_BID_REQUEST, "bid-1", {
          supplyPlacementId: "a b&c",
        }),
      ]);
      expect(request.url).to.include("placementId=a%20b%26c");
    });

    it("should set default currency and test flag", async function () {
      const [request] = await buildRequests([BANNER_BID_REQUEST]);
      expect(request.data.cur).to.deep.equal(["USD"]);
      expect(request.data.test).to.equal(0);
    });

    it("should use currency from params when provided", async function () {
      const [request] = await buildRequests([
        withParams(BANNER_BID_REQUEST, "bid-1", {
          sourceId: "sourceId",
          accountId: "accountId",
          currency: "EUR",
        }),
      ]);
      expect(request.data.cur).to.deep.equal(["EUR"]);
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

      it("should keep the ad server currency in request.cur", async function () {
        const [request] = await buildRequests([BANNER_BID_REQUEST]);
        expect(request.data.cur).to.deep.equal(["EUR"]);
      });
    });

    describe("multiple bids", function () {
      it("should send one request per bid even when params are the same", async function () {
        const params = { sourceId: "sourceId", accountId: "accountId" };
        const requests = await buildRequests([
          withParams(BANNER_BID_REQUEST, "bid-1", params),
          withParams(BANNER_BID_REQUEST, "bid-2", params),
        ]);

        expect(requests).to.have.lengthOf(2);
        requests.forEach((request, i) => {
          expect(request.url).to.match(
            EXCHANGE_URL_PATTERN("sourceId", "accountId"),
          );
          expect(request.data.imp).to.have.lengthOf(1);
          expect(request.data.imp[0].id).to.equal(`bid-${i + 1}`);
        });
      });

      it("should route exchange and ssp bids in a mixed auction to their own endpoints", async function () {
        const requests = await buildRequests([
          withParams(BANNER_BID_REQUEST, "bid-1", {
            sourceId: "sourceId",
            accountId: "accountId",
          }),
          withParams(SSP_BANNER_BID_REQUEST, "bid-2", {
            supplyPlacementId: "sp1",
          }),
        ]);

        expect(requests).to.have.lengthOf(2);

        expect(requests[0].url).to.match(
          EXCHANGE_URL_PATTERN("sourceId", "accountId"),
        );
        expect(requests[0].data.imp).to.have.lengthOf(1);
        expect(requests[0].data.imp[0].id).to.equal("bid-1");
        expect(requests[0].data.imp[0].ext.escalax).to.deep.equal({
          sourceId: "sourceId",
          accountId: "accountId",
        });

        expect(requests[1].url).to.match(SSP_URL_PATTERN("sp1"));
        expect(requests[1].data.imp).to.have.lengthOf(1);
        expect(requests[1].data.imp[0].id).to.equal("bid-2");
        expect(requests[1].data.imp[0].ext.escalax).to.deep.equal({
          supplyPlacementId: "sp1",
        });
      });

      it("should route a mixed auction correctly when the ssp bid comes first", async function () {
        const requests = await buildRequests([
          withParams(SSP_BANNER_BID_REQUEST, "bid-1", {
            supplyPlacementId: "sp1",
          }),
          withParams(BANNER_BID_REQUEST, "bid-2", {
            sourceId: "sourceId",
            accountId: "accountId",
          }),
        ]);

        expect(requests).to.have.lengthOf(2);
        expect(requests[0].url).to.match(SSP_URL_PATTERN("sp1"));
        expect(requests[0].data.imp[0].id).to.equal("bid-1");
        expect(requests[1].url).to.match(
          EXCHANGE_URL_PATTERN("sourceId", "accountId"),
        );
        expect(requests[1].data.imp[0].id).to.equal("bid-2");
      });

      it("should send distinct ssp placements to their own placementId", async function () {
        const requests = await buildRequests([
          withParams(SSP_BANNER_BID_REQUEST, "bid-1", {
            supplyPlacementId: "sp1",
          }),
          withParams(SSP_BANNER_BID_REQUEST, "bid-2", {
            supplyPlacementId: "sp2",
          }),
        ]);

        expect(requests).to.have.lengthOf(2);
        expect(requests[0].url).to.match(SSP_URL_PATTERN("sp1"));
        expect(requests[0].data.imp[0].id).to.equal("bid-1");
        expect(requests[0].data.imp[0].ext.escalax.supplyPlacementId).to.equal(
          "sp1",
        );
        expect(requests[1].url).to.match(SSP_URL_PATTERN("sp2"));
        expect(requests[1].data.imp[0].id).to.equal("bid-2");
        expect(requests[1].data.imp[0].ext.escalax.supplyPlacementId).to.equal(
          "sp2",
        );
      });
    });
  });

  describe("interpretResponse", function () {
    it("should return an empty array for an empty response", function () {
      expect(spec.interpretResponse(null, {})).to.be.an("array").that.is.empty;
    });

    it("should return an empty array for an empty body", function () {
      expect(spec.interpretResponse({ body: null }, {})).to.be.an("array").that
        .is.empty;
    });

    it("should return an empty array when the request was not built by buildRequests", function () {
      const bids = spec.interpretResponse(makeResponse("test-bid-id-1"), {
        data: { id: "x", imp: [{ id: "test-bid-id-1" }] },
      });
      expect(bids).to.be.an("array").that.is.empty;
    });

    it("should interpret an exchange banner response", async function () {
      const [request] = await buildRequests([BANNER_BID_REQUEST]);
      const bids = spec.interpretResponse(
        makeResponse("test-bid-id-1", { price: 97 }),
        request,
      );

      expect(bids).to.have.lengthOf(1);
      expect(bids[0].requestId).to.equal("test-bid-id-1");
      expect(bids[0].currency).to.equal("USD");
      expect(bids[0].cpm).to.equal(97);
      expect(bids[0].ad).to.equal("<div>admcode</div>");
      expect(bids[0].width).to.equal(300);
      expect(bids[0].height).to.equal(250);
      expect(bids[0].creativeId).to.equal("creative0");
      expect(bids[0].mediaType).to.equal("banner");
      expect(bids[0].netRevenue).to.equal(true);
      expect(bids[0].ttl).to.equal(20);
    });

    it("should interpret an ssp banner response", async function () {
      const [request] = await buildRequests([SSP_BANNER_BID_REQUEST]);
      const bids = spec.interpretResponse(
        makeResponse("test-ssp-bid-id-1", { price: 1.8 }),
        request,
      );

      expect(bids).to.have.lengthOf(1);
      expect(bids[0].requestId).to.equal("test-ssp-bid-id-1");
      expect(bids[0].currency).to.equal("USD");
      expect(bids[0].cpm).to.equal(1.8);
      expect(bids[0].mediaType).to.equal("banner");
    });

    it("should fall back to the requested currency when the response has no cur", async function () {
      const [request] = await buildRequests([
        withParams(BANNER_BID_REQUEST, "bid-1", {
          sourceId: "sourceId",
          accountId: "accountId",
          currency: "EUR",
        }),
      ]);
      const bids = spec.interpretResponse(
        makeResponse("bid-1", { cur: null }),
        request,
      );

      expect(bids).to.have.lengthOf(1);
      expect(bids[0].currency).to.equal("EUR");
    });

    if (FEATURES.VIDEO) {
      it("should interpret a video response", async function () {
        const [request] = await buildRequests([VIDEO_BID_REQUEST]);
        const vast = "<VAST version='3.0'></VAST>";
        const bids = spec.interpretResponse(
          makeResponse("test-bid-id-2", { mtype: 2, adm: vast }),
          request,
        );

        expect(bids).to.have.lengthOf(1);
        expect(bids[0].mediaType).to.equal("video");
        expect(bids[0].vastXml).to.equal(vast);
      });
    }

    if (FEATURES.NATIVE) {
      it("should interpret a native response", async function () {
        const [request] = await buildRequests([NATIVE_BID_REQUEST]);
        const nativeAdm = JSON.stringify({
          assets: [
            { id: 1, title: { text: "dummyText" } },
            {
              id: 2,
              img: { url: "https://example.com/image", w: 300, h: 250 },
            },
          ],
          link: { url: "https://example.com" },
        });
        const bids = spec.interpretResponse(
          makeResponse("test-native-bid-id-1", { mtype: 4, adm: nativeAdm }),
          request,
        );

        expect(bids).to.have.lengthOf(1);
        expect(bids[0].mediaType).to.equal("native");
        expect(bids[0].native.ortb.assets).to.have.lengthOf(2);
      });
    }

    it("should interpret each response of a split request against its own request", async function () {
      const requests = await buildRequests([
        withParams(BANNER_BID_REQUEST, "bid-1", {
          sourceId: "sourceId",
          accountId: "accountId",
        }),
        withParams(SSP_BANNER_BID_REQUEST, "bid-2", {
          supplyPlacementId: "sp1",
        }),
      ]);

      const exchangeBids = spec.interpretResponse(
        makeResponse("bid-1", { price: 3.5 }),
        requests[0],
      );
      const sspBids = spec.interpretResponse(
        makeResponse("bid-2", { price: 2.1 }),
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
