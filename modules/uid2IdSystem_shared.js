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

  callCstgApi(cstgDetails) {
    const url = this._baseUrl + '/v2/token/client-generate';
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
      if (req.readyState !== req.DONE) {
        return;
      }
      try {
        if (req.status !== 200) {
          // if (!cstgDetails.refresh_response_key || req.status !== 200) {
          rejectPromise(response);
        } else {
          resolvePromise(req.responseText);
        }
      } catch (err) {
        rejectPromise(err);
      }
    };
    this._logInfo('Sending cstg request', cstgDetails);
    req.send(cstgDetails);
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

// ----------------------------------------------------- CSTG START -----------------------------------------------------

// ------
// https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/importKey#subjectpublickeyinfo
// from https://developers.google.com/web/updates/2012/06/How-to-convert-ArrayBuffer-to-and-from-String
function str2ab(str) {
  const buf = new ArrayBuffer(str.length);
  const bufView = new Uint8Array(buf);
  for (let i = 0, strLen = str.length; i < strLen; i++) {
    bufView[i] = str.charCodeAt(i);
  }
  return buf;
}

// https://stackoverflow.com/a/9458996/
function _arrayBufferToBase64(buffer) {
  var binary = '';
  var bytes = new Uint8Array(buffer);
  var len = bytes.byteLength;
  for (var i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[ i ]);
  }
  return window.btoa(binary);
}

function exportPublicKey() {
  let resolvePromise;
  let rejectPromise;
  const promise = new Promise((resolve, reject) => {
    resolvePromise = resolve;
    rejectPromise = reject;
  });

  var result = window.crypto.subtle.deriveKey(
    {
      name: 'ECDH',
      public: publicKey,
    },
    privateKey,
    {
      name: 'AES-GCM',
      length: 256,
    },
    false,
    ['encrypt', 'decrypt']
  );
  resolvePromise(result);
  return promise;
}

function encryptEmail(email, sharedKey) {
  let resolvePromise;
  let rejectPromise;
  const promise = new Promise((resolve, reject) => {
    resolvePromise = resolve;
    rejectPromise = reject;
  });

  let result = window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv },
    sharedKey,
    str2ab(email));

  resolvePromise(result);
  return promise;
}

function callCstgAndStore(baseUrl, cstgBody, sharedKey, clientId, storageManager, _logInfo, _logWarn) {
  _logInfo('UID2 base url provided: ', baseUrl);
  const client = new Uid2ApiClient({baseUrl}, clientId, _logInfo, _logWarn);
  return client.callCstgApi(cstgBody).then((base64ResponseBody) => {
    _logInfo('Refresh endpoint responded with:', base64ResponseBody);

    // got the CSTG endpoint response decrypting:
    const encryptedResponseBody = window.atob(base64ResponseBody);
    console.log('Decrypting response...');
    const responseBodyArrayBuffer = str2ab(encryptedResponseBody);
    console.log(responseBodyArrayBuffer);

    const decryptedResponseBody = window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: responseBodyArrayBuffer.slice(0, 12) },
      sharedKey,
      responseBodyArrayBuffer.slice(12),
    ).then((result) => { return result });

    const decryptedResponseBodyText = new TextDecoder().decode(decryptedResponseBody);
    console.log('response: %s', decryptedResponseBodyText);

    const tokens = {
      originalToken: 'TODO XXXXXXX',
      latestToken: decryptedResponseBodyText.identity,
    };
    storageManager.storeValue(tokens);
    return tokens;
  });
}

function generateClientKeyPair() {
  let resolvePromise;
  let rejectPromise;
  const promise = new Promise((resolve, reject) => {
    resolvePromise = resolve;
    rejectPromise = reject;
  });

  const clientKeyPair = window.crypto.subtle.generateKey(
    {
      name: 'ECDH',
      namedCurve: 'P-256',
    },
    false,
    ['deriveKey']
  );

  clientKeyPair.then(resolvePromise(result));
  return promise;
}

function deriveSecretKey(privateKey, serverPublicKey) {
  let resolvePromise;
  let rejectPromise;
  const promise = new Promise((resolve, reject) => {
    resolvePromise = resolve;
    rejectPromise = reject;
  });
  return window.crypto.subtle.deriveKey(
    {
      name: 'ECDH',
      public: publicKey,
    },
    privateKey,
    {
      name: 'AES-GCM',
      length: 256,
    },
    false,
    ['encrypt', 'decrypt']
  ).then((cryptoResult) => { resolvePromise( cryptoResult.publicKey)});
}

// function cstg(config, prebidStorageManager, _logInfo, _logWarn) {
//   const preferLocalStorage = (config.storage !== 'cookie');
//   const storageManager = new Uid2StorageManager(prebidStorageManager, preferLocalStorage, config.internalStorage, _logInfo);
//
//   _logInfo('Getting public key...');
//   const serverPublicKey = 'PUBLICKEY..................';
//   _logInfo('Generating client key pair...');
//   const clientKeyPair = generateClientKeyPair()
//     .then((result) => { return deriveSecretKey(
//       result,
//       serverPublicKey
//     ) })
//     .then(());
//
//   _logInfo('Deriving secret key...');
//   const sharedKey = deriveSecretKey(
//     clientKeyPair.privateKey,
//     serverPublicKey
//   ).then((result) => { return result });
//
//   _logInfo('Exporting public key...');
//   const exportedPublicKey = exportPublicKey(clientKeyPair.publicKey).then((result) => { return result });
//
//   // iv will be needed for decryption
//   const iv = window.crypto.getRandomValues(new Uint8Array(12));
//
//   _logInfo('Encrypting email...');
//
//   const encryptedEmail = encryptEmail('test@example.com', sharedKey).then((result) => { return result });
//
//   const body = {
//     email: _arrayBufferToBase64(encryptedEmail),
//     publicKey: _arrayBufferToBase64(exportedPublicKey),
//     iv: _arrayBufferToBase64(iv),
//   };
//
//   _logInfo('Generating CSTG token...');
//   const encryptedResponse = callCstgAndStore(config.apiBaseUrl, JSON.stringify(body), sharedKey, config.clientId, storageManager, _logInfo, _logWarn)
//     .then((result) => {
//       return result
//     });
//   _logInfo('Token is expired but can be refreshed, attempting refresh.');
//   return {
//     callback: (cb) => {
//       encryptedResponse.then((result) => {
//         _logInfo('CSTG reponded, passing the updated token on.', result);
//         cb(result);
//       });
//     }
//   };
// }

// ------------------------------------------------------ CSTG END ------------------------------------------------------

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
