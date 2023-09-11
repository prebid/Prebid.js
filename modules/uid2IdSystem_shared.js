/* eslint-disable no-console */
export const Uid2CodeVersion = '1.1';

function isValidIdentity(identity) {
  return !!(typeof identity === 'object' && identity !== null && identity.advertising_token && identity.identity_expires && identity.refresh_from && identity.refresh_token && identity.refresh_expires);
}

function isNormalizedPhone(phone) {
  return /^\+[0-9]{10,15}$/.test(phone);
}

function isBase64Hash(value) {
  if (!(value && value.length === 44)) {
    return false;
  }

  try {
    return btoa(atob(value)) === value;
  } catch (err) {
    return false;
  }
}

function isCSTGOptionsAndGetIdentity(
  maybeOpts,
  _logWarn
) {
  if (typeof maybeOpts !== 'object' || maybeOpts === null) {
    _logWarn('CSTG opts must be an object');
    return false;
  }

  const opts = maybeOpts;
  if (typeof opts.serverPublicKey !== 'string') {
    _logWarn('CSTG opts.serverPublicKey must be a string');
    return false;
  }
  const serverPublicKeyPrefix = /^UID2-X-[A-Z]-.+/;
  if (!serverPublicKeyPrefix.test(opts.serverPublicKey)) {
    _logWarn(
      `CSTG opts.serverPublicKey must match the regular expression ${serverPublicKeyPrefix}`
    );
    return false;
  }
  // We don't do any further validation of the public key, as we will find out
  // later if it's valid by using importKey.

  if (typeof opts.subscriptionId !== 'string') {
    _logWarn('CSTG opts.subscriptionId must be a string');
    return false;
  }
  if (opts.subscriptionId.length === 0) {
    _logWarn('CSTG opts.subscriptionId is empty');
    return false;
  }

  if (opts.emailHash) {
    if (!isBase64Hash(opts.emailHash)) {
      _logWarn('CSTG opts.emailHash is invalid');
      return false;
    }
    return { email_hash: opts.emailHash }
  }

  if (opts.phoneHash) {
    if (!isBase64Hash(opts.phoneHash)) {
      _logWarn('CSTG opts.phoneHash is invalid');
      return false;
    }
    return { phone_hash: opts.phoneHash }
  }

  if (opts.email) {
    const normalizedEmail = normalizeEmail(opts.email);
    if (normalizedEmail === undefined) {
      _logWarn('CSTG opts.email is invalid');
      return false
    }
    return { email: opts.email }
  }

  if (opts.phone) {
    if (!isNormalizedPhone(opts.phone)) {
      _logWarn('CSTG opts.phone is invalid');
      return false
    }
    return { phone: opts.phone }
  }
  return false
}

// This is extracted from an in-progress API client. Once it's available via NPM, this class should be replaced with the NPM package.
export class Uid2ApiClient {
  constructor(opts, clientId, logInfo, logWarn) {
    this._baseUrl = opts.baseUrl;
    this._clientVersion = clientId;
    this._logInfo = logInfo;
    this._logWarn = logWarn;
    if (opts.cstg) {
      this._serverPublicKey = opts.cstg.serverPublicKey;
      this._subscriptionId = opts.cstg.subscriptionId;
    }
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
  isCstgApiSuccessResponse(response) {
    return this.hasStatusResponse(response) && (
      response.status === 'success' &&
      isValidIdentity(response.body)
    );
  }
  isCstgApiClientErrorResponse(response) {
    return this.hasStatusResponse(response) && (
      response.status === 'client_error' &&
      typeof response.message === 'string'
    );
  }
  isCstgApiForbiddenResponse(response) {
    return this.hasStatusResponse(response) && (
      response.status === 'invalid_http_origin' &&
      typeof response.message === 'string'
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

  async callCstgApi(request) {
    this._logInfo('Building Cstg request for', request);
    const box = await UID2CstgBox.build(stripPublicKeyPrefix(this._serverPublicKey))
    const encoder = new TextEncoder();
    const now = Date.now();
    const { iv, ciphertext } = await box.encrypt(
      encoder.encode(JSON.stringify(request)),
      encoder.encode(JSON.stringify([now]))
    );

    const exportedPublicKey = await UID2CstgCrypto.exportPublicKey(box.clientPublicKey);

    const requestBody = {
      payload: UID2CstgCrypto.bytesToBase64(new Uint8Array(ciphertext)),
      iv: UID2CstgCrypto.bytesToBase64(new Uint8Array(iv)),
      public_key: UID2CstgCrypto.bytesToBase64(new Uint8Array(exportedPublicKey)),
      timestamp: now,
      subscription_id: this.subscriptionId,
    };
    return this._callCstgApi(requestBody, box)
  }

  _callCstgApi(requestBody, box) {
    const url = this._baseUrl + '/v2/token/client-generate';
    const req = new XMLHttpRequest();
    req.overrideMimeType('text/plain');
    req.open('POST', url, true);

    let resolvePromise;
    let rejectPromise;
    const promise = new Promise((resolve, reject) => {
      resolvePromise = resolve;
      rejectPromise = reject;
    });

    req.onreadystatechange = async () => {
      if (req.readyState !== req.DONE) return;
      try {
        if (req.status === 200) {
          const encodedResp = UID2CstgCrypto.base64ToBytes(req.responseText);
          const decrypted = await box.decrypt(
            encodedResp.slice(0, 12),
            encodedResp.slice(12)
          );
          const decryptedResponse = new TextDecoder().decode(decrypted);
          const response = JSON.parse(decryptedResponse);
          if (this.isCstgApiSuccessResponse(response)) {
            resolvePromise({
              status: 'success',
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
          if (this.isCstgApiClientErrorResponse(response)) {
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
          if (this.isCstgApiForbiddenResponse(response)) {
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
  static _namedCurve = 'P-256'
  constructor(clientPublicKey, sharedKey) {
    this._clientPublicKey = clientPublicKey;
    this._sharedKey = sharedKey;
  }

  static async build(serverPublicKey) {
    const clientKeyPair = await UID2CstgCrypto.generateKeyPair(UID2CstgBox._namedCurve);
    const importedServerPublicKey = await UID2CstgCrypto.importPublicKey(
      serverPublicKey,
      this._namedCurve
    );
    const sharedKey = await UID2CstgCrypto.deriveKey(
      importedServerPublicKey,
      clientKeyPair.privateKey
    );
    return new UID2CstgBox(clientKeyPair.publicKey, sharedKey);
  }

  async encrypt(plaintext, additionalData) {
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const ciphertext = await window.crypto.subtle.encrypt({
      name: 'AES-GCM',
      iv,
      additionalData,
    }, this._sharedKey, plaintext)
    return { iv, ciphertext }
  }

  async decrypt(iv, ciphertext) {
    return window.crypto.subtle.decrypt({
      name: 'AES-GCM',
      iv
    }, this._sharedKey, ciphertext);
  }

  get clientPublicKey() {
    return this._clientPublicKey;
  }
}

class UID2CstgCrypto {
  static base64ToBytes(base64) {
    const binString = atob(base64);
    return Uint8Array.from(binString, (m) => m.codePointAt(0));
  }

  static bytesToBase64(bytes) {
    const binString = Array.from(bytes, (x) => String.fromCodePoint(x)).join('');
    return btoa(binString);
  }

  static async generateKeyPair(namedCurve) {
    const params = {
      name: 'ECDH',
      namedCurve: namedCurve,
    };
    return window.crypto.subtle.generateKey(params, false, ['deriveKey']);
  }

  static async importPublicKey(publicKey, namedCurve) {
    const params = {
      name: 'ECDH',
      namedCurve: namedCurve,
    };
    return window.crypto.subtle.importKey('spki', this.base64ToBytes(publicKey), params, false, []);
  }

  static exportPublicKey(publicKey) {
    return window.crypto.subtle.exportKey('spki', publicKey);
  }

  static async deriveKey(serverPublicKey, clientPrivateKey) {
    return window.crypto.subtle.deriveKey({
      name: 'ECDH',
      public: serverPublicKey,
    }, clientPrivateKey, {
      name: 'AES-GCM',
      length: 256,
    }, false, ['encrypt', 'decrypt']);
  }

  static async hash(value) {
    const hash = await window.crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(value)
    );
    return this.bytesToBase64(new Uint8Array(hash));
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
    let storedTokens = storageManager.getStoredValueWithFallback();
    if (storedTokens.originalIdentity) tokens.originalIdentity = storedTokens.originalIdentity;
    storageManager.storeValue(tokens);
    return tokens;
  });
}

function normalizeEmail(email) {
  if (email == undefined || email.length <= 0) {
    return undefined;
  }

  const STARTING_STATE = 'Starting';
  const SUBDOMAIN_STATE = 'SubDomain'

  let preSb = '';
  let preSbSpecialized = '';
  let sb = '';
  let wsBuffer = '';

  let parsingState = STARTING_STATE;
  let inExtension = false;

  for (const cGiven of email) {
    let c = cGiven;
    if (cGiven >= 'A' && cGiven < 'Z') {
      c = String.fromCharCode(c.charCodeAt(0) + 32);
    }

    switch (parsingState) {
      case STARTING_STATE:
        if (c == ' ') {
          break;
        }
        if (c == '@') {
          parsingState = SUBDOMAIN_STATE;
        } else if (c == '.') {
          preSb += c;
        } else if (c == '+') {
          preSb += c;
          inExtension = true;
        } else {
          preSb += c;
          if (!inExtension) {
            preSbSpecialized += c;
          }
        }
        break;
      case SUBDOMAIN_STATE:
        if (c == '@') {
          return undefined;
        } else if (c == ' ') {
          wsBuffer += c;
          break;
        } else if (wsBuffer.length > 0) {
          sb += wsBuffer;
          wsBuffer = '';
        }
        sb += c;
    }
  }

  if (sb.length == 0) {
    return undefined;
  }

  let domainPart = sb;
  const GMAILDOMAIN = 'gmail.com';

  let addressPartToUse = domainPart == GMAILDOMAIN ? preSbSpecialized : preSb;
  if (addressPartToUse.length == 0) {
    return undefined;
  }

  return addressPartToUse + '@' + domainPart;
}

async function generateRequest(cstgIdentity) {
  if ('email_hash' in cstgIdentity || 'phone_hash' in cstgIdentity) {
    return cstgIdentity;
  }
  if ('email' in cstgIdentity) {
    const emailHash = await UID2CstgCrypto.hash(cstgIdentity.email)
    return { email_hash: emailHash };
  }
  if ('phone' in cstgIdentity) {
    const phoneHash = await UID2CstgCrypto.hash(cstgIdentity.phone)
    return {phone_hash: phoneHash}
  }
}

async function generateTokenAndStore(baseUrl, cstgOpts, cstgIdentity, clientId, storageManager, _logInfo, _logWarn) {
  _logInfo('UID2 cstg opts provided: ', JSON.stringify(cstgOpts));

  const client = new Uid2ApiClient({baseUrl, cstg: cstgOpts}, clientId, _logInfo, _logWarn);
  const request = await generateRequest(cstgIdentity);
  const response = await client.callCstgApi(request)
  _logInfo('CSTG endpoint responded with:', response);
  const tokens = {
    originalIdentity: cstgIdentity,
    latestToken: response.identity,
  };
  storageManager.storeValue(tokens);
  return tokens;
}

export function Uid2GetId(config, prebidStorageManager, _logInfo, _logWarn) {
  let suppliedToken = null;
  const cstgIdentity = config.cstg && isCSTGOptionsAndGetIdentity(config.cstg, _logWarn);
  const preferLocalStorage = (config.storage !== 'cookie');
  const storageManager = new Uid2StorageManager(prebidStorageManager, preferLocalStorage, config.internalStorage, _logInfo);
  _logInfo(`Module is using ${preferLocalStorage ? 'local storage' : 'cookies'} for internal storage.`);

  if (cstgIdentity) {
    // Ignores config.paramToken and config.serverCookieName if any is provided
    suppliedToken = null;
  } else if (config.paramToken) {
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

    if (!suppliedToken && !cstgIdentity) {
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

  if (cstgIdentity && storedTokens) {
    const identityKey = Object.keys(cstgIdentity)[0]
    if (!storedTokens.originalIdentity || storedTokens.originalIdentity[identityKey] !== cstgIdentity.identityKey) {
      _logInfo('CSTG supplied new identity - ignoring stored value.', storedTokens.originalIdentity, cstgIdentity);
      // Stored token wasn't originally sourced from the provided identity - ignore the stored value. A new user has logged in?
      storedTokens = null;
    }
  }

  // At this point, any legacy values or superseded stored tokens have been nulled out.
  if (cstgIdentity && !storedTokens) {
    const promise = generateTokenAndStore(config.apiBaseUrl, config.cstg, cstgIdentity, config.clientId, storageManager, _logInfo, _logWarn);
    _logInfo('Generate token using CSTG');
    return { callback: (cb) => {
      promise.then((result) => {
        _logInfo('Token generation responded, passing the new token on.', result);
        cb(result);
      });
    } };
  }
  const useSuppliedToken = !(storedTokens?.latestToken) || (suppliedToken && suppliedToken.identity_expires > storedTokens.latestToken.identity_expires);
  const newestAvailableToken = useSuppliedToken ? suppliedToken : storedTokens.latestToken;
  _logInfo('UID2 module selected latest token', useSuppliedToken, newestAvailableToken);
  if ((!newestAvailableToken || Date.now() > newestAvailableToken.refresh_expires)) {
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
    originalIdentity: cstgIdentity ?? storedTokens?.originalIdentity,
    originalToken: suppliedToken ?? storedTokens?.originalToken,
    latestToken: newestAvailableToken,
  };
  storageManager.storeValue(tokens);
  return { id: tokens };
}

const SERVER_PUBLIC_KEY_PREFIX_LENGTH = 9;

function stripPublicKeyPrefix(serverPublicKey) {
  return serverPublicKey.substring(SERVER_PUBLIC_KEY_PREFIX_LENGTH);
}
