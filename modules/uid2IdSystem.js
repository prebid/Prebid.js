/* eslint-disable no-console */
/**
 * This module adds uid2 ID support to the User ID module
 * The {@link module:modules/userId} module is required.
 * @module modules/uid2IdSystem
 * @requires module:modules/userId
 */

import { logInfo, logWarn } from '../src/utils.js';
import { submodule } from '../src/hook.js';
import {getStorageManager} from '../src/storageManager.js';
import {MODULE_TYPE_UID} from '../src/activities/modules.js';

// RE below lint exception: UID2 and EUID are separate modules, but the protocol is the same and shared code makes sense here.
// eslint-disable-next-line prebid/validate-imports
import { Uid2GetId, Uid2CodeVersion, extractIdentityFromParams } from './uid2IdSystem_shared.js';
import {UID2_EIDS} from '../libraries/uid2Eids/uid2Eids.js';

/**
 * @typedef {import('../modules/userId/index.js').Submodule} Submodule
 * @typedef {import('../modules/userId/index.js').SubmoduleConfig} SubmoduleConfig
 * @typedef {import('../modules/userId/index.js').ConsentData} ConsentData
 * @typedef {import('../modules/userId/index.js').uid2Id} uid2Id
 */

const MODULE_NAME = 'uid2';
const MODULE_REVISION = Uid2CodeVersion;
const PREBID_VERSION = '$prebid.version$';
const UID2_CLIENT_ID = `PrebidJS-${PREBID_VERSION}-UID2Module-${MODULE_REVISION}`;
const LOG_PRE_FIX = 'UID2: ';
const ADVERTISING_COOKIE = '__uid2_advertising_token';

// eslint-disable-next-line no-unused-vars
const UID2_TEST_URL = 'https://operator-integ.uidapi.com';
const UID2_PROD_URL = 'https://prod.uidapi.com';
const UID2_BASE_URL = UID2_PROD_URL;

function createLogger(logger, prefix) {
  return function (...strings) {
    logger(prefix + ' ', ...strings);
  }
}

const _logInfo = createLogger(logInfo, LOG_PRE_FIX);
const _logWarn = createLogger(logWarn, LOG_PRE_FIX);

export const storage = getStorageManager({moduleType: MODULE_TYPE_UID, moduleName: MODULE_NAME});

/** @type {Submodule} */
export const uid2IdSubmodule = {
  /**
   * used to link submodule with config
   * @type {string}
   */
  name: MODULE_NAME,

  /**
   * decode the stored id value for passing to bid requests
   * @function
   * @param {string} value
   * @returns {{uid2:{ id: string } }} or undefined if value doesn't exists
   */
  decode(value) {
    const result = decodeImpl(value);
    _logInfo('UID2 decode returned', result);
    return result;
  },

  /**
   * performs action to obtain id and return a value.
   * @function
   * @param {SubmoduleConfig} [configparams]
   * @param {ConsentData|undefined} consentData
   * @returns {uid2Id}
   */
  getId(config, consentData) {
    if (consentData?.gdprApplies === true) {
      _logWarn('UID2 is not intended for use where GDPR applies. The UID2 module will not run.');
      return;
    }

    const mappedConfig = {
      apiBaseUrl: config?.params?.uid2ApiBase ?? UID2_BASE_URL,
      paramToken: config?.params?.uid2Token,
      serverCookieName: config?.params?.uid2Cookie ?? config?.params?.uid2ServerCookie,
      storage: config?.params?.storage ?? 'localStorage',
      clientId: UID2_CLIENT_ID,
      internalStorage: ADVERTISING_COOKIE
    }

    if (FEATURES.UID2_CSTG) {
      mappedConfig.cstg = {
        serverPublicKey: config?.params?.serverPublicKey,
        subscriptionId: config?.params?.subscriptionId,
        ...extractIdentityFromParams(config?.params ?? {})
      }
    }
    _logInfo(`UID2 configuration loaded and mapped.`, mappedConfig);
    const result = Uid2GetId(mappedConfig, storage, _logInfo, _logWarn);
    _logInfo(`UID2 getId returned`, result);
    return result;
  },
  eids: UID2_EIDS
};

function decodeImpl(value) {
  if (typeof value === 'string') {
    _logInfo('Found server-only token. Refresh is unavailable for this token.');
    const result = { uid2: { id: value } };
    return result;
  }
  if (value.latestToken === 'optout') {
    _logInfo('Found optout token.  Refresh is unavailable for this token.');
    return { uid2: { optout: true } };
  }
  if (Date.now() < value.latestToken.identity_expires) {
    return { uid2: { id: value.latestToken.advertising_token } };
  }
  return null;
}

// Register submodule for userId
submodule('userId', uid2IdSubmodule);
