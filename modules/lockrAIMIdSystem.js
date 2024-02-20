import { submodule } from '../src/hook.js';
import { logInfo, logWarn } from '../src/utils';
import { lockrAIMCodeVersion, lockrAIMGetIds } from './lockrAIMIdSystem_shared';

/**
 * @typedef {import('../modules/userId/index.js').Submodule} Submodule
 * @typedef {import('../modules/userId/index.js').SubmoduleConfig} SubmoduleConfig
 * @typedef {import('../modules/userId/index.js').ConsentData} ConsentData
 * @typedef {import('../modules/userId/index.js').lockrAIMId} lockrAIMId
 */

const MODULE_NAME = 'lockr-aim';
const MODULE_REVISION = lockrAIMCodeVersion;
const PREBID_VERSION = '$prebid.version$';
const LOG_PRE_FIX = 'lockr-AIM: ';

const AIM_PROD_URL = 'https://identity.loc.kr';

function createLogger(logger, prefix) {
  return function (...strings) {
    logger(prefix + ' ', ...strings);
  }
}

const _logInfo = createLogger(logInfo, LOG_PRE_FIX);
const _logWarn = createLogger(logWarn, LOG_PRE_FIX);

/** @type {Submodule} */
export const lockrAIMSubmodule = {
  name: MODULE_NAME,

  /**
   * performs action to obtain id and return a value.
   * @function
   * @param {SubmoduleConfig} [configparams]
   * @param {ConsentData|undefined} consentData
   * @returns {lockrAIMId}
   */
  getId(config, consentData) {
    if (consentData?.gdprApplies === true) {
      _logWarn('lockrAIM is not intended for use where GDPR applies. The lockrAIM module will not run');
      return;
    }

    const mappedConfig = {
      appID: config?.params?.appID,
      email: config?.params?.email
    };

    _logInfo('lockr AIM configurations loaded and mapped.', mappedConfig);
    lockrAIMGetIds(mappedConfig, _logInfo, _logWarn);
    _logInfo('lockr AIM results generated');
  }
}

// Register submodule for userId
submodule('userId', lockrAIMSubmodule);
