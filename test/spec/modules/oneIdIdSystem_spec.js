import { oneIdIdSystem, storage } from "modules/oneIdIdSystem.js";
import * as utils from "src/utils.js";
import { attachIdSystem } from "../../../modules/userId/index.js";
import { createEidsArray } from "../../../modules/userId/eids.js";
import { expect } from "chai/index.mjs";
import * as ajaxLib from "src/ajax.js";

function fakeRequest(fn) {
  const ajaxBuilderStub = sinon.stub(ajaxLib, "ajaxBuilder").callsFake(() => {
    return (url, cbObj) => {
      cbObj.success(JSON.stringify(operaIdRemoteResponse));
    };
  });
  fn();
  ajaxBuilderStub.restore();
}

const promisify = (fn) => new Promise((resolve) => fn(resolve));

const config = {
  params: {
    type: "email",
    value: "test@example.com",
  },
  storage: {
    type: "html5",
    name: "oneId",
  },
};

describe("OneId", () => {
  describe("oneIdId submodule", () => {
    it('should expose a "name" property containing oneId', () => {
      expect(oneIdIdSystem.name).to.equal("oneId");
    });

    it('should expose a "gvlid" property containing the GVL ID 1269', () => {
      expect(oneIdIdSystem.gvlid).to.equal(1269);
    });
  });

  it("should allow configuration with no storage", () => {
    expect(
      oneIdIdSystem.getId(
        {
          ...config,
          storage: undefined,
        },
        null,
        null
      )
    ).to.not.equal(undefined);
  });

  describe("getId", () => {
    const spy = sinon.spy();
    let cmpStub;

    beforeEach(() => {
      spy.resetHistory();
      window.__tcfapi = function () {};
      cmpStub = sinon.stub(window, "__tcfapi").callsFake((...args) => {
        const handler = args.at(-1);
        handler(
          {
            eventStatus: "tcloaded",
            vendor: { consents: { 1269: true } },
          },
          true
        );
      });
    });

    afterEach(function () {
      storage.removeDataFromLocalStorage(config.storage.name);
      delete window.__tcfapi;
      cmpStub.reset();
    });

    it("should use storage", async () => {
      storage.setDataInLocalStorage(config.storage.name, "localstorage_value");
      const apiCallback = oneIdIdSystem.getId(config).callback;

      const id = await promisify(apiCallback);
      expect(id).to.equal("localstorage_value");
    });

    it("should load SDK", async () => {
      fakeRequest(async () => {
        const apiCallback = oneIdIdSystem.getId(config).callback;
        const id = await promisify(apiCallback);
        expect(OneIdSDK?.firstParty).not.to.be.undefined;
      });
    });

    it("should get hem without email", async () => {
      // Get ID
      fakeRequest(async () => {
        const apiCallback = oneIdIdSystem.getId({
          params: {
            type: "anonymous",
          },
        }).callback;
        const id = await promisify(apiCallback);
        expect(getIdMock.calledOnce).to.be.true;
      });
    });

    it("should get hem from email", () => {
      // Get ID
      fakeRequest(async () => {
        const apiCallback = oneIdIdSystem.getId({
          params: {
            type: "email",
            email: "test@example.com",
          },
        }).callback;
        const id = await promisify(apiCallback);
        expect(getIdMock.calledOnce).to.be.true;
      });
    });
  });

  describe("eid", () => {
    before(() => {
      attachIdSystem(oneIdIdSystem);
    });

    it("oneId", () => {
      const id = "c4bcadb0-124f-4468-a91a-d3d44cf311c5";
      const userId = {
        oneId: id,
      };

      const [eid] = createEidsArray(userId);
      expect(eid).to.deep.equal({
        source: "oneid.live",
        uids: [
          {
            atype: 1,
            id,
          },
        ],
      });
    });
  });
});
