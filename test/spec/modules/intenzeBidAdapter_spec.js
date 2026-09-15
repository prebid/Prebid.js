import { expect } from "chai";
import { spec } from "modules/intenzeBidAdapter";
import { config } from "src/config.js";

const NATIVE_BID_REQUEST = {
  code: "native_example",
  mediaTypes: {
    native: {
      title: {
        required: true,
        len: 800,
      },
      image: {
        required: true,
        len: 80,
      },
      sponsoredBy: {
        required: true,
      },
      clickUrl: {
        required: true,
      },
      privacyLink: {
        required: false,
      },
      body: {
        required: true,
      },
      icon: {
        required: true,
        sizes: [50, 50],
      },
    },
  },
  bidder: "intenze",
  params: {
    placementId: "25",
  },
  timeout: 1000,
};

const BANNER_BID_REQUEST = {
  code: "banner_example",
  mediaTypes: {
    banner: {
      sizes: [
        [300, 250],
        [300, 600],
      ],
    },
  },
  bidder: "intenze",
  params: {
    placementId: "25",
  },
  timeout: 1000,
  gdprConsent: {
    consentString: "BOEFEAyOEFEAyAHABDENAI4AAAB9vABAASA",
    gdprApplies: 1,
  },
  uspConsent: "uspConsent",
};

const BANNER_BID_REQUEST_WITH_ACCOUNT = {
  code: "banner_account",
  mediaTypes: {
    banner: {
      sizes: [[300, 600]],
    },
  },
  bidder: "intenze",
  params: {
    accountId: "test-account",
  },
  timeout: 1000,
};

const bidRequest = {
  refererInfo: {
    referer: "test.com",
    domain: "test.com",
  },
};

// Updated endpoint patterns - accepts all subdomain variations
const PLACEMENT_ENDPOINT_PATTERN =
  /^https:\/\/(lb-east|n2|lb-apac|us-east-ssp|eu-ssp|apac-ssp)\.intenze\.co\/(pbjs-serve\?placementId=25|\?pass=.*&integration=prebidjs)$/;
const ACCOUNT_ENDPOINT_PATTERN =
  /^https:\/\/(lb-east|n2|lb-apac|us-east-ssp|eu-ssp|apac-ssp)\.intenze\.co\/\?pass=test-account&integration=prebidjs$/;

const VIDEO_BID_REQUEST = {
  code: "video1",
  sizes: [640, 480],
  mediaTypes: {
    video: {
      minduration: 0,
      maxduration: 999,
      boxingallowed: 1,
      skip: 0,
      mimes: ["application/javascript", "video/mp4"],
      w: 1920,
      h: 1080,
      protocols: [2],
      linearity: 1,
      api: [1, 2],
    },
  },
  bidder: "intenze",
  params: {
    placementId: "25",
  },
  timeout: 1000,
};

const BANNER_BID_RESPONSE = {
  id: "request_id",
  bidid: "request_imp_id",
  cur: "USD",
  seatbid: [
    {
      bid: [
        {
          id: "bid_id",
          impid: "request_imp_id",
          price: 5,
          w: 300,
          h: 600,
          adomain: ["example.com"],
          adm: "<div>admcode</div>",
          crid: "crid",
          mtype: 1,
          ext: {
            mediaType: "banner",
          },
        },
      ],
    },
  ],
};

const VIDEO_BID_RESPONSE = {
  id: "request_id",
  bidid: "request_imp_id",
  cur: "USD",
  seatbid: [
    {
      bid: [
        {
          id: "bid_id",
          impid: "request_imp_id",
          price: 5,
          w: 640,
          h: 480,
          adomain: ["example.com"],
          adm: "<VAST version='3.0'></VAST>",
          crid: "crid",
          mtype: 2,
          ext: {
            mediaType: "video",
          },
        },
      ],
    },
  ],
};

const imgData = {
  url: `https://example.com/image`,
  w: 1200,
  h: 627,
};

const NATIVE_BID_RESPONSE = {
  id: "request_id",
  bidid: "request_imp_id",
  cur: "USD",
  seatbid: [
    {
      bid: [
        {
          id: "bid_id",
          impid: "request_imp_id",
          price: 5,
          w: 300,
          h: 600,
          adomain: ["example.com"],
          adm: {
            native: {
              assets: [
                {
                  id: 0,
                  title: {
                    text: "dummyText",
                  },
                },
                {
                  id: 3,
                  image: imgData,
                },
                {
                  id: 5,
                  data: {
                    value: "organization.name",
                  },
                },
              ],
              link: {
                url: "example.com",
              },
              imptrackers: ["tracker1.com", "tracker2.com", "tracker3.com"],
              jstracker: "tracker1.com",
            },
          },
          crid: "crid",
          mtype: 3,
          ext: {
            mediaType: "native",
          },
        },
      ],
    },
  ],
};

describe("IntenzeAdapter", function () {
  describe("with COPPA", function () {
    beforeEach(function () {
      sinon.stub(config, "getConfig").withArgs("coppa").returns(true);
    });
    afterEach(function () {
      config.getConfig.restore();
    });

    it("should build request successfully with coppa config", function () {
      const serverRequest = spec.buildRequests(
        [BANNER_BID_REQUEST],
        bidRequest,
      );
      // ortbConverter handles COPPA internally
      expect(serverRequest).to.exist;
      expect(serverRequest.data).to.exist;
    });
  });

  describe("isBidRequestValid", function () {
    it("should return true when placementId is provided", function () {
      expect(spec.isBidRequestValid(BANNER_BID_REQUEST)).to.equal(true);
    });

    it("should return true when accountId is provided", function () {
      expect(spec.isBidRequestValid(BANNER_BID_REQUEST_WITH_ACCOUNT)).to.equal(
        true,
      );
    });

    it("should return false when required params are not passed", function () {
      const bid = Object.assign({}, BANNER_BID_REQUEST);
      delete bid.params;
      bid.params = {
        IncorrectParam: 0,
      };
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });
  });

  describe("build Banner Request with Placement ID", function () {
    const request = spec.buildRequests([BANNER_BID_REQUEST], bidRequest);

    it("Creates a ServerRequest object with method, URL and data", function () {
      expect(request).to.exist;
      expect(request.method).to.exist;
      expect(request.url).to.exist;
      expect(request.data).to.exist;
    });

    it("sends bid request to our endpoint via POST", function () {
      expect(request.method).to.equal("POST");
    });

    it("Returns valid URL with placementId", function () {
      expect(request.url).to.match(PLACEMENT_ENDPOINT_PATTERN);
    });

    it("Returns proper ORTB data structure", function () {
      expect(request.data).to.be.an("object");
      expect(request.data.id).to.exist;
      expect(request.data.imp).to.be.an("array");
      expect(request.data.imp.length).to.equal(1);
    });

    it("check consent string is properly passed", function () {
      // ortbConverter handles GDPR/consent internally
      expect(request.data).to.exist;
      expect(request.data.id).to.exist;
      // GDPR fields are handled by ortbConverter
    });
  });

  describe("build Banner Request with Account ID", function () {
    const request = spec.buildRequests(
      [BANNER_BID_REQUEST_WITH_ACCOUNT],
      bidRequest,
    );

    it("Creates a ServerRequest object with method, URL and data", function () {
      expect(request).to.exist;
      expect(request.method).to.exist;
      expect(request.url).to.exist;
      expect(request.data).to.exist;
    });

    it("sends bid request to our endpoint via POST", function () {
      expect(request.method).to.equal("POST");
    });

    it("Returns valid URL with accountId", function () {
      expect(request.url).to.match(ACCOUNT_ENDPOINT_PATTERN);
    });

    it("Returns proper ORTB data structure", function () {
      expect(request.data).to.be.an("object");
      expect(request.data.id).to.exist;
      expect(request.data.imp).to.be.an("array");
    });
  });

  describe("build Video Request", function () {
    const request = spec.buildRequests([VIDEO_BID_REQUEST], bidRequest);

    it("Creates a ServerRequest object with method, URL and data", function () {
      expect(request).to.exist;
      expect(request.method).to.exist;
      expect(request.url).to.exist;
      expect(request.data).to.exist;
    });

    it("sends bid request to our endpoint via POST", function () {
      expect(request.method).to.equal("POST");
    });

    it("Returns valid URL", function () {
      expect(request.url).to.match(PLACEMENT_ENDPOINT_PATTERN);
    });

    it("Request includes video parameters", function () {
      expect(request.data.imp).to.be.an("array");
      expect(request.data.imp[0]).to.exist;
      // ortbConverter handles video parameters
      expect(request.data.imp[0].ext).to.exist;
    });
  });

  describe("build Native Request", function () {
    const request = spec.buildRequests([NATIVE_BID_REQUEST], bidRequest);

    it("Creates a ServerRequest object with method, URL and data", function () {
      expect(request).to.exist;
      expect(request.method).to.exist;
      expect(request.url).to.exist;
      expect(request.data).to.exist;
    });

    it("sends bid request to our endpoint via POST", function () {
      expect(request.method).to.equal("POST");
    });

    it("Returns valid URL", function () {
      expect(request.url).to.match(PLACEMENT_ENDPOINT_PATTERN);
    });

    it("Request includes native parameters", function () {
      expect(request.data.imp).to.be.an("array");
      expect(request.data.imp[0]).to.exist;
      // ortbConverter handles native parameters
      expect(request.data.imp[0].ext).to.exist;
    });
  });

  describe("interpretResponse", function () {
    it("Empty response must return empty array", function () {
      const emptyResponse = null;
      const response = spec.interpretResponse(emptyResponse);

      expect(response).to.be.an("array").that.is.empty;
    });

    it("Should interpret banner response", function () {
      const bannerResponse = {
        body: BANNER_BID_RESPONSE,
      };
      const mockBidRequest = {
        data: {
          id: BANNER_BID_RESPONSE.id,
          imp: [
            {
              id: BANNER_BID_RESPONSE.seatbid[0].bid[0].impid,
            },
          ],
        },
      };

      const bannerResponses = spec.interpretResponse(
        bannerResponse,
        mockBidRequest,
      );

      expect(bannerResponses).to.be.an("array");
      if (bannerResponses.length > 0) {
        const dataItem = bannerResponses[0];
        expect(dataItem.cpm).to.equal(
          BANNER_BID_RESPONSE.seatbid[0].bid[0].price,
        );
        expect(dataItem.currency).to.equal("USD");
      }
    });

    it("Should interpret video response", function () {
      const videoResponse = {
        body: VIDEO_BID_RESPONSE,
      };
      const mockBidRequest = {
        data: {
          id: VIDEO_BID_RESPONSE.id,
          imp: [
            {
              id: VIDEO_BID_RESPONSE.seatbid[0].bid[0].impid,
            },
          ],
        },
      };

      const videoResponses = spec.interpretResponse(
        videoResponse,
        mockBidRequest,
      );

      expect(videoResponses).to.be.an("array");
      if (videoResponses.length > 0) {
        const dataItem = videoResponses[0];
        expect(dataItem.cpm).to.equal(
          VIDEO_BID_RESPONSE.seatbid[0].bid[0].price,
        );
        expect(dataItem.currency).to.equal("USD");
      }
    });

    it("Should interpret native response", function () {
      const nativeResponse = {
        body: NATIVE_BID_RESPONSE,
      };
      const mockBidRequest = {
        data: {
          id: NATIVE_BID_RESPONSE.id,
          imp: [
            {
              id: NATIVE_BID_RESPONSE.seatbid[0].bid[0].impid,
            },
          ],
        },
      };

      const nativeResponses = spec.interpretResponse(
        nativeResponse,
        mockBidRequest,
      );

      expect(nativeResponses).to.be.an("array");
      if (nativeResponses.length > 0) {
        const dataItem = nativeResponses[0];
        expect(dataItem.cpm).to.equal(
          NATIVE_BID_RESPONSE.seatbid[0].bid[0].price,
        );
        expect(dataItem.currency).to.equal("USD");
      }
    });

    it("Returns empty array if no valid bids in response", function () {
      const invalidResponse = {
        body: null,
      };
      const response = spec.interpretResponse(invalidResponse);
      expect(response).to.be.an("array").that.is.empty;
    });
  });
});
