import { expect } from "chai";
import { newBidder } from "../../../src/adapters/bidderFactory.js";
import { BID_ENDPOINT, spec, storage } from "../../../modules/cwireBidAdapter.js";
import { deepClone, logInfo } from "../../../src/utils.js";
import * as utils from "src/utils.js";
import sinon, { stub } from "sinon";
import { config } from "../../../src/config.js";
import * as autoplayLib from "../../../libraries/autoplayDetection/autoplay.js";

describe("C-WIRE bid adapter", () => {
  config.setConfig({ debug: true });
  let sandbox;
  const adapter = newBidder(spec);
  const bidRequests = [
    {
      bidder: "cwire",
      params: {
        pageId: "4057",
        placementId: "ad-slot-bla",
      },
      adUnitCode: "adunit-code",
      sizes: [
        [300, 250],
        [300, 600],
      ],
      bidId: "30b31c1838de1e",
      bidderRequestId: "22edbae2733bf6",
      auctionId: "1d1a030790a475",
      transactionId: "04f2659e-c005-4eb1-a57c-fa93145e3843",
    },
  ];
  const bidderRequest = {
    pageViewId: "326dca71-9ca0-4e8f-9e4d-6106161ac1ad"
  }
  const response = {
    body: {
      cwid: "2ef90743-7936-4a82-8acf-e73382a64e94",
      hash: "17112D98BBF55D3A",
      bids: [
        {
          html: "<h1>Hello world</h1>",
          cpm: 100,
          currency: "CHF",
          dimensions: [1, 1],
          netRevenue: true,
          creativeId: "3454",
          requestId: "2c634d4ca5ccfb",
          placementId: 177,
          transactionId: "b4b32618-1350-4828-b6f0-fbb5c329e9a4",
          ttl: 360,
        },
      ],
    },
  };

  beforeEach(function () {
    sandbox = sinon.createSandbox();
  });

  afterEach(function () {
    sandbox.restore();
  });
  describe("inherited functions", function () {
    it("exists and is a function", function () {
      expect(adapter.callBids).to.exist.and.to.be.a("function");
      expect(spec.isBidRequestValid).to.exist.and.to.be.a("function");
      expect(spec.buildRequests).to.exist.and.to.be.a("function");
      expect(spec.interpretResponse).to.exist.and.to.be.a("function");
    });
  });
  describe("buildRequests", function () {
    it("sends bid request to ENDPOINT via POST", function () {
      const request = spec.buildRequests(bidRequests, bidderRequest);
      expect(request.url).to.equal(BID_ENDPOINT);
      expect(request.method).to.equal("POST");
    });
  });
  describe("buildRequests with given creative", function () {
    let utilsStub;

    beforeEach(function () {
      utilsStub = stub(utils, "getParameterByName").callsFake(function () {
        return "str-str";
      });
    });

    afterEach(function () {
      utilsStub.restore();
    });

    it("should add creativeId if url parameter given", function () {
      // set from bid.params
      const bidRequest = deepClone(bidRequests[0]);

      const request = spec.buildRequests([bidRequest], bidderRequest);
      const payload = JSON.parse(request.data);
      expect(payload.cwcreative).to.exist;
      expect(payload.cwcreative).to.deep.equal("str-str");
    });
  });

  describe("buildRequests reads adUnit offsetWidth and offsetHeight", function () {
    beforeEach(function () {
      const documentStub = sandbox.stub(document, "getElementById");
      documentStub.withArgs(`${bidRequests[0].adUnitCode}`).returns({
        offsetWidth: 200,
        offsetHeight: 250,
        getBoundingClientRect() {
          return { width: 200, height: 250 };
        },
      });
    });
    it("width and height should be set", function () {
      const bidRequest = deepClone(bidRequests[0]);

      const request = spec.buildRequests([bidRequest], bidderRequest);
      const payload = JSON.parse(request.data);
      const el = document.getElementById(`${bidRequest.adUnitCode}`);

      logInfo(JSON.stringify(payload));

      expect(el).to.exist;
      expect(payload.slots[0].cwExt.dimensions.width).to.equal(200);
      expect(payload.slots[0].cwExt.dimensions.height).to.equal(250);
      expect(payload.slots[0].cwExt.style.maxHeight).to.not.exist;
      expect(payload.slots[0].cwExt.style.maxWidth).to.not.exist;
    });
    afterEach(function () {
      sandbox.restore();
    });
  });
  describe("buildRequests reads style attributes", function () {
    beforeEach(function () {
      const documentStub = sandbox.stub(document, "getElementById");
      documentStub.withArgs(`${bidRequests[0].adUnitCode}`).returns({
        style: {
          maxWidth: "400px",
          maxHeight: "350px",
        },
        getBoundingClientRect() {
          return { width: 0, height: 0 };
        },
      });
    });
    it("css maxWidth should be set", function () {
      const bidRequest = deepClone(bidRequests[0]);

      const request = spec.buildRequests([bidRequest], bidderRequest);
      const payload = JSON.parse(request.data);
      const el = document.getElementById(`${bidRequest.adUnitCode}`);

      logInfo(JSON.stringify(payload));

      expect(el).to.exist;
      expect(payload.slots[0].cwExt.style.maxWidth).to.eq("400px");
      expect(payload.slots[0].cwExt.style.maxHeight).to.eq("350px");
    });
    afterEach(function () {
      sandbox.restore();
    });
  });

  describe("buildRequests reads feature flags", function () {
    beforeEach(function () {
      sandbox.stub(utils, "getParameterByName").callsFake(function () {
        return "feature1,feature2";
      });
    });

    it("read from url parameter", function () {
      const bidRequest = deepClone(bidRequests[0]);

      const request = spec.buildRequests([bidRequest], bidderRequest);
      const payload = JSON.parse(request.data);

      logInfo(JSON.stringify(payload));

      expect(payload.featureFlags).to.exist;
      expect(payload.featureFlags).to.include.members(["feature1", "feature2"]);
    });
    afterEach(function () {
      sandbox.restore();
    });
  });

  describe("buildRequests reads cwgroups flag", function () {
    beforeEach(function () {
      sandbox.stub(utils, "getParameterByName").callsFake(function () {
        return "group1,group2";
      });
    });

    it("read from url parameter", function () {
      const bidRequest = deepClone(bidRequests[0]);

      const request = spec.buildRequests([bidRequest], bidderRequest);
      const payload = JSON.parse(request.data);

      logInfo(JSON.stringify(payload));

      expect(payload.refgroups).to.exist;
      expect(payload.refgroups).to.include.members(["group1", "group2"]);
    });
    afterEach(function () {
      sandbox.restore();
    });
  });

  describe("buildRequests reads debug flag", function () {
    beforeEach(function () {
      sandbox.stub(utils, "getParameterByName").callsFake(function () {
        return "true";
      });
    });

    it("read from url parameter", function () {
      const bidRequest = deepClone(bidRequests[0]);

      const request = spec.buildRequests([bidRequest], bidderRequest);
      const payload = JSON.parse(request.data);

      logInfo(JSON.stringify(payload));

      expect(payload.debug).to.exist;
      expect(payload.debug).to.equal(true);
    });
    afterEach(function () {
      sandbox.restore();
    });
  });

  describe("buildRequests reads cw_id from Localstorage", function () {
    before(function () {
      sandbox.stub(storage, "localStorageIsEnabled").callsFake(() => true);
      sandbox.stub(storage, "setDataInLocalStorage");
      sandbox
        .stub(storage, "getDataFromLocalStorage")
        .callsFake((key) => "taerfagerg");
    });

    it("cw_id is set", function () {
      const bidRequest = deepClone(bidRequests[0]);

      const request = spec.buildRequests([bidRequest], bidderRequest);
      const payload = JSON.parse(request.data);

      logInfo(JSON.stringify(payload));

      expect(payload.cwid).to.exist;
      expect(payload.cwid).to.equal("taerfagerg");
    });
    afterEach(function () {
      sandbox.restore();
    });
  });

  describe("buildRequests maps flattens params for legacy compat", function () {
    beforeEach(function () {
      const documentStub = sandbox.stub(document, "getElementById");
      documentStub.withArgs(`${bidRequests[0].adUnitCode}`).returns({
        getBoundingClientRect() {
          return { width: 0, height: 0 };
        },
      });
    });
    it("pageId flattened", function () {
      const bidRequest = deepClone(bidRequests[0]);

      const request = spec.buildRequests([bidRequest], bidderRequest);
      const payload = JSON.parse(request.data);

      logInfo(JSON.stringify(payload));

      expect(payload.slots[0].pageId).to.exist;
    });
    afterEach(function () {
      sandbox.restore();
    });
  });

  describe("pageId and placementId are required params", function () {
    it("invalid request", function () {
      const bidRequest = deepClone(bidRequests[0]);
      delete bidRequest.params;

      const valid = spec.isBidRequestValid(bidRequest);
      expect(valid).to.be.false;
    });

    it("valid request", function () {
      const bidRequest = deepClone(bidRequests[0]);
      bidRequest.params.pageId = 42;
      bidRequest.params.placementId = 42;

      const valid = spec.isBidRequestValid(bidRequest);
      expect(valid).to.be.true;
    });

    it("cwcreative must be of type string", function () {
      const bidRequest = deepClone(bidRequests[0]);
      bidRequest.params.pageId = 42;
      bidRequest.params.placementId = 42;

      const valid = spec.isBidRequestValid(bidRequest);
      expect(valid).to.be.true;
    });

    it("build request adds pageId", function () {
      const bidRequest = deepClone(bidRequests[0]);

      const request = spec.buildRequests([bidRequest], bidderRequest);
      const payload = JSON.parse(request.data);

      expect(payload.slots[0].pageId).to.exist;
    });
  });

  describe("process serverResponse", function () {
    it("html to ad mapping", function () {
      const bidResponse = deepClone(response);
      const bids = spec.interpretResponse(bidResponse, {});

      expect(bids[0].ad).to.exist;
    });
  });

  describe("add user-syncs", function () {
    it("empty user-syncs if no consent given", function () {
      const userSyncs = spec.getUserSyncs({}, {}, {}, {});

      expect(userSyncs).to.be.empty;
    });
    it("empty user-syncs if no syncOption enabled", function () {
      const gdprConsent = {
        vendorData: {
          purpose: {
            consents: 1,
          },
        },
        gdprApplies: false,
        consentString: "testConsentString",
      };
      const userSyncs = spec.getUserSyncs({}, {}, gdprConsent, {});

      expect(userSyncs).to.be.empty;
    });

    it("user-syncs with enabled pixel option", function () {
      const gdprConsent = {
        vendorData: {
          purpose: {
            consents: 1,
          },
        },
        gdprApplies: false,
        consentString: "testConsentString",
      };
      const synOptions = { pixelEnabled: true, iframeEnabled: true };
      const userSyncs = spec.getUserSyncs(synOptions, {}, gdprConsent, {});

      expect(userSyncs[0].type).to.equal("image");
      expect(userSyncs[0].url).to.equal(
        "https://ib.adnxs.com/getuid?https://prebid.cwi.re/v1/cookiesync?xandrId=$UID&gdpr=0&gdpr_consent=testConsentString"
      );
    });

    it("user-syncs with enabled iframe option", function () {
      const gdprConsent = {
        vendorData: {
          purpose: {
            consents: {
              1: true,
            },
          },
        },
        gdprApplies: true,
        consentString: "abc123",
      };
      const synOptions = { iframeEnabled: true };
      const userSyncs = spec.getUserSyncs(synOptions, {}, gdprConsent, {});

      expect(userSyncs[0].type).to.equal("iframe");
      expect(userSyncs[0].url).to.equal(
        "https://ib.adnxs.com/getuid?https://prebid.cwi.re/v1/cookiesync?xandrId=$UID&gdpr=1&gdpr_consent=abc123"
      );
    });
  });

  describe("buildRequests includes autoplay", function () {
    afterEach(function () {
      sandbox.restore();
    });

    it("should include autoplay: true when autoplay is enabled", function () {
      sandbox.stub(autoplayLib, "isAutoplayEnabled").returns(true);

      const bidRequest = deepClone(bidRequests[0]);
      const request = spec.buildRequests([bidRequest], bidderRequest);
      const payload = JSON.parse(request.data);

      expect(payload.slots[0].params.autoplay).to.equal(true);
    });

    it("should include autoplay: false when autoplay is disabled", function () {
      sandbox.stub(autoplayLib, "isAutoplayEnabled").returns(false);

      const bidRequest = deepClone(bidRequests[0]);
      const request = spec.buildRequests([bidRequest], bidderRequest);
      const payload = JSON.parse(request.data);

      expect(payload.slots[0].params.autoplay).to.equal(false);
    });
  });

  describe("buildRequests with floor", function () {
    it("should include floor in params when getFloor is defined", function () {
      const bid = {
        bidId: "123",
        adUnitCode: "test-div",
        mediaTypes: {
          banner: {
            sizes: [[300, 250]],
          },
        },
        params: {
          pageId: 4057,
          placementId: "abc123",
        },
        getFloor: function ({ currency, mediaType, size }) {
          expect(currency).to.equal("USD");
          expect(mediaType).to.equal("*");
          expect(size).to.equal("*");
          return {
            currency: "USD",
            floor: 1.23,
          };
        },
      };

      const bidderRequest = {
        refererInfo: {
          page: "https://example.com",
        },
      };

      const request = spec.buildRequests([bid], bidderRequest);

      const payload = JSON.parse(request.data);
      const slot = payload.slots[0];

      expect(slot.params).to.have.property("floor");
      expect(slot.params.floor).to.deep.equal({
        currency: "USD",
        floor: 1.23,
      });
    });

    it("should not include floor in params if getFloor is not defined", function () {
      const bid = {
        bidId: "456",
        adUnitCode: "test-div",
        mediaTypes: {
          banner: {
            sizes: [[300, 250]],
          },
        },
        params: {
          pageId: 4057,
          placementId: "abc123",
        },
        // no getFloor
      };

      const bidderRequest = {
        refererInfo: {
          page: "https://example.com",
        },
      };

      const request = spec.buildRequests([bid], bidderRequest);
      const payload = JSON.parse(request.data);
      const slot = payload.slots[0];

      expect(slot.params.floor).to.deep.equal({});
    });
  });
});
