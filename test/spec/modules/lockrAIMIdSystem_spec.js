/* eslint-disable no-console */
/* eslint-disable quotes */
import * as lockrAIMSystem from "../../../modules/lockrAIMIdSystem.js";
import { hook } from "../../../src/hook.js";
import { expect } from "chai";
import { coreStorage } from "../../../modules/userId/index.js";

const defaultConfig = {
  appID: "3b5a0f6c-7e91-11ec-b9c7-e330d98440a7",
  email: "example@test.com",
};

const LIVE_RAMP_COOKIE = "_lr_env";
const UID2_COOKIE = "_uid2_advertising_token";
const ID5_COOKIE = "id5id";
const dummyTokenValue = 'Success OK';

const getDataFromStorage = (dataKey) => {
  return coreStorage.getDataFromLocalStorage(dataKey);
};

const mockHTTPRequestSuccess = (key, value) => {
  coreStorage.setDataInLocalStorage(key, value);
}

describe("lockr AIM ID System", function () {
  before(() => {
    hook.ready();
  });

  describe("Check for invalid publisher config and GDPR", function () {
    it("Should fail for invalid config", async function () {
      // no Config
      const idResult = await lockrAIMSystem.lockrAIMSubmodule.getId();
      expect(idResult).is.eq(undefined);
      const idResultNoConfig = await lockrAIMSystem.lockrAIMSubmodule.getId({});
      expect(idResultNoConfig).is.eq(undefined);
    });

    it("Does not generate the token, when GDPR is enabled", async function () {
      // Mocking the GDPR
      const idResult = await lockrAIMSystem.lockrAIMSubmodule.getId(
        defaultConfig,
        { gdprApplies: true }
      );
      expect(idResult).is.eq(undefined);
    });
  });

  describe("Generates the token successfully", function () {
    it("Generates the UID2 token successfully", async function () {
      mockHTTPRequestSuccess(UID2_COOKIE, dummyTokenValue);
      await lockrAIMSystem.lockrAIMSubmodule.getId(defaultConfig);
      const uid2Cookie = getDataFromStorage(UID2_COOKIE);
      expect(uid2Cookie).is.eq(dummyTokenValue);
    });

    it("Generates the ID5 token successfully", async function () {
      mockHTTPRequestSuccess(ID5_COOKIE, dummyTokenValue);
      await lockrAIMSystem.lockrAIMSubmodule.getId(defaultConfig);
      const id5Cookie = getDataFromStorage(ID5_COOKIE);
      expect(id5Cookie).is.eq(dummyTokenValue);
    });

    it("Generates the liveramp token successfully", async function () {
      mockHTTPRequestSuccess(LIVE_RAMP_COOKIE, dummyTokenValue);
      await lockrAIMSystem.lockrAIMSubmodule.getId(defaultConfig);
      const liveRampCookie = getDataFromStorage(LIVE_RAMP_COOKIE);
      expect(liveRampCookie).is.eq(dummyTokenValue);
    });
  });
});
