import {
  beforeInit,
  getFloorsConfig,
  pubxaiSubmodule,
  setDefaultFloorsConfig,
} from "../../../modules/pubxaiRtdProvider";
import { config } from "../../../src/config";
import * as hook from "../../../src/hook.js";

describe("pubxaiRtdProvider", () => {
  describe("beforeInit", function () {
    it("should register RTD submodule provider", function () {
      let submoduleStub = sinon.stub(hook, "submodule");
      beforeInit();
      assert(submoduleStub.calledOnceWith("realTimeData", pubxaiSubmodule));
      submoduleStub.restore();
    });
  });
  describe("submodule", () => {
    describe("name", function () {
      it("should be pubxai", function () {
        expect(pubxaiSubmodule.name).to.equal("pubxai");
      });
    });
  });
  describe("init", () => {
    it("will return true when `useRtd` is true in the provider config", () => {
      const providerConfig = { params: { useRtd: true } };
      const initResult = pubxaiSubmodule.init(providerConfig);
      expect(initResult).to.be.true;
    });
    it("will return false when `useRtd` is false in the provider config", () => {
      const providerConfig = { params: { useRtd: false } };
      const initResult = pubxaiSubmodule.init(providerConfig);
      expect(initResult).to.be.false;
    });
    // TODO: add setPriceFloors call check when useRtd is true
    it("setPriceFloors called when `useRtd` is true in the provider config", () => {});
  });
  // TODO: add getBidRequestData tests
  describe("getBidRequestData", () => {});
  // TODO: add fetchFloorRules tests
  describe("fetchFloorRules", () => {});
  // TODO: add setPriceFloors tests
  describe("setPriceFloors", () => {});
  // TODO: add setFloorsConfig tests
  describe("setFloorsConfig", () => {});
  // TODO: check if these still hold true
  describe("getFloorsConfig", () => {
    let providerConfig;
    const floorsResponse = {
      currency: "USD",
      floorProvider: "PubxFloorProvider",
      modelVersion: "gpt-mvm_AB_0.50_dt_0.75_dwt_0.95_dnt_0.25_fm_0.50",
      schema: { fields: ["gptSlot", "mediaType"] },
      values: { "*|banner": 0.02 },
    };
    beforeEach(() => {
      providerConfig = {
        params: {
          useRtd: true,
          endpoint: "http://pubxai.com:3001/floors",
          data: {
            currency: "EUR",
            floorProvider: "PubxFloorProvider",
            modelVersion: "gpt-mvm_AB_0.50_dt_0.75_dwt_0.95_dnt_0.25_fm_0.50",
            schema: { fields: ["gptSlot", "mediaType"] },
            values: { "*|banner": 0.02 },
          },
        },
      };
    });
    it("no customizations in the provider config", () => {
      const result = getFloorsConfig(providerConfig, floorsResponse);
      expect(result).to.deep.equal({
        floors: {
          enforcement: { floorDeals: true },
          data: floorsResponse,
        },
      });
    });
    it("only floormin in the provider config", () => {
      providerConfig.params.floorMin = 2;
      expect(getFloorsConfig(providerConfig, floorsResponse)).to.deep.equal({
        floors: {
          enforcement: { floorDeals: true },
          floorMin: 2,
          data: floorsResponse,
        },
      });
    });
    it("only enforcement in the provider config", () => {
      providerConfig.params.enforcement = {
        bidAdjustment: true,
        enforceJS: false,
      };
      expect(getFloorsConfig(providerConfig, floorsResponse)).to.deep.equal({
        floors: {
          enforcement: {
            bidAdjustment: true,
            enforceJS: false,
          },
          data: floorsResponse,
        },
      });
    });
    it("both floorMin and enforcement in the provider config", () => {
      providerConfig.params.floorMin = 2;
      providerConfig.params.enforcement = {
        bidAdjustment: true,
        enforceJS: false,
      };
      expect(getFloorsConfig(providerConfig, floorsResponse)).to.deep.equal({
        floors: {
          enforcement: {
            bidAdjustment: true,
            enforceJS: false,
          },
          floorMin: 2,
          data: floorsResponse,
        },
      });
    });
  });
  // TODO: modify these tests
  describe("setDefaultPriceFloors", () => {
    it("should set default floors config", () => {
      const providerConfig = {
        params: {
          useRtd: true,
          endpoint: "http://pubxai.com:3001/floors",
          data: {
            currency: "EUR",
            floorProvider: "PubxFloorProvider",
            modelVersion: "gpt-mvm_AB_0.50_dt_0.75_dwt_0.95_dnt_0.25_fm_0.50",
            schema: { fields: ["gptSlot", "mediaType"] },
            values: { "*|banner": 0.02 },
          },
        },
      };
      setDefaultFloorsConfig(providerConfig);
      expect(config.getConfig("floors")).to.deep.equal(
        getFloorsConfig(providerConfig, providerConfig.params.data).floors
      );
      expect(window.__pubxLoaded__).to.be.true;
    });
  });
});

// describe("getBidRequestData call", () => {
//   it("will set floors and buckets to window object", () => {
//     const endpoint =
//       "https://qvyrma0fd5.execute-api.ap-south-1.amazonaws.com/default/floors-test";
//     const providerConfig = { params: { useRtd: false, endpoint } };
//     pubxaiSubmodule.getBidRequestData(null, null, providerConfig);
//     setTimeout(() => {
//       expect(window.__PBXCNFG__.prb).to.be.equal("");
//       expect(window.__PBXCNFG__.flrs).to.be.equal("");
//     }, 1000);
//   });
// });
