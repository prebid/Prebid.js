/**
 * This module adds DPES to the User ID module
 * The {@link module:modules/userId} module is required
 * @module modules/deepintentDpesSubmodule
 * @requires module:modules/userId
 */

import * as utils from "../src/utils.js";
import { submodule } from "../src/hook.js";
import { getStorageManager } from "../src/storageManager.js";

const DEEPINTENT_DPES_ID = "di_dpes";
export const storage = getStorageManager();

function readCookie(cookieName) {
  // return 1231231;
  const val = storage.cookiesAreEnabled ? storage.getCookie(cookieName) : null;
  return JSON.parse(val);
}

function readFromLocalStorage() {
  const val = storage.localStorageIsEnabled
    ? storage.getDataFromLocalStorage(DEEPINTENT_DPES_ID)
    : null;
  return JSON.parse(val);
}

/** @type {Submodule} */
export const deepintentDpesSubmodule = {
  /**
   * used to link submodule with config
   * @type {string}
   */
  name: "deepintentDpesIdSystem",
  /**
   * decode the stored id value for passing to bid requests
   * @function
   * @param { Object | string | undefined } value
   * @return { Object | string | undefined }
   */
  decode(value) {
    console.log("isString: ", utils.isStr(value));
    console.log("isPlainObject: ", utils.isPlainObject(value));
    // const id = value
    //   ? utils.isStr(value)
    //     ? value
    //     : utils.isPlainObject(value)
    //     ? value.id
    //     : undefined
    //   : undefined;
    return value ? value : undefined;
  },
  /**
   * performs action to obtain id and return a value in the callback's response argument
   * @function
   * @param {SubmoduleConfig} config
   * @return {{id: string | undefined} | undefined}
   */
  getId(config) {
    const configParams = (config && config.params) || {};
    let id = null;
    if (
      configParams &&
      Array.isArray(configParams.identifiersToResolve) &&
      configParams.identifiersToResolve.length > 0 &&
      configParams.type === "cookie"
    ) {
      id = readCookie(configParams.identifiersToResolve[0]);
    }
    if (configParams && configParams.type === "html5") {
      id = readFromLocalStorage();
    }
    console.log("getId: ", id);
    return id ? { id } : undefined;
  },
};

submodule("userId", deepintentDpesSubmodule);
