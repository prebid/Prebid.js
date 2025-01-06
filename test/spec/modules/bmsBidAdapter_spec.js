import { expect } from "chai";
import sinon from "sinon";
import { spec, storage } from "modules/bmsBidAdapter.js";

const BIDDER_CODE = "bms";
const ENDPOINT_URL =
  "https://api.prebid.int.us-east-2.bluemsdev.team/v1/bid?exchangeId=prebid";
const GVLID = 620;
const COOKIE_NAME = "bmsCookieId";
const CURRENCY = "USD";

describe("bmsBidAdapter:", function () {
  let sandbox;

  beforeEach(function () {
    sandbox = sinon.createSandbox();
  });

  afterEach(function () {
    sandbox.restore();
  });

  describe("isBidRequestValid:", function () {
    it("should return true for valid bid requests", function () {
      const validBid = {
        params: {
          placementId: "12345",
          publisherId: "67890",
        },
      };
      expect(spec.isBidRequestValid(validBid)).to.be.true;
    });

    it("should return false for invalid bid requests", function () {
      const invalidBid = {
        params: {
          placementId: "12345",
        },
      };
      expect(spec.isBidRequestValid(invalidBid)).to.be.false;
    });
  });

  describe("buildRequests:", function () {
    let validBidRequests;
    let bidderRequest;

    beforeEach(function () {
      validBidRequests = [
        {
          bidId: "bid1",
          params: {
            placementId: "12345",
            publisherId: "67890",
          },
          getFloor: () => ({ currency: CURRENCY, floor: 1.5 }),
        },
      ];

      bidderRequest = {
        refererInfo: {
          page: "https://example.com",
        },
      };

      sandbox.stub(storage, "getDataFromLocalStorage").returns("testBuyerId");
    });

    it("should build a valid OpenRTB request", function () {
      const request = spec.buildRequests(validBidRequests, bidderRequest);

      expect(request.method).to.equal("POST");
      expect(request.url).to.equal(ENDPOINT_URL);
      expect(request.options.contentType).to.equal("application/json");

      const ortbRequest = request.data;
      expect(ortbRequest.ext.gvlid).to.equal(GVLID);
      expect(ortbRequest.imp[0].bidfloor).to.equal(1.5);
      expect(ortbRequest.imp[0].bidfloorcur).to.equal(CURRENCY);
    });

    it("should omit bidfloor if getFloor is not implemented", function () {
      validBidRequests[0].getFloor = undefined;

      const request = spec.buildRequests(validBidRequests, bidderRequest);
      const ortbRequest = request.data;

      expect(ortbRequest.imp[0].bidfloor).to.be.undefined;
    });
  });

  describe("interpretResponse:", function () {
    // it("should interpret server response correctly", function () {
    //   const serverResponse = {
    //     body: {
    //       seatbid: [
    //         {
    //           bid: [
    //             {
    //               impid: "bid1",
    //               price: 1.5,
    //               ad: "<div>Ad</div>",
    //               meta: {},
    //             },
    //           ],
    //         },
    //       ],
    //     },
    //   };
    //   const request = {
    //     data: {},
    //   };
    //   const bids = spec.interpretResponse(serverResponse, request);
    //   expect(bids).to.be.an("array").that.is.not.empty;
    //   expect(bids[0].price).to.equal(1.5);
    //   expect(bids[0].meta.adapterVersion).to.equal("1.0.0");
    // });
    // it("should return an empty array if no bids are present", function () {
    //   const serverResponse = { body: { seatbid: [] } };
    //   const request = { data: {} };
    //   const bids = spec.interpretResponse(serverResponse, request);
    //   expect(bids).to.be.an("array").that.is.empty;
    // });
  });
});
