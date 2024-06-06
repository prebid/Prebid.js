/**
 * This module adds EUID ID support to the User ID module. It shares significant functionality with the UID2 module.
 * The {@link module:modules/userId} module is required.
 * @module modules/euidIdSystem
 * @requires module:modules/userId
 */

import { logInfo, logWarn, deepAccess } from '../src/utils.js';
import {submodule} from '../src/hook.js';
import {getStorageManager} from '../src/storageManager.js';
import {MODULE_TYPE_UID} from '../src/activities/modules.js';

// RE below lint exception: UID2 and EUID are separate modules, but the protocol is the same and shared code makes sense here.
// eslint-disable-next-line prebid/validate-imports
import { Uid2GetId, Uid2CodeVersion, extractIdentityFromParams } from './uid2IdSystem_shared.js';

/**
 * @typedef {import('../modules/userId/index.js').Submodule} Submodule
 * @typedef {import('../modules/userId/index.js').SubmoduleConfig} SubmoduleConfig
 * @typedef {import('../modules/userId/index.js').ConsentData} ConsentData
 * @typedef {import('../modules/userId/index.js').IdResponse} IdResponse
 */

const MODULE_NAME = 'euid';
const MODULE_REVISION = Uid2CodeVersion;
const PREBID_VERSION = '$prebid.version$';
const EUID_CLIENT_ID = `PrebidJS-${PREBID_VERSION}-EUIDModule-${MODULE_REVISION}`;
const GVLID_TTD = 21; // The Trade Desk
const LOG_PRE_FIX = 'EUID: ';
const ADVERTISING_COOKIE = '__euid_advertising_token';

// eslint-disable-next-line no-unused-vars
const EUID_TEST_URL = 'https://integ.euid.eu';
const EUID_PROD_URL = 'https://prod.euid.eu';
const EUID_BASE_URL = EUID_PROD_URL;

function createLogger(logger, prefix) {
  return function (...strings) {
    logger(prefix + ' ', ...strings);
  }
}
const _logInfo = createLogger(logInfo, LOG_PRE_FIX);
const _logWarn = createLogger(logWarn, LOG_PRE_FIX);

export const storage = getStorageManager({moduleType: MODULE_TYPE_UID, moduleName: MODULE_NAME});

function hasWriteToDeviceConsent(consentData) {
  const gdprApplies = consentData?.gdprApplies === true;
  const localStorageConsent = deepAccess(consentData, `vendorData.purpose.consents.1`)
  const prebidVendorConsent = deepAccess(consentData, `vendorData.vendor.consents.${GVLID_TTD.toString()}`)
  if (gdprApplies && (!localStorageConsent || !prebidVendorConsent)) {
    return false;
  }
  return true;
}

/** @type {Submodule} */
export const euidIdSubmodule = {
  /**
   * used to link submodule with config
   * @type {string}
   */
  name: MODULE_NAME,

  /**
   * Vendor id of The Trade Desk
   * @type {Number}
   */
  gvlid: GVLID_TTD,
  /**
   * decode the stored id value for passing to bid requests
   * @function
   * @param {string} value
   * @returns {{euid:{ id: string } }} or undefined if value doesn't exists
   */
  decode(value) {
    const result = decodeImpl(value);
    _logInfo('EUID decode returned', result);
    return result;
  },

  /**
   * performs action to obtain id and return a value.
   * @function
   * @param {SubmoduleConfig} [config]
   * @param {ConsentData|undefined} consentData
   * @returns {IdResponse}
   */
  getId(config, consentData) {
    if (consentData?.gdprApplies !== true) {
      logWarn('EUID is intended for use within the EU. The module will not run when GDPR does not apply.');
      return;
    }
    if (!hasWriteToDeviceConsent(consentData)) {
      // The module cannot operate without this permission.
      _logWarn(`Unable to use EUID module due to insufficient consent. The EUID module requires storage permission.`)
      return;
    }

    const mappedConfig = {
      apiBaseUrl: config?.params?.euidApiBase ?? EUID_BASE_URL,
      paramToken: config?.params?.euidToken,
      serverCookieName: config?.params?.euidCookie,
      storage: config?.params?.storage ?? 'localStorage',
      clientId: EUID_CLIENT_ID,
      internalStorage: ADVERTISING_COOKIE
    };

    if (FEATURES.UID2_CSTG) {
      mappedConfig.cstg = {
        serverPublicKey: config?.params?.serverPublicKey,
        subscriptionId: config?.params?.subscriptionId,
        ...extractIdentityFromParams(config?.params ?? {})
      }
    }
    _logInfo(`EUID configuration loaded and mapped.`, mappedConfig);
    const result = Uid2GetId(mappedConfig, storage, _logInfo, _logWarn);
    _logInfo(`EUID getId returned`, result);
    return result;
  },
  eids: {
    'euid': {
      source: 'euid.eu',
      atype: 3,
      getValue: function(data) {
        return data.id;
      }
    },
  },
};

function decodeImpl(value) {
  if (typeof value === 'string') {
    _logInfo('Found server-only token. Refresh is unavailable for this token.');
    const result = { euid: { id: value } };
    return result;
  }
  if (value.latestToken === 'optout') {
    _logInfo('Found optout token.  Refresh is unavailable for this token.');
    return { euid: { optout: true } };
  }
  if (Date.now() < value.latestToken.identity_expires) {
    return { euid: { id: value.latestToken.advertising_token } };
  }
  return null;
}

// Register submodule for userId
submodule('userId', euidIdSubmodule);
