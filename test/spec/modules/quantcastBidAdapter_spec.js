import { expect } from "chai";
import { spec as qcSpec } from "../../../modules/quantcastBidAdapter";
import { newBidder } from "../../../src/adapters/bidderFactory";

describe("Quantcast adapter", () => {
  const quantcastAdapter = newBidder(qcSpec);

  describe("inherited functions", () => {
    it("exists and is a function", () => {
      expect(quantcastAdapter.callBids).to.exist.and.to.be.a("function");
    });
  });

  describe("`isBidRequestValid`", () => {
    let bid = {};

    it("should return true when bid contains required params", () => {});

    it("should return `false` when bid does NOT contains required params", () => {});
  });

  describe("`buildRequests`", () => {
    it("sends bid requests to Quantcast Header Bidding Endpoints via POST", () => {});

    it("sends bid requests with `withCredentials` enabled", () => {});
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
            '<!DOCTYPE html>\n\n\n<div style="height: 250; width: 300; display: table-cell; vertical-align: middle;">\n<div style="width: 300px; margin-left: auto; margin-right: auto;">  \n\n  <script src="https://adserver.adtechus.com/addyn/3.0/5399.1/2394397/0/-1/QUANTCAST;size=300x250;target=_blank;alias=;kvp36=;sub1=;kvl=;kvc=;kvs=300x250;kvi=;kva=;sub2=;rdclick=http://exch.quantserve.com/r?a=;labels=_qc.clk,_click.adserver.rtb,_click.rand.;rtbip=;rtbdata2=;redirecturl2=" type="text/javascript"></script>\n\n<img src="https://exch.quantserve.com/pixel/p_12345.gif?media=ad&p=&r=&rand=&labels=_qc.imp,_imp.adserver.rtb&rtbip=&rtbdata2=" style="display: none;" border="0" height="1" width="1" alt="Quantcast"/>\n\n</div>\n</div>',
          width: 300,
          height: 250
        }
      ]
    };

    it("should get correct bid response", () => {
      const expectedResponse = [];
      const interpretedResponse = qcSpec.interpretResponse(response);

      expect(interpretedResponse).to.deep.equal(expectedResponse);
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
