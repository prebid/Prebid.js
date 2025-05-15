/**
 * This module adds OneId to the User ID module
 * The {@link module:modules/userId} module is required
 * @module modules/oneIdIdSystem
 * @requires module:modules/userId
 */

import { logError, logInfo } from "../src/utils.js";
import { submodule } from "../src/hook.js";
import { MODULE_TYPE_UID } from "../src/activities/modules.js";
import { getStorageManager } from "../src/storageManager.js";

/**
 * @typedef {import('../modules/userId/index.js').Submodule} Submodule
 * @typedef {import('../modules/userId/index.js').SubmoduleConfig} SubmoduleConfig
 * @typedef {import('../modules/userId/index.js').ConsentData} ConsentData
 * @typedef {import('../modules/userId/index.js').IdResponse} IdResponse
 */

const MODULE_NAME = "oneId";
export const storage = getStorageManager({
  moduleName: MODULE_NAME,
  moduleType: MODULE_TYPE_UID,
});

const createOneIdApi = (sdk) => {
  return {
    createHem: async (str) => {
      logInfo(`Create hem from: ${str}`);
      const utf8 = new TextEncoder().encode(str);
      const hashBuffer = await crypto.subtle.digest("SHA-256", utf8);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray
        .map((bytes) => bytes.toString(16).padStart(2, "0"))
        .join("");
      return hashHex;
    },
    attachHem: (hem) =>
      new Promise((resolve, reject) => {
        logInfo(`Attach hem: ${hem}`);
        sdk.firstParty.attachHem(hem, (response) => {
          try {
            const oID = JSON.parse(response).oid;
            resolve(oID);
          } catch (error) {
            reject(error);
          }
        });
      }),
    getId: () =>
      new Promise((resolve, reject) => {
        logInfo(`Taking oneId from 'sdk.getId'`);
        sdk.firstParty.getId(resolve, reject);
      }),
  };
};

let loadPromise;
const loadSDK = (w) => {
  if (!loadPromise) {
    loadPromise = new Promise((resolve, reject) => {
      // In case it already loaded
      if (w.OneIdSDK && w.OneIdSDK.firstParty) {
        resolve(w.OneIdSDK);
        return;
      }
      // In case it's not loaded yet
      const oneIDSDKScript = document.createElement("script");
      oneIDSDKScript.src = "https://cdn.oneid.live/sdk/oneIDSDK.js";
      oneIDSDKScript.onabort = () => reject(Error("oneIDSDK loading aborted"));
      oneIDSDKScript.oncancel = () =>
        reject(Error("oneIDSDK loading canceled"));
      oneIDSDKScript.onload = () => {
        try {
          w.OneIdSDK.firstParty.init(
            {
              fpVersion: "v4",
              firstPartyURL: "",
            },
            () => {
              if (w.OneIdSDK) resolve(w.OneIdSDK);
              else reject(Error("OneIdSDK not loaded"));
            }
          );
        } catch (error) {
          reject(new Error("onload error: " + error.message));
        }
      };
      document.body.appendChild(oneIDSDKScript);
    });
  }
  return loadPromise;
};

/**
 * @param {Object} [config]
 */
async function getOneId(config) {
  const email = config.params.value;
  const storageName = config.storage?.name;
  let oneId =
    storage.localStorageIsEnabled() && storageName
      ? storage.getDataFromLocalStorage(storageName)
      : null;

  if (oneId) return oneId;
  const w =
    typeof window === "undefined"
      ? globalThis
      : window; /* && (window.top ? window.top : window); */
  try {
    const sdk = await loadSDK(w).then(createOneIdApi);
    if (email) {
      logInfo("Generating oneId from email");
      const hem = await sdk.createHem(email);
      oneId = await sdk.attachHem(hem);
      logInfo("Passing oneId from email:", oneId);
    } else {
      logInfo("Generating oneId without email");
      oneId = await sdk.getId();
      logInfo("Passing oneId if from api:", oneId);
    }
    return oneId;
  } catch (error) {
    logError("Error generating oneId:", error);
    throw error;
  }
}

/** @type {Submodule} */
export const oneIdIdSystem = {
  /**
   * used to link submodule with config
   * @type {string}
   */
  name: MODULE_NAME,
  /**
   * decode the stored id value for passing to bid requests
   * @function
   * @param {string} value
   * @returns {{oneId:string}}
   */
  decode(value) {
    return { adrcid: value };
  },
  /**
   * performs action to obtain id and return a value in the callback's response argument
   * @function
   * @param {SubmoduleConfig} [config]
   * @returns {IdResponse|undefined}
   */
  getId(config) {
    return {
      callback: (done) =>
        getOneId(config)
          .then((response) => done(response))
          .catch((error) => {
            logError(`${MODULE_NAME}: ID fetch encountered an error`, error);
            done();
          }),
    };
  },
  gvlid: 1269,
  eids: {
    oneId: {
      source: "oneid.live",
      atype: 1,
    },
  },
};

submodule("userId", oneIdIdSystem);
