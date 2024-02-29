/**
 * This module adds lockr AIM ID support to the User ID module
 * The {@link module:modules/userId} module is required.
 * @module modules/lockrAIMIdSystem
 * @requires module:modules/userId
 */

import { submodule } from "../src/hook.js";
import { logInfo, logWarn } from "../src/utils.js";
// eslint-disable-next-line prebid/validate-imports
import { lockrAIMGetIds } from "./lockrAIMIdSystem_shared.js";

/**
 * @typedef {import('../modules/userId/index.js').Submodule} Submodule
 * @typedef {import('../modules/userId/index.js').SubmoduleConfig} SubmoduleConfig
 * @typedef {import('../modules/userId/index.js').ConsentData} ConsentData
 * @typedef {import('../modules/userId/index.js').lockrAIMId} lockrAIMId
 */

const MODULE_NAME = "lockrAIMId";
const LOG_PRE_FIX = "lockr-AIM: ";

const AIM_PROD_URL = "https://identity.loc.kr";

function createLogger(logger, prefix) {
  return function (...strings) {
    logger(prefix + " ", ...strings);
  };
}

const _logInfo = createLogger(logInfo, LOG_PRE_FIX);
const _logWarn = createLogger(logWarn, LOG_PRE_FIX);

/** @type {Submodule} */
export const lockrAIMSubmodule = {
  /**
   * used to link submodule with config
   * @type {string}
   */
  name: MODULE_NAME,

  init() {
    _logInfo("lockrAIM Initialization complete");
  },

  /**
   * performs action to obtain id and return a value.
   * @function
   * @param {SubmoduleConfig} [configparams]
   * @param {ConsentData|undefined} consentData
   * @returns {lockrAIMId}
   */
  getId(config, consentData) {
    if (consentData?.gdprApplies === true) {
      _logWarn(
        "lockrAIM is not intended for use where GDPR applies. The lockrAIM module will not run"
      );
      return undefined;
    }

    const mappedConfig = {
      appID: config?.params?.appID,
      email: config?.params?.email,
      baseUrl: AIM_PROD_URL,
    };

    _logInfo("lockr AIM configurations loaded and mapped.", mappedConfig);
    const result = lockrAIMGetIds(mappedConfig, _logInfo, _logWarn);
    _logInfo("lockr AIM results generated");
    return result;
  },
};

// Register submodule for userId
submodule("userId", lockrAIMSubmodule);
