/* eslint-disable no-console */
/**
 * This module adds uid2 ID support to the User ID module
 * The {@link module:modules/userId} module is required.
 * @module modules/uid2IdSystem
 * @requires module:modules/userId
 */

import { logInfo } from '../src/utils.js';
import {submodule} from '../src/hook.js';
import {getStorageManager} from '../src/storageManager.js';
import {MODULE_TYPE_UID} from '../src/activities/modules.js';

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

function getStorage() {
  return getStorageManager({moduleType: MODULE_TYPE_UID, moduleName: MODULE_NAME});
}

function createLogInfo(prefix) {
  return function (...strings) {
    logInfo(prefix + ' ', ...strings);
  }
}
export const storage = getStorage();
const _logInfo = createLogInfo(LOG_PRE_FIX);

function readFromLocalStorage() {
  return storage.localStorageIsEnabled() ? storage.getDataFromLocalStorage(ADVERTISING_COOKIE) : null;
}

function readModuleCookie() {
  const cookie = readCookie(ADVERTISING_COOKIE);
  if (cookie && cookie.includes('{')) {
    return JSON.parse(cookie);
  }
  return cookie;
}

function readJsonCookie(cookieName) {
  return JSON.parse(readCookie(cookieName));
}

function readCookie(cookieName) {
  const cookie = storage.cookiesAreEnabled() ? storage.getCookie(cookieName) : null;
  if (!cookie) {
    _logInfo(`Attempted to read UID2 from cookie '${cookieName}' but it was empty`);
    return null;
  };
  _logInfo(`Read UID2 from cookie '${cookieName}'`);
  return cookie;
}

function storeValue(value) {
  if (storage.cookiesAreEnabled()) {
    storage.setCookie(ADVERTISING_COOKIE, JSON.stringify(value), Date.now() + 60 * 60 * 24 * 1000);
  } else if (storage.localStorageIsEnabled()) {
    storage.setLocalStorage(ADVERTISING_COOKIE, value);
  }
}

function isValidIdentity(identity) {
  return !!(typeof identity === 'object' && identity !== null && identity.advertising_token && identity.identity_expires && identity.refresh_from && identity.refresh_token && identity.refresh_expires);
}

// This is extracted from an in-progress API client. Once it's available via NPM, this class should be replaced with the NPM package.
class Uid2ApiClient {
  constructor(opts) {
    this._baseUrl = opts.baseUrl ? opts.baseUrl : UID2_BASE_URL;
    this._clientVersion = UID2_CLIENT_ID;
  }
  createArrayBuffer(text) {
    const arrayBuffer = new Uint8Array(text.length);
    for (let i = 0; i < text.length; i++) {
      arrayBuffer[i] = text.charCodeAt(i);
    }
    return arrayBuffer;
  }
  hasStatusResponse(response) {
    return typeof (response) === 'object' && response && response.status;
  }
  isValidRefreshResponse(response) {
    return this.hasStatusResponse(response) && (
      response.status === 'optout' || response.status === 'expired_token' || (response.status === 'success' && response.body && isValidIdentity(response.body))
    );
  }
  ResponseToRefreshResult(response) {
    if (this.isValidRefreshResponse(response)) {
      if (response.status === 'success') { return { status: response.status, identity: response.body }; }
      return response;
    } else { return "Response didn't contain a valid status"; }
  }
  callRefreshApi(refreshDetails) {
    const url = this._baseUrl + '/v2/token/refresh';
    const req = new XMLHttpRequest();
    req.overrideMimeType('text/plain');
    req.open('POST', url, true);
    req.setRequestHeader('X-UID2-Client-Version', this._clientVersion);
    let resolvePromise;
    let rejectPromise;
    const promise = new Promise((resolve, reject) => {
      resolvePromise = resolve;
      rejectPromise = reject;
    });
    req.onreadystatechange = () => {
      if (req.readyState !== req.DONE) { return; }
      try {
        if (!refreshDetails.refresh_response_key || req.status !== 200) {
          _logInfo('Error status OR no response decryption key available, assuming unencrypted JSON');
          const response = JSON.parse(req.responseText);
          const result = this.ResponseToRefreshResult(response);
          if (typeof result === 'string') { rejectPromise(result); } else { resolvePromise(result); }
        } else {
          _logInfo('Decrypting refresh API response');
          const encodeResp = this.createArrayBuffer(atob(req.responseText));
          window.crypto.subtle.importKey('raw', this.createArrayBuffer(atob(refreshDetails.refresh_response_key)), { name: 'AES-GCM' }, false, ['decrypt']).then((key) => {
            _logInfo('Imported decryption key')
            // returns the symmetric key
            window.crypto.subtle.decrypt({
              name: 'AES-GCM',
              iv: encodeResp.slice(0, 12),
              tagLength: 128, // The tagLength you used to encrypt (if any)
            }, key, encodeResp.slice(12)).then((decrypted) => {
              const decryptedResponse = String.fromCharCode(...new Uint8Array(decrypted));
              _logInfo('Decrypted to:', decryptedResponse);
              const response = JSON.parse(decryptedResponse);
              const result = this.ResponseToRefreshResult(response);
              if (typeof result === 'string') { rejectPromise(result); } else { resolvePromise(result); }
            }, (reason) => console.warn(`Call to UID2 API failed`, reason));
          }, (reason) => console.warn(`Call to UID2 API failed`, reason));
        }
      } catch (err) {
        rejectPromise(err);
      }
    };
    _logInfo('Sending refresh request', req);
    req.send(refreshDetails.refresh_token);
    return promise;
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
  const client = new Uid2ApiClient({baseUrl});
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

function decodeImpl(value) {
  if (typeof value === 'string') {
    _logInfo('Found an old-style ID from an earlier version of the module. Refresh is unavailable for this token.');
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
  const uid2BaseUrl = config?.params?.uid2ApiBase ?? UID2_BASE_URL;
  if (config && config.params) {
    if (config.params.uid2Token) {
      suppliedToken = config.params.uid2Token;
      _logInfo('Read token from params', suppliedToken);
    } else if (config.params.uid2ServerCookie) {
      suppliedToken = readJsonCookie(config.params.uid2ServerCookie);
      _logInfo('Read token from server-supplied cookie', suppliedToken);
    }
  }
  let storedTokens = readModuleCookie() || readFromLocalStorage();
  _logInfo('Loaded module-stored tokens:', storedTokens);

  if (storedTokens && typeof storedTokens === 'string') {
    // Legacy value stored, this must be from an old integration. If no token supplied, just use the legacy value.

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
