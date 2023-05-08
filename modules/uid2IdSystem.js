/* eslint-disable no-console */
/**
 * This module adds uid2 ID support to the User ID module
 * The {@link module:modules/userId} module is required.
 * @module modules/uid2IdSystem
 * @requires module:modules/userId
 */

import { logInfo, logWarn } from '../src/utils.js';
import {submodule} from '../src/hook.js';
import {getStorageManager} from '../src/storageManager.js';
import {MODULE_TYPE_UID} from '../src/activities/modules.js';
import { Uid2ApiClient } from './uid2IdSystem_shared.js';

const MODULE_NAME = 'uid2';
const MODULE_REVISION = `1.0`;
const PREBID_VERSION = '$prebid.version$';
const UID2_CLIENT_ID = `PrebidJS-${PREBID_VERSION}-UID2Module-${MODULE_REVISION}`;
const GVLID = 887;
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
function readLocalStorage(key) {
  return storage.localStorageIsEnabled() ? storage.getDataFromLocalStorage(key) : null;
}

function readCookie(cookieName) {
  return storage.cookiesAreEnabled() ? storage.getCookie(cookieName) : null;
}

function readModuleCookie() {
  return parseIfContainsBraces(readCookie(ADVERTISING_COOKIE));
}

function readModuleStorage() {
  return parseIfContainsBraces(readLocalStorage(ADVERTISING_COOKIE));
}

function parseIfContainsBraces(value) {
  return (value?.includes('{')) ? JSON.parse(value) : value;
}

function readProvidedCookie(cookieName) {
  return JSON.parse(readCookie(cookieName));
}

function storeValue(value) {
  if (storage.cookiesAreEnabled()) {
    storage.setCookie(ADVERTISING_COOKIE, JSON.stringify(value), Date.now() + 60 * 60 * 24 * 1000);
  } else if (storage.localStorageIsEnabled()) {
    storage.setLocalStorage(ADVERTISING_COOKIE, value);
  }
}

/** @type {Submodule} */
export const uid2IdSubmodule = {
  /**
   * used to link submodule with config
   * @type {string}
   */
  name: MODULE_NAME,

  /**
   * Vendor id of Prebid
   * @type {Number}
   */
  gvlid: GVLID,
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
    const result = getIdImpl(config, consentData);
    _logInfo(`UID2 getId returned`, result);
    return result;
  },
};

function refreshTokenAndStore(baseUrl, token) {
  _logInfo('UID2 base url provided: ', baseUrl);
  const client = new Uid2ApiClient({baseUrl}, UID2_CLIENT_ID, _logInfo, _logWarn);
  return client.callRefreshApi(token).then((response) => {
    _logInfo('Refresh endpoint responded with:', response);
    const tokens = {
      originalToken: token,
      latestToken: response.identity,
    };
    storeValue(tokens);
    return tokens;
  });
}

function getStoredValueWithFallback(preferLocalStorage) {

}

function decodeImpl(value) {
  if (typeof value === 'string') {
    _logInfo('Found directly-supplied token. Refresh is unavailable for this token.');
    const result = { uid2: { id: value } };
    return result;
  }
  if (Date.now() < value.latestToken.identity_expires) {
    return { uid2: { id: value.latestToken.advertising_token } };
  }
  return null;
}

function getIdImpl(config, consentData) {
  let suppliedToken = null;
  const availableTokens = {};

  const uid2BaseUrl = config?.params?.uid2ApiBase ?? UID2_BASE_URL;
  const preferLocalStorage = (config?.params?.storage !== 'cookie');

  if (config && config.params) {
    if (config.params.uid2Token) {
      suppliedToken = config.params.uid2Token;
      availableTokens.fullFromConfig = config.params.uid2Token;
      _logInfo('Read token from params', suppliedToken);
    } else if (config.params.uid2ServerCookie) {
      suppliedToken = readProvidedCookie(config.params.uid2ServerCookie);
      availableTokens.fullFromCookie = suppliedToken;
      _logInfo('Read token from server-supplied cookie', suppliedToken);
    }
  }
  let storedTokens = readModuleCookie() || readModuleStorage();
  _logInfo('Loaded module-stored tokens:', storedTokens);

  if (storedTokens && typeof storedTokens === 'string') {
    // Stored value is a plain token - if no token is supplied, just use the stored value.

    if (!suppliedToken) {
      _logInfo('Returning legacy cookie value.');
      return { id: storedTokens };
    }
    // Otherwise, ignore the legacy value - it should get over-written later anyway.
    _logInfo('Discarding superseded legacy cookie.');
    storedTokens = null;
  }

  if (suppliedToken && storedTokens) {
    if (storedTokens.originalToken?.advertising_token !== suppliedToken.advertising_token) {
      _logInfo('Server supplied new token - ignoring stored value.', storedTokens.originalToken?.advertising_token, suppliedToken.advertising_token);
      // Stored token wasn't originally sourced from the provided token - ignore the stored value. A new user has logged in?
      storedTokens = null;
    }
  }
  // At this point, any legacy values or superseded stored tokens have been nulled out.
  const useSuppliedToken = !(storedTokens?.latestToken) || (suppliedToken && suppliedToken.identity_expires > storedTokens.latestToken.identity_expires);
  const newestAvailableToken = useSuppliedToken ? suppliedToken : storedTokens.latestToken;
  _logInfo('UID2 module selected latest token', useSuppliedToken, newestAvailableToken);
  if (!newestAvailableToken || Date.now() > newestAvailableToken.refresh_expires) {
    _logInfo('Newest available token is expired and not refreshable.');
    return { id: null };
  }
  if (Date.now() > newestAvailableToken.identity_expires) {
    const promise = refreshTokenAndStore(uid2BaseUrl, newestAvailableToken);
    _logInfo('Token is expired but can be refreshed, attempting refresh.');
    return { callback: (cb) => {
      promise.then((result) => {
        _logInfo('Refresh reponded, passing the updated token on.', result);
        cb(result);
      });
    } };
  }
  // If should refresh (but don't need to), refresh in the background.
  if (Date.now() > newestAvailableToken.refresh_from) {
    _logInfo(`Refreshing token in background with low priority.`);
    refreshTokenAndStore(uid2BaseUrl, newestAvailableToken);
  }
  const tokens = {
    originalToken: suppliedToken ?? storedTokens?.originalToken,
    latestToken: newestAvailableToken,
  };
  storeValue(tokens);
  return { id: tokens };
}

// Register submodule for userId
submodule('userId', uid2IdSubmodule);
