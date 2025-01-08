import { expect } from "chai";
import { MODULE_TYPE_RTD } from "src/activities/modules.js";
import { loadExternalScriptStub } from "test/mocks/adloaderStub.js";
import { server } from "test/mocks/xhr.js";

import {
  nodalsRtdSubmodule,
  selectByWeighting,
} from "modules/nodalsAiRtdProvider.js";

const generateGdprConsent = (consent = {}) => {
  const defaults = {
    gdprApplies: true,
    purpose1Consent: true,
    nodalsConsent: true,
  };
  const mergedConsent = Object.assign({}, defaults, consent);
  return {
    gdpr: {
      gdprApplies: mergedConsent.gdprApplies,
      consentString: mergedConsent.consentString,
      vendorData: {
        purpose: {
          consents: {
            1: mergedConsent.purpose1Consent,
            3: true,
            4: true,
            5: true,
            6: true,
            9: true,
          },
        },
        specialFeatureOptins: {
          1: true,
        },
        vendor: {
          consents: {
            1360: mergedConsent.nodalsConsent,
          },
        },
      },
    },
  };
};

const jsonResponseHeaders = {
  "Content-Type": "application/json",
};

const successPubEndpointResponse = {
  facts: {
    "browser.name": "safari",
    "geo.country": "AR",
  },
  ads: [
    {
      engine: {
        version: "1.0.0",
        url: "https://static.nodals.io/sdk/rule/1.0.0/engine.js",
      },
      onMatch: {
        weighting: 1,
        kvs: [
          {
            k: "nodalsSky12",
            v: "1",
          },
        ],
      },
      conditions: {
        ANY: [
          {
            fact: "id",
            op: "allin",
            val: ["1", "2", "3"],
          },
        ],
        NONE: [
          {
            fact: "ua.browser",
            op: "eq",
            val: "opera",
          },
        ],
      },
    },
  ],
};

describe("NodalsAI RTD Provider", () => {
  let sandbox;
  const validConfig = { publisherId: "10312dd2" };

  beforeEach(() => {
    sandbox = sinon.sandbox.create();
    nodalsRtdSubmodule.storage.removeDataFromLocalStorage(
      nodalsRtdSubmodule.STORAGE_KEY
    );
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe("utility functions", () => {
    describe("selectByWeighting", () => {
      it("should return object 1 approximately 70% of the time and object 2 approximately 30% of the time", () => {
        const options = [
          { name: "Object 1", weighting: 0.7 },
          { name: "Object 2", weighting: 0.3 },
        ];

        const trials = 10000;
        let object1Count = 0;
        let object2Count = 0;

        for (let i = 0; i < trials; i++) {
          const result = selectByWeighting(options);
          if (result.name === "Object 1") {
            object1Count++;
          } else {
            object2Count++;
          }
        }

        const object1Percentage = (object1Count / trials) * 100;
        const object2Percentage = (object2Count / trials) * 100;

        // 5% variance theshold
        expect(object1Percentage).to.be.closeTo(70, 5);
        expect(object2Percentage).to.be.closeTo(30, 5);
      });
    });
  });

  describe("Module properties", () => {
    it("should have the name property set correctly", function () {
      expect(nodalsRtdSubmodule.name).equals("nodalsAI");
    });

    it("should expose the correct TCF Global Vendor ID", function () {
      expect(nodalsRtdSubmodule.gvlid).equals(1360);
    });
  });

  describe("init()", () => {
    describe("when initialized with empty consent data", () => {
      const userConsent = {};

      it("should return true when initialized with valid config and empty user consent", function () {
        const result = nodalsRtdSubmodule.init(validConfig, userConsent);
        expect(result).to.be.true;
        expect(server.requests.length).to.equal(1);
      });

      it("should return false when initialized with invalid config", () => {
        const config = { invalid: true };
        const result = nodalsRtdSubmodule.init(config, userConsent);
        expect(result).to.be.false;
        expect(server.requests.length).to.equal(0);
      });
    });

    describe("when initialized with valid config data", () => {
      it("should return false when user is under GDPR jurisdiction and purpose1 has not been granted", () => {
        const userConsent = generateGdprConsent({ purpose1Consent: false });
        const result = nodalsRtdSubmodule.init(validConfig, userConsent);
        expect(result).to.be.false;
      });

      it("should return false when user is under GDPR jurisdiction and NodalsAI as a vendor has no consent", () => {
        const userConsent = generateGdprConsent({ nodalsConsent: false });
        const result = nodalsRtdSubmodule.init(validConfig, userConsent);
        expect(result).to.be.false;
      });

      it("should return true when user is under GDPR jurisdiction and all consent provided", function () {
        const userConsent = generateGdprConsent();
        const result = nodalsRtdSubmodule.init(validConfig, userConsent);
        expect(result).to.be.true;
      });

      it("should return true when user is not under GDPR jurisdiction", () => {
        const userConsent = generateGdprConsent({ gdprApplies: false });
        const result = nodalsRtdSubmodule.init(validConfig, userConsent);
        expect(result).to.be.true;
      });
    });

    describe("when initialized with valid config and data already in storage", () => {
      it("should return true and not make a remote request when stored data is valid", function () {
        nodalsRtdSubmodule.storage.setDataInLocalStorage(
          nodalsRtdSubmodule.STORAGE_KEY,
          JSON.stringify({ createdAt: Date.now(), data: { foo: "bar" } })
        );
        const result = nodalsRtdSubmodule.init(validConfig, {});
        expect(result).to.be.true;
        expect(server.requests.length).to.equal(0);
      });

      it("should return true and make a remote request when stored data has no TTL defined", function () {
        nodalsRtdSubmodule.storage.setDataInLocalStorage(
          nodalsRtdSubmodule.STORAGE_KEY,
          JSON.stringify({ data: { foo: "bar" } })
        );
        const result = nodalsRtdSubmodule.init(validConfig, {});
        expect(result).to.be.true;
        expect(server.requests.length).to.equal(1);
      });

      it("should return true and make a remote request when stored data has expired", function () {
        nodalsRtdSubmodule.storage.setDataInLocalStorage(
          nodalsRtdSubmodule.STORAGE_KEY,
          JSON.stringify({ createdAt: 100, data: { foo: "bar" } })
        );
        const result = nodalsRtdSubmodule.init(validConfig, {});
        expect(result).to.be.true;
        expect(server.requests.length).to.equal(1);
      });
    });

    describe("when performing requests to the publisher endpoint", () => {
      it("should construct the correct URL to the default origin", () => {
        const userConsent = generateGdprConsent();
        nodalsRtdSubmodule.init(validConfig, userConsent);

        let request = server.requests[0];

        expect(request.method).to.equal("GET");
        expect(request.withCredentials).to.be.false;
        const requestUrl = new URL(request.url);
        expect(requestUrl.origin).to.equal("https://i.d.nodals.io");
      });

      it("should construct the correct URL with the correct path", () => {
        const userConsent = generateGdprConsent();
        nodalsRtdSubmodule.init(validConfig, userConsent);

        let request = server.requests[0];
        const requestUrl = new URL(request.url);
        expect(requestUrl.pathname).to.equal("/p/v1/10312dd2/config");
      });

      it("should construct the correct URL with the correct GDPR query params", () => {
        const consentData = {
          consentString: "foobarbaz",
        };
        const userConsent = generateGdprConsent(consentData);
        nodalsRtdSubmodule.init(validConfig, userConsent);

        let request = server.requests[0];
        const requestUrl = new URL(request.url);
        expect(requestUrl.searchParams.get("gdpr")).to.equal("1");
        expect(requestUrl.searchParams.get("gdpr_consent")).to.equal(
          "foobarbaz"
        );
        expect(requestUrl.searchParams.get("us_privacy")).to.equal("");
        expect(requestUrl.searchParams.get("gpp")).to.equal("");
        expect(requestUrl.searchParams.get("gpp_sid")).to.equal("");
      });
    });

    describe("when handling responses from the publisher endpoint", () => {
      it("should store successful response data in local storage", () => {
        const userConsent = generateGdprConsent();
        nodalsRtdSubmodule.init(validConfig, userConsent);

        let request = server.requests[0];
        request.respond(
          200,
          jsonResponseHeaders,
          JSON.stringify(successPubEndpointResponse)
        );

        const storedData = JSON.parse(
          nodalsRtdSubmodule.storage.getDataFromLocalStorage(
            nodalsRtdSubmodule.STORAGE_KEY
          )
        );
        expect(request.method).to.equal("GET");
        expect(storedData).to.have.property("createdAt");
        expect(storedData.data).to.deep.equal(successPubEndpointResponse);
      });

      it("should attempt to load the referenced script libraries contained in the response payload", () => {
        const userConsent = generateGdprConsent();
        nodalsRtdSubmodule.init(validConfig, userConsent);

        let request = server.requests[0];
        request.respond(
          200,
          jsonResponseHeaders,
          JSON.stringify(successPubEndpointResponse)
        );

        expect(
          loadExternalScriptStub.calledWith(
            successPubEndpointResponse.ads[0].engine.url,
            MODULE_TYPE_RTD,
            nodalsRtdSubmodule.name
          )
        ).to.be.true;
      });
    });
  });

  describe("getTargetingData()", () => {
    afterEach(() => {
      if (window.$nodals) {
        delete window.$nodals;
      }
    });

    const stubVersionedTargetingEngine = (version, returnValue) => {
      const fnStub = sinon.stub();
      fnStub.returns(returnValue);
      window.$nodals = window.$nodals || {};
      window.$nodals.targetingEngine = window.$nodals.targetingEngine || {};
      window.$nodals.targetingEngine[version] = {
        getTargetingKeyValueForAdSlot: fnStub,
      };
      return window.$nodals.targetingEngine[version];
    };

    describe("for a single ad unit", () => {
      it("should return an empty object when no data is available in local storage", () => {
        const result = nodalsRtdSubmodule.getTargetingData(
          ["adUnit1"],
          validConfig,
          {}
        );
        expect(result).to.deep.equal({});
      });

      it("should pass the correct data to the rule engine", () => {
        const returnData = {};
        returnData[successPubEndpointResponse.ads[0].onMatch.kvs[0].k] =
          successPubEndpointResponse.ads[0].onMatch.kvs[0].v;
        const engine_v1 = stubVersionedTargetingEngine(
          successPubEndpointResponse.ads[0].engine.version,
          returnData
        );
        const userConsent = generateGdprConsent();
        nodalsRtdSubmodule.storage.setDataInLocalStorage(
          nodalsRtdSubmodule.STORAGE_KEY,
          JSON.stringify({
            createdAt: Date.now(),
            data: successPubEndpointResponse,
          })
        );

        nodalsRtdSubmodule.getTargetingData(
          ["adUnit1"],
          validConfig,
          userConsent
        );

        expect(engine_v1.getTargetingKeyValueForAdSlot.called).to.be.true;
        const args = engine_v1.getTargetingKeyValueForAdSlot.getCall(0).args;
        expect(args[0]).to.equal("adUnit1");
        expect(args[1]).to.deep.equal(successPubEndpointResponse.ads[0]);
        expect(args[2])
          .to.be.an("object")
          .with.keys([
            "browser.name",
            "geo.country",
            "browser.lang",
            "browser.width",
            "browser.height",
            "permutive.cohort.ids",
          ]);
      });

      it("should return the correct key-values for a single 100% weighted ad", () => {
        const returnData = {};
        returnData[successPubEndpointResponse.ads[0].onMatch.kvs[0].k] =
          successPubEndpointResponse.ads[0].onMatch.kvs[0].v;
        const engine_v1 = stubVersionedTargetingEngine(
          successPubEndpointResponse.ads[0].engine.version,
          returnData
        );
        const userConsent = generateGdprConsent();
        nodalsRtdSubmodule.storage.setDataInLocalStorage(
          nodalsRtdSubmodule.STORAGE_KEY,
          JSON.stringify({
            createdAt: Date.now(),
            data: successPubEndpointResponse,
          })
        );

        const result = nodalsRtdSubmodule.getTargetingData(
          ["adUnit1"],
          validConfig,
          userConsent
        );

        expect(result).to.deep.equal({ adUnit1: { nodalsSky12: "1" } });
      });

      it("should return an empty object when data is available, but user has not provided consent", () => {
        const returnData = {};
        returnData[successPubEndpointResponse.ads[0].onMatch.kvs[0].k] =
          successPubEndpointResponse.ads[0].onMatch.kvs[0].v;
        const engine_v1 = stubVersionedTargetingEngine(
          successPubEndpointResponse.ads[0].engine.version,
          returnData
        );
        const userConsent = generateGdprConsent({ nodalsConsent: false });
        nodalsRtdSubmodule.storage.setDataInLocalStorage(
          nodalsRtdSubmodule.STORAGE_KEY,
          JSON.stringify({
            createdAt: Date.now(),
            data: successPubEndpointResponse,
          })
        );

        const result = nodalsRtdSubmodule.getTargetingData(
          ["adUnit1"],
          validConfig,
          userConsent
        );

        expect(result).to.deep.equal({});
      });

      it("should return the correct multiple key-values for a single 100% weighted ad", () => {
        const clonedResponse = JSON.parse(
          JSON.stringify(successPubEndpointResponse)
        );
        clonedResponse.ads[0].onMatch.kvs.push({ k: "nodalsSky13", v: "2" });
        const returnData = {};
        returnData[clonedResponse.ads[0].onMatch.kvs[0].k] =
          clonedResponse.ads[0].onMatch.kvs[0].v;
        returnData[clonedResponse.ads[0].onMatch.kvs[1].k] =
          clonedResponse.ads[0].onMatch.kvs[1].v;
        const engine_v1 = stubVersionedTargetingEngine(
          clonedResponse.ads[0].engine.version,
          returnData
        );
        const userConsent = generateGdprConsent();
        nodalsRtdSubmodule.storage.setDataInLocalStorage(
          nodalsRtdSubmodule.STORAGE_KEY,
          JSON.stringify({
            createdAt: Date.now(),
            data: clonedResponse,
          })
        );

        const result = nodalsRtdSubmodule.getTargetingData(
          ["adUnit1"],
          validConfig,
          userConsent
        );

        expect(result).to.deep.equal({
          adUnit1: { nodalsSky12: "1", nodalsSky13: "2" },
        });
      });
    });

    describe("for multiple ad units", () => {
      it("should pass the correct data to the rule engine for a single ad", () => {
        const returnData = {};
        returnData[successPubEndpointResponse.ads[0].onMatch.kvs[0].k] =
          successPubEndpointResponse.ads[0].onMatch.kvs[0].v;
        const engine_v1 = stubVersionedTargetingEngine(
          successPubEndpointResponse.ads[0].engine.version,
          returnData
        );
        const userConsent = generateGdprConsent();
        nodalsRtdSubmodule.storage.setDataInLocalStorage(
          nodalsRtdSubmodule.STORAGE_KEY,
          JSON.stringify({
            createdAt: Date.now(),
            data: successPubEndpointResponse,
          })
        );

        nodalsRtdSubmodule.getTargetingData(
          ["adUnit1", "adUnit2"],
          validConfig,
          userConsent
        );

        const firstCallArgs =
          engine_v1.getTargetingKeyValueForAdSlot.getCall(0).args;
        expect(firstCallArgs[0]).to.equal("adUnit1");
        expect(firstCallArgs[1]).to.deep.equal(
          successPubEndpointResponse.ads[0]
        );

        const secondCallArgs =
          engine_v1.getTargetingKeyValueForAdSlot.getCall(1).args;
        expect(secondCallArgs[0]).to.equal("adUnit2");
        expect(secondCallArgs[1]).to.deep.equal(
          successPubEndpointResponse.ads[0]
        );
      });

      it("should pass the correct data to the rule engine for two ads", () => {
        const clonedAd = JSON.parse(
          JSON.stringify(successPubEndpointResponse.ads[0])
        );
        clonedAd.onMatch.kvs[0] = { k: "adv2", v: "22" };
        const clonedResponse = JSON.parse(
          JSON.stringify(successPubEndpointResponse)
        );
        clonedResponse.ads.push(clonedAd);
        const returnData = {};
        returnData[clonedResponse.ads[0].onMatch.kvs[0].k] =
          clonedResponse.ads[0].onMatch.kvs[0].v;
        returnData[clonedResponse.ads[1].onMatch.kvs[0].k] =
          clonedResponse.ads[1].onMatch.kvs[0].v;
        const engine_v1 = stubVersionedTargetingEngine(
          clonedResponse.ads[0].engine.version,
          returnData
        );
        const userConsent = generateGdprConsent();
        nodalsRtdSubmodule.storage.setDataInLocalStorage(
          nodalsRtdSubmodule.STORAGE_KEY,
          JSON.stringify({
            createdAt: Date.now(),
            data: clonedResponse,
          })
        );

        nodalsRtdSubmodule.getTargetingData(
          ["adUnit1", "adUnit2"],
          validConfig,
          userConsent
        );

        const firstCallArgs =
          engine_v1.getTargetingKeyValueForAdSlot.getCall(0).args;
        expect(firstCallArgs[0]).to.equal("adUnit1");
        expect(firstCallArgs[1]).to.deep.equal(clonedResponse.ads[0]);

        const secondCallArgs =
          engine_v1.getTargetingKeyValueForAdSlot.getCall(1).args;
        expect(secondCallArgs[0]).to.equal("adUnit1");
        expect(secondCallArgs[1]).to.deep.equal(clonedResponse.ads[1]);

        const thirdCallArgs =
          engine_v1.getTargetingKeyValueForAdSlot.getCall(2).args;
        expect(thirdCallArgs[0]).to.equal("adUnit2");
        expect(thirdCallArgs[1]).to.deep.equal(clonedResponse.ads[0]);

        const forthCallArgs =
          engine_v1.getTargetingKeyValueForAdSlot.getCall(3).args;
        expect(forthCallArgs[0]).to.equal("adUnit2");
        expect(forthCallArgs[1]).to.deep.equal(clonedResponse.ads[1]);
      });

      it("should return the correct key values for the matched ad with 1 weighting", () => {
        const clonedAd = JSON.parse(
          JSON.stringify(successPubEndpointResponse.ads[0])
        );
        clonedAd.onMatch.weighting = 0;
        clonedAd.engine.version = "2.0.0";
        clonedAd.onMatch.kvs[0] = { k: "adv2", v: "22" };
        const clonedResponse = JSON.parse(
          JSON.stringify(successPubEndpointResponse)
        );
        clonedResponse.ads.push(clonedAd);
        clonedResponse.ads[0].onMatch.weighting = 1;
        const v1ReturnData = {};
        v1ReturnData[clonedResponse.ads[0].onMatch.kvs[0].k] =
          clonedResponse.ads[0].onMatch.kvs[0].v;
        const v2ReturnData = {};
        v2ReturnData[clonedResponse.ads[1].onMatch.kvs[0].k] =
          clonedResponse.ads[1].onMatch.kvs[0].v;
        const v1Engine = stubVersionedTargetingEngine(
          clonedResponse.ads[0].engine.version,
          v1ReturnData
        );
        const v2Engine = stubVersionedTargetingEngine(
          clonedResponse.ads[1].engine.version,
          v2ReturnData
        );
        const userConsent = generateGdprConsent();
        nodalsRtdSubmodule.storage.setDataInLocalStorage(
          nodalsRtdSubmodule.STORAGE_KEY,
          JSON.stringify({
            createdAt: Date.now(),
            data: clonedResponse,
          })
        );

        const result = nodalsRtdSubmodule.getTargetingData(
          ["adUnit1", "adUnit2"],
          validConfig,
          userConsent
        );

        expect(result).to.deep.equal({
          adUnit1: { nodalsSky12: "1" },
          adUnit2: { nodalsSky12: "1" },
        });
      });

      it("should return the correct key values with weightings reversed for matched ads", () => {
        const clonedAd = JSON.parse(
          JSON.stringify(successPubEndpointResponse.ads[0])
        );
        clonedAd.onMatch.weighting = 1;
        clonedAd.engine.version = "2.0.0";
        clonedAd.onMatch.kvs[0] = { k: "adv2", v: "22" };
        const clonedResponse = JSON.parse(
          JSON.stringify(successPubEndpointResponse)
        );
        clonedResponse.ads.push(clonedAd);
        clonedResponse.ads[0].onMatch.weighting = 0;
        const v1ReturnData = {};
        v1ReturnData[clonedResponse.ads[0].onMatch.kvs[0].k] =
          clonedResponse.ads[0].onMatch.kvs[0].v;
        const v2ReturnData = {};
        v2ReturnData[clonedResponse.ads[1].onMatch.kvs[0].k] =
          clonedResponse.ads[1].onMatch.kvs[0].v;
        const v1Engine = stubVersionedTargetingEngine(
          clonedResponse.ads[0].engine.version,
          v1ReturnData
        );
        const v2Engine = stubVersionedTargetingEngine(
          clonedResponse.ads[1].engine.version,
          v2ReturnData
        );
        const userConsent = generateGdprConsent();
        nodalsRtdSubmodule.storage.setDataInLocalStorage(
          nodalsRtdSubmodule.STORAGE_KEY,
          JSON.stringify({
            createdAt: Date.now(),
            data: clonedResponse,
          })
        );

        const result = nodalsRtdSubmodule.getTargetingData(
          ["adUnit1", "adUnit2"],
          validConfig,
          userConsent
        );

        expect(result).to.deep.equal({
          adUnit1: { adv2: "22" },
          adUnit2: { adv2: "22" },
        });
      });
    });
  });
});
