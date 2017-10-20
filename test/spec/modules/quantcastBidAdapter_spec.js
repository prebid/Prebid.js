import * as utils from "src/utils";
import { expect } from "chai";
import {
  spec as qcSpec,
  QUANTCAST_CALLBACK_URL,
  QUANTCAST_CALLBACK_URL_TEST
} from "../../../modules/quantcastBidAdapter";
import { newBidder } from "../../../src/adapters/bidderFactory";

describe("Quantcast adapter", () => {
  const quantcastAdapter = newBidder(qcSpec);
  let bidRequest;

  beforeEach(() => {
    bidRequest = {
      bidder: "quantcast",
      bidId: "2f7b179d443f14",
      requestId: "595ffa73-d78a-46c9-b18e-f99548a5be6b",
      bidderRequestId: "1cc026909c24c8",
      placementCode: "div-gpt-ad-1438287399331-0",
      params: {
        publisherId: "test-publisher", // REQUIRED - Publisher ID provided by Quantcast
        battr: [1, 2] // OPTIONAL - Array of blocked creative attributes as per OpenRTB Spec List 5.3
      },
      sizes: [[300, 250]]
    };
  });

  describe("inherited functions", () => {
    it("exists and is a function", () => {
      expect(quantcastAdapter.callBids).to.exist.and.to.be.a("function");
    });
  });

  describe("`isBidRequestValid`", () => {
    it("should return `false` when bid is not passed", () => {
      expect(qcSpec.isBidRequestValid()).to.equal(false);
    });

    it("should return `false` when bid `mediaType` is `video`", () => {
      const bidRequest = { mediaType: "video" };

      expect(qcSpec.isBidRequestValid(bidRequest)).to.equal(false);
    });

    it("should return `true` when bid contains required params", () => {
      const bidRequest = { mediaType: "banner" };

      expect(qcSpec.isBidRequestValid(bidRequest)).to.equal(true);
    });
  });

  describe("`buildRequests`", () => {
    it("sends bid requests to Quantcast Canary Endpoint if `publisherId` is `test-publisher`", () => {
      const requests = qcSpec.buildRequests([bidRequest]);

      switch (window.location.protocol) {
        case "https:":
          expect(requests[0]["url"]).to.equal(
            `https://${QUANTCAST_CALLBACK_URL_TEST}:8443/qchb`
          );
          break;
        default:
          expect(requests[0]["url"]).to.equal(
            `http://${QUANTCAST_CALLBACK_URL_TEST}:8080/qchb`
          );
          break;
      }
    });

    it("sends bid requests to Quantcast Global Endpoint for regular `publisherId`", () => {
      const bidRequest = {
        bidder: "quantcast",
        bidId: "2f7b179d443f14",
        requestId: "595ffa73-d78a-46c9-b18e-f99548a5be6b",
        bidderRequestId: "1cc026909c24c8",
        placementCode: "div-gpt-ad-1438287399331-0",
        params: {
          publisherId: "regular-publisher", // REQUIRED - Publisher ID provided by Quantcast
          battr: [1, 2] // OPTIONAL - Array of blocked creative attributes as per OpenRTB Spec List 5.3
        },
        sizes: [[300, 250]]
      };
      const requests = qcSpec.buildRequests([bidRequest]);

      switch (window.location.protocol) {
        case "https:":
          expect(requests[0]["url"]).to.equal(
            `https://${QUANTCAST_CALLBACK_URL}:8443/qchb`
          );
          break;
        default:
          expect(requests[0]["url"]).to.equal(
            `http://${QUANTCAST_CALLBACK_URL}:8080/qchb`
          );
          break;
      }
    });

    it("sends bid requests to Quantcast Header Bidding Endpoints via POST", () => {
      const requests = qcSpec.buildRequests([bidRequest]);

      expect(requests[0].method).to.equal("POST");
    });

    it("sends bid requests with `withCredentials` enabled", () => {
      const requests = qcSpec.buildRequests([bidRequest]);

      expect(requests[0].withCredentials).to.equal(true);
    });

    it("sends bid requests contains all the required parameters", () => {
      const referrer = utils.getTopWindowUrl();
      const loc = utils.getTopWindowLocation();
      const domain = loc.hostname;

      const requests = qcSpec.buildRequests([bidRequest]);
      const expectedBidRequest = {
        publisherId: "test-publisher",
        requestId: "2f7b179d443f14",
        imp: [
          {
            banner: {
              battr: [1, 2],
              size: [{ width: 300, height: 250 }]
            },
            placementCode: "div-gpt-ad-1438287399331-0",
            bidFloor: 1e-10
          }
        ],
        site: {
          page: loc.href,
          referrer,
          domain
        },
        bidId: "2f7b179d443f14"
      };

      expect(requests[0].data).to.equal(JSON.stringify(expectedBidRequest));
    });
  });

  describe("`interpretResponse`", () => {
    // The sample response is from https://wiki.corp.qc/display/adinf/QCX
    const response = {
      bidderCode: "qcx", // Renaming it to use CamelCase since that is what is used in the Prebid.js variable name
      requestId: "erlangcluster@qa-rtb002.us-ec.adtech.com-11417780270886458", // Added this field. This is not used now but could be useful in troubleshooting later on. Specially for sites using iFrames
      bids: [
        {
          statusCode: 1,
          placementCode: "imp1", // Changing this to placementCode to be reflective
          cpm: 4.5,
          ad:
            '<!DOCTYPE html><div style="height: 250; width: 300; display: table-cell; vertical-align: middle;"><div style="width: 300px; margin-left: auto; margin-right: auto;"><script src="https://adserver.adtechus.com/addyn/3.0/5399.1/2394397/0/-1/QUANTCAST;size=300x250;target=_blank;alias=;kvp36=;sub1=;kvl=;kvc=;kvs=300x250;kvi=;kva=;sub2=;rdclick=http://exch.quantserve.com/r?a=;labels=_qc.clk,_click.adserver.rtb,_click.rand.;rtbip=;rtbdata2=;redirecturl2=" type="text/javascript"></script><img src="https://exch.quantserve.com/pixel/p_12345.gif?media=ad&p=&r=&rand=&labels=_qc.imp,_imp.adserver.rtb&rtbip=&rtbdata2=" style="display: none;" border="0" height="1" width="1" alt="Quantcast"/></div></div>',
          width: 300,
          height: 250
        }
      ]
    };

    it("should return an empty array if `serverResponse` is `undefined`", () => {
      const interpretedResponse = qcSpec.interpretResponse();

      expect(interpretedResponse.length).to.equal(0);
    });

    it("should return an empty array if the parsed response does NOT include `bids`", () => {
      const interpretedResponse = qcSpec.interpretResponse({});

      expect(interpretedResponse.length).to.equal(0);
    });

    it("should return an empty array if the parsed response has an empty `bids`", () => {
      const interpretedResponse = qcSpec.interpretResponse({ bids: [] });

      expect(interpretedResponse.length).to.equal(0);
    });

    it("should get correct bid response", () => {
      const expectedResponse = {
        ad:
          '<!DOCTYPE html><div style="height: 250; width: 300; display: table-cell; vertical-align: middle;"><div style="width: 300px; margin-left: auto; margin-right: auto;"><script src="https://adserver.adtechus.com/addyn/3.0/5399.1/2394397/0/-1/QUANTCAST;size=300x250;target=_blank;alias=;kvp36=;sub1=;kvl=;kvc=;kvs=300x250;kvi=;kva=;sub2=;rdclick=http://exch.quantserve.com/r?a=;labels=_qc.clk,_click.adserver.rtb,_click.rand.;rtbip=;rtbdata2=;redirecturl2=" type="text/javascript"></script><img src="https://exch.quantserve.com/pixel/p_12345.gif?media=ad&p=&r=&rand=&labels=_qc.imp,_imp.adserver.rtb&rtbip=&rtbdata2=" style="display: none;" border="0" height="1" width="1" alt="Quantcast"/></div></div>',
        cpm: 4.5,
        width: 300,
        height: 250,
        requestId: "erlangcluster@qa-rtb002.us-ec.adtech.com-11417780270886458",
        bidderCode: "qcx"
      };
      const interpretedResponse = qcSpec.interpretResponse(response);

      expect(interpretedResponse[0]).to.deep.equal(expectedResponse);
    });

    it("handles no bid response", () => {
      const response = {
        bidderCode: "qcx", // Renaming it to use CamelCase since that is what is used in the Prebid.js variable name
        requestId: "erlangcluster@qa-rtb002.us-ec.adtech.com-11417780270886458", // Added this field. This is not used now but could be useful in troubleshooting later on. Specially for sites using iFrames
        bids: []
      };
      const expectedResponse = [];
      const interpretedResponse = qcSpec.interpretResponse(response);

      expect(interpretedResponse.length).to.equal(0);
    });
  });
});
