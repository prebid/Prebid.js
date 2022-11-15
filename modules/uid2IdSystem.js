/* eslint-disable no-console */
/**
 * This module adds uid2 ID support to the User ID module
 * The {@link module:modules/userId} module is required.
 * @module modules/uid2IdSystem
 * @requires module:modules/userId
 */

import { logInfo } from '../src/utils.js';
import {submodule} from '../src/hook.js';
import { getStorageManager } from '../src/storageManager.js';

const MODULE_NAME = 'uid2';
const GVLID = 887;
const LOG_PRE_FIX = 'UID2: ';
const ADVERTISING_COOKIE = '__uid2_advertising_token';

function isValidIdentity(identity) {
  return (typeof identity === 'object' &&
      identity !== null &&
      'advertising_token' in identity &&
      'identity_expires' in identity &&
      'refresh_from' in identity &&
      'refresh_token' in identity &&
      'refresh_expires' in identity
  );
}

function readCookie() {
  const cookie = storage.cookiesAreEnabled() ? storage.getCookie(ADVERTISING_COOKIE) : null;
  if (!cookie) return null;
  if (cookie.includes('{')) {
    const parsed = JSON.parse(cookie);
    return parsed;
  }
  return cookie;
}

function readFromLocalStorage() {
  return storage.localStorageIsEnabled() ? storage.getDataFromLocalStorage(ADVERTISING_COOKIE) : null;
}

function readServerProvidedCookie(cookieName) {
  const cookie = storage.getCookie(cookieName);
  _logInfo(cookie);
  if (!cookie) return null;
  return JSON.parse(cookie);
}

function storeValue(value) {
  if (storage.cookiesAreEnabled()) { storage.setCookie(ADVERTISING_COOKIE, JSON.stringify(value)); } else if (storage.localStorageIsEnabled()) { storage.setLocalStorage(ADVERTISING_COOKIE, value); }
}

function getStorage() {
  return getStorageManager({gvlid: GVLID, moduleName: MODULE_NAME});
}

export const storage = getStorage();

const _logInfo = createLogInfo(LOG_PRE_FIX);

function createLogInfo(prefix) {
  return function (...strings) {
    logInfo(prefix + ' ', ...strings);
  }
}

/**
 * Encode the id
 * @param value
 * @returns {string|*}
 */
function encodeId(value) {
  const result = {};
  if (value) {
    const bidIds = {
      id: value
    }
    result.uid2 = bidIds;
    _logInfo('Decoded value ' + JSON.stringify(result));
    return result;
  }
  return undefined;
}

class Uid2ApiClient {
  constructor(opts) {
    // const client = new Uid2ApiClient({baseUrl: 'https://operator-integ.uidapi.com'});
    this._requestsInFlight = [];
    // TODO: Back to prod url
    this._baseUrl = opts.baseUrl ? opts.baseUrl : 'https://operator-integ.uidapi.com';
    this._clientVersion = 'uid2-prebidjs-1.0.0';// Maybe grab the Prebid.js version somehow?
  }
  createArrayBuffer(text) {
    const arrayBuffer = new Uint8Array(text.length);
    for (let i = 0; i < text.length; i++) {
      arrayBuffer[i] = text.charCodeAt(i);
    }
    return arrayBuffer;
  }
  hasActiveRequests() {
    return this._requestsInFlight.length > 0;
  }
  isUnvalidatedRefreshResponse(response) {
    return typeof (response) === 'object' && response !== null && 'status' in response;
  }
  isValidRefreshResponse(response) {
    if (this.isUnvalidatedRefreshResponse(response)) {
      return response.status === 'optout' || response.status === 'expired_token' ||
            (response.status === 'success' && 'body' in response && (0, isValidIdentity)(response.body));
    }
    return false;
  }
  ResponseToRefreshResult(response) {
    if (this.isValidRefreshResponse(response)) {
      if (response.status === 'success') { return { status: response.status, identity: response.body }; }
      return response;
    } else { return "Response didn't contain a valid status"; }
  }
  abortActiveRequests() {
    this._requestsInFlight.forEach(req => {
      req.abort();
    });
    this._requestsInFlight = [];
  }
  callRefreshApi(refreshDetails) {
    const url = this._baseUrl + '/v2/token/refresh';
    const req = new XMLHttpRequest();
    this._requestsInFlight.push(req);
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
      this._requestsInFlight = this._requestsInFlight.filter(r => r !== req);
      try {
        if (!refreshDetails.refresh_response_key || req.status !== 200) {
          _logInfo('No key, assuming JSON response');
          const response = JSON.parse(req.responseText);
          const result = this.ResponseToRefreshResult(response);
          if (typeof result === 'string') { rejectPromise(result); } else { resolvePromise(result); }
        } else {
          _logInfo('Key, decrypting');
          const encodeResp = this.createArrayBuffer(atob(req.responseText));
          window.crypto.subtle.importKey('raw', this.createArrayBuffer(atob(refreshDetails.refresh_response_key)), { name: 'AES-GCM' }, false, ['decrypt']).then((key) => {
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
    _logInfo('Sending refresh', req);
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
   * @returns {{uid2:{ id: string }} or undefined if value doesn't exists
   */
  decode(value) {
    _logInfo('UID2 decode()', value);

    const result = decodeImpl(value);

    _logInfo('UID2 decode returned', result);
    return result;
  },

  getId(config, consentData) {
    const result = getIdImpl(config, consentData);
    logInfo(`UID2 getId returned`, result);

    // TODO: Check debug flag first...
    if (result && typeof result === 'object' && 'id' in result && typeof result.id === 'object' && 'latestToken' in result.id) {
      window.__uid2_debug = result.id;
    }
    return result;
  },
};

function refreshTokenAndStore(token) {
  // TODO:     const apiClient = new Uid2ApiClient({ baseUrl: config?.params?.uid2ApiBase });
  const client = new Uid2ApiClient({baseUrl: 'https://operator-integ.uidapi.com'});
  return client.callRefreshApi(token).then((response) => {
    _logInfo('Refresh responded with:', response);
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
    // This must be a legacy integration with no new token - all we can do is use it and hope
    const result = { uid2: { id: value } };
    return result;
  }
  if (Date.now() < value.latestToken.identity_expires) {
    return { uid2: { id: value.latestToken.advertising_token } };
  }
  return null;
}

/**
   * performs action to obtain id and return a value.
   * @function
   * @param {SubmoduleConfig} [configparams]
   * @param {ConsentData|undefined} consentData
   * @returns {uid2Id}
   */
function getIdImpl(config, consentData) {
  logInfo('UID2 getId()', config, consentData);
  let suppliedToken = null;
  if ('params' in config && config.params) {
    if ('uid2Token' in config.params && config.params.uid2Token) {
      suppliedToken = config.params.uid2Token;
    } else if ('uid2ServerCookie' in config.params && config.params.uid2ServerCookie) {
      suppliedToken = readServerProvidedCookie(config.params.uid2ServerCookie);
    }
    logInfo('Supplied token:', suppliedToken)
  }
  let storedTokens = readCookie() || readFromLocalStorage();
  _logInfo('Stored tokens:', storedTokens);

  if (storedTokens && typeof storedTokens === 'string') {
    // Legacy value stored, this must be an old integration. If no token supplied, just use the legacy value.

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
      // Stored token wasn't originally sourced from the provided token - ignore the stored value.
      storedTokens = null;
    }
  }
  // At this point, any legacy values or superseded stored tokens have been nulled out.
  const useSuppliedToken = !(storedTokens?.latestToken) || (suppliedToken && suppliedToken.identity_expires > storedTokens.latestToken.identity_expires);
  const newestAvailableToken = useSuppliedToken ? suppliedToken : storedTokens.latestToken;
  _logInfo('Decided what to use', useSuppliedToken, newestAvailableToken);
  if (!newestAvailableToken || Date.now() > newestAvailableToken.refresh_expires) {
    _logInfo('Newest available token is expired and not refreshable.');
    // TODO: If in debug mode...
    window.__uid2_debug = {...window.__uid2_debug, expiredToken: newestAvailableToken};
    return { id: null };
  }
  if (Date.now() > newestAvailableToken.identity_expires) {
    const promise = refreshTokenAndStore(newestAvailableToken);
    _logInfo('Token is expired but can be refreshed, attempting refresh.');
    return { callback: (cb) => {
      promise.then((result) => {
        _logInfo('Promise resolved, sending off the result', result);
        if (result && 'id' in result && result.id && 'latestToken' in result.id) {
          window.__uid2_debug = result.id;
        }
        cb(result);
      });
    } };
  }
  // TODO: If should refresh (but don't need to), refresh in the background.
  if (Date.now() > newestAvailableToken.refresh_from) {
    _logInfo(`Should refresh but don't have to.`);
    refreshTokenAndStore(newestAvailableToken);
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
