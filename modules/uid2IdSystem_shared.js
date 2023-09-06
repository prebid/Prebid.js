/* eslint-disable no-console */
export const Uid2CodeVersion = '1.1';

function isValidIdentity(identity) {
  return !!(typeof identity === 'object' && identity !== null && identity.advertising_token && identity.identity_expires && identity.refresh_from && identity.refresh_token && identity.refresh_expires);
}

// This is extracted from an in-progress API client. Once it's available via NPM, this class should be replaced with the NPM package.
export class Uid2ApiClient {
  constructor(opts, clientId, logInfo, logWarn) {
    this._baseUrl = opts.baseUrl;
    this._clientVersion = clientId;
    this._logInfo = logInfo;
    this._logWarn = logWarn;
    this._serverPublicKey = opts.serverPublicKey;
    this._subscriptionId = opts.subscriptionId;
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
    } else { return `Response didn't contain a valid status`; }
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
          this._logInfo('Error status OR no response decryption key available, assuming unencrypted JSON');
          const response = JSON.parse(req.responseText);
          const result = this.ResponseToRefreshResult(response);
          if (typeof result === 'string') { rejectPromise(result); } else { resolvePromise(result); }
        } else {
          this._logInfo('Decrypting refresh API response');
          const encodeResp = this.createArrayBuffer(atob(req.responseText));
          window.crypto.subtle.importKey('raw', this.createArrayBuffer(atob(refreshDetails.refresh_response_key)), { name: 'AES-GCM' }, false, ['decrypt']).then((key) => {
            this._logInfo('Imported decryption key')
            // returns the symmetric key
            window.crypto.subtle.decrypt({
              name: 'AES-GCM',
              iv: encodeResp.slice(0, 12),
              tagLength: 128, // The tagLength you used to encrypt (if any)
            }, key, encodeResp.slice(12)).then((decrypted) => {
              const decryptedResponse = String.fromCharCode(...new Uint8Array(decrypted));
              this._logInfo('Decrypted to:', decryptedResponse);
              const response = JSON.parse(decryptedResponse);
              const result = this.ResponseToRefreshResult(response);
              if (typeof result === 'string') { rejectPromise(result); } else { resolvePromise(result); }
            }, (reason) => this._logWarn(`Call to UID2 API failed`, reason));
          }, (reason) => this._logWarn(`Call to UID2 API failed`, reason));
        }
      } catch (err) {
        rejectPromise(err);
      }
    };
    this._logInfo('Sending refresh request', refreshDetails);
    req.send(refreshDetails.refresh_token);
    return promise;
  }

  callCstgApi(data) {
    const request =
      "emailHash" in data
        ? { email_hash: data.emailHash }
        : { phone_hash: data.phoneHash };
    this._logInfo('Building Cstg request for', request);
    return this._buildCstgRequest(request)
      .then(this._callCstgApi)
  }

  _buildCstgRequest(request) {
    UID2CstgBox
      .build(stripPublicKeyPrefix(this._serverPublicKey))
      .then((box) => {
        const encoder = new TextEncoder();
        const now = Date.now();
        return Promise.all([
          box.encrypt(
            encoder.encode(JSON.stringify(request)),
            encoder.encode(JSON.stringify([now]))
          ),
          exportPublicKey(box.clientPublicKey)
        ])
      })
      .then(([{iv, ciphertext}, exportedPublicKey]) => ({
        payload: bytesToBase64(new Uint8Array(ciphertext)),
        iv: bytesToBase64(new Uint8Array(iv)),
        public_key: bytesToBase64(new Uint8Array(exportedPublicKey)),
        timestamp: now,
        subscription_id: this._subscriptionId,
      }))
  }

  _callCstgApi(requestBody) {
    const url = this._baseUrl + "/v2/token/client-generate";
    const req = new XMLHttpRequest();
    this._requestsInFlight.push(req);
    req.overrideMimeType("text/plain");
    req.open("POST", url, true);

    let resolvePromise;
    let rejectPromise;
    const promise = new Promise((resolve, reject) => {
      resolvePromise = resolve;
      rejectPromise = reject;
    });

    req.onreadystatechange = async () => {
      if (req.readyState !== req.DONE) return;
      this._requestsInFlight = this._requestsInFlight.filter((r) => r !== req);
      try {
        if (req.status === 200) {
          const encodedResp = base64ToBytes(req.responseText);
          const decrypted = await box.decrypt(
            encodedResp.slice(0, 12),
            encodedResp.slice(12)
          );
          const decryptedResponse = new TextDecoder().decode(decrypted);
          const response = JSON.parse(decryptedResponse);
          if (isCstgApiSuccessResponse(response)) {
            resolvePromise({
              status: "success",
              identity: response.body,
            });
          } else {
            // A 200 should always be a success response.
            // Something has gone wrong.
            rejectPromise(
              `API error: Response body was invalid for HTTP status 200: ${decryptedResponse}`
            );
          }
        } else if (req.status === 400) {
          const response = JSON.parse(req.responseText);
          if (isCstgApiClientErrorResponse(response)) {
            rejectPromise(`Client error: ${response.message}`);
          } else {
            // A 400 should always be a client error.
            // Something has gone wrong.
            rejectPromise(
              `API error: Response body was invalid for HTTP status 400: ${req.responseText}`
            );
          }
        } else if (req.status === 403) {
          const response = JSON.parse(req.responseText);
          if (isCstgApiForbiddenResponse(response)) {
            rejectPromise(`Forbidden: ${response.message}`);
          } else {
            // A 403 should always be a forbidden response.
            // Something has gone wrong.
            rejectPromise(
              `API error: Response body was invalid for HTTP status 403: ${req.responseText}`
            );
          }
        } else {
          rejectPromise(`API error: Unexpected HTTP status ${req.status}`);
        }
      } catch (err) {
        rejectPromise(err);
      }
    };
    this._logInfo('Sending Cstg request', JSON.stringify(requestBody));
    req.send(JSON.stringify(requestBody));
    return promise;
  }
}
export class Uid2StorageManager {
  constructor(storage, preferLocalStorage, storageName, logInfo) {
    this._storage = storage;
    this._preferLocalStorage = preferLocalStorage;
    this._storageName = storageName;
    this._logInfo = logInfo;
  }
  readCookie(cookieName) {
    return this._storage.cookiesAreEnabled() ? this._storage.getCookie(cookieName) : null;
  }
  readLocalStorage(key) {
    return this._storage.localStorageIsEnabled() ? this._storage.getDataFromLocalStorage(key) : null;
  }
  readModuleCookie() {
    return this.parseIfContainsBraces(this.readCookie(this._storageName));
  }
  writeModuleCookie(value) {
    this._storage.setCookie(this._storageName, JSON.stringify(value), Date.now() + 60 * 60 * 24 * 1000);
  }
  readModuleStorage() {
    return this.parseIfContainsBraces(this.readLocalStorage(this._storageName));
  }
  writeModuleStorage(value) {
    this._storage.setDataInLocalStorage(this._storageName, JSON.stringify(value));
  }
  readProvidedCookie(cookieName) {
    return JSON.parse(this.readCookie(cookieName));
  }
  parseIfContainsBraces(value) {
    return (value?.includes('{')) ? JSON.parse(value) : value;
  }
  storeValue(value) {
    if (this._preferLocalStorage) {
      this.writeModuleStorage(value);
    } else {
      this.writeModuleCookie(value);
    }
  }

  getStoredValueWithFallback() {
    const preferredStorageLabel = this._preferLocalStorage ? 'local storage' : 'cookie';
    const preferredStorageGet = (this._preferLocalStorage ? this.readModuleStorage : this.readModuleCookie).bind(this);
    const preferredStorageSet = (this._preferLocalStorage ? this.writeModuleStorage : this.writeModuleCookie).bind(this);
    const fallbackStorageGet = (this._preferLocalStorage ? this.readModuleCookie : this.readModuleStorage).bind(this);

    const storedValue = preferredStorageGet();

    if (!storedValue) {
      const fallbackValue = fallbackStorageGet();
      if (fallbackValue) {
        this._logInfo(`${preferredStorageLabel} was empty, but found a fallback value.`)
        if (typeof fallbackValue === 'object') {
          this._logInfo(`Copying the fallback value to ${preferredStorageLabel}.`);
          preferredStorageSet(fallbackValue);
        }
        return fallbackValue;
      }
    } else if (typeof storedValue === 'string') {
      const fallbackValue = fallbackStorageGet();
      if (fallbackValue && typeof fallbackValue === 'object') {
        this._logInfo(`${preferredStorageLabel} contained a basic token, but found a refreshable token fallback. Copying the fallback value to ${preferredStorageLabel}.`);
        preferredStorageSet(fallbackValue);
        return fallbackValue;
      }
    }
    return storedValue;
  }
}

class UID2CstgBox {
  _namedCurve = "P-256"
  constructor(clientPublicKey, sharedKey) {
      this._clientPublicKey = clientPublicKey;
      this._sharedKey = sharedKey;
  }
  static build(serverPublicKey) {
    return Promise.all([generateKeyPair(this._namedCurve), importPublicKey(serverPublicKey, this._namedCurve)])
      .then(([clientKeyPair, importedServerPublicKey]) => {
        return deriveKey(importedServerPublicKey, clientKeyPair.privateKey)
          .then((sharedKey) => new UID2CstgBox(clientKeyPair.publicKey, sharedKey))
      });
  }

  encrypt(plaintext, additionalData) {
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    return window.crypto.subtle.encrypt({
        name: "AES-GCM",
        iv,
        additionalData,
      }, this._sharedKey, plaintext)
      .then((ciphertext) => ({iv, ciphertext}));
  }

  decrypt(iv, ciphertext) {
    return window.crypto.subtle.decrypt({
      name: "AES-GCM",
      iv
    }, this._sharedKey, ciphertext);
  }

  get clientPublicKey() {
    return this._clientPublicKey;
  }
}

function refreshTokenAndStore(baseUrl, token, clientId, storageManager, _logInfo, _logWarn) {
  _logInfo('UID2 base url provided: ', baseUrl);
  const client = new Uid2ApiClient({baseUrl}, clientId, _logInfo, _logWarn);
  return client.callRefreshApi(token).then((response) => {
    _logInfo('Refresh endpoint responded with:', response);
    const tokens = {
      originalToken: token,
      latestToken: response.identity,
    };
    storageManager.storeValue(tokens);
    return tokens;
  });
}

export function Uid2GetId(config, prebidStorageManager, _logInfo, _logWarn) {
  let suppliedToken = null;
  const preferLocalStorage = (config.storage !== 'cookie');
  const storageManager = new Uid2StorageManager(prebidStorageManager, preferLocalStorage, config.internalStorage, _logInfo);
  _logInfo(`Module is using ${preferLocalStorage ? 'local storage' : 'cookies'} for internal storage.`);

  if (config.paramToken) {
    suppliedToken = config.paramToken;
    _logInfo('Read token from params', suppliedToken);
  } else if (config.serverCookieName) {
    suppliedToken = storageManager.readProvidedCookie(config.serverCookieName);
    _logInfo('Read token from server-supplied cookie', suppliedToken);
  }
  let storedTokens = storageManager.getStoredValueWithFallback();
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
    const promise = refreshTokenAndStore(config.apiBaseUrl, newestAvailableToken, config.clientId, storageManager, _logInfo, _logWarn);
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
    refreshTokenAndStore(config.apiBaseUrl, newestAvailableToken, config.clientId, storageManager, _logInfo, _logWarn);
  }
  const tokens = {
    originalToken: suppliedToken ?? storedTokens?.originalToken,
    latestToken: newestAvailableToken,
  };
  storageManager.storeValue(tokens);
  return { id: tokens };
}

function base64ToBytes(base64) {
  const binString = atob(base64);
  return Uint8Array.from(binString, (m) => m.codePointAt(0));
}

function bytesToBase64(bytes) {
  const binString = Array.from(bytes, (x) => String.fromCodePoint(x)).join("");
  return btoa(binString);
}

function generateKeyPair(namedCurve) {
  const params = {
      name: "ECDH",
      namedCurve: namedCurve,
  };
  return window.crypto.subtle.generateKey(params, false, ["deriveKey"]);
}

function importPublicKey(publicKey, namedCurve) {
  const params = {
      name: "ECDH",
      namedCurve: namedCurve,
  };
  return window.crypto.subtle.importKey("spki", base64ToBytes(publicKey), params, false, []);
}

function exportPublicKey(publicKey) {
  return window.crypto.subtle.exportKey("spki", publicKey);
}

function deriveKey(serverPublicKey, clientPrivateKey) {
  return window.crypto.subtle.deriveKey({
      name: "ECDH",
      public: serverPublicKey,
  }, clientPrivateKey, {
      name: "AES-GCM",
      length: 256,
  }, false, ["encrypt", "decrypt"]);
}

const SERVER_PUBLIC_KEY_PREFIX_LENGTH = 9;

function stripPublicKeyPrefix(serverPublicKey) {
  return serverPublicKey.substring(SERVER_PUBLIC_KEY_PREFIX_LENGTH);
}

function isClientSideIdentityOptionsOrThrow(
  maybeOpts
) {
  if (typeof maybeOpts !== "object" || maybeOpts === null) {
    throw new TypeError("opts must be an object");
  }

  const opts = maybeOpts;
  if (typeof opts.serverPublicKey !== "string") {
    throw new TypeError("opts.serverPublicKey must be a string");
  }
  const serverPublicKeyPrefix = /^UID2-X-[A-Z]-.+/;
  if (!serverPublicKeyPrefix.test(opts.serverPublicKey)) {
    throw new TypeError(
      `opts.serverPublicKey must match the regular expression ${serverPublicKeyPrefix}`
    );
  }
  // We don't do any further validation of the public key, as we will find out
  // later if it's valid by using importKey.

  if (typeof opts.subscriptionId !== "string") {
    throw new TypeError("opts.subscriptionId must be a string");
  }
  if (opts.subscriptionId.length === 0) {
    throw new TypeError("opts.subscriptionId is empty");
  }

  return true;
}